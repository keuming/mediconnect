import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const PAYS = ['🇨🇮 Côte d\'Ivoire','🇸🇳 Sénégal','🇧🇫 Burkina Faso','🇬🇭 Ghana','🇲🇱 Mali','🇹🇬 Togo','🇧🇯 Bénin','🇬🇳 Guinée'];

const SERVICES = [
  { icon: '📅', title: 'RDV en ligne', desc: 'Prenez rendez-vous 24h/24 dans les cliniques et hôpitaux partenaires, sans file d\'attente.' },
  { icon: '🩺', title: 'Choix du médecin', desc: 'Sélectionnez votre spécialiste selon sa disponibilité, son tarif et les avis patients.' },
  { icon: '🛡️', title: 'Tiers-payant', desc: 'Bénéficiez de la prise en charge directe de votre assurance santé sans avance de frais.' },
  { icon: '💊', title: 'Ordonnances digitales', desc: 'Recevez et transmettez vos ordonnances électroniquement aux pharmacies partenaires.' },
  { icon: '🛵', title: 'Livraison médicaments', desc: 'Faites livrer vos médicaments à domicile en moins de 2 heures dans votre ville.' },
  { icon: '📋', title: 'Dossier médical', desc: 'Accédez à tout votre historique médical depuis n\'importe quel appareil via votre code secret.' },
  { icon: '🔔', title: 'Rappels automatiques', desc: 'Recevez des rappels SMS et notifications pour ne jamais manquer un rendez-vous.' },
  { icon: '📊', title: 'Suivi de santé', desc: 'Consultations, analyses, prescriptions — tout votre parcours de santé centralisé.' },
];

const STATS = [
  { v: '200+', l: 'Établissements partenaires' },
  { v: '8', l: 'Pays d\'Afrique de l\'Ouest' },
  { v: '50k+', l: 'Patients utilisateurs' },
  { v: '98%', l: 'Taux de satisfaction' },
];

const SPECIALITES = ['Cardiologie','Pédiatrie','Gynécologie','Dermatologie','Neurologie','Médecine générale','Ophtalmologie','ORL','Orthopédie','Psychiatrie','Radiologie','Chirurgie'];

export default function Home() {
  const nav = useNavigate();
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 60);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <div style={{ background: '#060C12', minHeight: '100vh' }}>

      {/* ── NAV ──────────────────────────────────────────────────── */}
      <nav style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
        background: scrolled ? 'rgba(6,12,18,.95)' : 'transparent',
        backdropFilter: scrolled ? 'blur(20px)' : 'none',
        borderBottom: scrolled ? '1px solid rgba(255,255,255,.06)' : 'none',
        transition: 'all .3s ease',
        padding: '0 5%',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        height: 70,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 38, height: 38, background: 'linear-gradient(135deg,#0A8F58,#0D9488)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, color: '#fff', fontSize: 20 }}>+</div>
          <span style={{ fontWeight: 800, fontSize: 18, color: '#F0F4F8', fontFamily: "'DM Serif Display', serif" }}>
            Medi<span style={{ color: '#0A8F58' }}>Connect</span>
          </span>
        </div>

        {/* Desktop nav */}
        <div style={{ display: 'flex', gap: 32, alignItems: 'center' }}>
          {[['Services', '#services'], ['Cliniques', '#cliniques'], ['Comment ça marche', '#comment']].map(([l, h]) => (
            <a key={l} href={h} style={{ color: '#8BA0B5', textDecoration: 'none', fontSize: 14, fontWeight: 500, transition: 'color .15s' }}
              onMouseOver={e => e.target.style.color = '#F0F4F8'} onMouseOut={e => e.target.style.color = '#8BA0B5'}>{l}</a>
          ))}
          <button onClick={() => nav('/rdv')} style={{ background: 'linear-gradient(135deg,#0A8F58,#0D9488)', color: '#fff', border: 'none', borderRadius: 10, padding: '10px 24px', fontSize: 14, fontWeight: 700, cursor: 'pointer', transition: 'opacity .15s' }}
            onMouseOver={e => e.currentTarget.style.opacity = '.85'} onMouseOut={e => e.currentTarget.style.opacity = '1'}>
            Prendre RDV →
          </button>
        </div>
      </nav>

      {/* ── HERO ─────────────────────────────────────────────────── */}
      <section style={{
        minHeight: '100vh', display: 'flex', alignItems: 'center',
        background: 'radial-gradient(ellipse 80% 60% at 50% 0%, rgba(10,143,88,.15) 0%, transparent 70%), radial-gradient(ellipse 60% 40% at 80% 50%, rgba(13,148,136,.08) 0%, transparent 60%), #060C12',
        padding: '120px 5% 80px',
        position: 'relative', overflow: 'hidden',
      }}>
        {/* Decorative circles */}
        <div style={{ position: 'absolute', top: '15%', right: '5%', width: 400, height: 400, borderRadius: '50%', border: '1px solid rgba(10,143,88,.1)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', top: '20%', right: '8%', width: 280, height: 280, borderRadius: '50%', border: '1px solid rgba(10,143,88,.08)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', top: '28%', right: '13%', width: 160, height: 160, borderRadius: '50%', background: 'rgba(10,143,88,.05)', pointerEvents: 'none' }} />

        <div style={{ maxWidth: 1100, margin: '0 auto', width: '100%' }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 60, alignItems: 'center' }}>
            {/* Left */}
            <div style={{ flex: 1, minWidth: 300 }}>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(10,143,88,.1)', border: '1px solid rgba(10,143,88,.25)', borderRadius: 20, padding: '6px 16px', fontSize: 13, color: '#0A8F58', fontWeight: 600, marginBottom: 24 }}>
                <span style={{ width: 6, height: 6, background: '#0A8F58', borderRadius: '50%', animation: 'pulse 2s infinite' }} />
                Disponible 24h/24 — 7j/7
              </div>
              <h1 style={{ fontFamily: "'DM Serif Display', serif", fontSize: 'clamp(40px, 6vw, 68px)', fontWeight: 400, lineHeight: 1.1, marginBottom: 20, color: '#F0F4F8' }}>
                Votre santé,<br />
                <span style={{ color: '#0A8F58', fontStyle: 'italic' }}>simplifiée</span><br />
                en Afrique
              </h1>
              <p style={{ fontSize: 18, color: '#8BA0B5', lineHeight: 1.7, marginBottom: 36, maxWidth: 480 }}>
                Prenez rendez-vous en ligne dans plus de 200 établissements de soins en Afrique de l'Ouest. Rapide, gratuit, sans fil d'attente.
              </p>
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 40 }}>
                <button onClick={() => nav('/rdv')} style={{ background: 'linear-gradient(135deg,#0A8F58,#0D9488)', color: '#fff', border: 'none', borderRadius: 12, padding: '16px 32px', fontSize: 16, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, transition: 'transform .15s, box-shadow .15s', boxShadow: '0 8px 32px rgba(10,143,88,.3)' }}
                  onMouseOver={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 12px 40px rgba(10,143,88,.4)'; }}
                  onMouseOut={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 8px 32px rgba(10,143,88,.3)'; }}>
                  📅 Prendre un RDV <span style={{ fontSize: 18 }}>→</span>
                </button>
                <a href="#services" style={{ background: 'rgba(255,255,255,.06)', color: '#F0F4F8', border: '1px solid rgba(255,255,255,.1)', borderRadius: 12, padding: '16px 28px', fontSize: 15, fontWeight: 600, cursor: 'pointer', textDecoration: 'none', transition: 'background .15s' }}
                  onMouseOver={e => e.currentTarget.style.background = 'rgba(255,255,255,.1)'}
                  onMouseOut={e => e.currentTarget.style.background = 'rgba(255,255,255,.06)'}>
                  Découvrir →
                </a>
              </div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {PAYS.map(p => (
                  <span key={p} style={{ background: 'rgba(255,255,255,.04)', border: '1px solid rgba(255,255,255,.08)', borderRadius: 20, padding: '4px 12px', fontSize: 12, color: '#8BA0B5' }}>{p}</span>
                ))}
              </div>
            </div>

            {/* Right — Quick RDV Card */}
            <div style={{ flex: '0 0 360px', minWidth: 300 }}>
              <div style={{ background: 'rgba(14,22,32,.8)', border: '1px solid rgba(255,255,255,.08)', borderRadius: 20, padding: 28, backdropFilter: 'blur(20px)', boxShadow: '0 32px 80px rgba(0,0,0,.4)' }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#0A8F58', textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 20 }}>Réservation rapide</div>
                <div style={{ marginBottom: 14 }}>
                  <label style={{ display: 'block', fontSize: 11, color: '#4E657A', marginBottom: 6, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.5px' }}>Spécialité</label>
                  <select style={{ width: '100%', background: '#1A2535', border: '1px solid #1E2F42', borderRadius: 10, padding: '12px', color: '#F0F4F8', fontSize: 14, outline: 'none' }}>
                    <option value="">Sélectionner une spécialité…</option>
                    {SPECIALITES.map(s => <option key={s}>{s}</option>)}
                  </select>
                </div>
                <div style={{ marginBottom: 14 }}>
                  <label style={{ display: 'block', fontSize: 11, color: '#4E657A', marginBottom: 6, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.5px' }}>Ville</label>
                  <select style={{ width: '100%', background: '#1A2535', border: '1px solid #1E2F42', borderRadius: 10, padding: '12px', color: '#F0F4F8', fontSize: 14, outline: 'none' }}>
                    <option>Abidjan</option><option>Dakar</option><option>Ouagadougou</option>
                    <option>Accra</option><option>Bamako</option><option>Lomé</option>
                    <option>Cotonou</option><option>Conakry</option>
                  </select>
                </div>
                <div style={{ marginBottom: 20 }}>
                  <label style={{ display: 'block', fontSize: 11, color: '#4E657A', marginBottom: 6, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.5px' }}>Date souhaitée</label>
                  <input type="date" min={new Date().toISOString().split('T')[0]}
                    style={{ width: '100%', background: '#1A2535', border: '1px solid #1E2F42', borderRadius: 10, padding: '12px', color: '#F0F4F8', fontSize: 14, outline: 'none' }} />
                </div>
                <button onClick={() => nav('/rdv')} style={{ width: '100%', background: 'linear-gradient(135deg,#0A8F58,#0D9488)', color: '#fff', border: 'none', borderRadius: 12, padding: '14px', fontSize: 15, fontWeight: 700, cursor: 'pointer', transition: 'opacity .15s' }}
                  onMouseOver={e => e.currentTarget.style.opacity = '.85'} onMouseOut={e => e.currentTarget.style.opacity = '1'}>
                  Rechercher des disponibilités →
                </button>
                <div style={{ display: 'flex', justifyContent: 'center', gap: 16, marginTop: 16, fontSize: 11, color: '#4E657A' }}>
                  <span>✓ Gratuit</span><span>✓ Sans inscription</span><span>✓ Confirmé en 60s</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </nav>

      {/* ── STATS ────────────────────────────────────────────────── */}
      <section style={{ background: 'rgba(10,143,88,.04)', borderTop: '1px solid rgba(10,143,88,.1)', borderBottom: '1px solid rgba(10,143,88,.1)', padding: '40px 5%' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 20 }}>
          {STATS.map(s => (
            <div key={s.l} style={{ textAlign: 'center' }}>
              <div style={{ fontFamily: "'DM Serif Display', serif", fontSize: 42, fontWeight: 400, color: '#0A8F58', marginBottom: 6 }}>{s.v}</div>
              <div style={{ fontSize: 13, color: '#8BA0B5', fontWeight: 500 }}>{s.l}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── SERVICES ─────────────────────────────────────────────── */}
      <section id="services" style={{ padding: '100px 5%' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 60 }}>
            <div style={{ display: 'inline-block', background: 'rgba(10,143,88,.1)', border: '1px solid rgba(10,143,88,.2)', borderRadius: 20, padding: '6px 16px', fontSize: 12, color: '#0A8F58', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 16 }}>Nos services</div>
            <h2 style={{ fontFamily: "'DM Serif Display', serif", fontSize: 'clamp(32px, 5vw, 48px)', color: '#F0F4F8', fontWeight: 400, marginBottom: 16 }}>
              Tout pour votre <span style={{ color: '#0A8F58', fontStyle: 'italic' }}>santé en ligne</span>
            </h2>
            <p style={{ fontSize: 16, color: '#8BA0B5', maxWidth: 500, margin: '0 auto', lineHeight: 1.7 }}>
              MediConnect réunit tous les services de santé numérique pour vous accompagner de la prise de RDV à la livraison de vos médicaments.
            </p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: 20 }}>
            {SERVICES.map((s, i) => (
              <div key={i} style={{ background: 'rgba(14,22,32,.6)', border: '1px solid rgba(255,255,255,.06)', borderRadius: 16, padding: 24, transition: 'border-color .2s, transform .2s, box-shadow .2s', cursor: 'default' }}
                onMouseOver={e => { e.currentTarget.style.borderColor = 'rgba(10,143,88,.3)'; e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = '0 16px 40px rgba(0,0,0,.3)'; }}
                onMouseOut={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,.06)'; e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = 'none'; }}>
                <div style={{ fontSize: 36, marginBottom: 14 }}>{s.icon}</div>
                <div style={{ fontSize: 15, fontWeight: 700, color: '#F0F4F8', marginBottom: 8 }}>{s.title}</div>
                <div style={{ fontSize: 13, color: '#8BA0B5', lineHeight: 1.6 }}>{s.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── COMMENT ÇA MARCHE ────────────────────────────────────── */}
      <section id="comment" style={{ padding: '100px 5%', background: 'radial-gradient(ellipse 60% 50% at 50% 50%, rgba(10,143,88,.06) 0%, transparent 70%)' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 60 }}>
            <div style={{ display: 'inline-block', background: 'rgba(10,143,88,.1)', border: '1px solid rgba(10,143,88,.2)', borderRadius: 20, padding: '6px 16px', fontSize: 12, color: '#0A8F58', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 16 }}>Simple & rapide</div>
            <h2 style={{ fontFamily: "'DM Serif Display', serif", fontSize: 'clamp(32px, 5vw, 48px)', color: '#F0F4F8', fontWeight: 400 }}>
              Comment ça <span style={{ color: '#0A8F58', fontStyle: 'italic' }}>marche ?</span>
            </h2>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 32, position: 'relative' }}>
            {[
              { n: '01', icon: '🏥', t: 'Choisissez votre établissement', d: 'Sélectionnez parmi 200+ cliniques et hôpitaux partenaires près de chez vous.' },
              { n: '02', icon: '👨‍⚕️', t: 'Sélectionnez un médecin', d: 'Consultez les disponibilités, spécialités et tarifs de chaque praticien.' },
              { n: '03', icon: '📅', t: 'Choisissez un créneau', d: 'Réservez instantanément le créneau qui vous convient, 24h/24.' },
              { n: '04', icon: '✅', t: 'Confirmation immédiate', d: 'Recevez votre confirmation par SMS et email en moins de 60 secondes.' },
            ].map((s, i) => (
              <div key={i} style={{ position: 'relative', textAlign: 'center' }}>
                <div style={{ width: 64, height: 64, background: 'rgba(10,143,88,.1)', border: '2px solid rgba(10,143,88,.25)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', fontSize: 28 }}>{s.icon}</div>
                <div style={{ position: 'absolute', top: -8, left: '50%', transform: 'translateX(12px)', background: '#0A8F58', color: '#fff', width: 22, height: 22, borderRadius: '50%', fontSize: 10, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{s.n}</div>
                <div style={{ fontSize: 15, fontWeight: 700, color: '#F0F4F8', marginBottom: 8 }}>{s.t}</div>
                <div style={{ fontSize: 13, color: '#8BA0B5', lineHeight: 1.6 }}>{s.d}</div>
              </div>
            ))}
          </div>
          <div style={{ textAlign: 'center', marginTop: 60 }}>
            <button onClick={() => window.location.href = '/rdv'} style={{ background: 'linear-gradient(135deg,#0A8F58,#0D9488)', color: '#fff', border: 'none', borderRadius: 14, padding: '18px 48px', fontSize: 17, fontWeight: 700, cursor: 'pointer', boxShadow: '0 8px 32px rgba(10,143,88,.35)', transition: 'transform .15s' }}
              onMouseOver={e => e.currentTarget.style.transform = 'translateY(-2px)'} onMouseOut={e => e.currentTarget.style.transform = 'none'}>
              Prendre rendez-vous maintenant →
            </button>
          </div>
        </div>
      </section>

      {/* ── SPÉCIALITÉS ──────────────────────────────────────────── */}
      <section id="cliniques" style={{ padding: '80px 5%', background: 'rgba(14,22,32,.5)' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 48 }}>
            <h2 style={{ fontFamily: "'DM Serif Display', serif", fontSize: 'clamp(28px, 4vw, 40px)', color: '#F0F4F8', fontWeight: 400, marginBottom: 12 }}>
              Toutes les <span style={{ color: '#0A8F58', fontStyle: 'italic' }}>spécialités</span>
            </h2>
            <p style={{ color: '#8BA0B5', fontSize: 15 }}>Trouvez le bon spécialiste selon votre besoin</p>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, justifyContent: 'center' }}>
            {SPECIALITES.map(s => (
              <button key={s} onClick={() => window.location.href = '/rdv'} style={{ background: 'rgba(255,255,255,.05)', border: '1px solid rgba(255,255,255,.08)', borderRadius: 24, padding: '10px 20px', color: '#F0F4F8', fontSize: 14, fontWeight: 500, cursor: 'pointer', transition: 'all .15s' }}
                onMouseOver={e => { e.currentTarget.style.background = 'rgba(10,143,88,.15)'; e.currentTarget.style.borderColor = 'rgba(10,143,88,.4)'; e.currentTarget.style.color = '#0A8F58'; }}
                onMouseOut={e => { e.currentTarget.style.background = 'rgba(255,255,255,.05)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,.08)'; e.currentTarget.style.color = '#F0F4F8'; }}>
                {s}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA FINAL ────────────────────────────────────────────── */}
      <section style={{ padding: '100px 5%', background: 'linear-gradient(135deg, rgba(10,143,88,.12) 0%, rgba(13,148,136,.08) 100%)', borderTop: '1px solid rgba(10,143,88,.15)' }}>
        <div style={{ maxWidth: 700, margin: '0 auto', textAlign: 'center' }}>
          <h2 style={{ fontFamily: "'DM Serif Display', serif", fontSize: 'clamp(32px, 5vw, 52px)', color: '#F0F4F8', fontWeight: 400, marginBottom: 20, lineHeight: 1.2 }}>
            Votre santé ne peut pas<br /><span style={{ color: '#0A8F58', fontStyle: 'italic' }}>attendre</span>
          </h2>
          <p style={{ fontSize: 17, color: '#8BA0B5', marginBottom: 40, lineHeight: 1.7 }}>
            Rejoignez 50 000+ patients qui prennent soin de leur santé avec MediConnect.
          </p>
          <div style={{ display: 'flex', gap: 14, justifyContent: 'center', flexWrap: 'wrap' }}>
            <button onClick={() => window.location.href = '/rdv'} style={{ background: 'linear-gradient(135deg,#0A8F58,#0D9488)', color: '#fff', border: 'none', borderRadius: 14, padding: '18px 40px', fontSize: 16, fontWeight: 700, cursor: 'pointer', boxShadow: '0 8px 32px rgba(10,143,88,.4)' }}>
              📅 Prendre un RDV gratuitement
            </button>
            <a href="https://mediconnect-m9xf.vercel.app" target="_blank" rel="noreferrer" style={{ background: 'rgba(255,255,255,.06)', color: '#F0F4F8', border: '1px solid rgba(255,255,255,.1)', borderRadius: 14, padding: '18px 32px', fontSize: 15, fontWeight: 600, textDecoration: 'none', display: 'inline-block' }}>
              Espace professionnel →
            </a>
          </div>
        </div>
      </section>

      {/* ── FOOTER ───────────────────────────────────────────────── */}
      <footer style={{ background: '#060C12', borderTop: '1px solid rgba(255,255,255,.06)', padding: '48px 5% 32px' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 40, marginBottom: 40 }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                <div style={{ width: 32, height: 32, background: '#0A8F58', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, color: '#fff', fontSize: 16 }}>+</div>
                <span style={{ fontFamily: "'DM Serif Display', serif", fontSize: 16, color: '#F0F4F8' }}>MediConnect</span>
              </div>
              <p style={{ fontSize: 13, color: '#4E657A', lineHeight: 1.7 }}>La santé numérique pour l'Afrique de l'Ouest.</p>
            </div>
            {[
              { t: 'Services', l: ['Prise de RDV', 'Ordonnances', 'Livraison médicaments', 'Dossier médical'] },
              { t: 'Pour les pros', l: ['Espace clinique', 'Espace pharmacie', 'Espace assureur', 'API partenaires'] },
              { t: 'Pays', l: ["Côte d'Ivoire", 'Sénégal', 'Burkina Faso', 'Ghana', 'Mali'] },
            ].map(col => (
              <div key={col.t}>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#F0F4F8', textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 14 }}>{col.t}</div>
                {col.l.map(l => <div key={l} style={{ fontSize: 13, color: '#4E657A', marginBottom: 8, cursor: 'pointer' }} onMouseOver={e => e.target.style.color = '#8BA0B5'} onMouseOut={e => e.target.style.color = '#4E657A'}>{l}</div>)}
              </div>
            ))}
          </div>
          <div style={{ borderTop: '1px solid rgba(255,255,255,.06)', paddingTop: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
            <div style={{ fontSize: 13, color: '#4E657A' }}>© 2026 MediConnect. Tous droits réservés.</div>
            <div style={{ fontSize: 13, color: '#4E657A' }}>rdv.mediconnect4africa.cloud</div>
          </div>
        </div>
      </footer>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: .7; transform: scale(1.2); }
        }
        @media (max-width: 768px) {
          nav > div:last-child a { display: none; }
        }
      `}</style>
    </div>
  );
}
