const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const { User, Role } = require('../models');
const { Op } = require('sequelize');
const { JWT_SECRET, JWT_EXPIRES_IN } = require('../config/jwt');
const logger = require('../utils/logger');

// Fonction utilitaire pour générer un token de réinitialisation
const generateResetToken = () => crypto.randomBytes(20).toString('hex');

// Stockage temporaire des tokens de réinitialisation
// Dans une application de production, il faudrait les stocker en base de données
const resetTokens = new Map();

// Inscription d'un nouvel utilisateur
exports.register = async (req, res) => {
  try {
    const { nom, prenom, mail, mdp, date_naissance } = req.body;
    
    // Vérifier si l'email existe déjà
    const userExists = await User.findOne({ where: { mail } });
    
    if (userExists) {
      return res.status(400).json({
        error: 'Email déjà utilisé',
        message: 'Cet email est déjà associé à un compte'
      });
    }
    
    // Récupérer le rôle client par défaut
    const clientRole = await Role.findOne({
      where: { nom: 'client' }
    });
    
    if (!clientRole) {
      return res.status(500).json({
        error: 'Erreur d\'initialisation',
        message: 'Impossible de trouver le rôle client'
      });
    }
    
    // Créer le nouvel utilisateur avec la nouvelle nomenclature pour le roleId
    const newUser = await User.create({
      nom,
      prenom,
      mail,
      mdp,
      date_naissance,
      role_id: clientRole.id // Utilisation du nouveau nom explicite
    });
    
    // Générer un token JWT
    const token = jwt.sign(
      { id: newUser.id }, 
      JWT_SECRET, 
      { expiresIn: JWT_EXPIRES_IN }
    );
    
    logger.info(`Nouvel utilisateur inscrit: ${newUser.id} (${mail})`);
    
    // Inclure le rôle complet pour être cohérent avec la réponse de connexion
    res.status(201).json({
      message: 'Inscription réussie',
      token,
      user: {
        id: newUser.id,
        nom: newUser.nom,
        prenom: newUser.prenom,
        mail: newUser.mail,
        role: {
          id: clientRole.id,
          nom: clientRole.nom,
          role_type: 'client'
        }
      }
    });
  } catch (error) {
    logger.error(`Erreur lors de l'inscription: ${error.message}`);
    // Ajouter des informations détaillées sur l'erreur pour le débogage
    if (error.name === 'SequelizeValidationError') {
      // Erreurs de validation Sequelize
      logger.error(`Erreurs de validation: ${JSON.stringify(error.errors.map(e => ({ field: e.path, message: e.message })))}`);
      return res.status(400).json({
        error: 'Données invalides',
        message: 'Certains champs sont invalides',
        details: error.errors.map(e => ({ field: e.path, message: e.message }))
      });
    } else if (error.name === 'SequelizeUniqueConstraintError') {
      // Violation de contrainte d'unicité (comme un email déjà utilisé)
      logger.error(`Violation de contrainte d'unicité: ${JSON.stringify(error.errors.map(e => ({ field: e.path, message: e.message })))}`);
      return res.status(400).json({
        error: 'Contrainte d\'unicité violée',
        message: 'Un des champs doit être unique',
        details: error.errors.map(e => ({ field: e.path, message: e.message }))
      });
    }
    
    res.status(500).json({
      error: 'Erreur serveur',
      message: 'Une erreur est survenue lors de l\'inscription'
    });
  }
};

// Connexion d'un utilisateur
exports.login = async (req, res) => {
  try {
    const { mail, mdp } = req.body;
    
    // Journaliser la tentative de connexion (sans le mot de passe)
    logger.info(`Tentative de connexion pour: ${mail}`);
    
    // Trouver l'utilisateur avec son mail
    const user = await User.findOne({
      where: { mail },
      include: [{ model: Role, as: 'role' }]
    });
    
    if (!user) {
      logger.warn(`Échec de connexion - utilisateur non trouvé: ${mail}`);
      return res.status(401).json({
        error: 'Identifiants incorrects',
        message: 'Email ou mot de passe incorrect'
      });
    }
    
    // Vérifier si l'utilisateur est actif
    if (user.active === false) {
      logger.warn(`Tentative de connexion avec un compte désactivé: ${mail}`);
      return res.status(401).json({
        error: 'Compte désactivé',
        message: 'Ce compte a été désactivé. Veuillez contacter un administrateur.'
      });
    }
    
    // Vérifier le mot de passe
    const isPasswordValid = await user.verifyPassword(mdp);
    
    if (!isPasswordValid) {
      logger.warn(`Échec de connexion - mot de passe incorrect pour: ${mail}`);
      return res.status(401).json({
        error: 'Identifiants incorrects',
        message: 'Email ou mot de passe incorrect'
      });
    }
    
    // S'assurer que le rôle existe
    if (!user.role) {
      logger.error(`Utilisateur sans rôle associé: ${user.id} (${mail})`);
      return res.status(500).json({
        error: 'Erreur de configuration',
        message: 'Impossible de déterminer les droits utilisateur'
      });
    }
    
    try {
      // Générer un token JWT
      const token = jwt.sign(
        { id: user.id }, 
        JWT_SECRET, 
        { expiresIn: JWT_EXPIRES_IN }
      );
      
      // Générer un refresh token
      const refreshToken = crypto.randomBytes(40).toString('hex');
      
      logger.info(`Connexion réussie pour: ${user.id} (${user.mail})`);
      
      // Utiliser directement le nom du rôle sans mapping supplémentaire
      logger.info(`Rôle utilisateur: ${user.role?.nom}`);
      
      // Log détaillé de la réponse qui sera envoyée
      logger.info(`====== DÉTAIL RÉPONSE LOGIN ======`);
      logger.info(`- ID utilisateur: ${user.id}`);
      logger.info(`- Email: ${user.mail}`);
      logger.info(`- Rôle ID: ${user.role?.id}`);
      logger.info(`- Rôle nom: ${user.role?.nom}`);
      
      const responseObj = {
        message: 'Connexion réussie',
        token,
        refreshToken,
        user: {
          id: user.id,
          nom: user.nom,
          prenom: user.prenom,
          mail: user.mail,
          role: {
            id: user.role.id,
            nom: user.role.nom,
            role_type: user.role.nom
          }
        }
      };
      
      logger.info(`Objet de réponse complet: ${JSON.stringify(responseObj)}`);
      logger.info(`====== FIN DÉTAIL RÉPONSE LOGIN ======`);
      
      res.status(200).json(responseObj);
    } catch (tokenError) {
      logger.error(`Erreur de génération de token pour: ${user.id} (${mail}): ${tokenError.message}`);
      return res.status(500).json({
        error: 'Erreur d\'authentification',
        message: 'Impossible de générer le token d\'authentification'
      });
    }
  } catch (error) {
    logger.error(`Erreur lors de la connexion: ${error.message}`);
    res.status(500).json({
      error: 'Erreur serveur',
      message: 'Une erreur est survenue lors de la connexion'
    });
  }
};

// Récupération du mot de passe
exports.forgotPassword = async (req, res) => {
  try {
    const { mail } = req.body;
    
    // Vérifier si l'utilisateur existe
    const user = await User.findOne({ where: { mail } });
    
    if (!user) {
      // Pour des raisons de sécurité, ne pas indiquer si l'email existe ou non
      return res.status(200).json({
        message: 'Si votre email est associé à un compte, vous recevrez un lien pour réinitialiser votre mot de passe'
      });
    }
    
    // Générer un token de réinitialisation
    const resetToken = generateResetToken();
    
    // Stocker le token avec une durée de validité d'1 heure
    // En production, il faudrait stocker ce token en base de données
    resetTokens.set(resetToken, {
      userId: user.id,
      expiresAt: Date.now() + 3600000 // 1 heure en millisecondes
    });
    
    // TODO: Implémenter l'envoi d'email avec le token
    // Dans un environnement de production, utilisez un service comme SendGrid, Mailgun, etc.
    const resetLink = `https://lesaudacieuses.fr/reset-password?token=${resetToken}`;
    logger.info(`Lien de réinitialisation généré pour l'utilisateur ${user.id}: ${resetLink}`);
    
    logger.info(`Demande de récupération de mot de passe pour: ${user.id} (${mail})`);
    
    res.status(200).json({
      message: 'Si votre email est associé à un compte, vous recevrez un lien pour réinitialiser votre mot de passe'
    });
  } catch (error) {
    logger.error(`Erreur lors de la récupération de mot de passe: ${error.message}`);
    res.status(500).json({
      error: 'Erreur serveur',
      message: 'Une erreur est survenue lors de la demande de récupération de mot de passe'
    });
  }
};

// Réinitialisation du mot de passe
exports.resetPassword = async (req, res) => {
  try {
    const { token, newPassword } = req.body;
    
    // Vérifier si le token existe et est valide
    const tokenData = resetTokens.get(token);
    
    if (!tokenData || tokenData.expiresAt < Date.now()) {
      return res.status(400).json({
        error: 'Token invalide',
        message: 'Le lien de réinitialisation est invalide ou a expiré'
      });
    }
    
    // Trouver l'utilisateur
    const user = await User.findByPk(tokenData.userId);
    
    if (!user) {
      return res.status(404).json({
        error: 'Utilisateur non trouvé',
        message: 'Utilisateur introuvable'
      });
    }
    
    // Mettre à jour le mot de passe
    user.mdp = newPassword;
    await user.save();
    
    // Supprimer le token après utilisation
    resetTokens.delete(token);
    
    logger.info(`Mot de passe réinitialisé pour: ${user.id} (${user.mail})`);
    
    res.status(200).json({
      message: 'Votre mot de passe a été réinitialisé avec succès'
    });
  } catch (error) {
    logger.error(`Erreur lors de la réinitialisation du mot de passe: ${error.message}`);
    res.status(500).json({
      error: 'Erreur serveur',
      message: 'Une erreur est survenue lors de la réinitialisation du mot de passe'
    });
  }
};

// Rafraîchissement du token
exports.refreshToken = async (req, res) => {
  try {
    const { refreshToken } = req.body;
    
    // Dans une implémentation réelle, vous vérifieriez ce token contre une base de données
    if (!refreshToken) {
      return res.status(400).json({
        error: 'Token manquant',
        message: 'Le refresh token est requis'
      });
    }
    
    // Pour cette démonstration, nous générons simplement un nouveau token
    // En production, vous devriez vérifier que le refreshToken est valide
    
    // Extraire l'ID utilisateur du token JWT existant
    // (dans un système réel, vous stockeriez cette information avec le refreshToken)
    const token = req.headers.authorization?.split(' ')[1];
    let userId;
    
    try {
      const decoded = jwt.verify(token, JWT_SECRET, { ignoreExpiration: true });
      userId = decoded.id;
    } catch (error) {
      return res.status(401).json({
        error: 'Token invalide',
        message: 'Impossible de renouveler la session'
      });
    }
    
    // Générer un nouveau token
    const newToken = jwt.sign(
      { id: userId }, 
      JWT_SECRET, 
      { expiresIn: JWT_EXPIRES_IN }
    );
    
    // Dans un système réel, vous pourriez régénérer un nouveau refreshToken aussi
    const newRefreshToken = crypto.randomBytes(40).toString('hex');
    
    res.status(200).json({
      message: 'Token renouvelé avec succès',
      token: newToken,
      refreshToken: newRefreshToken
    });
  } catch (error) {
    logger.error(`Erreur lors du rafraîchissement du token: ${error.message}`);
    res.status(500).json({
      error: 'Erreur serveur',
      message: 'Une erreur est survenue lors du rafraîchissement du token'
    });
  }
};

// Déconnexion
exports.logout = async (req, res) => {
  try {
    // Pour une implémentation complète, il faudrait stocker les tokens révoqués
    // dans une base de données comme Redis pour gérer efficacement l'invalidation

    // Pour l'instant, nous retournons simplement un succès
    res.status(200).json({
      message: 'Déconnexion réussie'
    });
  } catch (error) {
    logger.error(`Erreur lors de la déconnexion: ${error.message}`);
    res.status(500).json({
      error: 'Erreur serveur',
      message: 'Une erreur est survenue lors de la déconnexion'
    });
  }
};

// Route temporaire pour réinitialiser le mot de passe administrateur
exports.resetAdminPassword = async (req, res) => {
  try {    // Trouver l'utilisateur admin
    let admin = await User.findOne({
      include: [{ 
        model: Role, 
        as: 'role', 
        where: { 
          nom: {
            [Op.in]: ['admin', 'administrateur', 'admin_plus', 'super_admin']
          }
        } 
      }]
    });
    
    if (!admin) {
      // Essayer avec le mail admin
      admin = await User.findOne({
        where: { mail: 'admin@audacieuses.fr' }
      });
    }
      if (!admin) {
      return res.status(404).json({
        error: 'Admin non trouvé',
        message: 'Aucun compte administrateur trouvé dans la base de données'
      });
    }
    
    // Générer un mot de passe aléatoire sécurisé
    const generateRandomPassword = (length = 12) => {
      const upperChars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
      const lowerChars = 'abcdefghijklmnopqrstuvwxyz';
      const numbers = '0123456789';
      const specialChars = '!@#$%^&*()_-+=<>?';
      const allChars = upperChars + lowerChars + numbers + specialChars;
      
      // Assurez-vous d'avoir au moins un caractère de chaque type
      let password = 
        upperChars.charAt(Math.floor(Math.random() * upperChars.length)) +
        lowerChars.charAt(Math.floor(Math.random() * lowerChars.length)) +
        numbers.charAt(Math.floor(Math.random() * numbers.length)) +
        specialChars.charAt(Math.floor(Math.random() * specialChars.length));
      
      // Ajouter les caractères restants aléatoirement
      for (let i = password.length; i < length; i++) {
        password += allChars.charAt(Math.floor(Math.random() * allChars.length));
      }
      
      // Mélanger tous les caractères
      return password.split('').sort(() => 0.5 - Math.random()).join('');
    };
    
    const newPassword = generateRandomPassword();
    
    // Hasher manuellement le mot de passe
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    
    // Mettre à jour directement dans la base de données pour éviter les hooks
    await User.update(
      { mdp: hashedPassword },
      { where: { id: admin.id }, individualHooks: false }
    );
    
    logger.info(`Mot de passe administrateur réinitialisé pour: ${admin.id} (${admin.mail})`);
    
    res.status(200).json({
      message: 'Mot de passe administrateur réinitialisé avec succès',
      email: admin.mail,
      password: newPassword // Dans un environnement de production, ne jamais renvoyer le mot de passe
    });
  } catch (error) {
    logger.error(`Erreur lors de la réinitialisation du mot de passe admin: ${error.message}`);
    res.status(500).json({
      error: 'Erreur serveur',
      message: 'Une erreur est survenue lors de la réinitialisation du mot de passe'
    });
  }
};

// Récupérer tous les rôles
exports.getAllRoles = async (req, res) => {
  try {
    const roles = await Role.findAll({
      attributes: ['id', 'nom', 'description']
    });
    
    res.status(200).json({
      roles: roles
    });
  } catch (error) {
    logger.error(`Erreur lors de la récupération des rôles: ${error.message}`);
    res.status(500).json({
      error: 'Erreur serveur',
      message: 'Une erreur est survenue lors de la récupération des rôles'
    });
  }
};