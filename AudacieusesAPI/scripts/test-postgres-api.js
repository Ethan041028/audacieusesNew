'use strict';

const fetch = require('node-fetch');
const logger = require('../src/utils/logger');

// Fonctions de test
async function testEndpoints() {
  const API_URL = process.env.API_URL || 'http://localhost:3500/api';
  const endpoints = [
    { method: 'GET', path: '/users', name: 'Liste des utilisateurs' },
    { method: 'GET', path: '/roles', name: 'Liste des rôles' },
    { method: 'GET', path: '/evenements', name: 'Liste des événements' },
    { method: 'GET', path: '/modules', name: 'Liste des modules' }
  ];

  logger.info('Début des tests des points d\'accès de l\'API...');
  let allPassed = true;

  for (const endpoint of endpoints) {
    try {
      const response = await fetch(`${API_URL}${endpoint.path}`, { 
        method: endpoint.method,
        headers: { 'Content-Type': 'application/json' }
      });
      
      const data = await response.json();
      
      if (response.ok) {
        logger.info(`✓ Test réussi: ${endpoint.name} (${endpoint.method} ${endpoint.path})`);
        logger.info(`  Statut: ${response.status}`);
        logger.info(`  Réponse: ${Array.isArray(data) ? `${data.length} éléments` : 'Objet'}`);
      } else {
        logger.error(`✗ Test échoué: ${endpoint.name} (${endpoint.method} ${endpoint.path})`);
        logger.error(`  Statut: ${response.status}`);
        logger.error(`  Erreur: ${JSON.stringify(data)}`);
        allPassed = false;
      }
    } catch (error) {
      logger.error(`✗ Erreur lors du test: ${endpoint.name} (${endpoint.method} ${endpoint.path})`);
      logger.error(`  Erreur: ${error.message}`);
      allPassed = false;
    }
  }

  return allPassed;
}

// Fonction pour tester une opération CRUD complète (Create, Read, Update, Delete)
async function testCrudOperations() {
  const API_URL = process.env.API_URL || 'http://localhost:3500/api';
  let testUserId = null;
  let allPassed = true;

  logger.info('Début des tests CRUD...');

  // 1. Test de création (CREATE)
  try {
    const testUser = {
      mail: `test-${Date.now()}@example.com`,
      mdp: 'testPassword123!',
      prenom: 'Test',
      nom: 'Utilisateur',
      telephone: '0123456789',
      role_id: 1 // Supposons que l'ID 1 est un rôle valide
    };

    const createResponse = await fetch(`${API_URL}/users`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testUser)
    });

    const createData = await createResponse.json();

    if (createResponse.ok && createData.id) {
      testUserId = createData.id;
      logger.info(`✓ Test CREATE réussi: Utilisateur créé avec l'ID ${testUserId}`);
    } else {
      logger.error(`✗ Test CREATE échoué: ${JSON.stringify(createData)}`);
      allPassed = false;
      return allPassed; // Arrêter les tests si on ne peut pas créer un utilisateur
    }
  } catch (error) {
    logger.error(`✗ Erreur lors du test CREATE: ${error.message}`);
    allPassed = false;
    return allPassed;
  }

  // 2. Test de lecture (READ)
  try {
    const readResponse = await fetch(`${API_URL}/users/${testUserId}`);
    const readData = await readResponse.json();

    if (readResponse.ok && readData.id === testUserId) {
      logger.info(`✓ Test READ réussi: Utilisateur avec l'ID ${testUserId} récupéré`);
    } else {
      logger.error(`✗ Test READ échoué: ${JSON.stringify(readData)}`);
      allPassed = false;
    }
  } catch (error) {
    logger.error(`✗ Erreur lors du test READ: ${error.message}`);
    allPassed = false;
  }

  // 3. Test de mise à jour (UPDATE)
  try {
    const updateData = {
      prenom: 'TestModifié',
      nom: 'UtilisateurModifié'
    };

    const updateResponse = await fetch(`${API_URL}/users/${testUserId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updateData)
    });

    const updateResult = await updateResponse.json();

    if (updateResponse.ok) {
      logger.info(`✓ Test UPDATE réussi: Utilisateur avec l'ID ${testUserId} mis à jour`);
    } else {
      logger.error(`✗ Test UPDATE échoué: ${JSON.stringify(updateResult)}`);
      allPassed = false;
    }
  } catch (error) {
    logger.error(`✗ Erreur lors du test UPDATE: ${error.message}`);
    allPassed = false;
  }

  // 4. Test de suppression (DELETE)
  try {
    const deleteResponse = await fetch(`${API_URL}/users/${testUserId}`, {
      method: 'DELETE'
    });

    const deleteResult = await deleteResponse.json();

    if (deleteResponse.ok) {
      logger.info(`✓ Test DELETE réussi: Utilisateur avec l'ID ${testUserId} supprimé`);
    } else {
      logger.error(`✗ Test DELETE échoué: ${JSON.stringify(deleteResult)}`);
      allPassed = false;
    }
  } catch (error) {
    logger.error(`✗ Erreur lors du test DELETE: ${error.message}`);
    allPassed = false;
  }

  return allPassed;
}

// Fonction principale
async function runTests() {
  logger.info('Début des tests de l\'API avec PostgreSQL...');
  
  let endpointsOk = await testEndpoints();
  let crudOk = await testCrudOperations();
  
  if (endpointsOk && crudOk) {
    logger.info('✅ Tous les tests ont réussi! L\'API fonctionne correctement avec PostgreSQL.');
    return true;
  } else {
    logger.error('❌ Certains tests ont échoué. Voir les erreurs ci-dessus.');
    return false;
  }
}

// Exécuter les tests
if (require.main === module) {
  // Attendre que l'API soit démarrée
  setTimeout(() => {
    runTests().then(success => {
      if (success) {
        process.exit(0);
      } else {
        process.exit(1);
      }
    }).catch(err => {
      logger.error('Erreur inattendue:', err);
      process.exit(1);
    });
  }, 5000); // Attendre 5 secondes pour que l'API démarre
}

module.exports = runTests;
