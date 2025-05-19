const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const swaggerUi = require('swagger-ui-express');
const swaggerJsDoc = require('swagger-jsdoc');
const path = require('path');
const http = require('http');
// Chargement des variables d'environnement au début pour s'assurer qu'elles sont disponibles
require('dotenv').config();
const { sequelize } = require('./models');
const logger = require('./utils/logger');
const socketIO = require('./config/socketio'); // Importation de la configuration Socket.IO

// Importation des routes
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const moduleRoutes = require('./routes/moduleRoutes');
const seanceRoutes = require('./routes/seanceRoutes');
const evenementRoutes = require('./routes/evenementRoutes'); // Importation des routes d'événements
const adminRoutes = require('./routes/adminRoutes'); // Importation des routes d'administration
const activiteRoutes = require('./routes/activiteRoutes'); // Importation des routes d'activités

// Configuration de l'application Express
const app = express();
const PORT = process.env.PORT || 3000;


// Options Swagger pour la documentation API
const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Les Audacieuses API',
      version: '1.0.0',
      description: 'API pour la plateforme éducative "Les Audacieuses"',
      contact: {
        name: 'Support Technique',
        email: 'support@lesaudacieuses.fr'
      }
    },
    servers: [
      {
        url: `http://localhost:${PORT}`,
        description: 'Serveur de développement'
      },
      {
        url: 'https://api.lesaudacieuses.fr',
        description: 'Serveur de production'
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT'
        }
      }
    },
    security: [
      {
        bearerAuth: []
      }
    ]
  },
  // Utilisation de chemins absolus pour éviter les problèmes relatifs au répertoire d'exécution
  apis: [path.join(__dirname, './routes/*.js'), path.join(__dirname, './models/*.js')]
};

const swaggerDocs = swaggerJsDoc(swaggerOptions);

// Middlewares
app.use(helmet({ 
  crossOriginResourcePolicy: false  // Désactiver crossOriginResourcePolicy pour permettre aux images d'être chargées
}));

// Middleware CORS configuré pour accepter les credentials avec origine spécifique
app.use(cors({
  origin: ['http://localhost:4200', 'https://lesaudacieuses.fr'],  // Origines spécifiques autorisées
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Origin', 'X-Requested-With', 'Accept'],
  credentials: true,
  optionsSuccessStatus: 204
}));

app.use(express.json()); // Permet de parser le JSON
app.use(express.urlencoded({ extended: true })); // Parse les URL encodées
app.use(morgan('combined', { stream: { write: message => logger.info(message.trim()) } })); // Logging HTTP

// Configuration pour servir les fichiers statiques avec CORS
const uploadsDir = path.join(__dirname, '../uploads');

// Servir les fichiers statiques directement avec des en-têtes CORS spécifiques
app.use('/uploads', (req, res, next) => {
  // Configurer CORS pour les fichiers statiques avec les mêmes origines que la config globale
  const origin = req.headers.origin;
  if (origin && ['http://localhost:4200', 'https://lesaudacieuses.fr'].includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
  next();
}, express.static(uploadsDir));

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

// Routes API
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/modules', moduleRoutes);
app.use('/api/seances', seanceRoutes);
app.use('/api/evenements', evenementRoutes); // Ajout des routes d'événements
app.use('/api/admin', adminRoutes); // Ajout des routes d'administration
app.use('/api/activites', activiteRoutes); // Ajout des routes d'activités

// Route pour la documentation API avec Swagger
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocs));

// Route par défaut pour tester si le serveur est en cours d'exécution
app.get('/', (req, res) => {
  res.json({ message: 'API Les Audacieuses en fonctionnement' });
});

// Middleware pour gérer les routes qui n'existent pas
app.use((req, res, next) => {
  const error = new Error(`Route non trouvée - ${req.originalUrl}`);
  error.status = 404;
  next(error);
});

// Middleware de gestion des erreurs
app.use((err, req, res, next) => {
  const statusCode = err.status || 500;
  logger.error(`${statusCode} - ${err.message} - ${req.originalUrl} - ${req.method} - ${req.ip}`);
  
  res.status(statusCode).json({
    status: 'error',
    statusCode,
    message: process.env.NODE_ENV === 'production' ? 'Une erreur est survenue' : err.message,
    stack: process.env.NODE_ENV === 'production' ? undefined : err.stack
  });
});

// Synchronisation avec la base de données et démarrage du serveur
(async () => {
  try {
    await sequelize.authenticate();
    logger.info('Connexion à la base de données établie avec succès.');
      // En mode développement, on peut synchroniser automatiquement les modèles
    if (process.env.SYNC_DB === 'true') {
      try {      // 1. Synchroniser d'abord les modèles de base (TypeActivite et Role)
        const { TypeActivite, Role, User, Module, Seance, Activite } = require('./models');
        
        // Limiter la création d'index en utilisant force: false et alter: false
        // Cela évite l'erreur "Too many keys specified; max 64 keys allowed"
        await TypeActivite.sync({ force: false, alter: false });
        await Role.sync({ force: false, alter: false });
        await User.sync({ force: false, alter: false });
        await Module.sync({ force: false, alter: false });
        await Seance.sync({ force: false, alter: false });
        await Activite.sync({ force: false, alter: false });
        
        // 2. Initialiser les données de base pour type_activites si la table est vide
        const typeCount = await TypeActivite.count();
        
        if (typeCount === 0) {
          logger.info('Initialisation des types d\'activités de base...');
          await TypeActivite.bulkCreate([
            { type_activite: 'Quiz' },
            { type_activite: 'Exercice' },
            { type_activite: 'Lecture' },
            { type_activite: 'Vidéo' },
            { type_activite: 'Discussion' }
          ]);
          logger.info('Types d\'activités de base créés avec succès.');
        }
        
        // 3. Initialiser les rôles si la table est vide
        const roleCount = await Role.count();
        
        if (roleCount === 0) {
          logger.info('Initialisation des rôles de base...');
          await Role.bulkCreate([
            { nom: 'client', description: 'Utilisateur standard' },
            { nom: 'admin', description: 'Administrateur' },
            { nom: 'admin_plus', description: 'Super administrateur' }
          ]);
          logger.info('Rôles de base créés avec succès.');
        }
        
        // 4. Vérifier si la table activites existe et contient des données
        try {
          const tableExists = await sequelize.query(
            "SELECT 1 FROM information_schema.tables WHERE table_schema = 'audacieuses_db' AND table_name = 'activites'",
            { type: sequelize.QueryTypes.SELECT }
          );
            if (tableExists.length > 0) {
            logger.info('Table activites existe.');
            
            // Vérifier si la colonne type_activite_id existe déjà dans activites
            const columnExists = await sequelize.query(
              "SELECT 1 FROM information_schema.columns WHERE table_schema = 'audacieuses_db' AND table_name = 'activites' AND column_name = 'type_activite_id'",
              { type: sequelize.QueryTypes.SELECT }
            );
            
            const activiteCount = await sequelize.query('SELECT COUNT(*) as count FROM activites', 
              { type: sequelize.QueryTypes.SELECT }
            );
            
            logger.info(`Table activites contient ${activiteCount[0].count} enregistrements.`);
              // Récupérer un ID valide de type_activites (par exemple Quiz)
            const defaultType = await TypeActivite.findOne({ where: { type_activite: 'Quiz' } });
            
            if (defaultType && columnExists.length > 0) {
              // La colonne type_activite_id existe, mettre à jour les valeurs nulles ou zéro
              await sequelize.query('UPDATE activites SET type_activite_id = :typeId WHERE type_activite_id IS NULL OR type_activite_id = 0', { 
                replacements: { typeId: defaultType.id },
                type: sequelize.QueryTypes.UPDATE 
              });
              logger.info('Activités existantes avec type_activite_id NULL ou 0 mises à jour avec le type par défaut.');
            }
          } else {
            logger.info('Table activites pas encore créée, aucune mise à jour nécessaire.');
          }
        } catch (tableError) {
          logger.error('Erreur lors de la vérification de la table activites:', tableError.message);
        }
        
        // 5. Vérifier si la table users existe et contient des données
        try {
          const usersExists = await sequelize.query(
            "SELECT 1 FROM information_schema.tables WHERE table_schema = 'audacieuses_db' AND table_name = 'users'",
            { type: sequelize.QueryTypes.SELECT }
          );
          
          if (usersExists.length > 0) {
            logger.info('Table users existe.');
            
            // Vérifier si la colonne mail existe déjà
            const mailColumnExists = await sequelize.query(
              "SELECT 1 FROM information_schema.columns WHERE table_schema = 'audacieuses_db' AND table_name = 'users' AND column_name = 'mail'",
              { type: sequelize.QueryTypes.SELECT }
            );
            
            const userCount = await sequelize.query('SELECT COUNT(*) as count FROM users', 
              { type: sequelize.QueryTypes.SELECT }
            );
            
            logger.info(`Table users contient ${userCount[0].count} enregistrements.`);
            
            // Si la colonne mail n'existe pas mais qu'il y a des utilisateurs
            if (mailColumnExists.length === 0 && userCount[0].count > 0) {
              try {
                // Ajouter la colonne mail en permettant NULL pour l'instant
                await sequelize.query('ALTER TABLE users ADD COLUMN mail VARCHAR(50) NULL', {
                  type: sequelize.QueryTypes.RAW
                });
                logger.info('Colonne mail ajoutée avec succès à la table users (temporairement NULL).');
                
                // Mettre à jour la colonne avec des valeurs uniques temporaires
                await sequelize.query("UPDATE users SET mail = CONCAT('user_', id, '@example.com') WHERE mail IS NULL", {
                  type: sequelize.QueryTypes.RAW
                });
                logger.info('Valeurs temporaires ajoutées pour la colonne mail.');
                
                // Maintenant rendre la colonne NOT NULL et UNIQUE
                await sequelize.query('ALTER TABLE users MODIFY COLUMN mail VARCHAR(50) NOT NULL UNIQUE', {
                  type: sequelize.QueryTypes.RAW
                });
                logger.info('Colonne mail mise à jour pour être NOT NULL et UNIQUE.');
              } catch (alterError) {
                logger.error('Erreur lors de la modification de la table users:', alterError.message);
              }
            }
            
            // Vérifier également la colonne role_id
            const roleColumnExists = await sequelize.query(
              "SELECT 1 FROM information_schema.columns WHERE table_schema = 'audacieuses_db' AND table_name = 'users' AND column_name = 'role_id'",
              { type: sequelize.QueryTypes.SELECT }
            );
            
            if (roleColumnExists.length === 0 && userCount[0].count > 0) {
              try {
                // Récupérer l'ID du rôle client par défaut
                const defaultRole = await Role.findOne({ where: { nom: 'client' } });
                
                if (defaultRole) {
                  // Ajouter la colonne role_id avec une valeur par défaut
                  await sequelize.query('ALTER TABLE users ADD COLUMN role_id INT NOT NULL DEFAULT :roleId', {
                    replacements: { roleId: defaultRole.id },
                    type: sequelize.QueryTypes.RAW
                  });
                  logger.info('Colonne role_id (roleId) ajoutée avec succès à la table users avec valeur par défaut.');
                  
                  // Ajouter directement la contrainte de clé étrangère
                  await sequelize.query(
                    'ALTER TABLE users ADD CONSTRAINT fk_users_role FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE NO ACTION ON UPDATE CASCADE',
                    { type: sequelize.QueryTypes.RAW }
                  );
                  logger.info('Contrainte de clé étrangère ajoutée avec succès pour la colonne role_id.');
                }
              } catch (alterError) {
                logger.error('Erreur lors de l\'ajout de la colonne role_id:', alterError.message);
              }
            } else if (roleColumnExists.length > 0) {
              // La colonne role_id existe déjà, vérifier si la contrainte de clé étrangère existe
              try {
                // Vérifier s'il existe déjà une contrainte de clé étrangère
                const fkExists = await sequelize.query(
                  "SELECT CONSTRAINT_NAME FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE WHERE TABLE_SCHEMA = 'audacieuses_db' AND TABLE_NAME = 'users' AND COLUMN_NAME = 'role_id' AND REFERENCED_TABLE_NAME IS NOT NULL",
                  { type: sequelize.QueryTypes.SELECT }
                );
                
                if (fkExists.length === 0) {
                  // Ajouter la contrainte de clé étrangère
                  await sequelize.query(
                    'ALTER TABLE users ADD CONSTRAINT fk_users_role FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE NO ACTION ON UPDATE CASCADE',
                    { type: sequelize.QueryTypes.RAW }
                  );
                  logger.info('Contrainte de clé étrangère ajoutée avec succès pour la colonne role_id existante.');
                }
              } catch (fkError) {
                logger.error('Erreur lors de la vérification/ajout de la contrainte de clé étrangère:', fkError.message);
              }
            }
          } else {
            logger.info('Table users pas encore créée, aucune mise à jour nécessaire.');
          }
        } catch (tableError) {
          logger.error('Erreur lors de la vérification de la table users:', tableError.message);
        }
        
        // 6. Synchroniser le reste des modèles avec alter:true pour préserver les données
        // Au lieu de synchroniser tous les modèles d'un coup, allons-y un par un
        try {
          // Récupérer tous les modèles
          const models = require('./models');
          
          // Vérifier et initialiser les StatusSuivi pour éviter l'erreur de validation
          try {
            const statusTableExists = await sequelize.query(
              "SELECT 1 FROM information_schema.tables WHERE table_schema = 'audacieuses_db' AND table_name = 'status_suivi'",
              { type: sequelize.QueryTypes.SELECT }
            );
            
            if (statusTableExists.length > 0) {
              logger.info('Table status_suivi existe.');
              
              // Vérifier si la colonne type_status existe déjà
              const typeStatusExists = await sequelize.query(
                "SELECT 1 FROM information_schema.columns WHERE table_schema = 'audacieuses_db' AND table_name = 'status_suivi' AND column_name = 'type_status'",
                { type: sequelize.QueryTypes.SELECT }
              );
              
              // Vérifier le nombre d'enregistrements
              const statusCount = await sequelize.query('SELECT COUNT(*) as count FROM status_suivi', 
                { type: sequelize.QueryTypes.SELECT }
              );
              
              logger.info(`Table status_suivi contient ${statusCount[0].count} enregistrements.`);
              
              // Si la colonne n'existe pas mais qu'il y a des données
              if (typeStatusExists.length === 0 && statusCount[0].count > 0) {
                try {
                  // Ajouter la colonne type_status en permettant NULL pour l'instant
                  await sequelize.query('ALTER TABLE status_suivi ADD COLUMN type_status VARCHAR(50) NULL', {
                    type: sequelize.QueryTypes.RAW
                  });
                  logger.info('Colonne type_status ajoutée avec succès à la table status_suivi (temporairement NULL).');
                  
                  // Mettre à jour la colonne avec des valeurs uniques
                  await sequelize.query("UPDATE status_suivi SET type_status = CONCAT('status_', id) WHERE type_status IS NULL", {
                    type: sequelize.QueryTypes.RAW
                  });
                  logger.info('Valeurs temporaires ajoutées pour la colonne type_status.');
                  
                  // Maintenant rendre la colonne NOT NULL et UNIQUE
                  await sequelize.query('ALTER TABLE status_suivi MODIFY COLUMN type_status VARCHAR(50) NOT NULL UNIQUE', {
                    type: sequelize.QueryTypes.RAW
                  });
                  logger.info('Colonne type_status mise à jour pour être NOT NULL et UNIQUE.');
                } catch (alterError) {
                  logger.error('Erreur lors de la modification de la table status_suivi:', alterError.message);
                }
              }
            }
          } catch (statusError) {
            logger.error('Erreur lors de la vérification/modification de status_suivi:', statusError.message);
          }
          
          // Traitement spécial pour la table evenements
          try {
            const evenementTableExists = await sequelize.query(
              "SELECT 1 FROM information_schema.tables WHERE table_schema = 'audacieuses_db' AND table_name = 'evenements'",
              { type: sequelize.QueryTypes.SELECT }
            );
            
            if (evenementTableExists.length > 0) {
              logger.info('Table evenements existe.');
              
              // Vérifier si la colonne createur_id existe déjà
              const createurIdExists = await sequelize.query(
                "SELECT 1 FROM information_schema.columns WHERE table_schema = 'audacieuses_db' AND table_name = 'evenements' AND column_name = 'createur_id'",
                { type: sequelize.QueryTypes.SELECT }
              );
              
              // Vérifier le nombre d'enregistrements
              const evenementCount = await sequelize.query('SELECT COUNT(*) as count FROM evenements', 
                { type: sequelize.QueryTypes.SELECT }
              );
              
              logger.info(`Table evenements contient ${evenementCount[0].count} enregistrements.`);
              
              // Si la colonne n'existe pas mais qu'il y a des données
              if (createurIdExists.length === 0 && evenementCount[0].count > 0) {
                try {
                  // Récupérer un ID d'admin pour l'attribution par défaut
                  const adminUser = await sequelize.query(
                    "SELECT u.id FROM users u JOIN role r ON u.role_id = r.id WHERE r.nom = 'admin' LIMIT 1",
                    { type: sequelize.QueryTypes.SELECT }
                  );
                  
                  const defaultUserId = adminUser.length > 0 ? adminUser[0].id : 1;
                  
                  // Ajouter la colonne createur_id avec une valeur par défaut
                  await sequelize.query('ALTER TABLE evenements ADD COLUMN createur_id INT NOT NULL DEFAULT :userId', {
                    replacements: { userId: defaultUserId },
                    type: sequelize.QueryTypes.RAW
                  });
                  logger.info('Colonne createur_id ajoutée avec succès à la table evenements avec valeur par défaut.');
                  
                  // Ajouter la contrainte de clé étrangère
                  await sequelize.query(
                    'ALTER TABLE evenements ADD CONSTRAINT fk_evenements_user FOREIGN KEY (createur_id) REFERENCES users(id) ON DELETE NO ACTION ON UPDATE CASCADE',
                    { type: sequelize.QueryTypes.RAW }
                  );
                  logger.info('Contrainte de clé étrangère ajoutée avec succès pour la colonne createur_id.');
                } catch (alterError) {
                  logger.error('Erreur lors de la modification de la table evenements:', alterError.message);
                }
              }
            }
          } catch (evenementError) {
            logger.error('Erreur lors de la vérification/modification de evenements:', evenementError.message);
          }
          
          // Liste ordonnée des modèles pour synchronisation
          const modelOrder = [
            'TypeActivite', 'Role', 'User', 'Module', 'Seance', 'Activite', 
            'StatusSuivi', 'Suivi', 'ReponseClient', 'Message', 'Evenement'
          ];
          
          // Synchroniser les modèles un par un dans l'ordre défini
          for (const modelName of modelOrder) {
            if (models[modelName]) {
              try {
                logger.info(`Synchronisation du modèle ${modelName}...`);
                
                // Gestion spéciale pour le modèle User à cause du problème de contrainte
                if (modelName === 'User') {
                  try {
                    // 1. Vérifier si la contrainte de clé étrangère existe déjà
                    const fkExists = await sequelize.query(
                      "SELECT CONSTRAINT_NAME FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE WHERE TABLE_SCHEMA = 'audacieuses_db' AND TABLE_NAME = 'users' AND COLUMN_NAME = 'role_id' AND REFERENCED_TABLE_NAME IS NOT NULL",
                      { type: sequelize.QueryTypes.SELECT }
                    );
                    
                    // 2. Si elle existe, la supprimer d'abord
                    if (fkExists.length > 0) {
                      try {
                        await sequelize.query(
                          `ALTER TABLE users DROP FOREIGN KEY ${fkExists[0].CONSTRAINT_NAME}`,
                          { type: sequelize.QueryTypes.RAW }
                        );
                        logger.info(`Contrainte ${fkExists[0].CONSTRAINT_NAME} supprimée avec succès.`);
                      } catch (dropError) {
                        logger.error(`Erreur lors de la suppression de la contrainte: ${dropError.message}`);
                      }
                    }
                    
                    // 3. Au lieu de synchroniser le modèle normalement qui réintroduirait l'erreur,
                    // nous mettons à jour les colonnes manuellement sans toucher aux contraintes
                    await sequelize.query(
                      "ALTER TABLE users CHANGE prenom prenom VARCHAR(50) NOT NULL",
                      { type: sequelize.QueryTypes.RAW }
                    );
                    
                    await sequelize.query(
                      "ALTER TABLE users CHANGE nom nom VARCHAR(50) NOT NULL",
                      { type: sequelize.QueryTypes.RAW }
                    );
                    
                    await sequelize.query(
                      "ALTER TABLE users CHANGE mail mail VARCHAR(50) NOT NULL UNIQUE",
                      { type: sequelize.QueryTypes.RAW }
                    );
                    
                    // 4. Ajouter manuellement la bonne contrainte
                    try {
                      await sequelize.query(
                        'ALTER TABLE users ADD CONSTRAINT fk_users_role FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE NO ACTION ON UPDATE CASCADE',
                        { type: sequelize.QueryTypes.RAW }
                      );
                      logger.info('Contrainte de clé étrangère correcte ajoutée manuellement.');
                    } catch (addFkError) {
                      // La contrainte existe peut-être déjà
                      logger.error(`Erreur lors de l'ajout de la contrainte: ${addFkError.message}`);
                    }
                    
                    logger.info('Modèle User synchronisé manuellement avec succès.');
                  } catch (userSyncError) {
                    logger.error(`Erreur lors de la synchronisation manuelle du modèle User: ${userSyncError.message}`);
                  }
                } 
                // Gestion spéciale pour le modèle Evenement
                else if (modelName === 'Evenement') {
                  // Synchroniser sans essayer de supprimer la contrainte inexistante
                  try {
                    // Vérifier d'abord si des contraintes existent
                    const constraints = await sequelize.query(
                      "SELECT CONSTRAINT_NAME FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE WHERE TABLE_SCHEMA = 'audacieuses_db' AND TABLE_NAME = 'evenements' AND REFERENCED_TABLE_NAME IS NOT NULL",
                      { type: sequelize.QueryTypes.SELECT }
                    );
                    
                    // Supprimer les contraintes existantes de manière sécurisée
                    for (const constraint of constraints) {
                      try {
                        await sequelize.query(
                          `ALTER TABLE evenements DROP FOREIGN KEY ${constraint.CONSTRAINT_NAME}`,
                          { type: sequelize.QueryTypes.RAW }
                        );
                        logger.info(`Contrainte ${constraint.CONSTRAINT_NAME} supprimée avec succès.`);
                      } catch (dropError) {
                        logger.error(`Erreur lors de la suppression de la contrainte ${constraint.CONSTRAINT_NAME}: ${dropError.message}`);
                      }
                    }
                    
                    // Synchroniser le modèle
                    // Limiter la création d'index en utilisant force: false et alter: false
                    await models[modelName].sync({ force: false, alter: false });
                    
                    // Ajouter manuellement les bonnes contraintes
                    await sequelize.query(
                      'ALTER TABLE evenements ADD CONSTRAINT fk_evenements_user FOREIGN KEY (createur_id) REFERENCES users(id) ON DELETE NO ACTION ON UPDATE CASCADE',
                      { type: sequelize.QueryTypes.RAW }
                    );
                    
                    await sequelize.query(
                      'ALTER TABLE evenements ADD CONSTRAINT fk_evenements_seance FOREIGN KEY (seance_id) REFERENCES seances(id) ON DELETE SET NULL ON UPDATE CASCADE',
                      { type: sequelize.QueryTypes.RAW }
                    );
                    
                    logger.info('Contraintes de clé étrangère correctes ajoutées manuellement à la table evenements.');
                  } catch (evenementError) {
                    logger.error(`Erreur lors de la synchronisation spéciale du modèle Evenement: ${evenementError.message}`);
                  }
                }
                else {
                  // Pour les autres modèles, synchronisation normale
                  // Limiter la création d'index en utilisant force: false et alter: false
                  await models[modelName].sync({ force: false, alter: false });
                }
                
                logger.info(`Modèle ${modelName} synchronisé avec succès.`);
              } catch (modelSyncError) {
                logger.error(`Erreur lors de la synchronisation du modèle ${modelName}:`, modelSyncError);
                // Continuer avec le modèle suivant
              }
            }
          }
          
          logger.info('Tous les modèles synchronisés individuellement avec la base de données.');
        } catch (syncError) {
          logger.error('Erreur lors de la synchronisation individuelle des modèles:', syncError);
        }
      } catch (syncError) {
        logger.error('Erreur lors de la synchronisation des modèles:', syncError);
        // Continuer le démarrage du serveur malgré l'erreur de synchronisation
      }
    }
    
    // Création d'un serveur HTTP explicite au lieu d'utiliser app.listen
    const server = http.createServer(app);
    
    // Initialisation de Socket.IO avec le serveur HTTP
    const io = socketIO.init(server);
    
    server.listen(PORT, () => {
      logger.info(`Serveur démarré sur le port ${PORT}.`);
      logger.info(`Documentation API disponible sur http://localhost:${PORT}/api-docs`);
      logger.info('Socket.IO initialisé et prêt à recevoir des connexions');
    });
  } catch (error) {
    logger.error('Impossible de se connecter à la base de données:', error);
    process.exit(1);
  }
})();

module.exports = app; // Pour les tests