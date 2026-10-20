import { useCallback, useEffect, useRef, useState } from 'react';

// Fenêtre de recadrage d'une photo, entièrement dans le navigateur :
// format (carré, 4:3…), zoom, déplacement à la souris ou au doigt, centrage, rotation, taille finale.
// Le résultat est une nouvelle image WebP allégée, prête à être envoyée au serveur.

export const FORMATS = [
  { cle: '1:1', nom: 'Carré', ratio: 1 },
  { cle: '4:3', nom: '4:3', ratio: 4 / 3 },
  { cle: '16:9', nom: '16:9', ratio: 16 / 9 },
  { cle: '3:4', nom: 'Portrait', ratio: 3 / 4 },
  { cle: 'original', nom: 'Original', ratio: null }
];

const TAILLES = [
  { nom: 'Petite', largeur: 800 },
  { nom: 'Moyenne', largeur: 1200 },
  { nom: 'Grande', largeur: 1600 }
];

const LARGEUR_CADRE = 520;

function chargerImage(source) {
  return new Promise((ok, ko) => {
    const img = new Image();
    if (typeof source === 'string' && /^https?:/.test(source) && !source.startsWith(window.location.origin)) img.crossOrigin = 'anonymous';
    img.onload = () => ok(img);
    img.onerror = () => ko(new Error('Impossible de lire cette image'));
    img.src = typeof source === 'string' ? source : URL.createObjectURL(source);
  });
}

export default function Recadrage({ source, formatInitial = '4:3', onValider, onAnnuler }) {
  const toile = useRef(null);
  const [img, setImg] = useState(null);
  const [erreur, setErreur] = useState(null);
  const [format, setFormat] = useState(formatInitial);
  const [rotation, setRotation] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [decalage, setDecalage] = useState({ x: 0, y: 0 });
  const [taille, setTaille] = useState(1200);
  const [envoi, setEnvoi] = useState(false);
  const glisse = useRef(null);

  useEffect(() => {
    let annule = false;
    chargerImage(source).then((i) => !annule && setImg(i)).catch((e) => setErreur(e.message));
    return () => { annule = true; };
  }, [source]);

  // Dimensions de l'image une fois pivotée, et du cadre de recadrage
  const tourne = rotation % 180 !== 0;
  const iw = img ? (tourne ? img.naturalHeight : img.naturalWidth) : 1;
  const ih = img ? (tourne ? img.naturalWidth : img.naturalHeight) : 1;
  const ratio = FORMATS.find((f) => f.cle === format)?.ratio || iw / ih;
  const W = LARGEUR_CADRE;
  const H = Math.round(W / ratio);
  const echelleCouvre = Math.max(W / iw, H / ih);   // l'image remplit tout le cadre
  const echelleEntiere = Math.min(W / iw, H / ih);  // l'image entière est visible
  const zoomMin = echelleEntiere / echelleCouvre;
  const echelle = echelleCouvre * zoom;

  // Empêche l'image de sortir du cadre (ou d'y laisser un vide si elle le remplit)
  const borner = useCallback((d, z = zoom) => {
    const s = echelleCouvre * z;
    const mx = Math.abs(iw * s - W) / 2, my = Math.abs(ih * s - H) / 2;
    return { x: Math.max(-mx, Math.min(mx, d.x)), y: Math.max(-my, Math.min(my, d.y)) };
  }, [echelleCouvre, iw, ih, W, H, zoom]);

  const dessiner = useCallback((ctx, w, h, facteur) => {
    ctx.clearRect(0, 0, w, h);
    ctx.save();
    ctx.translate(w / 2 + decalage.x * facteur, h / 2 + decalage.y * facteur);
    ctx.rotate((rotation * Math.PI) / 180);
    const s = echelle * facteur;
    ctx.scale(s, s);
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(img, -img.naturalWidth / 2, -img.naturalHeight / 2);
    ctx.restore();
  }, [decalage, rotation, echelle, img]);

  useEffect(() => {
    if (!img || !toile.current) return;
    const c = toile.current;
    const dpr = window.devicePixelRatio || 1;
    c.width = W * dpr; c.height = H * dpr;
    dessiner(c.getContext('2d'), W * dpr, H * dpr, dpr);
  }, [img, W, H, dessiner]);

  // Quand le format, la rotation ou le zoom changent, on garde l'image bien placée
  useEffect(() => { setDecalage((d) => borner(d)); }, [format, rotation, zoom, borner]);
  useEffect(() => { setZoom((z) => Math.max(zoomMin, z)); }, [zoomMin]);

  function debut(e) {
    e.currentTarget.setPointerCapture(e.pointerId);
    glisse.current = { x: e.clientX, y: e.clientY, d: decalage };
  }
  function bouge(e) {
    if (!glisse.current) return;
    const r = toile.current.getBoundingClientRect();
    const k = W / r.width; // le cadre peut être affiché plus petit sur téléphone
    setDecalage(borner({ x: glisse.current.d.x + (e.clientX - glisse.current.x) * k, y: glisse.current.d.y + (e.clientY - glisse.current.y) * k }));
  }
  const fin = () => { glisse.current = null; };

  function clavier(e) {
    const pas = e.shiftKey ? 20 : 5;
    const fl = { ArrowLeft: [-pas, 0], ArrowRight: [pas, 0], ArrowUp: [0, -pas], ArrowDown: [0, pas] }[e.key];
    if (fl) { e.preventDefault(); setDecalage((d) => borner({ x: d.x + fl[0], y: d.y + fl[1] })); }
  }

  useEffect(() => {
    const echap = (e) => { if (e.key === 'Escape') onAnnuler(); };
    window.addEventListener('keydown', echap);
    return () => window.removeEventListener('keydown', echap);
  }, [onAnnuler]);

  async function valider() {
    setEnvoi(true);
    // Taille finale : jamais plus grande que ce que la photo d'origine permet (pas d'agrandissement flou)
    const largeurMax = Math.round(W / echelle);
    const lo = Math.max(200, Math.min(taille, largeurMax));
    const ho = Math.round(lo / (W / H));
    const c = document.createElement('canvas');
    c.width = lo; c.height = ho;
    dessiner(c.getContext('2d'), lo, ho, lo / W);
    let final = await new Promise((ok) => c.toBlob(ok, 'image/webp', 0.86));
    if (!final || final.type !== 'image/webp') {
      // Navigateur sans WebP : JPEG sur fond blanc (le JPEG ne gère pas la transparence)
      const ctx = c.getContext('2d');
      ctx.globalCompositeOperation = 'destination-over';
      ctx.fillStyle = '#fff';
      ctx.fillRect(0, 0, lo, ho);
      final = await new Promise((ok) => c.toBlob(ok, 'image/jpeg', 0.88));
    }
    const ext = final.type === 'image/webp' ? 'webp' : 'jpg';
    onValider(new File([final], `photo.${ext}`, { type: final.type }), { largeur: lo, hauteur: ho });
  }

  const pct = Math.round(zoom * 100);
  const largeurFinale = img ? Math.max(200, Math.min(taille, Math.round(W / echelle))) : 0;

  return (
    <div className="recadrage-fond" role="dialog" aria-modal="true" aria-labelledby="titre-recadrage" onMouseDown={(e) => e.target === e.currentTarget && onAnnuler()}>
      <div className="recadrage">
        <div className="recadrage-entete">
          <h2 id="titre-recadrage">Recadrer la photo</h2>
          <button type="button" className="btn-petit btn-icone" aria-label="Fermer" onClick={onAnnuler}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg>
          </button>
        </div>

        {erreur && <p className="alerte alerte-erreur">{erreur}</p>}
        {!img && !erreur && <p className="chargement">Chargement de la photo…</p>}

        {img && (
          <>
            <div className="recadrage-zone">
              <div className="recadrage-cadre" style={{ '--r': W / H }}>
              <canvas
                ref={toile}
                className="recadrage-toile"
                tabIndex={0}
                aria-label="Faites glisser pour déplacer la photo, ou utilisez les flèches du clavier"
                onPointerDown={debut} onPointerMove={bouge} onPointerUp={fin} onPointerCancel={fin}
                onKeyDown={clavier}
                onWheel={(e) => setZoom((z) => Math.min(4, Math.max(zoomMin, z - e.deltaY * 0.0015)))}
              />
              <span className="recadrage-grille" aria-hidden="true" />
              </div>
            </div>
            <p className="aide" style={{ textAlign: 'center', margin: 0 }}>Faites glisser la photo pour la placer, molette ou curseur pour zoomer.</p>

            <div className="recadrage-outils">
              <div className="recadrage-ligne">
                <span className="recadrage-label">Format</span>
                <div className="onglets" role="group" aria-label="Format">
                  {FORMATS.map((f) => (
                    <button key={f.cle} type="button" aria-pressed={format === f.cle} onClick={() => { setFormat(f.cle); setDecalage({ x: 0, y: 0 }); }}>{f.nom}</button>
                  ))}
                </div>
              </div>

              <div className="recadrage-ligne">
                <label className="recadrage-label" htmlFor="zoom-recadrage">Zoom</label>
                <div className="recadrage-zoom">
                  <button type="button" className="btn-petit btn-icone" aria-label="Dézoomer" onClick={() => setZoom((z) => Math.max(zoomMin, +(z - 0.1).toFixed(2)))}>−</button>
                  <input id="zoom-recadrage" type="range" min={zoomMin} max={4} step={0.01} value={zoom} onChange={(e) => setZoom(+e.target.value)} />
                  <button type="button" className="btn-petit btn-icone" aria-label="Zoomer" onClick={() => setZoom((z) => Math.min(4, +(z + 0.1).toFixed(2)))}>+</button>
                  <span className="recadrage-valeur">{pct} %</span>
                </div>
              </div>

              <div className="recadrage-ligne recadrage-boutons">
                <button type="button" className="btn-petit" onClick={() => setDecalage({ x: 0, y: 0 })}>Centrer</button>
                <button type="button" className="btn-petit" onClick={() => { setZoom(1); setDecalage({ x: 0, y: 0 }); }}>Remplir le cadre</button>
                <button type="button" className="btn-petit" onClick={() => { setZoom(zoomMin); setDecalage({ x: 0, y: 0 }); }}>Photo entière</button>
                <button type="button" className="btn-petit" onClick={() => setRotation((r) => (r + 90) % 360)}>Pivoter ↻</button>
              </div>

              <div className="recadrage-ligne">
                <span className="recadrage-label">Taille</span>
                <div className="onglets" role="group" aria-label="Taille finale">
                  {TAILLES.map((t) => (
                    <button key={t.largeur} type="button" aria-pressed={taille === t.largeur} onClick={() => setTaille(t.largeur)}>{t.nom}</button>
                  ))}
                </div>
                <span className="recadrage-valeur">{largeurFinale} × {Math.round(largeurFinale / (W / H))} px{largeurFinale < taille && ' (limitée par la photo d’origine)'}</span>
              </div>
            </div>
          </>
        )}

        <div className="recadrage-actions">
          <button type="button" className="btn btn-contour" onClick={onAnnuler}>Annuler</button>
          <button type="button" className="btn btn-jaune" disabled={!img || envoi} onClick={valider}>{envoi ? 'Préparation…' : 'Appliquer'}</button>
        </div>
      </div>
    </div>
  );
}
