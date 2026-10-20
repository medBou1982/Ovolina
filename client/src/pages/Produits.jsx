import { Link } from 'react-router-dom';
import { useCharger } from '../useCharger.js';
import { Banniere, Vague, VisuelProduit } from '../components/Elements.jsx';

export default function Produits() {
  const { donnees, chargement, erreur } = useCharger('/api/produits');

  return (
    <>
      <Banniere titre="Nos produits" ariane={[{ label: 'Produits' }]} />

      <section className="section" style={{ paddingBottom: 40 }}>
        <div className="conteneur deux-colonnes" style={{ alignItems: 'flex-end', gap: 48 }}>
          <div className="texte-bloc" style={{ gap: 10 }}>
            <span className="script">Notre gamme</span>
            <h2>Des œufs adaptés à tous les besoins</h2>
          </div>
          <p style={{ margin: 0, fontSize: 17 }}>Issus d’élevages contrôlés, nos œufs sont conditionnés avec soin pour les familles comme pour les professionnels.</p>
        </div>
      </section>

      <section style={{ paddingBottom: 88 }}>
        <div className="conteneur">
          {chargement && <p className="chargement">Chargement…</p>}
          {erreur && <p className="vide">Impossible de charger les produits pour le moment.</p>}
          {donnees && (
            <div className="liste-produits">
              {donnees.map((p) => (
                <div className="produit-ligne" key={p.id}>
                  <div className="produit-visuel"><VisuelProduit produit={p} taille={84} /></div>
                  <div>
                    <h3>{p.nom}</h3>
                    <p>{p.resume}</p>
                    <Link to={`/produits/${p.slug}`} className="btn btn-jaune">Voir le produit</Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      <section className="bandeau">
        <Vague position="haut" variante={1} />
        <div className="conteneur">
          <h2>Vous êtes un professionnel ? Nous proposons des conditionnements sur mesure pour la distribution, la restauration et l’industrie.</h2>
          <Link to="/contact" className="btn btn-jaune">Demander un devis</Link>
        </div>
        <Vague position="bas" variante={1} couleur="#fff" />
      </section>
    </>
  );
}
