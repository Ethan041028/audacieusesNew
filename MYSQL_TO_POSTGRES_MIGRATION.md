# Guide de migration MySQL vers PostgreSQL pour Les Audacieuses

Ce document vous guidera à travers le processus de migration de votre application Les Audacieuses de MySQL vers PostgreSQL pour permettre l'hébergement sur Render.

## Pourquoi migrer vers PostgreSQL ?

Render offre une base de données PostgreSQL gratuite dans son plan gratuit, mais ne prend pas en charge MySQL gratuitement. PostgreSQL est un système de gestion de base de données relationnelle puissant et fiable qui offre des fonctionnalités avancées et une excellente performance.

## Différences principales entre MySQL et PostgreSQL

Avant de commencer la migration, il est important de comprendre les différences principales entre ces deux systèmes :

1. **Syntaxe SQL légèrement différente** : Bien que les deux utilisent SQL, certaines fonctions et syntaxes sont spécifiques à chaque système.
2. **Types de données** : PostgreSQL a des types de données différents (ex: `SERIAL` au lieu de `AUTO_INCREMENT`).
3. **Contraintes et transactions** : PostgreSQL a une approche plus stricte des contraintes d'intégrité.
4. **Gestion des NULL et valeurs par défaut** : Il existe des différences subtiles dans la façon dont ces éléments sont gérés.
5. **ENUM** : PostgreSQL gère les ENUM différemment de MySQL.

## Étapes de migration

### 1. Installation des dépendances

```bash
# Installer le client PostgreSQL pour Node.js
npm install pg pg-hstore --save
# Désinstaller mysql2 si vous n'en avez plus besoin
npm uninstall mysql2
```

### 2. Modification de la configuration de la base de données

Modifiez le fichier `src/config/database.js` pour utiliser PostgreSQL :

```javascript
// Changez le dialect de 'mysql' à 'postgres'
dialect: 'postgres',

// Ajoutez des options spécifiques à PostgreSQL pour la production
dialectOptions: {
  ssl: {
    require: true,
    rejectUnauthorized: false
  }
}
```

### 3. Adaptation des modèles

Exécutez le script d'adaptation des modèles pour convertir les types de données spécifiques à MySQL :

```bash
npm run adapt-models
```

Cela va :
- Convertir les ENUM en STRING avec validation
- Adapter les types de données spécifiques
- Identifier d'autres problèmes potentiels

### 4. Adaptation des requêtes SQL

Exécutez le script d'adaptation des requêtes SQL :

```bash
npm run adapt-queries
```

Cela va modifier les requêtes SQL brutes dans votre code pour les rendre compatibles avec PostgreSQL.

### 5. Migration des données

Pour migrer vos données existantes de MySQL vers PostgreSQL :

1. Assurez-vous d'avoir les deux bases de données configurées
2. Exécutez le script de migration :

```bash
npm run migrate-to-postgres
```

### 6. Mise à jour du fichier render.yaml

Assurez-vous que votre fichier `render.yaml` est configuré pour utiliser PostgreSQL au lieu de MySQL :

```yaml
databases:
  - name: audacieuses-db
    plan: free
    type: postgres
```

### 7. Test de l'application avec PostgreSQL

Avant de déployer, testez votre application localement avec PostgreSQL :

```bash
# Démarrer PostgreSQL localement (avec Docker par exemple)
docker run --name postgres-audacieuses -e POSTGRES_PASSWORD=postgres -e POSTGRES_USER=postgres -e POSTGRES_DB=audacieuses_db -p 5432:5432 -d postgres

# Initialiser la base de données PostgreSQL
psql -h localhost -U postgres -d audacieuses_db -f src/config/init-postgres-database.sql

# Démarrer l'application avec PostgreSQL
npm run dev
```

### 8. Déploiement sur Render

Une fois que tout fonctionne localement, vous pouvez déployer votre application sur Render :

1. Connectez-vous à Render et créez un nouveau Blueprint
2. Connectez votre dépôt Git
3. Render détectera le fichier `render.yaml` et configurera les services
4. Initialisez la base de données PostgreSQL avec le script fourni

## Résolution des problèmes courants

### Erreurs de type de données

Si vous rencontrez des erreurs liées aux types de données, vérifiez que tous les ENUM ont été correctement convertis en STRING avec validation.

### Problèmes de séquences PostgreSQL

PostgreSQL utilise des séquences pour les colonnes auto-incrémentées. Si vous avez des problèmes avec les ID, vous devrez peut-être réinitialiser les séquences.

### Problèmes SSL avec PostgreSQL

Pour les connexions à PostgreSQL sur Render, assurez-vous d'avoir les options SSL correctes :

```javascript
dialectOptions: {
  ssl: {
    require: true,
    rejectUnauthorized: false
  }
}
```

### Requêtes SQL encore incompatibles

Si certaines requêtes SQL brutes ne fonctionnent pas, vous devrez les adapter manuellement. Consultez la documentation PostgreSQL pour les équivalents des fonctions MySQL que vous utilisez.

## Ressources utiles

- [Documentation PostgreSQL](https://www.postgresql.org/docs/)
- [Documentation Sequelize pour PostgreSQL](https://sequelize.org/master/manual/dialect-specific-things.html#postgresql)
- [Guide de migration MySQL vers PostgreSQL](https://wiki.postgresql.org/wiki/Converting_from_other_Databases_to_PostgreSQL#MySQL)
- [Documentation de Render pour PostgreSQL](https://render.com/docs/databases)
