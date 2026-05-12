const router  = require('express').Router();
const bcrypt  = require('bcryptjs');
const { query } = require('../config/db');
const { auth, can } = require('../middleware/auth');

// GET /api/utilisateurs
router.get('/', auth, can('admin'), async (req, res) => {
  try {
    const r = await query(
      `SELECT id,email,role,prenom,nom,telephone,ville,is_active,created_at
       FROM utilisateurs ORDER BY created_at DESC LIMIT 500`
    );
    res.json({ success: true, data: r.rows });
  } catch (e) { res.json({ success: true, data: [] }); }
});

// PUT /api/utilisateurs/me
router.put('/me', auth, async (req, res) => {
  const { prenom, nom, telephone, ville, quartier, adresse } = req.body;
  try {
    const r = await query(
      `UPDATE utilisateurs
       SET prenom=COALESCE($1,prenom), nom=COALESCE($2,nom),
           telephone=COALESCE($3,telephone), ville=COALESCE($4,ville),
           quartier=COALESCE($5,quartier), adresse=COALESCE($6,adresse),
           updated_at=NOW()
       WHERE id=$7 RETURNING id,email,role,prenom,nom,telephone,ville,quartier,adresse`,
      [prenom, nom, telephone, ville, quartier, adresse, req.user.id]
    );
    res.json({ success: true, data: r.rows[0] });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// PUT /api/utilisateurs/:id — activer/désactiver + infos de base (admin)
router.put('/:id', auth, can('admin'), async (req, res) => {
  const { is_active, prenom, nom, telephone, ville, role } = req.body;
  try {
    const r = await query(
      `UPDATE utilisateurs
       SET is_active=COALESCE($1,is_active),
           prenom=COALESCE($2,prenom), nom=COALESCE($3,nom),
           telephone=COALESCE($4,telephone), ville=COALESCE($5,ville),
           role=COALESCE($6,role), updated_at=NOW()
       WHERE id=$7 RETURNING id,email,role,prenom,nom,telephone,ville,is_active`,
      [is_active, prenom, nom, telephone, ville, role, req.params.id]
    );
    res.json({ success: true, data: r.rows[0] });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// PUT /api/utilisateurs/:id/credentials — modifier email et/ou mot de passe (admin)
router.put('/:id/credentials', auth, can('admin'), async (req, res) => {
  const { email, password } = req.body;
  if (!email && !password)
    return res.status(400).json({ success: false, message: 'Email ou mot de passe requis' });
  try {
    const exists = await query('SELECT id,email FROM utilisateurs WHERE id=$1', [req.params.id]);
    if (!exists.rows.length)
      return res.status(404).json({ success: false, message: 'Utilisateur introuvable' });

    if (email && email !== exists.rows[0].email) {
      const taken = await query('SELECT id FROM utilisateurs WHERE email=$1 AND id!=$2', [email, req.params.id]);
      if (taken.rows.length)
        return res.status(409).json({ success: false, message: 'Cet email est déjà utilisé' });
    }

    const updates = [];
    const params  = [];

    if (email) {
      params.push(email);
      updates.push(`email=$${params.length}`);
    }
    if (password) {
      if (password.length < 6)
        return res.status(400).json({ success: false, message: 'Mot de passe : 6 caractères minimum' });
      params.push(await bcrypt.hash(password, 10));
      updates.push(`password=$${params.length}`);
    }

    params.push(req.params.id);
    const r = await query(
      `UPDATE utilisateurs SET ${updates.join(', ')}, updated_at=NOW()
       WHERE id=$${params.length}
       RETURNING id,email,role,prenom,nom,is_active`,
      params
    );
    res.json({ success: true, message: 'Identifiants mis à jour', data: r.rows[0] });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// DELETE /api/utilisateurs/:id (admin)
router.delete('/:id', auth, can('admin'), async (req, res) => {
  if (req.params.id === req.user.id)
    return res.status(400).json({ success: false, message: 'Impossible de supprimer votre propre compte' });
  try {
    await query('DELETE FROM utilisateurs WHERE id=$1', [req.params.id]);
    res.json({ success: true, message: 'Utilisateur supprimé' });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

module.exports = router;
