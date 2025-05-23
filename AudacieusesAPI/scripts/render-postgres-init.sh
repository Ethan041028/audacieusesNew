#!/bin/bash
# Script d'initialisation de la base de données PostgreSQL pour Render
# À exécuter dans le terminal de service Render après le déploiement

echo "=== Initialisation de la base de données PostgreSQL sur Render ==="

# Vérifier les variables d'environnement
if [ -z "$DB_DATABASE" ] || [ -z "$DB_USERNAME" ] || [ -z "$DB_PASSWORD" ] || [ -z "$DB_HOST" ]; then
  echo "Erreur: Variables d'environnement de base de données manquantes"
  echo "Assurez-vous que DB_DATABASE, DB_USERNAME, DB_PASSWORD et DB_HOST sont définis"
  exit 1
fi

# Exécuter le script SQL depuis le fichier ou directement
echo "Exécution du script d'initialisation..."

# Option 1: Exécuter depuis un fichier SQL
if [ -f "src/config/init-postgres-database.sql" ]; then
  PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -U $DB_USERNAME -d $DB_DATABASE -f src/config/init-postgres-database.sql
  INIT_RESULT=$?
  
  if [ $INIT_RESULT -eq 0 ]; then
    echo "Base de données initialisée avec succès depuis le fichier SQL"
  else
    echo "Erreur lors de l'initialisation depuis le fichier SQL"
  fi
else
  echo "Fichier SQL non trouvé, création manuelle des tables..."
  
  # Option 2: Exécuter des commandes SQL directement
  PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -U $DB_USERNAME -d $DB_DATABASE << EOF
  -- Créer les tables principales si elles n'existent pas déjà
  
  -- Table des rôles
  CREATE TABLE IF NOT EXISTS roles (
    id SERIAL PRIMARY KEY,
    nom VARCHAR(50) NOT NULL,
    description VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT role_nom_unique UNIQUE (nom)
  );
  
  -- Insérer les rôles par défaut s'ils n'existent pas
  INSERT INTO roles (nom, description)
  VALUES 
    ('admin', 'Administrateur du système'),
    ('coach', 'Coach pour les utilisateurs'),
    ('client', 'Client standard')
  ON CONFLICT (nom) DO NOTHING;
  
  -- Créer la fonction pour mettre à jour le champ updated_at
  CREATE OR REPLACE FUNCTION update_updated_at_column()
  RETURNS TRIGGER AS \$\$
  BEGIN
    NEW.updated_at = now();
    RETURN NEW;
  END;
  \$\$ language 'plpgsql';
  
  -- Créer le trigger pour la table roles si pas déjà existant
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
    -- Le trigger existe peut-être déjà ou la table n'existe pas encore
    RAISE NOTICE 'Erreur lors de la création du trigger: %', SQLERRM;
  END \$\$;
EOF

  INIT_RESULT=$?
  
  if [ $INIT_RESULT -eq 0 ]; then
    echo "Base de données initialisée avec succès via commandes SQL directes"
  else
    echo "Erreur lors de l'initialisation via commandes SQL directes"
  fi
fi

echo "=== Fin de l'initialisation ==="
exit $INIT_RESULT
