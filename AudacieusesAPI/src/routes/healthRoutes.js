const express = require('express');
const router = express.Router();

// Route simple pour vérifier que l'API est en ligne
router.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', message: 'API is running', timestamp: new Date() });
});

module.exports = router;
