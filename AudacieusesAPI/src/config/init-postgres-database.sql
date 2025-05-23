-- Structure de la base de données pour "Les Audacieuses"
-- Adapté pour PostgreSQL
-- Créé le: 23/05/2025
-- Basé sur la version MySQL du: 13/05/2025
-- Version: 2.0 - Optimisée pour PostgreSQL

-- Création de la base de données
-- Note : Dans PostgreSQL, vous devrez d'abord créer la base de données avant d'exécuter ce script
-- CREATE DATABASE audacieuses_db;
-- \c audacieuses_db

-- Table des rôles
CREATE TABLE roles (
  id SERIAL PRIMARY KEY,
  nom VARCHAR(50) NOT NULL,
  description VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT role_nom_unique UNIQUE (nom)
);

-- Fonction pour mettre à jour le champ updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = now(); 
   RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger pour roles
CREATE TRIGGER update_roles_updated_at BEFORE UPDATE
  ON roles FOR EACH ROW EXECUTE PROCEDURE 
  update_updated_at_column();

-- Table des utilisateurs
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  mail VARCHAR(50) NOT NULL,
  mdp VARCHAR(255) NOT NULL,
  prenom VARCHAR(100) NOT NULL,
  nom VARCHAR(100) NOT NULL,
  date_naissance DATE,
  role_id INTEGER NOT NULL,
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT user_mail_unique UNIQUE (mail),
  CONSTRAINT users_role_id_foreign FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE NO ACTION ON UPDATE CASCADE
);

-- Trigger pour users
CREATE TRIGGER update_users_updated_at BEFORE UPDATE
  ON users FOR EACH ROW EXECUTE PROCEDURE 
  update_updated_at_column();

-- Table des types d'activités
CREATE TABLE type_activites (
  id SERIAL PRIMARY KEY,
  type_activite VARCHAR(50) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT type_activite_unique UNIQUE (type_activite)
);

-- Trigger pour type_activites
CREATE TRIGGER update_type_activites_updated_at BEFORE UPDATE
  ON type_activites FOR EACH ROW EXECUTE PROCEDURE 
  update_updated_at_column();

-- Table des modules
CREATE TABLE modules (
  id SERIAL PRIMARY KEY,
  titre VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  objectifs TEXT,
  duree INTEGER,
  niveau VARCHAR(50),
  image_url VARCHAR(255),
  created_by INTEGER NOT NULL,
  active BOOLEAN DEFAULT TRUE,
  statut VARCHAR(50) DEFAULT 'brouillon',
  date_creation TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  date_update TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT modules_created_by_foreign FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE NO ACTION ON UPDATE CASCADE
);

-- Trigger pour modules
CREATE TRIGGER update_modules_updated_at BEFORE UPDATE
  ON modules FOR EACH ROW EXECUTE PROCEDURE 
  update_updated_at_column();

-- Trigger pour date_update
CREATE OR REPLACE FUNCTION update_date_update_column()
RETURNS TRIGGER AS $$
BEGIN
   NEW.date_update = now(); 
   RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_modules_date_update BEFORE UPDATE
  ON modules FOR EACH ROW EXECUTE PROCEDURE 
  update_date_update_column();

-- Table des séances
CREATE TABLE seances (
  id SERIAL PRIMARY KEY,
  titre VARCHAR(255) NOT NULL,
  description TEXT,
  duree INTEGER NOT NULL,
  type VARCHAR(50),
  contenu TEXT,
  ressources TEXT,
  module_id INTEGER,
  created_by INTEGER NOT NULL,
  active BOOLEAN DEFAULT TRUE,
  date_creation TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT seances_module_id_foreign FOREIGN KEY (module_id) REFERENCES modules(id) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT seances_created_by_foreign FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE NO ACTION ON UPDATE CASCADE
);

-- Trigger pour seances
CREATE TRIGGER update_seances_updated_at BEFORE UPDATE
  ON seances FOR EACH ROW EXECUTE PROCEDURE 
  update_updated_at_column();

-- Table de jonction entre modules et séances
CREATE TABLE module_seance (
  id SERIAL PRIMARY KEY,
  module_id INTEGER NOT NULL,
  seance_id INTEGER NOT NULL,
  positions INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT unique_module_seance UNIQUE (module_id, seance_id),
  CONSTRAINT module_seance_module_id_foreign FOREIGN KEY (module_id) REFERENCES modules(id) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT module_seance_seance_id_foreign FOREIGN KEY (seance_id) REFERENCES seances(id) ON DELETE CASCADE ON UPDATE CASCADE
);

-- Trigger pour module_seance
CREATE TRIGGER update_module_seance_updated_at BEFORE UPDATE
  ON module_seance FOR EACH ROW EXECUTE PROCEDURE 
  update_updated_at_column();

-- Table des activités
CREATE TABLE activites (
  id SERIAL PRIMARY KEY,
  titre VARCHAR(255) NOT NULL,
  description TEXT,
  contenu TEXT NOT NULL,
  type_activite_id INTEGER NOT NULL,
  seance_id INTEGER NOT NULL,
  ordre INTEGER NOT NULL,
  duree INTEGER,
  date_creation TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  date_update TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT activites_type_activite_id_foreign FOREIGN KEY (type_activite_id) REFERENCES type_activites(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT activites_seance_id_foreign FOREIGN KEY (seance_id) REFERENCES seances(id) ON DELETE CASCADE ON UPDATE CASCADE
);

-- Trigger pour date_update des activités
CREATE TRIGGER update_activites_date_update BEFORE UPDATE
  ON activites FOR EACH ROW EXECUTE PROCEDURE 
  update_date_update_column();

-- Table de statut de suivi
CREATE TABLE status_suivi (
  id SERIAL PRIMARY KEY,
  type_status VARCHAR(50) NOT NULL,
  description VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT status_suivi_type_unique UNIQUE (type_status)
);

-- Trigger pour status_suivi
CREATE TRIGGER update_status_suivi_updated_at BEFORE UPDATE
  ON status_suivi FOR EACH ROW EXECUTE PROCEDURE 
  update_updated_at_column();

-- Table de suivi des séances par les utilisateurs
CREATE TABLE suivi (
  id SERIAL PRIMARY KEY,
  seance_id INTEGER NOT NULL,
  user_id INTEGER,
  status_id INTEGER NOT NULL,
  progression DECIMAL(15, 2) DEFAULT 0.00 NOT NULL,
  update_suivi TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  commentaire TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT unique_seance_user UNIQUE (seance_id, user_id),
  CONSTRAINT suivi_seance_id_foreign FOREIGN KEY (seance_id) REFERENCES seances(id) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT suivi_user_id_foreign FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT suivi_status_id_foreign FOREIGN KEY (status_id) REFERENCES status_suivi(id) ON DELETE NO ACTION ON UPDATE CASCADE
);

-- Trigger pour suivi
CREATE TRIGGER update_suivi_updated_at BEFORE UPDATE
  ON suivi FOR EACH ROW EXECUTE PROCEDURE 
  update_updated_at_column();

-- Trigger pour update_suivi
CREATE OR REPLACE FUNCTION update_update_suivi_column()
RETURNS TRIGGER AS $$
BEGIN
   NEW.update_suivi = now(); 
   RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_suivi_update_suivi BEFORE UPDATE
  ON suivi FOR EACH ROW EXECUTE PROCEDURE 
  update_update_suivi_column();

-- Table de réponses des clients aux activités
CREATE TABLE reponse_client (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL,
  activite_id INTEGER NOT NULL,
  contenu TEXT NOT NULL,
  date_soumission TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  feedback TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT reponse_client_user_id_foreign FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT reponse_client_activite_id_foreign FOREIGN KEY (activite_id) REFERENCES activites(id) ON DELETE CASCADE ON UPDATE CASCADE
);

-- Trigger pour reponse_client
CREATE TRIGGER update_reponse_client_updated_at BEFORE UPDATE
  ON reponse_client FOR EACH ROW EXECUTE PROCEDURE 
  update_updated_at_column();

-- Table des affectations de modules aux utilisateurs
CREATE TABLE modules_users (
  id SERIAL PRIMARY KEY,
  module_id INTEGER NOT NULL,
  user_id INTEGER NOT NULL,
  date_affectation TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT unique_module_user UNIQUE (module_id, user_id),
  CONSTRAINT modules_users_module_id_foreign FOREIGN KEY (module_id) REFERENCES modules(id) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT modules_users_user_id_foreign FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE
);

-- Trigger pour modules_users
CREATE TRIGGER update_modules_users_updated_at BEFORE UPDATE
  ON modules_users FOR EACH ROW EXECUTE PROCEDURE 
  update_updated_at_column();

-- Table des événements
CREATE TABLE evenements (
  id SERIAL PRIMARY KEY,
  titre VARCHAR(100) NOT NULL,
  description TEXT,
  date_debut TIMESTAMP NOT NULL,
  date_fin TIMESTAMP NOT NULL,
  lieu VARCHAR(100),
  type VARCHAR(20) NOT NULL DEFAULT 'evenement' CHECK (type IN ('evenement', 'rendez-vous', 'rappel', 'seance')),
  statut VARCHAR(20) NOT NULL DEFAULT 'planifie' CHECK (statut IN ('planifie', 'confirme', 'annule', 'complete')),
  rappel BOOLEAN NOT NULL DEFAULT TRUE,
  temps_rappel INTEGER NOT NULL DEFAULT 15,
  couleur VARCHAR(7) NOT NULL DEFAULT '#3788d8',
  prive BOOLEAN NOT NULL DEFAULT FALSE,
  createur_id INTEGER NOT NULL,
  seance_id INTEGER,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT evenements_createur_id_foreign FOREIGN KEY (createur_id) REFERENCES users(id) ON DELETE NO ACTION ON UPDATE CASCADE,
  CONSTRAINT evenements_seance_id_foreign FOREIGN KEY (seance_id) REFERENCES seances(id) ON DELETE SET NULL ON UPDATE CASCADE
);

-- Trigger pour evenements
CREATE TRIGGER update_evenements_updated_at BEFORE UPDATE
  ON evenements FOR EACH ROW EXECUTE PROCEDURE 
  update_updated_at_column();

-- Table des participations aux événements
CREATE TABLE evenements_users (
  id SERIAL PRIMARY KEY,
  evenement_id INTEGER NOT NULL,
  user_id INTEGER NOT NULL,
  statut VARCHAR(50) CHECK (statut IN ('Confirmé', 'En attente', 'Annulé')),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT unique_evenement_user UNIQUE (evenement_id, user_id),
  CONSTRAINT evenements_users_evenement_id_foreign FOREIGN KEY (evenement_id) REFERENCES evenements(id) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT evenements_users_user_id_foreign FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE
);

-- Trigger pour evenements_users
CREATE TRIGGER update_evenements_users_updated_at BEFORE UPDATE
  ON evenements_users FOR EACH ROW EXECUTE PROCEDURE 
  update_updated_at_column();

-- Table des messages
CREATE TABLE messages (
  id SERIAL PRIMARY KEY,
  expediteur_id INTEGER NOT NULL,
  destinataire_id INTEGER NOT NULL,
  contenu TEXT NOT NULL,
  lu BOOLEAN DEFAULT FALSE,
  date_envoi TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT messages_expediteur_id_foreign FOREIGN KEY (expediteur_id) REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT messages_destinataire_id_foreign FOREIGN KEY (destinataire_id) REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE
);

-- Trigger pour messages
CREATE TRIGGER update_messages_updated_at BEFORE UPDATE
  ON messages FOR EACH ROW EXECUTE PROCEDURE 
  update_updated_at_column();

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
('Introduction au développement web', 'Module d''introduction aux bases du développement web moderne', 'Comprendre les fondamentaux du HTML, CSS et JavaScript', 10, 'Débutant', '/assets/images/module1.jpg', 2, 'publié', CURRENT_TIMESTAMP),
('Confiance en soi et prise de parole', 'Techniques et exercices pour développer sa confiance en soi', 'Être capable de s''exprimer avec assurance en public', 8, 'Intermédiaire', '/assets/images/module2.jpg', 2, 'publié', CURRENT_TIMESTAMP);

-- Séances
INSERT INTO seances (titre, description, duree, type, contenu, module_id, created_by, date_creation) VALUES 
('Les bases du HTML', 'Découverte des balises HTML et structure d''une page web', 90, 'theorique', 'Contenu détaillé de la séance sur le HTML', 1, 2, CURRENT_TIMESTAMP),
('Styliser avec CSS', 'Apprendre à mettre en forme une page web', 120, 'pratique', 'Contenu détaillé de la séance sur le CSS', 1, 2, CURRENT_TIMESTAMP),
('Préparer son discours', 'Méthodes de préparation efficace pour une présentation', 60, 'theorique', 'Contenu détaillé sur la préparation', 2, 2, CURRENT_TIMESTAMP),
('Techniques de respiration', 'Exercices pratiques pour gérer le stress', 45, 'pratique', 'Contenu détaillé sur les techniques de respiration', 2, 2, CURRENT_TIMESTAMP);

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
 CURRENT_TIMESTAMP + INTERVAL '7 days', 
 CURRENT_TIMESTAMP + INTERVAL '7 days 3 hours', 
 'Salle A, Bâtiment Les Audacieuses', 'evenement', 2),
('Conférence sur la confiance en soi', 'Conférence avec des experts du domaine', 
 CURRENT_TIMESTAMP + INTERVAL '14 days', 
 CURRENT_TIMESTAMP + INTERVAL '14 days 2 hours', 
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
