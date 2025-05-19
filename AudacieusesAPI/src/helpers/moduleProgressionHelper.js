const logger = require('../utils/logger');
const db = require('../models');
const { Sequelize } = db;
const { Op } = Sequelize;

/**
 * Calcule et met à jour la progression d'un module pour un utilisateur
 * @param {number} userId - ID de l'utilisateur
 * @param {number} moduleId - ID du module
 * @returns {Promise<object>} Données de suivi mises à jour
 */
async function updateModuleProgression(userId, moduleId) {
  try {
    // 1. Récupérer toutes les séances du module
    const moduleSeances = await db.ModuleSeance.findAll({
      where: { module_id: moduleId },
      include: [{ model: db.Seance, as: 'seance' }]
    });

    if (!moduleSeances || moduleSeances.length === 0) {
      logger.warn(`Aucune séance trouvée pour le module ${moduleId}`);
      return null;
    }

    const seanceIds = moduleSeances.map(ms => ms.seance_id);
    logger.info(`Séances du module ${moduleId}: [${seanceIds.join(', ')}]`);
    logger.info(`Module ${moduleId} a ${seanceIds.length} séances`);

    // 2. Récupérer les suivis de toutes les séances pour cet utilisateur
    const suivis = await db.Suivi.findAll({
      where: {
        user_id: userId,
        seance_id: { [Op.in]: seanceIds }
      },
      include: [{ model: db.StatusSuivi, as: 'status' }]
    });

    logger.info(`Suivi pour module ${moduleId} - Nombre de suivis trouvés: ${suivis.length} (uniquement pour les séances du module)`);

    // 3. Calculer la progression
    let completedCount = 0;
    suivis.forEach(suivi => {
      logger.info(`Suivi ${completedCount + 1} - ID: ${suivi.id}, Séance ID: ${suivi.seance_id}, Status: ${suivi.status?.type_status}, Progression: ${suivi.progression?.toFixed(2)}%`);
      
      // Vérifier si le statut est TERMINE
      if (suivi.status && suivi.status.type_status === 'TERMINE') {
        completedCount++;
        logger.info(`Séance ${suivi.seance_id} du module ${moduleId} est marquée comme terminée (ID du suivi: ${suivi.id})`);
      }
    });

    // Calcul du pourcentage de progression
    const totalSeances = seanceIds.length;
    const progressionPercentage = totalSeances > 0 ? (completedCount / totalSeances) * 100 : 0;
    logger.info(`Module ${moduleId} - Suivis spécifiques: ${completedCount}/${totalSeances}`);
    logger.info(`Module ${moduleId} - Progression: ${completedCount}/${totalSeances} séances (${progressionPercentage}%)`);

    // 4. Déterminer le statut du module
    let statusId = 1; // NON_COMMENCE par défaut
    if (progressionPercentage === 100) {
      statusId = 3; // TERMINE
    } else if (progressionPercentage > 0) {
      statusId = 2; // EN_COURS
    }

    // 5. Mettre à jour ou créer le suivi du module
    const [suiviModule, created] = await db.SuiviModule.findOrCreate({
      where: {
        user_id: userId,
        module_id: moduleId
      },
      defaults: {
        progression: progressionPercentage,
        status_id: statusId,
        date_mise_a_jour: new Date(),
        date_completion: statusId === 3 ? new Date() : null
      }
    });

    // Si le suivi existe déjà, mettre à jour ses valeurs
    if (!created) {
      suiviModule.progression = progressionPercentage;
      suiviModule.status_id = statusId;
      suiviModule.date_mise_a_jour = new Date();

      // Si le module est terminé, ajouter une date de complétion
      if (statusId === 3 && !suiviModule.date_completion) {
        suiviModule.date_completion = new Date();
      }

      await suiviModule.save();
    }

    logger.info(`Suivi du module ${moduleId} pour l'utilisateur ${userId} mis à jour: progression ${progressionPercentage}%, statut ${statusId}`);

    // Récupérer les données complètes du suivi
    const updatedSuiviModule = await db.SuiviModule.findOne({
      where: { id: suiviModule.id },
      include: [{ model: db.StatusSuivi, as: 'status' }]
    });

    return updatedSuiviModule;
  } catch (error) {
    logger.error(`Erreur lors de la mise à jour de la progression du module ${moduleId} pour l'utilisateur ${userId}: ${error.message}`);
    throw error;
  }
}

module.exports = {
  updateModuleProgression
}; 