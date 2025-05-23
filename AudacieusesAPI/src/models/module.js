'use strict';

module.exports = (sequelize, DataTypes) => {  const Module = sequelize.define('Module', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    titre: {
      type: DataTypes.STRING(50),
      allowNull: false
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true
    },    niveau: {
      type: DataTypes.STRING,
      allowNull: true,
      validate: {
        isIn: {
          args: [['Débutant', 'Intermédiaire', 'Avancé']],
          msg: 'Le niveau doit être l\'un des suivants: Débutant, Intermédiaire, Avancé'
        }
      }
    },
    duree: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    image_url: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    objectifs: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    statut: {
      type: DataTypes.STRING,
      defaultValue: 'brouillon',
      validate: {
        isIn: {
          args: [['brouillon', 'publié', 'archivé']],
          msg: 'Le statut doit être l\'un des suivants: brouillon, publié, archivé'
        }
      }
    },date_creation: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    },
    updated_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    },
    created_by: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id'
      }
    }
  }, {
    tableName: 'modules',
    timestamps: false
  });

  Module.associate = function(models) {
    // Un module peut contenir plusieurs séances
    // Utiliser le même modèle de jointure que dans seance.js
    const ModuleSeance = sequelize.models.ModuleSeance || sequelize.define('ModuleSeance', {
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

    Module.belongsToMany(models.Seance, {
      through: ModuleSeance,
      foreignKey: 'module_id',
      otherKey: 'seance_id',
      as: 'seances'
    });
    
    // Un module peut être attribué à plusieurs utilisateurs
    const ModulesUsers = sequelize.models.ModulesUsers || sequelize.define('ModulesUsers', {
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
      user_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id'
        },
        field: 'user_id'
      },
      date_affectation: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
        field: 'date_affectation'
      }
    }, {
      tableName: 'modules_users',
      timestamps: true,
      createdAt: 'created_at',
      updatedAt: 'updated_at'
    });
    
    Module.belongsToMany(models.User, {
      through: ModulesUsers,
      foreignKey: 'module_id',
      otherKey: 'user_id',
      as: 'users'
    });

    // Un module est créé par un utilisateur
    Module.belongsTo(models.User, {
      foreignKey: 'created_by',
      as: 'creator'
    });
  };

  return Module;
};