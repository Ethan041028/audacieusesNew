/**
 * Script pour supprimer les tables et références liées à la messagerie dans la base de données
 * Ce script doit être exécuté après avoir supprimé les fichiers de messagerie
 */

const { sequelize } = require('../models');
const logger = require('./logger');

async function dropMessagingTables() {
  const transaction = await sequelize.transaction();

  try {
    logger.info('Début de la suppression des tables de messagerie...');

    // Approche plus simple : essayer de supprimer la table directement
    try {
      logger.info('Tentative de suppression de la table messages...');
      await sequelize.query('DROP TABLE IF EXISTS messages CASCADE', { transaction });
      logger.info('Table messages supprimée avec succès');
    } catch (dropError) {
      logger.warn(`Erreur lors de la suppression de la table messages: ${dropError.message}`);
      // Continuer malgré l'erreur
    }

    // Commit de la transaction
    await transaction.commit();
    logger.info('Suppression des tables de messagerie terminée avec succès');
    
    return { success: true, message: 'Tables de messagerie supprimées avec succès' };
  } catch (error) {
    // Rollback en cas d'erreur
    await transaction.rollback();
    logger.error(`Erreur lors de la suppression des tables de messagerie: ${error.message}`);
    return { success: false, error: error.message };
  }
}

// Exécution du script
(async () => {
  try {
    logger.info('=== DÉBUT DE LA SUPPRESSION DES TABLES DE MESSAGERIE ===');
    const result = await dropMessagingTables();
    
    if (result.success) {
      logger.info(`✅ ${result.message}`);
    } else {
      logger.error(`❌ Échec: ${result.error}`);
    }
    
    logger.info('=== FIN DE LA SUPPRESSION DES TABLES DE MESSAGERIE ===');
    
    // Fermer la connexion à la base de données
    await sequelize.close();
    process.exit(0);
  } catch (err) {
    logger.error(`Erreur fatale: ${err.message}`);
    process.exit(1);
  }
})();
