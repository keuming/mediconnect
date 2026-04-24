const jwt = require('jsonwebtoken');
const { query } = require('../config/db');

const auth = async (req, res, next) => {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer '))
    return res.status(401).json({ success: false, message: 'Token manquant' });

  try {
    const token   = header.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const result  = await query('SELECT id, email, role, prenom, nom FROM utilisateurs WHERE id=$1 AND is_active=true', [decoded.id]);
    if (!result.rows.length)
      return res.status(401).json({ success: false, message: 'Utilisateur introuvable ou inactif' });
    req.user = result.rows[0];
    next();
  } catch (err) {
    return res.status(401).json({ success: false, message: 'Token invalide ou expiré' });
  }
};

const authorize = (...roles) => (req, res, next) => {
  if (!roles.includes(req.user.role))
    return res.status(403).json({ success: false, message: 'Accès non autorisé pour ce profil' });
  next();
};

module.exports = { auth, authorize };
