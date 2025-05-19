/**
 * Utilitaire pour assigner plusieurs modules à un utilisateur
 * Exécuter avec: node src/utils/assignModulesToUser.js <userId> <moduleId1> <moduleId2> ...
 */

const { sequelize, User, Module } = require('../models');
const logger = require('./logger');

// Fonction principale pour assigner des modules à un utilisateur
async function assignModulesToUser(userId, moduleIds) {
  try {
    console.log(`\n==== Assignation de modules à l'utilisateur ID: ${userId} ====\n`);
    
    // 1. Vérifier si l'utilisateur existe
    const user = await User.findByPk(userId);
    
    if (!user) {
      console.error(`Erreur: Utilisateur avec ID ${userId} non trouvé dans la base de données.`);
      return;
    }
    
    console.log(`Utilisateur trouvé: ${user.nom} ${user.prenom} (ID: ${user.id})`);
    
    // 2. Vérifier et assigner chaque module
    const successfulAssignments = [];
    const failedAssignments = [];
    
    for (const moduleId of moduleIds) {
      try {
        console.log(`\nTraitement du module ID: ${moduleId}`);
        
        // Vérifier si le module existe
        const module = await Module.findByPk(moduleId);
        
        if (!module) {
          console.error(`- Erreur: Module avec ID ${moduleId} non trouvé.`);
          failedAssignments.push({ moduleId, reason: 'Module non trouvé' });
          continue;
        }
        
        console.log(`- Module trouvé: ${module.titre} (ID: ${module.id})`);
        
        // Vérifier si le module est déjà assigné à l'utilisateur
        const [existingAssignment] = await sequelize.query(`
          SELECT * FROM modules_users 
          WHERE user_id = :userId AND module_id = :moduleId
        `, {
          replacements: { userId, moduleId }
        });
        
        if (existingAssignment.length > 0) {
          console.log(`- Ce module est déjà assigné à l'utilisateur.`);
          // Mise à jour de la date d'assignation
          await sequelize.query(`
            UPDATE modules_users 
            SET assigned_at = NOW()
            WHERE user_id = :userId AND module_id = :moduleId
          `, {
            replacements: { userId, moduleId }
          });
          
          console.log(`- Date d'assignation mise à jour.`);
          successfulAssignments.push({ moduleId, action: 'updated' });
          continue;
        }
        
        // Assigner le module à l'utilisateur
        await user.addModule(module, { 
          through: { assigned_at: new Date() }
        });
        
        console.log(`- Module assigné avec succès.`);
        successfulAssignments.push({ moduleId, action: 'assigned' });
      } catch (error) {
        console.error(`- Erreur lors de l'assignation du module ${moduleId}: ${error.message}`);
        failedAssignments.push({ moduleId, reason: error.message });
      }
    }
    
    // 3. Récapitulatif
    console.log(`\n==== Récapitulatif ====`);
    console.log(`\nAssignations réussies: ${successfulAssignments.length}`);
    successfulAssignments.forEach(item => {
      console.log(`- Module ID: ${item.moduleId} - ${item.action === 'assigned' ? 'Nouvelle assignation' : 'Mise à jour'}`);
    });
    
    console.log(`\nAssignations échouées: ${failedAssignments.length}`);
    failedAssignments.forEach(item => {
      console.log(`- Module ID: ${item.moduleId} - Raison: ${item.reason}`);
    });
    
    console.log('\n==== Fin de l\'assignation ====');
  } catch (error) {
    console.error(`Erreur lors de l'assignation des modules: ${error.message}`);
    console.error(error.stack);
  } finally {
    // Fermer la connexion à la base de données
    await sequelize.close();
  }
}

// Exécution du script si appelé directement
if (require.main === module) {
  const args = process.argv.slice(2);
  const userId = args[0];
  const moduleIds = args.slice(1);
  
  if (!userId || moduleIds.length === 0) {
    console.error('Erreur: Veuillez spécifier un ID utilisateur et au moins un ID de module.');
    console.log('Usage: node src/utils/assignModulesToUser.js <userId> <moduleId1> <moduleId2> ...');
    process.exit(1);
  }
  
  assignModulesToUser(userId, moduleIds)
    .then(() => process.exit(0))
    .catch(err => {
      console.error('Erreur fatale:', err);
      process.exit(1);
    });
} else {
  // Export de la fonction pour une utilisation dans d'autres scripts
  module.exports = { assignModulesToUser };
} 