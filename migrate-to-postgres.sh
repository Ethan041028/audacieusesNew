#!/bin/bash
# Script de migration de MySQL vers PostgreSQL pour Les Audacieuses
# À exécuter depuis le répertoire racine du projet

echo "==================================================="
echo "  Migration de MySQL vers PostgreSQL pour Render"
echo "==================================================="
echo ""

# Vérifier si nous sommes dans le bon répertoire
if [ ! -d "AudacieusesAPI" ] || [ ! -d "AudacieusesWeb" ]; then
  echo "ERROR: Ce script doit être exécuté depuis le répertoire racine du projet Les Audacieuses."
  exit 1
fi

# Étape 1: Installer les dépendances PostgreSQL
echo "Étape 1: Installation des dépendances PostgreSQL..."
cd AudacieusesAPI
npm install pg pg-hstore --save
echo "✅ Dépendances PostgreSQL installées avec succès."
echo ""

# Étape 2: Adapter les modèles pour PostgreSQL
echo "Étape 2: Adaptation des modèles Sequelize pour PostgreSQL..."
npm run adapt-models
echo "✅ Modèles adaptés pour PostgreSQL."
echo ""

# Étape 3: Adapter les requêtes SQL
echo "Étape 3: Adaptation des requêtes SQL pour PostgreSQL..."
npm run adapt-queries
echo "✅ Requêtes SQL adaptées pour PostgreSQL."
echo ""

# Étape 4: Demander les informations de connexion aux bases de données
echo "Étape 4: Configuration des connexions aux bases de données..."
echo ""
echo "Entrez les informations de connexion à votre base de données MySQL source:"
read -p "Hôte MySQL (défaut: localhost): " MYSQL_HOST
MYSQL_HOST=${MYSQL_HOST:-localhost}
read -p "Utilisateur MySQL (défaut: root): " MYSQL_USER
MYSQL_USER=${MYSQL_USER:-root}
read -s -p "Mot de passe MySQL: " MYSQL_PASSWORD
echo ""
read -p "Nom de la base de données MySQL (défaut: audacieuses_db): " MYSQL_DATABASE
MYSQL_DATABASE=${MYSQL_DATABASE:-audacieuses_db}

echo ""
echo "Entrez les informations de connexion à votre base de données PostgreSQL cible:"
read -p "Hôte PostgreSQL (défaut: localhost): " PG_HOST
PG_HOST=${PG_HOST:-localhost}
read -p "Port PostgreSQL (défaut: 5432): " PG_PORT
PG_PORT=${PG_PORT:-5432}
read -p "Utilisateur PostgreSQL (défaut: postgres): " PG_USER
PG_USER=${PG_USER:-postgres}
read -s -p "Mot de passe PostgreSQL: " PG_PASSWORD
echo ""
read -p "Nom de la base de données PostgreSQL (défaut: audacieuses_db): " PG_DATABASE
PG_DATABASE=${PG_DATABASE:-audacieuses_db}

# Créer le fichier .env avec les informations de connexion
echo "# Configuration générée par le script de migration" > .env
echo "NODE_ENV=development" >> .env
echo "PORT=3000" >> .env
echo "JWT_SECRET=audacieuses-secret-key" >> .env
echo "" >> .env
echo "# Configuration MySQL (source)" >> .env
echo "MYSQL_HOST=$MYSQL_HOST" >> .env
echo "MYSQL_USER=$MYSQL_USER" >> .env
echo "MYSQL_PASSWORD=$MYSQL_PASSWORD" >> .env
echo "MYSQL_DATABASE=$MYSQL_DATABASE" >> .env
echo "" >> .env
echo "# Configuration PostgreSQL (cible)" >> .env
echo "PG_HOST=$PG_HOST" >> .env
echo "PG_PORT=$PG_PORT" >> .env
echo "PG_USER=$PG_USER" >> .env
echo "PG_PASSWORD=$PG_PASSWORD" >> .env
echo "PG_DATABASE=$PG_DATABASE" >> .env
echo "" >> .env
echo "# Configuration active (PostgreSQL)" >> .env
echo "DB_HOST=$PG_HOST" >> .env
echo "DB_USER=$PG_USER" >> .env
echo "DB_PASSWORD=$PG_PASSWORD" >> .env
echo "DB_NAME=$PG_DATABASE" >> .env

echo "✅ Fichier .env créé avec succès."
echo ""

# Étape 5: Créer la base de données PostgreSQL si elle n'existe pas
echo "Étape 5: Préparation de la base de données PostgreSQL..."
# Cette commande vérifie si la base de données existe déjà
PGPASSWORD=$PG_PASSWORD psql -h $PG_HOST -p $PG_PORT -U $PG_USER -d postgres -tc "SELECT 1 FROM pg_database WHERE datname = '$PG_DATABASE'" | grep -q 1
if [ $? -ne 0 ]; then
  echo "Création de la base de données PostgreSQL $PG_DATABASE..."
  PGPASSWORD=$PG_PASSWORD psql -h $PG_HOST -p $PG_PORT -U $PG_USER -d postgres -c "CREATE DATABASE $PG_DATABASE;"
  echo "✅ Base de données PostgreSQL créée avec succès."
else
  echo "La base de données PostgreSQL $PG_DATABASE existe déjà."
fi
echo ""

# Étape 6: Initialiser la structure de la base de données PostgreSQL
echo "Étape 6: Initialisation de la structure PostgreSQL..."
PGPASSWORD=$PG_PASSWORD psql -h $PG_HOST -p $PG_PORT -U $PG_USER -d $PG_DATABASE -f src/config/init-postgres-database.sql
echo "✅ Structure PostgreSQL initialisée avec succès."
echo ""

# Étape 7: Migration des données
echo "Étape 7: Migration des données de MySQL vers PostgreSQL..."
npm run migrate-to-postgres
echo "✅ Migration des données terminée."
echo ""

# Étape 8: Mise à jour du fichier render.yaml
echo "Étape 8: Vérification du fichier render.yaml..."
cd ..
if [ -f "render.yaml" ]; then
  # Vérifier si le fichier a déjà été mis à jour pour PostgreSQL
  if grep -q "type: postgres" render.yaml; then
    echo "✅ Le fichier render.yaml est déjà configuré pour PostgreSQL."
  else
    # Sauvegarder l'original
    cp render.yaml render.yaml.mysql.bak
    
    # Remplacer MySQL par PostgreSQL
    sed -i 's/type: mysql/type: postgres/g' render.yaml
    echo "✅ Fichier render.yaml mis à jour pour utiliser PostgreSQL."
  fi
else
  echo "⚠️ Le fichier render.yaml n'a pas été trouvé. Vous devrez le configurer manuellement."
fi
echo ""

# Étape 9: Dernières instructions
echo "==================================================="
echo "  Migration terminée avec succès!"
echo "==================================================="
echo ""
echo "Pour déployer sur Render:"
echo ""
echo "1. Assurez-vous que votre code est commité sur un dépôt Git."
echo "2. Connectez-vous à Render et créez un nouveau Blueprint."
echo "3. Connectez votre dépôt Git."
echo "4. Render détectera le fichier render.yaml et configurera les services."
echo ""
echo "Documentation complète dans le fichier MYSQL_TO_POSTGRES_MIGRATION.md"
echo "et RENDER_POSTGRES_DEPLOYMENT.md"
echo ""
echo "Bon déploiement! 🚀"
