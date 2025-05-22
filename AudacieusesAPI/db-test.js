// Script pour tester la connexion à la base de données
const { testConnection } = require('./src/config/database');

console.log('Vérification de la connexion à la base de données...');
console.log(`Environnement: ${process.env.NODE_ENV || 'development'}`);

async function checkConnection() {
  try {
    const isConnected = await testConnection();
    if (isConnected) {
      console.log('\n✅ Connexion à la base de données établie avec succès!');
    } else {
      console.log('\n❌ Échec de la connexion à la base de données.');
      console.log('\nVérifiez les paramètres suivants dans votre fichier .env:');
      console.log('- DB_HOST');
      console.log('- DB_USER');
      console.log('- DB_PASSWORD');
      console.log('- DB_NAME');
    }
  } catch (error) {
    console.error('\n❌ Erreur lors du test de connexion:', error);
  }
}

checkConnection();
