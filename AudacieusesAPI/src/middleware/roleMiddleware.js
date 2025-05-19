const logger = require('../utils/logger');

// Middleware de vérification des rôles
exports.checkRole = (requiredRoles) => {
  return (req, res, next) => {
    try {
      // Logger les infos de l'utilisateur pour le débogage
      logger.info(`[checkRole] Vérification des rôles pour l'utilisateur ID=${req.user?.id}, Rôle=${JSON.stringify(req.user?.role)}`);
      
      // L'utilisateur doit être authentifié (middleware authenticate déjà passé)
      if (!req.user || !req.user.role) {
        logger.warn(`[checkRole] Utilisateur non authentifié ou sans rôle défini`);
        return res.status(403).json({
          error: 'Accès refusé',
          message: 'Vous n\'avez pas les autorisations nécessaires'
        });
      }

      // Vérifier si le rôle de l'utilisateur est dans la liste des rôles requis
      // Vérifier par le nom du rôle (champ 'nom' de la table roles)
      let hasAccess = false;

      if (Array.isArray(requiredRoles)) {
        // Vérifier si le nom du rôle est dans la liste des rôles requis
        hasAccess = requiredRoles.some(role => 
          req.user.role.nom === role || 
          req.user.role.nom === 'admin' || 
          req.user.role.nom === 'admin_plus' || 
          req.user.role.nom === 'adminplus'
        );
        
        logger.info(`[checkRole] Rôles requis: ${requiredRoles.join(', ')}, Rôle utilisateur (nom): ${req.user.role.nom}, Accès accordé: ${hasAccess}`);
      } else {
        // Si un seul rôle est requis
        hasAccess = req.user.role.nom === requiredRoles || 
                    req.user.role.nom === 'admin' || 
                    req.user.role.nom === 'admin_plus' || 
                    req.user.role.nom === 'adminplus';
                    
        logger.info(`[checkRole] Rôle requis: ${requiredRoles}, Rôle utilisateur (nom): ${req.user.role.nom}, Accès accordé: ${hasAccess}`);
      }

      if (hasAccess) {
        logger.info(`[checkRole] Accès accordé à l'utilisateur ${req.user.id}`);
        next();
      } else {
        logger.warn(`[checkRole] Accès refusé à l'utilisateur ${req.user.id} avec le rôle '${req.user.role.nom}'`);
        res.status(403).json({
          error: 'Accès refusé',
          message: 'Vous n\'avez pas les autorisations nécessaires'
        });
      }
    } catch (error) {
      logger.error(`[checkRole] Erreur: ${error.message}`);
      logger.error(error.stack);
      res.status(500).json({
        error: 'Erreur serveur',
        message: 'Une erreur est survenue lors de la vérification des autorisations'
      });
    }
  };
};

// Middleware spécifique pour les administrateurs
exports.isAdmin = (req, res, next) => {
  try {
    // Logger les infos de l'utilisateur pour le débogage
    logger.info(`[isAdmin] Vérification du rôle admin pour l'utilisateur ID=${req.user?.id}, Rôle=${JSON.stringify(req.user?.role)}`);
    
    // L'utilisateur doit être authentifié
    if (!req.user || !req.user.role) {
      logger.warn(`[isAdmin] Utilisateur non authentifié ou sans rôle défini`);
      return res.status(403).json({
        error: 'Accès refusé',
        message: 'Vous n\'avez pas les autorisations nécessaires'
      });
    }
    
    // Vérifier si l'utilisateur a un rôle d'administrateur
    const userRoleName = req.user.role.nom;
    
    logger.info(`[isAdmin] Rôle utilisateur détecté: nom=${userRoleName}`);
    
    // Liste des rôles considérés comme administrateurs
    const adminRoleNames = ['admin', 'administrateur', 'admin_plus', 'adminplus', 'super_admin'];
    
    const isAdmin = adminRoleNames.includes(userRoleName);
    
    if (!isAdmin) {
      logger.warn(`[isAdmin] Tentative d'accès admin non autorisé: Utilisateur ${req.user.id} avec rôle nom=${userRoleName}`);
      
      return res.status(403).json({
        error: 'Accès refusé',
        message: 'Cette fonctionnalité est réservée aux administrateurs'
      });
    }
    
    // L'utilisateur est admin, continuer
    logger.info(`[isAdmin] Accès admin autorisé pour l'utilisateur ${req.user.id}`);
    next();
  } catch (error) {
    logger.error(`[isAdmin] Erreur de vérification du rôle admin: ${error.message}`);
    logger.error(error.stack);
    res.status(500).json({
      error: 'Erreur serveur',
      message: 'Une erreur est survenue lors de la vérification des autorisations'
    });
  }
};