const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET || 'mediconnect_dev_secret_2024';

const auth = (req, res, next) => {
  const h = req.headers.authorization || '';
  if (!h.startsWith('Bearer '))
    return res.status(401).json({ success: false, message: 'Token manquant' });
  try {
    req.user = jwt.verify(h.slice(7), JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ success: false, message: 'Token invalide' });
  }
};

const can = (...roles) => (req, res, next) => {
  if (!req.user)
    return res.status(401).json({ success: false, message: 'Non authentifié' });
  if (!roles.includes(req.user.role))
    return res.status(403).json({ success: false, message: 'Accès refusé' });
  next();
};

module.exports = { auth, can };
