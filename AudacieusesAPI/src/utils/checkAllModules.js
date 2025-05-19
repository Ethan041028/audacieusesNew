/**
 * Utilitaire pour vérifier tous les modules dans la base de données
 * Exécuter avec: node src/utils/checkAllModules.js
 */

const { sequelize, Module, Seance } = require('../models');
const logger = require('./logger');

// Fonction principale pour vérifier tous les modules
async function checkAllModules() {
  try {
    console.log('\n==== Vérification de tous les modules dans la base de données ====\n');
    
    // Récupérer tous les modules
    const modules = await Module.findAll({
      include: [{
        model: Seance,
        as: 'seances',
        through: {
          attributes: ['positions'],
        }
      }]
    });
    
    // Afficher le nombre total de modules
    console.log(`Nombre total de modules en base de données: ${modules.length}`);
    
    if (modules.length === 0) {
      console.log('\n⚠️ Aucun module trouvé dans la base de données!');
    } else {
      console.log('\nListe des modules:');
      console.log('------------------------');
      
      modules.forEach((module, index) => {
        console.log(`\n[${index + 1}] Module: ${module.titre} (ID: ${module.id})`);
        console.log(`    - Statut: ${module.statut}`);
        console.log(`    - Description: ${module.description?.substring(0, 100)}${module.description?.length > 100 ? '...' : ''}`);
        console.log(`    - Niveau: ${module.niveau}`);
        console.log(`    - Durée: ${module.duree} heures`);
        console.log(`    - Date de création: ${module.date_creation}`);
        console.log(`    - Créé par: ${module.created_by || 'Non spécifié'}`);
        console.log(`    - Nombre de séances: ${module.seances?.length || 0}`);
        
        // Si des séances sont associées, les afficher
        if (module.seances && module.seances.length > 0) {
          console.log('    - Séances:');
          module.seances.forEach((seance, i) => {
            console.log(`      [${i + 1}] ${seance.titre} (ID: ${seance.id}, Durée: ${seance.duree} min)`);
          });
        }
      });
      
      // Analyse des statuts
      const statusCounts = modules.reduce((counts, module) => {
        counts[module.statut] = (counts[module.statut] || 0) + 1;
        return counts;
      }, {});
      
      console.log('\nRépartition par statut:');
      Object.entries(statusCounts).forEach(([statut, count]) => {
        console.log(`- ${statut}: ${count} module(s)`);
      });
      
      // Vérification de la table des modules dans SQL
      const [modulesSQL] = await sequelize.query('SELECT * FROM modules');
      
      console.log(`\nNombre de modules dans la table SQL: ${modulesSQL.length}`);
      
      if (modulesSQL.length !== modules.length) {
        console.log('⚠️ ATTENTION: Le nombre de modules dans Sequelize et SQL est différent!');
      }
      
      // Vérification des associations module-séance
      const [moduleSeancesCount] = await sequelize.query('SELECT COUNT(*) as count FROM module_seances');
      console.log(`\nNombre d'associations module-séance: ${moduleSeancesCount[0]?.count || 0}`);
    }
    
    console.log('\n==== Fin de la vérification ====');
  } catch (error) {
    console.error(`\n❌ Erreur lors de la vérification des modules: ${error.message}`);
    console.error(error.stack);
  } finally {
    // Fermer la connexion à la base de données
    await sequelize.close();
  }
}

// Exécution du script si appelé directement
if (require.main === module) {
  checkAllModules()
    .then(() => process.exit(0))
    .catch(err => {
      console.error('Erreur fatale:', err);
      process.exit(1);
    });
} else {
  // Export de la fonction pour une utilisation dans d'autres scripts
  module.exports = { checkAllModules };
} 