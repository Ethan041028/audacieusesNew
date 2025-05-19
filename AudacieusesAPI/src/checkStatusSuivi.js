// Script pour vérifier les statuts de suivi dans la base de données
const { Sequelize, DataTypes } = require('sequelize');
const mysql = require('mysql2/promise');

async function main() {
  console.log('Vérification des statuts de suivi...');
  
  try {
    // Connexion directe à MySQL
    const connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: '',
      database: 'audacieuses_db'
    });
    
    console.log('Connexion à la base de données établie.');
    
    // Vérifier les statuts de suivi
    const [statusRows] = await connection.execute('SELECT * FROM status_suivi');
    console.log('Statuts de suivi disponibles:');
    console.table(statusRows);
    
    // Vérifier les suivis avec le statut TERMINE
    const [termineRows] = await connection.execute(`
      SELECT s.id, s.seance_id, s.user_id, s.progression, ss.type_status
      FROM suivi s
      JOIN status_suivi ss ON s.status_id = ss.id
      WHERE ss.type_status = 'TERMINE'
    `);
    
    console.log('Suivis avec statut TERMINE:');
    console.table(termineRows);
    
    // Compter les suivis par statut
    const [countByStatus] = await connection.execute(`
      SELECT ss.type_status, COUNT(*) as count
      FROM suivi s
      JOIN status_suivi ss ON s.status_id = ss.id
      GROUP BY ss.type_status
    `);
    
    console.log('Nombre de suivis par statut:');
    console.table(countByStatus);
    
    // Examiner les modules et leurs séances
    const [modules] = await connection.execute(`
      SELECT id, titre
      FROM modules
    `);
    
    for (const module of modules) {
      const [seances] = await connection.execute(`
        SELECT s.id, s.titre
        FROM seances s
        JOIN module_seance ms ON s.id = ms.seance_id
        WHERE ms.module_id = ?
      `, [module.id]);
      
      console.log(`\nModule ${module.id} (${module.titre}) a ${seances.length} séances`);
      
      if (seances.length > 0) {
        console.table(seances);
        
        // Vérifier les suivis pour ces séances
        const seanceIds = seances.map(s => s.id);
        const placeholders = seanceIds.map(() => '?').join(',');
        
        const [suivis] = await connection.execute(`
          SELECT s.id, s.seance_id, s.user_id, s.progression, ss.type_status
          FROM suivi s
          JOIN status_suivi ss ON s.status_id = ss.id
          WHERE s.seance_id IN (${placeholders})
        `, seanceIds);
        
        console.log(`Suivis pour les séances du module ${module.id}:`);
        console.table(suivis);
      }
    }
    
    await connection.end();
    console.log('Vérification terminée.');
    
  } catch (error) {
    console.error('Erreur lors de la vérification:', error);
  }
}

main(); 