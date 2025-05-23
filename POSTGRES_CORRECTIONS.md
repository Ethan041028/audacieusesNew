# Corrections PostgreSQL

Ce document résume les corrections apportées pour résoudre les problèmes de migration de MySQL vers PostgreSQL.

## Problèmes résolus

### 1. Erreurs liées à REFERENCED_TABLE_NAME

Dans PostgreSQL, la colonne `REFERENCED_TABLE_NAME` n'existe pas dans `information_schema.key_column_usage`. Nous avons dû adapter ces requêtes pour utiliser les tables système de PostgreSQL.

**Problème:**
```sql
SELECT CONSTRAINT_NAME FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE 
WHERE TABLE_SCHEMA = 'audacieuses_db' AND TABLE_NAME = 'users' 
AND COLUMN_NAME = 'role_id' AND REFERENCED_TABLE_NAME IS NOT NULL
```

**Solution:**
```sql
SELECT con.conname as CONSTRAINT_NAME 
FROM pg_constraint con 
JOIN pg_class rel ON rel.oid = con.conrelid 
JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace 
JOIN pg_attribute att ON att.attrelid = rel.oid AND att.attnum = ANY(con.conkey) 
WHERE nsp.nspname = 'public' 
AND rel.relname = 'users' 
AND att.attname = 'role_id' 
AND con.contype = 'f'
```

### 2. Correction de la syntaxe DROP FOREIGN KEY

PostgreSQL utilise `DROP CONSTRAINT` au lieu de `DROP FOREIGN KEY`.

**Problème:**
```sql
ALTER TABLE evenements DROP FOREIGN KEY constraint_name
```

**Solution:**
```sql
ALTER TABLE evenements DROP CONSTRAINT constraint_name
```

### 3. Correction des requêtes EXISTS

PostgreSQL gère différemment les résultats des requêtes avec `EXISTS`.

**Problème:**
```sql
SELECT EXISTS(SELECT 1 FROM information_schema.tables WHERE...)
```

**Solution:**
```sql
SELECT EXISTS(SELECT 1 FROM information_schema.tables WHERE...) as exists
```

### 4. Gestion des types ENUM

PostgreSQL ne gère pas les ENUM de la même manière que MySQL. Nous avons converti les ENUM en STRING avec validation.

**Problème:**
```javascript
type: DataTypes.ENUM('evenement', 'rendez-vous', 'rappel', 'seance')
```

**Solution:**
```javascript
type: DataTypes.STRING,
validate: {
  isIn: {
    args: [['evenement', 'rendez-vous', 'rappel', 'seance']],
    msg: 'La valeur doit être l\'une des suivantes: evenement, rendez-vous, rappel, seance'
  }
}
```

## Scripts de correction

Pour faciliter la correction de ces problèmes, nous avons créé les scripts suivants:

1. **adapt-models-for-postgres.js** - Adapte les modèles Sequelize pour PostgreSQL
2. **adapt-sql-queries-for-postgres.js** - Adapte les requêtes SQL dans app.js
3. **fix-postgres-queries.js** - Corrige les problèmes spécifiques liés aux requêtes PostgreSQL

## Test local

Pour tester l'application avec PostgreSQL localement:

1. Exécutez `test-postgres-local.sh` (Linux/Mac) ou `test-postgres-local.bat` (Windows)
2. Le script va:
   - Démarrer un conteneur Docker avec PostgreSQL
   - Initialiser la base de données
   - Exécuter les scripts de correction
   - Démarrer l'application sur le port 3500

## Prochaines étapes pour le déploiement sur Render

1. Valider que toutes les fonctionnalités fonctionnent correctement en local
2. Suivre le guide de déploiement dans RENDER_POSTGRES_DEPLOYMENT.md
3. Configurer la base de données PostgreSQL sur Render
4. Déployer l'application

## Problèmes connus

- Certaines requêtes d'information_schema peuvent encore poser des problèmes si elles n'ont pas été correctement adaptées
- Les séquences d'autoincrement peuvent nécessiter une réinitialisation manuelle
