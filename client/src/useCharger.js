import { useCallback, useEffect, useState } from 'react';
import { api } from './api.js';

// Charge une URL de l'API : { donnees, erreur, chargement, recharger }
export function useCharger(url) {
  const [etat, setEtat] = useState({ donnees: null, erreur: null, chargement: true });

  const charger = useCallback(() => {
    if (!url) return () => {};
    let annule = false;
    setEtat((e) => ({ ...e, chargement: true, erreur: null }));
    api.get(url)
      .then((donnees) => !annule && setEtat({ donnees, erreur: null, chargement: false }))
      .catch((erreur) => !annule && setEtat({ donnees: null, erreur, chargement: false }));
    return () => { annule = true; };
  }, [url]);

  useEffect(() => charger(), [charger]);

  return { ...etat, recharger: charger };
}
