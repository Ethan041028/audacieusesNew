const express = require('express');
const { check, validationResult } = require('express-validator');
const { authenticate } = require('../middleware/authMiddleware');
const { checkRole } = require('../middleware/roleMiddleware');
const { handleModuleImageUpload } = require('../middleware/uploadMiddleware');
const ModuleController = require('../controllers/moduleController');
const router = express.Router();
const { Module, User, Seance, Suivi, StatusSuivi, sequelize } = require('../models'); // Ajout des modèles nécessaires
const socketIO = require('../config/socketio'); // Ajout de l'importation Socket.IO
const logger = require('../utils/logger'); // Ajout de l'importation du logger

/**
 * @swagger
 * tags:
 *   name: Modules
 *   description: Gestion des modules de formation
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     Module:
 *       type: object
 *       required:
 *         - titre
 *         - description
 *         - niveau
 *         - duree
 *       properties:
 *         id:
 *           type: integer
 *           description: L'identifiant unique du module
 *         titre:
 *           type: string
 *           description: Le titre du module
 *         description:
 *           type: string
 *           description: La description détaillée du module
 *         image_url:
 *           type: string
 *           description: URL de l'image du module
 *         niveau:
 *           type: string
 *           enum: [Débutant, Intermédiaire, Avancé]
 *           description: Le niveau de difficulté du module
 *         duree:
 *           type: integer
 *           description: La durée du module en heures
 *         objectifs:
 *           type: array
 *           items:
 *             type: string
 *           description: Liste des objectifs d'apprentissage
 *         createdAt:
 *           type: string
 *           format: date-time
 *           description: Date de création du module
 *         updatedAt:
 *           type: string
 *           format: date-time
 *           description: Date de dernière mise à jour du module
 */

/**
 * @swagger
 * /api/modules:
 *   get:
 *     summary: Récupérer tous les modules
 *     tags: [Modules]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *         description: Numéro de page pour la pagination
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *         description: Nombre d'éléments par page
 *       - in: query
 *         name: niveau
 *         schema:
 *           type: string
 *           enum: [Débutant, Intermédiaire, Avancé]
 *         description: Filtrer par niveau de difficulté
 *     responses:
 *       200:
 *         description: Liste des modules avec pagination
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 modules:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Module'
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     totalItems:
 *                       type: integer
 *                     totalPages:
 *                       type: integer
 *                     currentPage:
 *                       type: integer
 *       401:
 *         description: Non autorisé
 *       500:
 *         description: Erreur serveur
 */
router.get('/', authenticate, ModuleController.getAllModules);

/**
 * @swagger
 * /api/modules/assign-bulk:
 *   post:
 *     summary: Attribuer un module à plusieurs utilisateurs
 *     tags: [Modules]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - moduleId
 *               - userIds
 *             properties:
 *               moduleId:
 *                 type: integer
 *                 description: ID du module à attribuer
 *               userIds:
 *                 type: array
 *                 items:
 *                   type: integer
 *                 description: Liste des IDs d'utilisateurs
 *     responses:
 *       200:
 *         description: Module attribué aux utilisateurs avec succès
 *       400:
 *         description: Données invalides
 *       401:
 *         description: Non autorisé
 *       403:
 *         description: Accès interdit (rôle requis)
 *       404:
 *         description: Module ou utilisateur non trouvé
 *       500:
 *         description: Erreur serveur
 */
router.post('/assign-bulk',
  authenticate,
  checkRole(['admin', 'admin_plus']),
  [
    check('moduleId').isInt().withMessage('moduleId doit être un entier'),
    check('userIds').isArray().withMessage('userIds doit être un tableau')
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { moduleId, userIds } = req.body;

      // Vérifier si le module existe
      const module = await Module.findByPk(moduleId);
      if (!module) {
        return res.status(404).json({
          error: 'Module non trouvé',
          message: 'Le module demandé n\'existe pas'
        });
      }

      const successfulAssignments = [];
      const failedAssignments = [];

      // Attribuer le module à chaque utilisateur
      for (const userId of userIds) {
        try {
          // Vérifier si l'utilisateur existe
          const user = await User.findByPk(userId);
          if (!user) {
            failedAssignments.push({
              userId,
              reason: 'Utilisateur non trouvé'
            });
            continue;
          }

          // Attribuer le module à l'utilisateur
          await user.addModule(module);
          
          // Envoyer une notification à l'utilisateur
          try {
            const io = socketIO.getIO();
            io.to(`user-${userId}`).emit('module-assigned', {
              module: {
                id: module.id,
                titre: module.titre,
                description: module.description
              },
              message: `Le module "${module.titre}" vous a été attribué`
            });
          } catch (socketError) {
            logger.error(`Erreur lors de l'envoi de la notification: ${socketError.message}`);
          }

          successfulAssignments.push(userId);
          logger.info(`Module ${moduleId} attribué à l'utilisateur ${userId}`);
        } catch (error) {
          failedAssignments.push({
            userId,
            reason: error.message
          });
          logger.error(`Erreur lors de l'attribution du module ${moduleId} à l'utilisateur ${userId}: ${error.message}`);
        }
      }

      res.status(200).json({
        message: 'Attribution de module terminée',
        successfulAssignments,
        failedAssignments
      });
    } catch (error) {
      logger.error(`Erreur lors de l'attribution en masse du module: ${error.message}`);
      res.status(500).json({
        error: 'Erreur serveur',
        message: 'Une erreur est survenue lors de l\'attribution en masse du module'
      });
    }
  }
);

/**
 * @swagger
 * /api/modules/{id}:
 *   get:
 *     summary: Récupérer un module par son ID
 *     tags: [Modules]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: integer
 *         required: true
 *         description: ID du module
 *     responses:
 *       200:
 *         description: Détails du module
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 module:
 *                   $ref: '#/components/schemas/Module'
 *                 seances:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Seance'
 *       401:
 *         description: Non autorisé
 *       404:
 *         description: Module non trouvé
 *       500:
 *         description: Erreur serveur
 */
router.get('/:id', authenticate, ModuleController.getModuleById);

/**
 * @swagger
 * /api/modules:
 *   post:
 *     summary: Créer un nouveau module
 *     tags: [Modules]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - titre
 *               - description
 *               - niveau
 *               - duree
 *             properties:
 *               titre:
 *                 type: string
 *                 description: Le titre du module
 *               description:
 *                 type: string
 *                 description: La description détaillée du module
 *               image:
 *                 type: string
 *                 format: binary
 *                 description: Image du module
 *               niveau:
 *                 type: string
 *                 enum: [Débutant, Intermédiaire, Avancé]
 *                 description: Le niveau de difficulté du module
 *               duree:
 *                 type: integer
 *                 description: La durée du module en heures
 *               objectifs:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: Liste des objectifs d'apprentissage
 *     responses:
 *       201:
 *         description: Module créé avec succès
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 module:
 *                   $ref: '#/components/schemas/Module'
 *       400:
 *         description: Données invalides
 *       401:
 *         description: Non autorisé
 *       403:
 *         description: Accès interdit (rôle requis)
 *       500:
 *         description: Erreur serveur
 */
router.post('/', 
  authenticate, 
  checkRole(['admin', 'admin_plus']), 
  handleModuleImageUpload,
  [
    check('titre').notEmpty().withMessage('Le titre est requis').isLength({ min: 3, max: 100 }).withMessage('Le titre doit contenir entre 3 et 100 caractères'),
    check('description').notEmpty().withMessage('La description est requise').isLength({ min: 10 }).withMessage('La description doit contenir au moins 10 caractères'),
    check('niveau').isIn(['Débutant', 'Intermédiaire', 'Avancé']).withMessage('Le niveau doit être Débutant, Intermédiaire ou Avancé'),
    check('duree').isInt({ min: 1, max: 100 }).withMessage('La durée doit être comprise entre 1 et 100 heures')
  ],
  ModuleController.createModule
);

/**
 * @swagger
 * /api/modules/{id}:
 *   put:
 *     summary: Mettre à jour un module
 *     tags: [Modules]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: integer
 *         required: true
 *         description: ID du module
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               titre:
 *                 type: string
 *                 description: Le titre du module
 *               description:
 *                 type: string
 *                 description: La description détaillée du module
 *               image:
 *                 type: string
 *                 format: binary
 *                 description: Image du module
 *               niveau:
 *                 type: string
 *                 enum: [Débutant, Intermédiaire, Avancé]
 *                 description: Le niveau de difficulté du module
 *               duree:
 *                 type: integer
 *                 description: La durée du module en heures
 *               objectifs:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: Liste des objectifs d'apprentissage
 *     responses:
 *       200:
 *         description: Module mis à jour avec succès
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 module:
 *                   $ref: '#/components/schemas/Module'
 *       400:
 *         description: Données invalides
 *       401:
 *         description: Non autorisé
 *       403:
 *         description: Accès interdit (rôle requis)
 *       404:
 *         description: Module non trouvé
 *       500:
 *         description: Erreur serveur
 */
router.put('/:id', 
  authenticate, 
  checkRole(['admin', 'admin_plus']), 
  handleModuleImageUpload,
  [
    check('titre').optional().isLength({ min: 3, max: 100 }).withMessage('Le titre doit contenir entre 3 et 100 caractères'),
    check('description').optional().isLength({ min: 10 }).withMessage('La description doit contenir au moins 10 caractères'),
    check('niveau').optional().isIn(['Débutant', 'Intermédiaire', 'Avancé']).withMessage('Le niveau doit être Débutant, Intermédiaire ou Avancé'),
    check('duree').optional().isInt({ min: 1, max: 100 }).withMessage('La durée doit être comprise entre 1 et 100 heures')
  ],
  ModuleController.updateModule
);

/**
 * @swagger
 * /api/modules/{id}:
 *   delete:
 *     summary: Supprimer un module
 *     tags: [Modules]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: integer
 *         required: true
 *         description: ID du module à supprimer
 *     responses:
 *       200:
 *         description: Module supprimé avec succès
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *       401:
 *         description: Non autorisé
 *       403:
 *         description: Accès interdit (rôle requis)
 *       404:
 *         description: Module non trouvé
 *       500:
 *         description: Erreur serveur
 */
router.delete('/:id', authenticate, checkRole(['admin', 'admin_plus']), ModuleController.deleteModule);

/**
 * @swagger
 * /api/modules/user/{userId}:
 *   get:
 *     summary: Récupérer tous les modules d'un utilisateur spécifique
 *     tags: [Modules]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         schema:
 *           type: integer
 *         required: true
 *         description: ID de l'utilisateur
 *     responses:
 *       200:
 *         description: Liste des modules de l'utilisateur
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 modules:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Module'
 *       401:
 *         description: Non autorisé
 *       404:
 *         description: Utilisateur non trouvé
 *       500:
 *         description: Erreur serveur
 */
router.get('/user/:userId', authenticate, ModuleController.getUserModules);

/**
 * @swagger
 * /api/modules/{id}/status:
 *   patch:
 *     summary: Changer le statut d'un module
 *     tags: [Modules]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: integer
 *         required: true
 *         description: ID du module
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - statut
 *             properties:
 *               statut:
 *                 type: string
 *                 enum: [brouillon, publié, archivé]
 *                 description: Nouveau statut du module
 *     responses:
 *       200:
 *         description: Statut modifié avec succès
 *       400:
 *         description: Statut invalide
 *       401:
 *         description: Non autorisé
 *       403:
 *         description: Accès interdit (rôle requis)
 *       404:
 *         description: Module non trouvé
 *       500:
 *         description: Erreur serveur
 */
router.patch('/:id/status', authenticate, checkRole(['admin', 'admin_plus']), ModuleController.changeModuleStatus);

/**
 * @swagger
 * /api/modules/{id}/seances:
 *   post:
 *     summary: Ajouter des séances existantes à un module
 *     tags: [Modules]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID du module
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - seanceIds
 *             properties:
 *               seanceIds:
 *                 type: array
 *                 items:
 *                   type: integer
 *                 description: Liste des IDs des séances à ajouter
 *     responses:
 *       200:
 *         description: Séances ajoutées au module avec succès
 *       400:
 *         description: Données invalides
 *       401:
 *         description: Non autorisé
 *       403:
 *         description: Accès interdit (rôle requis)
 *       404:
 *         description: Module ou séance non trouvé
 *       500:
 *         description: Erreur serveur
 */
router.post('/:id/seances',
  authenticate,
  checkRole(['admin', 'admin_plus']),
  [
    check('seanceIds').isArray().withMessage('seanceIds doit être un tableau d\'identifiants')
  ],
  ModuleController.addSeancesToModule
);

/**
 * @swagger
 * /api/modules/{moduleId}/seances/{seanceId}:
 *   delete:
 *     summary: Supprimer une séance d'un module
 *     tags: [Modules]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: moduleId
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID du module
 *       - in: path
 *         name: seanceId
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID de la séance à supprimer
 *     responses:
 *       200:
 *         description: Séance supprimée du module avec succès
 *       401:
 *         description: Non autorisé
 *       403:
 *         description: Accès interdit (rôle requis)
 *       404:
 *         description: Module ou séance non trouvé
 *       500:
 *         description: Erreur serveur
 */
router.delete('/:moduleId/seances/:seanceId', 
  authenticate, 
  checkRole(['admin', 'admin_plus']),
  async (req, res) => {
    try {
      const moduleId = req.params.moduleId;
      const seanceId = req.params.seanceId;
      
      logger.info(`[removeSeanceFromModule] Suppression de la séance ${seanceId} du module ${moduleId}`);
      
      // Vérifier si le module existe
      const module = await Module.findByPk(moduleId);
      
      if (!module) {
        logger.warn(`[removeSeanceFromModule] Module ${moduleId} non trouvé`);
        return res.status(404).json({
          error: 'Module non trouvé',
          message: 'Le module demandé n\'existe pas'
        });
      }
      
      // Vérifier si la séance existe et est associée au module
      const moduleSeance = await sequelize.models.ModuleSeance.findOne({
        where: {
          module_id: moduleId,
          seance_id: seanceId
        }
      });
      
      if (!moduleSeance) {
        logger.warn(`[removeSeanceFromModule] Séance ${seanceId} non associée au module ${moduleId}`);
        return res.status(404).json({
          error: 'Séance non trouvée',
          message: 'La séance n\'est pas associée à ce module'
        });
      }
      
      // Supprimer l'association entre le module et la séance
      await moduleSeance.destroy();
      
      logger.info(`[removeSeanceFromModule] Séance ${seanceId} supprimée du module ${moduleId} avec succès`);
      
      // Récupérer le module mis à jour pour la réponse
      const updatedModule = await Module.findByPk(moduleId, {
        include: [{
          model: Seance,
          as: 'seances',
          through: {
            attributes: ['positions'],
          }
        }]
      });
      
      res.status(200).json({
        message: 'Séance supprimée du module avec succès',
        module: updatedModule
      });
    } catch (error) {
      logger.error(`[removeSeanceFromModule] Erreur: ${error.message}`);
      logger.error(error.stack);
      res.status(500).json({
        error: 'Erreur serveur',
        message: `Une erreur est survenue lors de la suppression de la séance du module: ${error.message}`
      });
    }
  }
);

/**
 * @swagger
 * /api/modules/{moduleId}/assign/{userId}:
 *   post:
 *     summary: Attribuer un module à un utilisateur
 *     tags: [Modules]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: moduleId
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID du module à attribuer
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID de l'utilisateur
 *     responses:
 *       200:
 *         description: Module attribué à l'utilisateur avec succès
 *       401:
 *         description: Non autorisé
 *       403:
 *         description: Accès interdit (rôle requis)
 *       404:
 *         description: Module ou utilisateur non trouvé
 *       500:
 *         description: Erreur serveur
 */
router.post('/:moduleId/assign/:userId', 
  authenticate, 
  checkRole(['admin', 'admin_plus']), 
  ModuleController.assignModuleToUser
);

/**
 * @swagger
 * /api/modules/{moduleId}/assign/{userId}:
 *   delete:
 *     summary: Retirer un module à un utilisateur
 *     tags: [Modules]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: moduleId
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID du module à retirer
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID de l'utilisateur
 *     responses:
 *       200:
 *         description: Module retiré de l'utilisateur avec succès
 *       401:
 *         description: Non autorisé
 *       403:
 *         description: Accès interdit (rôle requis)
 *       404:
 *         description: Module ou utilisateur non trouvé
 *       500:
 *         description: Erreur serveur
 */
router.delete('/:moduleId/assign/:userId', 
  authenticate, 
  checkRole(['admin', 'admin_plus']), 
  ModuleController.removeModuleFromUser
);

/**
 * @swagger
 * /api/modules/{moduleId}/users:
 *   get:
 *     summary: Récupérer tous les utilisateurs associés à un module
 *     tags: [Modules]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: moduleId
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID du module
 *     responses:
 *       200:
 *         description: Liste des utilisateurs associés au module
 *       401:
 *         description: Non autorisé
 *       403:
 *         description: Accès interdit (rôle requis)
 *       404:
 *         description: Module non trouvé
 *       500:
 *         description: Erreur serveur
 */
router.get('/:moduleId/users', 
  authenticate, 
  checkRole(['admin', 'admin_plus']), 
  async (req, res) => {
    try {
      const moduleId = req.params.moduleId;
      
      logger.info(`[getModuleUsers] Récupération des utilisateurs pour le module ${moduleId}`);
      
      // Vérifier si le module existe
      const module = await Module.findByPk(moduleId);
      
      if (!module) {
        logger.warn(`[getModuleUsers] Module ${moduleId} non trouvé`);
        return res.status(404).json({
          error: 'Module non trouvé',
          message: 'Le module demandé n\'existe pas'
        });
      }
      
      // Utiliser la méthode findAll pour obtenir les utilisateurs associés
      // avec leurs informations de rôle correctement extraites
      const moduleUsers = await User.findAll({
        include: [
          {
            model: Module,
            as: 'modules',
            where: { id: moduleId },
            through: { attributes: [] } // Exclure les attributs de la table de jointure
          },
          {
            model: require('../models').Role,
            as: 'role',
            attributes: ['id', 'nom', 'description']
          }
        ],
        attributes: ['id', 'nom', 'prenom', 'mail', 'active']
      });
      
      // Formater correctement les données utilisateur avec les informations de rôle
      const formattedUsers = moduleUsers.map(user => ({
        id: user.id,
        nom: user.nom,
        prenom: user.prenom,
        mail: user.mail,
        active: user.active,
        role: user.role ? {
          id: user.role.id,
          nom: user.role.nom,
          role_type: user.role.nom,
          description: user.role.description
        } : { 
          nom: 'Aucun rôle',
          role_type: 'undefined'
        }
      }));
      
      logger.info(`[getModuleUsers] ${moduleUsers.length} utilisateurs trouvés pour le module ${moduleId}`);
      logger.info(`[getModuleUsers] Détail des rôles: ${JSON.stringify(formattedUsers.map(u => ({ id: u.id, role: u.role.nom })))}`);
      
      res.status(200).json({ users: formattedUsers });
    } catch (error) {
      logger.error(`Erreur lors de la récupération des utilisateurs du module: ${error.message}`);
      logger.error(`Stack trace: ${error.stack}`);
      res.status(500).json({
        error: 'Erreur serveur',
        message: `Une erreur est survenue lors de la récupération des utilisateurs du module: ${error.message}`
      });
    }
  }
);

/**
 * @swagger
 * /api/modules/{moduleId}/user/{userId}/activites:
 *   get:
 *     summary: Récupérer les activités et réponses d'un utilisateur pour un module spécifique
 *     tags: [Modules]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: moduleId
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID du module
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID de l'utilisateur
 *     responses:
 *       200:
 *         description: Liste des activités avec les réponses de l'utilisateur
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 activites:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: integer
 *                       titre:
 *                         type: string
 *                       description:
 *                         type: string
 *                       type_activite:
 *                         type: string
 *                       suivi:
 *                         type: object
 *                         properties:
 *                           status_id:
 *                             type: integer
 *                           date_debut:
 *                             type: string
 *                             format: date-time
 *                           date_fin:
 *                             type: string
 *                             format: date-time
 *                           duree_totale:
 *                             type: string
 *                       reponses:
 *                         type: array
 *                         items:
 *                           type: object
 *                           properties:
 *                             question:
 *                               type: string
 *                             reponse:
 *                               type: string
 *                             feedback:
 *                               type: string
 *       401:
 *         description: Non autorisé
 *       403:
 *         description: Accès interdit (rôle requis)
 *       404:
 *         description: Module ou utilisateur non trouvé
 *       500:
 *         description: Erreur serveur
 */
router.get('/:moduleId/user/:userId/activites', 
  authenticate, 
  async (req, res) => {
    try {
      const moduleId = parseInt(req.params.moduleId);
      const userId = parseInt(req.params.userId);
      
      logger.info(`Récupération des activités du module ${moduleId} pour l'utilisateur ${userId}`);
      
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
      
      // Récupérer toutes les séances du module
      const seances = await module.getSeances();
      
      // Récupérer toutes les activités de ces séances
      const activitesPromises = seances.map(async (seance) => {
        // D'abord, récupérer les IDs d'activités pour cette séance
        const seanceActivites = await sequelize.models.SeanceActivite.findAll({
          where: { seance_id: seance.id },
          order: [['ordre', 'ASC']]
        });
        
        // Récupérer toutes les activités associées à cette séance avec leur ordre
        const activiteIds = seanceActivites.map(sa => sa.activite_id);
        const activites = await sequelize.models.Activite.findAll({
          where: { id: activiteIds },
          include: [
            {
              model: sequelize.models.TypeActivite,
              as: 'typeActivite'
            }
          ]
        });
        
        // Attacher l'information d'ordre à chaque activité
        return activites.map(activite => {
          const seanceActivite = seanceActivites.find(sa => sa.activite_id === activite.id);
          activite.ordre = seanceActivite ? seanceActivite.ordre : 0;
          return activite;
        });
      });
      
      const allActivitesBySeance = await Promise.all(activitesPromises);
      const allActivites = allActivitesBySeance.flat();
      
      // Pour chaque activité, récupérer le suivi et les réponses de l'utilisateur
      const activitesWithResponses = await Promise.all(allActivites.map(async (activite) => {
        // Récupérer les réponses de l'utilisateur pour cette activité
        let reponses = [];
        
        try {
          if (sequelize.models.ReponseClient) {
            const reponsesClient = await sequelize.models.ReponseClient.findAll({
              where: {
                activite_id: activite.id,
                user_id: userId
              },
              order: [['date_soumission', 'DESC']]
            });
            
            // Formater les réponses
            reponses = reponsesClient.map(reponse => {
              // Initialiser le contenu formaté
              let contenuFormate = '';
              let parsedContent = null;
              
              try {
                // Traitement différent selon le type de contenu
                if (typeof reponse.contenu === 'object' && reponse.contenu !== null) {
                  // Si c'est déjà un objet JavaScript
                  parsedContent = reponse.contenu;
                  contenuFormate = JSON.stringify(parsedContent, null, 2);
                } 
                else if (typeof reponse.contenu === 'string') {
                  try {
                    // Essayer de parser comme JSON
                    parsedContent = JSON.parse(reponse.contenu);
                    
                    // Formater différemment selon le type de réponse
                    if (parsedContent && typeof parsedContent === 'object') {
                      if (parsedContent.type === 'QUIZ') {
                        contenuFormate = `Réponse choisie: ${parsedContent.reponse || 'Non spécifiée'}`;
                        if (parsedContent.completed) {
                          contenuFormate += `\nComplété le: ${new Date(parsedContent.completedAt).toLocaleString()}`;
                        }
                      } else if (parsedContent.type === 'TEXT') {
                        contenuFormate = parsedContent.reponse || 'Pas de réponse';
                      } else {
                        // Pour les autres types, afficher une version formatée du JSON
                        contenuFormate = JSON.stringify(parsedContent, null, 2);
                      }
                    } else {
                      // Si ce n'est pas un objet après parsing, l'afficher tel quel
                      contenuFormate = reponse.contenu;
                    }
                  } catch (e) {
                    // Si ce n'est pas un JSON valide, garder le contenu tel quel
                    contenuFormate = reponse.contenu;
                    logger.debug(`Contenu non-JSON: ${e.message}. Contenu conservé tel quel.`);
                  }
                } else {
                  // Pour tout autre type de données (nombre, boolean, null, undefined)
                  contenuFormate = String(reponse.contenu);
                  logger.debug(`Type de contenu non géré: ${typeof reponse.contenu}. Converti en chaîne.`);
                }
              } catch (e) {
                // Gestion des erreurs générales
                contenuFormate = String(reponse.contenu);
                logger.error(`Erreur lors du formatage de la réponse id=${reponse.id}: ${e.message}`);
              }
              
              // Vérification finale pour éviter [object Object]
              if (typeof contenuFormate === 'object') {
                contenuFormate = JSON.stringify(contenuFormate, null, 2);
                logger.debug(`Conversion finale de l'objet en JSON pour la réponse id=${reponse.id}`);
              }
              
              // Extraire l'énoncé de la question depuis le contenu HTML de l'activité
              let questionText = 'Question';
              if (activite.contenu) {
                // Utiliser directement le contenu comme question
                questionText = activite.contenu;
                
                // Essayer de formater si c'est du HTML ou du JSON
                try {
                  // Vérifier si c'est un JSON
                  if (activite.contenu.startsWith('{') && activite.contenu.endsWith('}')) {
                    const parsedContent = JSON.parse(activite.contenu);
                    if (parsedContent.title) {
                      questionText = parsedContent.title;
                    } else if (parsedContent.question) {
                      questionText = parsedContent.question;
                    } else if (parsedContent.text) {
                      questionText = parsedContent.text;
                    }
                  } 
                  // Si c'est du HTML, on le laisse tel quel pour l'affichage dans le front-end
                } catch (e) {
                  // Si l'analyse échoue, conserver le contenu brut
                  logger.info(`Format de contenu non reconnu pour l'activité ${activite.id}: ${e.message}`);
                }
              } else if (activite.titre) {
                // Utiliser le titre uniquement si le contenu n'existe pas
                questionText = activite.titre;
              }
              
              return {
                id: reponse.id,
                question: questionText,
                reponse: contenuFormate,
                feedback: reponse.feedback,
                date_creation: reponse.date_soumission
              };
            });
          }
        } catch (error) {
          logger.error(`Erreur lors de la récupération des réponses pour l'activité ${activite.id}: ${error.message}`);
        }
        
        // Récupérer l'éventuel suivi de séance associé à l'activité
        let suivi = null;
        try {
          // Vérifier si les modèles nécessaires existent
          if (sequelize.models.SeanceActivite && sequelize.models.Suivi) {
            // Trouver d'abord la séance associée à cette activité
            const seanceActivite = await sequelize.models.SeanceActivite.findOne({
              where: { activite_id: activite.id }
            });
            
            if (seanceActivite) {
              // Ensuite chercher le suivi pour cette séance et cet utilisateur
              const suiviData = await sequelize.models.Suivi.findOne({
                where: {
                  seance_id: seanceActivite.seance_id,
                  user_id: userId
                },
                include: [
                  {
                    model: sequelize.models.StatusSuivi,
                    as: 'status'
                  }
                ]
              });
              
              if (suiviData) {
                suivi = {
                  id: suiviData.id,
                  status_id: suiviData.status_id,
                  date_debut: suiviData.update_suivi,
                  date_fin: suiviData.update_suivi,
                  duree_totale: '0',
                  status: {
                    id: suiviData.status ? suiviData.status.id : null,
                    type_status: suiviData.status ? suiviData.status.type_status : null
                  }
                };
              }
            }
          }
        } catch (error) {
          // Gérer silencieusement l'erreur - le suivi restera null
          logger.error(`Erreur lors de la récupération du suivi pour l'activité ${activite.id}: ${error.message}`);
        }
        
        // Formater l'activité avec ses réponses et son suivi s'il existe
        return {
          id: activite.id,
          titre: activite.titre,
          description: activite.description,
          contenu: activite.contenu,
          type_activite: activite.typeActivite ? activite.typeActivite.type_activite : 'Inconnu',
          type_activite_id: activite.type_activite_id,
          ordre: activite.ordre,
          duree: activite.duree,
          suivi: suivi,
          reponses: reponses
        };
      }));
      
      // Trier les activités par l'ordre défini
      activitesWithResponses.sort((a, b) => {
        // Récupérer l'ordre à partir de la propriété attachée
        const ordreA = a.ordre || 0;
        const ordreB = b.ordre || 0;
        return ordreA - ordreB;
      });
      
      res.status(200).json({
        activites: activitesWithResponses
      });
    } catch (error) {
      logger.error(`Erreur lors de la récupération des activités: ${error.message}`);
      logger.error(error.stack);
      res.status(500).json({
        error: 'Erreur serveur',
        message: `Une erreur est survenue lors de la récupération des activités: ${error.message}`
      });
    }
  }
);

module.exports = router;