const logger = require('./logger');

/**
 * Classe pour la gestion standardisée des erreurs API
 */
class ApiError extends Error {
  constructor(statusCode, message, source = null, details = null) {
    super(message);
    this.statusCode = statusCode;
    this.source = source;
    this.details = details;
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }

  static badRequest(message, source = null, details = null) {
    return new ApiError(400, message || 'Requête invalide', source, details);
  }

  static unauthorized(message, source = null, details = null) {
    return new ApiError(401, message || 'Non autorisé', source, details);
  }

  static forbidden(message, source = null, details = null) {
    return new ApiError(403, message || 'Accès interdit', source, details);
  }

  static notFound(message, source = null, details = null) {
    return new ApiError(404, message || 'Ressource non trouvée', source, details);
  }

  static conflict(message, source = null, details = null) {
    return new ApiError(409, message || 'Conflit avec l\'état actuel', source, details);
  }
  
  static validation(message, source = null, details = null) {
    return new ApiError(422, message || 'Validation échouée', source, details);
  }

  static internal(message, source = null, details = null) {
    return new ApiError(500, message || 'Erreur interne du serveur', source, details);
  }
}

/**
 * Middleware pour la gestion centralisée des erreurs
 */
const errorHandler = (err, req, res, next) => {
  let error = err;
  
  // Si ce n'est pas déjà une ApiError, la convertir
  if (!(error instanceof ApiError)) {
    // Les erreurs Sequelize
    if (error.name === 'SequelizeValidationError') {
      const details = error.errors.map(e => ({
        field: e.path,
        message: e.message,
        value: e.value
      }));
      error = ApiError.validation('Erreur de validation Sequelize', 'database', details);
    } 
    // Erreurs de JWT
    else if (error.name === 'JsonWebTokenError') {
      error = ApiError.unauthorized('Jeton d\'authentification invalide', 'jwt');
    }
    else if (error.name === 'TokenExpiredError') {
      error = ApiError.unauthorized('Jeton d\'authentification expiré', 'jwt');
    }
    // Autre erreur non gérée
    else {
      error = ApiError.internal(error.message || 'Une erreur inattendue s\'est produite');
    }
  }

  // Journaliser l'erreur
  if (error.statusCode >= 500) {
    logger.error(`[${error.statusCode}] ${error.message}`, { 
      stack: error.stack,
      source: error.source,
      details: error.details
    });
  } else {
    logger.warn(`[${error.statusCode}] ${error.message}`, {
      source: error.source,
      details: error.details
    });
  }

  // Réponse client formatée
  const response = {
    success: false,
    error: {
      code: error.statusCode,
      message: error.message
    }
  };

  // Ajouter les détails en mode développement ou pour les erreurs de validation
  if (process.env.NODE_ENV !== 'production' || error.statusCode === 422) {
    response.error.details = error.details;
    response.error.source = error.source;
    
    if (process.env.NODE_ENV !== 'production') {
      response.error.stack = error.stack;
    }
  }

  return res.status(error.statusCode).json(response);
};

module.exports = {
  ApiError,
  errorHandler
};