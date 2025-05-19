const request = require('supertest');
const app = require('../src/app');
const { sequelize } = require('../src/config/database');
const { User, Role } = require('../src/models');
const jwt = require('../src/config/jwt');

// Configuration pour les tests
const setupTestDB = async () => {
  // Synchroniser la base de données (force: true pour recréer les tables)
  await sequelize.sync({ force: true });
};

// Créer un utilisateur de test (client)
const createTestClient = async () => {
  const clientRole = await Role.create({
    role_type: 'client'
  });

  const client = await User.create({
    nom: 'Client',
    prenom: 'Test',
    mail: 'client@test.com',
    mdp: 'Password123',
    date_naissance: '1990-01-01',
    id_1: clientRole.id
  });

  return client;
};

// Créer un utilisateur de test (admin)
const createTestAdmin = async () => {
  const adminRole = await Role.create({
    role_type: 'admin'
  });

  const admin = await User.create({
    nom: 'Admin',
    prenom: 'Test',
    mail: 'admin@test.com',
    mdp: 'Password123',
    date_naissance: '1985-01-01',
    id_1: adminRole.id
  });

  return admin;
};

// Créer un utilisateur de test (admin+)
const createTestAdminPlus = async () => {
  const adminPlusRole = await Role.create({
    role_type: 'admin_plus'
  });

  const adminPlus = await User.create({
    nom: 'AdminPlus',
    prenom: 'Test',
    mail: 'adminplus@test.com',
    mdp: 'Password123',
    date_naissance: '1980-01-01',
    id_1: adminPlusRole.id
  });

  return adminPlus;
};

// Générer un token JWT pour un utilisateur
const generateTestToken = async (user) => {
  // Recharger l'utilisateur avec son rôle
  const userWithRole = await User.findByPk(user.id, {
    include: [{
      model: Role,
      as: 'role'
    }]
  });

  return jwt.generateToken(userWithRole);
};

module.exports = {
  setupTestDB,
  createTestClient,
  createTestAdmin,
  createTestAdminPlus,
  generateTestToken
};