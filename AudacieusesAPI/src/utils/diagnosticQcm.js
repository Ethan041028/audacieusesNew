/**
 * Script de diagnostic pour analyser et réparer les activités QCM
 * 
 * Ce script permet de:
 * 1. Analyser toutes les activités QCM pour détecter les problèmes
 * 2. Générer un rapport sur l'état des activités QCM
 * 3. Réparer automatiquement les problèmes détectés
 * 
 * Usage: node src/utils/diagnosticQcm.js
 */

const { Activite, TypeActivite, ReponseClient } = require('../models');
const { validateQcmContent } = require('./qcmValidator');
const logger = require('./logger');
const fs = require('fs');
const path = require('path');

// Configuration
const GENERATE_REPORT = true;
const REPAIR_ISSUES = true;
const REPORT_PATH = path.join(__dirname, '../../logs/qcm_diagnostic_report.json');

async function diagnosticQcm() {
  try {
    logger.info('=== Début du diagnostic des activités QCM ===');
    
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
    
    logger.info(`${qcmActivites.length} activités QCM trouvées au total`);
    
    // Statistiques
    const stats = {
      total: qcmActivites.length,
      valid: 0,
      repaired: 0,
      issues: {
        invalidJson: 0,
        missingType: 0,
        incorrectStructure: 0,
        missingTexte: 0,
        insufficientOptions: 0,
        invalidCorrectAnswer: 0,
        doubleEncapsulation: 0,
        other: 0
      },
      details: []
    };
    
    // Analyser chaque activité
    for (const activite of qcmActivites) {
      const activityReport = {
        id: activite.id,
        titre: activite.titre,
        issues: [],
        wasRepaired: false
      };
      
      try {
        // Récupérer le contenu brut
        const rawContent = activite.getDataValue('contenu');
        if (!rawContent) {
          activityReport.issues.push('contenu_manquant');
          stats.issues.other++;
          continue;
        }
        
        let contentObj;
        let needsRepair = false;
        
        // Essayer de parser le contenu
        try {
          contentObj = typeof rawContent === 'string' ? JSON.parse(rawContent) : rawContent;
        } catch (e) {
          activityReport.issues.push('json_invalide');
          stats.issues.invalidJson++;
          needsRepair = true;
          
          // Tentative de réparation basique pour le JSON invalide
          if (REPAIR_ISSUES) {
            try {
              const defaultQcm = {
                type: 'qcm',
                questions: [{
                  texte: 'Question par défaut (réparée)',
                  options: ['Option 1', 'Option 2'],
                  reponse_correcte: 0
                }]
              };
              
              activite.setDataValue('contenu', JSON.stringify(defaultQcm));
              await activite.save({ silent: true });
              activityReport.wasRepaired = true;
              stats.repaired++;
              logger.info(`Activité ${activite.id} réparée: JSON invalide`);
            } catch (repairError) {
              logger.error(`Impossible de réparer l'activité ${activite.id}: ${repairError.message}`);
            }
          }
          
          stats.details.push(activityReport);
          continue;
        }
        
        // Vérifier la structure
        if (!contentObj.type) {
          activityReport.issues.push('type_manquant');
          stats.issues.missingType++;
          needsRepair = true;
        }
        
        // Vérifier l'encapsulation double
        if (contentObj.type === 'texte' && contentObj.contenu) {
          let nestedContent;
          try {
            nestedContent = typeof contentObj.contenu === 'string' 
              ? JSON.parse(contentObj.contenu) 
              : contentObj.contenu;
              
            if (nestedContent && typeof nestedContent === 'object') {
              activityReport.issues.push('double_encapsulation');
              stats.issues.doubleEncapsulation++;
              needsRepair = true;
            }
          } catch (e) {
            // Ce n'est pas du JSON dans le contenu, c'est normal
          }
        }
        
        // Vérifier la structure QCM
        if (contentObj.type === 'qcm') {
          if (!contentObj.questions || !Array.isArray(contentObj.questions)) {
            activityReport.issues.push('structure_incorrecte');
            stats.issues.incorrectStructure++;
            needsRepair = true;
          } else {
            // Vérifier chaque question
            for (const [index, question] of contentObj.questions.entries()) {
              if (!question.texte) {
                activityReport.issues.push(`question_${index + 1}_sans_texte`);
                stats.issues.missingTexte++;
                needsRepair = true;
              }
              
              if (!question.options || !Array.isArray(question.options) || question.options.length < 2) {
                activityReport.issues.push(`question_${index + 1}_options_insuffisantes`);
                stats.issues.insufficientOptions++;
                needsRepair = true;
              }
              
              if (typeof question.reponse_correcte !== 'number' || 
                  question.reponse_correcte < 0 || 
                  (question.options && question.reponse_correcte >= question.options.length)) {
                activityReport.issues.push(`question_${index + 1}_reponse_invalide`);
                stats.issues.invalidCorrectAnswer++;
                needsRepair = true;
              }
            }
          }
        } else if (contentObj.type !== 'qcm') {
          activityReport.issues.push('type_non_qcm');
          stats.issues.other++;
          needsRepair = true;
        }
        
        // Réparer si nécessaire
        if (needsRepair && REPAIR_ISSUES) {
          try {
            const validatedContent = validateQcmContent(contentObj);
            activite.setDataValue('contenu', JSON.stringify(validatedContent));
            await activite.save({ silent: true });
            activityReport.wasRepaired = true;
            stats.repaired++;
            logger.info(`Activité ${activite.id} réparée avec succès`);
          } catch (repairError) {
            logger.error(`Impossible de réparer l'activité ${activite.id}: ${repairError.message}`);
          }
        }
        
        // Si aucun problème détecté
        if (activityReport.issues.length === 0) {
          stats.valid++;
        }
        
        // Ajouter le rapport de cette activité aux détails
        if (activityReport.issues.length > 0 || activityReport.wasRepaired) {
          stats.details.push(activityReport);
        }
        
      } catch (error) {
        logger.error(`Erreur lors de l'analyse de l'activité ${activite.id}: ${error.message}`);
        activityReport.issues.push('erreur_analyse');
        stats.issues.other++;
        stats.details.push(activityReport);
      }
    }
    
    // Générer le rapport
    if (GENERATE_REPORT) {
      const report = {
        date: new Date().toISOString(),
        stats: {
          total: stats.total,
          valid: stats.valid,
          repaired: stats.repaired,
          withIssues: stats.total - stats.valid,
          issuesByType: stats.issues
        },
        details: stats.details
      };
      
      fs.writeFileSync(REPORT_PATH, JSON.stringify(report, null, 2));
      logger.info(`Rapport de diagnostic généré avec succès: ${REPORT_PATH}`);
    }
    
    // Afficher le résumé
    logger.info('=== Résumé du diagnostic ===');
    logger.info(`Total activités QCM: ${stats.total}`);
    logger.info(`Activités valides: ${stats.valid} (${Math.round((stats.valid / stats.total) * 100)}%)`);
    logger.info(`Activités avec problèmes: ${stats.total - stats.valid} (${Math.round(((stats.total - stats.valid) / stats.total) * 100)}%)`);
    logger.info(`Activités réparées: ${stats.repaired}`);
    logger.info('Types de problèmes:');
    logger.info(`- JSON invalide: ${stats.issues.invalidJson}`);
    logger.info(`- Type manquant: ${stats.issues.missingType}`);
    logger.info(`- Structure incorrecte: ${stats.issues.incorrectStructure}`);
    logger.info(`- Questions sans texte: ${stats.issues.missingTexte}`);
    logger.info(`- Options insuffisantes: ${stats.issues.insufficientOptions}`);
    logger.info(`- Réponse correcte invalide: ${stats.issues.invalidCorrectAnswer}`);
    logger.info(`- Double encapsulation: ${stats.issues.doubleEncapsulation}`);
    logger.info(`- Autres problèmes: ${stats.issues.other}`);
    
    logger.info('=== Fin du diagnostic ===');
    
  } catch (error) {
    logger.error(`Erreur lors du diagnostic QCM: ${error.message}`);
    logger.error(error.stack);
  }
}

// Exécuter la fonction principale
diagnosticQcm()
  .then(() => {
    logger.info('Script de diagnostic terminé avec succès');
    process.exit(0);
  })
  .catch(err => {
    logger.error(`Erreur fatale dans le script de diagnostic: ${err.message}`);
    logger.error(err.stack);
    process.exit(1);
  });
