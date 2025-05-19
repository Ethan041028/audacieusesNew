/**
 * Script pour tester le traitement des QCM
 * Ce script valide que les données QCM sont correctement formatées
 * Usage: node tests/qcmFormatTests.js
 */

const { validateQcmContent } = require('../src/utils/qcmValidator');
const logger = require('../src/utils/logger');

// Exemples de données QCM à tester
const testCases = [
  {
    name: "QCM bien structuré standard",
    input: {
      type: "qcm",
      questions: [
        {
          texte: "Quelle est la capitale de la France?",
          options: ["Paris", "Londres", "Berlin", "Madrid"],
          reponse_correcte: 0
        }
      ]
    },
    shouldPass: true
  },
  {
    name: "QCM sans type",
    input: {
      questions: [
        {
          texte: "Quelle est la capitale de l'Espagne?",
          options: ["Paris", "Londres", "Berlin", "Madrid"],
          reponse_correcte: 3
        }
      ]
    },
    shouldPass: true
  },
  {
    name: "QCM avec format obsolète (une seule question)",
    input: {
      question: "Quelle est la capitale de l'Allemagne?",
      options: ["Paris", "Londres", "Berlin", "Madrid"],
      correctAnswer: 2
    },
    shouldPass: true
  },
  {
    name: "QCM avec question sans texte",
    input: {
      type: "qcm",
      questions: [
        {
          options: ["Rouge", "Vert", "Bleu"],
          reponse_correcte: 1
        }
      ]
    },
    shouldPass: true // devrait passer car le validateur ajoute un texte par défaut
  },
  {
    name: "QCM avec options insuffisantes",
    input: {
      type: "qcm",
      questions: [
        {
          texte: "Choisissez une couleur",
          options: ["Rouge"],
          reponse_correcte: 0
        }
      ]
    },
    shouldPass: true // devrait passer car le validateur ajoute des options par défaut
  },
  {
    name: "QCM avec réponse correcte invalide",
    input: {
      type: "qcm",
      questions: [
        {
          texte: "Question avec réponse invalide",
          options: ["Option 1", "Option 2"],
          reponse_correcte: 5 // hors limites
        }
      ]
    },
    shouldPass: true // devrait passer car le validateur corrige la réponse
  },
  {
    name: "QCM avec JSON mal formaté",
    input: "{texte: 'Question mal formatée', options: ['A', 'B']}",
    shouldPass: false
  },
  {
    name: "QCM double encapsulé",
    input: {
      type: "texte",
      contenu: JSON.stringify({
        type: "qcm",
        questions: [
          {
            texte: "Question double encapsulée",
            options: ["Option A", "Option B"],
            reponse_correcte: 0
          }
        ]
      })
    },
    shouldPass: true
  }
];

// Fonction pour exécuter les tests
async function runTests() {
  logger.info("=== Démarrage des tests de validation QCM ===");
  
  let passCount = 0;
  let totalTests = testCases.length;
  
  for (const [index, testCase] of testCases.entries()) {
    logger.info(`\nTest ${index + 1}/${totalTests}: ${testCase.name}`);
    
    try {
      // Valider le contenu QCM
      const validatedContent = validateQcmContent(testCase.input);
      
      // Vérifier que la structure est valide
      const isValid = validatedContent && 
                      validatedContent.type === "qcm" && 
                      Array.isArray(validatedContent.questions) &&
                      validatedContent.questions.length > 0;
      
      if (isValid) {
        logger.info("✓ Format valide obtenu");
        
        // Vérifier chaque question
        for (const [qIndex, question] of validatedContent.questions.entries()) {
          // Vérifier texte
          if (!question.texte) {
            logger.error(`Question ${qIndex + 1}: texte manquant`);
            isValid = false;
          }
          
          // Vérifier options
          if (!Array.isArray(question.options) || question.options.length < 2) {
            logger.error(`Question ${qIndex + 1}: options insuffisantes (${question.options?.length || 0})`);
            isValid = false;
          }
          
          // Vérifier réponse correcte
          if (typeof question.reponse_correcte !== "number" || 
              question.reponse_correcte < 0 || 
              question.reponse_correcte >= question.options.length) {
            logger.error(`Question ${qIndex + 1}: réponse correcte invalide (${question.reponse_correcte})`);
            isValid = false;
          }
        }
        
        if (isValid) {
          logger.info("✓ Toutes les questions sont valides");
          if (testCase.shouldPass) {
            logger.info("✓ Test réussi comme prévu");
            passCount++;
          } else {
            logger.error("✗ Test a passé alors qu'il devrait échouer");
          }
        } else {
          if (!testCase.shouldPass) {
            logger.info("✓ Test a échoué comme prévu");
            passCount++;
          } else {
            logger.error("✗ Format invalide alors qu'il devrait être valide");
          }
        }
      } else {
        if (!testCase.shouldPass) {
          logger.info("✓ Test a échoué comme prévu");
          passCount++;
        } else {
          logger.error("✗ Format invalide alors qu'il devrait être valide");
        }
      }
      
      // Afficher la structure validée
      logger.info("Structure validée:", validatedContent);
      
    } catch (error) {
      logger.error(`Erreur lors du test: ${error.message}`);
      
      if (!testCase.shouldPass) {
        logger.info("✓ Test a échoué comme prévu");
        passCount++;
      } else {
        logger.error("✗ Erreur inattendue pour un test qui devrait passer");
      }
    }
  }
  
  // Afficher le résumé
  logger.info("\n=== Résumé des tests ===");
  logger.info(`Tests passés: ${passCount}/${totalTests} (${Math.round(passCount/totalTests*100)}%)`);
  
  return { passCount, totalTests };
}

// Exécuter les tests
runTests()
  .then(({ passCount, totalTests }) => {
    if (passCount === totalTests) {
      logger.info("Tous les tests ont réussi!");
      process.exit(0);
    } else {
      logger.error(`${totalTests - passCount} test(s) ont échoué`);
      process.exit(1);
    }
  })
  .catch(error => {
    logger.error(`Erreur fatale: ${error.message}`);
    logger.error(error.stack);
    process.exit(1);
  });
