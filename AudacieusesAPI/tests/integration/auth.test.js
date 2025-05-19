const request = require('supertest');
const app = require('../../src/app');
const { setupTestDB } = require('../testSetup');
const { User, Role } = require('../../src/models');
const bcrypt = require('bcryptjs');

describe('Auth Routes', () => {
  beforeAll(async () => {
    await setupTestDB();
  });

  beforeEach(async () => {
    // Créer un rôle client
    const clientRole = await Role.create({
      role_type: 'client'
    });

    // Créer un utilisateur de test
    const hashedPassword = await bcrypt.hash('Password123', 10);
    await User.create({
      nom: 'Utilisateur',
      prenom: 'Test',
      mail: 'test@example.com',
      mdp: hashedPassword,
      date_naissance: '1990-01-01',
      id_1: clientRole.id
    });
  });

  afterEach(async () => {
    // Nettoyer la base de données après chaque test
    await User.destroy({ where: {}, truncate: { cascade: true } });
    await Role.destroy({ where: {}, truncate: { cascade: true } });
  });

  describe('POST /api/auth/register', () => {
    test('should register a new user', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          nom: 'Nouveau',
          prenom: 'Utilisateur',
          mail: 'nouveau@example.com',
          mdp: 'Password123',
          date_naissance: '1992-05-15'
        });

      expect(res.statusCode).toEqual(201);
      expect(res.body).toHaveProperty('message', 'Inscription réussie');
      expect(res.body).toHaveProperty('token');
      expect(res.body.user).toHaveProperty('mail', 'nouveau@example.com');
    });

    test('should not register a user with existing email', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          nom: 'Duplicate',
          prenom: 'User',
          mail: 'test@example.com', // Email already exists
          mdp: 'Password123',
          date_naissance: '1992-05-15'
        });

      expect(res.statusCode).toEqual(400);
      expect(res.body).toHaveProperty('error', 'Email déjà utilisé');
    });

    test('should not register a user with invalid data', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          nom: 'Invalid',
          prenom: 'User',
          mail: 'invalid-email', // Invalid email format
          mdp: 'short', // Too short password
          date_naissance: '1992-05-15'
        });

      expect(res.statusCode).toEqual(400);
      expect(res.body).toHaveProperty('errors');
    });
  });

  describe('POST /api/auth/login', () => {
    test('should login with correct credentials', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          mail: 'test@example.com',
          mdp: 'Password123'
        });

      expect(res.statusCode).toEqual(200);
      expect(res.body).toHaveProperty('message', 'Connexion réussie');
      expect(res.body).toHaveProperty('token');
      expect(res.body.user).toHaveProperty('mail', 'test@example.com');
    });

    test('should not login with incorrect email', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          mail: 'wrong@example.com',
          mdp: 'Password123'
        });

      expect(res.statusCode).toEqual(401);
      expect(res.body).toHaveProperty('error', 'Identifiants invalides');
    });

    test('should not login with incorrect password', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          mail: 'test@example.com',
          mdp: 'WrongPassword'
        });

      expect(res.statusCode).toEqual(401);
      expect(res.body).toHaveProperty('error', 'Identifiants invalides');
    });
  });
});