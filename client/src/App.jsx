import { Routes, Route } from 'react-router-dom';
import SiteLayout from './components/SiteLayout.jsx';
import Accueil from './pages/Accueil.jsx';
import Produits from './pages/Produits.jsx';
import Produit from './pages/Produit.jsx';
import Recettes from './pages/Recettes.jsx';
import Recette from './pages/Recette.jsx';
import Contact from './pages/Contact.jsx';
import Introuvable from './pages/Introuvable.jsx';
import Connexion from './admin/Connexion.jsx';
import AdminLayout from './admin/AdminLayout.jsx';
import AdminProduits from './admin/AdminProduits.jsx';
import AdminProduitForm from './admin/AdminProduitForm.jsx';
import AdminRecettes from './admin/AdminRecettes.jsx';
import AdminRecetteForm from './admin/AdminRecetteForm.jsx';
import AdminMessages from './admin/AdminMessages.jsx';
import AdminCompte from './admin/AdminCompte.jsx';
import AdminSite from './admin/AdminSite.jsx';

export default function App() {
  return (
    <Routes>
      <Route element={<SiteLayout />}>
        <Route index element={<Accueil />} />
        <Route path="produits" element={<Produits />} />
        <Route path="produits/:slug" element={<Produit />} />
        <Route path="recettes" element={<Recettes />} />
        <Route path="recettes/:slug" element={<Recette />} />
        <Route path="contact" element={<Contact />} />
        <Route path="*" element={<Introuvable />} />
      </Route>

      <Route path="admin/connexion" element={<Connexion />} />
      <Route path="admin" element={<AdminLayout />}>
        <Route index element={<AdminProduits />} />
        <Route path="produits" element={<AdminProduits />} />
        <Route path="produits/nouveau" element={<AdminProduitForm />} />
        <Route path="produits/:id" element={<AdminProduitForm />} />
        <Route path="recettes" element={<AdminRecettes />} />
        <Route path="recettes/nouvelle" element={<AdminRecetteForm />} />
        <Route path="recettes/:id" element={<AdminRecetteForm />} />
        <Route path="messages" element={<AdminMessages />} />
        <Route path="site" element={<AdminSite />} />
        <Route path="compte" element={<AdminCompte />} />
      </Route>
    </Routes>
  );
}
