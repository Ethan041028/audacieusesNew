'use strict';

module.exports = (sequelize, DataTypes) => {
  const ReponseClient = sequelize.define('ReponseClient', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id'
      }
    },
    activite_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'activites',
        key: 'id'
      }
    },
    contenu: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    date_soumission: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    },
    feedback: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    created_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    },
    updated_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    }
  }, {
    tableName: 'reponse_client',
    timestamps: false,
    underscored: true
  });

  ReponseClient.associate = function(models) {
    // Une réponse est liée à une activité spécifique
    ReponseClient.belongsTo(models.Activite, {
      foreignKey: 'activite_id',
      as: 'activite'
    });
    
    // Une réponse est fournie par un utilisateur spécifique
    ReponseClient.belongsTo(models.User, {
      foreignKey: 'user_id',
      as: 'utilisateur'
    });
  };

  return ReponseClient;
};