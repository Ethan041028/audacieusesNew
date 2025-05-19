'use strict';

module.exports = (sequelize, DataTypes) => {
  const TypeActivite = sequelize.define('TypeActivite', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    type_activite: {
      type: DataTypes.STRING(50),
      allowNull: false,
      unique: true
    },
    couleur: {
      type: DataTypes.STRING(50),
      allowNull: true,
      defaultValue: '#3f51b5'
    }
  }, {
    tableName: 'type_activites',
    timestamps: false
  });
  TypeActivite.associate = function(models) {
    // Un type d'activité peut avoir plusieurs activités associées
    TypeActivite.hasMany(models.Activite, {
      foreignKey: 'type_activite_id',
      as: 'activites'
    });
  };

  return TypeActivite;
};