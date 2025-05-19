const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/authMiddleware');
const { isAdmin } = require('../middleware/roleMiddleware');
const adminController = require('../controllers/adminController');

/**
 * @swagger
 * /api/admin/stats:
 *   get:
 *     summary: Obtenir les statistiques de la plateforme (admin uniquement)
 *     description: Récupère diverses statistiques sur la plateforme pour le tableau de bord administrateur
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Statistiques récupérées avec succès
 *       401:
 *         description: Non authentifié
 *       403:
 *         description: Non autorisé (rôle admin requis)
 *       500:
 *         description: Erreur serveur
 */
router.get('/stats', authenticate, isAdmin, adminController.getDashboardStats);

/**
 * @swagger
 * /api/admin/user-stats:
 *   get:
 *     summary: Obtenir les statistiques des utilisateurs (admin uniquement)
 *     description: Récupère des statistiques détaillées sur les utilisateurs
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Statistiques récupérées avec succès
 *       401:
 *         description: Non authentifié
 *       403:
 *         description: Non autorisé (rôle admin requis)
 *       500:
 *         description: Erreur serveur
 */
router.get('/user-stats', authenticate, isAdmin, adminController.getUserStats);

/**
 * @swagger
 * /api/admin/module-stats:
 *   get:
 *     summary: Obtenir les statistiques des modules (admin uniquement)
 *     description: Récupère des statistiques détaillées sur les modules
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Statistiques récupérées avec succès
 *       401:
 *         description: Non authentifié
 *       403:
 *         description: Non autorisé (rôle admin requis)
 *       500:
 *         description: Erreur serveur
 */
router.get('/module-stats', authenticate, isAdmin, adminController.getModuleStats);

/**
 * @swagger
 * /api/admin/seance-stats:
 *   get:
 *     summary: Obtenir les statistiques des séances (admin uniquement)
 *     description: Récupère des statistiques détaillées sur les séances
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Statistiques récupérées avec succès
 *       401:
 *         description: Non authentifié
 *       403:
 *         description: Non autorisé (rôle admin requis)
 *       500:
 *         description: Erreur serveur
 */
router.get('/seance-stats', authenticate, isAdmin, adminController.getSeanceStats);

module.exports = router;