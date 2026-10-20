import { Link } from 'react-router-dom';
import { Oeuf } from '../components/Elements.jsx';

export default function Introuvable() {
  return (
    <section className="introuvable">
      <Oeuf jaune="#F8C800" taille={80} />
      <h1>Page introuvable</h1>
      <p style={{ margin: 0, color: 'var(--gris)' }}>Cette page n’existe pas ou a été déplacée.</p>
      <Link to="/" className="btn btn-jaune">Retour à l’accueil</Link>
    </section>
  );
}
