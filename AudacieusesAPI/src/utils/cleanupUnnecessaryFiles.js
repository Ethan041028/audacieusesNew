/**
 * Script utilitaire pour nettoyer les fichiers et logs inutiles
 * Usage: node src/utils/cleanupUnnecessaryFiles.js
 */

const fs = require('fs');
const path = require('path');
const logger = require('./logger');

// Fichiers et dossiers à nettoyer
const filesToClean = [
  // Fichiers de logs anciens
  {
    path: path.join(__dirname, '../../logs'),
    pattern: /combined\d+\.log|debug\.log|error\.log/,
    keepLatest: true, // Garder les fichiers les plus récents
    numToKeep: 1      // Nombre de fichiers à conserver
  },
  // Scripts temporaires ou de test
  {
    path: path.join(__dirname, '../..'),
    pattern: /test-.*\.js$/,
    exclude: /\.test\.js$/ // Ne pas supprimer les fichiers de test unitaires
  },
  // Dossiers temporaires
  {
    path: path.join(__dirname, '../routes/temp'),
    recursive: true    // Supprimer tout le contenu
  }
];

async function cleanupFiles() {
  try {
    logger.info('Début du nettoyage des fichiers inutiles');
    let totalRemoved = 0;
    
    for (const item of filesToClean) {
      try {
        if (!fs.existsSync(item.path)) {
          logger.warn(`Le chemin ${item.path} n'existe pas`);
          continue;
        }
        
        const stats = fs.statSync(item.path);
        
        if (stats.isDirectory()) {
          // Cas d'un dossier à vider ou à filtrer
          if (item.recursive) {
            // Supprimer tout le contenu du dossier
            const files = fs.readdirSync(item.path);
            for (const file of files) {
              const filePath = path.join(item.path, file);
              fs.unlinkSync(filePath);
              logger.info(`Fichier supprimé: ${filePath}`);
              totalRemoved++;
            }
          } else if (item.pattern) {
            // Filtrer et supprimer certains fichiers du dossier
            const files = fs.readdirSync(item.path);
            let filesToDelete = files.filter(file => 
              item.pattern.test(file) && 
              (!item.exclude || !item.exclude.test(file))
            );
            
            // Si on doit garder les plus récents
            if (item.keepLatest && filesToDelete.length > item.numToKeep) {
              const filesWithStats = filesToDelete.map(file => {
                const filePath = path.join(item.path, file);
                return {
                  name: file,
                  path: filePath,
                  mtime: fs.statSync(filePath).mtime.getTime()
                };
              });
              
              // Trier par date de modification (plus récent en premier)
              filesWithStats.sort((a, b) => b.mtime - a.mtime);
              
              // Garder seulement ceux à supprimer
              filesToDelete = filesWithStats
                .slice(item.numToKeep)
                .map(f => f.path);
            } else {
              filesToDelete = filesToDelete.map(file => path.join(item.path, file));
            }
            
            // Supprimer les fichiers
            for (const filePath of filesToDelete) {
              fs.unlinkSync(filePath);
              logger.info(`Fichier supprimé: ${filePath}`);
              totalRemoved++;
            }
          }
        } else if (stats.isFile() && item.pattern && item.pattern.test(item.path)) {
          // Cas d'un fichier spécifique à supprimer
          if (!item.exclude || !item.exclude.test(item.path)) {
            fs.unlinkSync(item.path);
            logger.info(`Fichier supprimé: ${item.path}`);
            totalRemoved++;
          }
        }
      } catch (err) {
        logger.error(`Erreur lors du nettoyage de ${item.path}: ${err.message}`);
      }
    }
    
    logger.info(`Nettoyage terminé. ${totalRemoved} fichiers ont été supprimés.`);
  } catch (error) {
    logger.error(`Erreur lors du nettoyage des fichiers: ${error.message}`);
    logger.error(error.stack);
  }
}

// Exécuter la fonction principale
cleanupFiles()
  .then(() => {
    logger.info('Script de nettoyage terminé avec succès');
    process.exit(0);
  })
  .catch(err => {
    logger.error(`Erreur fatale: ${err.message}`);
    logger.error(err.stack);
    process.exit(1);
  });
