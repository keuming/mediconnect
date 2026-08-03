const BACKEND = 'https://mediconnect-backend-v2.vercel.app';

function getHeaders() {
  try {
    const raw = localStorage.getItem('mediconnect-auth');
    const token = raw ? JSON.parse(raw)?.state?.token : null;
    return { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) };
  } catch { return { 'Content-Type': 'application/json' }; }
}

// BUG CRITIQUE CORRIGE : aucune methode ne verifiait r.ok. Une erreur HTTP
// (409, 400, 500...) passait comme une reussite tant que le corps etait du
// JSON valide -> useMutation appelait TOUJOURS onSuccess, jamais onError,
// meme quand le serveur refusait la requete. Symptome observe : toast de
// succes affiche partout dans l'app, mais l'element jamais cree en base.
// handleResponse rejette desormais la promesse sur tout statut non-2xx,
// avec le message du serveur si present, pour que .catch()/onError
// fonctionnent enfin comme attendu par le reste du code.
async function handleResponse(r) {
  let body;
  try { body = await r.json(); } catch { body = null; }
  if (!r.ok) {
    const err = new Error(body?.message || `Erreur HTTP ${r.status}`);
    err.status = r.status;
    err.response = { data: body };
    throw err;
  }
  return body;
}

const api = {
  get:    (url, cfg={})  => {
    let fullUrl = `${BACKEND}/api${url}`;
    if (cfg?.params) {
      const q = new URLSearchParams(Object.entries(cfg.params).filter(([,v])=>v!=null)).toString();
      if (q) fullUrl += '?' + q;
    }
    return fetch(fullUrl, { method:'GET', headers:getHeaders() }).then(handleResponse);
  },
  post:   (url, data)    => fetch(`${BACKEND}/api${url}`, { method:'POST',   headers:getHeaders(), body:JSON.stringify(data) }).then(handleResponse),
  put:    (url, data)    => fetch(`${BACKEND}/api${url}`, { method:'PUT',    headers:getHeaders(), body:JSON.stringify(data) }).then(handleResponse),
  delete: (url)          => fetch(`${BACKEND}/api${url}`, { method:'DELETE', headers:getHeaders() }).then(handleResponse),
  patch:  (url, data)    => fetch(`${BACKEND}/api${url}`, { method:'PATCH',  headers:getHeaders(), body:JSON.stringify(data) }).then(handleResponse),
};

export default api;
