'use strict';

const fs = require('fs');
const path = require('path');
const { Client } = require('pg');
const logger = require('../utils/logger');

// Récupérer les variables d'environnement ou utiliser des valeurs par défaut
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  user: process.env.DB_USERNAME || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_DATABASE || 'audacieuses_db'
};

// Fonction pour initialiser la base de données PostgreSQL
async function initPostgresDatabase() {
  logger.info('Initialisation de la base de données PostgreSQL...');
  
  // Chemins des fichiers SQL
  const sqlFilePath = path.join(__dirname, 'init-postgres-database.sql');

  if (!fs.existsSync(sqlFilePath)) {
    logger.error(`Le fichier SQL ${sqlFilePath} n'existe pas.`);
    return false;
  }

  const sqlScript = fs.readFileSync(sqlFilePath, 'utf8');
  
  // Créer une connexion à PostgreSQL
  const client = new Client(dbConfig);
    try {
    await client.connect();
    logger.info('Connexion à PostgreSQL établie avec succès.');
    
    // Exécuter le script SQL
    try {
      await client.query(sqlScript);
      logger.info('Script SQL exécuté avec succès.');
      return true;
    } catch (sqlError) {
      logger.error('Erreur lors de l\'exécution du script SQL:', sqlError.message);
      
      // Essayer d'exécuter le script ligne par ligne pour identifier les erreurs
      const statements = sqlScript.split(';')
        .map(stmt => stmt.trim())
        .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));
      
      logger.info(`Tentative d'exécution du script SQL ligne par ligne (${statements.length} instructions)...`);
      
      for (let i = 0; i < statements.length; i++) {
        try {
          await client.query(statements[i]);
        } catch (stmtError) {
          logger.error(`Erreur à l'instruction ${i+1}: ${stmtError.message}`);
          logger.error(`Instruction problématique: ${statements[i].substring(0, 150)}...`);
        }
      }
      
      return false;
    }
  } catch (error) {
    logger.error('Erreur lors de l\'initialisation de la base de données PostgreSQL:', error.message);
    return false;
  } finally {
    await client.end();
  }
}

// Exécuter la fonction principale
initPostgresDatabase().then(success => {
  if (success) {
    logger.info('Initialisation de la base de données PostgreSQL terminée avec succès.');
  } else {
    logger.error('Échec de l\'initialisation de la base de données PostgreSQL.');
  }
}).catch(err => {
  logger.error('Erreur inattendue:', err);
});
