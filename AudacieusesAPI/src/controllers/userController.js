const { User, Role } = require('../models');
const bcrypt = require('bcrypt');
const logger = require('../utils/logger');
const { Op } = require('sequelize');

// Récupérer tous les utilisateurs (admin seulement)
exports.getAllUsers = async (req, res) => {
  try {
    logger.info(`Récupération des utilisateurs avec filtres: ${JSON.stringify(req.query)}`);
    
    // Paramètres de pagination et filtrage
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;
    const search = req.query.search || '';
    const role = req.query.role || '';
    const status = req.query.status || '';
    const sortBy = req.query.sortBy || 'id';
    const sortOrder = req.query.sortOrder === 'desc' ? 'DESC' : 'ASC';
    
    // Construire les options de requête
    const queryOptions = {
      include: [{ 
        model: Role, 
        as: 'role',
        where: {} // Initialiser where pour Role
      }],
      where: {},
      attributes: { exclude: ['mdp'] }, // Exclure le mot de passe
      limit,
      offset,
      order: [[sortBy, sortOrder]]
    };
    
    // Appliquer les filtres
    if (search) {
      queryOptions.where = {
        ...queryOptions.where,
        [Op.or]: [
          { nom: { [Op.like]: `%${search}%` } },
          { prenom: { [Op.like]: `%${search}%` } },
          { mail: { [Op.like]: `%${search}%` } }
        ]
      };
    }
    
    // Filtre par rôle
    if (role) {
      queryOptions.include[0].where = {
        ...queryOptions.include[0].where,
        nom: role
      };
    }
    
    // Filtre par statut
    if (status) {
      queryOptions.where = {
        ...queryOptions.where,
        active: status === 'active' ? true : false
      };
    }
    
    // Récupérer les utilisateurs avec le nombre total
    const { count, rows: users } = await User.findAndCountAll(queryOptions);
    
    res.status(200).json({
      users: users.map(user => ({
        id: user.id,
        nom: user.nom,
        prenom: user.prenom,
        // Convertir mail en email pour le frontend
        email: user.mail,
        date_naissance: user.date_naissance,
        // Envoyer le rôle comme un objet
        role: {
          id: user.role.id,
          nom: user.role.nom
        },
        // Ajouter le statut et la dernière connexion
        status: user.active ? 'active' : 'inactive',
        derniere_connexion: user.updated_at, // Utiliser updated_at comme approximation
        progression: 0 // Progression par défaut
      })),
      total: count
    });
  } catch (error) {
    logger.error(`Erreur lors de la récupération des utilisateurs: ${error.message}`);
    res.status(500).json({
      error: 'Erreur serveur',
      message: 'Une erreur est survenue lors de la récupération des utilisateurs'
    });
  }
};

// Récupérer un utilisateur par son ID
exports.getUserById = async (req, res) => {
  try {
    const userId = req.params.id;
    
    // Vérifier si l'utilisateur est admin ou consulte son propre profil
    if (req.user.role.nom !== 'admin' && req.user.role.nom !== 'admin_plus' && req.user.id != userId) {
      return res.status(403).json({
        error: 'Accès refusé',
        message: 'Vous n\'avez pas les droits pour accéder à ce profil'
      });
    }
    
    const user = await User.findByPk(userId, {
      include: [{ model: Role, as: 'role' }],
      attributes: { exclude: ['mdp'] }
    });
    
    if (!user) {
      return res.status(404).json({
        error: 'Utilisateur non trouvé',
        message: 'L\'utilisateur demandé n\'existe pas'
      });
    }
      res.status(200).json({
      user: {
        id: user.id,
        nom: user.nom,
        prenom: user.prenom,
        email: user.mail,
        telephone: user.telephone || null,
        adresse: user.adresse || null,
        code_postal: user.code_postal || null,
        ville: user.ville || null,
        pays: user.pays || null,
        date_naissance: user.date_naissance,
        derniere_connexion: user.derniere_connexion,
        role: {
          id: user.role.id,
          nom: user.role.nom
        }
      }
    });
  } catch (error) {
    logger.error(`Erreur lors de la récupération de l'utilisateur: ${error.message}`);
    res.status(500).json({
      error: 'Erreur serveur',
      message: 'Une erreur est survenue lors de la récupération de l\'utilisateur'
    });
  }
};

// Créer un nouvel utilisateur (admin seulement)
exports.createUser = async (req, res) => {
  try {
    // Déboguer le contenu du corps de la requête
    console.log("Données reçues dans createUser:", JSON.stringify(req.body, null, 2));
    
    // Adapter le champ email à mail si nécessaire
    if (req.body.email && !req.body.mail) {
      req.body.mail = req.body.email;
    }
    
    // Adapter le champ password à mdp si nécessaire
    if (req.body.password && !req.body.mdp) {
      req.body.mdp = req.body.password;
    }
    
    const { nom, prenom, mail, mdp, date_naissance, roleNom, role_type, role_id } = req.body;
    
    // Déterminer le rôle à utiliser
    let roleNameToUse = roleNom || role_type;
    let roleIdToUse = role_id;
    
    if (!roleNameToUse && roleIdToUse) {
      // Si on a un role_id mais pas de nom de rôle, on essaie de récupérer le rôle par son ID
      const roleById = await Role.findByPk(roleIdToUse);
      if (roleById) {
        roleNameToUse = roleById.nom;
      }
    }
    
    if (!mail) {
      return res.status(400).json({
        error: 'Email manquant',
        message: 'L\'adresse email est requise'
      });
    }
    
    // Vérifier si l'email existe déjà
    const userExists = await User.findOne({ where: { mail } });
    
    if (userExists) {
      return res.status(400).json({
        error: 'Email déjà utilisé',
        message: 'Cet email est déjà associé à un compte'
      });
    }
    
    // Si on a un role_id mais pas de nom de rôle, on utilise directement le role_id
    let roleToUse;
    if (roleIdToUse && !roleNameToUse) {
      roleToUse = await Role.findByPk(roleIdToUse);
    } else if (roleNameToUse) {
      // Sinon on cherche par le nom
      roleToUse = await Role.findOne({ where: { nom: roleNameToUse } });
    }
    
    if (!roleToUse) {
      return res.status(400).json({
        error: 'Rôle invalide',
        message: 'Le rôle spécifié n\'existe pas'
      });
    }
    
    // Vérifier que l'admin+ ne peut être créé que par un admin+
    if (roleToUse.nom === 'admin_plus' && req.user.role.nom !== 'admin_plus') {
      return res.status(403).json({
        error: 'Accès refusé',
        message: 'Vous n\'avez pas les droits pour créer un administrateur avec privilèges avancés'
      });
    }
    
    // Créer le nouvel utilisateur
    const newUser = await User.create({
      nom,
      prenom,
      mail,
      mdp, // Le hook beforeCreate se chargera du hashage
      date_naissance,
      role_id: roleToUse.id
    });
    
    logger.info(`Nouvel utilisateur créé par admin: ${newUser.id} (${mail}) avec rôle ${roleToUse.nom}`);
    
    res.status(201).json({
      message: 'Utilisateur créé avec succès',
      user: {
        id: newUser.id,
        nom: newUser.nom,
        prenom: newUser.prenom,
        mail: newUser.mail,
        date_naissance: newUser.date_naissance,
        role: roleToUse.nom
      }
    });
  } catch (error) {
    logger.error(`Erreur lors de la création d'un utilisateur: ${error.message}`);
    res.status(500).json({
      error: 'Erreur serveur',
      message: 'Une erreur est survenue lors de la création de l\'utilisateur'
    });
  }
};

// Mettre à jour un utilisateur
exports.updateUser = async (req, res) => {
  try {
    // Déboguer le contenu du corps de la requête
    console.log("Données reçues dans updateUser:", JSON.stringify(req.body, null, 2));
    
    // Adapter le champ email à mail si nécessaire
    if (req.body.email && !req.body.mail) {
      req.body.mail = req.body.email;
    }
    
    const userId = req.params.id;
    const { nom, prenom, mail, date_naissance, roleNom, role_type, role_id } = req.body;
    
    // Vérifier si l'utilisateur est admin ou met à jour son propre profil
    const isAdmin = req.user.role.nom === 'admin' || req.user.role.nom === 'admin_plus';
    const isSelfUpdate = req.user.id == userId;
    
    if (!isAdmin && !isSelfUpdate) {
      return res.status(403).json({
        error: 'Accès refusé',
        message: 'Vous n\'avez pas les droits pour modifier ce profil'
      });
    }
    
    // Récupérer l'utilisateur
    const user = await User.findByPk(userId, {
      include: [{ model: Role, as: 'role' }]
    });
    
    if (!user) {
      return res.status(404).json({
        error: 'Utilisateur non trouvé',
        message: 'L\'utilisateur demandé n\'existe pas'
      });
    }
    
    // Déterminer le rôle à utiliser
    let roleNameToUse = roleNom || role_type;
    let roleIdToUse = role_id;
    
    if (!roleNameToUse && roleIdToUse) {
      // Si on a un role_id mais pas de nom de rôle, on essaie de récupérer le rôle par son ID
      const roleById = await Role.findByPk(roleIdToUse);
      if (roleById) {
        roleNameToUse = roleById.nom;
      }
    }
    
    // Vérifier si on veut changer le rôle
    if ((roleNameToUse && roleNameToUse !== user.role.nom) || 
        (roleIdToUse && roleIdToUse != user.role_id)) {
      // Seuls les admins peuvent changer les rôles
      if (!isAdmin) {
        return res.status(403).json({
          error: 'Accès refusé',
          message: 'Vous n\'avez pas les droits pour modifier le rôle'
        });
      }
      
      // Récupérer le nouveau rôle
      let newRole;
      if (roleIdToUse) {
        newRole = await Role.findByPk(roleIdToUse);
      } else if (roleNameToUse) {
        newRole = await Role.findOne({ where: { nom: roleNameToUse } });
      }
      
      if (!newRole) {
        return res.status(400).json({
          error: 'Rôle invalide',
          message: 'Le rôle spécifié n\'existe pas'
        });
      }
      
      // Vérifier que l'admin+ ne peut être créé que par un admin+
      if (newRole.nom === 'admin_plus' && req.user.role.nom !== 'admin_plus') {
        return res.status(403).json({
          error: 'Accès refusé',
          message: 'Vous n\'avez pas les droits pour créer un administrateur avec privilèges avancés'
        });
      }
      
      user.role_id = newRole.id;
    }
    
    // Mettre à jour les autres informations
    if (nom) user.nom = nom;
    if (prenom) user.prenom = prenom;
    if (mail) {
      // Vérifier si l'email n'est pas déjà utilisé par un autre utilisateur
      if (mail !== user.mail) {
        const mailExists = await User.findOne({ where: { mail } });
        if (mailExists) {
          return res.status(400).json({
            error: 'Email déjà utilisé',
            message: 'Cet email est déjà associé à un autre compte'
          });
        }
      }
      user.mail = mail;
    }
    if (date_naissance) user.date_naissance = date_naissance;
    
    // Sauvegarder les modifications
    await user.save();
    
    // Récupérer l'utilisateur mis à jour avec son rôle
    const updatedUser = await User.findByPk(userId, {
      include: [{ model: Role, as: 'role' }],
      attributes: { exclude: ['mdp'] }
    });
    
    logger.info(`Utilisateur mis à jour: ${userId}`);
    
    res.status(200).json({
      message: 'Utilisateur mis à jour avec succès',
      user: {
        id: updatedUser.id,
        nom: updatedUser.nom,
        prenom: updatedUser.prenom,
        mail: updatedUser.mail,
        date_naissance: updatedUser.date_naissance,
        role: updatedUser.role.nom
      }
    });
  } catch (error) {
    logger.error(`Erreur lors de la mise à jour de l'utilisateur: ${error.message}`);
    res.status(500).json({
      error: 'Erreur serveur',
      message: 'Une erreur est survenue lors de la mise à jour de l\'utilisateur'
    });
  }
};

// Mettre à jour le mot de passe
exports.updatePassword = async (req, res) => {
  try {
    const userId = req.params.id;
    const { currentPassword, newPassword } = req.body;
    
    // Vérifier si l'utilisateur est admin ou met à jour son propre mot de passe
    const isAdmin = req.user.role.nom === 'admin' || req.user.role.nom === 'admin_plus';
    const isSelfUpdate = req.user.id == userId;
    
    if (!isAdmin && !isSelfUpdate) {
      return res.status(403).json({
        error: 'Accès refusé',
        message: 'Vous n\'avez pas les droits pour modifier ce mot de passe'
      });
    }
    
    // Récupérer l'utilisateur
    const user = await User.findByPk(userId);
    
    if (!user) {
      return res.status(404).json({
        error: 'Utilisateur non trouvé',
        message: 'L\'utilisateur demandé n\'existe pas'
      });
    }
    
    // Si c'est une mise à jour personnelle, vérifier l'ancien mot de passe
    if (isSelfUpdate && !isAdmin) {
      const isPasswordValid = await user.verifyPassword(currentPassword);
      
      if (!isPasswordValid) {
        return res.status(401).json({
          error: 'Mot de passe incorrect',
          message: 'Le mot de passe actuel est incorrect'
        });
      }
    }
    
    // Mettre à jour le mot de passe
    user.mdp = newPassword;
    await user.save();
    
    logger.info(`Mot de passe mis à jour pour l'utilisateur: ${userId}`);
    
    res.status(200).json({
      message: 'Mot de passe mis à jour avec succès'
    });
  } catch (error) {
    logger.error(`Erreur lors de la mise à jour du mot de passe: ${error.message}`);
    res.status(500).json({
      error: 'Erreur serveur',
      message: 'Une erreur est survenue lors de la mise à jour du mot de passe'
    });
  }
};

// Supprimer un utilisateur (admin seulement)
exports.deleteUser = async (req, res) => {
  try {
    const userId = req.params.id;
    
    // Un utilisateur ne peut pas se supprimer lui-même
    if (req.user.id == userId) {
      return res.status(400).json({
        error: 'Opération non autorisée',
        message: 'Vous ne pouvez pas supprimer votre propre compte'
      });
    }
    
    // Récupérer l'utilisateur
    const user = await User.findByPk(userId, {
      include: [{ model: Role, as: 'role' }]
    });
    
    if (!user) {
      return res.status(404).json({
        error: 'Utilisateur non trouvé',
        message: 'L\'utilisateur demandé n\'existe pas'
      });
    }
    
    // Un admin standard ne peut pas supprimer un admin+
    if (user.role.nom === 'admin_plus' && req.user.role.nom !== 'admin_plus') {
      return res.status(403).json({
        error: 'Accès refusé',
        message: 'Vous n\'avez pas les droits pour supprimer un administrateur avec privilèges avancés'
      });
    }
    
    // Supprimer l'utilisateur
    await user.destroy();
    
    logger.info(`Utilisateur supprimé: ${userId}`);
    
    res.status(200).json({
      message: 'Utilisateur supprimé avec succès'
    });
  } catch (error) {
    logger.error(`Erreur lors de la suppression de l'utilisateur: ${error.message}`);
    res.status(500).json({
      error: 'Erreur serveur',
      message: 'Une erreur est survenue lors de la suppression de l\'utilisateur'
    });
  }
};

// Réinitialiser le mot de passe d'un utilisateur (admin uniquement)
exports.resetUserPassword = async (req, res) => {
  try {
    const userId = req.params.id;
    
    // Vérifier si l'utilisateur a les droits d'admin
    const isAdmin = req.user.role.nom === 'admin' || req.user.role.nom === 'admin_plus';
    
    if (!isAdmin) {
      return res.status(403).json({
        error: 'Accès refusé',
        message: 'Vous n\'avez pas les droits pour réinitialiser le mot de passe d\'un utilisateur'
      });
    }
    
    // Récupérer l'utilisateur
    const user = await User.findByPk(userId);
    
    if (!user) {
      return res.status(404).json({
        error: 'Utilisateur non trouvé',
        message: 'L\'utilisateur demandé n\'existe pas'
      });
    }
    
    // Générer un mot de passe temporaire
    const tempPassword = Math.random().toString(36).slice(-8) + Math.random().toString(36).toUpperCase().slice(-2) + '!1';
    
    // Mettre à jour le mot de passe
    user.mdp = tempPassword;
    await user.save();
    
    logger.info(`Mot de passe réinitialisé pour l'utilisateur: ${userId}`);
    
    res.status(200).json({
      message: `Mot de passe réinitialisé avec succès. Nouveau mot de passe temporaire: ${tempPassword}`
    });
  } catch (error) {
    logger.error(`Erreur lors de la réinitialisation du mot de passe: ${error.message}`);
    res.status(500).json({
      error: 'Erreur serveur',
      message: 'Une erreur est survenue lors de la réinitialisation du mot de passe'
    });
  }
};