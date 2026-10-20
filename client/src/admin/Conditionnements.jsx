import { useEffect, useState } from 'react';
import Recadrage from './Recadrage.jsx';
import { Emballage } from '../components/Elements.jsx';
import Outils from './Outils.jsx';

const LIBELLES = ['Boîte', 'Plateau', 'Étui', 'Sachet', 'Carton', 'Vrac'];
let n = 0;
export const nouvelleCle = () => `nv${++n}`;

// Transforme les conditionnements reçus du serveur en lignes de formulaire
export const versLignes = (variantes = []) => variantes.map((v) => ({ ...v, cle: `v${v.id}`, fichier: null, apercu: null, supprimer_image: false }));

// Ajoute les conditionnements au FormData envoyé au serveur (liste en JSON + une photo par ligne)
export function ajouterAuFormulaire(fd, lignes) {
  const liste = lignes.map((v, i) => {
    if (v.fichier) fd.append(`img_v_${i}`, v.fichier);
    return {
      id: v.id ?? null, libelle: v.libelle, quantite: v.quantite, reference: v.reference, actif: v.actif,
      supprimer_image: v.supprimer_image, fichier: v.fichier ? `img_v_${i}` : null
    };
  });
  fd.append('variantes', JSON.stringify(liste));
}

export default function Conditionnements({ lignes, onChange }) {
  const [aRecadrer, setARecadrer] = useState(null); // { index, source }
  // Libère les aperçus de photos quand on quitte le formulaire
  useEffect(() => () => lignes.forEach((l) => l.apercu && URL.revokeObjectURL(l.apercu)), []); // eslint-disable-line react-hooks/exhaustive-deps

  const maj = (i, champs) => onChange(lignes.map((l, j) => (j === i ? { ...l, ...champs } : l)));
  const bouger = (i, sens) => { const l = [...lignes]; [l[i], l[i + sens]] = [l[i + sens], l[i]]; onChange(l); };
  const supprimer = (i) => onChange(lignes.filter((_, j) => j !== i));
  const ajouter = () => {
    const derniere = lignes[lignes.length - 1];
    onChange([...lignes, { cle: nouvelleCle(), id: null, libelle: derniere?.libelle || 'Boîte', quantite: '', reference: '', actif: true, image: null, fichier: null, apercu: null, supprimer_image: false }]);
  };

  function choisirPhoto(i, e) {
    const f = e.target.files?.[0];
    e.target.value = '';
    if (!f) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(f.type) || f.size > 25 * 1024 * 1024) {
      window.alert('Photo JPG, PNG ou WebP de 25 Mo maximum');
      return;
    }
    setARecadrer({ index: i, source: f });
  }

  function appliquerRecadrage(fichier) {
    const i = aRecadrer.index;
    if (lignes[i]?.apercu) URL.revokeObjectURL(lignes[i].apercu);
    maj(i, { fichier, apercu: URL.createObjectURL(fichier), supprimer_image: false });
    setARecadrer(null);
  }

  return (
    <div className="carte-blanche bloc-conditionnements">
      <h2>Conditionnements</h2>
      <p className="aide-bloc">Les formats dans lesquels ce produit est vendu : boîte de 6, de 12, plateau de 30… Chacun peut avoir sa propre photo.</p>
      <datalist id="libelles-emballage">{LIBELLES.map((l) => <option key={l} value={l} />)}</datalist>

      <div className="liste-edit">
        {lignes.map((v, i) => {
          const photo = v.apercu || (!v.supprimer_image && v.image);
          const nom = `${v.libelle || 'conditionnement'} de ${v.quantite || '?'}`;
          return (
            <div className={`ligne-edit ligne-variante${v.actif ? '' : ' masquee'}`} key={v.cle}>
              <div className="variante-photo">
                <span className="vignette-variante">
                  {photo ? <img src={photo} alt="" /> : <Emballage quantite={Number(v.quantite) || 6} libelle={v.libelle} />}
                </span>
                <label className="lien-photo">
                  {photo ? 'Changer' : 'Photo'}
                  <input type="file" accept="image/jpeg,image/png,image/webp" onChange={(e) => choisirPhoto(i, e)} aria-label={`Photo pour ${nom}`} />
                </label>
                {photo && <button type="button" className="lien-photo" onClick={() => setARecadrer({ index: i, source: photo })}>Recadrer</button>}
                {photo && <button type="button" className="lien-photo retirer" onClick={() => maj(i, { fichier: null, apercu: null, supprimer_image: true })}>Retirer</button>}
              </div>
              <label className="champ">Emballage<input type="text" list="libelles-emballage" required value={v.libelle} onChange={(e) => maj(i, { libelle: e.target.value })} /></label>
              <label className="champ">Nombre d’œufs<input type="number" min={1} max={10000} required value={v.quantite} onChange={(e) => maj(i, { quantite: e.target.value })} /></label>
              <label className="champ">Référence<input type="text" placeholder="facultatif" value={v.reference} onChange={(e) => maj(i, { reference: e.target.value })} /></label>
              <label className="case case-compacte">Visible<input type="checkbox" checked={!!v.actif} onChange={(e) => maj(i, { actif: e.target.checked })} /></label>
              <Outils index={i} total={lignes.length} nom={nom} onBouger={bouger} onSupprimer={supprimer} />
            </div>
          );
        })}
        {lignes.length === 0 && <p className="vide" style={{ padding: 16 }}>Aucun conditionnement pour ce produit.</p>}
      </div>
      {lignes.length < 20 && <button type="button" className="btn btn-contour ajout" onClick={ajouter}>+ Ajouter un conditionnement</button>}
      {aRecadrer && <Recadrage source={aRecadrer.source} formatInitial="1:1" onValider={appliquerRecadrage} onAnnuler={() => setARecadrer(null)} />}
    </div>
  );
}
