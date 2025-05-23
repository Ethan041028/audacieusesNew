# Résumé des modifications pour migrer vers PostgreSQL

## Modifications effectuées

1. **Installation des dépendances PostgreSQL**
   - Ajout de `pg` et `pg-hstore` au package.json
   - Suppression de `mysql2` (optionnel, gardé pour compatibilité)

2. **Configuration de la base de données**
   - Modification de `database.js` pour utiliser PostgreSQL
   - Ajout des options SSL pour la production

3. **Adaptation des modèles Sequelize**
   - Remplacement des types ENUM par STRING avec validation
   - Adaptation de la syntaxe spécifique à MySQL

4. **Conversion du script de création de base de données**
   - Création d'un nouveau fichier `init-postgres-database.sql`
   - Adaptation de la syntaxe MySQL vers PostgreSQL (AUTO_INCREMENT → SERIAL, etc.)
   - Ajout de triggers pour simuler le comportement de ON UPDATE CURRENT_TIMESTAMP

5. **Scripts d'automatisation**
   - Script d'adaptation des modèles
   - Script d'adaptation des requêtes SQL
   - Script de migration des données de MySQL vers PostgreSQL

6. **Mise à jour du fichier render.yaml**
   - Changement du type de base de données de `mysql` à `postgres`

7. **Documentation**
   - Guide de migration détaillé (MYSQL_TO_POSTGRES_MIGRATION.md)
   - Guide de déploiement sur Render (RENDER_POSTGRES_DEPLOYMENT.md)

8. **Scripts d'automatisation**
   - Script bash pour Linux/Mac (migrate-to-postgres.sh)
   - Script batch pour Windows (migrate-to-postgres.bat)

## Fichiers créés ou modifiés

1. **Fichiers créés :**
   - `AudacieusesAPI/src/config/init-postgres-database.sql`
   - `AudacieusesAPI/src/config/pg-data-types.js`
   - `AudacieusesAPI/scripts/adapt-models-for-postgres.js`
   - `AudacieusesAPI/scripts/adapt-sql-queries-for-postgres.js`
   - `AudacieusesAPI/scripts/migrate-mysql-to-postgres.js`
   - `AudacieusesAPI/scripts/init-postgres-db.sh`
   - `MYSQL_TO_POSTGRES_MIGRATION.md`
   - `RENDER_POSTGRES_DEPLOYMENT.md`
   - `migrate-to-postgres.sh`
   - `migrate-to-postgres.bat`

2. **Fichiers modifiés :**
   - `AudacieusesAPI/package.json` (ajout de pg et scripts)
   - `AudacieusesAPI/src/config/database.js` (changement de dialect)
   - `AudacieusesAPI/src/models/evenement.js` (conversion ENUM → STRING)
   - `AudacieusesAPI/src/models/module.js` (conversion ENUM → STRING)
   - `render.yaml` (changement de type de base de données)

## Comment utiliser les scripts de migration

1. **Depuis Windows :**
   ```
   migrate-to-postgres.bat
   ```

2. **Depuis Linux/Mac :**
   ```
   chmod +x migrate-to-postgres.sh
   ./migrate-to-postgres.sh
   ```

3. **Manuellement :**
   ```
   cd AudacieusesAPI
   npm run pg-setup
   ```

## Vérification post-migration

Après la migration, vérifiez que :
1. L'application démarre sans erreur
2. Les données ont été correctement migrées
3. Toutes les fonctionnalités marchent comme prévu
4. Il n'y a pas d'erreurs dans les logs

## Remarques importantes

- Les ENUM de MySQL sont remplacés par des chaînes avec validation dans PostgreSQL
- La structure des séquences dans PostgreSQL est différente de celle des AUTO_INCREMENT de MySQL
- Certaines requêtes SQL brutes pourraient encore nécessiter des ajustements manuels
- Le fichier .env doit être configuré correctement pour l'environnement cible
