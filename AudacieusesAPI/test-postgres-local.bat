@echo off
REM Script pour tester l'application avec PostgreSQL localement

echo === Démarrage du test local avec PostgreSQL ===

REM Vérifier si le conteneur PostgreSQL est déjà en cours d'exécution
docker ps -q -f name=postgres-audacieuses > nul
if %ERRORLEVEL% == 0 (
  echo Le conteneur PostgreSQL est déjà en cours d'exécution
) else (
  echo Démarrage du conteneur PostgreSQL...
  docker run --name postgres-audacieuses -e POSTGRES_PASSWORD=postgres -e POSTGRES_USER=postgres -e POSTGRES_DB=audacieuses_db -p 5432:5432 -d postgres:16
  
  REM Attendre que PostgreSQL soit prêt
  echo Attente du démarrage de PostgreSQL...
  timeout /t 5
)

REM Installer les dépendances si nécessaire
if not exist "node_modules" (
  echo Installation des dépendances...
  call npm install
)

REM Assurer que pg et pg-hstore sont installés
call npm list pg pg-hstore 2>nul | findstr "pg@" >nul
if %ERRORLEVEL% NEQ 0 (
  echo Installation de pg et pg-hstore...
  call npm install pg pg-hstore --save
)

REM Installer node-fetch pour les tests si nécessaire
call npm list node-fetch 2>nul | findstr "node-fetch@" >nul
if %ERRORLEVEL% NEQ 0 (
  echo Installation de node-fetch pour les tests...
  call npm install node-fetch@2 --save-dev
)

REM Configurer les variables d'environnement pour PostgreSQL
set DB_DIALECT=postgres
set DB_HOST=localhost
set DB_PORT=5432
set DB_USERNAME=postgres
set DB_PASSWORD=postgres
set DB_DATABASE=audacieuses_db
set NODE_PORT=3500
set API_URL=http://localhost:3500/api

REM Initialiser la base de données PostgreSQL
echo Initialisation de la base de données PostgreSQL...
call node src/config/init-postgres-database.js

REM Exécuter les scripts de correction
echo Correction des modèles pour PostgreSQL...
call node scripts/adapt-models-for-postgres.js

echo Correction des requêtes SQL pour PostgreSQL...
call node scripts/adapt-sql-queries-for-postgres.js

echo Correction des problèmes spécifiques à PostgreSQL...
call node scripts/fix-postgres-queries.js

REM Démarrer l'application en arrière-plan
echo Démarrage de l'application...
start /B cmd /c "node src/server.js > server.log 2>&1"

REM Attendre que l'application démarre
echo Attente du démarrage de l'application...
timeout /t 5

REM Exécuter les tests de l'API
echo Exécution des tests de l'API...
call node scripts/test-postgres-api.js
set TEST_RESULT=%ERRORLEVEL%

REM Arrêter l'application (trouver et tuer le processus node qui exécute server.js)
echo Arrêt de l'application...
for /f "tokens=2" %%a in ('tasklist /fi "IMAGENAME eq node.exe" ^| findstr "node.exe"') do (
  taskkill /PID %%a /F
)

if %TEST_RESULT% EQU 0 (
  echo Tests réussis! L'application est prête pour le déploiement sur Render.
  exit /b 0
) else (
  echo Certains tests ont échoué. Veuillez corriger les erreurs avant le déploiement.
  exit /b 1
)
