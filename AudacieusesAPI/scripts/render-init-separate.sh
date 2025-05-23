#!/bin/bash
# Script pour initialiser PostgreSQL sur Render après le déploiement séparé
# À exécuter dans le shell du service API

echo "=== Initialisation de PostgreSQL sur Render ==="

# Vérifier les variables d'environnement
if [ -z "$DB_HOST" ] || [ -z "$DB_DATABASE" ] || [ -z "$DB_USERNAME" ] || [ -z "$DB_PASSWORD" ]; then
  echo "Erreur: Variables d'environnement manquantes"
  echo "Assurez-vous que DB_HOST, DB_DATABASE, DB_USERNAME et DB_PASSWORD sont définies"
  exit 1
fi

echo "Connexion à la base de données PostgreSQL..."

# Créer les tables de base
PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -U $DB_USERNAME -d $DB_DATABASE << EOF
-- Table des rôles
CREATE TABLE IF NOT EXISTS roles (
  id SERIAL PRIMARY KEY,
  nom VARCHAR(50) NOT NULL,
  description VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT role_nom_unique UNIQUE (nom)
);

-- Créer la fonction pour mettre à jour le champ updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS \$\$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
\$\$ language 'plpgsql';

-- Créer le trigger pour la table roles
DO \$\$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'update_roles_updated_at'
  ) THEN
    CREATE TRIGGER update_roles_updated_at
    BEFORE UPDATE ON roles
    FOR EACH ROW
    EXECUTE PROCEDURE update_updated_at_column();
  END IF;
EXCEPTION WHEN OTHERS THEN
  -- La table n'existe peut-être pas encore
  RAISE NOTICE 'Erreur lors de la création du trigger: %', SQLERRM;
END \$\$;

-- Insérer les rôles par défaut
INSERT INTO roles (nom, description)
VALUES 
  ('admin', 'Administrateur du système'),
  ('coach', 'Coach pour les utilisateurs'),
  ('client', 'Client standard')
ON CONFLICT (nom) DO NOTHING;

-- Table des utilisateurs
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  mail VARCHAR(100) NOT NULL UNIQUE,
  mdp VARCHAR(255) NOT NULL,
  prenom VARCHAR(100) NOT NULL,
  nom VARCHAR(100) NOT NULL,
  telephone VARCHAR(20),
  date_creation TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  date_modification TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  role_id INTEGER REFERENCES roles(id)
);

-- Créer le trigger pour la table users
DO \$\$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'update_users_date_modification'
  ) THEN
    CREATE TRIGGER update_users_date_modification
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE PROCEDURE update_updated_at_column();
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Erreur lors de la création du trigger: %', SQLERRM;
END \$\$;

-- Créer un utilisateur admin par défaut (mot de passe: Admin123!)
INSERT INTO users (mail, mdp, prenom, nom, role_id)
VALUES ('admin@lesaudacieuses.com', 
       '$2b$10$3OFOSKZ0ztiMh2Ctii.QAO6X1QnWqjTJ71N.IYU/ZCXSFxcZwEVQy', 
       'Admin', 'Système', 
       (SELECT id FROM roles WHERE nom = 'admin'))
ON CONFLICT (mail) DO NOTHING;
EOF

# Vérifier le résultat
if [ $? -eq 0 ]; then
  echo "✅ Initialisation réussie des tables de base"
else
  echo "❌ Erreur lors de l'initialisation des tables de base"
  exit 1
fi

echo "=== Initialisation terminée ==="

# Liste des tables créées
echo "Tables dans la base de données:"
PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -U $DB_USERNAME -d $DB_DATABASE -c "\dt"

echo "Pour initialiser complètement la base de données, importez le fichier SQL complet."
