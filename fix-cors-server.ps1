# fix-cors-server.ps1
# Script pour mettre à jour la configuration CORS dans le serveur Express

Write-Host "🔧 Création d'une mise à jour simplifiée de la configuration CORS..." -ForegroundColor Cyan

$corsFixContent = @'
// Configuration CORS simplifiée
app.use(cors({
  origin: 'http://localhost:4200',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Origin', 'X-Requested-With', 'Accept'],
  exposedHeaders: ['Content-Type', 'Content-Length', 'Content-Disposition']
}));

app.use(express.json()); // Permet de parser le JSON
app.use(express.urlencoded({ extended: true })); // Parse les URL encodées
app.use(morgan('combined', { stream: { write: message => logger.info(message.trim()) } })); // Logging HTTP

// Configuration pour servir les fichiers statiques sans middleware CORS spécifique
const uploadsDir = path.join(__dirname, '../uploads');
app.use('/uploads', express.static(uploadsDir));
logger.info(`Dossier des uploads configuré: ${uploadsDir}`);

// Créer le dossier uploads s'il n'existe pas
const fs = require('fs');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
  logger.info(`Dossier des uploads créé: ${uploadsDir}`);
}

// Créer le dossier modules s'il n'existe pas
const modulesDir = path.join(uploadsDir, 'modules');
if (!fs.existsSync(modulesDir)) {
  fs.mkdirSync(modulesDir, { recursive: true });
  logger.info(`Dossier des uploads modules créé: ${modulesDir}`);
}
'@

Write-Host "✅ Voici la configuration CORS simplifiée à mettre dans app.js (ligne ~70-90):" -ForegroundColor Green
Write-Host $corsFixContent -ForegroundColor Yellow

Write-Host "`n💡 Mettez à jour ces lignes manuellement dans le fichier:" -ForegroundColor Cyan
Write-Host "e:\site web\Audacieuses-main\Audacieuses-main\AudacieusesAPI\src\app.js"

Write-Host "`n🚀 Ensuite, redémarrez le serveur Express avec les commandes:" -ForegroundColor Cyan
Write-Host "cd 'e:\site web\Audacieuses-main\Audacieuses-main\AudacieusesAPI'" -ForegroundColor Yellow
Write-Host "npm start" -ForegroundColor Yellow

Write-Host "`n📋 Une fois le serveur redémarré, ouvrez le fichier test-image-access.html dans votre navigateur pour vérifier l'accès aux images."
