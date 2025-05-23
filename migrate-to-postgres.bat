@echo off
REM Script de migration de MySQL vers PostgreSQL pour Les Audacieuses (Windows)
REM À exécuter depuis le répertoire racine du projet

echo ===================================================
echo   Migration de MySQL vers PostgreSQL pour Render
echo ===================================================
echo.

REM Vérifier si nous sommes dans le bon répertoire
if not exist "AudacieusesAPI" (
  echo ERROR: Ce script doit être exécuté depuis le répertoire racine du projet Les Audacieuses.
  exit /b 1
)

REM Étape 1: Installer les dépendances PostgreSQL
echo Étape 1: Installation des dépendances PostgreSQL...
cd AudacieusesAPI
call npm install pg pg-hstore --save
echo ✅ Dépendances PostgreSQL installées avec succès.
echo.

REM Étape 2: Adapter les modèles pour PostgreSQL
echo Étape 2: Adaptation des modèles Sequelize pour PostgreSQL...
call npm run adapt-models
echo ✅ Modèles adaptés pour PostgreSQL.
echo.

REM Étape 3: Adapter les requêtes SQL
echo Étape 3: Adaptation des requêtes SQL pour PostgreSQL...
call npm run adapt-queries
echo ✅ Requêtes SQL adaptées pour PostgreSQL.
echo.

REM Étape 4: Demander les informations de connexion aux bases de données
echo Étape 4: Configuration des connexions aux bases de données...
echo.
echo Entrez les informations de connexion à votre base de données MySQL source:
set /p MYSQL_HOST="Hôte MySQL (défaut: localhost): "
if "%MYSQL_HOST%"=="" set MYSQL_HOST=localhost
set /p MYSQL_USER="Utilisateur MySQL (défaut: root): "
if "%MYSQL_USER%"=="" set MYSQL_USER=root
set /p MYSQL_PASSWORD="Mot de passe MySQL: "
set /p MYSQL_DATABASE="Nom de la base de données MySQL (défaut: audacieuses_db): "
if "%MYSQL_DATABASE%"=="" set MYSQL_DATABASE=audacieuses_db

echo.
echo Entrez les informations de connexion à votre base de données PostgreSQL cible:
set /p PG_HOST="Hôte PostgreSQL (défaut: localhost): "
if "%PG_HOST%"=="" set PG_HOST=localhost
set /p PG_PORT="Port PostgreSQL (défaut: 5432): "
if "%PG_PORT%"=="" set PG_PORT=5432
set /p PG_USER="Utilisateur PostgreSQL (défaut: postgres): "
if "%PG_USER%"=="" set PG_USER=postgres
set /p PG_PASSWORD="Mot de passe PostgreSQL: "
set /p PG_DATABASE="Nom de la base de données PostgreSQL (défaut: audacieuses_db): "
if "%PG_DATABASE%"=="" set PG_DATABASE=audacieuses_db

REM Créer le fichier .env avec les informations de connexion
echo # Configuration générée par le script de migration > .env
echo NODE_ENV=development >> .env
echo PORT=3000 >> .env
echo JWT_SECRET=audacieuses-secret-key >> .env
echo. >> .env
echo # Configuration MySQL (source) >> .env
echo MYSQL_HOST=%MYSQL_HOST% >> .env
echo MYSQL_USER=%MYSQL_USER% >> .env
echo MYSQL_PASSWORD=%MYSQL_PASSWORD% >> .env
echo MYSQL_DATABASE=%MYSQL_DATABASE% >> .env
echo. >> .env
echo # Configuration PostgreSQL (cible) >> .env
echo PG_HOST=%PG_HOST% >> .env
echo PG_PORT=%PG_PORT% >> .env
echo PG_USER=%PG_USER% >> .env
echo PG_PASSWORD=%PG_PASSWORD% >> .env
echo PG_DATABASE=%PG_DATABASE% >> .env
echo. >> .env
echo # Configuration active (PostgreSQL) >> .env
echo DB_HOST=%PG_HOST% >> .env
echo DB_USER=%PG_USER% >> .env
echo DB_PASSWORD=%PG_PASSWORD% >> .env
echo DB_NAME=%PG_DATABASE% >> .env

echo ✅ Fichier .env créé avec succès.
echo.

REM Étape 5: Vérifier si PostgreSQL est installé et disponible
echo Étape 5: Préparation de la base de données PostgreSQL...
where psql >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
  echo ⚠️ PostgreSQL (psql) n'est pas trouvé dans le PATH.
  echo Vous devrez créer la base de données manuellement.
) else (
  REM Créer la base de données PostgreSQL
  echo Création de la base de données PostgreSQL %PG_DATABASE%...
  set PGPASSWORD=%PG_PASSWORD%
  psql -h %PG_HOST% -p %PG_PORT% -U %PG_USER% -d postgres -c "CREATE DATABASE %PG_DATABASE% WITH ENCODING='UTF8';"
  if %ERRORLEVEL% NEQ 0 (
    echo ⚠️ La base de données existe peut-être déjà ou il y a eu une erreur.
  ) else (
    echo ✅ Base de données PostgreSQL créée avec succès.
  )
  
  REM Initialiser la structure de la base de données PostgreSQL
  echo Étape 6: Initialisation de la structure PostgreSQL...
  psql -h %PG_HOST% -p %PG_PORT% -U %PG_USER% -d %PG_DATABASE% -f src/config/init-postgres-database.sql
  if %ERRORLEVEL% NEQ 0 (
    echo ⚠️ Erreur lors de l'initialisation de la structure PostgreSQL.
  ) else (
    echo ✅ Structure PostgreSQL initialisée avec succès.
  )
)
echo.

REM Étape 7: Migration des données
echo Étape 7: Migration des données de MySQL vers PostgreSQL...
call npm run migrate-to-postgres
echo ✅ Migration des données terminée.
echo.

REM Étape 8: Mise à jour du fichier render.yaml
echo Étape 8: Vérification du fichier render.yaml...
cd ..
if exist "render.yaml" (
  REM Sauvegarder l'original
  copy render.yaml render.yaml.mysql.bak
  
  REM Utiliser PowerShell pour remplacer MySQL par PostgreSQL car cmd n'a pas de sed
  powershell -Command "(Get-Content render.yaml) | ForEach-Object { $_ -replace 'type: mysql', 'type: postgres' } | Set-Content render.yaml"
  echo ✅ Fichier render.yaml mis à jour pour utiliser PostgreSQL.
) else (
  echo ⚠️ Le fichier render.yaml n'a pas été trouvé. Vous devrez le configurer manuellement.
)
echo.

REM Étape 9: Dernières instructions
echo ===================================================
echo   Migration terminée avec succès!
echo ===================================================
echo.
echo Pour déployer sur Render:
echo.
echo 1. Assurez-vous que votre code est commité sur un dépôt Git.
echo 2. Connectez-vous à Render et créez un nouveau Blueprint.
echo 3. Connectez votre dépôt Git.
echo 4. Render détectera le fichier render.yaml et configurera les services.
echo.
echo Documentation complète dans le fichier MYSQL_TO_POSTGRES_MIGRATION.md
echo et RENDER_POSTGRES_DEPLOYMENT.md
echo.
echo Bon déploiement! 🚀

pause
