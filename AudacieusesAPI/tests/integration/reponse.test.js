const request = require('supertest');
const app = require('../../src/app');
const { Activite, TypeActivite, ReponseClient, User } = require('../../src/models');
const jwt = require('jsonwebtoken');
const { jwtSecret } = require('../../src/config/jwt');

describe('Réponse Client API', () => {
  let testUser;
  let testToken;
  let testActivites = {};
  const activityTypes = ['LECTURE', 'VIDEO', 'QUIZ', 'Question-Réponse', 'QCM', 'DOCUMENT'];
  
  // Créer un utilisateur de test et générer un token
  beforeAll(async () => {
    // Créer un utilisateur de test
    testUser = await User.create({
      nom: 'Test',
      prenom: 'User',
      email: 'testuser@example.com',
      password: 'password123',
      role_id: 2 // rôle client
    });
    
    // Générer un token JWT pour l'utilisateur
    testToken = jwt.sign(
      { id: testUser.id, email: testUser.email, role: 'client' },
      jwtSecret,
      { expiresIn: '1d' }
    );
    
    // Créer un type d'activité pour chaque type à tester
    for (const type of activityTypes) {
      const typeActivite = await TypeActivite.findOne({ where: { type_activite: type } });
      
      // Créer une activité de test pour chaque type
      const activite = await Activite.create({
        titre: `Test ${type}`,
        description: `Description de test pour ${type}`,
        contenu: JSON.stringify({
          type: 'texte',
          contenu: `Contenu de test pour ${type}`
        }),
        type_activite_id: typeActivite ? typeActivite.id : null
      });
      
      testActivites[type] = activite;
    }
  });
  
  // Nettoyer après les tests
  afterAll(async () => {
    // Supprimer les réponses créées
    await ReponseClient.destroy({
      where: { user_id: testUser.id }
    });
    
    // Supprimer les activités créées
    for (const type in testActivites) {
      await testActivites[type].destroy();
    }
    
    // Supprimer l'utilisateur de test
    await testUser.destroy();
  });
  
  // Tester la soumission de réponse pour chaque type d'activité
  describe('POST /api/activites/:id/reponses', () => {
    activityTypes.forEach(type => {
      it(`devrait permettre d'enregistrer une réponse pour une activité de type ${type}`, async () => {
        const activite = testActivites[type];
        
        // S'assurer que l'activité a été créée
        expect(activite).toBeDefined();
        
        const response = await request(app)
          .post(`/api/activites/${activite.id}/reponses`)
          .set('Authorization', `Bearer ${testToken}`)
          .send({
            reponse: `Réponse de test pour ${type}`
          });
        
        // La réponse devrait être acceptée (201 Created)
        expect(response.status).toBe(201);
        expect(response.body.message).toBe('Réponse enregistrée avec succès');
        
        // Vérifier que la réponse a bien été enregistrée en base de données
        const savedReponse = await ReponseClient.findOne({
          where: {
            activite_id: activite.id,
            user_id: testUser.id
          }
        });
        
        expect(savedReponse).not.toBeNull();
        expect(savedReponse.reponse).toBe(`Réponse de test pour ${type}`);
      });
    });
  });
});
