# Guide de déploiement séparé sur Render

Ce guide explique comment déployer séparément le frontend, l'API et la base de données de l'application "Les Audacieuses" sur Render.

## 1. Créer la base de données PostgreSQL

Commencez par créer la base de données, car vous aurez besoin des informations de connexion pour configurer l'API.

### Déploiement via le fichier YAML

1. Connectez-vous à votre compte Render
2. Cliquez sur "New" > "Blueprint"
3. Sélectionnez votre dépôt Git
4. Saisissez le chemin vers le fichier YAML : `render-database.yaml`
5. Cliquez sur "Apply"

### Déploiement manuel

1. Connectez-vous à votre compte Render
2. Cliquez sur "New" > "PostgreSQL"
3. Remplissez les informations suivantes :
   - **Nom** : audacieuses-db
   - **Région** : Frankfurt (ou la plus proche de vos utilisateurs)
   - **Plan** : Free (ou autre selon vos besoins)
   - **Nom de la base de données** : audacieuses_db
4. Cliquez sur "Create Database"

### Récupérer les informations de connexion

1. Une fois la base de données créée, cliquez dessus dans votre dashboard
2. Dans l'onglet "Info", notez les informations suivantes :
   - **Host** (Hostname)
   - **Database**
   - **User**
   - **Password** (cliquez sur "Reveal" pour le voir)
   - **Port** (généralement 5432)

## 2. Déployer l'API

### Préparation du fichier YAML

1. Ouvrez le fichier `render-api.yaml`
2. Remplacez les valeurs entre `{{...}}` par les informations de votre base de données :
   ```yaml
   - key: DB_HOST
     value: "postgres://votre-host"
   - key: DB_DATABASE
     value: "audacieuses_db"
   - key: DB_USERNAME
     value: "votre-utilisateur"
   - key: DB_PASSWORD
     value: "votre-mot-de-passe"
   ```

### Déploiement via le fichier YAML

1. Dans votre compte Render, cliquez sur "New" > "Blueprint"
2. Sélectionnez votre dépôt Git
3. Saisissez le chemin vers le fichier YAML : `render-api.yaml`
4. Cliquez sur "Apply"

### Déploiement manuel

1. Cliquez sur "New" > "Web Service"
2. Sélectionnez votre dépôt Git
3. Configurez le service :
   - **Nom** : audacieuses-api
   - **Environnement** : Node
   - **Région** : Frankfurt
   - **Branche** : main (ou votre branche de production)
   - **Dossier racine** : ./
   - **Commande de build** : `cd AudacieusesAPI && npm install`
   - **Commande de démarrage** : `cd AudacieusesAPI && npm start`
4. Ajoutez les variables d'environnement avec les informations de votre base de données
5. Cliquez sur "Create Web Service"

### Initialisation de la base de données

1. Une fois l'API déployée, cliquez sur "Shell" dans le dashboard du service
2. Exécutez les commandes suivantes :
   ```sh
   cd AudacieusesAPI
   chmod +x scripts/render-postgres-init.sh
   ./scripts/render-postgres-init.sh
   ```

## 3. Déployer le Frontend

### Déploiement via le fichier YAML

1. Dans votre compte Render, cliquez sur "New" > "Blueprint"
2. Sélectionnez votre dépôt Git
3. Saisissez le chemin vers le fichier YAML : `render-frontend.yaml`
4. Cliquez sur "Apply"

### Déploiement manuel

1. Cliquez sur "New" > "Web Service"
2. Sélectionnez votre dépôt Git
3. Configurez le service :
   - **Nom** : audacieuses-web
   - **Environnement** : Node
   - **Région** : Frankfurt
   - **Branche** : main (ou votre branche de production)
   - **Dossier racine** : ./
   - **Commande de build** : `cd AudacieusesWeb && npm install && npm install -g @angular/cli && npm run build`
   - **Commande de démarrage** : `cd AudacieusesWeb && npm install -g serve && serve -s dist/audacieuses-web/browser -l $PORT`
4. Ajoutez la variable d'environnement :
   - `NODE_VERSION` : 20.11.1
   - `API_URL` : https://audacieuses-api.onrender.com (URL de votre API)
5. Cliquez sur "Create Web Service"

## 4. Vérification du déploiement

1. Vérifiez que la base de données est en ligne dans votre dashboard Render
2. Accédez à l'URL de l'API : `https://audacieuses-api.onrender.com/api/health`
   - Vous devriez voir une réponse JSON avec `"status": "OK"`
3. Accédez à l'URL du frontend : `https://audacieuses-web.onrender.com`
   - Vous devriez voir l'interface utilisateur de l'application

## Dépannage

### Problèmes de base de données

Si l'API ne peut pas se connecter à la base de données :
1. Vérifiez les variables d'environnement dans l'API
2. Vérifiez que la base de données est en ligne
3. Assurez-vous que l'IP de l'API est autorisée à accéder à la base de données

### Problèmes d'API

Si l'API ne démarre pas correctement :
1. Vérifiez les logs dans le dashboard Render
2. Assurez-vous que le script `npm start` fonctionne correctement
3. Vérifiez que le port est correctement configuré (PORT=10000)

### Problèmes de Frontend

Si le frontend ne s'affiche pas ou ne peut pas communiquer avec l'API :
1. Vérifiez que l'API est accessible
2. Vérifiez les variables d'environnement du frontend
3. Assurez-vous que les requêtes CORS sont correctement configurées dans l'API
