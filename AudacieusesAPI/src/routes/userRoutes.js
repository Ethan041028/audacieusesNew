const express = require('express');
const { body } = require('express-validator');
const userController = require('../controllers/userController');
const { authenticate } = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');
const router = express.Router();

// Middleware d'authentification pour toutes les routes
router.use(authenticate);

/**
 * @swagger
 * /api/users:
 *   get:
 *     summary: Récupérer tous les utilisateurs
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Liste des utilisateurs récupérée avec succès
 *       401:
 *         description: Non authentifié
 *       403:
 *         description: Accès non autorisé
 *       500:
 *         description: Erreur serveur
 */
router.get('/', roleMiddleware.checkRole(['admin', 'admin_plus']), userController.getAllUsers);

/**
 * @swagger
 * /api/users/{id}:
 *   get:
 *     summary: Récupérer un utilisateur par son ID
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID de l'utilisateur
 *     responses:
 *       200:
 *         description: Utilisateur récupéré avec succès
 *       401:
 *         description: Non authentifié
 *       403:
 *         description: Accès non autorisé
 *       404:
 *         description: Utilisateur non trouvé
 *       500:
 *         description: Erreur serveur
 */
router.get('/:id', userController.getUserById);

/**
 * @swagger
 * /api/users:
 *   post:
 *     summary: Créer un nouvel utilisateur (admin seulement)
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - nom
 *               - prenom
 *               - mail
 *               - mdp
 *               - role_type
 *             properties:
 *               nom:
 *                 type: string
 *               prenom:
 *                 type: string
 *               mail:
 *                 type: string
 *                 format: email
 *               mdp:
 *                 type: string
 *                 format: password
 *               date_naissance:
 *                 type: string
 *                 format: date
 *               role_type:
 *                 type: string
 *                 enum: [client, admin, admin_plus]
 *     responses:
 *       201:
 *         description: Utilisateur créé avec succès
 *       400:
 *         description: Données invalides ou email déjà utilisé
 *       401:
 *         description: Non authentifié
 *       403:
 *         description: Accès non autorisé
 *       500:
 *         description: Erreur serveur
 */
router.post('/', 
  roleMiddleware.checkRole(['admin', 'admin_plus']),
  [
    body('nom').notEmpty().withMessage('Le nom est requis'),
    body('prenom').notEmpty().withMessage('Le prénom est requis'),
    body('mail').isEmail().withMessage('Email invalide'),
    body('mdp').isLength({ min: 6 }).withMessage('Le mot de passe doit contenir au moins 6 caractères'),
    body('role_type').isIn(['client', 'admin', 'admin_plus']).withMessage('Rôle invalide')
  ],
  userController.createUser
);

/**
 * @swagger
 * /api/users/{id}:
 *   put:
 *     summary: Mettre à jour un utilisateur
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID de l'utilisateur
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               nom:
 *                 type: string
 *               prenom:
 *                 type: string
 *               mail:
 *                 type: string
 *                 format: email
 *               date_naissance:
 *                 type: string
 *                 format: date
 *               role_type:
 *                 type: string
 *                 enum: [client, admin, admin_plus]
 *     responses:
 *       200:
 *         description: Utilisateur mis à jour avec succès
 *       400:
 *         description: Données invalides ou email déjà utilisé
 *       401:
 *         description: Non authentifié
 *       403:
 *         description: Accès non autorisé
 *       404:
 *         description: Utilisateur non trouvé
 *       500:
 *         description: Erreur serveur
 */
router.put('/:id', 
  [
    body('mail').optional().isEmail().withMessage('Email invalide'),
    body('role_type').optional().isIn(['client', 'admin', 'admin_plus']).withMessage('Rôle invalide')
  ],
  userController.updateUser
);

/**
 * @swagger
 * /api/users/{id}/password:
 *   put:
 *     summary: Mettre à jour le mot de passe d'un utilisateur
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID de l'utilisateur
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - newPassword
 *             properties:
 *               currentPassword:
 *                 type: string
 *                 description: Requis seulement si l'utilisateur change son propre mot de passe
 *               newPassword:
 *                 type: string
 *                 format: password
 *     responses:
 *       200:
 *         description: Mot de passe mis à jour avec succès
 *       400:
 *         description: Données invalides
 *       401:
 *         description: Non authentifié ou mot de passe actuel incorrect
 *       403:
 *         description: Accès non autorisé
 *       404:
 *         description: Utilisateur non trouvé
 *       500:
 *         description: Erreur serveur
 */
router.put('/:id/password', 
  [
    body('newPassword').isLength({ min: 6 }).withMessage('Le nouveau mot de passe doit contenir au moins 6 caractères')
  ],
  userController.updatePassword
);

/**
 * @swagger
 * /api/users/{id}:
 *   delete:
 *     summary: Supprimer un utilisateur (admin seulement)
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID de l'utilisateur à supprimer
 *     responses:
 *       200:
 *         description: Utilisateur supprimé avec succès
 *       400:
 *         description: Opération non autorisée
 *       401:
 *         description: Non authentifié
 *       403:
 *         description: Accès non autorisé
 *       404:
 *         description: Utilisateur non trouvé
 *       500:
 *         description: Erreur serveur
 */
router.delete('/:id', roleMiddleware.checkRole(['admin', 'admin_plus']), userController.deleteUser);

/**
 * @swagger
 * /api/users/{id}/reset-password:
 *   post:
 *     summary: Réinitialiser le mot de passe d'un utilisateur (admin uniquement)
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID de l'utilisateur
 *     responses:
 *       200:
 *         description: Mot de passe réinitialisé avec succès
 *       401:
 *         description: Non authentifié
 *       403:
 *         description: Accès non autorisé
 *       404:
 *         description: Utilisateur non trouvé
 *       500:
 *         description: Erreur serveur
 */
router.post('/:id/reset-password', roleMiddleware.checkRole(['admin', 'admin_plus']), userController.resetUserPassword);

/**
 * @swagger
 * /api/users/{id}/modules:
 *   get:
 *     summary: Récupérer les modules d'un utilisateur
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID de l'utilisateur
 *     responses:
 *       200:
 *         description: Modules de l'utilisateur récupérés avec succès
 *       401:
 *         description: Non authentifié
 *       403:
 *         description: Accès non autorisé
 *       404:
 *         description: Utilisateur non trouvé
 *       500:
 *         description: Erreur serveur
 */
router.get('/:id/modules', async (req, res) => {
  // Transférer la demande au contrôleur de modules
  // Le paramètre userId est nécessaire pour getUserModules
  req.params.userId = req.params.id;
  const moduleController = require('../controllers/moduleController');
  await moduleController.getUserModules(req, res);
});

module.exports = router;