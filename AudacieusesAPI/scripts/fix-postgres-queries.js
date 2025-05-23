'use strict';

const fs = require('fs');
const path = require('path');
const logger = require('../src/utils/logger');

// Chemin vers le fichier app.js
const appJsPath = path.join(__dirname, '../src/app.js');

// Fonction principale pour corriger les requêtes SQL PostgreSQL
async function fixPostgresQueries() {
  logger.info('Correction des requêtes SQL dans app.js pour PostgreSQL...');
  
  // Lire le contenu du fichier
  let fileContent = fs.readFileSync(appJsPath, 'utf8');
  const originalContent = fileContent;
  
  // 1. Corriger les problèmes de requêtes utilisant REFERENCED_TABLE_NAME
  // Le modèle général pour ces requêtes dans MySQL:
  // SELECT CONSTRAINT_NAME FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE 
  // WHERE TABLE_SCHEMA = 'audacieuses_db' AND TABLE_NAME = 'users' 
  // AND COLUMN_NAME = 'role_id' AND REFERENCED_TABLE_NAME IS NOT NULL
  
  // Requête équivalente pour PostgreSQL:
  // SELECT con.conname as CONSTRAINT_NAME 
  // FROM pg_constraint con 
  // JOIN pg_class rel ON rel.oid = con.conrelid 
  // JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace 
  // WHERE nsp.nspname = 'public' 
  // AND rel.relname = 'users' 
  // AND con.contype = 'f'
  // AND EXISTS (
  //   SELECT 1 FROM pg_attribute att 
  //   WHERE att.attrelid = rel.oid 
  //   AND att.attnum = ANY(con.conkey) 
  //   AND att.attname = 'role_id'
  // )
  
  // Correction pour les cas avec COLUMN_NAME spécifié
  fileContent = fileContent.replace(
    /SELECT CONSTRAINT_NAME FROM INFORMATION_SCHEMA\.KEY_COLUMN_USAGE WHERE TABLE_SCHEMA = ['"]audacieuses_db['"] AND TABLE_NAME = ['"]([^'"]+)['"] AND COLUMN_NAME = ['"]([^'"]+)['"] AND REFERENCED_TABLE_NAME IS NOT NULL/g,
    "SELECT con.conname as CONSTRAINT_NAME FROM pg_constraint con JOIN pg_class rel ON rel.oid = con.conrelid JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace JOIN pg_attribute att ON att.attrelid = rel.oid AND att.attnum = ANY(con.conkey) WHERE nsp.nspname = 'public' AND rel.relname = '$1' AND att.attname = '$2' AND con.contype = 'f'"
  );
  
  // Correction pour les cas sans COLUMN_NAME spécifié
  fileContent = fileContent.replace(
    /SELECT CONSTRAINT_NAME FROM INFORMATION_SCHEMA\.KEY_COLUMN_USAGE WHERE TABLE_SCHEMA = ['"]audacieuses_db['"] AND TABLE_NAME = ['"]([^'"]+)['"] AND REFERENCED_TABLE_NAME IS NOT NULL/g,
    "SELECT con.conname as CONSTRAINT_NAME FROM pg_constraint con JOIN pg_class rel ON rel.oid = con.conrelid JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace WHERE nsp.nspname = 'public' AND rel.relname = '$1' AND con.contype = 'f'"
  );
  
  // 2. Corriger la syntaxe DROP FOREIGN KEY pour PostgreSQL
  // MySQL: ALTER TABLE evenements DROP FOREIGN KEY constraint_name
  // PostgreSQL: ALTER TABLE evenements DROP CONSTRAINT constraint_name
  fileContent = fileContent.replace(
    /ALTER TABLE (\w+) DROP FOREIGN KEY ([\w_]+)/g,
    "ALTER TABLE $1 DROP CONSTRAINT $2"
  );
  
  // 3. Corriger la syntaxe des requêtes EXISTS pour PostgreSQL
  // S'assurer que les requêtes SELECT EXISTS() se terminent correctement
  fileContent = fileContent.replace(
    /SELECT EXISTS\((.*?)\)(?![\s]*[,\)])/g,
    "SELECT EXISTS($1) as exists"
  );
  
  // 4. Ajuster les comparaisons de résultats pour EXISTS
  // Dans PostgreSQL, EXISTS retourne une valeur booléenne
  fileContent = fileContent.replace(
    /(\w+)\.length > 0/g,
    "$1[0].exists === true"
  );
  
  // 5. Corriger les clauses IF EXISTS
  // MySQL et PostgreSQL ont des syntaxes légèrement différentes
  fileContent = fileContent.replace(
    /DROP TABLE IF EXISTS (\w+)(?!;)/g,
    "DROP TABLE IF EXISTS $1;"
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
fixPostgresQueries().then(modified => {
  logger.info(`Script de correction ${modified ? 'terminé avec succès' : 'terminé sans modifications'}.`);
  process.exit(0);
}).catch(err => {
  logger.error('Erreur lors de la correction des requêtes SQL:', err);
  process.exit(1);
});
