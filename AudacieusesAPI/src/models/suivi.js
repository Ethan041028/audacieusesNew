'use strict';

module.exports = (sequelize, DataTypes) => {
  const Suivi = sequelize.define('Suivi', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    progression: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: false,
      defaultValue: 0.00
    },
    update_suivi: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    },
    seance_id: { // Renommé de id_1
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'seances',
        key: 'id'
      },
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE',
      field: 'seance_id' // Spécifie le nom de la colonne dans la base de données
    },
    user_id: { // Renommé de id_2
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id'
      },
      onDelete: 'SET NULL',
      onUpdate: 'CASCADE',
      field: 'user_id' // Spécifie le nom de la colonne dans la base de données
    },
    status_id: { // Renommé de id_3
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'status_suivi',
        key: 'id'
      },
      field: 'status_id' // Spécifie le nom de la colonne dans la base de données
    }
  }, {
    tableName: 'suivi',
    timestamps: false
  });

  Suivi.associate = function(models) {
    // Un suivi concerne une séance spécifique
    Suivi.belongsTo(models.Seance, {
      foreignKey: 'seance_id',
      as: 'seance'
    });
    
    // Un suivi est lié à un utilisateur
    Suivi.belongsTo(models.User, {
      foreignKey: 'user_id',
      as: 'utilisateur'
    });
    
    // Un suivi a un statut
    Suivi.belongsTo(models.StatusSuivi, {
      foreignKey: 'status_id',
      as: 'status'
    });
  };

  return Suivi;
};