const jwt = require('jsonwebtoken');

const auth = (req, res, next) => {
  try {
    const header = req.headers.authorization || '';
    if (!header.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, message: 'Token manquant' });
    }
    const token = header.slice(7);
    const secret = process.env.JWT_SECRET || 'mediconnect_secret_dev';
    const decoded = jwt.verify(token, secret);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ success: false, message: 'Token invalide ou expiré' });
  }
};

const authorize = (...roles) => (req, res, next) => {
  if (!req.user) return res.status(401).json({ success: false, message: 'Non authentifié' });
  if (!roles.includes(req.user.role)) {
    return res.status(403).json({ success: false, message: `Accès refusé — rôle requis : ${roles.join(' ou ')}` });
  }
  next();
};

module.exports = { auth, authorize };
