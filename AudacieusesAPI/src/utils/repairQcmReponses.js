/**
 * Script utilitaire pour réparer les réponses client QCM qui pourraient être mal formatées
 * 
 * Usage: node src/utils/repairQcmReponses.js
 */

const { Activite, TypeActivite, ReponseClient } = require('../models');
const logger = require('./logger');

async function repairQcmReponses() {
  try {
    logger.info('Début de la réparation des réponses QCM clients');
    
    // Récupérer toutes les activités de type QCM
    const qcmActivites = await Activite.findAll({
      include: [
        {
          model: TypeActivite,
          as: 'typeActivite',
          where: {
            type_activite: 'QCM'
          }
        }
      ]
    });
    
    logger.info(`${qcmActivites.length} activités QCM trouvées`);
    let totalRepaired = 0;
    
    // Pour chaque activité QCM
    for (const activite of qcmActivites) {
      logger.info(`Analyse des réponses pour l'activité QCM ${activite.id} (${activite.titre})`);
      
      // Obtenir les réponses client pour cette activité
      const reponses = await ReponseClient.findAll({
        where: {
          activite_id: activite.id
        }
      });
      
      logger.info(`${reponses.length} réponses trouvées pour cette activité`);
      
      // Pour chaque réponse
      for (const reponse of reponses) {
        try {
          // Vérifier si la réponse est un objet déjà stringifié
          try {
            const parsedReponse = JSON.parse(reponse.reponse);
            
            // Si c'est déjà un objet JSON valide, vérifier sa structure
            if (!parsedReponse.selectedOption && !parsedReponse.selectedOptionText) {
              // Si ce n'est pas bien structuré, le corriger
              const correctedResponse = {
                selectedOption: 0,
                selectedOptionText: typeof parsedReponse === 'string' ? parsedReponse : JSON.stringify(parsedReponse)
              };
              
              // Mettre à jour la réponse
              reponse.reponse = JSON.stringify(correctedResponse);
              await reponse.save();
              
              logger.info(`Réponse ${reponse.id} corrigée`);
              totalRepaired++;
            }
          } catch (e) {
            // La réponse n'est pas JSON, la convertir en format correct
            const correctedResponse = {
              selectedOption: 0,
              selectedOptionText: reponse.reponse
            };
            
            // Mettre à jour la réponse
            reponse.reponse = JSON.stringify(correctedResponse);
            await reponse.save();
            
            logger.info(`Réponse non-JSON ${reponse.id} corrigée`);
            totalRepaired++;
          }
        } catch (repairError) {
          logger.error(`Erreur lors de la réparation de la réponse ${reponse.id}: ${repairError.message}`);
        }
      }
    }
    
    logger.info(`Réparation terminée. ${totalRepaired} réponses ont été réparées.`);
  } catch (error) {
    logger.error(`Erreur lors de la réparation des réponses QCM: ${error.message}`);
    logger.error(error.stack);
  }
}

// Exécuter la fonction principale
repairQcmReponses()
  .then(() => {
    logger.info('Script terminé avec succès');
    process.exit(0);
  })
  .catch(err => {
    logger.error(`Erreur fatale: ${err.message}`);
    logger.error(err.stack);
    process.exit(1);
  });
