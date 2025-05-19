-- Structure de la base de données pour "Les Audacieuses"
-- Créé le: 27/04/2025
-- Mis à jour le: 13/05/2025
-- Version: 2.0 - Optimisée pour éviter les erreurs d'index et de contraintes

-- Création de la base de données
DROP DATABASE IF EXISTS audacieuses_db;
CREATE DATABASE audacieuses_db;
USE audacieuses_db;

-- Désactiver les vérifications de clés étrangères pendant l'initialisation
SET FOREIGN_KEY_CHECKS = 0;

-- Table des rôles
CREATE TABLE roles (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nom VARCHAR(50) NOT NULL,
  description VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY role_nom_unique (nom)
);

-- Table des utilisateurs
CREATE TABLE users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  mail VARCHAR(50) NOT NULL,
  mdp VARCHAR(255) NOT NULL,
  prenom VARCHAR(100) NOT NULL,
  nom VARCHAR(100) NOT NULL,
  date_naissance DATE,
  role_id INT NOT NULL,
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY user_mail_unique (mail),
  CONSTRAINT users_role_id_foreign FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE NO ACTION ON UPDATE CASCADE
);

-- Table des types d'activités
CREATE TABLE type_activites (
  id INT AUTO_INCREMENT PRIMARY KEY,
  type_activite VARCHAR(50) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY type_activite_unique (type_activite)
);

-- Table des modules
CREATE TABLE modules (
  id INT AUTO_INCREMENT PRIMARY KEY,
  titre VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  objectifs TEXT,
  duree INT,
  niveau VARCHAR(50),
  image_url VARCHAR(255),
  created_by INT NOT NULL,
  active BOOLEAN DEFAULT TRUE,  statut VARCHAR(50) DEFAULT 'brouillon',
  date_creation TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  date_update TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT modules_created_by_foreign FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE NO ACTION ON UPDATE CASCADE
);

-- Table des séances
CREATE TABLE seances (
  id INT AUTO_INCREMENT PRIMARY KEY,
  titre VARCHAR(255) NOT NULL,
  description TEXT,
  duree INT NOT NULL,
  type VARCHAR(50),
  contenu TEXT,
  ressources TEXT,
  module_id INT,
  created_by INT NOT NULL,
  active BOOLEAN DEFAULT TRUE,
  date_creation TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT seances_module_id_foreign FOREIGN KEY (module_id) REFERENCES modules(id) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT seances_created_by_foreign FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE NO ACTION ON UPDATE CASCADE
);

-- Table de jonction entre modules et séances
CREATE TABLE module_seance (
  id INT AUTO_INCREMENT PRIMARY KEY,
  module_id INT NOT NULL,
  seance_id INT NOT NULL,
  positions INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY unique_module_seance (module_id, seance_id),
  CONSTRAINT module_seance_module_id_foreign FOREIGN KEY (module_id) REFERENCES modules(id) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT module_seance_seance_id_foreign FOREIGN KEY (seance_id) REFERENCES seances(id) ON DELETE CASCADE ON UPDATE CASCADE
);

-- Table des activités
CREATE TABLE activites (
  id INT AUTO_INCREMENT PRIMARY KEY,
  titre VARCHAR(255) NOT NULL,
  description TEXT,
  contenu TEXT NOT NULL,
  type_activite_id INT NOT NULL,
  seance_id INT NOT NULL,
  ordre INT NOT NULL,
  duree INT,
  date_creation TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  date_update TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT activites_type_activite_id_foreign FOREIGN KEY (type_activite_id) REFERENCES type_activites(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT activites_seance_id_foreign FOREIGN KEY (seance_id) REFERENCES seances(id) ON DELETE CASCADE ON UPDATE CASCADE
);

-- Table de statut de suivi
CREATE TABLE status_suivi (
  id INT AUTO_INCREMENT PRIMARY KEY,
  type_status VARCHAR(50) NOT NULL,
  description VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY status_suivi_type_unique (type_status)
);

-- Table de suivi des séances par les utilisateurs
CREATE TABLE suivi (
  id INT AUTO_INCREMENT PRIMARY KEY,
  seance_id INT NOT NULL,
  user_id INT,
  status_id INT NOT NULL,
  progression DECIMAL(15, 2) DEFAULT 0.00 NOT NULL,
  update_suivi TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  commentaire TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY unique_seance_user (seance_id, user_id),
  CONSTRAINT suivi_seance_id_foreign FOREIGN KEY (seance_id) REFERENCES seances(id) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT suivi_user_id_foreign FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT suivi_status_id_foreign FOREIGN KEY (status_id) REFERENCES status_suivi(id) ON DELETE NO ACTION ON UPDATE CASCADE
);

-- Table de réponses des clients aux activités
CREATE TABLE reponse_client (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  activite_id INT NOT NULL,
  contenu TEXT NOT NULL,
  date_soumission TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  feedback TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT reponse_client_user_id_foreign FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT reponse_client_activite_id_foreign FOREIGN KEY (activite_id) REFERENCES activites(id) ON DELETE CASCADE ON UPDATE CASCADE
);

-- Table des affectations de modules aux utilisateurs
CREATE TABLE modules_users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  module_id INT NOT NULL,
  user_id INT NOT NULL,
  date_affectation TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY unique_module_user (module_id, user_id),
  CONSTRAINT modules_users_module_id_foreign FOREIGN KEY (module_id) REFERENCES modules(id) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT modules_users_user_id_foreign FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE
);

-- Table des événements
CREATE TABLE evenements (
  id INT AUTO_INCREMENT PRIMARY KEY,
  titre VARCHAR(100) NOT NULL,
  description TEXT,
  date_debut DATETIME NOT NULL,
  date_fin DATETIME NOT NULL,
  lieu VARCHAR(100),
  type ENUM('evenement', 'rendez-vous', 'rappel', 'seance') NOT NULL DEFAULT 'evenement',
  statut ENUM('planifie', 'confirme', 'annule', 'complete') NOT NULL DEFAULT 'planifie',
  rappel BOOLEAN NOT NULL DEFAULT TRUE,
  temps_rappel INT NOT NULL DEFAULT 15,
  couleur VARCHAR(7) NOT NULL DEFAULT '#3788d8',
  prive BOOLEAN NOT NULL DEFAULT FALSE,
  createur_id INT NOT NULL,
  seance_id INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT evenements_createur_id_foreign FOREIGN KEY (createur_id) REFERENCES users(id) ON DELETE NO ACTION ON UPDATE CASCADE,
  CONSTRAINT evenements_seance_id_foreign FOREIGN KEY (seance_id) REFERENCES seances(id) ON DELETE SET NULL ON UPDATE CASCADE
);

-- Table des participations aux événements
CREATE TABLE evenements_users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  evenement_id INT NOT NULL,
  user_id INT NOT NULL,
  statut VARCHAR(50) CHECK (statut IN ('Confirmé', 'En attente', 'Annulé')),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY unique_evenement_user (evenement_id, user_id),
  CONSTRAINT evenements_users_evenement_id_foreign FOREIGN KEY (evenement_id) REFERENCES evenements(id) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT evenements_users_user_id_foreign FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE
);

-- Table des messages
CREATE TABLE messages (
  id INT AUTO_INCREMENT PRIMARY KEY,
  expediteur_id INT NOT NULL,
  destinataire_id INT NOT NULL,
  contenu TEXT NOT NULL,
  lu BOOLEAN DEFAULT FALSE,
  date_envoi TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT messages_expediteur_id_foreign FOREIGN KEY (expediteur_id) REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT messages_destinataire_id_foreign FOREIGN KEY (destinataire_id) REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE
);

-- Réactiver les vérifications de clés étrangères
SET FOREIGN_KEY_CHECKS = 1;

-- Insertion des données de base

-- Rôles
INSERT INTO roles (nom, description) VALUES 
('admin', 'Administrateur du système'),
('admin_plus', 'Super administrateur du système'),
('coach', 'Coach pour les formations'),
('client', 'Client participant aux formations');

-- Statuts de suivi
INSERT INTO status_suivi (type_status, description) VALUES 
('NON_COMMENCE', 'Séance non commencée'),
('EN_COURS', 'Séance en cours'),
('TERMINE', 'Séance terminée'),
('REPORTE', 'Séance reportée');

-- Types d'activités
INSERT INTO type_activites (type_activite) VALUES 
('VIDEO'),
('QUIZ'),
('EXERCICE'),
('LECTURE'),
('DISCUSSION');

-- Utilisateurs (mot de passe: 'password123' hashé)
INSERT INTO users (mail, mdp, prenom, nom, role_id, date_naissance) VALUES 
('admin@audacieuses.fr', '$2a$10$xVLXqoOwn9kiOKVlITBTWuUYyqx7BQGwDnP5U.gGz6YuDnpnIN1HK', 'Admin', 'Système', 1, NULL),
('coach@audacieuses.fr', '$2a$10$xVLXqoOwn9kiOKVlITBTWuUYyqx7BQGwDnP5U.gGz6YuDnpnIN1HK', 'Julie', 'Dupont', 3, '1985-06-15'),
('client1@example.com', '$2a$10$xVLXqoOwn9kiOKVlITBTWuUYyqx7BQGwDnP5U.gGz6YuDnpnIN1HK', 'Sophie', 'Martin', 4, '1990-03-22'),
('client2@example.com', '$2a$10$xVLXqoOwn9kiOKVlITBTWuUYyqx7BQGwDnP5U.gGz6YuDnpnIN1HK', 'Emma', 'Leroy', 4, '1988-09-10');

-- Modules
INSERT INTO modules (titre, description, objectifs, duree, niveau, image_url, created_by, statut, date_creation) VALUES 
('Introduction au développement web', 'Module d''introduction aux bases du développement web moderne', 'Comprendre les fondamentaux du HTML, CSS et JavaScript', 10, 'Débutant', '/assets/images/module1.jpg', 2, 'publié', NOW()),
('Confiance en soi et prise de parole', 'Techniques et exercices pour développer sa confiance en soi', 'Être capable de s''exprimer avec assurance en public', 8, 'Intermédiaire', '/assets/images/module2.jpg', 2, 'publié', NOW());

-- Séances
INSERT INTO seances (titre, description, duree, type, contenu, module_id, created_by, date_creation) VALUES 
('Les bases du HTML', 'Découverte des balises HTML et structure d''une page web', 90, 'theorique', 'Contenu détaillé de la séance sur le HTML', 1, 2, NOW()),
('Styliser avec CSS', 'Apprendre à mettre en forme une page web', 120, 'pratique', 'Contenu détaillé de la séance sur le CSS', 1, 2, NOW()),
('Préparer son discours', 'Méthodes de préparation efficace pour une présentation', 60, 'theorique', 'Contenu détaillé sur la préparation', 2, 2, NOW()),
('Techniques de respiration', 'Exercices pratiques pour gérer le stress', 45, 'pratique', 'Contenu détaillé sur les techniques de respiration', 2, 2, NOW());

-- Relation entre modules et séances
INSERT INTO module_seance (module_id, seance_id, positions) VALUES
(1, 1, 1), -- Module 1 (Dev web) - Séance 1 (HTML) en position 1
(1, 2, 2), -- Module 1 (Dev web) - Séance 2 (CSS) en position 2
(2, 3, 1), -- Module 2 (Confiance) - Séance 3 (Discours) en position 1
(2, 4, 2); -- Module 2 (Confiance) - Séance 4 (Respiration) en position 2

-- Activités
INSERT INTO activites (titre, description, contenu, type_activite_id, seance_id, ordre, duree) VALUES 
('Introduction au HTML', 'Présentation des concepts de base', 'Contenu vidéo d''introduction', 1, 1, 1, 15),
('Exercice: Créer une page simple', 'Premier exercice pratique', 'Instructions pour créer une page HTML basique', 3, 1, 2, 30),
('Quiz HTML', 'Vérification des connaissances', 'Questions à choix multiples sur le HTML', 2, 1, 3, 10),
('CSS Fondamentaux', 'Les bases du CSS', 'Vidéo sur les sélecteurs et propriétés CSS', 1, 2, 1, 20),
('Exercice de respiration profonde', 'Technique de base', 'Instructions pour la respiration diaphragmatique', 3, 4, 1, 10);

-- Affectation des modules aux utilisateurs
INSERT INTO modules_users (module_id, user_id) VALUES 
(1, 3), -- Module 1 pour client1
(2, 3), -- Module 2 pour client1
(1, 4); -- Module 1 pour client2

-- Suivi des séances
INSERT INTO suivi (user_id, seance_id, status_id, progression, commentaire) VALUES 
(3, 1, 3, 100.00, 'Séance terminée avec succès'),
(3, 2, 2, 50.00, 'En cours de progression'),
(4, 1, 2, 30.00, 'Début de la séance');

-- Événements
INSERT INTO evenements (titre, description, date_debut, date_fin, lieu, type, createur_id) VALUES 
('Atelier développement web', 'Atelier pratique sur les bases du développement web', 
 DATE_ADD(NOW(), INTERVAL 7 DAY), 
 DATE_ADD(DATE_ADD(NOW(), INTERVAL 7 DAY), INTERVAL 3 HOUR), 
 'Salle A, Bâtiment Les Audacieuses', 'evenement', 2),
('Conférence sur la confiance en soi', 'Conférence avec des experts du domaine', 
 DATE_ADD(NOW(), INTERVAL 14 DAY), 
 DATE_ADD(DATE_ADD(NOW(), INTERVAL 14 DAY), INTERVAL 2 HOUR), 
 'Auditorium Central', 'evenement', 2);

-- Participations aux événements
INSERT INTO evenements_users (evenement_id, user_id, statut) VALUES 
(1, 3, 'Confirmé'),
(1, 4, 'En attente'),
(2, 3, 'Confirmé');

-- Messages
INSERT INTO messages (expediteur_id, destinataire_id, contenu, lu) VALUES 
(2, 3, 'Bonjour Sophie, comment avancez-vous sur le module HTML ?', TRUE),
(3, 2, 'Bonjour Julie, ça avance bien ! J''ai terminé la première séance.', TRUE),
(2, 3, 'Excellent ! N''hésitez pas à me contacter si vous avez des questions sur la suite.', FALSE),
(2, 4, 'Bonjour Emma, bienvenue dans notre programme!', TRUE),
(4, 2, 'Merci Julie, je suis très enthousiaste pour commencer!', FALSE);

-- Affichage d'un message de confirmation
SELECT 'Initialisation de la base de données terminée avec succès.' AS message;