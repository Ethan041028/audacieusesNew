const { Op } = require('sequelize');
const { Evenement, User, Seance } = require('../models');
const logger = require('../utils/logger');
const errorHandler = require('../utils/errorHandler');

/**
 * Récupérer tous les événements
 * @param {Object} req - Requête Express
 * @param {Object} res - Réponse Express
 */
exports.getAllEvenements = async (req, res) => {
  try {
    // Extraire les paramètres de filtre
    const { debut, fin, type } = req.query;
    
    // Construire les conditions de recherche
    const whereConditions = {};
    
    if (debut && fin) {
      whereConditions.date_debut = {
        [Op.between]: [new Date(debut), new Date(fin)]
      };
    } else if (debut) {
      whereConditions.date_debut = {
        [Op.gte]: new Date(debut)
      };
    } else if (fin) {
      whereConditions.date_debut = {
        [Op.lte]: new Date(fin)
      };
    }
    
    if (type) {
      whereConditions.type = type;
    }
    
    // Ne renvoyer que les événements publics ou ceux créés par l'utilisateur
    // à moins que l'utilisateur ne soit un administrateur
    const user = req.user;
    if (user.role.role_type !== 'admin') {
      whereConditions[Op.or] = [
        { prive: false },
        { createur_id: user.id }
      ];
    }
    
    const evenements = await Evenement.findAll({
      where: whereConditions,
      include: [
        {
          model: User,
          as: 'createur',
          attributes: ['id', 'prenom', 'nom', 'email']
        },
        {
          model: User,
          as: 'participants',
          attributes: ['id', 'prenom', 'nom', 'email'],
          through: { attributes: [] }
        },
        {
          model: Seance,
          as: 'seance',
          attributes: ['id', 'titre', 'description']
        }
      ],
      order: [['date_debut', 'ASC']]
    });
    
    res.status(200).json({
      status: 'success',
      count: evenements.length,
      evenements
    });
  } catch (error) {
    logger.error(`Erreur lors de la récupération des événements: ${error.message}`);
    errorHandler(res, error);
  }
};

/**
 * Récupérer un événement par son ID
 * @param {Object} req - Requête Express
 * @param {Object} res - Réponse Express
 */
exports.getEvenementById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const evenement = await Evenement.findByPk(id, {
      include: [
        {
          model: User,
          as: 'createur',
          attributes: ['id', 'prenom', 'nom', 'email']
        },
        {
          model: User,
          as: 'participants',
          attributes: ['id', 'prenom', 'nom', 'email'],
          through: { attributes: [] }
        },
        {
          model: Seance,
          as: 'seance',
          attributes: ['id', 'titre', 'description']
        }
      ]
    });
    
    if (!evenement) {
      return res.status(404).json({
        status: 'error',
        message: `Événement avec l'ID ${id} non trouvé`
      });
    }
    
    // Vérifier si l'utilisateur a accès à cet événement
    const user = req.user;
    if (user.role.role_type !== 'admin' && evenement.prive && evenement.createur_id !== user.id) {
      const isParticipant = evenement.participants.some(p => p.id === user.id);
      
      if (!isParticipant) {
        return res.status(403).json({
          status: 'error',
          message: "Vous n'avez pas l'autorisation d'accéder à cet événement"
        });
      }
    }
    
    res.status(200).json({
      status: 'success',
      evenement
    });
  } catch (error) {
    logger.error(`Erreur lors de la récupération de l'événement: ${error.message}`);
    errorHandler(res, error);
  }
};

/**
 * Créer un nouvel événement
 * @param {Object} req - Requête Express
 * @param {Object} res - Réponse Express
 */
exports.createEvenement = async (req, res) => {
  try {
    const {
      titre,
      description,
      date_debut,
      date_fin,
      lieu,
      type,
      statut,
      rappel,
      temps_rappel,
      couleur,
      prive,
      seance_id,
      participants
    } = req.body;
    
    // Créer l'événement
    const nouvelEvenement = await Evenement.create({
      titre,
      description,
      date_debut,
      date_fin,
      lieu,
      type,
      statut: statut || 'planifie',
      rappel: rappel || false,
      temps_rappel: temps_rappel || 15,
      couleur: couleur || '#3788d8',
      prive: prive || false,
      seance_id,
      createur_id: req.user.id
    });
    
    // Si des participants sont spécifiés, les ajouter
    if (participants && participants.length > 0) {
      const participantsUsers = await User.findAll({
        where: { id: { [Op.in]: participants } }
      });
      
      await nouvelEvenement.addParticipants(participantsUsers);
    }
    
    // Récupérer l'événement créé avec ses relations
    const evenementCree = await Evenement.findByPk(nouvelEvenement.id, {
      include: [
        {
          model: User,
          as: 'createur',
          attributes: ['id', 'prenom', 'nom', 'email']
        },
        {
          model: User,
          as: 'participants',
          attributes: ['id', 'prenom', 'nom', 'email'],
          through: { attributes: [] }
        },
        {
          model: Seance,
          as: 'seance',
          attributes: ['id', 'titre', 'description']
        }
      ]
    });
    
    res.status(201).json({
      status: 'success',
      message: 'Événement créé avec succès',
      evenement: evenementCree
    });
  } catch (error) {
    logger.error(`Erreur lors de la création de l'événement: ${error.message}`);
    errorHandler(res, error);
  }
};

/**
 * Mettre à jour un événement
 * @param {Object} req - Requête Express
 * @param {Object} res - Réponse Express
 */
exports.updateEvenement = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      titre,
      description,
      date_debut,
      date_fin,
      lieu,
      type,
      statut,
      rappel,
      temps_rappel,
      couleur,
      prive,
      seance_id,
      participants
    } = req.body;
    
    // Récupérer l'événement
    const evenement = await Evenement.findByPk(id, {
      include: [
        {
          model: User,
          as: 'participants',
          through: { attributes: [] }
        }
      ]
    });
    
    if (!evenement) {
      return res.status(404).json({
        status: 'error',
        message: `Événement avec l'ID ${id} non trouvé`
      });
    }
    
    // Vérifier si l'utilisateur a le droit de modifier cet événement
    const user = req.user;
    if (user.role.role_type !== 'admin' && evenement.createur_id !== user.id) {
      return res.status(403).json({
        status: 'error',
        message: "Vous n'avez pas l'autorisation de modifier cet événement"
      });
    }
    
    // Mettre à jour l'événement
    await evenement.update({
      titre: titre !== undefined ? titre : evenement.titre,
      description: description !== undefined ? description : evenement.description,
      date_debut: date_debut !== undefined ? date_debut : evenement.date_debut,
      date_fin: date_fin !== undefined ? date_fin : evenement.date_fin,
      lieu: lieu !== undefined ? lieu : evenement.lieu,
      type: type !== undefined ? type : evenement.type,
      statut: statut !== undefined ? statut : evenement.statut,
      rappel: rappel !== undefined ? rappel : evenement.rappel,
      temps_rappel: temps_rappel !== undefined ? temps_rappel : evenement.temps_rappel,
      couleur: couleur !== undefined ? couleur : evenement.couleur,
      prive: prive !== undefined ? prive : evenement.prive,
      seance_id: seance_id !== undefined ? seance_id : evenement.seance_id
    });
    
    // Si la liste des participants est fournie, la mettre à jour
    if (participants) {
      const participantsUsers = await User.findAll({
        where: { id: { [Op.in]: participants } }
      });
      
      // Remplacer tous les participants actuels
      await evenement.setParticipants(participantsUsers);
    }
    
    // Récupérer l'événement mis à jour avec ses relations
    const evenementMisAJour = await Evenement.findByPk(id, {
      include: [
        {
          model: User,
          as: 'createur',
          attributes: ['id', 'prenom', 'nom', 'email']
        },
        {
          model: User,
          as: 'participants',
          attributes: ['id', 'prenom', 'nom', 'email'],
          through: { attributes: [] }
        },
        {
          model: Seance,
          as: 'seance',
          attributes: ['id', 'titre', 'description']
        }
      ]
    });
    
    res.status(200).json({
      status: 'success',
      message: 'Événement mis à jour avec succès',
      evenement: evenementMisAJour
    });
  } catch (error) {
    logger.error(`Erreur lors de la mise à jour de l'événement: ${error.message}`);
    errorHandler(res, error);
  }
};

/**
 * Supprimer un événement
 * @param {Object} req - Requête Express
 * @param {Object} res - Réponse Express
 */
exports.deleteEvenement = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Récupérer l'événement
    const evenement = await Evenement.findByPk(id);
    
    if (!evenement) {
      return res.status(404).json({
        status: 'error',
        message: `Événement avec l'ID ${id} non trouvé`
      });
    }
    
    // Vérifier si l'utilisateur a le droit de supprimer cet événement
    const user = req.user;
    if (user.role.role_type !== 'admin' && evenement.createur_id !== user.id) {
      return res.status(403).json({
        status: 'error',
        message: "Vous n'avez pas l'autorisation de supprimer cet événement"
      });
    }
    
    // Supprimer l'événement
    await evenement.destroy();
    
    res.status(200).json({
      status: 'success',
      message: 'Événement supprimé avec succès'
    });
  } catch (error) {
    logger.error(`Erreur lors de la suppression de l'événement: ${error.message}`);
    errorHandler(res, error);
  }
};

/**
 * Récupérer les événements d'un utilisateur
 * @param {Object} req - Requête Express
 * @param {Object} res - Réponse Express
 */
exports.getUserEvenements = async (req, res) => {
  try {
    const { userId } = req.params;
    
    // Vérifier si l'utilisateur a accès aux événements de cet utilisateur
    const user = req.user;
    if (user.role.role_type !== 'admin' && parseInt(userId) !== user.id) {
      return res.status(403).json({
        status: 'error',
        message: "Vous n'avez pas l'autorisation d'accéder aux événements de cet utilisateur"
      });
    }
    
    // Événements créés par l'utilisateur
    const evenementsCreateur = await Evenement.findAll({
      where: { createur_id: userId },
      include: [
        {
          model: User,
          as: 'createur',
          attributes: ['id', 'prenom', 'nom', 'email']
        },
        {
          model: User,
          as: 'participants',
          attributes: ['id', 'prenom', 'nom', 'email'],
          through: { attributes: [] }
        },
        {
          model: Seance,
          as: 'seance',
          attributes: ['id', 'titre', 'description']
        }
      ],
      order: [['date_debut', 'ASC']]
    });
    
    // Événements où l'utilisateur est participant
    const utilisateur = await User.findByPk(userId, {
      include: [
        {
          model: Evenement,
          as: 'evenementsParticipant',
          include: [
            {
              model: User,
              as: 'createur',
              attributes: ['id', 'prenom', 'nom', 'email']
            },
            {
              model: User,
              as: 'participants',
              attributes: ['id', 'prenom', 'nom', 'email'],
              through: { attributes: [] }
            },
            {
              model: Seance,
              as: 'seance',
              attributes: ['id', 'titre', 'description']
            }
          ]
        }
      ]
    });
    
    const evenementsParticipant = utilisateur.evenementsParticipant || [];
    
    res.status(200).json({
      status: 'success',
      evenementsCreateur,
      evenementsParticipant
    });
  } catch (error) {
    logger.error(`Erreur lors de la récupération des événements de l'utilisateur: ${error.message}`);
    errorHandler(res, error);
  }
};

/**
 * Récupérer les rappels d'événements pour l'utilisateur connecté
 * @param {Object} req - Requête Express
 * @param {Object} res - Réponse Express
 */
exports.getUserRappels = async (req, res) => {
  try {
    const user = req.user;
    const maintenant = new Date();
    const finPeriode = new Date();
    finPeriode.setDate(finPeriode.getDate() + 7); // Récupérer les rappels pour la semaine à venir
    
    // Événements créés par l'utilisateur avec rappel activé
    const evenementsCreateur = await Evenement.findAll({
      where: {
        createur_id: user.id,
        rappel: true,
        date_debut: {
          [Op.between]: [maintenant, finPeriode]
        }
      },
      include: [
        {
          model: User,
          as: 'createur',
          attributes: ['id', 'prenom', 'nom', 'email']
        },
        {
          model: Seance,
          as: 'seance',
          attributes: ['id', 'titre', 'description']
        }
      ],
      order: [['date_debut', 'ASC']]
    });
    
    // Événements où l'utilisateur est participant avec rappel activé
    const utilisateur = await User.findByPk(user.id, {
      include: [
        {
          model: Evenement,
          as: 'evenementsParticipant',
          where: {
            rappel: true,
            date_debut: {
              [Op.between]: [maintenant, finPeriode]
            }
          },
          include: [
            {
              model: User,
              as: 'createur',
              attributes: ['id', 'prenom', 'nom', 'email']
            },
            {
              model: Seance,
              as: 'seance',
              attributes: ['id', 'titre', 'description']
            }
          ]
        }
      ]
    });
    
    const evenementsParticipant = utilisateur ? utilisateur.evenementsParticipant || [] : [];
    
    // Combiner les deux types de rappels et les trier par date
    const rappels = [...evenementsCreateur, ...evenementsParticipant].sort((a, b) => {
      return new Date(a.date_debut) - new Date(b.date_debut);
    });
    
    res.status(200).json({
      status: 'success',
      count: rappels.length,
      rappels
    });
  } catch (error) {
    logger.error(`Erreur lors de la récupération des rappels: ${error.message}`);
    errorHandler(res, error);
  }
};

/**
 * Ajouter un participant à un événement
 * @param {Object} req - Requête Express
 * @param {Object} res - Réponse Express
 */
exports.addParticipant = async (req, res) => {
  try {
    const { evenementId, userId } = req.params;
    
    // Récupérer l'événement
    const evenement = await Evenement.findByPk(evenementId, {
      include: [
        {
          model: User,
          as: 'participants',
          through: { attributes: [] }
        }
      ]
    });
    
    if (!evenement) {
      return res.status(404).json({
        status: 'error',
        message: `Événement avec l'ID ${evenementId} non trouvé`
      });
    }
    
    // Vérifier si l'utilisateur a le droit de modifier cet événement
    const user = req.user;
    if (user.role.role_type !== 'admin' && evenement.createur_id !== user.id) {
      return res.status(403).json({
        status: 'error',
        message: "Vous n'avez pas l'autorisation de modifier les participants de cet événement"
      });
    }
    
    // Vérifier si l'utilisateur existe
    const participantUser = await User.findByPk(userId);
    if (!participantUser) {
      return res.status(404).json({
        status: 'error',
        message: `Utilisateur avec l'ID ${userId} non trouvé`
      });
    }
    
    // Vérifier si l'utilisateur est déjà participant
    const isParticipant = evenement.participants.some(p => p.id === parseInt(userId));
    if (isParticipant) {
      return res.status(400).json({
        status: 'error',
        message: `L'utilisateur avec l'ID ${userId} est déjà participant à cet événement`
      });
    }
    
    // Ajouter l'utilisateur comme participant
    await evenement.addParticipant(participantUser);
    
    // Récupérer l'événement mis à jour
    const evenementMisAJour = await Evenement.findByPk(evenementId, {
      include: [
        {
          model: User,
          as: 'participants',
          attributes: ['id', 'prenom', 'nom', 'email'],
          through: { attributes: [] }
        }
      ]
    });
    
    res.status(200).json({
      status: 'success',
      message: 'Participant ajouté avec succès',
      participants: evenementMisAJour.participants
    });
  } catch (error) {
    logger.error(`Erreur lors de l'ajout d'un participant: ${error.message}`);
    errorHandler(res, error);
  }
};

/**
 * Supprimer un participant d'un événement
 * @param {Object} req - Requête Express
 * @param {Object} res - Réponse Express
 */
exports.removeParticipant = async (req, res) => {
  try {
    const { evenementId, userId } = req.params;
    
    // Récupérer l'événement
    const evenement = await Evenement.findByPk(evenementId, {
      include: [
        {
          model: User,
          as: 'participants',
          through: { attributes: [] }
        }
      ]
    });
    
    if (!evenement) {
      return res.status(404).json({
        status: 'error',
        message: `Événement avec l'ID ${evenementId} non trouvé`
      });
    }
    
    // Vérifier si l'utilisateur a le droit de modifier cet événement
    const user = req.user;
    const isUserParticipant = parseInt(userId) === user.id;
    
    if (user.role.role_type !== 'admin' && evenement.createur_id !== user.id && !isUserParticipant) {
      return res.status(403).json({
        status: 'error',
        message: "Vous n'avez pas l'autorisation de modifier les participants de cet événement"
      });
    }
    
    // Vérifier si l'utilisateur existe
    const participantUser = await User.findByPk(userId);
    if (!participantUser) {
      return res.status(404).json({
        status: 'error',
        message: `Utilisateur avec l'ID ${userId} non trouvé`
      });
    }
    
    // Vérifier si l'utilisateur est participant
    const isParticipant = evenement.participants.some(p => p.id === parseInt(userId));
    if (!isParticipant) {
      return res.status(400).json({
        status: 'error',
        message: `L'utilisateur avec l'ID ${userId} n'est pas participant à cet événement`
      });
    }
    
    // Supprimer l'utilisateur des participants
    await evenement.removeParticipant(participantUser);
    
    // Récupérer l'événement mis à jour
    const evenementMisAJour = await Evenement.findByPk(evenementId, {
      include: [
        {
          model: User,
          as: 'participants',
          attributes: ['id', 'prenom', 'nom', 'email'],
          through: { attributes: [] }
        }
      ]
    });
    
    res.status(200).json({
      status: 'success',
      message: 'Participant supprimé avec succès',
      participants: evenementMisAJour.participants
    });
  } catch (error) {
    logger.error(`Erreur lors de la suppression d'un participant: ${error.message}`);
    errorHandler(res, error);
  }
};