// Extrait l'identifiant d'une vidéo YouTube depuis n'importe quel lien courant.
// Renvoie : '' si vide, l'identifiant (11 caractères) si reconnu, null si le texte n'est pas une vidéo YouTube.
const ID = /^[A-Za-z0-9_-]{11}$/;

export function idYoutube(saisie) {
  const t = String(saisie ?? '').trim();
  if (!t) return '';
  if (ID.test(t)) return t;
  let url;
  try { url = new URL(/^https?:\/\//i.test(t) ? t : `https://${t}`); } catch { return null; }
  const hote = url.hostname.replace(/^(www\.|m\.|music\.)/, '');
  let id = null;
  if (hote === 'youtu.be') id = url.pathname.slice(1).split('/')[0];
  else if (hote === 'youtube.com' || hote === 'youtube-nocookie.com') {
    if (url.pathname === '/watch') id = url.searchParams.get('v');
    else {
      const m = url.pathname.match(/^\/(embed|shorts|live|v)\/([^/?#]+)/);
      if (m) id = m[2];
    }
  }
  return id && ID.test(id) ? id : null;
}
