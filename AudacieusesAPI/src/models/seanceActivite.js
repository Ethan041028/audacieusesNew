'use strict';

module.exports = (sequelize, DataTypes) => {
  const SeanceActivite = sequelize.define('SeanceActivite', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    seance_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'seances',
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
    ordre: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    }
  }, {
    tableName: 'seance_activite',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  });

  return SeanceActivite;
};
