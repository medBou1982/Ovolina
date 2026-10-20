import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { api, jeton } from '../api.js';
import { Traits } from '../components/Elements.jsx';

export default function Connexion() {
  const [email, setEmail] = useState('');
  const [motDePasse, setMotDePasse] = useState('');
  const [erreur, setErreur] = useState(null);
  const [envoi, setEnvoi] = useState(false);
  const navigate = useNavigate();
  const { state } = useLocation();

  useEffect(() => { document.title = 'Connexion – Administration Ovolina'; }, []);

  async function connecter(e) {
    e.preventDefault();
    setEnvoi(true);
    setErreur(null);
    try {
      const r = await api.post('/api/auth/login', { email, motDePasse });
      jeton.ecrire(r.token);
      const retour = state?.depuis?.startsWith('/admin') ? state.depuis : '/admin';
      navigate(retour, { replace: true });
    } catch (err) {
      setErreur(err.message);
      setEnvoi(false);
    }
  }

  return (
    <div className="connexion">
      <div className="gauche">
        <span className="logo-admin"><img src="/logo.png" alt="Ovolina" /></span>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <span className="script">Espace administration</span>
          <h1>Gérez vos produits, recettes et messages.</h1>
        </div>
        <Traits couleur="#F8C800" />
      </div>
      <div className="droite">
        <form onSubmit={connecter}>
          <h2>Connexion</h2>
          <p style={{ margin: '-10px 0 8px', color: 'var(--gris)' }}>Accès réservé à l’équipe Ovolina.</p>
          {erreur && <p className="alerte alerte-erreur" role="alert">{erreur}</p>}
          <label className="champ">Email
            <input type="email" autoComplete="username" required value={email} onChange={(e) => setEmail(e.target.value)} />
          </label>
          <label className="champ">Mot de passe
            <input type="password" autoComplete="current-password" required value={motDePasse} onChange={(e) => setMotDePasse(e.target.value)} />
          </label>
          <button type="submit" className="btn btn-jaune" disabled={envoi}>{envoi ? 'Connexion…' : 'Se connecter'}</button>
          <a href="/" style={{ alignSelf: 'center', fontSize: 15 }}>← Retour au site</a>
        </form>
      </div>
    </div>
  );
}
