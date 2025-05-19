const multer = require('multer');
const path = require('path');
const fs = require('fs');
const logger = require('../utils/logger');

// Configuration du stockage des fichiers
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = path.join(__dirname, '../../uploads/modules');
    
    // Créer le répertoire s'il n'existe pas
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
      logger.info(`Répertoire de stockage créé: ${uploadDir}`);
    }
    
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    // Générer un nom de fichier unique
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const extension = path.extname(file.originalname);
    cb(null, `module-${uniqueSuffix}${extension}`);
  }
});

// Filtre pour n'accepter que les images
const fileFilter = (req, file, cb) => {
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif'];
  
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Type de fichier non supporté. Seuls les formats JPEG, JPG, PNG et GIF sont acceptés.'), false);
  }
};

// Middleware pour l'upload d'une image de module
const uploadModuleImage = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB max
  },
  fileFilter: fileFilter
}).single('image');

// Middleware pour gérer l'upload d'image et les erreurs
exports.handleModuleImageUpload = (req, res, next) => {
  uploadModuleImage(req, res, function (err) {
    if (err instanceof multer.MulterError) {
      // Erreur Multer
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({
          error: 'Fichier trop volumineux',
          message: 'La taille du fichier ne doit pas dépasser 5 Mo'
        });
      }
      logger.error(`Erreur Multer lors de l'upload d'image: ${err.message}`);
      return res.status(400).json({
        error: 'Erreur d\'upload',
        message: err.message
      });
    } else if (err) {
      // Autre erreur
      logger.error(`Erreur lors de l'upload d'image: ${err.message}`);
      return res.status(400).json({
        error: 'Erreur d\'upload',
        message: err.message
      });
    }
    
    // Si un fichier a été téléchargé, ajouter son URL au corps de la requête
    if (req.file) {
      // Créer l'URL relative du fichier
      const relativePath = `/uploads/modules/${req.file.filename}`;
      req.body.image_url = relativePath;
      logger.info(`Image de module téléchargée: ${relativePath}`);
    }
    
    // Traiter les objectifs s'ils sont présents sous forme de chaîne JSON
    if (req.body.objectifs && typeof req.body.objectifs === 'string') {
      try {
        req.body.objectifs = JSON.parse(req.body.objectifs);
      } catch (error) {
        logger.error(`Erreur de parsing des objectifs: ${error.message}`);
      }
    }
    
    next();
  });
};
