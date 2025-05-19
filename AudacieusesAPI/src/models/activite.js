'use strict';

module.exports = (sequelize, DataTypes) => {
  const Activite = sequelize.define('Activite', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    contenu: {
      type: DataTypes.TEXT,
      allowNull: false,
      get() {
        const rawValue = this.getDataValue('contenu');
        if (!rawValue) return null;
        
        try {
          // Essayer de parser comme JSON
          const parsedValue = JSON.parse(rawValue);
          
          // Vérifier si c'est un objet de type texte contenant du JSON
          if (parsedValue.type === 'texte' && typeof parsedValue.contenu === 'string') {
            try {
              // Essayer de parser le contenu comme JSON
              const nestedContent = JSON.parse(parsedValue.contenu);
              return nestedContent;
            } catch {
              // Si le contenu n'est pas du JSON valide, retourner l'objet tel quel
              return parsedValue;
            }
          }
          
          return parsedValue;
        } catch (e) {
          // Si ce n'est pas du JSON valide, retourner la valeur brute
          return rawValue;
        }
      },
      set(value) {
        // Si la valeur est un objet, la convertir en JSON
        if (typeof value === 'object') {
          // Vérifier si l'objet a déjà une structure correcte
          if (value.type) {
            // Si la structure est correcte, la stocker directement
            this.setDataValue('contenu', JSON.stringify(value));
          } else {
            // Si l'objet n'a pas de structure, le convertir en format texte
            const textContentObj = {
              type: 'texte',
              contenu: JSON.stringify(value)
            };
            this.setDataValue('contenu', JSON.stringify(textContentObj));
          }
        } else if (typeof value === 'string') {
          try {
            // Tester si c'est du JSON valide
            const parsed = JSON.parse(value);
            // Vérifier si l'objet a déjà une structure correcte
            if (parsed.type) {
              // Si la structure est correcte, la stocker telle quelle
              this.setDataValue('contenu', value);
            } else {
              // Si l'objet n'a pas de structure, le convertir en format texte
              const textContentObj = {
                type: 'texte',
                contenu: value
              };
              this.setDataValue('contenu', JSON.stringify(textContentObj));
            }
          } catch (e) {
            // Si ce n'est pas du JSON valide, le convertir en JSON de type texte
            const textContentObj = {
              type: 'texte',
              contenu: value
            };
            this.setDataValue('contenu', JSON.stringify(textContentObj));
          }
        } else {
          // Pour les autres types (non objet, non chaîne), les convertir en chaîne
          const textContentObj = {
            type: 'texte',
            contenu: String(value)
          };
          this.setDataValue('contenu', JSON.stringify(textContentObj));
        }
      }
    },
    date_creation: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    },
    updated_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    },
    titre: {
      type: DataTypes.STRING,
      allowNull: false
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    type_activite_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'type_activites',
        key: 'id'
      }
    },
    duree: {
      type: DataTypes.INTEGER,
      allowNull: true
    }
  }, {
    tableName: 'activites',
    timestamps: true,
    createdAt: 'date_creation',
    updatedAt: 'updated_at'
  });

  Activite.associate = function(models) {
    // Une activité appartient à un type d'activité
    Activite.belongsTo(models.TypeActivite, {
      foreignKey: 'type_activite_id',
      as: 'typeActivite'
    });
    
    // Une activité peut appartenir à plusieurs séances via la table de jointure
    Activite.belongsToMany(models.Seance, {
      through: models.SeanceActivite,
      foreignKey: 'activite_id',
      otherKey: 'seance_id',
      as: 'seances'
    });
    
    // Une activité peut avoir plusieurs réponses de clients
    Activite.hasMany(models.ReponseClient, {
      foreignKey: 'activite_id',
      as: 'reponses'
    });
  };

  return Activite;
};