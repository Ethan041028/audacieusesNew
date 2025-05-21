const winston = require('winston');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

// Définir le niveau de log par défaut en fonction de l'environnement
const defaultLogLevel = process.env.NODE_ENV === 'production' ? 'error' : 'debug';
// Utiliser le niveau de log spécifié dans les variables d'environnement ou la valeur par défaut
const logLevel = process.env.LOG_LEVEL || defaultLogLevel;

// Configuration des niveaux et couleurs personnalisés
const levels = {
  error: 0,
  warn: 1,
  info: 2,
  debug: 3,
};

const colors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  debug: 'blue',
};

// Ajouter les couleurs à winston
winston.addColors(colors);

// Format personnalisé pour les logs
const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.printf(({ timestamp, level, message }) => {
    return `[${timestamp}] ${level.toUpperCase()}: ${message}`;
  })
);

// Création du répertoire de logs s'il n'existe pas
const logDir = path.join(__dirname, '../../logs');
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir);
}

// Créer le logger avec la configuration
const logger = winston.createLogger({
  levels,
  format: logFormat,
  transports: [
    // Log tous les niveaux dans un fichier combiné
    new winston.transports.File({
      filename: path.join(logDir, 'combined.log'),
      level: logLevel,
      maxsize: 10485760, // 10 Mo
      maxFiles: 5,
      tailable: true
    }),
    // Log séparé pour les erreurs uniquement
    new winston.transports.File({
      filename: path.join(logDir, 'error.log'),
      level: 'error',
      maxsize: 10485760, // 10 Mo
      maxFiles: 5
    }),
    // Logs de débogage plus détaillés (seulement en non-production)
    ...(process.env.NODE_ENV !== 'production' ? [
      new winston.transports.File({
        filename: path.join(logDir, 'debug.log'),
        level: 'debug',
        maxsize: 15728640, // 15 Mo
        maxFiles: 2
      })
    ] : []),
    // Console en développement
    new winston.transports.Console({
      level: logLevel,
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.printf(({ timestamp, level, message }) => {
          return `[${timestamp}] ${level}: ${message}`;
        })
      )
    })
  ],
  exceptionHandlers: [
    new winston.transports.File({ 
      filename: path.join(logDir, 'exceptions.log'),
      maxsize: 10485760, // 10 Mo
      maxFiles: 5
    }),
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.printf(({ timestamp, level, message }) => {
          return `[${timestamp}] ${level}: ${message}`;
        })
      )
    })
  ],
  rejectionHandlers: [
    new winston.transports.File({ 
      filename: path.join(logDir, 'rejections.log'),
      maxsize: 10485760, // 10 Mo
      maxFiles: 5
    }),
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.printf(({ timestamp, level, message }) => {
          return `[${timestamp}] ${level}: ${message}`;
        })
      )
    })
  ]
});

// Configuration pour le développement
if (process.env.NODE_ENV !== 'production') {
  logger.debug(
    'Journalisation initialisée en mode développement'
  );
}

// Méthode pour journaliser les requêtes HTTP avec des informations détaillées
logger.logHttpRequest = (req, res, responseTime) => {
  const { method, originalUrl, ip, user } = req;
  const statusCode = res.statusCode;
  const userInfo = user ? `User: ${user.id} (${user.email})` : 'Anonymous';
  
  logger.info(
    `[HTTP] ${method} ${originalUrl} ${statusCode} ${responseTime}ms - ${ip} - ${userInfo}`
  );
};

// Méthode utilitaire pour les logs importants (surligné dans le fichier et la console)
logger.important = function(message) {
  const highlightedMessage = `\n========== IMPORTANT ==========\n${message}\n==============================\n`;
  this.info(highlightedMessage);
};

module.exports = logger;