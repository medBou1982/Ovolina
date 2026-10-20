import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api } from '../api.js';
import { Oeuf } from '../components/Elements.jsx';
import ChampImage from './ChampImage.jsx';

const VIDE = {
  nom: '', slug: '', resume: '', description: '', points_forts: '', formats: '', nutrition: '',
  couleur_jaune: '#F2A20C', actif: true, ordre: 0, image: null
};

export default function AdminProduitForm() {
  const { id } = useParams();
  const nouveau = !id;
  const navigate = useNavigate();
  const [form, setForm] = useState(VIDE);
  const [fichier, setFichier] = useState({ image: null, supprimer: false });
  const [chargement, setChargement] = useState(!nouveau);
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState(null);

  useEffect(() => {
    if (nouveau) return;
    api.get(`/api/admin/produits/${id}`)
      .then((p) => { setForm({ ...VIDE, ...p }); setChargement(false); })
      .catch((err) => { setErreur(err.message); setChargement(false); });
  }, [id, nouveau]);

  const champ = (nom) => ({ name: nom, value: form[nom] ?? '', onChange: (e) => setForm((f) => ({ ...f, [nom]: e.target.value })) });

  async function enregistrer(e) {
    e.preventDefault();
    if (!form.nom.trim()) { setErreur('Le nom est obligatoire'); return; }
    setEnvoi(true);
    setErreur(null);
    const fd = new FormData();
    ['nom', 'slug', 'resume', 'description', 'points_forts', 'formats', 'nutrition', 'couleur_jaune', 'ordre']
      .forEach((k) => fd.append(k, form[k] ?? ''));
    fd.append('actif', form.actif ? 'true' : 'false');
    if (fichier.image) fd.append('image', fichier.image);
    if (fichier.supprimer) fd.append('supprimer_image', 'true');
    try {
      if (nouveau) await api.post('/api/admin/produits', fd);
      else await api.put(`/api/admin/produits/${id}`, fd);
      navigate('/admin/produits');
    } catch (err) {
      setErreur(err.message);
      setEnvoi(false);
    }
  }

  async function supprimer() {
    if (!window.confirm(`Supprimer définitivement « ${form.nom} » ?`)) return;
    try {
      await api.del(`/api/admin/produits/${id}`);
      navigate('/admin/produits');
    } catch (err) { setErreur(err.message); }
  }

  if (chargement) return <p className="chargement">Chargement…</p>;

  return (
    <>
      <div>
        <nav className="admin-ariane" aria-label="Fil d’Ariane"><Link to="/admin/produits">Produits</Link><span aria-hidden="true">/</span><span>{nouveau ? 'Nouveau' : form.nom}</span></nav>
        <h1 style={{ fontSize: 32, fontWeight: 800 }}>{nouveau ? 'Ajouter un produit' : 'Modifier le produit'}</h1>
      </div>
      {erreur && <p className="alerte alerte-erreur" role="alert">{erreur}</p>}

      <form className="form-admin" onSubmit={enregistrer}>
        <div className="principal carte-blanche">
          <h2>Informations</h2>
          <label className="champ">Nom du produit<input type="text" required {...champ('nom')} /></label>
          <label className="champ">Lien de la page
            <span className="slug"><span>/produits/</span><input type="text" placeholder="généré à partir du nom" {...champ('slug')} /></span>
            <span className="aide">Laissez vide pour le générer automatiquement.</span>
          </label>
          <label className="champ">Résumé (cartes et listes)<input type="text" maxLength={160} {...champ('resume')} /></label>
          <label className="champ">Description<textarea rows={4} {...champ('description')} /></label>
          <label className="champ">Points forts<textarea rows={3} {...champ('points_forts')} /><span className="aide">Un point par ligne.</span></label>
          <label className="champ">Formats<input type="text" placeholder="Plateau de 30, Boîte de 6" {...champ('formats')} /><span className="aide">Séparés par des virgules.</span></label>
          <label className="champ">Valeurs nutritionnelles (pour 100 g)
            <textarea rows={4} placeholder={'Énergie : 140 kcal\nProtéines : 12,5 g'} {...champ('nutrition')} />
            <span className="aide">Une valeur par ligne, au format « Libellé : valeur ». Laissez vide pour masquer le tableau.</span>
          </label>
        </div>

        <div className="cote">
          <div className="carte-blanche">
            <h2>Image</h2>
            <ChampImage
              actuelle={form.image}
              repli={<Oeuf jaune={form.couleur_jaune} taille={70} />}
              onChange={(f, supprimer) => setFichier({ image: f, supprimer })}
            />
            <label className="champ">Couleur du jaune (si pas de photo)
              <span className="couleur"><input type="color" {...champ('couleur_jaune')} /><span className="aide">{form.couleur_jaune}</span></span>
            </label>
          </div>
          <div className="carte-blanche">
            <h2>Publication</h2>
            <label className="case">Visible sur le site
              <input type="checkbox" checked={!!form.actif} onChange={(e) => setForm((f) => ({ ...f, actif: e.target.checked }))} />
            </label>
            <label className="champ">Ordre d’affichage<input type="number" min={0} style={{ width: 110 }} {...champ('ordre')} /></label>
          </div>
          {!nouveau && <button type="button" className="btn btn-danger" style={{ alignSelf: 'flex-start' }} onClick={supprimer}>Supprimer ce produit</button>}
        </div>

        <div className="pied-form">
          <Link to="/admin/produits" className="btn btn-contour">Annuler</Link>
          <button type="submit" className="btn btn-jaune" disabled={envoi}>{envoi ? 'Enregistrement…' : 'Enregistrer'}</button>
        </div>
      </form>
    </>
  );
}
