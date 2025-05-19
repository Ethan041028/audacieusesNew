const request = require('supertest');
const app = require('../../src/app');
const { setupTestDB, createTestAdmin, createTestClient, generateTestToken } = require('../testSetup');
const { Module, Seance } = require('../../src/models');

describe('Module Routes', () => {
  let adminToken, clientToken, testAdmin, testClient;

  beforeAll(async () => {
    await setupTestDB();
    testAdmin = await createTestAdmin();
    testClient = await createTestClient();
    adminToken = await generateTestToken(testAdmin);
    clientToken = await generateTestToken(testClient);
  });

  beforeEach(async () => {
    // Nettoyer les tables avant chaque test
    await Module.destroy({ where: {}, truncate: { cascade: true } });
    await Seance.destroy({ where: {}, truncate: { cascade: true } });
  });

  describe('POST /api/modules', () => {
    test('should create a new module as admin', async () => {
      const moduleData = {
        titre: 'Module Test',
        description: 'Description du module de test',
        duree: 10,
        image_url: 'https://example.com/image.jpg',
        niveau: 'Débutant'
      };

      const res = await request(app)
        .post('/api/modules')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(moduleData);

      expect(res.statusCode).toEqual(201);
      expect(res.body).toHaveProperty('message', 'Module créé avec succès');
      expect(res.body.module).toHaveProperty('titre', 'Module Test');
    });

    test('should not allow client to create a module', async () => {
      const moduleData = {
        titre: 'Module Test',
        description: 'Description du module de test',
        duree: 10,
        image_url: 'https://example.com/image.jpg',
        niveau: 'Débutant'
      };

      const res = await request(app)
        .post('/api/modules')
        .set('Authorization', `Bearer ${clientToken}`)
        .send(moduleData);

      expect(res.statusCode).toEqual(403);
    });
  });

  describe('GET /api/modules', () => {
    beforeEach(async () => {
      // Créer quelques modules de test
      await Module.bulkCreate([
        {
          titre: 'Module 1',
          description: 'Description du module 1',
          duree: 5,
          image_url: 'https://example.com/image1.jpg',
          niveau: 'Débutant'
        },
        {
          titre: 'Module 2',
          description: 'Description du module 2',
          duree: 8,
          image_url: 'https://example.com/image2.jpg',
          niveau: 'Intermédiaire'
        }
      ]);
    });

    test('should get all modules', async () => {
      const res = await request(app)
        .get('/api/modules')
        .set('Authorization', `Bearer ${clientToken}`);

      expect(res.statusCode).toEqual(200);
      expect(res.body.modules).toHaveLength(2);
      expect(res.body.modules[0]).toHaveProperty('titre');
      expect(res.body.modules[1]).toHaveProperty('description');
    });

    test('should filter modules by level', async () => {
      const res = await request(app)
        .get('/api/modules?niveau=Débutant')
        .set('Authorization', `Bearer ${clientToken}`);

      expect(res.statusCode).toEqual(200);
      expect(res.body.modules).toHaveLength(1);
      expect(res.body.modules[0]).toHaveProperty('niveau', 'Débutant');
    });
  });

  describe('GET /api/modules/:id', () => {
    let testModule;

    beforeEach(async () => {
      // Créer un module de test
      testModule = await Module.create({
        titre: 'Module Détaillé',
        description: 'Description détaillée du module',
        duree: 12,
        image_url: 'https://example.com/detail.jpg',
        niveau: 'Avancé'
      });
    });

    test('should get module by id', async () => {
      const res = await request(app)
        .get(`/api/modules/${testModule.id}`)
        .set('Authorization', `Bearer ${clientToken}`);

      expect(res.statusCode).toEqual(200);
      expect(res.body.module).toHaveProperty('id', testModule.id);
      expect(res.body.module).toHaveProperty('titre', 'Module Détaillé');
    });

    test('should return 404 for non-existent module', async () => {
      const res = await request(app)
        .get('/api/modules/999')
        .set('Authorization', `Bearer ${clientToken}`);

      expect(res.statusCode).toEqual(404);
    });
  });

  describe('PUT /api/modules/:id', () => {
    let testModule;

    beforeEach(async () => {
      // Créer un module de test
      testModule = await Module.create({
        titre: 'Module à Modifier',
        description: 'Description avant modification',
        duree: 10,
        image_url: 'https://example.com/old.jpg',
        niveau: 'Intermédiaire'
      });
    });

    test('should update module as admin', async () => {
      const updateData = {
        titre: 'Module Modifié',
        description: 'Nouvelle description',
        niveau: 'Avancé'
      };

      const res = await request(app)
        .put(`/api/modules/${testModule.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(updateData);

      expect(res.statusCode).toEqual(200);
      expect(res.body).toHaveProperty('message', 'Module mis à jour avec succès');
      expect(res.body.module).toHaveProperty('titre', 'Module Modifié');
      expect(res.body.module).toHaveProperty('niveau', 'Avancé');
      expect(res.body.module).toHaveProperty('duree', 10); // Inchangé
    });

    test('should not allow client to update module', async () => {
      const updateData = {
        titre: 'Tentative de modification',
      };

      const res = await request(app)
        .put(`/api/modules/${testModule.id}`)
        .set('Authorization', `Bearer ${clientToken}`)
        .send(updateData);

      expect(res.statusCode).toEqual(403);
    });
  });

  describe('DELETE /api/modules/:id', () => {
    let testModule;

    beforeEach(async () => {
      // Créer un module de test
      testModule = await Module.create({
        titre: 'Module à Supprimer',
        description: 'Description du module à supprimer',
        duree: 5,
        image_url: 'https://example.com/delete.jpg',
        niveau: 'Débutant'
      });
    });

    test('should delete module as admin', async () => {
      const res = await request(app)
        .delete(`/api/modules/${testModule.id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.statusCode).toEqual(200);
      expect(res.body).toHaveProperty('message', 'Module supprimé avec succès');

      // Vérifier que le module a bien été supprimé
      const moduleAfterDelete = await Module.findByPk(testModule.id);
      expect(moduleAfterDelete).toBeNull();
    });

    test('should not allow client to delete module', async () => {
      const res = await request(app)
        .delete(`/api/modules/${testModule.id}`)
        .set('Authorization', `Bearer ${clientToken}`);

      expect(res.statusCode).toEqual(403);

      // Vérifier que le module existe toujours
      const moduleAfterDelete = await Module.findByPk(testModule.id);
      expect(moduleAfterDelete).not.toBeNull();
    });
  });
});