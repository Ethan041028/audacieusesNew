-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Hôte : 127.0.0.1
-- Généré le : dim. 18 mai 2025 à 15:24
-- Version du serveur : 10.4.32-MariaDB
-- Version de PHP : 8.2.12

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Base de données : `audacieuses_db`
--

-- --------------------------------------------------------

--
-- Structure de la table `activites`
--

CREATE TABLE `activites` (
  `id` int(11) NOT NULL,
  `titre` varchar(255) NOT NULL,
  `description` text DEFAULT NULL,
  `contenu` text NOT NULL,
  `type_activite_id` int(11) NOT NULL,
  `duree` int(11) DEFAULT NULL,
  `date_creation` timestamp NOT NULL DEFAULT current_timestamp(),
  `date_update` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Déchargement des données de la table `activites`
--

INSERT INTO `activites` (`id`, `titre`, `description`, `contenu`, `type_activite_id`, `duree`, `date_creation`, `date_update`, `updated_at`) VALUES
(1, 'Introduction au HTML', 'Présentation des concepts de base', 'Contenu vidéo d\'introduction', 1, 15, '2025-05-13 09:33:43', '2025-05-16 15:41:51', '2025-05-16 15:41:51'),
(10, 'test', 'test', '{\"type\":\"texte\",\"contenu\":\"{\\\"type\\\":\\\"qcm\\\",\\\"questions\\\":[{\\\"texte\\\":\\\"test\\\",\\\"options\\\":[\\\"a\\\",\\\"b\\\"],\\\"reponse_correcte\\\":0},{\\\"texte\\\":\\\"test 2\\\",\\\"options\\\":[\\\"a\\\",\\\"b\\\"],\\\"reponse_correcte\\\":0}]}\"}', 2, 40, '2025-05-16 23:52:20', '2025-05-16 23:52:20', '2025-05-16 23:52:20'),
(11, 'test vidéo', '', '{\"type\":\"texte\",\"contenu\":\"{\\\"type\\\":\\\"video\\\",\\\"lien\\\":\\\"https://www.youtube.com/watch?v=XAU9jLmCQw0&ab_channel=CharlesSchiele\\\",\\\"description\\\":\\\"\\\"}\"}', 1, 40, '2025-05-16 23:56:21', '2025-05-16 23:56:21', '2025-05-16 23:56:21');

-- --------------------------------------------------------

--
-- Structure de la table `evenements`
--

CREATE TABLE `evenements` (
  `id` int(11) NOT NULL,
  `titre` varchar(100) NOT NULL,
  `description` text DEFAULT NULL,
  `date_debut` datetime NOT NULL,
  `date_fin` datetime NOT NULL,
  `lieu` varchar(100) DEFAULT NULL,
  `type` enum('evenement','rendez-vous','rappel','seance') NOT NULL DEFAULT 'evenement',
  `statut` enum('planifie','confirme','annule','complete') NOT NULL DEFAULT 'planifie',
  `rappel` tinyint(1) NOT NULL DEFAULT 1,
  `temps_rappel` int(11) NOT NULL DEFAULT 15,
  `couleur` varchar(7) NOT NULL DEFAULT '#3788d8',
  `prive` tinyint(1) NOT NULL DEFAULT 0,
  `createur_id` int(11) NOT NULL,
  `seance_id` int(11) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Déchargement des données de la table `evenements`
--

INSERT INTO `evenements` (`id`, `titre`, `description`, `date_debut`, `date_fin`, `lieu`, `type`, `statut`, `rappel`, `temps_rappel`, `couleur`, `prive`, `createur_id`, `seance_id`, `created_at`, `updated_at`) VALUES
(1, 'Atelier développement web', 'Atelier pratique sur les bases du développement web', '2025-05-20 11:33:43', '2025-05-20 14:33:43', 'Salle A, Bâtiment Les Audacieuses', 'evenement', 'planifie', 1, 15, '#3788d8', 0, 2, NULL, '2025-05-13 09:33:43', '2025-05-13 09:33:43'),
(2, 'Conférence sur la confiance en soi', 'Conférence avec des experts du domaine', '2025-05-27 11:33:43', '2025-05-27 13:33:43', 'Auditorium Central', 'evenement', 'planifie', 1, 15, '#3788d8', 0, 2, NULL, '2025-05-13 09:33:43', '2025-05-13 09:33:43');

-- --------------------------------------------------------

--
-- Structure de la table `evenements_users`
--

CREATE TABLE `evenements_users` (
  `id` int(11) NOT NULL,
  `evenement_id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `statut` varchar(50) DEFAULT NULL CHECK (`statut` in ('Confirmé','En attente','Annulé')),
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Déchargement des données de la table `evenements_users`
--

INSERT INTO `evenements_users` (`id`, `evenement_id`, `user_id`, `statut`, `created_at`, `updated_at`) VALUES
(1, 1, 3, 'Confirmé', '2025-05-13 09:33:43', '2025-05-13 09:33:43'),
(2, 1, 4, 'En attente', '2025-05-13 09:33:43', '2025-05-13 09:33:43'),
(3, 2, 3, 'Confirmé', '2025-05-13 09:33:43', '2025-05-13 09:33:43');

-- --------------------------------------------------------

--
-- Structure de la table `messages`
--

CREATE TABLE `messages` (
  `id` int(11) NOT NULL,
  `expediteur_id` int(11) NOT NULL,
  `destinataire_id` int(11) NOT NULL,
  `contenu` text NOT NULL,
  `lu` tinyint(1) DEFAULT 0,
  `date_envoi` timestamp NOT NULL DEFAULT current_timestamp(),
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Déchargement des données de la table `messages`
--

INSERT INTO `messages` (`id`, `expediteur_id`, `destinataire_id`, `contenu`, `lu`, `date_envoi`, `created_at`, `updated_at`) VALUES
(1, 2, 3, 'Bonjour Sophie, comment avancez-vous sur le module HTML ?', 1, '2025-05-13 09:33:43', '2025-05-13 09:33:43', '2025-05-13 09:33:43'),
(2, 3, 2, 'Bonjour Julie, ça avance bien ! J\'ai terminé la première séance.', 1, '2025-05-13 09:33:43', '2025-05-13 09:33:43', '2025-05-13 09:33:43'),
(3, 2, 3, 'Excellent ! N\'hésitez pas à me contacter si vous avez des questions sur la suite.', 0, '2025-05-13 09:33:43', '2025-05-13 09:33:43', '2025-05-13 09:33:43'),
(4, 2, 4, 'Bonjour Emma, bienvenue dans notre programme!', 1, '2025-05-13 09:33:43', '2025-05-13 09:33:43', '2025-05-13 09:33:43'),
(5, 4, 2, 'Merci Julie, je suis très enthousiaste pour commencer!', 0, '2025-05-13 09:33:43', '2025-05-13 09:33:43', '2025-05-13 09:33:43');

-- --------------------------------------------------------

--
-- Structure de la table `modules`
--

CREATE TABLE `modules` (
  `id` int(11) NOT NULL,
  `titre` varchar(255) NOT NULL,
  `description` text NOT NULL,
  `objectifs` text DEFAULT NULL,
  `duree` int(11) DEFAULT NULL,
  `niveau` varchar(50) DEFAULT NULL,
  `image_url` varchar(255) DEFAULT NULL,
  `created_by` int(11) NOT NULL,
  `active` tinyint(1) DEFAULT 1,
  `statut` varchar(50) DEFAULT 'brouillon',
  `date_creation` timestamp NOT NULL DEFAULT current_timestamp(),
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Déchargement des données de la table `modules`
--

INSERT INTO `modules` (`id`, `titre`, `description`, `objectifs`, `duree`, `niveau`, `image_url`, `created_by`, `active`, `statut`, `date_creation`, `created_at`, `updated_at`) VALUES
(1, 'Introduction au développement web', 'Module d\'introduction aux bases du développement web moderne.', '[\"Comprendre les fondamentaux du HTML, CSS et JavaScript\"]', 10, 'Débutant', '/assets/images/module1.jpg', 2, 1, 'publié', '2025-05-13 09:33:43', '2025-05-13 09:33:43', '2025-05-14 10:30:56'),
(2, 'Confiance en soi et prise de parole', 'Techniques et exercices pour développer sa confiance en soi', 'Être capable de s\'exprimer avec assurance en public', 8, 'Intermédiaire', '/assets/images/module2.jpg', 2, 1, 'publié', '2025-05-13 09:33:43', '2025-05-13 09:33:43', '2025-05-13 09:33:43'),
(4, 'test', '', NULL, NULL, NULL, NULL, 5, 1, 'brouillon', '2025-05-14 08:44:08', '2025-05-14 08:44:08', '2025-05-14 08:44:08'),
(5, 'test2', 'test', NULL, NULL, NULL, NULL, 5, 1, 'brouillon', '2025-05-14 08:45:17', '2025-05-14 08:45:17', '2025-05-14 08:45:17'),
(6, 'test 3', 'ceci est un test de création', '[\"test\"]', 1, 'Débutant', '/uploads/modules/module-1747214957690-148776596.jpg', 5, 1, 'publié', '2025-05-14 09:29:17', '2025-05-14 09:29:17', '2025-05-16 08:58:07');

-- --------------------------------------------------------

--
-- Structure de la table `modules_users`
--

CREATE TABLE `modules_users` (
  `id` int(11) NOT NULL,
  `module_id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `date_affectation` timestamp NOT NULL DEFAULT current_timestamp(),
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Déchargement des données de la table `modules_users`
--

INSERT INTO `modules_users` (`id`, `module_id`, `user_id`, `date_affectation`, `created_at`, `updated_at`) VALUES
(1, 1, 3, '2025-05-13 09:33:43', '2025-05-13 09:33:43', '2025-05-13 09:33:43'),
(2, 2, 3, '2025-05-13 09:33:43', '2025-05-13 09:33:43', '2025-05-13 09:33:43'),
(3, 1, 4, '2025-05-13 09:33:43', '2025-05-13 09:33:43', '2025-05-13 09:33:43'),
(4, 1, 5, '2025-05-13 09:42:10', '2025-05-13 09:42:10', '2025-05-13 09:42:10'),
(9, 6, 3, '2025-05-14 14:03:43', '2025-05-14 14:03:43', '2025-05-14 14:03:43'),
(12, 1, 7, '2025-05-17 00:11:49', '2025-05-17 00:11:49', '2025-05-17 00:11:49'),
(13, 6, 7, '2025-05-17 00:12:09', '2025-05-17 00:12:09', '2025-05-17 00:12:09'),
(14, 6, 8, '2025-05-17 00:14:25', '2025-05-17 00:14:25', '2025-05-17 00:14:25'),
(15, 1, 8, '2025-05-17 10:16:02', '2025-05-17 10:16:02', '2025-05-17 10:16:02');

-- --------------------------------------------------------

--
-- Structure de la table `module_seance`
--

CREATE TABLE `module_seance` (
  `id` int(11) NOT NULL,
  `module_id` int(11) NOT NULL,
  `seance_id` int(11) NOT NULL,
  `positions` int(11) DEFAULT 0,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Déchargement des données de la table `module_seance`
--

INSERT INTO `module_seance` (`id`, `module_id`, `seance_id`, `positions`, `created_at`, `updated_at`) VALUES
(1, 1, 1, 1, '2025-05-13 09:33:43', '2025-05-13 09:33:43'),
(2, 1, 2, 2, '2025-05-13 09:33:43', '2025-05-13 09:33:43'),
(3, 2, 3, 1, '2025-05-13 09:33:43', '2025-05-13 09:33:43'),
(4, 2, 4, 2, '2025-05-13 09:33:43', '2025-05-13 09:33:43'),
(5, 6, 4, 1, '2025-05-14 12:17:05', '2025-05-14 12:17:05'),
(8, 6, 6, 0, '2025-05-16 14:02:15', '2025-05-16 14:02:15');

-- --------------------------------------------------------

--
-- Structure de la table `reponse_client`
--

CREATE TABLE `reponse_client` (
  `id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `activite_id` int(11) NOT NULL,
  `contenu` text NOT NULL,
  `date_soumission` timestamp NOT NULL DEFAULT current_timestamp(),
  `feedback` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Structure de la table `roles`
--

CREATE TABLE `roles` (
  `id` int(11) NOT NULL,
  `nom` varchar(50) NOT NULL,
  `description` varchar(255) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Déchargement des données de la table `roles`
--

INSERT INTO `roles` (`id`, `nom`, `description`, `created_at`, `updated_at`) VALUES
(1, 'admin', 'Administrateur du système', '2025-05-13 09:33:42', '2025-05-13 09:33:42'),
(2, 'admin_plus', 'Super administrateur du système', '2025-05-13 09:33:42', '2025-05-13 09:33:42'),
(3, 'coach', 'Coach pour les formations', '2025-05-13 09:33:42', '2025-05-13 09:33:42'),
(4, 'client', 'Client participant aux formations', '2025-05-13 09:33:42', '2025-05-13 09:33:42');

-- --------------------------------------------------------

--
-- Structure de la table `seances`
--

CREATE TABLE `seances` (
  `id` int(11) NOT NULL,
  `titre` varchar(255) NOT NULL,
  `description` text DEFAULT NULL,
  `duree` int(11) NOT NULL,
  `type` varchar(50) DEFAULT NULL,
  `contenu` text DEFAULT NULL,
  `ressources` text DEFAULT NULL,
  `created_by` int(11) NOT NULL,
  `active` tinyint(1) DEFAULT 1,
  `date_creation` timestamp NOT NULL DEFAULT current_timestamp(),
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Déchargement des données de la table `seances`
--

INSERT INTO `seances` (`id`, `titre`, `description`, `duree`, `type`, `contenu`, `ressources`, `created_by`, `active`, `date_creation`, `created_at`, `updated_at`) VALUES
(1, 'Les bases du HTML ', 'Découverte des balises HTML et structure d\'une page web', 90, 'theorique', 'Contenu détaillé de la séance sur le HTML', NULL, 2, 1, '2025-05-13 09:33:43', '2025-05-13 09:33:43', '2025-05-16 13:41:55'),
(2, 'Styliser avec CSS', 'Apprendre à mettre en forme une page web', 120, 'pratique', 'Contenu détaillé de la séance sur le CSS', NULL, 2, 1, '2025-05-13 09:33:43', '2025-05-13 09:33:43', '2025-05-13 09:33:43'),
(3, 'Préparer son discours', 'Méthodes de préparation efficace pour une présentation', 60, 'theorique', 'Contenu détaillé sur la préparation', NULL, 2, 1, '2025-05-13 09:33:43', '2025-05-13 09:33:43', '2025-05-13 09:33:43'),
(4, 'Techniques de respiration', 'Exercices pratiques pour gérer le stress', 45, 'pratique', 'Contenu détaillé sur les techniques de respiration', NULL, 2, 1, '2025-05-13 09:33:43', '2025-05-13 09:33:43', '2025-05-13 09:33:43'),
(6, 'test', 'test', 60, 'individuelle', 'test', NULL, 5, 1, '2025-05-16 14:02:15', '2025-05-16 14:02:15', '2025-05-16 14:02:15'),
(8, 'Cookies au chocolat', 'test', 60, 'groupe', 'test', NULL, 5, 1, '2025-05-16 23:46:40', '2025-05-16 23:46:40', '2025-05-16 23:46:40');

-- --------------------------------------------------------

--
-- Structure de la table `seance_activite`
--

CREATE TABLE `seance_activite` (
  `id` int(11) NOT NULL,
  `seance_id` int(11) NOT NULL,
  `activite_id` int(11) NOT NULL,
  `ordre` int(11) DEFAULT 0,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Déchargement des données de la table `seance_activite`
--

INSERT INTO `seance_activite` (`id`, `seance_id`, `activite_id`, `ordre`, `created_at`, `updated_at`) VALUES
(2, 6, 1, 1, '2025-05-16 23:47:51', '2025-05-16 23:47:51'),
(3, 6, 10, 0, '2025-05-16 23:52:20', '2025-05-16 23:52:20');

-- --------------------------------------------------------

--
-- Structure de la table `status_suivi`
--

CREATE TABLE `status_suivi` (
  `id` int(11) NOT NULL,
  `type_status` varchar(50) NOT NULL,
  `description` varchar(255) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Déchargement des données de la table `status_suivi`
--

INSERT INTO `status_suivi` (`id`, `type_status`, `description`, `created_at`, `updated_at`) VALUES
(1, 'NON_COMMENCE', 'Séance non commencée', '2025-05-13 09:33:42', '2025-05-13 09:33:42'),
(2, 'EN_COURS', 'Séance en cours', '2025-05-13 09:33:42', '2025-05-13 09:33:42'),
(3, 'TERMINE', 'Séance terminée', '2025-05-13 09:33:42', '2025-05-13 09:33:42'),
(4, 'REPORTE', 'Séance reportée', '2025-05-13 09:33:42', '2025-05-13 09:33:42');

-- --------------------------------------------------------

--
-- Structure de la table `suivi`
--

CREATE TABLE `suivi` (
  `id` int(11) NOT NULL,
  `seance_id` int(11) NOT NULL,
  `user_id` int(11) DEFAULT NULL,
  `status_id` int(11) NOT NULL,
  `progression` decimal(15,2) NOT NULL DEFAULT 0.00,
  `update_suivi` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `commentaire` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Déchargement des données de la table `suivi`
--

INSERT INTO `suivi` (`id`, `seance_id`, `user_id`, `status_id`, `progression`, `update_suivi`, `commentaire`, `created_at`, `updated_at`) VALUES
(1, 1, 3, 3, 100.00, '2025-05-13 09:33:43', 'Séance terminée avec succès', '2025-05-13 09:33:43', '2025-05-13 09:33:43'),
(2, 2, 3, 2, 50.00, '2025-05-13 09:33:43', 'En cours de progression', '2025-05-13 09:33:43', '2025-05-13 09:33:43'),
(3, 1, 4, 2, 30.00, '2025-05-13 09:33:43', 'Début de la séance', '2025-05-13 09:33:43', '2025-05-13 09:33:43'),
(4, 6, 8, 3, 100.00, '2025-05-18 13:06:50', NULL, '2025-05-17 10:34:10', '2025-05-18 13:06:50'),
(5, 4, 8, 3, 100.00, '2025-05-18 13:06:50', NULL, '2025-05-17 10:34:10', '2025-05-18 13:06:50'),
(6, 1, 8, 3, 100.00, '2025-05-18 13:06:50', NULL, '2025-05-17 10:34:10', '2025-05-18 13:06:50'),
(7, 2, 8, 3, 100.00, '2025-05-18 13:06:50', NULL, '2025-05-17 10:34:10', '2025-05-18 13:06:50');

-- --------------------------------------------------------

--
-- Structure de la table `type_activites`
--

CREATE TABLE `type_activites` (
  `id` int(11) NOT NULL,
  `type_activite` varchar(50) NOT NULL,
  `couleur` varchar(50) DEFAULT '#3f51b5',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Déchargement des données de la table `type_activites`
--

INSERT INTO `type_activites` (`id`, `type_activite`, `couleur`, `created_at`, `updated_at`) VALUES
(1, 'VIDEO', '#3f51b5', '2025-05-13 09:33:42', '2025-05-13 09:33:42'),
(2, 'QUIZ', '#3f51b5', '2025-05-13 09:33:42', '2025-05-13 09:33:42'),
(3, 'EXERCICE', '#3f51b5', '2025-05-13 09:33:42', '2025-05-13 09:33:42'),
(4, 'LECTURE', '#3f51b5', '2025-05-13 09:33:42', '2025-05-13 09:33:42'),
(5, 'DISCUSSION', '#3f51b5', '2025-05-13 09:33:42', '2025-05-13 09:33:42');

-- --------------------------------------------------------

--
-- Structure de la table `users`
--

CREATE TABLE `users` (
  `id` int(11) NOT NULL,
  `mail` varchar(50) NOT NULL,
  `mdp` varchar(255) NOT NULL,
  `prenom` varchar(50) NOT NULL,
  `nom` varchar(50) NOT NULL,
  `date_naissance` date DEFAULT NULL,
  `role_id` int(11) NOT NULL,
  `active` tinyint(1) DEFAULT 1,
  `avatar` varchar(255) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Déchargement des données de la table `users`
--

INSERT INTO `users` (`id`, `mail`, `mdp`, `prenom`, `nom`, `date_naissance`, `role_id`, `active`, `avatar`, `created_at`, `updated_at`) VALUES
(1, 'admin@audacieuses.fr', '$2a$10$xVLXqoOwn9kiOKVlITBTWuUYyqx7BQGwDnP5U.gGz6YuDnpnIN1HK', 'Admin', 'Système', NULL, 1, 1, NULL, '2025-05-13 09:33:42', '2025-05-13 09:33:42'),
(2, 'coach@audacieuses.fr', '$2a$10$xVLXqoOwn9kiOKVlITBTWuUYyqx7BQGwDnP5U.gGz6YuDnpnIN1HK', 'Julie', 'Dupont', '1985-06-15', 3, 1, '/assets/images/avatar.jpg', '2025-05-13 09:33:42', '2025-05-13 09:33:42'),
(3, 'client1@example.com', '$2a$10$xVLXqoOwn9kiOKVlITBTWuUYyqx7BQGwDnP5U.gGz6YuDnpnIN1HK', 'Sophie', 'Martin', '1990-03-22', 4, 1, NULL, '2025-05-13 09:33:42', '2025-05-13 09:33:42'),
(4, 'client2@example.com', '$2a$10$xVLXqoOwn9kiOKVlITBTWuUYyqx7BQGwDnP5U.gGz6YuDnpnIN1HK', 'Emma', 'Leroy', '1988-09-10', 4, 1, NULL, '2025-05-13 09:33:42', '2025-05-13 09:33:42'),
(5, 'jason.jako.57@gmail.com', '$2b$10$EZt9f4LBgiS58fRV69HdeeJ/gumMuGnzyQ0j8FsRKp9cZ3zWuwNl2', 'Jason', 'JAKO', '2001-01-08', 2, 1, '/uploads/avatars/avatar-1747139098585-797473548.jpg', '2025-05-13 09:34:49', '2025-05-13 14:15:31'),
(7, 'test@test.com', '$2b$10$y4jP3lYOF0xiDRrEeuWWzO2/rUOdx39g6k99UItvjo0JqqtRe.YjK', 'test', 'test', NULL, 1, 1, NULL, '2025-05-14 14:44:15', '2025-05-17 00:13:12'),
(8, 'test1@test.com', '$2b$10$AsqnH2brmTI9u3lfHdBOAuGXKyUdokc3gZ1i5kHbeb5sGJYv0EOcG', 'Jason', 'Jako', '2025-05-08', 4, 1, NULL, '2025-05-17 00:13:43', '2025-05-17 00:13:43');

--
-- Index pour les tables déchargées
--

--
-- Index pour la table `activites`
--
ALTER TABLE `activites`
  ADD PRIMARY KEY (`id`),
  ADD KEY `activites_type_activite_id_foreign` (`type_activite_id`);

--
-- Index pour la table `evenements`
--
ALTER TABLE `evenements`
  ADD PRIMARY KEY (`id`),
  ADD KEY `fk_evenements_user` (`createur_id`),
  ADD KEY `fk_evenements_seance` (`seance_id`);

--
-- Index pour la table `evenements_users`
--
ALTER TABLE `evenements_users`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `unique_evenement_user` (`evenement_id`,`user_id`),
  ADD KEY `evenements_users_user_id_foreign` (`user_id`);

--
-- Index pour la table `messages`
--
ALTER TABLE `messages`
  ADD PRIMARY KEY (`id`),
  ADD KEY `messages_expediteur_id_foreign` (`expediteur_id`),
  ADD KEY `messages_destinataire_id_foreign` (`destinataire_id`);

--
-- Index pour la table `modules`
--
ALTER TABLE `modules`
  ADD PRIMARY KEY (`id`),
  ADD KEY `modules_created_by_foreign` (`created_by`);

--
-- Index pour la table `modules_users`
--
ALTER TABLE `modules_users`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `unique_module_user` (`module_id`,`user_id`),
  ADD KEY `modules_users_user_id_foreign` (`user_id`);

--
-- Index pour la table `module_seance`
--
ALTER TABLE `module_seance`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `unique_module_seance` (`module_id`,`seance_id`),
  ADD KEY `module_seance_seance_id_foreign` (`seance_id`);

--
-- Index pour la table `reponse_client`
--
ALTER TABLE `reponse_client`
  ADD PRIMARY KEY (`id`),
  ADD KEY `reponse_client_user_id_foreign` (`user_id`),
  ADD KEY `reponse_client_activite_id_foreign` (`activite_id`);

--
-- Index pour la table `roles`
--
ALTER TABLE `roles`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `role_nom_unique` (`nom`);

--
-- Index pour la table `seances`
--
ALTER TABLE `seances`
  ADD PRIMARY KEY (`id`),
  ADD KEY `seances_created_by_foreign` (`created_by`);

--
-- Index pour la table `seance_activite`
--
ALTER TABLE `seance_activite`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `unique_seance_activite` (`seance_id`,`activite_id`),
  ADD KEY `activite_id` (`activite_id`);

--
-- Index pour la table `status_suivi`
--
ALTER TABLE `status_suivi`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `status_suivi_type_unique` (`type_status`);

--
-- Index pour la table `suivi`
--
ALTER TABLE `suivi`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `unique_seance_user` (`seance_id`,`user_id`),
  ADD KEY `suivi_user_id_foreign` (`user_id`),
  ADD KEY `suivi_status_id_foreign` (`status_id`);

--
-- Index pour la table `type_activites`
--
ALTER TABLE `type_activites`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `type_activite_unique` (`type_activite`);

--
-- Index pour la table `users`
--
ALTER TABLE `users`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `user_mail_unique` (`mail`),
  ADD UNIQUE KEY `mail` (`mail`),
  ADD UNIQUE KEY `mail_2` (`mail`),
  ADD UNIQUE KEY `mail_3` (`mail`),
  ADD UNIQUE KEY `mail_4` (`mail`),
  ADD UNIQUE KEY `mail_5` (`mail`),
  ADD UNIQUE KEY `mail_6` (`mail`),
  ADD UNIQUE KEY `mail_7` (`mail`),
  ADD UNIQUE KEY `mail_8` (`mail`),
  ADD UNIQUE KEY `mail_9` (`mail`),
  ADD UNIQUE KEY `mail_10` (`mail`),
  ADD UNIQUE KEY `mail_11` (`mail`),
  ADD UNIQUE KEY `mail_12` (`mail`),
  ADD UNIQUE KEY `mail_13` (`mail`),
  ADD UNIQUE KEY `mail_14` (`mail`),
  ADD UNIQUE KEY `mail_15` (`mail`),
  ADD UNIQUE KEY `mail_16` (`mail`),
  ADD UNIQUE KEY `mail_17` (`mail`),
  ADD UNIQUE KEY `mail_18` (`mail`),
  ADD UNIQUE KEY `mail_19` (`mail`),
  ADD UNIQUE KEY `mail_20` (`mail`),
  ADD UNIQUE KEY `mail_21` (`mail`),
  ADD UNIQUE KEY `mail_22` (`mail`),
  ADD UNIQUE KEY `mail_23` (`mail`),
  ADD UNIQUE KEY `mail_24` (`mail`),
  ADD UNIQUE KEY `mail_25` (`mail`),
  ADD UNIQUE KEY `mail_26` (`mail`),
  ADD UNIQUE KEY `mail_27` (`mail`),
  ADD UNIQUE KEY `mail_28` (`mail`),
  ADD UNIQUE KEY `mail_29` (`mail`),
  ADD UNIQUE KEY `mail_30` (`mail`),
  ADD UNIQUE KEY `mail_31` (`mail`),
  ADD UNIQUE KEY `mail_32` (`mail`),
  ADD UNIQUE KEY `mail_33` (`mail`),
  ADD UNIQUE KEY `mail_34` (`mail`),
  ADD UNIQUE KEY `mail_35` (`mail`),
  ADD UNIQUE KEY `mail_36` (`mail`),
  ADD UNIQUE KEY `mail_37` (`mail`),
  ADD UNIQUE KEY `mail_38` (`mail`),
  ADD UNIQUE KEY `mail_39` (`mail`),
  ADD UNIQUE KEY `mail_40` (`mail`),
  ADD UNIQUE KEY `mail_41` (`mail`),
  ADD UNIQUE KEY `mail_42` (`mail`),
  ADD UNIQUE KEY `mail_43` (`mail`),
  ADD UNIQUE KEY `mail_44` (`mail`),
  ADD UNIQUE KEY `mail_45` (`mail`),
  ADD UNIQUE KEY `mail_46` (`mail`),
  ADD UNIQUE KEY `mail_47` (`mail`),
  ADD UNIQUE KEY `mail_48` (`mail`),
  ADD UNIQUE KEY `mail_49` (`mail`),
  ADD UNIQUE KEY `mail_50` (`mail`),
  ADD UNIQUE KEY `mail_51` (`mail`),
  ADD UNIQUE KEY `mail_52` (`mail`),
  ADD UNIQUE KEY `mail_53` (`mail`),
  ADD UNIQUE KEY `mail_54` (`mail`),
  ADD UNIQUE KEY `mail_55` (`mail`),
  ADD UNIQUE KEY `mail_56` (`mail`),
  ADD UNIQUE KEY `mail_57` (`mail`),
  ADD UNIQUE KEY `mail_58` (`mail`),
  ADD UNIQUE KEY `mail_59` (`mail`),
  ADD UNIQUE KEY `mail_60` (`mail`),
  ADD UNIQUE KEY `mail_61` (`mail`),
  ADD KEY `fk_users_role` (`role_id`);

--
-- AUTO_INCREMENT pour les tables déchargées
--

--
-- AUTO_INCREMENT pour la table `activites`
--
ALTER TABLE `activites`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=12;

--
-- AUTO_INCREMENT pour la table `evenements`
--
ALTER TABLE `evenements`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT pour la table `evenements_users`
--
ALTER TABLE `evenements_users`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT pour la table `messages`
--
ALTER TABLE `messages`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=6;

--
-- AUTO_INCREMENT pour la table `modules`
--
ALTER TABLE `modules`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=7;

--
-- AUTO_INCREMENT pour la table `modules_users`
--
ALTER TABLE `modules_users`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=16;

--
-- AUTO_INCREMENT pour la table `module_seance`
--
ALTER TABLE `module_seance`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=9;

--
-- AUTO_INCREMENT pour la table `reponse_client`
--
ALTER TABLE `reponse_client`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT pour la table `roles`
--
ALTER TABLE `roles`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;

--
-- AUTO_INCREMENT pour la table `seances`
--
ALTER TABLE `seances`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=9;

--
-- AUTO_INCREMENT pour la table `seance_activite`
--
ALTER TABLE `seance_activite`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT pour la table `status_suivi`
--
ALTER TABLE `status_suivi`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;

--
-- AUTO_INCREMENT pour la table `suivi`
--
ALTER TABLE `suivi`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=8;

--
-- AUTO_INCREMENT pour la table `type_activites`
--
ALTER TABLE `type_activites`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=6;

--
-- AUTO_INCREMENT pour la table `users`
--
ALTER TABLE `users`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=9;

--
-- Contraintes pour les tables déchargées
--

--
-- Contraintes pour la table `activites`
--
ALTER TABLE `activites`
  ADD CONSTRAINT `activites_type_activite_id_foreign` FOREIGN KEY (`type_activite_id`) REFERENCES `type_activites` (`id`) ON UPDATE CASCADE;

--
-- Contraintes pour la table `evenements`
--
ALTER TABLE `evenements`
  ADD CONSTRAINT `fk_evenements_seance` FOREIGN KEY (`seance_id`) REFERENCES `seances` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_evenements_user` FOREIGN KEY (`createur_id`) REFERENCES `users` (`id`) ON DELETE NO ACTION ON UPDATE CASCADE;

--
-- Contraintes pour la table `evenements_users`
--
ALTER TABLE `evenements_users`
  ADD CONSTRAINT `evenements_users_evenement_id_foreign` FOREIGN KEY (`evenement_id`) REFERENCES `evenements` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `evenements_users_user_id_foreign` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Contraintes pour la table `messages`
--
ALTER TABLE `messages`
  ADD CONSTRAINT `messages_destinataire_id_foreign` FOREIGN KEY (`destinataire_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `messages_expediteur_id_foreign` FOREIGN KEY (`expediteur_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Contraintes pour la table `modules`
--
ALTER TABLE `modules`
  ADD CONSTRAINT `modules_created_by_foreign` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE NO ACTION ON UPDATE CASCADE;

--
-- Contraintes pour la table `modules_users`
--
ALTER TABLE `modules_users`
  ADD CONSTRAINT `modules_users_module_id_foreign` FOREIGN KEY (`module_id`) REFERENCES `modules` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `modules_users_user_id_foreign` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Contraintes pour la table `module_seance`
--
ALTER TABLE `module_seance`
  ADD CONSTRAINT `module_seance_module_id_foreign` FOREIGN KEY (`module_id`) REFERENCES `modules` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `module_seance_seance_id_foreign` FOREIGN KEY (`seance_id`) REFERENCES `seances` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Contraintes pour la table `reponse_client`
--
ALTER TABLE `reponse_client`
  ADD CONSTRAINT `reponse_client_activite_id_foreign` FOREIGN KEY (`activite_id`) REFERENCES `activites` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `reponse_client_user_id_foreign` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Contraintes pour la table `seances`
--
ALTER TABLE `seances`
  ADD CONSTRAINT `seances_created_by_foreign` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE NO ACTION ON UPDATE CASCADE;

--
-- Contraintes pour la table `seance_activite`
--
ALTER TABLE `seance_activite`
  ADD CONSTRAINT `seance_activite_ibfk_1` FOREIGN KEY (`seance_id`) REFERENCES `seances` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `seance_activite_ibfk_2` FOREIGN KEY (`activite_id`) REFERENCES `activites` (`id`) ON DELETE CASCADE;

--
-- Contraintes pour la table `suivi`
--
ALTER TABLE `suivi`
  ADD CONSTRAINT `suivi_seance_id_foreign` FOREIGN KEY (`seance_id`) REFERENCES `seances` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `suivi_status_id_foreign` FOREIGN KEY (`status_id`) REFERENCES `status_suivi` (`id`) ON DELETE NO ACTION ON UPDATE CASCADE,
  ADD CONSTRAINT `suivi_user_id_foreign` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
