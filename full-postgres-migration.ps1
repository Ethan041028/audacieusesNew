# Script de migration complète de MySQL vers PostgreSQL
$ErrorActionPreference = "Stop"

Write-Host "=== Début de la migration de MySQL vers PostgreSQL ===" -ForegroundColor Green

# 1. Vérifier que Docker est installé
try {
    $dockerVersion = docker --version
    Write-Host "Docker est installé: $dockerVersion" -ForegroundColor Green
}
catch {
    Write-Host "ERREUR: Docker n'est pas installé. Veuillez l'installer avant de continuer." -ForegroundColor Red
    exit 1
}

# 2. Créer et démarrer un conteneur PostgreSQL
Write-Host "Vérification du conteneur PostgreSQL..." -ForegroundColor Yellow
$containerExists = docker ps -a --filter "name=postgres-audacieuses" --format "{{.Names}}"

if ($containerExists -eq "postgres-audacieuses") {
    $containerRunning = docker ps --filter "name=postgres-audacieuses" --format "{{.Names}}"
    if ($containerRunning -ne "postgres-audacieuses") {
        Write-Host "Démarrage du conteneur PostgreSQL existant..." -ForegroundColor Yellow
        docker start postgres-audacieuses
    } else {
        Write-Host "Le conteneur PostgreSQL est déjà en cours d'exécution" -ForegroundColor Green
    }
} else {
    Write-Host "Création d'un nouveau conteneur PostgreSQL..." -ForegroundColor Yellow
    docker run --name postgres-audacieuses -e POSTGRES_PASSWORD=postgres -e POSTGRES_USER=postgres -e POSTGRES_DB=audacieuses_db -p 5432:5432 -d postgres:16
}

# 3. Attendre que PostgreSQL soit prêt
Write-Host "Attente du démarrage de PostgreSQL..." -ForegroundColor Yellow
Start-Sleep -Seconds 5

# 4. Aller dans le dossier de l'API
Set-Location -Path ".\AudacieusesAPI"

# 5. Installer les dépendances de l'API si nécessaire
if (-not (Test-Path -Path ".\node_modules")) {
    Write-Host "Installation des dépendances de l'API..." -ForegroundColor Yellow
    npm install
}

# 6. Installer pg et pg-hstore si nécessaire
$pgInstalled = npm list pg 2>$null | Select-String -Pattern "pg@"
if (-not $pgInstalled) {
    Write-Host "Installation de pg et pg-hstore..." -ForegroundColor Yellow
    npm install pg pg-hstore --save
}

# 7. Configurer les variables d'environnement pour PostgreSQL
$env:DB_DIALECT = "postgres"
$env:DB_HOST = "localhost"
$env:DB_PORT = "5432"
$env:DB_USERNAME = "postgres"
$env:DB_PASSWORD = "postgres"
$env:DB_DATABASE = "audacieuses_db"

# Garder aussi les variables MySQL pour la migration
$env:MYSQL_HOST = "localhost"
$env:MYSQL_USER = "root"
$env:MYSQL_PASSWORD = ""
$env:MYSQL_DATABASE = "audacieuses_db"

$env:PG_HOST = "localhost"
$env:PG_PORT = "5432"
$env:PG_USER = "postgres"
$env:PG_PASSWORD = "postgres"
$env:PG_DATABASE = "audacieuses_db"

# 8. Initialiser la base de données PostgreSQL
Write-Host "Initialisation de la base de données PostgreSQL..." -ForegroundColor Yellow
node .\src\config\init-postgres-database.js

# 9. Exécuter les scripts d'adaptation
Write-Host "Adaptation des modèles pour PostgreSQL..." -ForegroundColor Yellow
node .\scripts\adapt-models-for-postgres.js

Write-Host "Adaptation des requêtes SQL pour PostgreSQL..." -ForegroundColor Yellow
node .\scripts\adapt-sql-queries-for-postgres.js

Write-Host "Correction des problèmes spécifiques à PostgreSQL..." -ForegroundColor Yellow
node .\scripts\fix-postgres-queries.js

# 10. Migrer les données de MySQL vers PostgreSQL
Write-Host "Migration des données de MySQL vers PostgreSQL..." -ForegroundColor Yellow
Write-Host "ATTENTION: Assurez-vous que MySQL est en cours d'exécution et contient les données à migrer." -ForegroundColor Red
$confirmation = Read-Host "Voulez-vous continuer avec la migration des données? (O/N)"

if ($confirmation -eq "O" -or $confirmation -eq "o" -or $confirmation -eq "oui") {
    node .\scripts\migrate-mysql-to-postgres.js
} else {
    Write-Host "Migration des données ignorée à la demande de l'utilisateur." -ForegroundColor Yellow
}

# 11. Exécuter les tests
Write-Host "Exécution des tests avec PostgreSQL..." -ForegroundColor Yellow
$confirmation = Read-Host "Voulez-vous exécuter les tests d'API pour vérifier la migration? (O/N)"

if ($confirmation -eq "O" -or $confirmation -eq "o" -or $confirmation -eq "oui") {
    & .\test-postgres-local.bat
    if ($LASTEXITCODE -eq 0) {
        Write-Host "Tous les tests ont réussi! La migration est terminée avec succès." -ForegroundColor Green
    } else {
        Write-Host "Certains tests ont échoué. Veuillez consulter les logs pour plus d'informations." -ForegroundColor Red
    }
} else {
    Write-Host "Tests ignorés à la demande de l'utilisateur." -ForegroundColor Yellow
}

# 12. Retourner au dossier principal
Set-Location -Path ".."

Write-Host "=== Migration terminée ===" -ForegroundColor Green
Write-Host "Pour déployer sur Render, veuillez consulter le fichier RENDER_POSTGRES_DEPLOYMENT.md" -ForegroundColor Cyan
