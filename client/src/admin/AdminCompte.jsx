import { useState } from 'react';
import { api } from '../api.js';

export default function AdminCompte() {
  const [form, setForm] = useState({ actuel: '', nouveau: '', confirmation: '' });
  const [etat, setEtat] = useState({ envoi: false, ok: false, erreur: null });

  const champ = (nom) => ({ value: form[nom], onChange: (e) => setForm((f) => ({ ...f, [nom]: e.target.value })) });

  async function changer(e) {
    e.preventDefault();
    if (form.nouveau !== form.confirmation) { setEtat({ envoi: false, ok: false, erreur: 'Les deux mots de passe ne correspondent pas' }); return; }
    setEtat({ envoi: true, ok: false, erreur: null });
    try {
      await api.post('/api/admin/mot-de-passe', { actuel: form.actuel, nouveau: form.nouveau });
      setForm({ actuel: '', nouveau: '', confirmation: '' });
      setEtat({ envoi: false, ok: true, erreur: null });
    } catch (err) {
      setEtat({ envoi: false, ok: false, erreur: err.message });
    }
  }

  return (
    <>
      <div className="admin-titre"><h1>Mot de passe</h1></div>
      <form className="carte-blanche" onSubmit={changer} style={{ padding: 28, maxWidth: 460, display: 'flex', flexDirection: 'column', gap: 18 }}>
        {etat.ok && <p className="alerte alerte-ok" role="status">Mot de passe modifié.</p>}
        {etat.erreur && <p className="alerte alerte-erreur" role="alert">{etat.erreur}</p>}
        <label className="champ">Mot de passe actuel<input type="password" autoComplete="current-password" required {...champ('actuel')} /></label>
        <label className="champ">Nouveau mot de passe<input type="password" autoComplete="new-password" minLength={8} required {...champ('nouveau')} /><span className="aide">8 caractères minimum.</span></label>
        <label className="champ">Confirmer le nouveau mot de passe<input type="password" autoComplete="new-password" required {...champ('confirmation')} /></label>
        <button type="submit" className="btn btn-jaune" style={{ alignSelf: 'flex-start' }} disabled={etat.envoi}>{etat.envoi ? 'Enregistrement…' : 'Changer le mot de passe'}</button>
      </form>
    </>
  );
}
