import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api } from '../api.js';
import ChampImage from './ChampImage.jsx';
import Contenu from '../components/Contenu.jsx';
import { statutArticle } from './AdminArticles.jsx';

const CATEGORIES = ['Actualités', 'Conseils', 'Nutrition', 'Recettes', 'Coulisses'];

// Date → valeur d'un champ <input type="datetime-local"> (heure locale)
const versChampDate = (d) => {
  const x = new Date(d);
  const p = (n) => String(n).padStart(2, '0');
  return `${x.getFullYear()}-${p(x.getMonth() + 1)}-${p(x.getDate())}T${p(x.getHours())}:${p(x.getMinutes())}`;
};

const VIDE = () => ({
  titre: '', slug: '', categorie: 'Actualités', extrait: '', contenu: '', auteur: 'L’équipe Ovolina',
  publie: false, publie_le: versChampDate(new Date()), image: null
});

const OUTILS = [
  { nom: 'Intertitre', avant: '\n## ', apres: '\n', defaut: 'Intertitre' },
  { nom: 'Gras', avant: '**', apres: '**', defaut: 'texte en gras' },
  { nom: 'Italique', avant: '*', apres: '*', defaut: 'texte en italique' },
  { nom: 'Liste', avant: '\n- ', apres: '', defaut: 'élément de liste' },
  { nom: 'Citation', avant: '\n> ', apres: '\n', defaut: 'citation' },
  { nom: 'Lien', avant: '[', apres: '](https://)', defaut: 'texte du lien' }
];

export default function AdminArticleForm() {
  const { id } = useParams();
  const nouveau = !id;
  const navigate = useNavigate();
  const zone = useRef(null);
  const [form, setForm] = useState(VIDE);
  const [onglet, setOnglet] = useState('ecrire');
  const [fichier, setFichier] = useState({ image: null, supprimer: false });
  const [chargement, setChargement] = useState(!nouveau);
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState(null);

  useEffect(() => {
    if (nouveau) return;
    api.get(`/api/admin/articles/${id}`)
      .then((a) => { setForm({ ...VIDE(), ...a, publie_le: versChampDate(a.publie_le) }); setChargement(false); })
      .catch((err) => { setErreur(err.message); setChargement(false); });
  }, [id, nouveau]);

  const champ = (nom) => ({ name: nom, value: form[nom] ?? '', onChange: (e) => setForm((f) => ({ ...f, [nom]: e.target.value })) });

  // Entoure la sélection du texte avec la mise en forme choisie
  function appliquer(o) {
    const el = zone.current;
    if (!el) return;
    const { selectionStart: d, selectionEnd: f, value } = el;
    const choisi = value.slice(d, f) || o.defaut;
    const nouveauTexte = value.slice(0, d) + o.avant + choisi + o.apres + value.slice(f);
    setForm((x) => ({ ...x, contenu: nouveauTexte }));
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(d + o.avant.length, d + o.avant.length + choisi.length);
    });
  }

  async function enregistrer(publier) {
    if (!form.titre.trim()) { setErreur('Le titre est obligatoire'); return; }
    setEnvoi(true);
    setErreur(null);
    const fd = new FormData();
    ['titre', 'slug', 'categorie', 'extrait', 'contenu', 'auteur'].forEach((k) => fd.append(k, form[k] ?? ''));
    fd.append('publie', publier ? 'true' : 'false');
    fd.append('publie_le', new Date(form.publie_le).toISOString());
    if (fichier.image) fd.append('image', fichier.image);
    if (fichier.supprimer) fd.append('supprimer_image', 'true');
    try {
      if (nouveau) await api.post('/api/admin/articles', fd);
      else await api.put(`/api/admin/articles/${id}`, fd);
      navigate('/admin/blog');
    } catch (err) {
      setErreur(err.message);
      setEnvoi(false);
    }
  }

  async function supprimer() {
    if (!window.confirm(`Supprimer définitivement « ${form.titre} » ?`)) return;
    try { await api.del(`/api/admin/articles/${id}`); navigate('/admin/blog'); } catch (err) { setErreur(err.message); }
  }

  if (chargement) return <p className="chargement">Chargement…</p>;
  const st = statutArticle({ publie: form.publie, publie_le: form.publie_le });
  const mots = form.contenu.trim() ? form.contenu.trim().split(/\s+/).length : 0;

  return (
    <>
      <div>
        <nav className="admin-ariane" aria-label="Fil d’Ariane"><Link to="/admin/blog">Blog</Link><span aria-hidden="true">/</span><span>{nouveau ? 'Nouvel article' : form.titre}</span></nav>
        <h1 style={{ fontSize: 32, fontWeight: 800 }}>{nouveau ? 'Écrire un article' : 'Modifier l’article'} {!nouveau && <span className={`pilule ${st.classe}`} style={{ verticalAlign: 'middle', marginLeft: 8 }}>{st.texte}</span>}</h1>
      </div>
      {erreur && <p className="alerte alerte-erreur" role="alert">{erreur}</p>}

      <form className="form-admin" onSubmit={(e) => { e.preventDefault(); enregistrer(form.publie); }}>
        <div className="principal carte-blanche">
          <label className="champ">Titre<input type="text" required className="titre-article" {...champ('titre')} /></label>
          <label className="champ">Lien de la page
            <span className="slug"><span>/blog/</span><input type="text" placeholder="généré à partir du titre" {...champ('slug')} /></span>
          </label>
          <label className="champ">Résumé<textarea rows={2} maxLength={400} {...champ('extrait')} /><span className="aide">Affiché dans la liste des articles et en introduction. {form.extrait.length}/400</span></label>

          <div className="editeur">
            <div className="editeur-barre">
              <div className="onglets" role="group" aria-label="Mode d’édition">
                <button type="button" aria-pressed={onglet === 'ecrire'} onClick={() => setOnglet('ecrire')}>Écrire</button>
                <button type="button" aria-pressed={onglet === 'apercu'} onClick={() => setOnglet('apercu')}>Aperçu</button>
              </div>
              {onglet === 'ecrire' && (
                <div className="outils-texte">
                  {OUTILS.map((o) => <button type="button" key={o.nom} className="btn-petit" onClick={() => appliquer(o)}>{o.nom}</button>)}
                </div>
              )}
            </div>
            {onglet === 'ecrire'
              ? <label className="champ"><span className="sr-only">Texte de l’article</span><textarea ref={zone} rows={18} className="zone-article" {...champ('contenu')} placeholder={'Écrivez votre article ici.\n\nLaissez une ligne vide entre deux paragraphes.\n## Pour un intertitre\n- Pour une liste'} /></label>
              : <div className="apercu-article">{form.contenu.trim() ? <Contenu texte={form.contenu} /> : <p className="aide">Rien à afficher pour l’instant.</p>}</div>}
            <span className="aide">{mots} mots · environ {Math.max(1, Math.round(mots / 200))} min de lecture · Mise en forme : <code>## intertitre</code>, <code>- liste</code>, <code>**gras**</code>, <code>[lien](https://…)</code></span>
          </div>
        </div>

        <div className="cote">
          <div className="carte-blanche">
            <h2>Publication</h2>
            <label className="case">En ligne sur le site
              <input type="checkbox" checked={!!form.publie} onChange={(e) => setForm((f) => ({ ...f, publie: e.target.checked }))} />
            </label>
            <label className="champ">Date de publication<input type="datetime-local" required {...champ('publie_le')} /><span className="aide">Une date future programme l’article : il apparaîtra tout seul ce jour-là.</span></label>
            <label className="champ">Catégorie<select {...champ('categorie')}>{CATEGORIES.map((c) => <option key={c}>{c}</option>)}</select></label>
            <label className="champ">Auteur<input type="text" {...champ('auteur')} /></label>
          </div>
          <div className="carte-blanche">
            <h2>Image principale</h2>
            <ChampImage actuelle={form.image} repli={<span className="aide">Aucune image</span>} onChange={(f, supprimer) => setFichier({ image: f, supprimer })} />
          </div>
          {!nouveau && <button type="button" className="btn btn-danger" style={{ alignSelf: 'flex-start' }} onClick={supprimer}>Supprimer cet article</button>}
        </div>

        <div className="pied-form">
          <Link to="/admin/blog" className="btn btn-contour">Annuler</Link>
          <button type="button" className="btn btn-contour" disabled={envoi} onClick={() => enregistrer(false)}>Enregistrer en brouillon</button>
          <button type="button" className="btn btn-jaune" disabled={envoi} onClick={() => enregistrer(true)}>{envoi ? 'Enregistrement…' : 'Publier'}</button>
        </div>
      </form>
    </>
  );
}
