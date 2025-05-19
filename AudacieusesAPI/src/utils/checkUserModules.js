/**
 * Utilitaire pour vérifier les modules assignés à un utilisateur
 * Exécuter avec: node src/utils/checkUserModules.js <userId>
 */

const { sequelize, User, Module, Seance } = require('../models');
const logger = require('./logger');

// Fonction principale pour vérifier les modules d'un utilisateur
async function checkUserModules(userId) {
  try {
    console.log(`\n==== Vérification des modules pour l'utilisateur ID: ${userId} ====\n`);
    
    // 1. Vérifier si l'utilisateur existe
    const user = await User.findByPk(userId, {
      include: [{
        model: Module,
        as: 'modules',
        include: [{
          model: Seance,
          as: 'seances',
          through: {
            attributes: ['positions'],
          }
        }]
      }]
    });
    
    if (!user) {
      console.error(`Erreur: Utilisateur avec ID ${userId} non trouvé dans la base de données.`);
      return;
    }
    
    console.log(`Utilisateur trouvé: ${user.nom} ${user.prenom} (ID: ${user.id})`);
    console.log(`Email: ${user.email}`);
    console.log(`Rôle: ${user.role?.nom || 'Non défini'}`);
    
    // 2. Vérifier les modules associés
    const modules = user.modules || [];
    console.log(`\nNombre de modules assignés: ${modules.length}`);
    
    if (modules.length === 0) {
      console.log('\nAucun module n\'est assigné à cet utilisateur.');
    } else {
      console.log('\nListe des modules assignés:');
      console.log('------------------------');
      
      modules.forEach((module, index) => {
        console.log(`\n[${index + 1}] Module: ${module.titre} (ID: ${module.id})`);
        console.log(`    - Statut: ${module.statut}`);
        console.log(`    - Description: ${module.description?.substring(0, 100)}${module.description?.length > 100 ? '...' : ''}`);
        console.log(`    - Niveau: ${module.niveau}`);
        console.log(`    - Durée: ${module.duree} heures`);
        console.log(`    - Date de création: ${module.date_creation}`);
        console.log(`    - Nombre de séances: ${module.seances?.length || 0}`);
      });
    }
    
    // 3. Vérifier directement dans la table d'association
    const [rows] = await sequelize.query(`
      SELECT * FROM modules_users 
      WHERE user_id = :userId
    `, {
      replacements: { userId }
    });
    
    console.log(`\nAssociations directes dans la table modules_users: ${rows.length}`);
    if (rows.length > 0) {
      console.log('\nDétails des associations:');
      rows.forEach((row, index) => {
        console.log(`[${index + 1}] user_id: ${row.user_id}, module_id: ${row.module_id}, assigné le: ${row.assigned_at}`);
      });
    }
    
    // 4. Vérification des différences
    if (rows.length !== modules.length) {
      console.error('\n⚠️ ATTENTION: Le nombre d\'associations dans la table ne correspond pas au nombre de modules récupérés!');
      console.error(`Nombre d'associations dans modules_users: ${rows.length}`);
      console.error(`Nombre de modules récupérés via l'include: ${modules.length}`);
    }
    
    console.log('\n==== Fin de la vérification ====');
  } catch (error) {
    console.error(`Erreur lors de la vérification des modules: ${error.message}`);
    console.error(error.stack);
  } finally {
    // Fermer la connexion à la base de données
    await sequelize.close();
  }
}

// Exécution du script si appelé directement
if (require.main === module) {
  const userId = process.argv[2];
  
  if (!userId) {
    console.error('Erreur: Veuillez spécifier un ID utilisateur.');
    console.log('Usage: node src/utils/checkUserModules.js <userId>');
    process.exit(1);
  }
  
  checkUserModules(userId)
    .then(() => process.exit(0))
    .catch(err => {
      console.error('Erreur fatale:', err);
      process.exit(1);
    });
} else {
  // Export de la fonction pour une utilisation dans d'autres scripts
  module.exports = { checkUserModules };
} 