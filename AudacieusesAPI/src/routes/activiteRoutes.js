const express = require('express');
const router = express.Router();
const activiteController = require('../controllers/activiteController');
const { authenticate } = require('../middleware/authMiddleware');
const { isAdmin } = require('../middleware/roleMiddleware');

/**
 * @swagger
 * components:
 *   schemas:
 *     TypeActivite:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *         type_activite:
 *           type: string
 *     Activite:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *         titre:
 *           type: string
 *         description:
 *           type: string
 *         contenu:
 *           type: string
 *         type_activite_id:
 *           type: integer
 *         ordre:
 *           type: integer
 *         duree:
 *           type: integer
 *         date_creation:
 *           type: string
 *           format: date-time
 *         date_update:
 *           type: string
 *           format: date-time
 *         typeActivite:
 *           $ref: '#/components/schemas/TypeActivite'
 *         seances:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               id:
 *                 type: integer
 *               titre:
 *                 type: string
 *               seanceActivite:
 *                 type: object
 *                 properties:
 *                   ordre:
 *                     type: integer
 */

/**
 * @swagger
 * /api/activites:
 *   get:
 *     summary: Récupérer toutes les activités
 *     tags: [Activités]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Liste des activités
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 activites:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Activite'
 */
router.get('/', authenticate, activiteController.getAllActivites);

/**
 * @swagger
 * /api/activites/types:
 *   get:
 *     summary: Récupérer tous les types d'activités
 *     tags: [Activités]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Liste des types d'activités
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 typeActivites:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/TypeActivite'
 */
router.get('/types', authenticate, activiteController.getTypeActivites);

/**
 * @swagger
 * /api/activites/seance/{seanceId}:
 *   get:
 *     summary: Récupérer les activités d'une séance
 *     tags: [Activités]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: seanceId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Activités de la séance
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 seance:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: integer
 *                     titre:
 *                       type: string
 *                 activites:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Activite'
 */
router.get('/seance/:seanceId', authenticate, activiteController.getActivitesBySeance);

/**
 * @swagger
 * /api/activites:
 *   post:
 *     summary: Créer une nouvelle activité
 *     tags: [Activités]
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
 *               - contenu
 *               - type_activite_id
 *               - seance_id
 *             properties:
 *               titre:
 *                 type: string
 *               description:
 *                 type: string
 *               contenu:
 *                 type: string
 *               type_activite_id:
 *                 type: integer
 *               seance_id:
 *                 type: integer
 *               ordre:
 *                 type: integer
 *               duree:
 *                 type: integer
 *     responses:
 *       201:
 *         description: Activité créée avec succès
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 activite:
 *                   $ref: '#/components/schemas/Activite'
 */
router.post('/', authenticate, isAdmin, activiteController.createActivite);

/**
 * @swagger
 * /api/activites/{id}:
 *   put:
 *     summary: Mettre à jour une activité
 *     tags: [Activités]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               titre:
 *                 type: string
 *               description:
 *                 type: string
 *               contenu:
 *                 type: string
 *               type_activite_id:
 *                 type: integer
 *               seance_id:
 *                 type: integer
 *               ordre:
 *                 type: integer
 *               duree:
 *                 type: integer
 *     responses:
 *       200:
 *         description: Activité mise à jour avec succès
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 activite:
 *                   $ref: '#/components/schemas/Activite'
 */
router.put('/:id', authenticate, isAdmin, activiteController.updateActivite);

/**
 * @swagger
 * /api/activites/{id}:
 *   delete:
 *     summary: Supprimer une activité
 *     tags: [Activités]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Activité supprimée avec succès
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 */
router.delete('/:id', authenticate, isAdmin, activiteController.deleteActivite);

/**
 * @swagger
 * /api/activites/seance/{seanceId}/reorder:
 *   post:
 *     summary: Réordonner les activités d'une séance
 *     tags: [Activités]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: seanceId
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - ordre
 *             properties:
 *               ordre:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: integer
 *                     ordre:
 *                       type: integer
 *     responses:
 *       200:
 *         description: Ordre des activités mis à jour avec succès
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 activites:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Activite'
 */
router.post('/seance/:seanceId/reorder', authenticate, isAdmin, activiteController.reorderActivites);

/**
 * @swagger
 * /api/activites/{id}:
 *   get:
 *     summary: Récupérer une activité par son ID
 *     tags: [Activités]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Détails de l'activité
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 activite:
 *                   $ref: '#/components/schemas/Activite'
 */
router.get('/:id', authenticate, activiteController.getActiviteById);

/**
 * @swagger
 * /api/activites/{id}/reponses:
 *   post:
 *     summary: Enregistrer une réponse à une question
 *     tags: [Activités]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID de l'activité
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - reponse
 *             properties:
 *               reponse:
 *                 type: string
 *     responses:
 *       201:
 *         description: Réponse enregistrée avec succès
 *       400:
 *         description: Données invalides
 *       401:
 *         description: Non authentifié
 *       404:
 *         description: Activité non trouvée
 *       500:
 *         description: Erreur serveur
 */
router.post('/:id/reponses', authenticate, activiteController.saveReponse);

/**
 * @swagger
 * /api/activites/{id}/reponses/{userId}:
 *   get:
 *     summary: Récupérer les réponses d'un utilisateur pour une activité
 *     tags: [Activités]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID de l'activité
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID de l'utilisateur
 *     responses:
 *       200:
 *         description: Réponses récupérées avec succès
 *       401:
 *         description: Non authentifié
 *       404:
 *         description: Activité ou utilisateur non trouvé
 *       500:
 *         description: Erreur serveur
 */
router.get('/:id/reponses/:userId', authenticate, activiteController.getUserReponses);

/**
 * @swagger
 * /api/activites/seance/{seanceId}/add/{activiteId}:
 *   post:
 *     summary: Ajouter une activité existante à une séance
 *     tags: [Activités]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: seanceId
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID de la séance
 *       - in: path
 *         name: activiteId
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID de l'activité à ajouter
 *     responses:
 *       200:
 *         description: Activité ajoutée à la séance avec succès
 *       400:
 *         description: Données invalides
 *       401:
 *         description: Non authentifié
 *       404:
 *         description: Séance ou activité non trouvée
 *       500:
 *         description: Erreur serveur
 */
router.post('/seance/:seanceId/add/:activiteId', authenticate, isAdmin, activiteController.addActiviteToSeance);

/**
 * @swagger
 * /api/activites/seance/{seanceId}/remove/{activiteId}:
 *   delete:
 *     summary: Retirer une activité d'une séance
 *     tags: [Activités]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: seanceId
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID de la séance
 *       - in: path
 *         name: activiteId
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID de l'activité à retirer
 *     responses:
 *       200:
 *         description: Activité retirée de la séance avec succès
 *       400:
 *         description: Données invalides
 *       401:
 *         description: Non authentifié
 *       404:
 *         description: Séance ou activité non trouvée
 *       500:
 *         description: Erreur serveur
 */
router.delete('/seance/:seanceId/remove/:activiteId', authenticate, isAdmin, activiteController.removeActiviteFromSeance);

module.exports = router;
