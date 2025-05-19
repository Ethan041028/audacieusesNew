'use strict';

module.exports = (sequelize, DataTypes) => {
  const Seance = sequelize.define('Seance', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    titre: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    duree: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    type: {
      type: DataTypes.STRING(50),
      allowNull: true
    },
    contenu: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    ressources: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    created_by: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    active: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    },
    date_creation: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    }
  }, {
    tableName: 'seances',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  });

  Seance.associate = function(models) {
    // Une séance peut faire partie de plusieurs modules
    // Définir explicitement le modèle de jointure pour éviter l'erreur
    const ModuleSeance = sequelize.define('ModuleSeance', {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      module_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: 'modules',
          key: 'id'
        },
        field: 'module_id'
      },
      seance_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: 'seances',
          key: 'id'
        },
        field: 'seance_id'
      },
      positions: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
        field: 'positions'
      }
    }, {
      tableName: 'module_seance',
      timestamps: true,
      createdAt: 'created_at',
      updatedAt: 'updated_at'
    });

    Seance.belongsToMany(models.Module, {
      through: ModuleSeance,
      foreignKey: 'seance_id',
      otherKey: 'module_id',
      as: 'modules'
    });
      
    // Une séance peut contenir plusieurs activités via la table de jointure
    Seance.belongsToMany(models.Activite, {
      through: models.SeanceActivite,
      foreignKey: 'seance_id',
      otherKey: 'activite_id',
      as: 'activites'
    });
    
    // Une séance peut avoir plusieurs suivis (un par utilisateur)
    Seance.hasMany(models.Suivi, {
      foreignKey: 'seance_id',
      as: 'suivis'
    });
  };

  return Seance;
};