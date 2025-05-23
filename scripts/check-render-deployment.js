'use strict';

/**
 * Vérification pré-déploiement pour Render avec PostgreSQL
 * Ce script vérifie que tout est correctement configuré pour le déploiement
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Fonction pour afficher un message coloré
function logMessage(type, message) {
  const colors = {
    info: '\x1b[36m%s\x1b[0m',    // Cyan
    success: '\x1b[32m%s\x1b[0m',  // Vert
    warning: '\x1b[33m%s\x1b[0m',  // Jaune
    error: '\x1b[31m%s\x1b[0m'     // Rouge
  };
  
  console.log(colors[type], `[${type.toUpperCase()}] ${message}`);
}

// Fonction pour vérifier si un fichier existe
function checkFileExists(filePath, description) {
  try {
    if (fs.existsSync(filePath)) {
      logMessage('success', `✓ ${description} trouvé: ${filePath}`);
      return true;
    } else {
      logMessage('error', `✗ ${description} non trouvé: ${filePath}`);
      return false;
    }
  } catch (err) {
    logMessage('error', `Erreur lors de la vérification de ${filePath}: ${err.message}`);
    return false;
  }
}

// Fonction pour vérifier le contenu d'un fichier JSON
function checkJsonContent(filePath, requiredDeps) {
  try {
    const fileContent = fs.readFileSync(filePath, 'utf8');
    const jsonContent = JSON.parse(fileContent);
    
    let allFound = true;
    
    for (const dep of requiredDeps) {
      if (jsonContent.dependencies && jsonContent.dependencies[dep]) {
        logMessage('success', `✓ Dépendance ${dep} trouvée: ${jsonContent.dependencies[dep]}`);
      } else {
        logMessage('error', `✗ Dépendance ${dep} manquante dans ${filePath}`);
        allFound = false;
      }
    }
    
    return allFound;
  } catch (err) {
    logMessage('error', `Erreur lors de la lecture/analyse de ${filePath}: ${err.message}`);
    return false;
  }
}

// Fonction pour vérifier la présence de variables dans un fichier
function checkFileForContent(filePath, patterns) {
  try {
    const fileContent = fs.readFileSync(filePath, 'utf8');
    
    let allFound = true;
    
    for (const pattern of patterns) {
      if (fileContent.includes(pattern)) {
        logMessage('success', `✓ Motif "${pattern}" trouvé dans ${filePath}`);
      } else {
        logMessage('error', `✗ Motif "${pattern}" non trouvé dans ${filePath}`);
        allFound = false;
      }
    }
    
    return allFound;
  } catch (err) {
    logMessage('error', `Erreur lors de la lecture de ${filePath}: ${err.message}`);
    return false;
  }
}

// Fonction principale pour les vérifications
async function runChecks() {
  logMessage('info', 'Démarrage des vérifications pré-déploiement pour Render avec PostgreSQL...');
  
  // Compteurs pour le résumé
  let passedChecks = 0;
  let totalChecks = 0;
  
  // 1. Vérifier les fichiers essentiels
  logMessage('info', 'Vérification des fichiers essentiels...');
  const essentialFiles = [
    { path: path.join(__dirname, '..', 'render.yaml'), desc: 'Configuration Render' },
    { path: path.join(__dirname, '..', 'AudacieusesAPI', 'src', 'config', 'database.js'), desc: 'Configuration de base de données' },
    { path: path.join(__dirname, '..', 'AudacieusesAPI', 'src', 'routes', 'healthRoutes.js'), desc: 'Routes de healthcheck' },
    { path: path.join(__dirname, '..', 'AudacieusesAPI', 'scripts', 'render-postgres-init.sh'), desc: 'Script d\'initialisation PostgreSQL' }
  ];
  
  for (const file of essentialFiles) {
    totalChecks++;
    if (checkFileExists(file.path, file.desc)) {
      passedChecks++;
    }
  }
  
  // 2. Vérifier les dépendances PostgreSQL
  logMessage('info', 'Vérification des dépendances PostgreSQL...');
  const packageJsonPath = path.join(__dirname, '..', 'AudacieusesAPI', 'package.json');
  
  totalChecks++;
  if (checkFileExists(packageJsonPath, 'Fichier package.json')) {
    const requiredDeps = ['pg', 'pg-hstore', 'sequelize'];
    
    totalChecks++;
    if (checkJsonContent(packageJsonPath, requiredDeps)) {
      passedChecks++;
    }
  }
  passedChecks++;
  
  // 3. Vérifier la configuration PostgreSQL
  logMessage('info', 'Vérification de la configuration PostgreSQL...');
  const databaseConfigPath = path.join(__dirname, '..', 'AudacieusesAPI', 'src', 'config', 'database.js');
  const configPatterns = [
    'dialect: dialect',
    'dialectOptions',
    'ssl: {',
    'require: true'
  ];
  
  totalChecks++;
  if (checkFileForContent(databaseConfigPath, configPatterns)) {
    passedChecks++;
  }
  
  // 4. Vérifier le fichier render.yaml
  logMessage('info', 'Vérification de la configuration Render...');
  const renderYamlPath = path.join(__dirname, '..', 'render.yaml');
  const renderPatterns = [
    'type: postgres',
    'DB_DIALECT',
    'value: postgres',
    'healthCheckPath: /api/health'
  ];
  
  totalChecks++;
  if (checkFileForContent(renderYamlPath, renderPatterns)) {
    passedChecks++;
  }
  
  // 5. Afficher le résumé des vérifications
  logMessage('info', `Résumé des vérifications: ${passedChecks}/${totalChecks} vérifications réussies`);
  
  if (passedChecks === totalChecks) {
    logMessage('success', '✅ Toutes les vérifications ont réussi! L\'application est prête pour le déploiement sur Render.');
    return true;
  } else {
    logMessage('warning', '⚠️ Certaines vérifications ont échoué. Veuillez corriger les problèmes avant le déploiement.');
    return false;
  }
}

// Exécuter les vérifications
runChecks().then(success => {
  if (success) {
    process.exit(0);
  } else {
    process.exit(1);
  }
}).catch(err => {
  logMessage('error', `Erreur lors des vérifications: ${err.message}`);
  process.exit(1);
});
