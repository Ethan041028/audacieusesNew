const { User, Module, Seance, Evenement, Suivi, Role, Activite } = require('../models');
const { Op } = require('sequelize');
const logger = require('../utils/logger');
const sequelize = require('sequelize');

// Obtenir les statistiques pour le tableau de bord administrateur
exports.getDashboardStats = async (req, res) => {
  try {
    // Date d'il y a 7 jours pour les statistiques récentes
    const lastWeek = new Date();
    lastWeek.setDate(lastWeek.getDate() - 7);
      // Statistiques des utilisateurs
    const totalUsers = await User.count();
    
    const activeUsers = await User.count({
      where: {
        updated_at: {
          [Op.gte]: lastWeek
        }
      }
    });
    
    // Statistiques des modules
    const totalModules = await Module.count();
    
    // Statistiques des séances
    const totalSeances = await Seance.count();
      // Récupérer l'activité récente (dernières connexions, inscriptions, etc.)
    const recentUserActivity = await User.findAll({
      limit: 5,
      where: {
        [Op.or]: [
          { updated_at: { [Op.gte]: lastWeek } },
          { created_at: { [Op.gte]: lastWeek } }
        ]
      },      include: [{ model: Role, as: 'role' }],
      attributes: ['id', 'nom', 'prenom', 'mail', 'created_at', 'updated_at'],
      order: [['updated_at', 'DESC']]
    });
      // Récupérer les derniers modules créés
    const recentModules = await Module.findAll({
      limit: 3,
      order: [['date_creation', 'DESC']],
      attributes: ['id', 'titre', 'description', 'date_creation']
    });
      // Récupérer les dernières séances créées
    const recentSeances = await Seance.findAll({
      limit: 3,
      order: [['date_creation', 'DESC']],
      attributes: ['id', 'titre', 'description', 'date_creation']
    });
    
    // Agréger toutes les activités récentes en un seul tableau
    const recentActivity = [
      ...recentUserActivity.map(user => ({
        type: 'user',
        date: user.updated_at || user.created_at,
        description: `${user.prenom} ${user.nom} s'est ${user.updated_at ? 'connecté' : 'inscrit'}`,
        user: {          id: user.id,
          nom: user.nom,
          prenom: user.prenom,
          role: user.role.nom
        }
      })),
      ...recentModules.map(module => ({
        type: 'module',
        date: module.date_creation,
        description: `Nouveau module créé: ${module.titre}`,        module: {
          id: module.id,
          titre: module.titre
        }
      })),      ...recentSeances.map(seance => ({
        type: 'seance',
        date: seance.date_creation,
        description: `Nouvelle séance créée: ${seance.titre}`,
        seance: {
          id: seance.id,
          titre: seance.titre
        }
      }))
    ];
    
    // Trier par date décroissante
    recentActivity.sort((a, b) => new Date(b.date) - new Date(a.date));
    
    // Limiter à 10 activités
    const limitedActivity = recentActivity.slice(0, 10);
    
    // Structure de réponse
    const stats = {
      totalUsers,
      activeUsers,
      totalModules,
      totalSeances,
      recentActivity: limitedActivity
    };
    
    // Préparer la réponse
    const response = {
      totalUsers,
      activeUsers,
      totalModules,
      totalSeances,
      recentActivity,
      recentModules,
      recentSeances
    };

    // Log de la réponse pour débogage
    logger.debug('Réponse des statistiques administrateur:', response);

    // Envoyer la réponse
    res.json(response);
  } catch (error) {
    logger.error('Erreur lors de la récupération des statistiques administrateur:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
};

// Obtenir les statistiques des utilisateurs
exports.getUserStats = async (req, res) => {
  try {
    // Nombre total d'utilisateurs
    const totalUsers = await User.count();
    
    // Répartition par rôle
    const usersByRole = await User.findAll({
      attributes: [
        [sequelize.literal('`role`.`nom`'), 'role'],
        [sequelize.fn('COUNT', sequelize.col('User.id')), 'count']
      ],
      include: [{ model: Role, as: 'role', attributes: [] }],
      group: ['role.nom']
    });
      // Nombre d'utilisateurs actifs (connectés ces 7 derniers jours)
    const lastWeek = new Date();
    lastWeek.setDate(lastWeek.getDate() - 7);
    
    const activeUsers = await User.count({
      where: {
        updated_at: {
          [Op.gte]: lastWeek
        }
      }
    });
    
    // Nouveaux utilisateurs des 30 derniers jours
    const lastMonth = new Date();
    lastMonth.setDate(lastMonth.getDate() - 30);
    
    const newUsers = await User.count({
      where: {
        created_at: {
          [Op.gte]: lastMonth
        }
      }
    });
    
    res.status(200).json({
      totalUsers,
      usersByRole,
      activeUsers,
      newUsers
    });
  } catch (error) {
    logger.error(`Erreur lors de la récupération des statistiques utilisateurs: ${error.message}`);
    res.status(500).json({
      error: 'Erreur serveur',
      message: 'Une erreur est survenue lors de la récupération des statistiques utilisateurs'
    });
  }
};

// Obtenir les statistiques des modules
exports.getModuleStats = async (req, res) => {
  try {
    // Nombre total de modules
    const totalModules = await Module.count();
      
    // Répartition par statut
    const modulesByStatus = await Module.findAll({
      attributes: [
        ['statut', 'statut'],
        [sequelize.fn('COUNT', sequelize.col('id')), 'count']
      ],
      group: ['statut']
    });
    
    // Si aucun résultat, donner une valeur par défaut
    if (modulesByStatus.length === 0) {
      modulesByStatus.push({
        statut: 'brouillon',
        count: await Module.count()
      });
    }
    
    // Nombre moyen de séances par module
    const moduleSeances = await Module.findAll({
      include: [{
        model: Seance,
        as: 'seances',
        through: { attributes: [] }
      }],
      attributes: ['id']
    });
    
    let totalSeances = 0;
    moduleSeances.forEach(module => {
      totalSeances += module.seances.length;
    });
    
    const avgSeancesPerModule = totalModules > 0 ? totalSeances / totalModules : 0;
    
    res.status(200).json({
      totalModules,
      modulesByStatus,
      avgSeancesPerModule
    });
  } catch (error) {
    logger.error(`Erreur lors de la récupération des statistiques modules: ${error.message}`);
    res.status(500).json({
      error: 'Erreur serveur',
      message: 'Une erreur est survenue lors de la récupération des statistiques modules'
    });
  }
};

// Obtenir les statistiques des séances
exports.getSeanceStats = async (req, res) => {
  try {
    // Nombre total de séances
    const totalSeances = await Seance.count();
    
    // Répartition par type
    const seancesByType = await Seance.findAll({
      attributes: [
        ['type', 'type'],
        [sequelize.fn('COUNT', sequelize.col('id')), 'count']
      ],
      group: ['type']
    });
    
    // Si aucun résultat, donner une valeur par défaut
    if (seancesByType.length === 0) {
      seancesByType.push({
        type: 'theorique',
        count: await Seance.count()
      });
    }
    
    // Durée moyenne des séances
    const dureeResult = await Seance.findAll({
      attributes: [
        [sequelize.fn('AVG', sequelize.col('duree')), 'avgDuration']
      ]
    });
    
    const avgDuration = dureeResult[0].dataValues.avgDuration || 0;
    
    res.status(200).json({
      totalSeances,
      seancesByType,
      avgDuration
    });
  } catch (error) {
    logger.error(`Erreur lors de la récupération des statistiques séances: ${error.message}`);
    res.status(500).json({
      error: 'Erreur serveur',
      message: 'Une erreur est survenue lors de la récupération des statistiques séances'
    });
  }
};
