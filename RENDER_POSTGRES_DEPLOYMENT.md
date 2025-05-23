# Déploiement sur Render avec PostgreSQL

Ce guide explique comment déployer l'application "Les Audacieuses" sur Render en utilisant PostgreSQL comme base de données.

## Prérequis

- Un compte Render (https://render.com)
- Un dépôt Git contenant votre code source
- Avoir configuré votre application pour fonctionner avec PostgreSQL

## Configuration du blueprint Render (render.yaml)

Le fichier `render.yaml` est déjà configuré pour déployer :
- Le front-end Angular (audacieuses-web)
- L'API Node.js (audacieuses-api)
- Une base de données PostgreSQL (audacieuses-db)

## Étapes de déploiement

1. **Connectez-vous à votre compte Render**

2. **Créez un nouveau Blueprint**
   - Dans le dashboard Render, cliquez sur "New" puis "Blueprint"
   - Connectez votre dépôt Git où se trouve votre code
   - Render détectera automatiquement le fichier `render.yaml`

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
