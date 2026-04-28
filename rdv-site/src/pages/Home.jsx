import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const PAYS = ["🇨🇮 Côte d'Ivoire","🇸🇳 Sénégal","🇧🇫 Burkina Faso","🇬🇭 Ghana","🇲🇱 Mali","🇹🇬 Togo","🇧🇯 Bénin","🇬🇳 Guinée"];
const SPECIALITES = ["Cardiologie","Pédiatrie","Gynécologie","Dermatologie","Neurologie","Médecine générale","Ophtalmologie","ORL","Orthopédie","Psychiatrie","Radiologie","Chirurgie"];
const VILLES = ["Abidjan","Dakar","Ouagadougou","Accra","Bamako","Lomé","Cotonou","Conakry"];
const STATS = [{ v:"200+",l:"Établissements"},{v:"8",l:"Pays couverts"},{v:"50k+",l:"Patients"},{v:"98%",l:"Satisfaction"}];
const SERVICES = [
  {icon:"📅",t:"RDV en ligne",d:"Prenez rendez-vous 24h/24 dans les cliniques partenaires sans attente."},
  {icon:"🩺",t:"Choix du médecin",d:"Choisissez votre spécialiste selon disponibilité, tarif et avis patients."},
  {icon:"🛡️",t:"Tiers-payant",d:"Prise en charge directe de votre assurance santé sans avance de frais."},
  {icon:"💊",t:"Ordonnances",d:"Recevez et transmettez vos ordonnances électroniquement aux pharmacies."},
  {icon:"🛵",t:"Livraison médicaments",d:"Faites livrer vos médicaments à domicile en moins de 2 heures."},
  {icon:"📋",t:"Dossier médical",d:"Historique complet via votre code secret depuis n'importe quel appareil."},
  {icon:"🔔",t:"Rappels automatiques",d:"Rappels SMS et notifications pour ne jamais manquer un rendez-vous."},
  {icon:"📊",t:"Suivi de santé",d:"Consultations, analyses, prescriptions — tout centralisé en un endroit."},
];
const STEPS = [
  {n:"01",icon:"🏥",t:"Choisissez l'établissement",d:"Filtrez parmi 200+ cliniques et hôpitaux partenaires par ville et spécialité."},
  {n:"02",icon:"👨‍⚕️",t:"Sélectionnez un médecin",d:"Consultez disponibilités, spécialités et tarifs de chaque praticien."},
  {n:"03",icon:"📅",t:"Réservez un créneau",d:"Choisissez instantanément le créneau disponible qui vous convient."},
  {n:"04",icon:"✅",t:"Confirmation immédiate",d:"Recevez votre confirmation par SMS en moins de 60 secondes."},
];

const V = {
  green:"#0A8F58",teal:"#0D9488",bg:"#060C12",card:"#0E1620",
  input:"#141E2B",hover:"#1A2535",border:"#1E2F42",
  text:"#F0F4F8",muted:"#8BA0B5",dim:"#4E657A",
};

const btn = (extra={}) => ({ display:"inline-flex",alignItems:"center",gap:8,background:`linear-gradient(135deg,${V.green},${V.teal})`,color:"#fff",border:"none",borderRadius:12,padding:"14px 32px",fontSize:15,fontWeight:700,cursor:"pointer",fontFamily:"inherit",boxShadow:`0 6px 24px rgba(10,143,88,.35)`,transition:"all .2s",...extra });

export default function Home() {
  const nav = useNavigate();
  const [scrolled, setScrolled] = useState(false);
  const [spec, setSpec] = useState(""); const [ville, setVille] = useState("Abidjan");
  useEffect(() => { const fn = () => setScrolled(window.scrollY > 60); window.addEventListener("scroll",fn); return () => window.removeEventListener("scroll",fn); },[]);
  const goRDV = () => nav("/rdv");

  const inputStyle = { width:"100%",background:V.input,border:`1.5px solid ${V.border}`,borderRadius:10,padding:"12px 14px",color:V.text,fontSize:14,outline:"none",fontFamily:"inherit",appearance:"none" };
  const labelStyle = { display:"block",fontSize:11,fontWeight:700,color:V.muted,textTransform:"uppercase",letterSpacing:".5px",marginBottom:6 };

  return (
    <div style={{background:V.bg,minHeight:"100vh",fontFamily:"'Plus Jakarta Sans', sans-serif"}}>

      {/* NAV */}
      <nav style={{position:"fixed",top:0,left:0,right:0,zIndex:100,padding:"0 5%",height:68,display:"flex",alignItems:"center",justifyContent:"space-between",transition:"all .3s",...(scrolled?{background:"rgba(6,12,18,.93)",backdropFilter:"blur(24px)",borderBottom:`1px solid rgba(255,255,255,.06)`,boxShadow:"0 4px 24px rgba(0,0,0,.3)"}:{})}}>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <div style={{width:40,height:40,background:`linear-gradient(135deg,${V.green},${V.teal})`,borderRadius:12,display:"flex",alignItems:"center",justifyContent:"center",fontSize:22,fontWeight:900,color:"#fff",boxShadow:`0 4px 14px rgba(10,143,88,.4)`}}>+</div>
          <span style={{fontFamily:"'DM Serif Display', serif",fontSize:20,color:V.text}}>Medi<span style={{color:V.green}}>Connect</span>
            <span style={{fontSize:11,background:"rgba(10,143,88,.12)",color:V.green,border:"1px solid rgba(10,143,88,.3)",borderRadius:6,padding:"2px 8px",marginLeft:8,fontFamily:"sans-serif",fontWeight:700,verticalAlign:"middle"}}>RDV</span>
          </span>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:24}}>
          {[["Services","#services"],["Comment","#comment"],["Spécialités","#cliniques"]].map(([l,h]) => (
            <a key={l} href={h} style={{color:V.muted,textDecoration:"none",fontSize:13,fontWeight:500}} onMouseOver={e=>e.target.style.color=V.text} onMouseOut={e=>e.target.style.color=V.muted}>{l}</a>
          ))}
          <button onClick={goRDV} style={btn({padding:"10px 22px",fontSize:14})}>📅 Prendre RDV</button>
        </div>
      </nav>

      {/* HERO */}
      <section style={{minHeight:"100vh",display:"flex",alignItems:"center",padding:"100px 5% 80px",position:"relative",overflow:"hidden",
        background:`radial-gradient(ellipse 80% 60% at 50% -10%,rgba(10,143,88,.18) 0%,transparent 65%), radial-gradient(ellipse 50% 40% at 85% 50%,rgba(13,148,136,.1) 0%,transparent 55%),${V.bg}`}}>
        {/* Grid */}
        <div style={{position:"absolute",inset:0,pointerEvents:"none",backgroundImage:"radial-gradient(rgba(10,143,88,.1) 1px,transparent 1px)",backgroundSize:"40px 40px",maskImage:"radial-gradient(ellipse 70% 70% at 50% 50%,black 30%,transparent 80%)",WebkitMaskImage:"radial-gradient(ellipse 70% 70% at 50% 50%,black 30%,transparent 80%)"}} />
        {/* Rings */}
        {[380,260,140].map((s,i) => <div key={i} style={{position:"absolute",top:`${15+i*8}%`,right:`${4+i*6}%`,width:s,height:s,borderRadius:"50%",border:`1px solid rgba(10,143,88,${.12-i*.03})`,pointerEvents:"none",animation:`float ${4+i}s ease-in-out infinite`,animationDelay:`${i*.5}s`}} />)}

        <div style={{maxWidth:1200,margin:"0 auto",width:"100%",position:"relative",zIndex:1}}>
          <div style={{display:"flex",gap:56,alignItems:"center",flexWrap:"wrap"}}>

            {/* Left */}
            <div style={{flex:1,minWidth:300,animation:"fadeUp .6s ease forwards"}}>
              <div style={{display:"inline-flex",alignItems:"center",gap:8,marginBottom:24,background:"rgba(10,143,88,.08)",border:"1px solid rgba(10,143,88,.2)",borderRadius:24,padding:"7px 18px",fontSize:13,color:V.green,fontWeight:600}}>
                <span style={{width:7,height:7,background:V.green,borderRadius:"50%",animation:"pulse 2s infinite"}} />
                Disponible 24h/24 — 7j/7
              </div>
              <h1 style={{fontFamily:"'DM Serif Display',serif",fontSize:"clamp(38px,5.5vw,68px)",marginBottom:18,color:V.text,lineHeight:1.1}}>
                La santé numérique<br />
                <span style={{background:`linear-gradient(135deg,${V.green},${V.teal})`,WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",backgroundClip:"text",fontStyle:"italic"}}>pour l'Afrique</span>
              </h1>
              <p style={{fontSize:17,color:V.muted,lineHeight:1.75,marginBottom:36,maxWidth:480}}>
                Prenez rendez-vous en ligne dans plus de <strong style={{color:V.text}}>200 établissements</strong> de soins. Rapide, gratuit, sans file d'attente.
              </p>
              <div style={{display:"flex",gap:14,flexWrap:"wrap",marginBottom:40}}>
                <button onClick={goRDV} style={btn({fontSize:16,padding:"15px 36px"})} onMouseOver={e=>{e.currentTarget.style.transform="translateY(-2px)";e.currentTarget.style.boxShadow="0 10px 32px rgba(10,143,88,.45)";}} onMouseOut={e=>{e.currentTarget.style.transform="none";e.currentTarget.style.boxShadow="0 6px 24px rgba(10,143,88,.35)";}}>📅 Prendre un RDV →</button>
                <a href="#services" style={{display:"inline-flex",alignItems:"center",gap:8,background:"rgba(255,255,255,.05)",color:V.text,border:"1px solid rgba(255,255,255,.08)",borderRadius:12,padding:"14px 26px",fontSize:14,fontWeight:600,cursor:"pointer",textDecoration:"none"}}>Découvrir →</a>
              </div>
              <div style={{display:"flex",flexWrap:"wrap",gap:8}}>
                {PAYS.map(p => <span key={p} style={{background:"rgba(255,255,255,.04)",border:"1px solid rgba(255,255,255,.07)",borderRadius:20,padding:"4px 12px",fontSize:12,color:V.muted}}>{p}</span>)}
              </div>
            </div>

            {/* Right — Card */}
            <div style={{flex:"0 0 370px",minWidth:300,animation:"fadeUp .7s ease .1s both"}}>
              <div style={{background:"rgba(14,22,32,.8)",backdropFilter:"blur(24px)",border:"1px solid rgba(255,255,255,.07)",borderRadius:24,padding:30,boxShadow:"0 32px 80px rgba(0,0,0,.5)"}}>
                <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:22}}>
                  <div style={{width:38,height:38,background:`linear-gradient(135deg,${V.green},${V.teal})`,borderRadius:10,display:"flex",alignItems:"center",justifyContent:"center",fontSize:18}}>📅</div>
                  <div><div style={{fontSize:14,fontWeight:700,color:V.text}}>Réservation rapide</div><div style={{fontSize:12,color:V.dim}}>Trouvez un créneau maintenant</div></div>
                </div>
                {[["Spécialité",SPECIALITES,spec,setSpec,false],["Ville",VILLES,ville,setVille,true]].map(([lbl,opts,val,setVal,required]) => (
                  <div key={lbl} style={{marginBottom:14}}>
                    <label style={labelStyle}>{lbl}</label>
                    <select value={val} onChange={e=>setVal(e.target.value)} style={{...inputStyle,cursor:"pointer"}}>
                      {!required && <option value="">Toutes les spécialités</option>}
                      {opts.map(o=><option key={o}>{o}</option>)}
                    </select>
                  </div>
                ))}
                <div style={{marginBottom:22}}>
                  <label style={labelStyle}>Date souhaitée</label>
                  <input type="date" min={new Date().toISOString().split("T")[0]} style={inputStyle} onFocus={e=>e.target.style.borderColor=V.green} onBlur={e=>e.target.style.borderColor=V.border} />
                </div>
                <button onClick={goRDV} style={{...btn({width:"100%",justifyContent:"center",padding:"13px"})}}>Voir les disponibilités →</button>
                <div style={{display:"flex",justifyContent:"center",gap:16,marginTop:14,fontSize:11,color:V.dim}}>
                  {["Gratuit","Sans inscription","Confirmé en 60s"].map(t=><span key={t}><span style={{color:V.green,fontWeight:700}}>✓</span> {t}</span>)}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* STATS */}
      <section style={{borderTop:`1px solid rgba(10,143,88,.12)`,borderBottom:`1px solid rgba(10,143,88,.12)`,background:"rgba(10,143,88,.03)",padding:"44px 5%"}}>
        <div style={{maxWidth:1200,margin:"0 auto",display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:20}}>
          {STATS.map(s => (
            <div key={s.l} style={{textAlign:"center"}}>
              <div style={{fontFamily:"'DM Serif Display',serif",fontSize:46,fontWeight:400,background:`linear-gradient(135deg,${V.green},${V.teal})`,WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",backgroundClip:"text",marginBottom:6}}>{s.v}</div>
              <div style={{fontSize:14,color:V.muted,fontWeight:500}}>{s.l}</div>
            </div>
          ))}
        </div>
      </section>

      {/* SERVICES */}
      <section id="services" style={{padding:"100px 5%"}}>
        <div style={{maxWidth:1200,margin:"0 auto"}}>
          <div style={{textAlign:"center",marginBottom:64}}>
            <div style={{display:"inline-block",background:"rgba(10,143,88,.08)",border:"1px solid rgba(10,143,88,.2)",borderRadius:20,padding:"5px 16px",fontSize:12,color:V.green,fontWeight:700,textTransform:"uppercase",letterSpacing:".5px",marginBottom:14}}>Nos services</div>
            <h2 style={{fontFamily:"'DM Serif Display',serif",fontSize:"clamp(28px,4vw,48px)",color:V.text,marginBottom:14}}>
              Tout pour votre <span style={{color:V.green,fontStyle:"italic"}}>santé digitale</span>
            </h2>
            <p style={{fontSize:16,color:V.muted,maxWidth:520,margin:"0 auto",lineHeight:1.7}}>MediConnect réunit tous les services de santé numérique pour vous accompagner.</p>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(250px,1fr))",gap:18}}>
            {SERVICES.map((s,i) => (
              <div key={i} style={{background:"rgba(14,22,32,.9)",border:"1px solid rgba(255,255,255,.06)",borderRadius:18,padding:24,transition:"all .2s",cursor:"default"}}
                onMouseOver={e=>{e.currentTarget.style.borderColor="rgba(10,143,88,.3)";e.currentTarget.style.transform="translateY(-4px)";e.currentTarget.style.boxShadow="0 16px 40px rgba(0,0,0,.4)";}}
                onMouseOut={e=>{e.currentTarget.style.borderColor="rgba(255,255,255,.06)";e.currentTarget.style.transform="none";e.currentTarget.style.boxShadow="none";}}>
                <div style={{width:50,height:50,background:"rgba(10,143,88,.1)",border:"1px solid rgba(10,143,88,.2)",borderRadius:14,display:"flex",alignItems:"center",justifyContent:"center",fontSize:24,marginBottom:16}}>{s.icon}</div>
                <div style={{fontSize:15,fontWeight:700,color:V.text,marginBottom:8}}>{s.t}</div>
                <div style={{fontSize:13,color:V.muted,lineHeight:1.65}}>{s.d}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* COMMENT ÇA MARCHE */}
      <section id="comment" style={{padding:"100px 5%",background:`radial-gradient(ellipse 60% 50% at 50% 50%,rgba(10,143,88,.07) 0%,transparent 70%),${V.bg}`}}>
        <div style={{maxWidth:1200,margin:"0 auto"}}>
          <div style={{textAlign:"center",marginBottom:64}}>
            <div style={{display:"inline-block",background:"rgba(10,143,88,.08)",border:"1px solid rgba(10,143,88,.2)",borderRadius:20,padding:"5px 16px",fontSize:12,color:V.green,fontWeight:700,textTransform:"uppercase",letterSpacing:".5px",marginBottom:14}}>Simple & rapide</div>
            <h2 style={{fontFamily:"'DM Serif Display',serif",fontSize:"clamp(28px,4vw,48px)",color:V.text}}>Comment ça <span style={{color:V.green,fontStyle:"italic"}}>marche ?</span></h2>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(220px,1fr))",gap:32}}>
            {STEPS.map((s,i) => (
              <div key={i} style={{textAlign:"center",position:"relative"}}>
                <div style={{position:"relative",display:"inline-block",marginBottom:16}}>
                  <div style={{width:68,height:68,background:"rgba(10,143,88,.08)",border:"2px solid rgba(10,143,88,.2)",borderRadius:"50%",display:"flex",alignItems:"center",justifyContent:"center",fontSize:28,margin:"0 auto",transition:"all .3s"}}
                    onMouseOver={e=>{e.currentTarget.style.background="rgba(10,143,88,.15)";e.currentTarget.style.boxShadow="0 0 20px rgba(10,143,88,.3)";}}
                    onMouseOut={e=>{e.currentTarget.style.background="rgba(10,143,88,.08)";e.currentTarget.style.boxShadow="none";}}>
                    {s.icon}
                  </div>
                  <div style={{position:"absolute",top:-4,right:-4,width:24,height:24,background:`linear-gradient(135deg,${V.green},${V.teal})`,borderRadius:"50%",display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,fontWeight:800,color:"#fff"}}>{i+1}</div>
                </div>
                <div style={{fontSize:15,fontWeight:700,color:V.text,marginBottom:8}}>{s.t}</div>
                <div style={{fontSize:13,color:V.muted,lineHeight:1.65}}>{s.d}</div>
              </div>
            ))}
          </div>
          <div style={{textAlign:"center",marginTop:60}}>
            <button onClick={goRDV} style={btn({fontSize:17,padding:"17px 48px"})} onMouseOver={e=>e.currentTarget.style.transform="translateY(-2px)"} onMouseOut={e=>e.currentTarget.style.transform="none"}>Prendre rendez-vous maintenant →</button>
          </div>
        </div>
      </section>

      {/* SPÉCIALITÉS */}
      <section id="cliniques" style={{padding:"80px 5%",background:"rgba(14,22,32,.5)",borderTop:"1px solid rgba(255,255,255,.04)"}}>
        <div style={{maxWidth:1200,margin:"0 auto"}}>
          <div style={{textAlign:"center",marginBottom:44}}>
            <h2 style={{fontFamily:"'DM Serif Display',serif",fontSize:"clamp(26px,3.5vw,40px)",color:V.text,marginBottom:10}}>Toutes les <span style={{color:V.green,fontStyle:"italic"}}>spécialités</span></h2>
            <p style={{color:V.muted,fontSize:14}}>Cliquez pour réserver avec ce spécialiste</p>
          </div>
          <div style={{display:"flex",flexWrap:"wrap",gap:10,justifyContent:"center"}}>
            {SPECIALITES.map(s => (
              <button key={s} onClick={goRDV} style={{background:"rgba(255,255,255,.04)",border:"1px solid rgba(255,255,255,.07)",borderRadius:24,padding:"10px 20px",color:V.text,fontSize:13,fontWeight:500,cursor:"pointer",transition:"all .2s",fontFamily:"inherit"}}
                onMouseOver={e=>{e.currentTarget.style.background="rgba(10,143,88,.12)";e.currentTarget.style.borderColor="rgba(10,143,88,.4)";e.currentTarget.style.color=V.green;e.currentTarget.style.transform="translateY(-2px)";}}
                onMouseOut={e=>{e.currentTarget.style.background="rgba(255,255,255,.04)";e.currentTarget.style.borderColor="rgba(255,255,255,.07)";e.currentTarget.style.color=V.text;e.currentTarget.style.transform="none";}}>
                {s}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section style={{padding:"110px 5%",background:`radial-gradient(ellipse 70% 60% at 50% 50%,rgba(10,143,88,.1) 0%,transparent 70%),${V.bg}`,borderTop:"1px solid rgba(10,143,88,.12)",textAlign:"center"}}>
        <div style={{maxWidth:700,margin:"0 auto"}}>
          <h2 style={{fontFamily:"'DM Serif Display',serif",fontSize:"clamp(32px,5vw,54px)",color:V.text,marginBottom:16,lineHeight:1.15}}>
            Votre santé ne peut pas <span style={{color:V.green,fontStyle:"italic"}}>attendre</span>
          </h2>
          <p style={{fontSize:17,color:V.muted,marginBottom:42,lineHeight:1.7}}>Rejoignez des milliers de patients qui gèrent leur santé en ligne avec MediConnect.</p>
          <div style={{display:"flex",gap:16,justifyContent:"center",flexWrap:"wrap"}}>
            <button onClick={goRDV} style={btn({fontSize:16,padding:"17px 44px"})}>📅 Prendre un RDV gratuitement</button>
            <a href="https://mediconnect-m9xf.vercel.app" target="_blank" rel="noreferrer" style={{display:"inline-flex",alignItems:"center",background:"rgba(255,255,255,.05)",color:V.text,border:"1px solid rgba(255,255,255,.08)",borderRadius:12,padding:"16px 32px",fontSize:15,fontWeight:600,textDecoration:"none"}}>Espace pro →</a>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer style={{background:"rgba(4,8,14,.9)",borderTop:"1px solid rgba(255,255,255,.05)",padding:"56px 5% 36px"}}>
        <div style={{maxWidth:1200,margin:"0 auto"}}>
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(170px,1fr))",gap:40,marginBottom:44}}>
            <div>
              <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:14}}>
                <div style={{width:32,height:32,background:`linear-gradient(135deg,${V.green},${V.teal})`,borderRadius:8,display:"flex",alignItems:"center",justifyContent:"center",fontWeight:800,color:"#fff",fontSize:16}}>+</div>
                <span style={{fontFamily:"'DM Serif Display',serif",fontSize:16,color:V.text}}>MediConnect</span>
              </div>
              <p style={{fontSize:13,color:V.dim,lineHeight:1.75}}>La santé numérique<br/>pour l'Afrique de l'Ouest.</p>
            </div>
            {[{t:"Services",l:["Prise de RDV","Ordonnances","Livraison médicaments","Dossier médical"]},{t:"Pour les pros",l:["Espace clinique","Espace pharmacie","Espace assureur","API partenaires"]},{t:"Pays",l:["Côte d'Ivoire","Sénégal","Burkina Faso","Ghana","Mali"]}].map(col => (
              <div key={col.t}>
                <div style={{fontSize:11,fontWeight:800,color:V.text,textTransform:"uppercase",letterSpacing:"1px",marginBottom:14}}>{col.t}</div>
                {col.l.map(l => <div key={l} style={{fontSize:13,color:V.dim,marginBottom:9,cursor:"pointer"}} onMouseOver={e=>e.currentTarget.style.color=V.muted} onMouseOut={e=>e.currentTarget.style.color=V.dim}>{l}</div>)}
              </div>
            ))}
          </div>
          <div style={{borderTop:"1px solid rgba(255,255,255,.05)",paddingTop:24,display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:10}}>
            <div style={{fontSize:13,color:V.dim}}>© 2026 MediConnect. Tous droits réservés.</div>
            <div style={{fontSize:12,color:V.dim}}>rdv.mediconnect4africa.cloud</div>
          </div>
        </div>
      </footer>

      <style>{`
        @keyframes fadeUp { from{opacity:0;transform:translateY(20px)} to{opacity:1;transform:translateY(0)} }
        @keyframes pulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:.6;transform:scale(1.3)} }
        @keyframes float { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-8px)} }
        @media (max-width: 768px) { nav > div:last-child a { display: none; } }
      `}</style>
    </div>
  );
}
