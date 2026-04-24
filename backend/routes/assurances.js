const router = require('express').Router();
const { query } = require('../config/db');
const { auth, authorize } = require('../middleware/auth');
const { v4: uuid } = require('uuid');

// GET /api/assurances
router.get('/', auth, async (req, res) => {
  try {
    res.json({ success: true, data: [], message: 'Route assurances — à implémenter selon vos besoins' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

module.exports = router;
