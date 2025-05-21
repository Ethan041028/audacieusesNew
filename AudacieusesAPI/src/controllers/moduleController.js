const { Module, Seance, User, Suivi, StatusSuivi, sequelize } = require('../models');
const logger = require('../utils/logger');
const socketIO = require('../config/socketio'); // Ajout de l'importation Socket.IO
const { validationResult } = require('express-validator');
const { Op } = require('sequelize');

// Récupérer tous les modules
exports.getAllModules = async (req, res) => {
  try {
    // Extraire les paramètres de la requête
    const {
      page = 1,
      limit = 10,
      search = '',
      statut = '',  // Renommé 'status' en 'statut' pour correspondre au nom dans la BDD
      sortBy = 'date_creation',
      sortOrder = 'desc',
      debug = false, // Paramètre debug pour plus d'informations
      noFilter = false // Paramètre pour ignorer les filtres et renvoyer tous les modules
    } = req.query;

    logger.info(`===== DÉTAIL DE LA REQUÊTE MODULES =====`);
    logger.info(`- URL complète: ${req.protocol}://${req.get('host')}${req.originalUrl}`);
    logger.info(`- Méthode: ${req.method}`);
    logger.info(`- Paramètres de requête: ${JSON.stringify(req.query)}`);
    logger.info(`- Paramètre statut reçu: "${statut}"`);
    
    // Déboguer les informations de l'utilisateur
    logger.info(`===== INFORMATIONS UTILISATEUR =====`);
    if (req.user) {
      logger.info(`- ID Utilisateur: ${req.user.id}`);
      logger.info(`- Email: ${req.user.mail}`);
      logger.info(`- Rôle ID: ${req.user.role?.id}`);
      logger.info(`- Rôle nom: ${req.user.role?.nom}`);
      logger.info(`- Rôle type: ${req.user.role?.role_type}`);
      logger.info(`- L'utilisateur est-il admin? ${(req.user.role?.nom === 'admin' || req.user.role?.nom === 'admin_plus') ? 'Oui' : 'Non'}`);
      
      // Dump complet de l'objet utilisateur
      logger.important(`Dump complet de l'objet utilisateur: ${JSON.stringify(req.user)}`);
    } else {
      logger.warn(`- Aucun utilisateur trouvé dans la requête`);
    }
    
    // Récupérer tous les modules sans filtre pour vérification
    const allModules = await Module.findAll();
    logger.info(`- VÉRIFICATION: Nombre total de modules sans filtre: ${allModules.length}`);
    allModules.forEach((m, i) => {
      logger.info(`  Module ${i+1}: ID=${m.id}, Titre=${m.titre}, Statut=${m.statut}`);
    });

    // Construire les options de requête
    const offset = (page - 1) * limit;
    const where = {};
    const order = [[sortBy, sortOrder]];
    
    // Ajouter des filtres de recherche si nécessaire
    if (search && search.trim() !== '') {
      where[Op.or] = [
        { titre: { [Op.like]: `%${search}%` } },
        { description: { [Op.like]: `%${search}%` } }
      ];
    }
    
    // Ajouter le filtre de statut si spécifié
    if (statut && statut.trim() !== '') {
      logger.info(`- Application du filtre de statut: "${statut}"`);
      where.statut = statut; // Utiliser 'statut' au lieu de 'status'
    }
    
    logger.info(`- Conditions WHERE construites: ${JSON.stringify(where)}`);
    
    // Log des options de tri
    logger.info(`- Options de tri: ${sortBy} ${sortOrder}`);
    
    let modules = [];
    let count = 0;
    
    try {
      // Vérifier le rôle de l'utilisateur
      const userRole = req.user && req.user.role ? req.user.role.nom : null;
      const isAdmin = userRole === 'admin' || userRole === 'admin_plus';
      
      logger.info(`- Utilisateur role: ${userRole}, Admin: ${isAdmin ? 'Oui' : 'Non'}`);
      
      if (!isAdmin) {
        // Pour les utilisateurs non-admin, montrer seulement les modules qui leur sont assignés
        // ET qui sont publiés
        const userWhere = {
          [Op.and]: [
            { statut: 'publié' },
            { '$users.id$': req.user.id }
          ]
        };
        
        // Ajouter les autres filtres
        Object.keys(where).forEach(key => {
          if (key !== Op.or) {
            userWhere[key] = where[key];
          } else {
            // Si nous avons déjà une condition OR, la combiner avec la nouvelle
            userWhere[Op.or] = [...userWhere[Op.or], ...where[Op.or]];
          }
        });
        
        logger.info(`- Conditions WHERE pour utilisateur non-admin: ${JSON.stringify(userWhere)}`);
        
        // Requête pour compter le nombre total de modules pour cet utilisateur
        const { count: totalCount } = await Module.findAndCountAll({
          where: userWhere,
          include: [{
            model: User,
            as: 'users',
            attributes: [],
            through: { attributes: [] }
          }],
          distinct: true,
          subQuery: false
        });
        
        count = totalCount;
        
        // Requête pour récupérer les modules paginés pour cet utilisateur
        modules = await Module.findAll({
          where: userWhere,
          order,
          limit: parseInt(limit),
          offset,
          include: [
            {
              model: User,
              as: 'users',
              through: { attributes: [] }
            },
            {
              model: Seance,
              as: 'seances',
              through: {
                attributes: ['positions']
              }
            }
          ],
          distinct: true,
          subQuery: false
        });
        
        logger.info(`- Modules trouvés pour l'utilisateur non-admin: ${modules.length}`);
      } else {
        // Pour les administrateurs, récupérer tous les modules selon les filtres
        
        // Requête pour compter le nombre total de modules
        const { count: totalCount } = await Module.findAndCountAll({
          where,
          distinct: true
        });
        
        count = totalCount;
        
        // Requête pour récupérer les modules paginés
        modules = await Module.findAll({
          where,
          order,
          limit: parseInt(limit),
          offset,
          include: [
            {
              model: User,
              as: 'users',
              through: { attributes: [] }
            },
            {
              model: Seance,
              as: 'seances',
              through: {
                attributes: ['positions']
              }
            }
          ],
          distinct: true,
          subQuery: false
        });
        
        logger.info(`- Modules trouvés pour l'administrateur: ${modules.length}`);
      }
      
      // Log détaillé des modules trouvés
      if (modules.length > 0) {
        logger.info(`- Détail des modules trouvés:`);
        modules.forEach((module, index) => {
          logger.info(`  Module ${index + 1}: ID=${module.id}, Titre="${module.titre}", Statut=${module.statut}, Séances=${module.seances?.length || 0}, Clients=${module.users?.length || 0}`);
        });
      } else {
        logger.warn(`- Aucun module trouvé après application des filtres`);
      }
    } catch (error) {
      logger.error(`- ERREUR lors de l'exécution de la requête: ${error.message}`);
      logger.error(error.stack);
      throw error;
    }
    
    // Calculer les informations de pagination
    const totalPages = Math.ceil(count / limit);
    const currentPage = parseInt(page);
    const hasNextPage = currentPage < totalPages;
    const hasPrevPage = currentPage > 1;
    
    // Renvoyer les résultats
    res.status(200).json({
      modules,
      pagination: {
        totalItems: count,
        totalPages,
        currentPage,
        hasNextPage,
        hasPrevPage,
        pageSize: parseInt(limit)
      }
    });
  } catch (error) {
    logger.error(`Erreur lors de la récupération des modules: ${error.message}`);
    logger.error(`Stack trace: ${error.stack}`);
    res.status(500).json({
      error: 'Erreur serveur',
      message: 'Une erreur est survenue lors de la récupération des modules'
    });
  }
};

// Récupérer un module par son ID
exports.getModuleById = async (req, res) => {
  try {
    const moduleId = req.params.id;
    
    logger.info(`[getModuleById] Récupération du module ${moduleId} par l'utilisateur ${req.user.id} (rôle: ${req.user.role?.nom})`);
    logger.info(`[getModuleById] Informations utilisateur complètes: ${JSON.stringify(req.user)}`);
    
    // Récupérer le module avec ses séances
    const module = await Module.findByPk(moduleId, {
      include: [{
        model: Seance,
        as: 'seances',
        through: {
          attributes: ['positions'],
        }
      }]
    });
    
    if (!module) {
      logger.warn(`[getModuleById] Module ${moduleId} non trouvé`);
      return res.status(404).json({
        error: 'Module non trouvé',
        message: 'Le module demandé n\'existe pas'
      });
    }
    
    // Vérifier plus précisément le rôle de l'utilisateur
    const userRoleName = req.user && req.user.role ? req.user.role.nom : null;
    
    // Liste des noms de rôles considérés comme administrateurs
    const adminRoleNames = ['admin', 'administrateur', 'admin_plus', 'adminplus', 'super_admin'];
    
    const isAdmin = adminRoleNames.includes(userRoleName);
    
    logger.info(`[getModuleById] Rôle utilisateur: nom=${userRoleName}, Est admin: ${isAdmin}`);
    
    if (isAdmin) {
      // Les administrateurs ont accès à tous les modules
      logger.info(`[getModuleById] Accès accordé au module ${moduleId} pour l'administrateur ${req.user.id}`);
      return res.status(200).json({ module });
    }
    
    // Pour les non-admins, vérifier si le module est attribué à l'utilisateur
    const userModule = await User.findOne({
      where: { id: req.user.id },
      include: [{
        model: Module,
        as: 'modules',
        where: { id: moduleId }
      }]
    });
    
    if (!userModule) {
      logger.warn(`[getModuleById] Accès refusé au module ${moduleId} pour l'utilisateur ${req.user.id} (rôle: ${userRoleName})`);
      return res.status(403).json({
        error: 'Accès refusé',
        message: 'Vous n\'avez pas accès à ce module'
      });
    }
    
    // Pour les clients, ajouter la progression dans la réponse
    if (req.user.role.nom === 'client') {
      // Récupérer les séances de ce module
      const seancesModule = module.seances || [];
      const moduleSeanceIds = seancesModule.map(s => s.id);
      
      logger.info(`[getModuleById] Module ${moduleId}: Séances associées: ${moduleSeanceIds.join(', ')}`);
      
      // Récupérer uniquement les suivis pour les séances de ce module spécifique
      const suivis = await Suivi.findAll({
        where: { 
          user_id: req.user.id,
          seance_id: { [Op.in]: moduleSeanceIds }
        },
        include: [{
          model: StatusSuivi,
          as: 'status'
        }]
      });
      
      logger.info(`[getModuleById] Suivis trouvés pour le module ${moduleId}: ${suivis.length}`);
      
      // Calculer la progression globale du module
      const seanceCount = moduleSeanceIds.length;
      const completedCount = suivis.filter(suivi => {
        // Vérifier si le suivi a un statut
        if (!suivi.status) return false;
        
        // Convertir en majuscules pour éviter les problèmes de casse
        const statusType = suivi.status.type_status ? suivi.status.type_status.toUpperCase() : '';
        // Vérifier uniquement la valeur exacte "TERMINE"
        return statusType === 'TERMINE';
      }).length;
      
      // S'assurer que la progression ne dépasse pas 100%
      const progressionRaw = seanceCount > 0 ? (completedCount / seanceCount) * 100 : 0;
      const progression = Math.min(progressionRaw, 100); // Limite à 100%
      
      // Ajouter l'ordre aux séances et formater les suivis
      const seancesWithOrder = module.seances.map(seance => {
        // Ajouter l'ordre basé sur la position
        const ordre = seance.ModuleSeance ? seance.ModuleSeance.positions : 0;
        
        // Trouver le suivi correspondant à cette séance
        const seanceSuivi = suivis.find(s => s.seance_id === seance.id);
        
        // Créer un objet suivi formaté pour le frontend si un suivi existe
        let suiviObj = null;
        if (seanceSuivi) {
          suiviObj = {
            id: seanceSuivi.id,
            progression: seanceSuivi.progression,
            // Transformer le type_status de la BD en format attendu par le frontend
            statut: seanceSuivi.status ? seanceSuivi.status.type_status : 'NON_COMMENCE',
            commentaire: seanceSuivi.commentaire
          };
        }
        
        return {
          ...seance.toJSON(),
          ordre: ordre + 1, // Pour s'assurer que l'ordre commence à 1
          suivi: suiviObj
        };
      }).sort((a, b) => a.ordre - b.ordre); // Trier par ordre
      
      // Remplacer les séances dans le module
      const moduleWithOrderedSeances = {
        ...module.toJSON(),
        seances: seancesWithOrder
      };
      
      // Ajouter les informations de progression à la réponse
      logger.info(`[getModuleById] Progression du client ${req.user.id} sur le module ${moduleId}: ${progression.toFixed(2)}%`);
      return res.status(200).json({
        module: moduleWithOrderedSeances,
        progression: {
          percentage: progression,
          completed: completedCount,
          total: seanceCount
        }
      });
    }
    
    logger.info(`[getModuleById] Réponse standard pour l'utilisateur ${req.user.id}`);
    res.status(200).json({ module });
  } catch (error) {
    logger.error(`[getModuleById] Erreur lors de la récupération du module: ${error.message}`);
    logger.error(error.stack);
    res.status(500).json({
      error: 'Erreur serveur',
      message: 'Une erreur est survenue lors de la récupération du module'
    });
  }
};

// Créer un nouveau module (admin seulement)
exports.createModule = async (req, res) => {
  try {
    // Validation des données
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    
    const { titre, description, niveau, duree, objectifs, statut, seances } = req.body;
    const image_url = req.body.image_url; // Défini par le middleware uploadMiddleware si une image a été téléchargée
    
    logger.info(`Création d'un module: titre=${titre}, niveau=${niveau}, duree=${duree}, image_url=${image_url}`);
    logger.debug(`Objectifs reçus: ${typeof objectifs === 'string' ? objectifs : JSON.stringify(objectifs)}`);
    
    // Créer le nouveau module
    const newModule = await Module.create({
      titre,
      description,
      niveau: niveau || 'Débutant',
      duree: duree || 1,
      image_url,
      objectifs: objectifs ? (typeof objectifs === 'string' ? objectifs : JSON.stringify(objectifs)) : null,
      statut: statut || 'brouillon',
      date_creation: new Date(),
      updated_at: new Date(),
      created_by: req.user.id // Ajouter l'ID de l'utilisateur qui crée le module
    });
    
    // Si des séances sont spécifiées, les associer au module
    if (seances && Array.isArray(seances)) {
      for (let i = 0; i < seances.length; i++) {
        const seanceId = seances[i];
        
        // Vérifier si la séance existe
        const seance = await Seance.findByPk(seanceId);
        
        if (seance) {
          // Associer la séance au module avec sa position
          await newModule.addSeance(seance, {
            through: { positions: i + 1 } // Position basée sur l'ordre dans le tableau
          });
        }
      }
    }
    
    // Récupérer le module créé avec ses séances pour la réponse
    const createdModule = await Module.findByPk(newModule.id, {
      include: [{
        model: Seance,
        as: 'seances',
        through: {
          attributes: ['positions'],
        }
      }]
    });
    
    // Notification en temps réel via Socket.IO
    try {
      const io = socketIO.getIO();
      // Envoyer à tous les clients connectés
      io.emit('module-created', {
        module: {
          id: createdModule.id,
          titre: createdModule.titre,
          description: createdModule.description,
          seances: createdModule.seances.length
        },
        message: `Le module "${createdModule.titre}" vient d'être créé`
      });
      
      logger.info(`Notification Socket.IO envoyée: nouveau module créé (${createdModule.id})`);
    } catch (socketError) {
      logger.error(`Erreur lors de l'envoi de la notification Socket.IO: ${socketError.message}`);
      // Ne pas échouer la requête si la notification Socket.IO échoue
    }
    
    logger.info(`Nouveau module créé: ${newModule.id} (${titre})`);
    
    res.status(201).json({
      message: 'Module créé avec succès',
      module: createdModule
    });
  } catch (error) {
    logger.error(`Erreur lors de la création du module: ${error.message}`);
    res.status(500).json({
      error: 'Erreur serveur',
      message: 'Une erreur est survenue lors de la création du module'
    });
  }
};

// Mettre à jour un module (admin seulement)
exports.updateModule = async (req, res) => {
  try {
    // Validation des données
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    
    const moduleId = req.params.id;
    const { titre, description, niveau, duree, objectifs, statut, seances } = req.body;
    const image_url = req.body.image_url; // Défini par le middleware uploadMiddleware si une image a été téléchargée
    
    // Récupérer le module
    const module = await Module.findByPk(moduleId);
    
    if (!module) {
      return res.status(404).json({
        error: 'Module non trouvé',
        message: 'Le module demandé n\'existe pas'
      });
    }
    
    // Mettre à jour les informations du module
    if (titre) module.titre = titre;
    if (description !== undefined) module.description = description;
    if (niveau) module.niveau = niveau;
    if (duree !== undefined) module.duree = duree;
    if (image_url) module.image_url = image_url;
    if (objectifs) {
      module.objectifs = typeof objectifs === 'string' ? objectifs : JSON.stringify(objectifs);
    }
    if (statut) module.statut = statut;
    
    // Utiliser updated_at au lieu de date_update pour garantir la compatibilité
    module.updated_at = new Date();
    
    await module.save();
    
    // Si des séances sont spécifiées, mettre à jour les associations
    if (seances && Array.isArray(seances)) {
      // Supprimer les associations existantes
      await module.setSeances([]);
      
      // Créer les nouvelles associations
      for (let i = 0; i < seances.length; i++) {
        const seanceId = seances[i];
        
        // Vérifier si la séance existe
        const seance = await Seance.findByPk(seanceId);
        
        if (seance) {
          // Associer la séance au module avec sa position
          await module.addSeance(seance, {
            through: { positions: i + 1 } // Position basée sur l'ordre dans le tableau
          });
        }
      }
    }
    
    // Récupérer le module mis à jour avec ses séances pour la réponse
    const updatedModule = await Module.findByPk(moduleId, {
      include: [{
        model: Seance,
        as: 'seances',
        through: {
          attributes: ['positions'],
        }
      }]
    });
    
    // Notification en temps réel via Socket.IO
    try {
      const io = socketIO.getIO();
      
      // Notifier tous les utilisateurs dans la salle du module
      io.to(`module-${moduleId}`).emit('module-updated', {
        module: {
          id: updatedModule.id,
          titre: updatedModule.titre,
          description: updatedModule.description,
          seances: updatedModule.seances.length
        },
        message: `Le module "${updatedModule.titre}" a été mis à jour`
      });
      
      // Notifier tous les administrateurs
      io.emit('admin-notification', {
        type: 'module-update',
        module: {
          id: updatedModule.id,
          titre: updatedModule.titre
        },
        message: `Le module "${updatedModule.titre}" a été mis à jour`
      });
      
      logger.info(`Notification Socket.IO envoyée: module mis à jour (${moduleId})`);
    } catch (socketError) {
      logger.error(`Erreur lors de l'envoi de la notification Socket.IO: ${socketError.message}`);
      // Ne pas échouer la requête si la notification Socket.IO échoue
    }
    
    logger.info(`Module mis à jour: ${moduleId}`);
    
    res.status(200).json({
      message: 'Module mis à jour avec succès',
      module: updatedModule
    });
  } catch (error) {
    logger.error(`Erreur lors de la mise à jour du module: ${error.message}`);
    res.status(500).json({
      error: 'Erreur serveur',
      message: 'Une erreur est survenue lors de la mise à jour du module'
    });
  }
};

// Supprimer un module (admin seulement)
exports.deleteModule = async (req, res) => {
  try {
    const moduleId = req.params.id;
    
    // Récupérer le module
    const module = await Module.findByPk(moduleId);
    
    if (!module) {
      return res.status(404).json({
        error: 'Module non trouvé',
        message: 'Le module demandé n\'existe pas'
      });
    }
    
    const moduleInfo = {
      id: module.id,
      titre: module.titre
    };
    
    // Supprimer le module (les associations seront supprimées automatiquement grâce aux contraintes de clé étrangère)
    await module.destroy();
    
    // Notification en temps réel via Socket.IO
    try {
      const io = socketIO.getIO();
      
      // Notifier tous les administrateurs
      io.emit('admin-notification', {
        type: 'module-deleted',
        module: moduleInfo,
        message: `Le module "${moduleInfo.titre}" a été supprimé`
      });
      
      logger.info(`Notification Socket.IO envoyée: module supprimé (${moduleId})`);
    } catch (socketError) {
      logger.error(`Erreur lors de l'envoi de la notification Socket.IO: ${socketError.message}`);
      // Ne pas échouer la requête si la notification Socket.IO échoue
    }
    
    logger.info(`Module supprimé: ${moduleId}`);
    
    res.status(200).json({
      message: 'Module supprimé avec succès'
    });
  } catch (error) {
    logger.error(`Erreur lors de la suppression du module: ${error.message}`);
    res.status(500).json({
      error: 'Erreur serveur',
      message: 'Une erreur est survenue lors de la suppression du module'
    });
  }
};

// Attribuer un module à un utilisateur
exports.assignModuleToUser = async (req, res) => {
  try {
    const moduleId = req.params.moduleId;
    const userId = req.params.userId;
    
    logger.info(`[assignModuleToUser] Attribution du module ${moduleId} à l'utilisateur ${userId}`);
    
    // Vérifier si le module existe
    const module = await Module.findByPk(moduleId);
    if (!module) {
      return res.status(404).json({
        error: 'Module non trouvé',
        message: 'Le module demandé n\'existe pas'
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
    
    // Vérifier si l'utilisateur est déjà associé au module
    const moduleUsers = await module.getUsers({ where: { id: userId } });
    if (moduleUsers.length > 0) {
      return res.status(400).json({
        error: 'Association existante',
        message: 'L\'utilisateur est déjà associé à ce module'
      });
    }
    
    // Ajouter l'utilisateur au module
    await module.addUser(user);
    
    // Notification en temps réel via Socket.IO (si implémenté)
    try {
      const io = socketIO.getIO();
      
      // Notifier l'utilisateur concerné
      io.to(`user-${userId}`).emit('module-assigned', {
        module: {
          id: module.id,
          titre: module.titre,
          description: module.description
        },
        message: `Le module "${module.titre}" vous a été attribué`
      });
      
      logger.info(`Notification Socket.IO envoyée: module ${moduleId} assigné à l'utilisateur ${userId}`);
    } catch (socketError) {
      logger.error(`Erreur lors de l'envoi de la notification Socket.IO: ${socketError.message}`);
      // Ne pas échouer la requête si la notification Socket.IO échoue
    }
    
    logger.info(`[assignModuleToUser] Module ${moduleId} attribué à l'utilisateur ${userId} avec succès`);
    
    res.status(200).json({
      message: 'Module attribué à l\'utilisateur avec succès'
    });
  } catch (error) {
    logger.error(`[assignModuleToUser] Erreur: ${error.message}`);
    res.status(500).json({
      error: 'Erreur serveur',
      message: `Une erreur est survenue lors de l'attribution du module à l'utilisateur: ${error.message}`
    });
  }
};

// Retirer un module à un utilisateur
exports.removeModuleFromUser = async (req, res) => {
  try {
    const moduleId = req.params.moduleId;
    const userId = req.params.userId;
    
    logger.info(`[removeModuleFromUser] Retrait du module ${moduleId} de l'utilisateur ${userId}`);
    
    // Vérifier si le module existe
    const module = await Module.findByPk(moduleId);
    if (!module) {
      return res.status(404).json({
        error: 'Module non trouvé',
        message: 'Le module demandé n\'existe pas'
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
    
    // Vérifier si l'utilisateur est associé au module
    const moduleUsers = await module.getUsers({ where: { id: userId } });
    if (moduleUsers.length === 0) {
      return res.status(400).json({
        error: 'Association inexistante',
        message: 'L\'utilisateur n\'est pas associé à ce module'
      });
    }
    
    // Retirer l'utilisateur du module
    await module.removeUser(user);
    
    logger.info(`[removeModuleFromUser] Module ${moduleId} retiré de l'utilisateur ${userId} avec succès`);
    
    res.status(200).json({
      message: 'Module retiré de l\'utilisateur avec succès'
    });
  } catch (error) {
    logger.error(`[removeModuleFromUser] Erreur: ${error.message}`);
    res.status(500).json({
      error: 'Erreur serveur',
      message: `Une erreur est survenue lors du retrait du module de l'utilisateur: ${error.message}`
    });
  }
};

// Récupérer les modules d'un utilisateur spécifique
exports.getUserModules = async (req, res) => {
  try {
    const userId = req.params.userId;
    logger.info(`Récupération des modules pour l'utilisateur ID: ${userId}`);
    
    // Vérifier si l'utilisateur a les droits (admin ou lui-même)
    const isAdmin = req.user && req.user.role && 
                   (req.user.role.nom === 'admin' || req.user.role.nom === 'admin_plus');
    const isSelf = req.user && req.user.id == userId;
    
    logger.info(`Demande effectuée par: ID ${req.user?.id}, rôle: ${req.user?.role?.nom}, isAdmin: ${isAdmin}, isSelf: ${isSelf}`);
    
    if (!isAdmin && !isSelf) {
      logger.warn(`Accès refusé: l'utilisateur ${req.user?.id} n'a pas les droits pour accéder aux modules de l'utilisateur ${userId}`);
      return res.status(403).json({
        error: 'Accès refusé',
        message: 'Vous n\'avez pas les droits pour accéder à ces modules'
      });
    }
    
    // Vérifier si l'utilisateur existe
    const user = await User.findByPk(userId, {
      include: [{
        model: sequelize.models.SuiviModule,
        as: 'suiviModules',
        include: [{
          model: sequelize.models.StatusSuivi,
          as: 'status'
        }]
      }]
    });
    
    if (!user) {
      logger.warn(`Utilisateur non trouvé: ${userId}`);
      return res.status(404).json({
        error: 'Utilisateur non trouvé',
        message: 'L\'utilisateur demandé n\'existe pas'
      });
    }
    
    // Récupérer tous les modules
    let allModules = await Module.findAll({
      include: [{
        model: Seance,
        as: 'seances',
        through: {
          attributes: ['positions'],
        }
      }]
    });
     // Récupérer les modules assignés à l'utilisateur
    const userWithModules = await User.findByPk(userId, {
      include: [{
        model: Module,
        as: 'modules',
        attributes: ['id']
      }]
    });
    
    // Créer un ensemble des IDs de modules assignés à l'utilisateur
    const assignedModuleIds = new Set(userWithModules.modules.map(module => module.id));
    
    logger.info(`Modules assignés à l'utilisateur ${userId}: ${Array.from(assignedModuleIds).join(', ')}`);
    
    // Vérifier si c'est un client ou un administrateur qui consulte
    const isClientUser = req.user.role.nom === 'client' || (user.role && user.role.nom === 'client');
    
    // Filtrer les modules pour n'inclure que ceux assignés à l'utilisateur
    // Si l'utilisateur est un client, ne montrer que les modules publiés
    allModules = allModules.filter(module => {
      const isAssigned = assignedModuleIds.has(module.id);
      const isPublished = module.statut === 'publié';
      
      // Pour les clients, on filtre les modules publiés ET assignés
      // Pour les administrateurs, on montre tous les modules assignés indépendamment du statut
      return isAssigned && (isClientUser ? isPublished : true);
    });
    
    logger.info(`Modules filtrés (assignés) pour l'utilisateur ${userId}: ${allModules.map(m => m.id).join(', ')}`);
    
    const moduleProgressMap = {};
    
    // Créer un map des progressions de modules existantes
    if (user.suiviModules && user.suiviModules.length > 0) {
      user.suiviModules.forEach(suivi => {
        logger.info(`Module ${suivi.module_id} - Données de suivi_module: progression=${suivi.progression}, status_id=${suivi.status_id}, status=${suivi.status?.type_status}`);
        moduleProgressMap[suivi.module_id] = {
          percentage: parseFloat(suivi.progression),
          status: suivi.status ? suivi.status.type_status : 'NON_COMMENCE',
          status_id: suivi.status_id,
          date_completion: suivi.date_completion,
          date_mise_a_jour: suivi.date_mise_a_jour
        };
      });
    }
    
    // Pour chaque module qui n'a pas encore de suivi, calculer sa progression
    const modulesWithProgress = await Promise.all(allModules.map(async (module) => {
      // Vérifier si une progression existe déjà
      if (moduleProgressMap[module.id]) {
        // Utiliser la progression existante dans la table suivi_module
        const progression = moduleProgressMap[module.id];
        
        logger.info(`Module ${module.id} - Progression existante trouvée: ${progression.percentage}%, Statut: ${progression.status}`);
        
        return {
          ...module.toJSON(),
          progression: {
            percentage: progression.percentage,
            status: progression.status,
            completed: Math.round((progression.percentage / 100) * (module.seances?.length || 0)),
            total: module.seances?.length || 0,
            date_completion: progression.date_completion,
            date_mise_a_jour: progression.date_mise_a_jour
          }
        };
      } else {
        // Si aucun suivi n'existe, utiliser la méthode de calcul existante
        const seancesModule = module.seances || [];
        const moduleSeanceIds = seancesModule.map(s => s.id);
        
        logger.info(`Module ${module.id} sans suivi - Calcul de progression basé sur les séances: ${moduleSeanceIds.join(', ')}`);
        
        // Récupérer uniquement les suivis pour les séances de ce module spécifique
        const suivis = await sequelize.models.Suivi.findAll({
          where: { 
            user_id: userId,
            seance_id: { [Op.in]: moduleSeanceIds }
          },
        include: [{
            model: sequelize.models.StatusSuivi,
          as: 'status'
        }]
      });
        
        // Calculer le nombre d'activités spécifiques à ce module
        const seanceCount = moduleSeanceIds.length;
        
        // Compter les séances terminées
        const completedCount = suivis.filter(suivi => 
          suivi.status && suivi.status.type_status === 'TERMINE'
        ).length;
        
        // Calculer la progression
        const progressionPercentage = seanceCount > 0 ? Math.min((completedCount / seanceCount) * 100, 100) : 0;
        
        // Déterminer le statut
        let status = 'NON_COMMENCE';
        let status_id = 1;
        
        if (progressionPercentage === 100) {
          status = 'TERMINE';
          status_id = 3;
        } else if (progressionPercentage > 0) {
          status = 'EN_COURS';
          status_id = 2;
        }
        
        logger.info(`Module ${module.id} - Progression calculée: ${progressionPercentage}%, Statut: ${status}`);
        
        // Créer un suivi de module si nécessaire
        if (progressionPercentage > 0) {
          try {
            await sequelize.models.SuiviModule.create({
              user_id: userId,
              module_id: module.id,
              progression: progressionPercentage,
              status_id: status_id,
              date_mise_a_jour: new Date(),
              date_completion: status === 'TERMINE' ? new Date() : null
            });
            
            logger.info(`Nouveau suivi de module créé pour le module ${module.id}, utilisateur ${userId}`);
          } catch (error) {
            logger.error(`Erreur lors de la création du suivi de module: ${error.message}`);
          }
        }
      
      return {
        ...module.toJSON(),
        progression: {
            percentage: progressionPercentage,
            status: status,
          completed: completedCount,
          total: seanceCount
        }
      };
      }
    }));
    
    // Log détaillé des modules trouvés
    if (modulesWithProgress.length > 0) {
      modulesWithProgress.forEach((module, index) => {
        logger.info(`Module ${index + 1}: ID=${module.id}, Titre="${module.titre}", Statut=${module.statut}, Séances=${module.seances?.length || 0}, Progression=${module.progression.percentage}%, Status=${module.progression.status}`);
      });
    } else {
      logger.warn(`Aucun module trouvé pour l'utilisateur ${userId}`);
    }
    
    return res.status(200).json({ modules: modulesWithProgress });
    
  } catch (error) {
    logger.error(`Erreur lors de la récupération des modules de l'utilisateur ${req.params.userId}: ${error.message}`);
    logger.error(`Stack trace: ${error.stack}`);
    res.status(500).json({
      error: 'Erreur serveur',
      message: 'Une erreur est survenue lors de la récupération des modules de l\'utilisateur'
    });
  }
};

// Changer le statut d'un module (admin seulement)
exports.changeModuleStatus = async (req, res) => {
  try {
    const moduleId = req.params.id;
    const { statut } = req.body;
    
    // Vérifier que le statut est valide
    if (!statut || !['brouillon', 'publié', 'archivé'].includes(statut)) {
      return res.status(400).json({
        error: 'Statut invalide',
        message: 'Le statut doit être brouillon, publié ou archivé'
      });
    }
    
    // Récupérer le module
    const module = await Module.findByPk(moduleId);
    
    if (!module) {
      return res.status(404).json({
        error: 'Module non trouvé',
        message: 'Le module demandé n\'existe pas'
      });
    }
    
    // Mettre à jour le statut
    module.statut = statut;
    module.updated_at = new Date();
    
    await module.save();
    
    logger.info(`Statut du module ${moduleId} mis à jour: ${statut}`);
    
    res.status(200).json({
      message: `Statut du module mis à jour avec succès (${statut})`,
      module: {
        id: module.id,
        titre: module.titre,
        statut: module.statut
      }
    });
  } catch (error) {
    logger.error(`Erreur lors de la mise à jour du statut du module: ${error.message}`);
    res.status(500).json({
      error: 'Erreur serveur',
      message: 'Une erreur est survenue lors de la mise à jour du statut du module'
    });
  }
};

// Ajouter des séances existantes à un module
exports.addSeancesToModule = async (req, res) => {
  try {
    const { id } = req.params;
    const { seanceIds } = req.body;
    const errors = validationResult(req);

    // Vérifier les erreurs de validation
    if (!errors.isEmpty()) {
      logger.error(`[addSeancesToModule] Erreurs de validation: ${JSON.stringify(errors.array())}`);
      return res.status(400).json({ errors: errors.array() });
    }

    // Vérifier si le module existe
    const module = await Module.findByPk(id);
    if (!module) {
      logger.error(`[addSeancesToModule] Module avec ID ${id} non trouvé`);
      return res.status(404).json({
        error: 'Module non trouvé',
        message: 'Le module demandé n\'existe pas'
      });
    }

    // Récupérer toutes les séances existantes du module
    const currentSeances = await module.getSeances();
    const currentSeanceIds = currentSeances.map(seance => seance.id);
    
    // Vérifier si les séances existent
    const seances = await Seance.findAll({
      where: {
        id: seanceIds
      }
    });

    // Vérifier si toutes les séances demandées ont été trouvées
    if (seances.length !== seanceIds.length) {
      logger.error(`[addSeancesToModule] Certaines séances n'existent pas. Demandées: ${seanceIds.length}, Trouvées: ${seances.length}`);
      const foundIds = seances.map(seance => seance.id);
      const missingIds = seanceIds.filter(id => !foundIds.includes(parseInt(id)));
      
      return res.status(404).json({
        error: 'Séances non trouvées',
        message: 'Certaines séances demandées n\'existent pas',
        missingIds
      });
    }

    // Filtrer les séances qui ne sont pas déjà dans le module
    const newSeanceIds = seanceIds.filter(id => !currentSeanceIds.includes(parseInt(id)));
    
    // Ajouter les nouvelles séances au module
    for (const seanceId of newSeanceIds) {
      // Trouver la position maximale actuelle
      const maxPosition = currentSeances.length > 0 
        ? Math.max(...currentSeances.map(s => s.ModuleSeance ? s.ModuleSeance.positions || 0 : 0)) 
        : 0;
      
      // Ajouter la séance avec la prochaine position
      await module.addSeance(seanceId, {
        through: {
          positions: maxPosition + 1
        }
      });
      
      logger.info(`[addSeancesToModule] Séance ${seanceId} ajoutée au module ${id} à la position ${maxPosition + 1}`);
    }

    // Récupérer le module mis à jour avec ses séances
    const updatedModule = await Module.findByPk(id, {
      include: [{
        model: Seance,
        as: 'seances',
        through: {
          attributes: ['positions'],
        }
      }]
    });

    logger.info(`[addSeancesToModule] ${newSeanceIds.length} séances ajoutées au module ${id}`);
    
    res.status(200).json({
      message: 'Séances ajoutées au module avec succès',
      module: updatedModule,
      addedSeances: newSeanceIds
    });
  } catch (error) {
    logger.error(`Erreur lors de l'ajout des séances au module: ${error.message}`);
    logger.error(error.stack);
    res.status(500).json({
      error: 'Erreur serveur',
      message: 'Une erreur est survenue lors de l\'ajout des séances au module'
    });
  }
};