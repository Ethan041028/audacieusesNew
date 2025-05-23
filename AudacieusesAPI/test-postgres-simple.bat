@echo off
REM Script simplifié pour tester l'application avec PostgreSQL localement

echo === Démarrage du test simplifié avec PostgreSQL ===

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

REM Configurer les variables d'environnement pour PostgreSQL
set DB_DIALECT=postgres
set DB_HOST=localhost
set DB_PORT=5432
set DB_USERNAME=postgres
set DB_PASSWORD=postgres
set DB_DATABASE=audacieuses_db
set NODE_PORT=3500

REM Initialiser la base de données PostgreSQL
echo Initialisation de la base de données PostgreSQL...
node src/config/init-postgres-database.js

REM Démarrer l'application directement
echo Démarrage de l'application...
node src/server.js
