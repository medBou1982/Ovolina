import { useEffect, useState } from 'react';
import { api } from '../api.js';
import { useRechargerSite } from '../SiteContext.jsx';
import Outils from './Outils.jsx';

const RESEAUX = [
  { cle: 'facebook', nom: 'Facebook', exemple: 'https://www.facebook.com/ovolina' },
  { cle: 'instagram', nom: 'Instagram', exemple: 'https://www.instagram.com/ovolina' },
  { cle: 'linkedin', nom: 'LinkedIn', exemple: 'https://www.linkedin.com/company/ovolina' },
  { cle: 'youtube', nom: 'YouTube', exemple: 'https://www.youtube.com/@ovolina' }
];

let compteurCle = 0;
const cle = () => `n${++compteurCle}`; // identifiant local pour les lignes ajoutées

export default function AdminSite() {
  const recharger = useRechargerSite();
  const [form, setForm] = useState(null);
  const [modifie, setModifie] = useState(false);
  const [etat, setEtat] = useState({ envoi: false, ok: false, erreur: null });

  useEffect(() => {
    api.get('/api/site')
      .then((s) => setForm({
        email: s.email, telephone: s.telephone,
        reseaux: { ...s.reseaux },
        sites: s.sites.map((x) => ({ ...x, cle: `s${x.id}` })),
        chiffres: s.chiffres.map((x) => ({ ...x, cle: `c${x.id}` }))
      }))
      .catch((err) => setEtat({ envoi: false, ok: false, erreur: err.message }));
  }, []);

  // Prévient avant de quitter la page avec des changements non enregistrés
  useEffect(() => {
    if (!modifie) return;
    const avertir = (e) => { e.preventDefault(); e.returnValue = ''; };
    window.addEventListener('beforeunload', avertir);
    return () => window.removeEventListener('beforeunload', avertir);
  }, [modifie]);

  function maj(fn) {
    setForm((f) => fn(structuredClone(f)));
    setModifie(true);
    setEtat((e) => ({ ...e, ok: false }));
  }

  const champ = (nom) => ({ value: form[nom] ?? '', onChange: (e) => { const v = e.target.value; maj((f) => { f[nom] = v; return f; }); } });
  const champListe = (liste, i, nom) => ({ value: form[liste][i][nom] ?? '', onChange: (e) => { const v = e.target.value; maj((f) => { f[liste][i][nom] = v; return f; }); } });
  const bouger = (liste) => (i, sens) => maj((f) => { const l = f[liste]; [l[i], l[i + sens]] = [l[i + sens], l[i]]; return f; });
  const supprimer = (liste) => (i) => maj((f) => { f[liste].splice(i, 1); return f; });

  async function enregistrer(e) {
    e.preventDefault();
    setEtat({ envoi: true, ok: false, erreur: null });
    try {
      const s = await api.put('/api/admin/site', form);
      setForm({
        email: s.email, telephone: s.telephone, reseaux: { ...s.reseaux },
        sites: s.sites.map((x) => ({ ...x, cle: `s${x.id}` })),
        chiffres: s.chiffres.map((x) => ({ ...x, cle: `c${x.id}` }))
      });
      setModifie(false);
      setEtat({ envoi: false, ok: true, erreur: null });
      recharger(); // le site public affiche aussitôt les nouvelles infos
    } catch (err) {
      setEtat({ envoi: false, ok: false, erreur: err.message });
    }
  }

  if (!form) return etat.erreur ? <p className="alerte alerte-erreur">{etat.erreur}</p> : <p className="chargement">Chargement…</p>;

  return (
    <>
      <div className="admin-titre">
        <div>
          <h1>Infos du site</h1>
          <span className="sous">Coordonnées, réseaux sociaux, sites et chiffres affichés sur le site public</span>
        </div>
      </div>

      <form className="form-site" onSubmit={enregistrer}>
        <section className="carte-blanche bloc-site">
          <h2>Coordonnées</h2>
          <p className="aide-bloc">Affichées dans le pied de page, la page Contact et la page d’accueil.</p>
          <div className="ligne-champs">
            <label className="champ">Email<input type="email" {...champ('email')} /></label>
            <label className="champ">Téléphone<input type="tel" placeholder="+216 …" {...champ('telephone')} /></label>
          </div>
        </section>

        <section className="carte-blanche bloc-site">
          <h2>Réseaux sociaux</h2>
          <p className="aide-bloc">Collez l’adresse complète de chaque page. Une icône n’apparaît que si son adresse est remplie.</p>
          <div className="grille-reseaux">
            {RESEAUX.map((r) => (
              <label className="champ" key={r.cle}>{r.nom}
                <input
                  type="url"
                  placeholder={r.exemple}
                  value={form.reseaux[r.cle] || ''}
                  onChange={(e) => { const v = e.target.value; maj((f) => { f.reseaux[r.cle] = v; return f; }); }}
                />
              </label>
            ))}
          </div>
        </section>

        <section className="carte-blanche bloc-site">
          <h2>Nos sites</h2>
          <p className="aide-bloc">Les adresses de vos sites, dans l’ordre d’affichage.</p>
          <div className="liste-edit">
            {form.sites.map((s, i) => (
              <div className="ligne-edit ligne-site" key={s.cle}>
                <label className="champ">Ville<input type="text" required {...champListe('sites', i, 'ville')} /></label>
                <label className="champ">Adresse<input type="text" {...champListe('sites', i, 'adresse')} /></label>
                <Outils index={i} total={form.sites.length} nom={s.ville || 'ce site'} onBouger={bouger('sites')} onSupprimer={supprimer('sites')} />
              </div>
            ))}
            {form.sites.length === 0 && <p className="vide" style={{ padding: 16 }}>Aucun site.</p>}
          </div>
          <button type="button" className="btn btn-contour ajout" onClick={() => maj((f) => { f.sites.push({ ville: '', adresse: '', cle: cle() }); return f; })}>
            + Ajouter un site
          </button>
        </section>

        <section className="carte-blanche bloc-site">
          <h2>Chiffres clés</h2>
          <p className="aide-bloc">Les cartes « Ovolina en chiffres » de la page d’accueil. Le détail facultatif s’affiche en écriture manuscrite rouge.</p>
          <div className="liste-edit">
            {form.chiffres.map((c, i) => (
              <div className="ligne-edit ligne-chiffre" key={c.cle}>
                <label className="champ">Nombre<input type="number" min={0} required {...champListe('chiffres', i, 'valeur')} /></label>
                <label className="champ">Après<input type="text" maxLength={5} placeholder="+" {...champListe('chiffres', i, 'suffixe')} /></label>
                <label className="champ">Libellé<input type="text" required {...champListe('chiffres', i, 'label')} /></label>
                <label className="champ">Détail<input type="text" placeholder="facultatif" {...champListe('chiffres', i, 'detail')} /></label>
                <Outils index={i} total={form.chiffres.length} nom={c.label || 'ce chiffre'} onBouger={bouger('chiffres')} onSupprimer={supprimer('chiffres')} />
              </div>
            ))}
            {form.chiffres.length === 0 && <p className="vide" style={{ padding: 16 }}>Aucun chiffre : la section sera masquée.</p>}
          </div>
          {form.chiffres.length < 12 && (
            <button type="button" className="btn btn-contour ajout" onClick={() => maj((f) => { f.chiffres.push({ valeur: '', suffixe: '+', label: '', detail: '', cle: cle() }); return f; })}>
              + Ajouter un chiffre
            </button>
          )}
        </section>

        <div className="barre-enregistrer">
          {etat.erreur && <span className="alerte alerte-erreur" role="alert">{etat.erreur}</span>}
          {etat.ok && <span className="alerte alerte-ok" role="status">Enregistré : le site est à jour.</span>}
          {modifie && !etat.erreur && <span className="non-enregistre">Modifications non enregistrées</span>}
          <button type="submit" className="btn btn-jaune" disabled={etat.envoi || !modifie}>{etat.envoi ? 'Enregistrement…' : 'Enregistrer'}</button>
        </div>
      </form>
    </>
  );
}
