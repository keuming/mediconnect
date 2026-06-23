const BACKEND = 'https://mediconnect-backend-v2.vercel.app';

function getHeaders() {
  try {
    const raw = localStorage.getItem('mediconnect-auth');
    const token = raw ? JSON.parse(raw)?.state?.token : null;
    return { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) };
  } catch { return { 'Content-Type': 'application/json' }; }
}

const api = {
  get:    (url, cfg={})  => {
    let fullUrl = `${BACKEND}/api${url}`;
    if (cfg?.params) {
      const q = new URLSearchParams(Object.entries(cfg.params).filter(([,v])=>v!=null)).toString();
      if (q) fullUrl += '?' + q;
    }
    return fetch(fullUrl, { method:'GET', headers:getHeaders() }).then(r => r.json());
  },
  post:   (url, data)    => fetch(`${BACKEND}/api${url}`, { method:'POST',   headers:getHeaders(), body:JSON.stringify(data) }).then(r => r.json()),
  put:    (url, data)    => fetch(`${BACKEND}/api${url}`, { method:'PUT',    headers:getHeaders(), body:JSON.stringify(data) }).then(r => r.json()),
  delete: (url)          => fetch(`${BACKEND}/api${url}`, { method:'DELETE', headers:getHeaders() }).then(r => r.json()),
  patch:  (url, data)    => fetch(`${BACKEND}/api${url}`, { method:'PATCH',  headers:getHeaders(), body:JSON.stringify(data) }).then(r => r.json()),
};

export default api;
