/**
 * Script utilitaire pour réparer les formats d'affichage des contenus QCM
 * 
 * Ce script :
 * 1. Identifie les activités de type QCM dont le contenu est mal formaté
 * 2. Corrige les formats imbriqués ou doublement échappés
 * 3. S'assure que toutes les réponses client sont dans un format cohérent
 * 
 * Usage: node src/utils/fixQcmDisplayFormat.js
 */

const { Activite, TypeActivite, ReponseClient } = require('../models');
const logger = require('./logger');

async function fixQcmDisplayFormat() {
  try {
    logger.info('Début de la réparation des formats d\'affichage QCM');
    
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
    let fixedActivites = 0;
    let fixedResponses = 0;
    
    // Pour chaque activité QCM
    for (const activite of qcmActivites) {
      logger.info(`Analyse du format de l'activité QCM ${activite.id} (${activite.titre})`);
      
      let needsFixing = false;
      let contentData = activite.contenu;
      let parsedContent = null;
      
      // Étape 1: Vérifier si le contenu est une chaîne JSON valide
      if (typeof contentData === 'string') {
        try {
          parsedContent = JSON.parse(contentData);
          
          // Étape 2: Vérifier si c'est doublement encodé
          if (parsedContent.type === 'texte' && typeof parsedContent.contenu === 'string') {
            try {
              const innerContent = JSON.parse(parsedContent.contenu);
              
              // Si l'analyse a réussi, c'est doublement encodé, il faut corriger
              logger.info(`Activité ${activite.id} a un contenu doublement encodé. Correction...`);
              
              // Normaliser le format
              const normalizedContent = {
                type: 'qcm',
                questions: []
              };
              
              if (innerContent.type === 'qcm' && Array.isArray(innerContent.questions)) {
                normalizedContent.questions = innerContent.questions;
              } else if (innerContent.question && Array.isArray(innerContent.options)) {
                // Format alternatif avec une seule question
                normalizedContent.questions = [{
                  texte: innerContent.question,
                  options: innerContent.options,
                  reponse_correcte: innerContent.correctAnswer || innerContent.reponse_correcte || 0
                }];
              }
              
              // Mettre à jour le contenu de l'activité
              activite.contenu = JSON.stringify(normalizedContent);
              await activite.save();
              fixedActivites++;
              needsFixing = true;
              logger.info(`Activité ${activite.id} corrigée avec succès`);
              
            } catch (innerError) {
              // Ce n'est pas du JSON doublement encodé, pas besoin de correction ici
              logger.info(`Activité ${activite.id} n'a pas de contenu doublement encodé`);
            }
          }
        } catch (parseError) {
          // Le contenu n'est pas un JSON valide, essayons de le corriger
          logger.warn(`Activité ${activite.id} a un contenu JSON invalide. Tentative de correction...`);
          
          try {
            // Essayer de construire un format valide
            const normalizedContent = {
              type: 'qcm',
              questions: [{
                texte: "Question sans format valide",
                options: ["Option 1", "Option 2"],
                reponse_correcte: 0
              }]
            };
            
            activite.contenu = JSON.stringify(normalizedContent);
            await activite.save();
            fixedActivites++;
            needsFixing = true;
            logger.info(`Activité ${activite.id} corrigée avec un format par défaut`);
            
          } catch (fixError) {
            logger.error(`Échec de la correction de l'activité ${activite.id}: ${fixError.message}`);
          }
        }
      }
      
      // Maintenant corriger les réponses client pour cette activité
      if (needsFixing || true) {  // Vérifier toutes les réponses même si l'activité n'a pas été modifiée
        const reponses = await ReponseClient.findAll({
          where: {
            activite_id: activite.id
          }
        });
        
        logger.info(`${reponses.length} réponses trouvées pour l'activité ${activite.id}`);
        
        for (const reponse of reponses) {
          try {
            if (!reponse.reponse) {
              logger.warn(`Réponse ${reponse.id} est vide ou null. Ignorée.`);
              continue;
            }
            
            // Vérifier si c'est une réponse JSON valide
            try {
              const parsedReponse = JSON.parse(reponse.reponse);
              
              // Vérifier si le format est correct
              if (typeof parsedReponse === 'object') {
                if (!parsedReponse.selectedOption && !parsedReponse.selectedOptionText) {
                  // Format incorrect, à corriger
                  const correctedResponse = {
                    selectedOption: 0,
                    selectedOptionText: typeof parsedReponse === 'string' 
                      ? parsedReponse 
                      : JSON.stringify(parsedReponse)
                  };
                  
                  reponse.reponse = JSON.stringify(correctedResponse);
                  await reponse.save();
                  fixedResponses++;
                  logger.info(`Réponse ${reponse.id} corrigée avec format approprié`);
                }
              }
            } catch (parseError) {
              // Ce n'est pas du JSON, convertir en format attendu
              if (typeof reponse.reponse === 'string') {
                const correctedResponse = {
                  selectedOption: 0,
                  selectedOptionText: reponse.reponse
                };
                
                reponse.reponse = JSON.stringify(correctedResponse);
                await reponse.save();
                fixedResponses++;
                logger.info(`Réponse texte ${reponse.id} convertie en format JSON`);
              }
            }
          } catch (responseError) {
            logger.error(`Échec de la correction de la réponse ${reponse.id}: ${responseError.message}`);
          }
        }
      }
    }
    
    logger.info(`Réparation terminée. ${fixedActivites} activités et ${fixedResponses} réponses corrigées.`);
    
  } catch (error) {
    logger.error(`Erreur lors de la réparation des formats QCM: ${error.message}`);
    logger.error(error.stack);
  }
}

// Exécuter la fonction principale
fixQcmDisplayFormat()
  .then(() => {
    logger.info('Script terminé avec succès');
    process.exit(0);
  })
  .catch(err => {
    logger.error(`Erreur fatale: ${err.message}`);
    logger.error(err.stack);
    process.exit(1);
  });
