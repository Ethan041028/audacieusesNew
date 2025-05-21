const express = require('express');
const { body } = require('express-validator');
const authController = require('../controllers/authController');
const { authenticate } = require('../middleware/authMiddleware');
const router = express.Router();

/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     summary: Inscription d'un nouvel utilisateur
 *     tags: [Authentication]
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
 *             properties:
 *               nom:
 *                 type: string
 *                 description: Nom de l'utilisateur
 *               prenom:
 *                 type: string
 *                 description: Prénom de l'utilisateur
 *               mail:
 *                 type: string
 *                 format: email
 *                 description: Adresse email de l'utilisateur
 *               mdp:
 *                 type: string
 *                 format: password
 *                 description: Mot de passe (min 6 caractères)
 *               date_naissance:
 *                 type: string
 *                 format: date
 *                 description: Date de naissance (format YYYY-MM-DD)
 *     responses:
 *       201:
 *         description: Utilisateur inscrit avec succès
 *       400:
 *         description: Données invalides ou email déjà utilisé
 *       500:
 *         description: Erreur serveur
 */
router.post('/register', [
  body('nom').notEmpty().withMessage('Le nom est requis'),
  body('prenom').notEmpty().withMessage('Le prénom est requis'),
  body('mail').isEmail().withMessage('Email invalide'),
  body('mdp').isLength({ min: 6 }).withMessage('Le mot de passe doit contenir au moins 6 caractères'),
  body('date_naissance').optional().isDate().withMessage('Date de naissance invalide')
], authController.register);

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: Connexion d'un utilisateur
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - mail
 *               - mdp
 *             properties:
 *               mail:
 *                 type: string
 *                 format: email
 *                 description: Adresse email de l'utilisateur
 *               mdp:
 *                 type: string
 *                 format: password
 *                 description: Mot de passe
 *     responses:
 *       200:
 *         description: Connexion réussie
 *       401:
 *         description: Identifiants incorrects
 *       500:
 *         description: Erreur serveur
 */
router.post('/login', [
  body('mail').isEmail().withMessage('Email invalide'),
  body('mdp').notEmpty().withMessage('Le mot de passe est requis')
], authController.login);

/**
 * @swagger
 * /api/auth/forgot-password:
 *   post:
 *     summary: Demande de récupération de mot de passe
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - mail
 *             properties:
 *               mail:
 *                 type: string
 *                 format: email
 *                 description: Adresse email associée au compte
 *     responses:
 *       200:
 *         description: Email de récupération envoyé si le compte existe
 *       500:
 *         description: Erreur serveur
 */
router.post('/forgot-password', [
  body('mail').isEmail().withMessage('Email invalide')
], authController.forgotPassword);

/**
 * @swagger
 * /api/auth/reset-password:
 *   post:
 *     summary: Réinitialisation du mot de passe
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - token
 *               - newPassword
 *             properties:
 *               token:
 *                 type: string
 *                 description: Token de réinitialisation
 *               newPassword:
 *                 type: string
 *                 format: password
 *                 description: Nouveau mot de passe (min 6 caractères)
 *     responses:
 *       200:
 *         description: Mot de passe réinitialisé avec succès
 *       400:
 *         description: Token invalide ou expiré
 *       404:
 *         description: Utilisateur non trouvé
 *       500:
 *         description: Erreur serveur
 */
router.post('/reset-password', [
  body('token').notEmpty().withMessage('Token requis'),
  body('newPassword').isLength({ min: 6 }).withMessage('Le mot de passe doit contenir au moins 6 caractères')
], authController.resetPassword);

/**
 * @swagger
 * /api/auth/logout:
 *   post:
 *     summary: Déconnexion d'un utilisateur
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Déconnexion réussie
 *       401:
 *         description: Non authentifié
 *       500:
 *         description: Erreur serveur
 */
router.post('/logout', authenticate, authController.logout);

/**
 * @swagger
 * /api/auth/reset-admin:
 *   post:
 *     summary: Réinitialisation temporaire du mot de passe administrateur (ENDPOINT TEMPORAIRE - À SUPPRIMER EN PRODUCTION)
 *     tags: [Authentication]
 *     responses:
 *       200:
 *         description: Mot de passe administrateur réinitialisé avec succès
 *       404:
 *         description: Administrateur non trouvé
 *       500:
 *         description: Erreur serveur
 */
router.post('/reset-admin', authController.resetAdminPassword);

/**
 * @swagger
 * /api/auth/roles:
 *   get:
 *     summary: Récupérer tous les rôles
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Liste des rôles récupérée avec succès
 *       401:
 *         description: Non authentifié
 *       500:
 *         description: Erreur serveur
 */
router.get('/roles', authenticate, authController.getAllRoles);

module.exports = router;