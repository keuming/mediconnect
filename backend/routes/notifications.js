const router = require('express').Router();
const { query } = require('../config/db');
const { auth } = require('../middleware/auth');

// GET /api/notifications
router.get('/', auth, async (req, res) => {
  try {
    const r = await query(
      'SELECT * FROM notifications WHERE user_id=$1 ORDER BY created_at DESC LIMIT 50',
      [req.user.id]
    );
    res.json({ success: true, data: r.rows });
  } catch (e) { res.json({ success: true, data: [] }); }
});

// PUT /api/notifications/lire-tout
router.put('/lire-tout', auth, async (req, res) => {
  try {
    await query('UPDATE notifications SET lu=true WHERE user_id=$1', [req.user.id]);
    res.json({ success: true });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// PUT /api/notifications/:id/lire
router.put('/:id/lire', auth, async (req, res) => {
  try {
    await query('UPDATE notifications SET lu=true WHERE id=$1 AND user_id=$2', [req.params.id, req.user.id]);
    res.json({ success: true });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

module.exports = router;
