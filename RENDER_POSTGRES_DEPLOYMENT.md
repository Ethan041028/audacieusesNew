# Déploiement sur Render avec PostgreSQL

Ce guide explique comment déployer l'application "Les Audacieuses" sur Render en utilisant PostgreSQL comme base de données.

## Prérequis

- Un compte Render (https://render.com)
- Un dépôt Git contenant votre code source
- Avoir configuré votre application pour fonctionner avec PostgreSQL
- Avoir testé l'application localement avec PostgreSQL (`test-postgres-local.bat` ou `test-postgres-local.sh`)

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
