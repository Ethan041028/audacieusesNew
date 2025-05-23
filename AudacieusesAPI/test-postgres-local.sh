#!/bin/bash
# Script pour tester l'application avec PostgreSQL localement

echo "=== Démarrage du test local avec PostgreSQL ==="

# Vérifier si le conteneur PostgreSQL est déjà en cours d'exécution
if [ $(docker ps -q -f name=postgres-audacieuses) ]; then
  echo "Le conteneur PostgreSQL est déjà en cours d'exécution"
else
  echo "Démarrage du conteneur PostgreSQL..."
  docker run --name postgres-audacieuses -e POSTGRES_PASSWORD=postgres -e POSTGRES_USER=postgres -e POSTGRES_DB=audacieuses_db -p 5432:5432 -d postgres:16
  
  # Attendre que PostgreSQL soit prêt
  echo "Attente du démarrage de PostgreSQL..."
  sleep 5
fi

# Installer les dépendances si nécessaire
if [ ! -d "node_modules" ]; then
  echo "Installation des dépendances..."
  npm install
fi

# Assurer que pg et pg-hstore sont installés
if ! npm list pg pg-hstore 2>/dev/null | grep -q 'pg@'; then
  echo "Installation de pg et pg-hstore..."
  npm install pg pg-hstore --save
fi

# Installer node-fetch pour les tests si nécessaire
if ! npm list node-fetch 2>/dev/null | grep -q 'node-fetch@'; then
  echo "Installation de node-fetch pour les tests..."
  npm install node-fetch@2 --save-dev
fi

# Configurer les variables d'environnement pour PostgreSQL
export DB_DIALECT=postgres
export DB_HOST=localhost
export DB_PORT=5432
export DB_USERNAME=postgres
export DB_PASSWORD=postgres
export DB_DATABASE=audacieuses_db
export NODE_PORT=3500  # Port différent pour éviter les conflits
export API_URL=http://localhost:3500/api

# Initialiser la base de données PostgreSQL
echo "Initialisation de la base de données PostgreSQL..."
node src/config/init-postgres-database.js

# Exécuter les scripts de correction
echo "Correction des modèles pour PostgreSQL..."
node scripts/adapt-models-for-postgres.js

echo "Correction des requêtes SQL pour PostgreSQL..."
node scripts/adapt-sql-queries-for-postgres.js

echo "Correction des problèmes spécifiques à PostgreSQL..."
node scripts/fix-postgres-queries.js

# Démarrer l'application en arrière-plan
echo "Démarrage de l'application..."
node src/server.js &
APP_PID=$!

# Attendre que l'application démarre
echo "Attente du démarrage de l'application..."
sleep 5

# Exécuter les tests de l'API
echo "Exécution des tests de l'API..."
node scripts/test-postgres-api.js
TEST_RESULT=$?

# Arrêter l'application
echo "Arrêt de l'application..."
kill $APP_PID

if [ $TEST_RESULT -eq 0 ]; then
  echo "Tests réussis! L'application est prête pour le déploiement sur Render."
  exit 0
else
  echo "Certains tests ont échoué. Veuillez corriger les erreurs avant le déploiement."
  exit 1
fi
