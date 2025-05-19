'use strict';
const bcrypt = require('bcrypt');

module.exports = (sequelize, DataTypes) => {
  const User = sequelize.define('User', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    nom: {
      type: DataTypes.STRING(100),
      allowNull: false
    },
    prenom: {
      type: DataTypes.STRING(100),
      allowNull: false
    },
    mail: {
      type: DataTypes.STRING(50),
      allowNull: false,
      unique: true,
      validate: {
        isEmail: true
      }
    },
    mdp: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    date_naissance: {
      type: DataTypes.DATE,
      allowNull: true
    },
    role_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'roles',
        key: 'id'
      },
      field: 'role_id',
      onDelete: 'NO ACTION',
      onUpdate: 'CASCADE'
    },    active: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    }
  }, {
    tableName: 'users',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    hooks: {
      beforeCreate: async (user) => {
        if (user.mdp) {
          user.mdp = await bcrypt.hash(user.mdp, 10);
        }
      },
      beforeUpdate: async (user) => {
        if (user.changed('mdp')) {
          user.mdp = await bcrypt.hash(user.mdp, 10);
        }
      }
    }
  });

  User.associate = function(models) {
    // Un utilisateur appartient à un rôle
    User.belongsTo(models.Role, {
      foreignKey: 'role_id',
      as: 'role',
      onDelete: 'NO ACTION',
      onUpdate: 'CASCADE'
    });
    
    // Un utilisateur peut participer à plusieurs modules
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
    
    User.belongsToMany(models.Module, {
      through: ModulesUsers,
      foreignKey: 'user_id',
      otherKey: 'module_id',
      as: 'modules'
    });
    
    // Un utilisateur peut avoir plusieurs suivis de séances
    User.hasMany(models.Suivi, {
      foreignKey: 'user_id',
      as: 'suivis'
    });
    
    // Un utilisateur peut avoir plusieurs suivis de modules
    User.hasMany(models.SuiviModule, {
      foreignKey: 'user_id',
      as: 'suiviModules'
    });
    
    // Un utilisateur peut avoir plusieurs réponses aux activités
    User.hasMany(models.ReponseClient, {
      foreignKey: 'user_id',
      as: 'reponses'
    });
  };
  
  // Méthode pour vérifier le mot de passe
  User.prototype.verifyPassword = async function(password) {
    // Ajout de logs pour déboguer le problème d'authentification
    console.log(`Comparaison des mots de passe pour ${this.mail}`);
    console.log(`Mot de passe fourni: ${password ? 'Présent' : 'Absent'}`);
    console.log(`Mot de passe stocké: ${this.mdp ? 'Présent (hash)' : 'Absent'}`);
    
    try {
      if (!password || !this.mdp) {
        console.error('Mot de passe fourni ou stocké manquant');
        return false;
      }
      
      // Vérifier si le mot de passe est déjà hashé (commence par $2a$, $2b$ ou $2y$)
      const isHashed = /^\$2[aby]\$\d+\$/.test(this.mdp);
      
      if (!isHashed) {
        console.log('Le mot de passe stocké ne semble pas être hashé avec bcrypt');
        // Si le mot de passe n'est pas hashé, comparer directement (temporairement)
        return password === this.mdp;
      }
      
      // Sinon, utiliser bcrypt pour comparer
      const result = await bcrypt.compare(password, this.mdp);
      console.log(`Résultat de la comparaison bcrypt: ${result}`);
      return result;
    } catch (error) {
      console.error(`Erreur lors de la comparaison des mots de passe: ${error.message}`);
      return false;
    }
  };

  return User;
};