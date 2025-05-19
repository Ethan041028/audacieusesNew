// cors-fix-complete.js
/**
 * Solution complète pour corriger le problème de CORS avec les images
 * Ce fichier contient du code à insérer dans le fichier app.js du serveur backend
 */

// CODE À REMPLACER DANS app.js (autour des lignes 70-100)
// Remplacez toute la section de configuration CORS et static files par ce code:

app.use(helmet({ 
  crossOriginResourcePolicy: false  // Désactiver crossOriginResourcePolicy pour permettre aux images d'être chargées
}));

// Middleware CORS global simplifié
app.use(cors({
  origin: '*',  // Permettre toutes les origines
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Origin', 'X-Requested-With', 'Accept'],
  credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan('combined', { stream: { write: message => logger.info(message.trim()) } }));

// Servir les fichiers statiques directement sans middleware CORS supplémentaire
const uploadsDir = path.join(__dirname, '../uploads');
app.use('/uploads', (req, res, next) => {
  // Désactiver les vérifications CORS pour les fichiers statiques
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
  next();
}, express.static(uploadsDir));

logger.info(`Dossier des uploads configuré: ${uploadsDir}`);

// Créer les dossiers nécessaires
const fs = require('fs');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
  logger.info(`Dossier des uploads créé: ${uploadsDir}`);
}

const modulesDir = path.join(uploadsDir, 'modules');
if (!fs.existsSync(modulesDir)) {
  fs.mkdirSync(modulesDir, { recursive: true });
  logger.info(`Dossier des uploads modules créé: ${modulesDir}`);
}
