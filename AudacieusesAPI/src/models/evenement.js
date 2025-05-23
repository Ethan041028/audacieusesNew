'use strict';

module.exports = (sequelize, DataTypes) => {
  const Evenement = sequelize.define(
    'Evenement',
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      titre: {
        type: DataTypes.STRING(100),
        allowNull: false,
      },
      description: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      date_debut: {
        type: DataTypes.DATE,
        allowNull: false,
      },
      date_fin: {
        type: DataTypes.DATE,
        allowNull: false,
      },      lieu: {
        type: DataTypes.STRING(100),
        allowNull: true,
      },
      type: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: 'evenement',
        validate: {
          isIn: {
            args: [['evenement', 'rendez-vous', 'rappel', 'seance']],
            msg: 'La valeur doit être l\'une des suivantes: evenement, rendez-vous, rappel, seance'
          }
        }
      },
      statut: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: 'planifie',
        validate: {
          isIn: {
            args: [['planifie', 'confirme', 'annule', 'complete']],
            msg: 'La valeur doit être l\'une des suivantes: planifie, confirme, annule, complete'
          }
        }
      },
      rappel: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
      temps_rappel: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 15, // 15 minutes par défaut
      },
      couleur: {
        type: DataTypes.STRING(7),
        allowNull: false,
        defaultValue: '#3788d8',
      },
      prive: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      createur_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id'
        },
        onDelete: 'NO ACTION',
        onUpdate: 'CASCADE'
      },
      seance_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
    },
    {
      tableName: 'evenements',
      timestamps: true,
      createdAt: 'created_at',
      updatedAt: 'updated_at',
    }
  );

  Evenement.associate = (models) => {
    // Relation avec l'utilisateur créateur
    Evenement.belongsTo(models.User, {
      as: 'createur',
      foreignKey: {
        name: 'createur_id',
        allowNull: false
      },
      onDelete: 'NO ACTION',
      onUpdate: 'CASCADE',
      constraints: true // Ceci garantit que les contraintes sont appliquées
    });

    // Relation avec la séance (optionnelle)
    Evenement.belongsTo(models.Seance, {
      as: 'seance',
      foreignKey: {
        name: 'seance_id',
        allowNull: true
      },
      onDelete: 'SET NULL',
      onUpdate: 'CASCADE',
      constraints: true // Ceci garantit que les contraintes sont appliquées
    });

    // Relation many-to-many avec les utilisateurs participants
    Evenement.belongsToMany(models.User, {
      through: 'evenement_participants',
      as: 'participants',
      foreignKey: 'evenement_id',
      otherKey: 'user_id',
      timestamps: true
    });
  };

  return Evenement;
};