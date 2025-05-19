/**
 * Configuration Socket.IO pour les notifications en temps réel
 * 
 * Ce module configure Socket.IO pour permettre les communications en temps réel
 * entre le serveur et les clients. Il est utilisé pour:
 * - Les notifications de nouveaux messages
 * - Les alertes de nouvelles séances
 * - Les mises à jour des statuts de participation aux modules
 * - Les notifications d'événements
 */
const socketIo = require('socket.io');
const jwt = require('jsonwebtoken');
const logger = require('../utils/logger');
const jwtConfig = require('./jwt');

let io;

/**
 * Initialise Socket.IO avec le serveur HTTP
 * @param {Object} server - Le serveur HTTP
 * @returns {Object} L'instance Socket.IO
 */
function init(server) {
  io = socketIo(server, {
    cors: {
      origin: process.env.CLIENT_URL || 'http://localhost:4200',
      methods: ['GET', 'POST'],
      credentials: true
    }
  });
  // Middleware d'authentification pour Socket.IO
  io.use((socket, next) => {
    try {
      const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.split(' ')[1];
      
      // Si aucun token n'est fourni, permettre quand même la connexion mais avec des droits limités
      if (!token) {
        logger.warn(`Connexion socket sans authentification: ${socket.id}`);
        socket.userId = null;
        return next();
      }

      // Vérifier le token JWT
      const decoded = jwt.verify(token, jwtConfig.JWT_SECRET);
      socket.userId = decoded.id;
      return next();
    } catch (error) {
      logger.error(`Erreur d'authentification socket: ${error.message}`);
      socket.userId = null;
      return next(); // Permettre quand même la connexion mais avec des droits limités
    }
  });
  io.on('connection', (socket) => {
    logger.info(`Nouvelle connexion socket: ${socket.id} pour l'utilisateur ${socket.userId || 'anonyme'}`);
      // Rejoindre automatiquement la salle privée de l'utilisateur si authentifié
    if (socket.userId) {
      socket.join(`user-${socket.userId}`);
    }
    
    // Gérer l'événement join-user-room
    socket.on('join-user-room', (userId) => {
      socket.join(`user-${userId}`);
      logger.info(`Utilisateur ${socket.userId || 'anonyme'} a rejoint sa salle utilisateur ${userId}`);
    });
    
    // Rejoindre une salle de module
    socket.on('join-module-room', (moduleId) => {
      socket.join(`module-${moduleId}`);
      logger.info(`Utilisateur ${socket.userId || 'anonyme'} a rejoint la salle du module ${moduleId}`);
    });

    // Rejoindre une salle de séance
    socket.on('join-seance-room', (seanceId) => {
      socket.join(`seance-${seanceId}`);
      logger.info(`Utilisateur ${socket.userId || 'anonyme'} a rejoint la salle de la séance ${seanceId}`);
    });

    // Gestion des messages en temps réel
    socket.on('send-message', (data) => {
      // Vérifier que l'utilisateur est authentifié avant d'envoyer un message
      if (!socket.userId) {
        socket.emit('error', { message: 'Vous devez être authentifié pour envoyer des messages' });
        return;
      }
      
      // Le message sera relayé aux membres de la salle appropriée
      const roomId = data.moduleId ? `module-${data.moduleId}` : `seance-${data.seanceId}`;
      socket.to(roomId).emit('new-message', {
        senderId: socket.userId,
        ...data
      });
      logger.info(`Message envoyé à la salle ${roomId} par l'utilisateur ${socket.userId}`);
    });

    socket.on('disconnect', () => {
      logger.info(`Socket déconnecté: ${socket.id}`);
    });
  });

  return io;
}

/**
 * Renvoie l'instance Socket.IO
 * @returns {Object} L'instance Socket.IO
 */
function getIO() {
  if (!io) {
    throw new Error('Socket.IO n\'a pas été initialisé!');
  }
  return io;
}

/**
 * Envoie une notification à un utilisateur spécifique
 * @param {number} userId - L'ID de l'utilisateur
 * @param {string} type - Le type de notification (message, seance, evenement)
 * @param {Object} data - Les données de la notification
 */
function notifyUser(userId, type, data) {
  if (!io) {
    logger.error('Socket.IO n\'est pas initialisé pour l\'envoi de notification');
    return;
  }
  
  io.to(`user-${userId}`).emit(`notification-${type}`, data);
  logger.info(`Notification ${type} envoyée à l'utilisateur ${userId}`);
}

/**
 * Envoie une notification à tous les membres d'un module
 * @param {number} moduleId - L'ID du module
 * @param {string} type - Le type de notification
 * @param {Object} data - Les données de la notification
 */
function notifyModule(moduleId, type, data) {
  if (!io) {
    logger.error('Socket.IO n\'est pas initialisé pour l\'envoi de notification au module');
    return;
  }
  
  io.to(`module-${moduleId}`).emit(`module-${type}`, data);
  logger.info(`Notification ${type} envoyée aux membres du module ${moduleId}`);
}

module.exports = {
  init,
  getIO,
  notifyUser,
  notifyModule
};