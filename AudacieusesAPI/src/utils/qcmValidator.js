/**
 * Script utilitaire pour valider et corriger la création d'activités QCM
 * Ce fichier sera utilisé comme middleware pour assurer que les QCM
 * sont correctement formatés avant d'être envoyés à la base de données
 * 
 * Usage: À importer dans activiteController.js
 */

const logger = require('./logger');

/**
 * Valide et standardise les contenus QCM
 * @param {Object} content - Le contenu à valider
 * @returns {Object} - Le contenu standardisé
 */
function validateQcmContent(content) {
  try {
    if (!content) {
      throw new Error('Contenu QCM manquant');
    }

    // Si le contenu est une chaîne, essayer de le parser
    let contentObj = content;
    if (typeof content === 'string') {
      try {
        contentObj = JSON.parse(content);
      } catch (e) {
        throw new Error(`Format JSON invalide: ${e.message}`);
      }
    }

    // Vérifier si le contenu est déjà correctement structuré
    if (contentObj.type === 'qcm' && Array.isArray(contentObj.questions)) {
      // Effectuer une validation approfondie
      for (const question of contentObj.questions) {
        if (!question.texte) {
          question.texte = 'Question sans texte';
          logger.warn('Question QCM sans texte détectée, ajout d\'un texte par défaut');
        }

        if (!Array.isArray(question.options) || question.options.length < 2) {
          question.options = question.options || [];
          // Assurer un minimum de 2 options
          while (question.options.length < 2) {
            question.options.push(`Option ${question.options.length + 1}`);
          }
          logger.warn('Options QCM insuffisantes détectées, ajout d\'options par défaut');
        }

        // S'assurer que reponse_correcte est un nombre valide
        if (typeof question.reponse_correcte !== 'number' || 
            question.reponse_correcte < 0 || 
            question.reponse_correcte >= question.options.length) {
          question.reponse_correcte = 0;
          logger.warn('Réponse correcte invalide détectée, valeur par défaut définie à 0');
        }
      }

      return contentObj;
    }

    // Création d'une structure standard pour le QCM
    const standardizedQcm = {
      type: 'qcm',
      questions: []
    };

    // Cas 1: format avec une seule question
    if (contentObj.options && Array.isArray(contentObj.options)) {
      standardizedQcm.questions.push({
        texte: contentObj.texte || contentObj.question || 'Question à choix multiples',
        options: contentObj.options,
        reponse_correcte: contentObj.reponse_correcte || contentObj.correctAnswer || 0
      });
    }
    // Cas 2: format avec questions au pluriel mais pas sous type: 'qcm'
    else if (contentObj.questions && Array.isArray(contentObj.questions)) {
      standardizedQcm.questions = contentObj.questions.map(q => ({
        texte: q.texte || q.question || 'Question sans texte',
        options: Array.isArray(q.options) ? q.options : ['Option 1', 'Option 2'],
        reponse_correcte: q.reponse_correcte || q.correctAnswer || 0
      }));
    }
    // Cas 3: structure inconnue, créer une question par défaut
    else {
      standardizedQcm.questions.push({
        texte: 'Question à choix multiples',
        options: ['Option 1', 'Option 2', 'Option 3'],
        reponse_correcte: 0
      });
      logger.warn('Structure QCM non reconnue, création d\'une structure par défaut');
    }

    return standardizedQcm;
  } catch (error) {
    logger.error(`Erreur lors de la validation du contenu QCM: ${error.message}`);
    // Retourner une structure par défaut en cas d'erreur
    return {
      type: 'qcm',
      questions: [{
        texte: 'Question par défaut (erreur de validation)',
        options: ['Option 1', 'Option 2'],
        reponse_correcte: 0
      }]
    };
  }
}

module.exports = {
  validateQcmContent
};
