# Installer le site Ovolina sur Windows Server (OVH)

Ce guide vaut pour Windows Server 2016, 2019 et 2022. Il faut compter **15 à 20 minutes**, presque entièrement automatiques.
L'installateur met en place Node.js, PostgreSQL 16, Git, le site, le serveur web Caddy, les services Windows (qui redémarrent seuls), le pare-feu et une sauvegarde chaque nuit.
On peut le relancer sans risque : il ne supprime ni n'écrase jamais les données.

---

## 1. Se connecter au serveur

1. Sur votre PC, ouvrez **Connexion Bureau à distance** (touche Windows, puis tapez `mstsc`).
2. Saisissez l'**adresse IP** du serveur. Elle figure dans l'espace client OVH et dans l'e-mail de livraison.
3. Connectez-vous avec le compte **Administrator** (ou **Administrateur**) et son mot de passe.

## 2. Ouvrir PowerShell en administrateur

Clic droit sur le bouton **Démarrer** → **Windows PowerShell (admin)**.
La fenêtre doit afficher « Administrateur » dans son titre.

## 3. Lancer l'installation

Copiez-collez ces 4 lignes (clic droit dans la fenêtre pour coller), puis appuyez sur Entrée :

```powershell
Set-ExecutionPolicy -Scope Process Bypass -Force
[Net.ServicePointManager]::SecurityProtocol = 'Tls12'
iwr https://raw.githubusercontent.com/medBou1982/Ovolina/main/deploy/windows/installer.ps1 -OutFile $env:TEMP\ovolina.ps1 -UseBasicParsing
& $env:TEMP\ovolina.ps1
```

Le script vous demande :
- l'**e-mail** du compte administrateur du site ;
- le **mot de passe** de ce compte (8 caractères minimum). Il ne s'affiche pas pendant la saisie.

Si le message **« Le port 80 est occupé (IIS) »** apparaît, cela veut dire que le serveur web IIS de Windows est actif. Relancez la dernière ligne ainsi pour l'arrêter et libérer le port :

```powershell
& $env:TEMP\ovolina.ps1 -ArreterIIS
```

À la fin, le script affiche en vert **« Ovolina est en ligne »** avec l'adresse du site.

## 4. Ouvrir le site

| | Adresse |
|---|---|
| Site public | `http://ADRESSE-IP-DU-SERVEUR` |
| Administration | `http://ADRESSE-IP-DU-SERVEUR/admin` |

**Si la page ne s'ouvre pas depuis votre PC** alors qu'elle s'ouvre sur le serveur lui-même, c'est le pare-feu réseau d'OVH qui bloque l'accès. Dans l'espace client OVH, ouvrez **Network Firewall** (ou le *Security group* pour une instance Public Cloud). Autorisez les ports TCP **80** et **443** en entrée. Le pare-feu de Windows est déjà configuré par le script.

> Tant qu'aucun domaine n'est relié, le site fonctionne en HTTP simple. Évitez de vous connecter à l'admin depuis un Wi-Fi public avant d'avoir relié le domaine (étape 8), qui active le HTTPS.

---

## 5. Mettre à jour le site

Quand une nouvelle version est publiée sur GitHub, lancez dans PowerShell (admin) :

```powershell
C:\Ovolina\site\deploy\windows\mettre-a-jour.ps1
```

Le script fait d'abord une sauvegarde, puis récupère la nouvelle version, la compile et redémarre le site. La coupure dure quelques secondes. Les produits, recettes, articles et photos sont conservés.

## 6. Sauvegardes

- Une sauvegarde est faite **chaque nuit à 3 h 15**. Elle se trouve dans `C:\Ovolina\sauvegardes` :
  - `base_<date>.dump` : la base de données ;
  - `photos_<date>.zip` : les photos envoyées depuis l'admin.
- Les **14 dernières** sont gardées.
- Pour une sauvegarde immédiate : `C:\Ovolina\site\deploy\windows\sauvegarde.ps1`.
- **Conseil :** copiez de temps en temps ce dossier hors du serveur (sur votre PC ou dans un stockage OVH), car une sauvegarde qui reste sur le même disque ne protège pas d'une panne de ce disque.

**Restaurer** une sauvegarde (en remplaçant `<date>` par la date voulue) :

```powershell
Stop-Service ovolina -Force
$env:PGPASSWORD = (Get-Content C:\Ovolina\outils\postgres-superutilisateur.txt -Raw).Trim()
& 'C:\Program Files\PostgreSQL\16\bin\pg_restore.exe' -h 127.0.0.1 -U postgres -d ovolina --clean --if-exists C:\Ovolina\sauvegardes\base_<date>.dump
Expand-Archive C:\Ovolina\sauvegardes\photos_<date>.zip -DestinationPath C:\Ovolina\site\server\uploads -Force
Start-Service ovolina, ovolina-caddy
```

## 7. Mot de passe administrateur oublié

```powershell
C:\Ovolina\site\deploy\windows\mot-de-passe.ps1
```

Saisissez l'e-mail du compte, puis le nouveau mot de passe. Avec un e-mail qui n'existe pas encore, l'outil crée un **nouveau compte** administrateur.

---

## 8. Relier le nom de domaine (plus tard)

### a) Faire pointer le domaine vers le serveur

Chez le gestionnaire du domaine (OVH, Cloudflare…), dans la **zone DNS** :

| Type | Nom | Valeur |
|---|---|---|
| A | `ovolina.tn` (ou `@`) | ADRESSE-IP-DU-SERVEUR |
| A | `www` | ADRESSE-IP-DU-SERVEUR |

Le changement prend effet en quelques minutes à quelques heures.
**Si le domaine passe par Cloudflare**, réglez ces deux lignes en **« DNS only »** (nuage gris) pendant la liaison, pour que le certificat puisse être obtenu.

> 💡 **Pour ne pas couper l'ancien site pendant les essais**, testez d'abord avec un sous-domaine, par exemple `nouveau.ovolina.tn`. Créez pour cela une ligne A `nouveau` vers l'IP du serveur. Une fois le nouveau site validé, modifiez les lignes `ovolina.tn` et `www`.

### b) Activer le domaine et le HTTPS

```powershell
C:\Ovolina\site\deploy\windows\lier-domaine.ps1 -Domaine ovolina.tn -Email contact@ovolina.com
```

- Le script vérifie que le domaine pointe bien vers ce serveur ; sinon, il s'arrête sans rien changer.
- Le **certificat HTTPS** (Let's Encrypt) est obtenu automatiquement en une minute environ, puis renouvelé tout seul.
- `www.ovolina.tn` et l'accès par `http://` sont redirigés vers `https://ovolina.tn`.
- Pour le sous-domaine de test : `-Domaine nouveau.ovolina.tn`.
- Pour revenir à l'accès par adresse IP : `-Domaine ip`.

Une fois le HTTPS en place, vous pouvez repasser Cloudflare en mode « Proxied » (nuage orange) si vous le souhaitez, avec le chiffrement SSL réglé sur **Full (strict)**.

---

## Aide-mémoire

| Besoin | Commande / emplacement |
|---|---|
| Redémarrer le site | `Restart-Service ovolina -Force; Start-Service ovolina-caddy` |
| État des services | `Get-Service ovolina, ovolina-caddy, postgresql-x64-16` |
| Journaux (erreurs) | `C:\Ovolina\journaux` |
| Réglages du site | `C:\Ovolina\site\server\.env` |
| Photos envoyées | `C:\Ovolina\site\server\uploads` |
| Mot de passe PostgreSQL | `C:\Ovolina\outils\postgres-superutilisateur.txt` (lisible par les administrateurs seulement) |

Les ports **5432** (PostgreSQL) et **4000** (Node) ne sont jamais ouverts à Internet. Seul Caddy (ports 80 et 443) est exposé.
