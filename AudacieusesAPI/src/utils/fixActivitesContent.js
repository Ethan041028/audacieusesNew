/**
 * Script utilitaire pour corriger les contenus d'activités qui pourraient être doublement échappés
 * Usage: node src/utils/fixActivitesContent.js
 */

const { Activite } = require('../models');
const logger = require('./logger');

async function fixActivitesContent() {
  try {
    logger.info('Début de la correction des contenus d\'activités');
    
    // Récupérer toutes les activités
    const activites = await Activite.findAll();
    logger.info(`${activites.length} activités trouvées au total`);
    
    let correctedCount = 0;
    
    for (const activite of activites) {
      try {
        // Récupérer le contenu brut (sans passer par le getter)
        const rawContent = activite.getDataValue('contenu');
        if (!rawContent) continue;
        
        try {
          // Vérifier si c'est du JSON valide
          const parsedContent = JSON.parse(rawContent);
          
          // Si le contenu est de type texte et contient un JSON échappé
          if (parsedContent.type === 'texte' && typeof parsedContent.contenu === 'string') {
            try {
              // Essayer de parser le contenu comme JSON
              const nestedContent = JSON.parse(parsedContent.contenu);
              
              // Si le contenu imbriqué a un champ 'type', c'est probablement un contenu structuré
              if (nestedContent.type) {
                logger.info(`Correction de l'activité ${activite.id} - ${activite.titre}: Contenu doublement échappé détecté`);
                
                // Mettre à jour le contenu avec la structure correcte
                activite.setDataValue('contenu', JSON.stringify(nestedContent));
                await activite.save({ silent: true }); // Sauvegarder sans déclencher les hooks
                correctedCount++;
                
                logger.info(`Activité ${activite.id} corrigée avec succès`);
              }
            } catch (e) {
              // Le contenu imbriqué n'est pas du JSON valide, ne rien faire
            }
          }
        } catch (e) {
          // Le contenu n'est pas du JSON valide, ne rien faire
        }
      } catch (e) {
        logger.error(`Erreur lors du traitement de l'activité ${activite.id}: ${e.message}`);
      }
    }
    
    logger.info(`Correction terminée. ${correctedCount} activités ont été corrigées.`);
  } catch (error) {
    logger.error(`Erreur lors de la correction des activités: ${error.message}`);
    logger.error(error.stack);
  }
}

// Exécuter la fonction principale
fixActivitesContent()
  .then(() => {
    logger.info('Script terminé avec succès');
    process.exit(0);
  })
  .catch(err => {
    logger.error(`Erreur fatale: ${err.message}`);
    logger.error(err.stack);
    process.exit(1);
  });
