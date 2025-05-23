// Script pour migrer les données de MySQL vers PostgreSQL
// À exécuter une fois MySQL et PostgreSQL configurés
const { Client } = require('pg');
const mysql = require('mysql2/promise');
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const logger = require('../src/utils/logger');

// Configuration de la connexion MySQL source
const mysqlConfig = {
  host: process.env.MYSQL_HOST || process.env.DB_HOST,
  user: process.env.MYSQL_USER || process.env.DB_USER,
  password: process.env.MYSQL_PASSWORD || process.env.DB_PASSWORD,
  database: process.env.MYSQL_DATABASE || process.env.DB_NAME,
};

// Configuration de la connexion PostgreSQL cible
const pgConfig = {
  host: process.env.PG_HOST || process.env.DB_HOST,
  user: process.env.PG_USER || process.env.DB_USER,
  password: process.env.PG_PASSWORD || process.env.DB_PASSWORD,
  database: process.env.PG_DATABASE || process.env.DB_NAME,
  port: process.env.PG_PORT || 5432,
  ssl: process.env.NODE_ENV === 'production' ? {
    rejectUnauthorized: false
  } : false
};

// Utilisez ceci si vous avez une URL de connexion PostgreSQL complète
const pgConnectionString = process.env.DATABASE_URL;

// Tableau des tables dans l'ordre de dépendance pour éviter les violations de clé étrangère
const tables = [
  'roles',
  'users',
  'type_activites',
  'status_suivi',
  'modules',
  'seances',
  'module_seance',
  'activites',
  'suivi',
  'reponse_client',
  'modules_users',
  'evenements',
  'evenements_users',
  'messages'
];

// Fonction principale de migration
async function migrateData() {
  let mysqlConnection;
  let pgClient;

  try {
    logger.info('Démarrage de la migration MySQL -> PostgreSQL');

    // Connexion à MySQL
    logger.info('Connexion à la base de données MySQL...');
    mysqlConnection = await mysql.createConnection(mysqlConfig);
    logger.info('Connexion à MySQL établie avec succès');

    // Connexion à PostgreSQL
    logger.info('Connexion à la base de données PostgreSQL...');
    if (pgConnectionString) {
      pgClient = new Client({
        connectionString: pgConnectionString,
        ssl: process.env.NODE_ENV === 'production' ? {
          rejectUnauthorized: false
        } : false
      });
    } else {
      pgClient = new Client(pgConfig);
    }
    
    await pgClient.connect();
    logger.info('Connexion à PostgreSQL établie avec succès');

    // Migration table par table
    for (const table of tables) {
      await migrateTable(mysqlConnection, pgClient, table);
    }

    logger.info('Migration terminée avec succès!');
  } catch (error) {
    logger.error('Erreur lors de la migration:', error);
  } finally {
    // Fermeture des connexions
    if (mysqlConnection) await mysqlConnection.end();
    if (pgClient) await pgClient.end();
  }
}

// Fonction pour migrer une table spécifique
async function migrateTable(mysqlConnection, pgClient, tableName) {
  try {
    logger.info(`Migration de la table ${tableName}...`);

    // Récupérer toutes les données de la table MySQL
    const [rows] = await mysqlConnection.execute(`SELECT * FROM ${tableName}`);
    
    if (rows.length === 0) {
      logger.info(`Table ${tableName} vide, rien à migrer.`);
      return;
    }

    logger.info(`${rows.length} enregistrements trouvés dans ${tableName}`);

    // Récupérer les colonnes de la table PostgreSQL pour la conversion correcte
    const columnsResult = await pgClient.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = $1 
      ORDER BY ordinal_position
    `, [tableName]);
    
    const columns = columnsResult.rows;
    
    // Traiter chaque enregistrement
    for (const row of rows) {
      // Construire la requête d'insertion PostgreSQL
      const columnNames = Object.keys(row).filter(col => row[col] !== undefined && row[col] !== null);
      const values = columnNames.map(col => {
        const value = row[col];
        const column = columns.find(c => c.column_name === col.toLowerCase());
        
        // Conversion des types de données selon besoin
        if (!column) return null;
        
        // Conversion des dates
        if (column.data_type.includes('timestamp') && value instanceof Date) {
          return value.toISOString();
        }
        
        return value;
      });
      
      // Créer les placeholders pour la requête préparée
      const placeholders = values.map((_, i) => `$${i + 1}`).join(', ');
      
      // Requête d'insertion
      const insertQuery = `
        INSERT INTO ${tableName} (${columnNames.join(', ')})
        VALUES (${placeholders})
        ON CONFLICT DO NOTHING
      `;
      
      // Exécution de la requête d'insertion
      await pgClient.query(insertQuery, values);
    }

    // Mettre à jour les séquences pour les colonnes SERIAL
    if (rows.length > 0) {
      await resetSequence(pgClient, tableName);
    }

    logger.info(`Migration de la table ${tableName} terminée avec succès.`);
  } catch (error) {
    logger.error(`Erreur lors de la migration de la table ${tableName}:`, error);
    throw error;
  }
}

// Fonction pour réinitialiser les séquences d'auto-incrémentation
async function resetSequence(pgClient, tableName) {
  try {
    // Recherche la colonne d'auto-incrémentation
    const result = await pgClient.query(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = $1
      AND column_default LIKE 'nextval%'
    `, [tableName]);

    if (result.rows.length > 0) {
      const idColumn = result.rows[0].column_name;
      const sequenceName = `${tableName}_${idColumn}_seq`;
      
      // Réinitialisation de la séquence
      await pgClient.query(`
        SELECT setval(pg_get_serial_sequence('${tableName}', '${idColumn}'), 
        (SELECT MAX(${idColumn}) FROM ${tableName}));
      `);
      
      logger.info(`Séquence ${sequenceName} réinitialisée avec succès.`);
    }
  } catch (error) {
    logger.error(`Erreur lors de la réinitialisation de la séquence pour ${tableName}:`, error);
  }
}

// Exécution du script
migrateData().catch(err => {
  logger.error('Erreur fatale lors de la migration:', err);
  process.exit(1);
});
