import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { api } from './api.js';

// Infos générales du site (coordonnées, réseaux, sites, chiffres),
// chargées une fois depuis la base et partagées par toutes les pages.
const VIDE = { email: '', telephone: '', telephoneLien: '', reseaux: {}, sites: [], chiffres: [], charge: false };

const Contexte = createContext({ site: VIDE, recharger: () => {} });

export function SiteProvider({ children }) {
  const [site, setSite] = useState(VIDE);

  const recharger = useCallback(() => {
    return api.get('/api/site')
      .then((s) => setSite({ ...VIDE, ...s, charge: true }))
      .catch(() => setSite((s) => ({ ...s, charge: true })));
  }, []);

  useEffect(() => { recharger(); }, [recharger]);

  return <Contexte.Provider value={{ site, recharger }}>{children}</Contexte.Provider>;
}

export const useSite = () => useContext(Contexte).site;
export const useRechargerSite = () => useContext(Contexte).recharger;
