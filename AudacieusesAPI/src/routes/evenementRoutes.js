const express = require('express');
const router = express.Router();
const evenementController = require('../controllers/evenementController');
const { authenticate } = require('../middleware/authMiddleware');
const { checkRole } = require('../middleware/roleMiddleware');

// Routes protégées - nécessitent d'être authentifié
router.use(authenticate);

// Récupérer tous les événements
router.get('/', evenementController.getAllEvenements);

// Récupérer un événement par son ID
router.get('/:id', evenementController.getEvenementById);

// Récupérer les événements d'un utilisateur
router.get('/user/:userId', evenementController.getUserEvenements);

// Récupérer les rappels d'événements pour l'utilisateur connecté
router.get('/rappels/utilisateur', evenementController.getUserRappels);

// Créer un nouvel événement
router.post('/', evenementController.createEvenement);

// Mettre à jour un événement
router.put('/:id', evenementController.updateEvenement);

// Supprimer un événement
router.delete('/:id', evenementController.deleteEvenement);

// Ajouter un participant à un événement
router.post('/:evenementId/participants/:userId', evenementController.addParticipant);

// Supprimer un participant d'un événement
router.delete('/:evenementId/participants/:userId', evenementController.removeParticipant);

// Routes accessibles uniquement aux administrateurs
router.use(checkRole(['admin', 'admin_plus']));

// ... Futures routes réservées aux administrateurs ...

module.exports = router;