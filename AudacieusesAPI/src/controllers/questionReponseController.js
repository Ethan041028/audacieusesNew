// Fonctions additionnelles pour gérer les réponses aux questions

// Enregistrer une réponse d'utilisateur pour une activité de type question
exports.saveReponse = async (req, res) => {
  try {
    const { id: activiteId } = req.params;
    const { user_id, reponse } = req.body;

    // Vérifier que l'activité existe
    const activite = await Activite.findByPk(activiteId, {
      include: [{
        model: TypeActivite,
        as: 'typeActivite'
      }]
    });

    if (!activite) {
      return res.status(404).json({
        error: 'Activité non trouvée',
        message: `Aucune activité trouvée avec l'ID ${activiteId}`
      });
    }

    // Vérifier que l'utilisateur existe
    const user = await User.findByPk(user_id);
    if (!user) {
      return res.status(404).json({
        error: 'Utilisateur non trouvé',
        message: `Aucun utilisateur trouvé avec l'ID ${user_id}`
      });
    }

    // Vérifier si une réponse existe déjà pour cet utilisateur et cette activité
    const existingReponse = await ReponseClient.findOne({
      where: {
        activite_id: activiteId,
        user_id: user_id
      }
    });

    let result;
    if (existingReponse) {
      // Mettre à jour la réponse existante
      existingReponse.reponse = reponse;
      existingReponse.updated_at = new Date();
      result = await existingReponse.save();
      
      res.status(200).json({
        message: 'Réponse mise à jour avec succès',
        reponse: result
      });
    } else {
      // Créer une nouvelle réponse
      result = await ReponseClient.create({
        activite_id: activiteId,
        user_id: user_id,
        reponse: reponse,
        date_creation: new Date(),
        updated_at: new Date()
      });
      
      res.status(201).json({
        message: 'Réponse enregistrée avec succès',
        reponse: result
      });
    }
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
    const { id: activiteId, userId } = req.params;

    // Vérifier que l'activité existe
    const activite = await Activite.findByPk(activiteId);
    if (!activite) {
      return res.status(404).json({
        error: 'Activité non trouvée',
        message: `Aucune activité trouvée avec l'ID ${activiteId}`
      });
    }

    // Vérifier que l'utilisateur existe
    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).json({
        error: 'Utilisateur non trouvé',
        message: `Aucun utilisateur trouvé avec l'ID ${userId}`
      });
    }

    // Récupérer les réponses de l'utilisateur pour cette activité
    const reponses = await ReponseClient.findAll({
      where: {
        activite_id: activiteId,
        user_id: userId
      },
      order: [['date_creation', 'DESC']]
    });

    res.status(200).json({
      reponses
    });
  } catch (error) {
    logger.error(`Erreur lors de la récupération des réponses: ${error.message}`);
    res.status(500).json({
      error: 'Erreur serveur',
      message: 'Une erreur est survenue lors de la récupération des réponses'
    });
  }
};
