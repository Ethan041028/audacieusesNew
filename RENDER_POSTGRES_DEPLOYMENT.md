# Guide de déploiement sur Render avec PostgreSQL

Ce guide explique comment déployer l'application "Les Audacieuses" sur Render en utilisant PostgreSQL comme base de données.

## Prérequis

- Un compte Render (https://render.com)
- Un dépôt Git contenant votre code source
- Les modifications pour PostgreSQL déjà appliquées au code

## Déploiement à l'aide du Blueprint

### 1. Préparation du dépôt

Assurez-vous que votre dépôt Git contient :
- Le fichier `render.yaml` à la racine du projet
- Les fichiers de l'API et du frontend
- Les fichiers d'initialisation PostgreSQL

### 2. Déploiement via Blueprint

1. Connectez-vous à votre compte Render
2. Cliquez sur "New" puis "Blueprint"
3. Sélectionnez votre dépôt Git
4. Render détectera automatiquement le fichier `render.yaml`
5. Vérifiez la configuration des services et base de données
6. Cliquez sur "Apply"

### 3. Initialisation de la base de données

Une fois les services déployés :

1. Accédez au dashboard de votre service API
2. Cliquez sur "Shell"
3. Exécutez le script d'initialisation :

```bash
cd AudacieusesAPI
chmod +x scripts/render-postgres-init.sh
./scripts/render-postgres-init.sh
```

### 4. Vérification du déploiement

1. Accédez à l'URL de votre API : `https://audacieuses-api.onrender.com/api/health`
2. Vérifiez que vous recevez une réponse JSON avec `"status": "OK"`
3. Accédez au frontend : `https://audacieuses-web.onrender.com`

## Déploiement manuel (sans Blueprint)

Si vous préférez déployer manuellement :

### 1. Créer la base de données PostgreSQL

1. Dans le dashboard Render, créez une nouvelle base de données PostgreSQL
2. Notez les informations de connexion

### 2. Déployer l'API

1. Créez un nouveau service Web
2. Sélectionnez votre dépôt Git
3. Configurez le service :
   - **Nom** : audacieuses-api
   - **Environnement** : Node
   - **Région** : Frankfurt (ou autre)
   - **Branche** : main
   - **Répertoire** : AudacieusesAPI
   - **Commande de build** : `npm install`
   - **Commande de démarrage** : `npm start`

4. Ajoutez les variables d'environnement :
   - `NODE_ENV` : production
   - `DB_DIALECT` : postgres
   - `DB_HOST` : [hôte de votre base de données]
   - `DB_DATABASE` : [nom de votre base de données]
   - `DB_USERNAME` : [utilisateur de votre base de données]
   - `DB_PASSWORD` : [mot de passe de votre base de données]
   - `JWT_SECRET` : [votre secret JWT]
   - `FRONTEND_URL` : URL de votre frontend

5. Cliquez sur "Create Web Service"

### 3. Déployer le frontend

1. Créez un nouveau service Web
2. Configurez le service :
   - **Nom** : audacieuses-web
   - **Environnement** : Node
   - **Région** : Frankfurt (ou autre)
   - **Branche** : main
   - **Répertoire** : AudacieusesWeb
   - **Commande de build** : `npm install && npm run build`
   - **Commande de démarrage** : `npm install -g serve && serve -s dist/audacieuses-web/browser -l $PORT`

3. Ajoutez la variable d'environnement :
   - `NODE_VERSION` : 20.11.1

4. Cliquez sur "Create Web Service"

### 4. Initialisation de la base de données

Suivez les mêmes étapes que pour le déploiement via Blueprint (section 3).

## Dépannage

### Problème de connexion à la base de données

- **Symptôme** : L'API retourne des erreurs de connexion à la base de données
- **Solution** : 
  - Vérifiez les variables d'environnement de connexion
  - Assurez-vous que le pare-feu de la base de données autorise les connexions depuis l'API
  - Vérifiez les logs de l'API pour des messages d'erreur détaillés

### Erreurs PostgreSQL spécifiques

- **Syntaxe SQL incompatible** : Vérifiez les fichiers d'initialisation et les requêtes
- **Erreur 'referenced_table_name'** : Assurez-vous que les scripts de correction ont été exécutés
- **Problèmes de séquence d'ID** : Réinitialisez les séquences si nécessaire

### Erreur 503 Service Unavailable

- Vérifiez les logs du service pour identifier la cause
- Assurez-vous que l'application démarre correctement
- Vérifiez la route de healthcheck : `/api/health`

## Maintenance

### Mises à jour de l'application

1. Poussez vos changements sur le dépôt Git
2. Render déploiera automatiquement les modifications (si autoDeploy est activé)

### Sauvegardes de la base de données

Render effectue des sauvegardes automatiques, mais vous pouvez également :
1. Accéder à votre base de données dans le dashboard Render
2. Cliquer sur "Backups"
3. Créer une sauvegarde manuelle ou configurer la fréquence des sauvegardes

## Ressources utiles

- [Documentation Render](https://render.com/docs)
- [Documentation PostgreSQL](https://www.postgresql.org/docs/)
- [Documentation Sequelize pour PostgreSQL](https://sequelize.org/docs/v6/other-topics/dialect-specific-things/#postgresql)

3. **Vérifiez et approuvez les ressources**
   - Render affichera les services qui seront créés
   - Vérifiez que la base de données PostgreSQL est bien configurée
   - Cliquez sur "Apply"

4. **Initialisation de la base de données**
   - Une fois les services déployés, connectez-vous à votre base de données PostgreSQL
   - Exécutez le script d'initialisation `init-postgres-database.sql`
   - Vous pouvez utiliser le script shell fourni : `scripts/init-postgres-db.sh`

   ```bash
   # Exécuter depuis le terminal de l'interface Render
   cd AudacieusesAPI
   chmod +x scripts/init-postgres-db.sh
   ./scripts/init-postgres-db.sh
   ```

5. **Vérifiez le déploiement**
   - Accédez à l'URL de votre API : `https://audacieuses-api.onrender.com/api/health`
   - Accédez à l'URL du frontend : `https://audacieuses-web.onrender.com`

## Résolution des problèmes courants

### Problème de connexion à la base de données
- Vérifiez que les variables d'environnement sont correctement configurées
- Consultez les journaux de l'API pour les messages d'erreur spécifiques
- Vérifiez que les ports de la base de données sont correctement configurés
- Assurez-vous que le service de base de données est en cours d'exécution

### Erreurs liées à PostgreSQL
- Consultez le fichier `POSTGRES_CORRECTIONS.md` pour les problèmes spécifiques à PostgreSQL
- Les erreurs liées à `REFERENCED_TABLE_NAME` ont été corrigées dans le script `fix-postgres-queries.js`
- Si vous rencontrez des erreurs de type de données, vérifiez que tous les modèles ont été correctement adaptés

### Erreurs d'initialisation de la base de données
- Vérifiez que le script SQL d'initialisation a été correctement exécuté
- Les erreurs de syntaxe SQL peuvent être différentes entre MySQL et PostgreSQL
- Consultez les journaux pour les messages d'erreur spécifiques

## Gestion des données

### Migration des données depuis MySQL
Si vous avez déjà une base de données MySQL en production et que vous souhaitez migrer les données vers PostgreSQL sur Render :

1. Exportez vos données MySQL en local
2. Exécutez le script de migration local `scripts/migrate-mysql-to-postgres.js`
3. Exportez les données PostgreSQL locales
4. Importez-les dans votre base de données PostgreSQL sur Render

```bash
# Pour importer des données dans PostgreSQL sur Render
psql postgres://user:password@host:port/database < export.sql
```

## Surveillance et maintenance

### Journaux d'application
- Consultez les journaux de l'API sur le tableau de bord Render
- Les erreurs liées à la base de données seront affichées dans les journaux

### Sauvegardes de la base de données
- Render propose des sauvegardes automatiques pour PostgreSQL
- Configurez la fréquence des sauvegardes dans les paramètres du service de base de données

## Support

Si vous rencontrez des problèmes lors du déploiement, consultez :
- La documentation Render : https://render.com/docs
- Le fichier `POSTGRES_CORRECTIONS.md` pour les problèmes spécifiques à PostgreSQL
- Le fichier `MIGRATION_RESUME.md` pour un résumé des modifications effectuées

Si l'API ne peut pas se connecter à la base de données, vérifiez :
- Les variables d'environnement sont correctement définies
- Le fichier `database.js` utilise bien 'postgres' comme dialect
- Les identifiants de connexion sont corrects

### Problèmes avec le script SQL

PostgreSQL a une syntaxe légèrement différente de MySQL. Si vous rencontrez des erreurs :
- Vérifiez les types de données (INT → INTEGER, AUTO_INCREMENT → SERIAL)
- Les fonctions de date sont différentes (NOW() → CURRENT_TIMESTAMP)
- PostgreSQL nécessite des triggers explicites pour gérer l'auto-update des colonnes de timestamp

### Erreurs relatives à SSL

Si vous rencontrez des erreurs SSL avec PostgreSQL :
- Assurez-vous que la configuration dialectOptions contient les options SSL appropriées
- Modifiez `database.js` pour inclure `{ ssl: { require: true, rejectUnauthorized: false } }`

## Support

Si vous rencontrez des problèmes lors du déploiement, consultez :
- La documentation de Render : https://render.com/docs
- La documentation de PostgreSQL : https://www.postgresql.org/docs/
