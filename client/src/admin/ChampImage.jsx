import { useEffect, useState } from 'react';

// Choix d'une image avec aperçu. onChange(fichier | null, supprimer: bool)
export default function ChampImage({ actuelle, repli, onChange }) {
  const [apercu, setApercu] = useState(null);
  const [supprimee, setSupprimee] = useState(false);
  const [erreur, setErreur] = useState(null);

  useEffect(() => () => { if (apercu) URL.revokeObjectURL(apercu); }, [apercu]);

  function choisir(e) {
    const f = e.target.files?.[0];
    if (!f) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(f.type)) { setErreur('Format accepté : JPG, PNG ou WebP'); return; }
    if (f.size > 3 * 1024 * 1024) { setErreur('Image trop lourde (3 Mo maximum)'); return; }
    setErreur(null);
    setSupprimee(false);
    setApercu(URL.createObjectURL(f));
    onChange(f, false);
  }

  function retirer() {
    setApercu(null);
    setSupprimee(true);
    onChange(null, true);
  }

  const affichee = apercu || (!supprimee && actuelle);

  return (
    <>
      <div className="apercu-image">{affichee ? <img src={affichee} alt="Aperçu" /> : repli}</div>
      <label className="zone-fichier">
        {affichee ? 'Changer l’image' : 'Ajouter une image'}
        <input type="file" accept="image/jpeg,image/png,image/webp" onChange={choisir} />
        <span>JPG, PNG ou WebP, 3 Mo max.</span>
      </label>
      {erreur && <span className="alerte alerte-erreur" role="alert">{erreur}</span>}
      {affichee && <button type="button" className="btn btn-danger" style={{ minHeight: 36, padding: 0, alignSelf: 'flex-start' }} onClick={retirer}>Retirer l’image</button>}
    </>
  );
}
