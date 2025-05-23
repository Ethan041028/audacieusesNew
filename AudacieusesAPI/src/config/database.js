const { Sequelize } = require('sequelize');
const logger = require('../utils/logger');
require('dotenv').config();

// Configuration de la base de données pour différents environnements
const config = {
  development: {
    database: process.env.DB_NAME,
    username: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    host: process.env.DB_HOST,
    dialect: 'postgres',
    logging: (msg) => logger.debug(msg),
    pool: {
      max: 5,
      min: 0,
      acquire: 30000,
      idle: 10000
    }
  },
  test: {
    database: process.env.DB_NAME_TEST || process.env.DB_NAME,
    username: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    host: process.env.DB_HOST,
    dialect: 'postgres',
    logging: false,
    pool: {
      max: 5,
      min: 0,
      acquire: 30000,
      idle: 10000
    }
  },
  production: {
    database: process.env.DB_NAME,
    username: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    host: process.env.DB_HOST,
    dialect: 'postgres',
    logging: false,
    pool: {
      max: 10,
      min: 0,
      acquire: 30000,
      idle: 10000
    },
    dialectOptions: {
      ssl: {
        require: true,
        rejectUnauthorized: false
      }
    }
  }
};

// Configuration de Sequelize
const sequelize = new Sequelize(
  config[process.env.NODE_ENV || 'development'].database,
  config[process.env.NODE_ENV || 'development'].username,
  config[process.env.NODE_ENV || 'development'].password,
  config[process.env.NODE_ENV || 'development']
);

// Tester la connexion à la base de données au démarrage
// Cette fonction est maintenant exportée mais n'est plus appelée automatiquement
// pour éviter la duplication avec app.js
const testConnection = async () => {
  try {
    await sequelize.authenticate();
    logger.info('Connexion à la base de données établie avec succès.');
    return true;
  } catch (error) {
    logger.error('Impossible de se connecter à la base de données:', error);
    return false;
  }
};

module.exports = {
  ...config,
  sequelize,
  testConnection
};