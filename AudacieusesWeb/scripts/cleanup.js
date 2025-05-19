#!/usr/bin/env node
// filepath: e:\site web\Audacieuses-main\Audacieuses-main\AudacieusesWeb\scripts\cleanup.js
/**
 * Script pour nettoyer les fichiers et ressources inutiles dans l'application Angular
 */

const fs = require('fs');
const path = require('path');

// Chemins relatifs au répertoire racine du projet Angular
const ROOT_DIR = path.resolve(__dirname, '..');

// Liste des fichiers et dossiers à vérifier/nettoyer
const CLEANUP_TARGETS = [
  {
    path: 'src/assets/test-*.js',
    description: 'Scripts de test temporaires',
    delete: true
  },
  {
    path: 'src/app/utils/test-*.js',
    description: 'Scripts utilitaires de test',
    delete: true
  },
  {
    path: 'src/assets/unused',
    description: 'Dossier d\'assets inutilisés',
    delete: true,
    recursive: true
  },
  {
    path: 'temp',
    description: 'Dossier temporaire',
    delete: true,
    recursive: true
  }
];

// Fonction pour trouver les fichiers correspondant à un motif
function findFiles(pattern) {
  const dir = path.dirname(pattern);
  const filePattern = path.basename(pattern);
  const regex = new RegExp('^' + filePattern.replace(/\*/g, '.*') + '$');
  
  const fullDir = path.join(ROOT_DIR, dir);
  if (!fs.existsSync(fullDir)) {
    return [];
  }
  
  return fs.readdirSync(fullDir)
    .filter(file => regex.test(file))
    .map(file => path.join(dir, file));
}

// Fonction pour supprimer un fichier ou un dossier
function removeItem(itemPath, recursive = false) {
  const fullPath = path.join(ROOT_DIR, itemPath);
  
  if (!fs.existsSync(fullPath)) {
    return false;
  }
  
  const stats = fs.statSync(fullPath);
  
  if (stats.isDirectory()) {
    if (recursive) {
      // Supprimer récursivement le contenu du dossier
      fs.readdirSync(fullPath).forEach(file => {
        const curPath = path.join(fullPath, file);
        if (fs.statSync(curPath).isDirectory()) {
          removeItem(path.join(itemPath, file), true);
        } else {
          fs.unlinkSync(curPath);
        }
      });
      
      // Supprimer le dossier vide
      fs.rmdirSync(fullPath);
    }
    return true;
  } else {
    fs.unlinkSync(fullPath);
    return true;
  }
}

// Fonction principale de nettoyage
function cleanup() {
  console.log('=== Début du nettoyage des fichiers inutiles ===');
  
  let totalFound = 0;
  let totalRemoved = 0;
  
  CLEANUP_TARGETS.forEach(target => {
    console.log(`\nVérification de : ${target.description} (${target.path})`);
    
    try {
      // S'il s'agit d'un motif de fichier avec joker
      if (target.path.includes('*')) {
        const files = findFiles(target.path);
        
        if (files.length === 0) {
          console.log('  Aucun fichier correspondant trouvé.');
        } else {
          totalFound += files.length;
          console.log(`  ${files.length} fichier(s) trouvé(s):`);
          
          files.forEach(file => {
            console.log(`  - ${file}`);
            
            if (target.delete) {
              if (removeItem(file)) {
                console.log(`    ✓ Supprimé`);
                totalRemoved++;
              } else {
                console.log(`    ✗ Échec de la suppression`);
              }
            }
          });
        }
      } 
      // S'il s'agit d'un chemin spécifique (fichier ou dossier)
      else {
        const fullPath = path.join(ROOT_DIR, target.path);
        
        if (fs.existsSync(fullPath)) {
          totalFound++;
          console.log(`  Trouvé: ${target.path}`);
          
          if (target.delete) {
            if (removeItem(target.path, target.recursive)) {
              console.log(`  ✓ Supprimé`);
              totalRemoved++;
            } else {
              console.log(`  ✗ Échec de la suppression`);
            }
          }
        } else {
          console.log(`  Élément non trouvé.`);
        }
      }
    } catch (err) {
      console.error(`  Erreur lors du traitement de ${target.path}: ${err.message}`);
    }
  });
  
  console.log('\n=== Résumé du nettoyage ===');
  console.log(`Total des éléments trouvés: ${totalFound}`);
  console.log(`Total des éléments supprimés: ${totalRemoved}`);
  console.log('=== Nettoyage terminé ===');
}

// Exécuter le nettoyage
cleanup();
