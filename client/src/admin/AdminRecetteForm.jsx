import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api } from '../api.js';
import ChampImage from './ChampImage.jsx';
import { idYoutube } from './youtube.js';

const VIDE = {
  titre: '', slug: '', categorie: 'Plats', resume: '', temps_preparation: '', personnes: '', difficulte: 'Facile',
  ingredients: '', etapes: '', produit_id: '', actif: true, ordre: 0, image: null, video_youtube: ''
};

export default function AdminRecetteForm() {
  const { id } = useParams();
  const nouveau = !id;
  const navigate = useNavigate();
  const [form, setForm] = useState(VIDE);
  const [produits, setProduits] = useState([]);
  const [fichier, setFichier] = useState({ image: null, supprimer: false });
  const [chargement, setChargement] = useState(true);
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState(null);

  useEffect(() => {
    Promise.all([
      api.get('/api/admin/produits'),
      nouveau ? Promise.resolve(null) : api.get(`/api/admin/recettes/${id}`)
    ])
      .then(([ps, r]) => {
        setProduits(ps);
        if (r) setForm({ ...VIDE, ...r, temps_preparation: r.temps_preparation ?? '', personnes: r.personnes ?? '', produit_id: r.produit_id ?? '', video_youtube: r.video_youtube ? `https://youtube.com/shorts/${r.video_youtube}` : '' });
        setChargement(false);
      })
      .catch((err) => { setErreur(err.message); setChargement(false); });
  }, [id, nouveau]);

  const champ = (nom) => ({ name: nom, value: form[nom] ?? '', onChange: (e) => setForm((f) => ({ ...f, [nom]: e.target.value })) });

  async function enregistrer(e) {
    e.preventDefault();
    if (!form.titre.trim()) { setErreur('Le titre est obligatoire'); return; }
    setEnvoi(true);
    setErreur(null);
    const fd = new FormData();
    ['titre', 'slug', 'categorie', 'resume', 'temps_preparation', 'personnes', 'difficulte', 'ingredients', 'etapes', 'produit_id', 'ordre', 'video_youtube']
      .forEach((k) => fd.append(k, form[k] ?? ''));
    fd.append('actif', form.actif ? 'true' : 'false');
    if (fichier.image) fd.append('image', fichier.image);
    if (fichier.supprimer) fd.append('supprimer_image', 'true');
    try {
      if (nouveau) await api.post('/api/admin/recettes', fd);
      else await api.put(`/api/admin/recettes/${id}`, fd);
      navigate('/admin/recettes');
    } catch (err) {
      setErreur(err.message);
      setEnvoi(false);
    }
  }

  async function supprimer() {
    if (!window.confirm(`Supprimer définitivement « ${form.titre} » ?`)) return;
    try {
      await api.del(`/api/admin/recettes/${id}`);
      navigate('/admin/recettes');
    } catch (err) { setErreur(err.message); }
  }

  if (chargement) return <p className="chargement">Chargement…</p>;

  return (
    <>
      <div>
        <nav className="admin-ariane" aria-label="Fil d’Ariane"><Link to="/admin/recettes">Recettes</Link><span aria-hidden="true">/</span><span>{nouveau ? 'Nouvelle' : form.titre}</span></nav>
        <h1 style={{ fontSize: 32, fontWeight: 800 }}>{nouveau ? 'Ajouter une recette' : 'Modifier la recette'}</h1>
      </div>
      {erreur && <p className="alerte alerte-erreur" role="alert">{erreur}</p>}

      <form className="form-admin" onSubmit={enregistrer}>
        <div className="principal carte-blanche">
          <h2>Recette</h2>
          <label className="champ">Titre<input type="text" required {...champ('titre')} /></label>
          <label className="champ">Lien de la page
            <span className="slug"><span>/recettes/</span><input type="text" placeholder="généré à partir du titre" {...champ('slug')} /></span>
          </label>
          <label className="champ">Résumé<textarea rows={2} {...champ('resume')} /></label>
          <div className="ligne-champs">
            <label className="champ">Catégorie
              <select {...champ('categorie')}><option>Entrées</option><option>Plats</option><option>Desserts</option></select>
            </label>
            <label className="champ">Difficulté
              <select {...champ('difficulte')}><option>Facile</option><option>Moyen</option><option>Difficile</option></select>
            </label>
          </div>
          <div className="ligne-champs">
            <label className="champ">Temps (minutes)<input type="number" min={0} {...champ('temps_preparation')} /></label>
            <label className="champ">Personnes<input type="number" min={1} {...champ('personnes')} /></label>
          </div>
          <label className="champ">Ingrédients<textarea rows={6} {...champ('ingredients')} /><span className="aide">Un ingrédient par ligne.</span></label>
          <label className="champ">Étapes de préparation<textarea rows={8} {...champ('etapes')} /><span className="aide">Une étape par ligne, dans l’ordre.</span></label>
        </div>

        <div className="cote">
          <div className="carte-blanche">
            <h2>Photo</h2>
            <ChampImage actuelle={form.image} repli={<span className="aide">Aucune photo</span>} onChange={(f, supprimer) => setFichier({ image: f, supprimer })} />
          </div>
          <div className="carte-blanche">
            <h2>Story vidéo</h2>
            <label className="champ">Lien YouTube
              <input type="text" inputMode="url" placeholder="https://youtube.com/shorts/…" {...champ('video_youtube')} aria-invalid={idYoutube(form.video_youtube) === null} />
              {idYoutube(form.video_youtube) === null
                ? <span className="erreur">Lien non reconnu. Collez l’adresse de la vidéo YouTube.</span>
                : <span className="aide">Collez le lien du Short. Il n’est jamais affiché aux visiteurs : ils voient seulement la story.</span>}
            </label>
            {idYoutube(form.video_youtube) && (
              <div className="apercu-story">
                <img src={`https://i.ytimg.com/vi/${idYoutube(form.video_youtube)}/hqdefault.jpg`} alt="Aperçu de la story" />
                <button type="button" className="btn btn-danger" style={{ minHeight: 36, padding: 0 }} onClick={() => setForm((f) => ({ ...f, video_youtube: '' }))}>Retirer la vidéo</button>
              </div>
            )}
          </div>
          <div className="carte-blanche">
            <h2>Produit utilisé</h2>
            <label className="champ"><span className="sr-only">Produit</span>
              <select {...champ('produit_id')}>
                <option value="">Aucun</option>
                {produits.map((p) => <option key={p.id} value={p.id}>{p.nom}</option>)}
              </select>
            </label>
          </div>
          <div className="carte-blanche">
            <h2>Publication</h2>
            <label className="case">Visible sur le site
              <input type="checkbox" checked={!!form.actif} onChange={(e) => setForm((f) => ({ ...f, actif: e.target.checked }))} />
            </label>
            <label className="champ">Ordre d’affichage<input type="number" min={0} style={{ width: 110 }} {...champ('ordre')} /></label>
          </div>
          {!nouveau && <button type="button" className="btn btn-danger" style={{ alignSelf: 'flex-start' }} onClick={supprimer}>Supprimer cette recette</button>}
        </div>

        <div className="pied-form">
          <Link to="/admin/recettes" className="btn btn-contour">Annuler</Link>
          <button type="submit" className="btn btn-jaune" disabled={envoi}>{envoi ? 'Enregistrement…' : 'Enregistrer'}</button>
        </div>
      </form>
    </>
  );
}
