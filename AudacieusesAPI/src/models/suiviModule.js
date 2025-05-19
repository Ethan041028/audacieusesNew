module.exports = (sequelize, DataTypes) => {
  const SuiviModule = sequelize.define('SuiviModule', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    module_id: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    progression: {
      type: DataTypes.FLOAT,
      defaultValue: 0
    },
    status_id: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    date_completion: {
      type: DataTypes.DATE,
      allowNull: true
    },
    date_mise_a_jour: {
      type: DataTypes.DATE,
      allowNull: false
    }
  }, {
    tableName: 'suivi_module',
    timestamps: false,
    indexes: [
      {
        unique: true,
        fields: ['user_id', 'module_id']
      }
    ]
  });

  SuiviModule.associate = function(models) {
    SuiviModule.belongsTo(models.User, { foreignKey: 'user_id', as: 'user' });
    SuiviModule.belongsTo(models.Module, { foreignKey: 'module_id', as: 'module' });
    SuiviModule.belongsTo(models.StatusSuivi, { foreignKey: 'status_id', as: 'status' });
  };

  return SuiviModule;
}; 