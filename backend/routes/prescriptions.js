const router = require('express').Router();
const { v4: uuid } = require('uuid');
const { query } = require('../config/db');
const { auth } = require('../middleware/auth');

// GET /api/prescriptions
router.get('/', auth, async (req, res) => {
  try {
    const { consultation_id } = req.query;
    const r = consultation_id
      ? await query('SELECT * FROM prescriptions WHERE consultation_id=$1 ORDER BY created_at', [consultation_id])
      : await query('SELECT * FROM prescriptions ORDER BY created_at DESC LIMIT 100');
    res.json({ success: true, data: r.rows });
  } catch (e) { res.json({ success: true, data: [] }); }
});

// POST /api/prescriptions
router.post('/', auth, async (req, res) => {
  const { consultation_id, type, label, urgent, note } = req.body;
  if (!consultation_id || !type || !label)
    return res.status(400).json({ success: false, message: 'consultation_id, type et label requis' });
  try {
    const r = await query(
      'INSERT INTO prescriptions (id,consultation_id,type,label,urgent,note) VALUES ($1,$2,$3,$4,$5,$6) RETURNING *',
      [uuid(), consultation_id, type, label, urgent || false, note || null]
    );
    res.status(201).json({ success: true, data: r.rows[0] });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

module.exports = router;
