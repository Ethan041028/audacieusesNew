'use strict';

module.exports = (sequelize, DataTypes) => {
  const StatusSuivi = sequelize.define('StatusSuivi', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    type_status: {
      type: DataTypes.STRING(50),
      allowNull: false,
      unique: true
    }
  }, {
    tableName: 'status_suivi',
    timestamps: false
  });

  StatusSuivi.associate = function(models) {
    // Un status peut être associé à plusieurs suivis
    StatusSuivi.hasMany(models.Suivi, {
      foreignKey: 'status_id',
      as: 'suivis'
    });
  };

  return StatusSuivi;
};