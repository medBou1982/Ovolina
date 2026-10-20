import { useEffect, useState } from 'react';
import Recadrage from './Recadrage.jsx';

const TYPES = ['image/jpeg', 'image/png', 'image/webp'];

// Choix d'une photo avec recadrage. onChange(fichier | null, supprimer: bool)
// format : format proposé par défaut dans la fenêtre de recadrage ('1:1', '4:3', '16:9', '3:4', 'original')
export default function ChampImage({ actuelle, repli, onChange, format = '4:3' }) {
  const [apercu, setApercu] = useState(null);
  const [supprimee, setSupprimee] = useState(false);
  const [erreur, setErreur] = useState(null);
  const [aRecadrer, setARecadrer] = useState(null); // fichier ou adresse de l'image à recadrer
  const [infos, setInfos] = useState(null);

  useEffect(() => () => { if (apercu) URL.revokeObjectURL(apercu); }, [apercu]);

  function choisir(e) {
    const f = e.target.files?.[0];
    e.target.value = '';
    if (!f) return;
    if (!TYPES.includes(f.type)) { setErreur('Format accepté : JPG, PNG ou WebP'); return; }
    if (f.size > 25 * 1024 * 1024) { setErreur('Photo trop lourde (25 Mo maximum avant recadrage)'); return; }
    setErreur(null);
    setARecadrer(f);
  }

  function appliquer(fichier, dims) {
    if (apercu) URL.revokeObjectURL(apercu);
    setApercu(URL.createObjectURL(fichier));
    setSupprimee(false);
    setInfos({ ...dims, poids: fichier.size });
    setARecadrer(null);
    onChange(fichier, false);
  }

  function retirer() {
    setApercu(null);
    setSupprimee(true);
    setInfos(null);
    onChange(null, true);
  }

  const affichee = apercu || (!supprimee && actuelle);

  return (
    <>
      <div className="apercu-image">{affichee ? <img src={affichee} alt="Aperçu" /> : repli}</div>
      {infos && <span className="aide">Photo prête : {infos.largeur} × {infos.hauteur} px, {Math.max(1, Math.round(infos.poids / 1024))} Ko</span>}
      <label className="zone-fichier">
        {affichee ? 'Changer l’image' : 'Ajouter une image'}
        <input type="file" accept="image/jpeg,image/png,image/webp" onChange={choisir} />
        <span>JPG, PNG ou WebP. Vous pourrez la recadrer juste après.</span>
      </label>
      {erreur && <span className="alerte alerte-erreur" role="alert">{erreur}</span>}
      {affichee && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 14 }}>
          <button type="button" className="btn-petit" onClick={() => setARecadrer(affichee)}>Recadrer / centrer</button>
          <button type="button" className="btn btn-danger" style={{ minHeight: 36, padding: 0 }} onClick={retirer}>Retirer l’image</button>
        </div>
      )}
      {aRecadrer && (
        <Recadrage source={aRecadrer} formatInitial={format} onValider={appliquer} onAnnuler={() => setARecadrer(null)} />
      )}
    </>
  );
}
