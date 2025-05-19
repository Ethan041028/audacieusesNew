const express = require('express');
const { check } = require('express-validator');
const { authenticate } = require('../middleware/authMiddleware');
const { checkRole } = require('../middleware/roleMiddleware');
const SeanceController = require('../controllers/seanceController');
const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Seances
 *   description: Gestion des séances de formation
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     Seance:
 *       type: object
 *       required:
 *         - titre
 *         - description
 *         - date_debut
 *         - duree
 *         - module_id
 *       properties:
 *         id:
 *           type: integer
 *           description: L'identifiant unique de la séance
 *         titre:
 *           type: string
 *           description: Le titre de la séance
 *         description:
 *           type: string
 *           description: La description détaillée de la séance
 *         date_debut:
 *           type: string
 *           format: date-time
 *           description: Date et heure de début de la séance
 *         duree:
 *           type: integer
 *           description: La durée de la séance en minutes
 *         lien_visio:
 *           type: string
 *           description: Le lien vers la visioconférence
 *         module_id:
 *           type: integer
 *           description: L'identifiant du module auquel cette séance appartient
 *         createdAt:
 *           type: string
 *           format: date-time
 *           description: Date de création de la séance
 *         updatedAt:
 *           type: string
 *           format: date-time
 *           description: Date de dernière mise à jour de la séance
 */

/**
 * @swagger
 * /api/seances:
 *   get:
 *     summary: Récupérer toutes les séances
 *     tags: [Seances]
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
 *         name: module_id
 *         schema:
 *           type: integer
 *         description: Filtrer par ID de module
 *       - in: query
 *         name: date_debut
 *         schema:
 *           type: string
 *           format: date
 *         description: Filtrer par date de début (YYYY-MM-DD)
 *     responses:
 *       200:
 *         description: Liste des séances avec pagination
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 seances:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Seance'
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     totalItems:
 *                       type: integer
 *                     totalPages:
 *                       type: integer
 *                     currentPage:
 *                       type: integer
 *       500:
 *         description: Erreur serveur
 */
router.get('/', SeanceController.getAllSeances);

/**
 * @swagger
 * /api/seances/{id}:
 *   get:
 *     summary: Récupérer une séance par son ID
 *     tags: [Seances]
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: integer
 *         required: true
 *         description: ID de la séance
 *     responses:
 *       200:
 *         description: Détails de la séance
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 seance:
 *                   $ref: '#/components/schemas/Seance'
 *                 activites:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Activite'
 *                 participants:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/User'
 *       404:
 *         description: Séance non trouvée
 *       500:
 *         description: Erreur serveur
 */
router.get('/:id', SeanceController.getSeanceById);

/**
 * @swagger
 * /api/seances:
 *   post:
 *     summary: Créer une nouvelle séance
 *     tags: [Seances]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - titre
 *               - description
 *               - date_debut
 *               - duree
 *               - module_id
 *             properties:
 *               titre:
 *                 type: string
 *                 description: Le titre de la séance
 *               description:
 *                 type: string
 *                 description: La description détaillée de la séance
 *               date_debut:
 *                 type: string
 *                 format: date-time
 *                 description: Date et heure de début de la séance
 *               duree:
 *                 type: integer
 *                 description: La durée de la séance en minutes
 *               lien_visio:
 *                 type: string
 *                 description: Le lien vers la visioconférence
 *               module_id:
 *                 type: integer
 *                 description: L'identifiant du module auquel cette séance appartient
 *     responses:
 *       201:
 *         description: Séance créée avec succès
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 seance:
 *                   $ref: '#/components/schemas/Seance'
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
  [
    check('titre').notEmpty().withMessage('Le titre est requis').isLength({ min: 3, max: 100 }).withMessage('Le titre doit contenir entre 3 et 100 caractères'),
    check('description').notEmpty().withMessage('La description est requise').isLength({ min: 10 }).withMessage('La description doit contenir au moins 10 caractères'),
    check('date_debut').notEmpty().withMessage('La date de début est requise').isISO8601().withMessage('Format de date invalide'),
    check('duree').isInt({ min: 15, max: 480 }).withMessage('La durée doit être comprise entre 15 et 480 minutes'),
    check('module_id').isInt().withMessage('L\'ID du module doit être un entier')
  ],
  SeanceController.createSeance
);

/**
 * @swagger
 * /api/seances/{id}:
 *   put:
 *     summary: Mettre à jour une séance
 *     tags: [Seances]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: integer
 *         required: true
 *         description: ID de la séance
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               titre:
 *                 type: string
 *                 description: Le titre de la séance
 *               description:
 *                 type: string
 *                 description: La description détaillée de la séance
 *               date_debut:
 *                 type: string
 *                 format: date-time
 *                 description: Date et heure de début de la séance
 *               duree:
 *                 type: integer
 *                 description: La durée de la séance en minutes
 *               lien_visio:
 *                 type: string
 *                 description: Le lien vers la visioconférence
 *               module_id:
 *                 type: integer
 *                 description: L'identifiant du module auquel cette séance appartient
 *     responses:
 *       200:
 *         description: Séance mise à jour avec succès
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 seance:
 *                   $ref: '#/components/schemas/Seance'
 *       400:
 *         description: Données invalides
 *       401:
 *         description: Non autorisé
 *       403:
 *         description: Accès interdit (rôle requis)
 *       404:
 *         description: Séance non trouvée
 *       500:
 *         description: Erreur serveur
 */
router.put('/:id', 
  authenticate, 
  checkRole(['admin', 'admin_plus']), 
  [
    check('titre').optional().isLength({ min: 3, max: 100 }).withMessage('Le titre doit contenir entre 3 et 100 caractères'),
    check('description').optional().isLength({ min: 10 }).withMessage('La description doit contenir au moins 10 caractères'),
    check('date_debut').optional().isISO8601().withMessage('Format de date invalide'),
    check('duree').optional().isInt({ min: 15, max: 480 }).withMessage('La durée doit être comprise entre 15 et 480 minutes'),
    check('module_id').optional().isInt().withMessage('L\'ID du module doit être un entier')
  ],
  SeanceController.updateSeance
);

/**
 * @swagger
 * /api/seances/{id}:
 *   delete:
 *     summary: Supprimer une séance
 *     tags: [Seances]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: integer
 *         required: true
 *         description: ID de la séance à supprimer
 *     responses:
 *       200:
 *         description: Séance supprimée avec succès
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
 *         description: Séance non trouvée
 *       500:
 *         description: Erreur serveur
 */
router.delete('/:id', authenticate, checkRole(['admin', 'admin_plus']), SeanceController.deleteSeance);

/**
 * @swagger
 * /api/seances/module/{moduleId}:
 *   get:
 *     summary: Récupérer les séances par ID de module
 *     tags: [Seances]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: moduleId
 *         schema:
 *           type: integer
 *         required: true
 *         description: ID du module
 *     responses:
 *       200:
 *         description: Liste des séances pour le module spécifié
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Seance'
 *       404:
 *         description: Module ou séances non trouvés
 *       500:
 *         description: Erreur serveur
 */
router.get('/module/:moduleId', authenticate, SeanceController.getSeancesByModule);

/**
 * @swagger
 * /api/seances/{id}/inscription:
 *   post:
 *     summary: S'inscrire à une séance
 *     tags: [Seances]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: integer
 *         required: true
 *         description: ID de la séance
 *     responses:
 *       200:
 *         description: Inscription réussie
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 suivi:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: integer
 *                     user_id:
 *                       type: integer
 *                     seance_id:
 *                       type: integer
 *                     status_id:
 *                       type: integer
 *       400:
 *         description: Déjà inscrit ou autre erreur
 *       401:
 *         description: Non autorisé
 *       404:
 *         description: Séance non trouvée
 *       500:
 *         description: Erreur serveur
 */
router.post('/:id/inscription', authenticate, SeanceController.inscrireSeance);

/**
 * @swagger
 * /api/seances/{id}/desinscription:
 *   post:
 *     summary: Se désinscrire d'une séance
 *     tags: [Seances]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: integer
 *         required: true
 *         description: ID de la séance
 *     responses:
 *       200:
 *         description: Désinscription réussie
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *       401:
 *         description: Non autorisé
 *       404:
 *         description: Inscription non trouvée
 *       500:
 *         description: Erreur serveur
 */
router.post('/:id/desinscription', authenticate, SeanceController.desinscrireSeance);

/**
 * @swagger
 * /api/seances/{id}/suivi/{userId}:
 *   put:
 *     summary: Mettre à jour le suivi d'une séance pour un utilisateur
 *     tags: [Seances]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: integer
 *         required: true
 *         description: ID de la séance
 *       - in: path
 *         name: userId
 *         schema:
 *           type: integer
 *         required: true
 *         description: ID de l'utilisateur
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               progression:
 *                 type: integer
 *                 description: Pourcentage de progression dans la séance (0-100)
 *               status_id:
 *                 type: integer
 *                 description: ID du statut de suivi
 *     responses:
 *       200:
 *         description: Suivi mis à jour avec succès
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 suivi:
 *                   type: object
 *       401:
 *         description: Non autorisé
 *       403:
 *         description: Accès refusé
 *       404:
 *         description: Séance ou utilisateur non trouvé
 *       500:
 *         description: Erreur serveur
 */
router.put('/:id/suivi/:userId', authenticate, SeanceController.updateSuivi);

/**
 * @swagger
 * /api/seances/{id}/suivi:
 *   put:
 *     summary: Mettre à jour le suivi d'une séance pour l'utilisateur connecté
 *     tags: [Seances]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: integer
 *         required: true
 *         description: ID de la séance
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               progression:
 *                 type: integer
 *                 description: Pourcentage de progression dans la séance (0-100)
 *               status_id:
 *                 type: integer
 *                 description: ID du statut de suivi
 *     responses:
 *       200:
 *         description: Suivi mis à jour avec succès
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 suivi:
 *                   type: object
 *       401:
 *         description: Non autorisé
 *       404:
 *         description: Séance non trouvée
 *       500:
 *         description: Erreur serveur
 */
router.put('/:id/suivi', authenticate, (req, res) => {
  // Utiliser l'ID de l'utilisateur connecté
  req.params.userId = req.user.id;
  // Rediriger vers le contrôleur existant
  SeanceController.updateSuivi(req, res);
});

module.exports = router;