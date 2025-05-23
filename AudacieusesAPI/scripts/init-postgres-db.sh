#!/bin/bash
# Script pour initialiser la base de données PostgreSQL sur Render
# À placer dans AudacieusesAPI/scripts/

echo "Initialisation de la base de données PostgreSQL..."

# Vérifier si les variables d'environnement sont définies
if [ -z "$DATABASE_URL" ]; then
  echo "ERREUR: La variable d'environnement DATABASE_URL n'est pas définie."
  exit 1
fi

# Exécuter le script SQL
echo "Exécution du script SQL d'initialisation..."
psql "$DATABASE_URL" < ../src/config/init-postgres-database.sql

echo "Base de données initialisée avec succès!"
