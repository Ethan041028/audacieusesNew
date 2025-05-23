'use strict';

const fs = require('fs');
const path = require('path');
const logger = require('../src/utils/logger');

// Chemin vers le fichier app.js
const appJsPath = path.join(__dirname, '../src/app.js');

// Fonction principale pour adapter les requêtes SQL
async function adaptSqlQueriesForPostgres() {
  logger.info('Adaptation des requêtes SQL dans app.js pour PostgreSQL...');
  
  // Lire le contenu du fichier
  let fileContent = fs.readFileSync(appJsPath, 'utf8');
  const originalContent = fileContent;
  
  // Modifications à effectuer
  
  // 1. Adapter les requêtes information_schema pour PostgreSQL
  // Dans MySQL: table_schema = 'audacieuses_db'
  // Dans PostgreSQL: table_schema = 'public'
  fileContent = fileContent.replace(
    /table_schema\s*=\s*['"]audacieuses_db['"]/g, 
    "table_schema = 'public'"
  );
  
  // 2. Adapter la syntaxe ALTER TABLE pour PostgreSQL
  // Dans MySQL: ALTER TABLE users MODIFY COLUMN mail VARCHAR(50) NOT NULL
  // Dans PostgreSQL: ALTER TABLE users ALTER COLUMN mail TYPE VARCHAR(50), ALTER COLUMN mail SET NOT NULL
  const alterTableModifyRegex = /ALTER TABLE (\w+) MODIFY COLUMN (\w+) ([^,;]+)( NOT NULL)?( UNIQUE)?/g;
  fileContent = fileContent.replace(alterTableModifyRegex, (match, table, column, type, notNull, unique) => {
    let result = `ALTER TABLE ${table} ALTER COLUMN ${column} TYPE ${type}`;
    if (notNull) {
      result += `, ALTER COLUMN ${column} SET NOT NULL`;
    }
    if (unique) {
      result += `; ALTER TABLE ${table} ADD CONSTRAINT unique_${table}_${column} UNIQUE (${column})`;
    }
    return result;
  });
  
  // 3. Adapter la syntaxe pour les valeurs par défaut
  // Dans MySQL: DEFAULT 'valeur'
  // Dans PostgreSQL: c'est généralement le même format, mais vérifions
  
  // 4. Adapter l'utilisation de CONCAT pour PostgreSQL (utiliser ||)
  fileContent = fileContent.replace(
    /CONCAT\(([^,]+), ['"]_['"], ([^)]+)\)/g, 
    "$1 || '_' || $2"
  );
  
  // 5. Adapter la fonction NOW() qui est compatible avec les deux mais parfois utilisée différemment
  // Dans certains cas, on peut préférer CURRENT_TIMESTAMP pour PostgreSQL
  
  // 6. Adapter DATE_ADD pour PostgreSQL
  fileContent = fileContent.replace(
    /DATE_ADD\(([^,]+), INTERVAL (\d+) ([A-Za-z]+)\)/g, 
    "$1 + INTERVAL '$2 $3'"
  );
  
  // 7. Adapter les requêtes SELECT 1 FROM pour PostgreSQL
  // Dans PostgreSQL, on utilise souvent EXISTS à la place
  fileContent = fileContent.replace(
    /SELECT 1 FROM information_schema\.([^ ]+) WHERE/g,
    "SELECT EXISTS(SELECT 1 FROM information_schema.$1 WHERE"
  );
  fileContent = fileContent.replace(
    /\) > 0/g,
    ") = true"
  );
  
  // Enregistrer les changements si le fichier a été modifié
  if (fileContent !== originalContent) {
    fs.writeFileSync(appJsPath, fileContent, 'utf8');
    logger.info('Fichier app.js modifié et sauvegardé avec succès.');
    return true;
  } else {
    logger.info('Aucune modification nécessaire dans app.js.');
    return false;
  }
}

// Exécution du script
adaptSqlQueriesForPostgres().then(modified => {
  logger.info(`Script d'adaptation ${modified ? 'terminé avec succès' : 'terminé sans modifications'}.`);
  process.exit(0);
}).catch(err => {
  logger.error('Erreur lors de l\'adaptation des requêtes SQL:', err);
  process.exit(1);
});
