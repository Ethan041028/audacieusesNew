const { Activite, TypeActivite, Seance, ReponseClient, User, SeanceActivite } = require('../models');
const logger = require('../utils/logger');
const { validateQcmContent } = require('../utils/qcmValidator');

// Récupérer toutes les activités
exports.getAllActivites = async (req, res) => {
  try {
    const activites = await Activite.findAll({
      include: [
        {
          model: TypeActivite,
          as: 'typeActivite'
        },
        {
          model: Seance,
          as: 'seances',
          through: {
            as: 'seanceActivite',
            attributes: ['ordre']
          }
        }
      ],
      attributes: { 
        exclude: [] // No need to exclude ordre anymore as it's been removed from the model
      }
    });
    
    res.status(200).json({ activites });
  } catch (error) {
    logger.error(`Erreur lors de la récupération des activités: ${error.message}`);
    res.status(500).json({
      error: 'Erreur serveur',
      message: 'Une erreur est survenue lors de la récupération des activités'
    });
  }
};

// Récupérer une activité par son ID
exports.getActiviteById = async (req, res) => {
  try {
    const activiteId = req.params.id;
    
    const activite = await Activite.findByPk(activiteId, {
      include: [
        {
          model: TypeActivite,
          as: 'typeActivite'
        },
        {
          model: Seance,
          as: 'seances',
          through: {
            as: 'seanceActivite',
            attributes: ['ordre']
          }
        }
      ],
      attributes: { 
        exclude: [] // No need to exclude ordre anymore as it's been removed from the model
      }
    });
    
    if (!activite) {
      return res.status(404).json({
        error: 'Activité non trouvée',
        message: 'L\'activité demandée n\'existe pas'
      });
    }
    
    res.status(200).json({ activite });
  } catch (error) {
    logger.error(`Erreur lors de la récupération de l'activité: ${error.message}`);
    res.status(500).json({
      error: 'Erreur serveur',
      message: 'Une erreur est survenue lors de la récupération de l\'activité'
    });
  }
};

// Récupérer les activités par séance
exports.getActivitesBySeance = async (req, res) => {
  try {
    const seanceId = req.params.seanceId;
    
    // Vérifier si la séance existe
    const seance = await Seance.findByPk(seanceId);
    
    if (!seance) {
      return res.status(404).json({
        error: 'Séance non trouvée',
        message: 'La séance demandée n\'existe pas'
      });
    }
    
    // Récupérer les activités liées à la séance via la table de jointure avec leur ordre
    const seanceWithActivites = await Seance.findByPk(seanceId, {
      include: [
        {
          model: Activite,
          as: 'activites',
          through: {
            as: 'seanceActivite',
            attributes: ['ordre']
          },
          include: [
            {
              model: TypeActivite,
              as: 'typeActivite'
            }
          ]
        }
      ]
    });
    
    // Trier les activités par ordre
    const activites = seanceWithActivites.activites;
    activites.sort((a, b) => {
      return a.seanceActivite.ordre - b.seanceActivite.ordre;
    });
    
    res.status(200).json({ 
      seance: {
        id: seance.id,
        titre: seance.titre
      },
      activites 
    });
  } catch (error) {
    logger.error(`Erreur lors de la récupération des activités par séance: ${error.message}`);
    res.status(500).json({
      error: 'Erreur serveur',
      message: 'Une erreur est survenue lors de la récupération des activités'
    });
  }
};

// Créer une nouvelle activité
exports.createActivite = async (req, res) => {
  try {
    const { 
      titre, 
      description, 
      contenu, 
      type_activite_id, 
      ordre, // Gardons cette variable pour la table de jointure, mais pas pour l'activité elle-même
      duree,
      // Propriétés spécifiques aux types d'activités
      lien_video,
      questions,
      reponses_possibles,
      reponse_correcte,
      seance_id  // optional parameter for backward compatibility
    } = req.body;
    
    // Vérifier si le type d'activité existe
    let typeActivite = null;
    if (type_activite_id) {
      typeActivite = await TypeActivite.findByPk(type_activite_id);
      
      if (!typeActivite) {
        return res.status(404).json({
          error: 'Type d\'activité non trouvé',
          message: 'Le type d\'activité spécifié n\'existe pas'
        });
      }
    }
    
    // Vérifier si la séance existe (si spécifiée)
    let seance = null;
    if (seance_id) {
      seance = await Seance.findByPk(seance_id);
      
      if (!seance) {
        return res.status(404).json({
          error: 'Séance non trouvée',
          message: 'La séance spécifiée n\'existe pas'
        });
      }
    }
    
    // Préparer le contenu en fonction du type d'activité
    let contenuStructure = contenu;
    
    if (typeActivite) {
      switch (typeActivite.type_activite) {
        case 'Vidéo':
          if (!lien_video) {
            return res.status(400).json({
              error: 'Données manquantes',
              message: 'Le lien vidéo est requis pour ce type d\'activité'
            });
          }
          contenuStructure = {
            type: 'video',
            lien: lien_video,
            description: description || ''
          };
          break;
          
        case 'QCM':
          if (!questions || !Array.isArray(questions) || questions.length === 0) {
            return res.status(400).json({
              error: 'Données manquantes',
              message: 'Au moins une question est requise pour ce type d\'activité'
            });
          }
          
          try {
            // Construire la structure QCM initiale
            const qcmInitial = {
              type: 'qcm',
              questions: questions.map((q, index) => {
                if (!q.texte) {
                  logger.warn(`Question ${index + 1} sans texte dans la création d'activité QCM`);
                }
                
                if (!q.options || !Array.isArray(q.options) || q.options.length === 0) {
                  logger.warn(`Question ${index + 1} sans options dans la création d'activité QCM`);
                }
                
                return {
                  texte: q.texte || `Question ${index + 1}`,
                  options: Array.isArray(q.options) ? q.options : ['Option 1', 'Option 2'],
                  reponse_correcte: q.reponse_correcte !== undefined ? q.reponse_correcte : 0
                };
              })
            };
            
            // Valider et standardiser le contenu QCM
            contenuStructure = validateQcmContent(qcmInitial);
            logger.info('Structure QCM validée et standardisée avec succès');
          } catch (error) {
            logger.error(`Erreur lors de la validation du QCM: ${error.message}`);
            return res.status(400).json({
              error: 'Format QCM invalide',
              message: error.message
            });
          }
          break;
          
        case 'Question-Réponse':
          if (!questions || !Array.isArray(questions) || questions.length === 0) {
            return res.status(400).json({
              error: 'Données manquantes',
              message: 'Au moins une question est requise pour ce type d\'activité'
            });
          }
          
          contenuStructure = {
            type: 'question_reponse',
            questions: questions.map(q => ({ texte: q.texte }))
          };
          break;
          
        case 'Texte':
        default:
          // Si c'est un type simple ou non spécifié, garder le contenu tel quel
          contenuStructure = {
            type: 'texte',
            contenu: contenu || ''
          };
          break;
      }
    } else {
      // Si pas de type d'activité, utiliser un contenu simple
      contenuStructure = {
        type: 'texte',
        contenu: contenu || ''
      };
    }
    
    // Créer la nouvelle activité avec le contenu structuré
    const newActivite = await Activite.create({
      titre,
      description,
      contenu: contenuStructure, // Le setter du modèle convertira automatiquement en JSON
      type_activite_id,
      duree: duree || null,
      date_creation: new Date(),
      updated_at: new Date()
    });
    
    // Si une séance est spécifiée, créer l'association
    if (seance_id) {
      await SeanceActivite.create({
        seance_id,
        activite_id: newActivite.id,
        ordre: ordre || 0
      });
    }
    
    // Récupérer l'activité créée avec ses relations pour la réponse
    const createdActivite = await Activite.findByPk(newActivite.id, {
      include: [
        {
          model: TypeActivite,
          as: 'typeActivite'
        },
        {
          model: Seance,
          as: 'seances',
          through: {
            as: 'seanceActivite',
            attributes: ['ordre']
          }
        }
      ]
    });
    
    logger.info(`Nouvelle activité créée: ${newActivite.id} (${titre})`);
    
    res.status(201).json({
      message: 'Activité créée avec succès',
      activite: createdActivite
    });
  } catch (error) {
    logger.error(`Erreur lors de la création de l'activité: ${error.message}`);
    res.status(500).json({
      error: 'Erreur serveur',
      message: `Une erreur est survenue lors de la création de l'activité: ${error.message}`
    });
  }
};

// Mettre à jour une activité
exports.updateActivite = async (req, res) => {
  try {
    const activiteId = req.params.id;
    const { titre, description, contenu, type_activite_id, seance_id, ordre, duree } = req.body;
    
    // Récupérer l'activité
    const activite = await Activite.findByPk(activiteId);
    
    if (!activite) {
      return res.status(404).json({
        error: 'Activité non trouvée',
        message: 'L\'activité demandée n\'existe pas'
      });
    }
    
    // Si le type d'activité est modifié, vérifier qu'il existe
    if (type_activite_id && type_activite_id !== activite.type_activite_id) {
      const typeActivite = await TypeActivite.findByPk(type_activite_id);
      
      if (!typeActivite) {
        return res.status(404).json({
          error: 'Type d\'activité non trouvé',
          message: 'Le type d\'activité spécifié n\'existe pas'
        });
      }
    }
    
    // Si la séance est spécifiée, vérifier qu'elle existe et mettre à jour l'association
    if (seance_id) {
      const seance = await Seance.findByPk(seance_id);
      
      if (!seance) {
        return res.status(404).json({
          error: 'Séance non trouvée',
          message: 'La séance spécifiée n\'existe pas'
        });
      }
      
      // Vérifier si l'activité est déjà associée à cette séance
      const existingAssociation = await SeanceActivite.findOne({
        where: {
          seance_id: seance_id,
          activite_id: activiteId
        }
      });
      
      // Si l'association n'existe pas, la créer avec l'ordre spécifié
      if (!existingAssociation && ordre !== undefined) {
        await SeanceActivite.create({
          seance_id: seance_id,
          activite_id: activiteId,
          ordre: ordre
        });
      } 
      // Si l'association existe et que l'ordre est spécifié, mettre à jour l'ordre
      else if (existingAssociation && ordre !== undefined) {
        existingAssociation.ordre = ordre;
        await existingAssociation.save();
      }
    }
    
    // Mettre à jour les informations de l'activité
    if (titre) activite.titre = titre;
    if (description !== undefined) activite.description = description;
    
    // Vérifier si c'est une activité QCM et que le contenu est modifié
    if (contenu) {
      // Récupérer le type d'activité
      const typeActivite = await TypeActivite.findByPk(activite.type_activite_id);
      
      if (typeActivite && typeActivite.type_activite === 'QCM') {
        // Valider et standardiser le contenu QCM
        try {
          const validatedQcm = validateQcmContent(contenu);
          activite.contenu = validatedQcm;
          logger.info(`Contenu QCM validé lors de la mise à jour de l'activité ${activite.id}`);
        } catch (error) {
          logger.error(`Erreur lors de la validation du QCM durant la mise à jour: ${error.message}`);
          return res.status(400).json({
            error: 'Format QCM invalide',
            message: error.message
          });
        }
      } else {
        // Pour les autres types d'activités, mettre à jour le contenu tel quel
        activite.contenu = contenu;
      }
    }
    
    if (type_activite_id) activite.type_activite_id = type_activite_id;
    if (duree !== undefined) activite.duree = duree;
    activite.updated_at = new Date();
    
    await activite.save();
    
    // Récupérer l'activité mise à jour avec ses relations pour la réponse
    const updatedActivite = await Activite.findByPk(activiteId, {
      include: [
        {
          model: TypeActivite,
          as: 'typeActivite'
        },
        {
          model: Seance,
          as: 'seances',
          through: {
            as: 'seanceActivite',
            attributes: ['ordre']
          }
        }
      ]
    });
    
    logger.info(`Activité mise à jour: ${activiteId}`);
    
    res.status(200).json({
      message: 'Activité mise à jour avec succès',
      activite: updatedActivite
    });
  } catch (error) {
    logger.error(`Erreur lors de la mise à jour de l'activité: ${error.message}`);
    res.status(500).json({
      error: 'Erreur serveur',
      message: 'Une erreur est survenue lors de la mise à jour de l\'activité'
    });
  }
};

// Supprimer une activité
exports.deleteActivite = async (req, res) => {
  try {
    const activiteId = req.params.id;
    
    // Récupérer l'activité
    const activite = await Activite.findByPk(activiteId);
    
    if (!activite) {
      return res.status(404).json({
        error: 'Activité non trouvée',
        message: 'L\'activité demandée n\'existe pas'
      });
    }
    
    // Supprimer l'activité
    await activite.destroy();
    
    logger.info(`Activité supprimée: ${activiteId}`);
    
    res.status(200).json({
      message: 'Activité supprimée avec succès'
    });
  } catch (error) {
    logger.error(`Erreur lors de la suppression de l'activité: ${error.message}`);
    res.status(500).json({
      error: 'Erreur serveur',
      message: 'Une erreur est survenue lors de la suppression de l\'activité'
    });
  }
};

// Récupérer les types d'activités
exports.getTypeActivites = async (req, res) => {
  try {
    const typeActivites = await TypeActivite.findAll();
    
    res.status(200).json({ typeActivites });
  } catch (error) {
    logger.error(`Erreur lors de la récupération des types d'activités: ${error.message}`);
    res.status(500).json({
      error: 'Erreur serveur',
      message: 'Une erreur est survenue lors de la récupération des types d\'activités'
    });
  }
};

// Réordonner les activités d'une séance
exports.reorderActivites = async (req, res) => {
  try {
    const seanceId = req.params.seanceId;
    const { ordre } = req.body;
    
    // Vérifier si la séance existe
    const seance = await Seance.findByPk(seanceId);
    
    if (!seance) {
      return res.status(404).json({
        error: 'Séance non trouvée',
        message: 'La séance demandée n\'existe pas'
      });
    }
    
    // Vérifier que le tableau d'ordre est valide
    if (!Array.isArray(ordre) || ordre.length === 0) {
      return res.status(400).json({
        error: 'Données invalides',
        message: 'Le tableau d\'ordre est requis et doit contenir au moins un élément'
      });
    }
    
    // Récupérer toutes les associations de cette séance
    const seanceActivites = await SeanceActivite.findAll({
      where: { seance_id: seanceId }
    });
    
    // Vérifier que toutes les activités existent et appartiennent à la séance
    const activiteIds = seanceActivites.map(sa => sa.activite_id);
    for (const item of ordre) {
      if (!activiteIds.includes(item.id)) {
        return res.status(400).json({
          error: 'Activité invalide',
          message: `L'activité avec l'ID ${item.id} n'existe pas ou n'appartient pas à cette séance`
        });
      }
    }
    
    // Mettre à jour l'ordre des activités dans la table de jointure
    for (const item of ordre) {
      await SeanceActivite.update(
        { ordre: item.ordre },
        { where: { seance_id: seanceId, activite_id: item.id } }
      );
    }
    
    // Récupérer les activités mises à jour pour la réponse
    const seanceWithActivites = await Seance.findByPk(seanceId, {
      include: [
        {
          model: Activite,
          as: 'activites',
          through: {
            as: 'seanceActivite',
            attributes: ['ordre']
          },
          include: [
            {
              model: TypeActivite,
              as: 'typeActivite'
            }
          ]
        }
      ]
    });
    
    // Trier les activités par ordre
    const updatedActivites = seanceWithActivites.activites;
    updatedActivites.sort((a, b) => {
      return a.seanceActivite.ordre - b.seanceActivite.ordre;
    });
    
    logger.info(`Ordre des activités mis à jour pour la séance: ${seanceId}`);
    
    res.status(200).json({
      message: 'Ordre des activités mis à jour avec succès',
      activites: updatedActivites
    });
  } catch (error) {
    logger.error(`Erreur lors de la mise à jour de l'ordre des activités: ${error.message}`);
    res.status(500).json({
      error: 'Erreur serveur',
      message: 'Une erreur est survenue lors de la mise à jour de l\'ordre des activités'
    });
  }
};

// Enregistrer une réponse à une question
exports.saveReponse = async (req, res) => {
  try {
    const activiteId = req.params.id;
    const { reponse } = req.body;
    const userId = req.user.id; // Obtenu à partir du middleware d'authentification
    
    // Vérifier si l'activité existe
    const activite = await Activite.findByPk(activiteId, {
      include: [{
        model: TypeActivite,
        as: 'typeActivite'
      }]
    });
    
    if (!activite) {
      return res.status(404).json({
        error: 'Activité non trouvée',
        message: 'L\'activité demandée n\'existe pas'
      });
    }
    
    // Préparation de la réponse à sauvegarder
    let reponseToSave = reponse;
    
    // Traitement basé sur le type d'activité
    if (activite.typeActivite) {
      const activityType = activite.typeActivite.type_activite;
      
      // QCM : format spécifique avec options sélectionnées
      if (activityType === 'QCM') {
        try {
          // Essayer de parser la réponse pour vérifier si c'est déjà un JSON
          const parsedReponse = JSON.parse(reponse);
          // Si c'est un JSON valide, le garder tel quel (supposant que c'est bien structuré)
          reponseToSave = reponse;
        } catch (e) {
          // Si ce n'est pas un JSON, l'encapsuler dans un format QCM attendu
          reponseToSave = JSON.stringify({
            selectedOption: 0,
            selectedOptionText: reponse
          });
        }
      } 
      // Pour les types Question-Réponse, QUIZ, LECTURE, VIDEO, DOCUMENT
      // Garder le format de réponse tel quel ou le convertir en JSON si nécessaire
      else {
        try {
          // Essayer de parser pour vérifier si c'est déjà un JSON
          JSON.parse(reponse);
          // Si c'est un JSON valide, le garder tel quel
          reponseToSave = reponse;
        } catch (e) {
          // Si ce n'est pas un JSON, s'assurer qu'on stocke une chaîne
          reponseToSave = typeof reponse === 'string' ? reponse : JSON.stringify(reponse);
        }
      }
    }
    
    // Vérifier si l'utilisateur a déjà répondu à cette activité
    const existingReponse = await ReponseClient.findOne({
      where: {
        activite_id: activiteId,
        user_id: userId
      }
    });
    
    if (existingReponse) {
      // Mettre à jour la réponse existante
      existingReponse.reponse = reponseToSave;
      existingReponse.updated_at = new Date();
      await existingReponse.save();
      
      logger.info(`Réponse mise à jour pour l'activité ${activiteId} par l'utilisateur ${userId}`);
      
      return res.status(200).json({
        message: 'Réponse mise à jour avec succès',
        reponse: existingReponse
      });
    }
    
    // Créer une nouvelle réponse
    const nouvelleReponse = await ReponseClient.create({
      activite_id: activiteId,
      user_id: userId,
      reponse: reponseToSave
    });
    
    logger.info(`Réponse enregistrée pour l'activité ${activiteId} (type: ${activite.typeActivite?.type_activite || 'inconnu'}) par l'utilisateur ${userId}`);
    
    res.status(201).json({
      message: 'Réponse enregistrée avec succès',
      reponse: nouvelleReponse
    });
  } catch (error) {
    logger.error(`Erreur lors de l'enregistrement de la réponse: ${error.message}`);
    res.status(500).json({
      error: 'Erreur serveur',
      message: 'Une erreur est survenue lors de l\'enregistrement de la réponse'
    });
  }
};

// Récupérer les réponses d'un utilisateur pour une activité
exports.getUserReponses = async (req, res) => {
  try {
    const activiteId = req.params.id;
    const userId = req.params.userId;
    
    // Vérifier si l'activité existe
    const activite = await Activite.findByPk(activiteId);
    
    if (!activite) {
      return res.status(404).json({
        error: 'Activité non trouvée',
        message: 'L\'activité demandée n\'existe pas'
      });
    }
    
    // Vérifier si l'utilisateur existe
    const user = await User.findByPk(userId);
    
    if (!user) {
      return res.status(404).json({
        error: 'Utilisateur non trouvé',
        message: 'L\'utilisateur demandé n\'existe pas'
      });
    }
    
    // Récupérer la réponse de l'utilisateur
    const reponse = await ReponseClient.findOne({
      where: {
        activite_id: activiteId,
        user_id: userId
      }
    });
    
    if (!reponse) {
      return res.status(404).json({
        error: 'Réponse non trouvée',
        message: 'Aucune réponse n\'a été trouvée pour cet utilisateur et cette activité'
      });
    }
    
    res.status(200).json({ reponse });
  } catch (error) {
    logger.error(`Erreur lors de la récupération des réponses: ${error.message}`);
    res.status(500).json({
      error: 'Erreur serveur',
      message: 'Une erreur est survenue lors de la récupération des réponses'
    });
  }
};

// Ajouter une activité existante à une séance
exports.addActiviteToSeance = async (req, res) => {
  try {
    const seanceId = req.params.seanceId;
    const activiteId = req.params.activiteId;
    
    // Vérifier si la séance existe
    const seance = await Seance.findByPk(seanceId);
    
    if (!seance) {
      return res.status(404).json({
        error: 'Séance non trouvée',
        message: 'La séance spécifiée n\'existe pas'
      });
    }
    
    // Vérifier si l'activité existe
    const activite = await Activite.findByPk(activiteId);
    
    if (!activite) {
      return res.status(404).json({
        error: 'Activité non trouvée',
        message: 'L\'activité spécifiée n\'existe pas'
      });
    }
    
    // Vérifier si l'association existe déjà
    const existingAssociation = await SeanceActivite.findOne({
      where: {
        seance_id: seanceId,
        activite_id: activiteId
      }
    });
    
    if (existingAssociation) {
      return res.status(400).json({
        error: 'Association existante',
        message: 'Cette activité est déjà associée à cette séance'
      });
    }
    
    // Obtenir l'ordre maximum actuel des activités dans cette séance
    const maxOrdreActivite = await SeanceActivite.max('ordre', {
      where: { seance_id: seanceId }
    }) || 0;
    
    // Créer la nouvelle association avec un ordre incrémenté
    await SeanceActivite.create({
      seance_id: seanceId,
      activite_id: activiteId,
      ordre: maxOrdreActivite + 1
    });
    
    // Récupérer l'activité avec ses relations pour la réponse
    const updatedActivite = await Activite.findByPk(activiteId, {
      include: [
        {
          model: TypeActivite,
          as: 'typeActivite'
        }
      ]
    });
    
    logger.info(`Activité ${activiteId} ajoutée à la séance ${seanceId}`);
    
    res.status(200).json({
      message: 'Activité ajoutée à la séance avec succès',
      activite: updatedActivite
    });
  } catch (error) {
    logger.error(`Erreur lors de l'ajout de l'activité à la séance: ${error.message}`);
    res.status(500).json({
      error: 'Erreur serveur',
      message: 'Une erreur est survenue lors de l\'ajout de l\'activité à la séance'
    });
  }
};

// Retirer une activité d'une séance
exports.removeActiviteFromSeance = async (req, res) => {
  try {
    const seanceId = req.params.seanceId;
    const activiteId = req.params.activiteId;
    
    // Vérifier si la séance existe
    const seance = await Seance.findByPk(seanceId);
    
    if (!seance) {
      return res.status(404).json({
        error: 'Séance non trouvée',
        message: 'La séance spécifiée n\'existe pas'
      });
    }
    
    // Vérifier si l'association existe
    const association = await SeanceActivite.findOne({
      where: {
        seance_id: seanceId,
        activite_id: activiteId
      }
    });
    
    if (!association) {
      return res.status(404).json({
        error: 'Association non trouvée',
        message: 'L\'activité spécifiée n\'est pas associée à cette séance'
      });
    }
    
    // Supprimer l'association
    await association.destroy();
    
    logger.info(`Activité ${activiteId} retirée de la séance ${seanceId}`);
    
    res.status(200).json({
      message: 'Activité retirée de la séance avec succès'
    });
  } catch (error) {
    logger.error(`Erreur lors du retrait de l'activité de la séance: ${error.message}`);
    res.status(500).json({
      error: 'Erreur serveur',
      message: 'Une erreur est survenue lors du retrait de l\'activité de la séance'
    });
  }
};
