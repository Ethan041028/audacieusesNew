const jwt = require('jsonwebtoken');
require('dotenv').config();

// Secret pour signer les tokens JWT - S'assurer qu'il y a toujours une valeur
let JWT_SECRET = process.env.JWT_SECRET || 'audacieuses_secret_key_very_secure_and_long';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';
const JWT_REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || '7d';

// Journaliser l'état du secret (uniquement en développement)
if (process.env.NODE_ENV !== 'production') {
  console.log('JWT_SECRET est défini:', !!JWT_SECRET);
  // S'assurer que la valeur n'est pas vide
  if (!JWT_SECRET || JWT_SECRET.trim() === '') {
    console.error('ERREUR CRITIQUE: JWT_SECRET est vide!');
    // Utiliser une valeur par défaut en cas d'erreur
    JWT_SECRET = 'audacieuses_secure_fallback_key';
  }
}

// Générer un token JWT
const generateToken = (user) => {
  if (!JWT_SECRET || JWT_SECRET.trim() === '') {
    throw new Error('JWT_SECRET doit avoir une valeur valide');
  }
  return jwt.sign(
    { 
      id: user.id,
      role: user.role.nom
    },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
};

// Générer un token de rafraîchissement
const generateRefreshToken = (userId) => {
  if (!JWT_SECRET || JWT_SECRET.trim() === '') {
    throw new Error('JWT_SECRET doit avoir une valeur valide');
  }
  return jwt.sign(
    { id: userId },
    JWT_SECRET,
    { expiresIn: JWT_REFRESH_EXPIRES_IN }
  );
};

// Vérifier un token JWT
const verifyToken = (token) => {
  try {
    if (!JWT_SECRET || JWT_SECRET.trim() === '') {
      throw new Error('JWT_SECRET doit avoir une valeur valide');
    }
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    console.error('Erreur de vérification du token:', error.message);
    return null;
  }
};

module.exports = {
  JWT_SECRET,
  JWT_EXPIRES_IN,
  JWT_REFRESH_EXPIRES_IN,
  generateToken,
  generateRefreshToken,
  verifyToken
};