const jwt = require('jsonwebtoken');
const { verifyToken } = require('../config/jwt');
const { User, Role, sequelize } = require('../models');
const logger = require('../utils/logger');

// Middleware d'authentification
exports.authenticate = async (req, res, next) => {
  try {
    let token = req.headers.authorization;
    
    // Vérifier si un token est présent dans les headers
    if (!token || !token.startsWith('Bearer ')) {
      logger.warn('Tentative d\'accès sans token d\'authentification');
      return res.status(401).json({
        error: 'Non authentifié',
        message: 'Vous devez être connecté pour accéder à cette ressource'
      });
    }
    
    // Extraire le token de la chaîne "Bearer [token]"
    token = token.split(' ')[1];
    
    // Vérifier le token
    const decoded = verifyToken(token);
    
    if (!decoded) {
      logger.warn('Tentative d\'accès avec un token invalide');
      return res.status(401).json({
        error: 'Token invalide',
        message: 'Votre session a expiré ou est invalide. Veuillez vous reconnecter.'
      });
    }
    
    logger.important(`Contenu du token décodé: ${JSON.stringify(decoded)}`);
    logger.info(`====== DÉBOGAGE AUTHENTIFICATION ======`);
    logger.info(`Décodage du token pour l'utilisateur ${decoded.id}`);
    
    // Utiliser une requête SQL brute pour forcer le chargement des données avec une jointure explicite
    const [users] = await sequelize.query(`
      SELECT u.*, r.id as role_id_from_join, r.nom as role_nom, r.description as role_description
      FROM users u
      LEFT JOIN roles r ON u.role_id = r.id
      WHERE u.id = :userId
    `, {
      replacements: { userId: decoded.id },
      type: sequelize.QueryTypes.SELECT
    });
    
    // Si aucun utilisateur n'est trouvé
    if (!users || users.length === 0) {
      logger.warn(`Utilisateur ${decoded.id} non trouvé lors de la vérification du token`);
      return res.status(401).json({
        error: 'Utilisateur non trouvé',
        message: 'Votre compte n\'existe pas ou a été supprimé'
      });
    }
    
    const userData = Array.isArray(users) ? users[0] : users;
    
    // Détails sur les données récupérées
    logger.info(`Données utilisateur récupérées:`);
    logger.info(`- ID: ${userData.id}`);
    logger.info(`- Email: ${userData.mail}`);
    logger.info(`- role_id depuis la table users: ${userData.role_id}`);
    logger.info(`- role_id depuis la jointure: ${userData.role_id_from_join}`);
    logger.info(`- role_nom: ${userData.role_nom}`);
    logger.info(`- role_description: ${userData.role_description}`);
    
    if (!userData.active) {
      logger.warn(`Tentative d'accès avec un compte désactivé: ${userData.id} (${userData.mail})`);
      return res.status(403).json({
        error: 'Compte désactivé',
        message: 'Votre compte a été désactivé'
      });
    }
    
    // Vérifions s'il y a une différence entre les rôles
    const roleIdDifferent = userData.role_id !== userData.role_id_from_join;
    if (roleIdDifferent) {
      logger.important(`ANOMALIE: Le role_id dans users (${userData.role_id}) est différent de celui dans la jointure (${userData.role_id_from_join})`);
    }
    
    // Construire l'objet utilisateur avec des informations de rôle correctes
    const user = {
      ...userData,
      role: userData.role_nom ? {
        id: userData.role_id_from_join || userData.role_id,
        nom: userData.role_nom,
        description: userData.role_description,
        role_type: userData.role_nom
      } : {
        id: null,
        nom: 'undefined',
        role_type: 'undefined',
        description: 'Rôle indéfini'
      }
    };
    
    // Ajouter l'utilisateur à l'objet request pour y accéder dans les routes
    req.user = user;
    
    // Log complet de l'objet utilisateur construit
    logger.info(`Objet utilisateur final construit:`);
    logger.info(`- ID: ${user.id}`);
    logger.info(`- Email: ${user.mail}`);
    logger.info(`- Role.id: ${user.role?.id}`);
    logger.info(`- Role.nom: ${user.role?.nom}`);
    logger.info(`- Role.role_type: ${user.role?.role_type}`);
    logger.info(`- Role.description: ${user.role?.description}`);
    logger.important(`Utilisateur ${user.mail} authentifié avec le rôle: ${user.role?.nom || 'Non défini'}`);
    logger.info(`====== FIN DÉBOGAGE AUTHENTIFICATION ======`);
    
    // Passer au middleware suivant
    next();
  } catch (error) {
    logger.error(`Erreur d'authentification: ${error.message}`);
    logger.error(error.stack);
    res.status(500).json({
      error: 'Erreur serveur',
      message: 'Une erreur est survenue lors de l\'authentification'
    });
  }
};