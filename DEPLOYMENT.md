# Audacieuses - Instructions de déploiement sur Render.com

Ce document explique comment déployer l'application Audacieuses (frontend Angular, API Node.js et base de données MySQL) sur la plateforme Render.com.

## Prérequis

- Un compte Render.com
- Un compte GitHub pour héberger votre code source

## Étapes de déploiement

### 1. Préparation du code

1. Créez un dépôt GitHub contenant votre code.
2. Assurez-vous que le fichier `render.yaml` est à la racine du projet.

### 2. Déploiement avec Render Blueprint

1. Connectez-vous à votre compte Render.com
2. Cliquez sur "New Blueprint" dans le tableau de bord
3. Connectez votre compte GitHub et sélectionnez le dépôt contenant votre projet
4. Render détectera automatiquement le fichier `render.yaml` et configurera les services
5. Vérifiez les paramètres et cliquez sur "Apply Blueprint"

### 3. Configuration des variables d'environnement

Après le déploiement, certaines variables d'environnement sensibles doivent être définies manuellement :

1. Accédez au service `audacieuses-api` dans votre tableau de bord Render
2. Allez dans la section "Environment"
3. Ajoutez la variable d'environnement `JWT_SECRET` avec une valeur sécurisée

### 4. Initialisation de la base de données

Une fois les services déployés, vous devrez initialiser votre base de données :

1. Accédez à la base de données MySQL dans le tableau de bord Render
2. Utilisez les informations de connexion pour vous connecter à la base avec un client MySQL
3. Importez le schéma de base de données depuis le fichier `AudacieusesAPI/src/config/init-database.sql`

## Configuration supplémentaire

### CORS

L'API est configurée pour accepter les requêtes provenant de l'URL du frontend. Si vous rencontrez des problèmes de CORS, vérifiez la configuration dans le fichier `app.js` de l'API.

### Stockage des fichiers

Pour les uploads de fichiers, Render offre un stockage éphémère. Pour une solution permanente, envisagez d'utiliser un service comme AWS S3 ou DigitalOcean Spaces.

## Limitations du plan gratuit

Le plan gratuit de Render a certaines limitations à connaître :

- Services web : mise en veille après 15 minutes d'inactivité
- Base de données MySQL : 
  - 1 Go de stockage
  - Limitée à 512 MB de RAM
  - Expirera après 90 jours (possibilité de créer une nouvelle instance)

Pour une utilisation en production, envisagez de passer à un plan payant.
