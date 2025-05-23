'use strict';

const { DataTypes } = require('sequelize');

// Mappage des types MySQL vers PostgreSQL pour Sequelize
const pgDataTypeMapping = {
  // Types numériques
  TINYINT: DataTypes.SMALLINT,
  SMALLINT: DataTypes.SMALLINT,
  MEDIUMINT: DataTypes.INTEGER,
  INT: DataTypes.INTEGER,
  BIGINT: DataTypes.BIGINT,
  
  // Types décimaux
  FLOAT: DataTypes.FLOAT,
  DOUBLE: DataTypes.DOUBLE,
  DECIMAL: DataTypes.DECIMAL,
  
  // Types de chaînes
  CHAR: DataTypes.CHAR,
  VARCHAR: DataTypes.STRING,
  TINYTEXT: DataTypes.TEXT,
  TEXT: DataTypes.TEXT,
  MEDIUMTEXT: DataTypes.TEXT,
  LONGTEXT: DataTypes.TEXT,
  
  // Types binaires
  TINYBLOB: DataTypes.BLOB,
  BLOB: DataTypes.BLOB,
  MEDIUMBLOB: DataTypes.BLOB,
  LONGBLOB: DataTypes.BLOB,
  
  // Types de date/heure
  DATE: DataTypes.DATEONLY,
  TIME: DataTypes.TIME,
  DATETIME: DataTypes.DATE,
  TIMESTAMP: DataTypes.DATE,
  YEAR: DataTypes.INTEGER,
  
  // Autres types
  BOOLEAN: DataTypes.BOOLEAN,
  ENUM: DataTypes.STRING, // Remplacer par STRING avec validation
  JSON: DataTypes.JSONB,  // PostgreSQL préfère JSONB pour de meilleures performances
  
  // Types non supportés directement
  SET: DataTypes.ARRAY(DataTypes.STRING), // Alternative approximative
  BIT: DataTypes.STRING                  // Alternative approximative
};

/**
 * Convertit un type de données MySQL en type PostgreSQL équivalent
 * @param {string} mysqlType - Le type MySQL à convertir
 * @returns {Object} Le type Sequelize approprié pour PostgreSQL
 */
function convertDataType(mysqlType) {
  // Vérifier si le type est un ENUM
  if (mysqlType.startsWith('ENUM(')) {
    // Extraire les valeurs de l'ENUM
    const enumValues = mysqlType
      .replace('ENUM(', '')
      .replace(')', '')
      .split(',')
      .map(val => val.trim().replace(/'/g, ''));
    
    // Retourner un STRING avec validation
    return {
      type: DataTypes.STRING,
      validate: {
        isIn: {
          args: [enumValues],
          msg: `La valeur doit être l'une des suivantes: ${enumValues.join(', ')}`
        }
      }
    };
  }
  
  // Trouver la correspondance directe
  for (const [mysqlPattern, pgType] of Object.entries(pgDataTypeMapping)) {
    if (mysqlType.toUpperCase().startsWith(mysqlPattern)) {
      return pgType;
    }
  }
  
  // Si aucune correspondance trouvée, retourner le type original
  // Sequelize essaiera de le gérer
  return mysqlType;
}

module.exports = {
  pgDataTypeMapping,
  convertDataType
};
