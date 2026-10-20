// Petit client pour l'API du serveur Node
const CLE_JETON = 'ovolina_jeton';

export const jeton = {
  lire: () => {
    try { return localStorage.getItem(CLE_JETON); } catch { return null; }
  },
  ecrire: (t) => {
    try { t ? localStorage.setItem(CLE_JETON, t) : localStorage.removeItem(CLE_JETON); } catch { /* navigation privée */ }
  }
};

export class ErreurApi extends Error {
  constructor(message, status, details) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

async function appel(methode, url, corps) {
  const headers = {};
  const t = jeton.lire();
  if (t) headers.Authorization = `Bearer ${t}`;

  let body;
  if (corps instanceof FormData) body = corps;
  else if (corps !== undefined) {
    headers['Content-Type'] = 'application/json';
    body = JSON.stringify(corps);
  }

  const res = await fetch(url, { method: methode, headers, body });
  if (res.status === 204) return null;
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    if (res.status === 401 && url.startsWith('/api/admin')) {
      jeton.ecrire(null);
      window.dispatchEvent(new Event('ovolina:deconnexion'));
    }
    throw new ErreurApi(data.error || 'Une erreur est survenue', res.status, data.erreurs);
  }
  return data;
}

export const api = {
  get: (url) => appel('GET', url),
  post: (url, corps) => appel('POST', url, corps),
  put: (url, corps) => appel('PUT', url, corps),
  patch: (url, corps) => appel('PATCH', url, corps),
  del: (url) => appel('DELETE', url)
};

// Découpe un texte "une valeur par ligne"
export const lignes = (texte) => String(texte || '').split('\n').map((l) => l.trim()).filter(Boolean);
