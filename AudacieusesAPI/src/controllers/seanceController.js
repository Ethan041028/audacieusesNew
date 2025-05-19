const { Seance, Activite, Suivi, StatusSuivi, User, Module, sequelize } = require('../models');
const logger = require('../utils/logger');
const socketIO = require('../config/socketio');
const ModuleSeance = sequelize.models.ModuleSeance;
const { Op } = require('sequelize');
const moduleProgressionHelper = require('../helpers/moduleProgressionHelper');

// Récupérer toutes les séances
exports.getAllSeances = async (req, res) => {
  try {
    const seances = await Seance.findAll({
      include: [
        {
          model: Activite,
          as: 'activites',
          through: {
            as: 'seanceActivite',
            attributes: ['ordre']
          },
          attributes: { 
            exclude: [] // No need to exclude ordre anymore as it's been removed from the model
          }
        },
        {
          model: Module,
          as: 'modules'
        }
      ]
    });
    
    res.status(200).json({ seances });
  } catch (error) {
    logger.error(`Erreur lors de la récupération des séances: ${error.message}`);
    res.status(500).json({
      error: 'Erreur serveur',
      message: 'Une erreur est survenue lors de la récupération des séances'
    });
  }
};

// Récupérer une séance par son ID
exports.getSeanceById = async (req, res) => {
  try {
    const seanceId = req.params.id;
    
    const seance = await Seance.findByPk(seanceId, {
      include: [
        {
          model: Activite,
          as: 'activites',
          through: {
            as: 'seanceActivite',
            attributes: ['ordre']
          },
          attributes: { 
            exclude: [] // No need to exclude ordre anymore as it's been removed from the model
          }
        },
        {
          model: Module,
          as: 'modules'
        }
      ]
    });
    
    if (!seance) {
      return res.status(404).json({
        error: 'Séance non trouvée',
        message: 'La séance demandée n\'existe pas'
      });
    }
    
    // Pour les clients, vérifier si l'utilisateur a accès à cette séance via un module
    if (req.user && req.user.role && req.user.role.role_type === 'client') {
      // Récupérer le suivi de cette séance pour l'utilisateur
      const suivi = await Suivi.findOne({
        where: {
          seance_id: seanceId,
          user_id: req.user.id
        },
        include: [{
          model: StatusSuivi,
          as: 'status'
        }]
      });
      
      if (suivi) {
        // Ajouter les informations de progression à la réponse
        return res.status(200).json({
          seance,
          progression: {
            status: suivi.status.type_status,
            progression: suivi.progression,
            lastUpdate: suivi.update_suivi
          }
        });
      }
    }
    
    res.status(200).json({ seance });
  } catch (error) {
    logger.error(`Erreur lors de la récupération de la séance: ${error.message}`);
    res.status(500).json({
      error: 'Erreur serveur',
      message: 'Une erreur est survenue lors de la récupération de la séance'
    });
  }
};

// Créer une nouvelle séance (admin seulement)
exports.createSeance = async (req, res) => {
  try {
    const { titre, description, duree, type, contenu, ressources, modules, ordre, created_by, statut, active } = req.body;
    
    // Vérifier que les valeurs requises sont présentes
    if (!titre) {
      return res.status(400).json({
        error: 'Données manquantes',
        message: 'Le titre est requis'
      });
    }
    
    if (!duree || isNaN(parseInt(duree))) {
      return res.status(400).json({
        error: 'Données invalides',
        message: 'La durée doit être un nombre valide'
      });
    }
    
    // La vérification de la présence d'un module est maintenant optionnelle
    // Créer la nouvelle séance
    const newSeance = await Seance.create({
      titre,
      description: description || '',
      duree: parseInt(duree),
      type: type || 'individuelle',
      contenu: contenu || '',
      ressources: ressources || null,
      created_by: created_by || req.user.id, // Utiliser l'ID de l'utilisateur connecté ou celui fourni
      active: active !== undefined ? active : true,
      date_creation: new Date(),
      updated_at: new Date()
    });
    
    // Associer la séance aux modules spécifiés à travers la table de jointure (si spécifiés)
    if (modules && Array.isArray(modules) && modules.length > 0) {
      // Vérifier que les modules existent
      for (let i = 0; i < modules.length; i++) {
        const moduleId = modules[i];
        const moduleExists = await Module.findByPk(moduleId);
        
        if (!moduleExists) {
          logger.warn(`Le module avec l'ID ${moduleId} n'existe pas, mais la séance sera quand même créée`);
          continue; // Continuer avec les autres modules au lieu d'échouer
        }
        
        // Créer l'association dans la table de jointure
        await ModuleSeance.create({
          module_id: moduleId,
          seance_id: newSeance.id,
          positions: ordre || i // Utiliser l'ordre fourni ou l'index dans le tableau
        });
      }
    }
    
    // Si des activités sont spécifiées, les associer à la séance
    if (req.body.activites && Array.isArray(req.body.activites)) {
      for (let i = 0; i < req.body.activites.length; i++) {
        const activiteId = req.body.activites[i];
        
        // Vérifier si l'activité existe
        const activite = await Activite.findByPk(activiteId);
        
        if (activite) {
          // Créer l'association dans la table de jointure avec l'ordre basé sur l'index
          await sequelize.models.SeanceActivite.create({
            seance_id: newSeance.id,
            activite_id: activiteId,
            ordre: i
          });
        }
      }
    }
    
    // Récupérer la séance créée avec ses modules et activités pour la réponse
    const createdSeance = await Seance.findByPk(newSeance.id, {
      include: [
        {
          model: Activite,
          as: 'activites',
          through: {
            as: 'seanceActivite',
            attributes: ['ordre']
          },
          attributes: { 
            exclude: [] // No need to exclude ordre anymore as it's been removed from the model
          }
        },
        {
          model: Module,
          as: 'modules'
        }
      ]
    });
    
    logger.info(`Nouvelle séance créée: ${newSeance.id} (${titre})`);
    
    res.status(201).json({
      message: 'Séance créée avec succès',
      seance: createdSeance
    });
  } catch (error) {
    logger.error(`Erreur lors de la création de la séance: ${error.message}`);
    res.status(500).json({
      error: 'Erreur serveur',
      message: 'Une erreur est survenue lors de la création de la séance'
    });
  }
};

// Récupérer les séances d'un module
exports.getSeancesByModule = async (req, res) => {
  try {
    const moduleId = req.params.moduleId;
    
    // Vérifier si le module existe
    const module = await Module.findByPk(moduleId);
    
    if (!module) {
      return res.status(404).json({
        error: 'Module non trouvé',
        message: 'Le module demandé n\'existe pas'
      });
    }
    
    // Récupérer les séances associées au module
    const moduleWithSeances = await Module.findByPk(moduleId, {
      include: [
        {
          model: Seance,
          as: 'seances',
          through: {
            attributes: ['positions']
          },
          include: [
            {
              model: Activite,
              as: 'activites',
              through: {
                as: 'seanceActivite',
                attributes: ['ordre']
              },
              attributes: { 
                exclude: [] // No need to exclude ordre anymore as it's been removed from the model
              }
            }
          ]
        }
      ]
    });
    
    // Trier les séances par leur position dans le module
    const seances = moduleWithSeances.seances;
    seances.sort((a, b) => {
      return a.ModuleSeance.positions - b.ModuleSeance.positions;
    });
    
    res.status(200).json({ 
      seances,
      total: seances.length 
    });
  } catch (error) {
    logger.error(`Erreur lors de la récupération des séances par module: ${error.message}`);
    res.status(500).json({
      error: 'Erreur serveur',
      message: 'Une erreur est survenue lors de la récupération des séances'
    });
  }
};

// Mettre à jour une séance (admin seulement)
exports.updateSeance = async (req, res) => {
  try {
    const seanceId = req.params.id;
    const { titre, description, duree, type, contenu, ressources, modules, ordre, statut, active } = req.body;
    
    // Récupérer la séance
    const seance = await Seance.findByPk(seanceId);
    
    if (!seance) {
      return res.status(404).json({
        error: 'Séance non trouvée',
        message: 'La séance demandée n\'existe pas'
      });
    }
    
    // Mettre à jour les informations de la séance
    if (titre) seance.titre = titre;
    if (description !== undefined) seance.description = description;
    if (duree) seance.duree = parseInt(duree);
    if (type) seance.type = type;
    if (contenu !== undefined) seance.contenu = contenu;
    if (ressources !== undefined) seance.ressources = ressources;
    if (active !== undefined) seance.active = active;
    seance.updated_at = new Date();
    
    await seance.save();
    
    // Si des modules sont spécifiés, mettre à jour les associations
    if (modules && Array.isArray(modules) && modules.length > 0) {
      // Vérifier que tous les modules existent
      let validModules = [];
      for (const moduleId of modules) {
        const moduleExists = await Module.findByPk(moduleId);
        if (moduleExists) {
          validModules.push(moduleId);
        } else {
          logger.warn(`Le module avec l'ID ${moduleId} n'existe pas et sera ignoré`);
        }
      }
      
      // Supprimer toutes les associations existantes
      await ModuleSeance.destroy({
        where: {
          seance_id: seanceId
        }
      });
      
      // Créer les nouvelles associations avec les modules valides
      for (let i = 0; i < validModules.length; i++) {
        const moduleId = validModules[i];
        await ModuleSeance.create({
          module_id: moduleId,
          seance_id: seanceId,
          positions: ordre || i // Utiliser l'ordre fourni ou l'index
        });
      }
    } else if (modules && Array.isArray(modules) && modules.length === 0) {
      // Si un tableau vide est fourni, supprimer toutes les associations
      await ModuleSeance.destroy({
        where: {
          seance_id: seanceId
        }
      });
    }
    
    // Si des activités sont spécifiées, mettre à jour les associations
    if (req.body.activites && Array.isArray(req.body.activites)) {
      // Supprimer toutes les associations existantes entre cette séance et les activités
      await sequelize.models.SeanceActivite.destroy({
        where: { seance_id: seanceId }
      });
      
      // Créer les nouvelles associations avec ordre
      for (let i = 0; i < req.body.activites.length; i++) {
        const activiteId = req.body.activites[i];
        
        // Vérifier si l'activité existe
        const activite = await Activite.findByPk(activiteId);
        
        if (activite) {
          // Créer l'association dans la table de jointure avec l'ordre basé sur l'index
          await sequelize.models.SeanceActivite.create({
            seance_id: seanceId,
            activite_id: activiteId,
            ordre: i
          });
        }
      }
    }
    
    // Récupérer la séance mise à jour avec ses modules et activités pour la réponse
    const updatedSeance = await Seance.findByPk(seanceId, {
      include: [
        {
          model: Activite,
          as: 'activites',
          through: {
            as: 'seanceActivite',
            attributes: ['ordre']
          }
        },
        {
          model: Module,
          as: 'modules'
        }
      ]
    });
    
    logger.info(`Séance mise à jour: ${seanceId}`);
    
    res.status(200).json({
      message: 'Séance mise à jour avec succès',
      seance: updatedSeance
    });
  } catch (error) {
    logger.error(`Erreur lors de la mise à jour de la séance: ${error.message}`);
    res.status(500).json({
      error: 'Erreur serveur',
      message: 'Une erreur est survenue lors de la mise à jour de la séance'
    });
  }
};

// Supprimer une séance (admin seulement)
exports.deleteSeance = async (req, res) => {
  try {
    const seanceId = req.params.id;
    
    // Récupérer la séance
    const seance = await Seance.findByPk(seanceId);
    
    if (!seance) {
      return res.status(404).json({
        error: 'Séance non trouvée',
        message: 'La séance demandée n\'existe pas'
      });
    }
    
    // Supprimer la séance
    await seance.destroy();
    
    logger.info(`Séance supprimée: ${seanceId}`);
    
    res.status(200).json({
      message: 'Séance supprimée avec succès'
    });
  } catch (error) {
    logger.error(`Erreur lors de la suppression de la séance: ${error.message}`);
    res.status(500).json({
      error: 'Erreur serveur',
      message: 'Une erreur est survenue lors de la suppression de la séance'
    });
  }
};

// Mettre à jour le suivi d'une séance pour un utilisateur
exports.updateSuivi = async (req, res) => {
  try {
    const seanceId = req.params.id;
    const userId = req.params.userId;
    const { progression, status_id } = req.body;
    
    // Vérifier si l'utilisateur a les droits (admin ou lui-même)
    const isAdmin = req.user.role.role_type === 'admin' || req.user.role.role_type === 'admin_plus';
    const isSelf = req.user.id == userId;
    
    if (!isAdmin && !isSelf) {
      return res.status(403).json({
        error: 'Accès refusé',
        message: 'Vous n\'avez pas les droits pour mettre à jour ce suivi'
      });
    }
    
    // Vérifier si la séance existe
    const seance = await Seance.findByPk(seanceId, {
      include: [{
        model: Module,
        as: 'modules'
      }]
    });
    
    if (!seance) {
      return res.status(404).json({
        error: 'Séance non trouvée',
        message: 'La séance demandée n\'existe pas'
      });
    }
    
    // Vérifier si l'utilisateur existe
    const user = await User.findByPk(userId);
    
    if (!user) {
      return res.status(404).json({
        error: 'Utilisateur non trouvé',
        message: 'L\'utilisateur demandé n\'existe pas'
      });
    }
    
    // Vérifier si le statut existe
    if (status_id) {
      const statusExists = await StatusSuivi.findByPk(status_id);
      
      if (!statusExists) {
        return res.status(400).json({
          error: 'Statut invalide',
          message: 'Le statut spécifié n\'existe pas'
        });
      }
    }
    
    // Mettre à jour ou créer le suivi
    let suivi = await Suivi.findOne({
      where: {
        seance_id: seanceId,
        user_id: userId
      }
    });
    
    if (suivi) {
      // Mettre à jour le suivi existant
      if (progression !== undefined) suivi.progression = progression;
      if (status_id) suivi.status_id = status_id;
      suivi.update_suivi = new Date();
      
      await suivi.save();
    } else {
      // Créer un nouveau suivi
      suivi = await Suivi.create({
        seance_id: seanceId,
        user_id: userId,
        status_id: status_id || 1, // Statut par défaut (à adapter selon vos statuts)
        progression: progression || 0,
        update_suivi: new Date()
      });
    }
    
    // Récupérer le suivi mis à jour avec son statut pour la réponse
    const updatedSuivi = await Suivi.findOne({
      where: {
        seance_id: seanceId,
        user_id: userId
      },
      include: [{
        model: StatusSuivi,
        as: 'status'
      }]
    });
    
    // Si la séance fait partie d'un module et que le statut est TERMINE, mettre à jour la progression du module
    if (seance.modules && seance.modules.length > 0 && updatedSuivi.status && updatedSuivi.status.type_status === 'TERMINE') {
      // Pour chaque module contenant cette séance, mettre à jour la progression
      for (const module of seance.modules) {
        try {
          // Utiliser le helper pour calculer et mettre à jour la progression du module
          const suiviModule = await moduleProgressionHelper.updateModuleProgression(userId, module.id);
          
          if (suiviModule && suiviModule.status && suiviModule.status.type_status === 'TERMINE') {
            logger.info(`Module ${module.id} marqué comme TERMINE pour l'utilisateur ${userId}`);
            
            // Envoyer une notification via Socket.IO
            try {
              socketIO.notifyUser(userId, 'module-completed', {
                moduleId: module.id,
                titre: module.titre || 'Module',
                message: `Félicitations ! Vous avez terminé le module "${module.titre || 'Module'}"`
              });
              
              // Également notifier les clients pour mettre à jour l'interface
              socketIO.notifyUser(userId, 'refresh-modules', {
                message: "Votre progression a été mise à jour",
                moduleId: module.id
              });
              
              // Notifier tous les clients connectés (pour la mise à jour des tableaux de bord)
              socketIO.getIO().emit('user-progress-update', {
                userId: userId,
                moduleId: module.id,
                message: `Un utilisateur a terminé le module "${module.titre || 'Module'}"`
              });
            } catch (socketError) {
              logger.error(`Erreur lors de l'envoi de la notification Socket.IO: ${socketError.message}`);
            }
          }
        } catch (moduleError) {
          logger.error(`Erreur lors de la mise à jour de la progression du module ${module.id}: ${moduleError.message}`);
        }
      }
    }
    
    logger.info(`Suivi mis à jour pour la séance ${seanceId} et l'utilisateur ${userId}`);
    
    res.status(200).json({
      message: 'Suivi mis à jour avec succès',
      suivi: updatedSuivi
    });
  } catch (error) {
    logger.error(`Erreur lors de la mise à jour du suivi: ${error.message}`);
    res.status(500).json({
      error: 'Erreur serveur',
      message: 'Une erreur est survenue lors de la mise à jour du suivi'
    });
  }
};

// S'inscrire à une séance
exports.inscrireSeance = async (req, res) => {
  try {
    const seanceId = req.params.id;
    const userId = req.user.id;
      // Vérifier si la séance existe
    const seance = await Seance.findByPk(seanceId, {
      include: [{
        model: Activite,
        as: 'activites'
      }]
    });
    
    if (!seance) {
      return res.status(404).json({
        error: 'Séance non trouvée',
        message: 'La séance demandée n\'existe pas'
      });
    }
    
    // Vérifier si l'utilisateur est déjà inscrit
    const existingSuivi = await Suivi.findOne({
      where: {
        seance_id: seanceId,
        user_id: userId
      }
    });
    
    if (existingSuivi) {
      return res.status(400).json({
        error: 'Déjà inscrit',
        message: 'Vous êtes déjà inscrit à cette séance'
      });
    }
    
    // Récupérer le statut par défaut (à adapter selon vos statuts)
    const defaultStatus = await StatusSuivi.findOne({
      where: { type_status: 'inscrit' }
    });
    
    if (!defaultStatus) {
      return res.status(500).json({
        error: 'Erreur de configuration',
        message: 'Impossible de trouver le statut par défaut'
      });
    }
    
    // Créer un nouveau suivi
    const suivi = await Suivi.create({
      seance_id: seanceId,
      user_id: userId,
      status_id: defaultStatus.id,
      progression: 0,
      update_suivi: new Date()
    });
    
    // Notification via Socket.IO
    try {
      socketIO.notifyUser(userId, 'inscription-seance', {
        seanceId: seanceId,
        titre: seance.titre,
        message: `Vous êtes inscrit à la séance: ${seance.titre}`
      });
    } catch (socketError) {
      logger.error(`Erreur lors de l'envoi de la notification Socket.IO: ${socketError.message}`);
    }
    
    logger.info(`Utilisateur ${userId} inscrit à la séance ${seanceId}`);
    
    res.status(200).json({
      message: 'Inscription réussie',
      suivi: {
        id: suivi.id,
        seance_id: seanceId,
        user_id: userId,
        status_id: defaultStatus.id,
        progression: 0,
        update_suivi: suivi.update_suivi
      },
      seance: {
        id: seance.id,
        titre: seance.titre,
        description: seance.description,
        activitesCount: seance.activites.length
      }
    });
  } catch (error) {
    logger.error(`Erreur lors de l'inscription à la séance: ${error.message}`);
    res.status(500).json({
      error: 'Erreur serveur',
      message: 'Une erreur est survenue lors de l\'inscription à la séance'
    });
  }
};

// Se désinscrire d'une séance
exports.desinscrireSeance = async (req, res) => {
  try {
    const seanceId = req.params.id;
    const userId = req.user.id;
    
    // Vérifier si l'inscription existe
    const suivi = await Suivi.findOne({
      where: {
        seance_id: seanceId,
        user_id: userId
      }
    });
    
    if (!suivi) {
      return res.status(404).json({
        error: 'Inscription non trouvée',
        message: 'Vous n\'êtes pas inscrit à cette séance'
      });
    }
    
    // Récupérer les informations de la séance pour la notification
    const seance = await Seance.findByPk(seanceId);
    
    // Supprimer l'inscription
    await suivi.destroy();
    
    // Notification via Socket.IO
    try {
      socketIO.notifyUser(userId, 'desinscription-seance', {
        seanceId: seanceId,
        titre: seance ? seance.titre : 'Séance inconnue',
        message: `Vous vous êtes désinscrit de la séance: ${seance ? seance.titre : 'Séance inconnue'}`
      });
    } catch (socketError) {
      logger.error(`Erreur lors de l'envoi de la notification Socket.IO: ${socketError.message}`);
    }
    
    logger.info(`Utilisateur ${userId} désinscrit de la séance ${seanceId}`);
    
    res.status(200).json({
      message: 'Désinscription réussie'
    });
  } catch (error) {
    logger.error(`Erreur lors de la désinscription de la séance: ${error.message}`);
    res.status(500).json({
      error: 'Erreur serveur',
      message: 'Une erreur est survenue lors de la désinscription de la séance'
    });
  }
};