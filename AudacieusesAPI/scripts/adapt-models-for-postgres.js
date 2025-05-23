'use strict';

const fs = require('fs');
const path = require('path');
const logger = require('../src/utils/logger');

// Chemin vers le dossier des modèles
const modelsPath = path.join(__dirname, '../src/models');

// Liste des modèles à vérifier
const modelFiles = fs.readdirSync(modelsPath)
  .filter(file => file.endsWith('.js') && file !== 'index.js');

// Fonction principale pour adapter les modèles
async function adaptModelsForPostgres() {
  logger.info('Adaptation des modèles pour PostgreSQL...');
  
  let modifiedCount = 0;
  const issues = [];

  for (const modelFile of modelFiles) {
    const filePath = path.join(modelsPath, modelFile);
    let fileContent = fs.readFileSync(filePath, 'utf8');
    let originalContent = fileContent;
    let modified = false;

    // 1. Remplacer les ENUM par des CHECK constraints pour PostgreSQL
    if (fileContent.includes('DataTypes.ENUM(')) {
      logger.info(`Modèle ${modelFile} contient des ENUM qui doivent être adaptés`);
      
      // Recherche de tous les ENUM dans le fichier
      const enumRegex = /DataTypes\.ENUM\([^)]+\)/g;
      const enumMatches = fileContent.match(enumRegex);
      
      if (enumMatches) {
        for (const enumMatch of enumMatches) {
          // Extraire les valeurs de l'ENUM
          const valuesMatch = enumMatch.match(/DataTypes\.ENUM\(([^)]+)\)/);
          if (valuesMatch && valuesMatch[1]) {
            const enumValues = valuesMatch[1].split(',').map(v => v.trim());
            const fieldNameMatch = fileContent.match(new RegExp(`([a-zA-Z_][a-zA-Z0-9_]*):\\s*{[^}]*${enumMatch}`));
            
            if (fieldNameMatch && fieldNameMatch[1]) {
              const fieldName = fieldNameMatch[1];
              logger.info(`  - Champ ${fieldName} avec ENUM: ${enumValues.join(', ')}`);
              
              // Construire la validation Sequelize pour PostgreSQL
              const checkValues = enumValues.join(', ');
              const postgresValidation = `
      type: DataTypes.STRING,
      allowNull: ${fileContent.includes(`allowNull: false`) ? 'false' : 'true'},
      validate: {
        isIn: {
          args: [[${checkValues}]],
          msg: 'La valeur doit être l\'une des suivantes: ${enumValues.join(', ').replace(/'/g, '')}'
        }
      }`;
              
              // Remplacer l'ENUM par la validation
              const enumDeclarationRegex = new RegExp(`type:\\s*${enumMatch.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[^,}]*`, 'g');
              fileContent = fileContent.replace(enumDeclarationRegex, postgresValidation);
              
              modified = true;
              issues.push(`Modèle ${modelFile}: ENUM remplacé par validation pour le champ ${fieldName}`);
            }
          }
        }
      }
    }

    // 2. Vérifier et adapter les recherches dans information_schema spécifiques à MySQL
    if (fileContent.includes('information_schema.tables WHERE table_schema')) {
      logger.info(`Modèle ${modelFile} contient des références à information_schema.tables avec table_schema`);
      // Ce type de recherche est généralement dans app.js, pas dans les modèles
      issues.push(`Modèle ${modelFile}: Contient des requêtes information_schema à adapter manuellement`);
    }

    // 3. Adapter les contraintes ON UPDATE/ON DELETE qui pourraient avoir une syntaxe différente
    if (fileContent.includes('onUpdate') || fileContent.includes('onDelete')) {
      // Sequelize gère cela correctement, mais c'est bon de le vérifier
      logger.info(`Modèle ${modelFile} contient des contraintes onUpdate/onDelete`);
    }

    // 4. Vérifier les types de données spécifiques à MySQL comme UNSIGNED
    if (fileContent.includes('UNSIGNED')) {
      logger.info(`Modèle ${modelFile} contient des types UNSIGNED incompatibles avec PostgreSQL`);
      fileContent = fileContent.replace(/UNSIGNED/g, '');
      modified = true;
      issues.push(`Modèle ${modelFile}: Type UNSIGNED supprimé (non compatible avec PostgreSQL)`);
    }

    // 5. Adapter les auto-incrémentations
    if (fileContent.includes('autoIncrement')) {
      // Sequelize gère cela différemment entre MySQL et PostgreSQL
      // Dans PostgreSQL, cela correspond à SERIAL ou BIGSERIAL
      logger.info(`Modèle ${modelFile} contient des champs auto-incrémentés`);
    }

    // 6. Recherche des fonctions/opérateurs spécifiques à MySQL
    const mysqlSpecificFunctions = [
      'NOW()', 'CURRENT_TIMESTAMP()', 'CONCAT(', 'IFNULL(', 'ISNULL(', 
      'DATE_FORMAT(', 'STR_TO_DATE(', 'GROUP_CONCAT('
    ];
    
    for (const func of mysqlSpecificFunctions) {
      if (fileContent.includes(func)) {
        logger.info(`Modèle ${modelFile} utilise la fonction MySQL ${func}`);
        issues.push(`Modèle ${modelFile}: Utilise la fonction MySQL ${func} qui peut nécessiter une adaptation pour PostgreSQL`);
      }
    }

    // Enregistrer les changements si le fichier a été modifié
    if (modified && fileContent !== originalContent) {
      fs.writeFileSync(filePath, fileContent, 'utf8');
      modifiedCount++;
      logger.info(`Fichier ${modelFile} modifié et sauvegardé.`);
    }
  }

  logger.info(`Adaptation terminée. ${modifiedCount} fichiers modifiés.`);
  
  if (issues.length > 0) {
    logger.info('\nProblèmes identifiés qui peuvent nécessiter une attention particulière:');
    issues.forEach((issue, index) => {
      logger.info(`${index + 1}. ${issue}`);
    });
  }

  return {
    modifiedCount,
    issues
  };
}

// Exécution du script
adaptModelsForPostgres().then(result => {
  logger.info(`Script d'adaptation terminé. ${result.modifiedCount} fichiers modifiés.`);
  process.exit(0);
}).catch(err => {
  logger.error('Erreur lors de l\'adaptation des modèles:', err);
  process.exit(1);
});
