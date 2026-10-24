<#
=====================================================================
  Installation du site Ovolina sur Windows Server (2016, 2019, 2022)

  Dans PowerShell ouvert « en tant qu'administrateur » :
    Set-ExecutionPolicy -Scope Process Bypass -Force
    [Net.ServicePointManager]::SecurityProtocol = 'Tls12'
    iwr https://raw.githubusercontent.com/medBou1982/Ovolina/main/deploy/windows/installer.ps1 -OutFile $env:TEMP\ovolina.ps1 -UseBasicParsing
    & $env:TEMP\ovolina.ps1

  Installe : Node.js, PostgreSQL, Git, le site, Caddy (serveur web, HTTPS automatique
  quand un domaine sera relié), les services Windows, le pare-feu et les sauvegardes.
  On peut le relancer sans risque : il ne supprime ni n'écrase les données.
=====================================================================
#>
param(
  [string]$EmailAdmin,
  [string]$MotDePasseAdmin,
  [string]$MotDePassePostgres,      # seulement si PostgreSQL 16 est déjà installé sur ce serveur
  [string]$Racine = 'C:\Ovolina',
  [string]$Depot = 'https://github.com/medBou1982/Ovolina.git',
  [switch]$ArreterIIS,              # libère le port 80 si IIS l'occupe
  [switch]$NonInteractif
)

$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12

$SITE = Join-Path $Racine 'site'
$OUTILS = Join-Path $Racine 'outils'
$JOURNAUX = Join-Path $Racine 'journaux'
$CADDY = Join-Path $Racine 'caddy'
$SAUVEGARDES = Join-Path $Racine 'sauvegardes'
$TELECHARGEMENTS = Join-Path $Racine 'telechargements'
$PG_VERSION = 16
$PG_SERVICE = "postgresql-x64-$PG_VERSION"
$PG_DOSSIER = "C:\Program Files\PostgreSQL\$PG_VERSION"
$PG_BIN = "$PG_DOSSIER\bin"
$FICHIER_SUPERUTILISATEUR = Join-Path $OUTILS 'postgres-superutilisateur.txt'

function Etape($t) { Write-Host ''; Write-Host "> $t" -ForegroundColor Green; if ($env:GITHUB_ACTIONS) { Write-Host "::notice title=Étape::$t" } }
function Info($t) { Write-Host "  $t" }
function Alerte($t) { Write-Host "  ! $t" -ForegroundColor Yellow }
function Arret($t) {
  Write-Host ''; Write-Host "X $t" -ForegroundColor Red
  if ($env:GITHUB_ACTIONS) { Write-Host "::error title=Installateur::$t" }
  exit 1
}
# Toute erreur imprévue est affichée clairement, avec sa ligne
trap {
  Write-Host ''; Write-Host "X Erreur : $($_.Exception.Message) (ligne $($_.InvocationInfo.ScriptLineNumber))" -ForegroundColor Red
  if ($env:GITHUB_ACTIONS) { Write-Host "::error title=Installateur (ligne $($_.InvocationInfo.ScriptLineNumber))::$($_.Exception.Message)" }
  exit 1
}

# Écrit un fichier texte en UTF-8 SANS BOM (indispensable pour .env et Caddyfile)
function Ecrire($chemin, $texte) { [IO.File]::WriteAllText($chemin, $texte, (New-Object Text.UTF8Encoding $false)) }

function Aleatoire($octets) {
  $b = New-Object byte[] $octets
  [Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($b)
  ($b | ForEach-Object { $_.ToString('x2') }) -join ''
}

# Lance un programme et s'arrête s'il échoue (en montrant ses derniers messages)
function Lancer($exe, [string[]]$arguments, $dossier = $null) {
  if ($dossier) { Push-Location $dossier }
  $eap = $ErrorActionPreference; $ErrorActionPreference = 'Continue'
  try {
    $sortie = & $exe @arguments 2>&1 | ForEach-Object { $l = "$_"; Write-Host $l; $l }
    $code = $LASTEXITCODE
  } finally { $ErrorActionPreference = $eap; if ($dossier) { Pop-Location } }
  if ($code -ne 0) {
    $nom = [IO.Path]::GetFileName($exe)
    if ($env:GITHUB_ACTIONS) { Write-Host "::error title=$nom (code $code)::$((($sortie | Select-Object -Last 15) -join '%0A'))" }
    throw "$nom a échoué (code $code)"
  }
}

# Droits « administrateurs + système uniquement », par identifiants universels (valables sur un Windows en français)
function Proteger($chemin) {
  icacls $chemin /inheritance:r /grant:r '*S-1-5-32-544:F' '*S-1-5-18:F' | Out-Null
  if ($LASTEXITCODE -ne 0) { throw "Impossible de protéger $chemin" }
}

function Telecharger($url, $nom) {
  New-Item -ItemType Directory -Force -Path $TELECHARGEMENTS | Out-Null
  $dest = Join-Path $TELECHARGEMENTS $nom
  if (-not (Test-Path $dest)) {
    Info "Téléchargement de $nom…"
    Invoke-WebRequest -Uri $url -OutFile "$dest.part" -UseBasicParsing
    Move-Item "$dest.part" $dest -Force
  }
  $dest
}

function DerniereVersionGitHub($depot, $motif) {
  $h = @{ 'User-Agent' = 'ovolina-installeur' }
  if ($env:GITHUB_TOKEN) { $h['Authorization'] = "Bearer $env:GITHUB_TOKEN" }
  try {
    $r = Invoke-RestMethod -Uri "https://api.github.com/repos/$depot/releases/latest" -Headers $h -UseBasicParsing
    ($r.assets | Where-Object { $_.name -match $motif } | Select-Object -First 1).browser_download_url
  } catch { $null }
}

function RafraichirPath {
  $env:Path = [Environment]::GetEnvironmentVariable('Path', 'Machine') + ';' + [Environment]::GetEnvironmentVariable('Path', 'User')
}

function Attendre($url, $secondes = 60) {
  for ($i = 0; $i -lt $secondes; $i++) {
    try { $r = Invoke-WebRequest -Uri $url -UseBasicParsing -TimeoutSec 5; if ($r.StatusCode -eq 200) { return $true } } catch {}
    Start-Sleep -Seconds 1
  }
  $false
}

# ---------- Vérifications ----------
$admin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $admin) { Arret 'Ouvrez PowerShell avec « Exécuter en tant qu''administrateur », puis relancez.' }
if (-not [Environment]::Is64BitOperatingSystem) { Arret 'Windows 64 bits requis.' }
foreach ($d in @($Racine, $OUTILS, $JOURNAUX, $CADDY, $SAUVEGARDES)) { New-Item -ItemType Directory -Force -Path $d | Out-Null }
$DejaInstalle = Test-Path (Join-Path $SITE 'server\.env')

# ---------- Questions ----------
Etape 'Configuration'
if (-not $EmailAdmin) {
  if ($NonInteractif) { Arret 'Paramètre -EmailAdmin manquant.' }
  $EmailAdmin = Read-Host '  Email du compte administrateur du site'
}
$EmailAdmin = $EmailAdmin.Trim().ToLower()
if ($EmailAdmin -notmatch '^[^@\s]+@[^@\s]+\.[^@\s]+$') { Arret "Email invalide : $EmailAdmin" }

if (-not $DejaInstalle -and -not $MotDePasseAdmin) {
  if ($NonInteractif) { Arret 'Paramètre -MotDePasseAdmin manquant.' }
  while ($true) {
    $a = Read-Host '  Mot de passe administrateur (8 caractères minimum)' -AsSecureString
    $b = Read-Host '  Confirmez le mot de passe' -AsSecureString
    $pa = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($a))
    $pb = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($b))
    if ($pa.Length -lt 8) { Alerte 'Trop court, recommencez.'; continue }
    if ($pa -ne $pb) { Alerte 'Les deux mots de passe sont différents, recommencez.'; continue }
    $MotDePasseAdmin = $pa; break
  }
}
if (-not $DejaInstalle -and $MotDePasseAdmin.Length -lt 8) { Arret 'Le mot de passe administrateur doit faire au moins 8 caractères.' }

# ---------- Port 80 ----------
Etape 'Vérification du port 80'
$occupe = Get-NetTCPConnection -LocalPort 80 -State Listen -ErrorAction SilentlyContinue | Select-Object -First 1
if ($occupe) {
  $proc = Get-Process -Id $occupe.OwningProcess -ErrorAction SilentlyContinue
  if ($proc -and $proc.ProcessName -eq 'caddy') { Info 'Port 80 déjà utilisé par Caddy (installation précédente) : normal.' }
  elseif ((Get-Service W3SVC -ErrorAction SilentlyContinue).Status -eq 'Running') {
    if ($ArreterIIS) {
      Stop-Service W3SVC -Force; Set-Service W3SVC -StartupType Disabled
      Info 'IIS arrêté et désactivé pour libérer le port 80.'
    } else { Arret 'IIS occupe le port 80. Relancez avec -ArreterIIS pour l''arrêter (les sites IIS existants seront coupés).' }
  } else { Arret "Le port 80 est déjà utilisé par « $($proc.ProcessName) ». Libérez-le puis relancez." }
} else { Info 'Port 80 libre.' }

# ---------- Node.js ----------
Etape 'Node.js'
RafraichirPath
$nodeOk = $false
if (Get-Command node -ErrorAction SilentlyContinue) { $nodeOk = (((node -p "process.versions.node.split('.')[0]") -as [int]) -ge 22) }
if (-not $nodeOk) {
  $versions = Invoke-RestMethod -Uri 'https://nodejs.org/dist/index.json' -UseBasicParsing
  $v = ($versions | Where-Object { $_.version -like 'v22.*' -and $_.lts } | Select-Object -First 1).version
  $msi = Telecharger "https://nodejs.org/dist/$v/node-$v-x64.msi" "node-$v-x64.msi"
  Info "Installation de Node.js $v…"
  $p = Start-Process msiexec.exe -ArgumentList @('/i', "`"$msi`"", '/qn', '/norestart') -Wait -PassThru
  if ($p.ExitCode -notin 0, 3010) { Arret "Installation de Node.js échouée (code $($p.ExitCode))" }
  RafraichirPath
}
$NODE = (Get-Command node).Source
$NPM = (Get-Command npm.cmd).Source
Info "Node.js $(node -v) ($NODE)"

# ---------- Git ----------
Etape 'Git'
if (-not (Get-Command git -ErrorAction SilentlyContinue)) {
  $url = DerniereVersionGitHub 'git-for-windows/git' '^Git-[\d.]+-64-bit\.exe$'
  if (-not $url) { $url = 'https://github.com/git-for-windows/git/releases/download/v2.47.1.windows.1/Git-2.47.1-64-bit.exe' }
  $exe = Telecharger $url ([IO.Path]::GetFileName($url))
  Info 'Installation de Git…'
  $p = Start-Process $exe -ArgumentList '/VERYSILENT', '/NORESTART', '/NOCANCEL', '/SP-', '/SUPPRESSMSGBOXES' -Wait -PassThru
  if ($p.ExitCode -ne 0) { Arret "Installation de Git échouée (code $($p.ExitCode))" }
  RafraichirPath
}
$GIT = (Get-Command git).Source
Info "$(git --version)"

# ---------- Code du site ----------
Etape 'Récupération du site'
if (Test-Path (Join-Path $SITE '.git')) {
  Info 'Site déjà présent.'
} else {
  if ((Test-Path $SITE) -and (Get-ChildItem $SITE -Force | Select-Object -First 1)) { Arret "$SITE existe déjà et n'est pas vide." }
  Lancer $GIT @('clone', $Depot, $SITE)
}
Info "Version $(& $GIT -C $SITE rev-parse --short HEAD)"

# ---------- PostgreSQL ----------
Etape "PostgreSQL $PG_VERSION"
$service = Get-Service $PG_SERVICE -ErrorAction SilentlyContinue
if (-not $service) {
  $superMdp = Aleatoire 24
  $url = $null
  foreach ($m in 30..4) {
    $u = "https://get.enterprisedb.com/postgresql/postgresql-$PG_VERSION.$m-1-windows-x64.exe"
    try { $r = Invoke-WebRequest -Uri $u -Method Head -UseBasicParsing -TimeoutSec 15; if ($r.StatusCode -eq 200) { $url = $u; break } } catch {}
  }
  if (-not $url) { Arret 'Impossible de trouver le programme d''installation de PostgreSQL sur get.enterprisedb.com.' }
  $exe = Telecharger $url ([IO.Path]::GetFileName($url))
  Info "Installation de $([IO.Path]::GetFileName($url)) (quelques minutes)…"
  $argsPg = @('--mode', 'unattended', '--unattendedmodeui', 'none', '--superpassword', $superMdp, '--serverport', '5432',
            '--servicename', $PG_SERVICE, '--prefix', "`"$PG_DOSSIER`"", '--datadir', "`"$PG_DOSSIER\data`"",
            '--disable-components', 'pgAdmin,stackbuilder')
  $p = Start-Process $exe -ArgumentList $argsPg -Wait -PassThru
  if ($p.ExitCode -ne 0) { Arret "Installation de PostgreSQL échouée (code $($p.ExitCode))" }
  Ecrire $FICHIER_SUPERUTILISATEUR $superMdp
  Proteger $FICHIER_SUPERUTILISATEUR
  $MotDePassePostgres = $superMdp
  Info "PostgreSQL installé (mot de passe « postgres » rangé dans $FICHIER_SUPERUTILISATEUR, accès administrateurs uniquement)."
} else {
  Info 'PostgreSQL déjà installé.'
  if (-not $MotDePassePostgres -and (Test-Path $FICHIER_SUPERUTILISATEUR)) { $MotDePassePostgres = (Get-Content $FICHIER_SUPERUTILISATEUR -Raw).Trim() }
}
if ((Get-Service $PG_SERVICE).Status -ne 'Running') { Start-Service $PG_SERVICE }
Set-Service $PG_SERVICE -StartupType Automatic

if ($DejaInstalle) {
  Info 'Base déjà configurée : rien n''est modifié.'
} else {
  if (-not $MotDePassePostgres) {
    if ($NonInteractif) { Arret 'PostgreSQL existe déjà : indiquez -MotDePassePostgres.' }
    $s = Read-Host '  Mot de passe du compte « postgres » de PostgreSQL déjà installé' -AsSecureString
    $MotDePassePostgres = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($s))
  }
  $env:PGPASSWORD = $MotDePassePostgres
  $psql = "$PG_BIN\psql.exe"
  $mdpBase = Aleatoire 24
  $role = & $psql -h 127.0.0.1 -U postgres -d postgres -tAc "SELECT 1 FROM pg_roles WHERE rolname='ovolina'"
  if ($LASTEXITCODE -ne 0) { Arret 'Connexion à PostgreSQL refusée : vérifiez le mot de passe du compte « postgres ».' }
  # "$x".Trim() : une réponse vide de psql devient '' (PowerShell compare mal la valeur $null)
  if ("$role".Trim() -eq '1') { Lancer $psql @('-h', '127.0.0.1', '-U', 'postgres', '-d', 'postgres', '-qc', "ALTER ROLE ovolina WITH LOGIN PASSWORD '$mdpBase'") }
  else { Lancer $psql @('-h', '127.0.0.1', '-U', 'postgres', '-d', 'postgres', '-qc', "CREATE ROLE ovolina WITH LOGIN PASSWORD '$mdpBase'") }
  $base = & $psql -h 127.0.0.1 -U postgres -d postgres -tAc "SELECT 1 FROM pg_database WHERE datname='ovolina'"
  if ("$base".Trim() -ne '1') { Lancer "$PG_BIN\createdb.exe" @('-h', '127.0.0.1', '-U', 'postgres', '-O', 'ovolina', 'ovolina') }
  Remove-Item Env:PGPASSWORD
  Info 'Base « ovolina » prête (mot de passe généré automatiquement).'

  $env_ = @(
    "DATABASE_URL=postgres://ovolina:$mdpBase@127.0.0.1:5432/ovolina",
    "JWT_SECRET=$(Aleatoire 32)",
    'PORT=4000',
    'HOST=127.0.0.1',
    "ADMIN_EMAIL=$EmailAdmin",
    "ADMIN_PASSWORD=$MotDePasseAdmin"
  ) -join "`n"
  $fichierEnv = Join-Path $SITE 'server\.env'
  Ecrire $fichierEnv "$env_`n"
  Proteger $fichierEnv
  Info 'server\.env créé (lisible uniquement par les administrateurs et le service du site).'
}

# ---------- Dépendances, compilation, base ----------
Etape 'Installation des dépendances et compilation du site (quelques minutes)'
$svcSite = Get-Service ovolina -ErrorAction SilentlyContinue
if ($svcSite -and $svcSite.Status -eq 'Running') { Stop-Service ovolina -Force }
Lancer $NPM @('--prefix', "$SITE\server", 'install', '--omit=dev', '--no-audit', '--no-fund')
Lancer $NPM @('--prefix', "$SITE\client", 'install', '--no-audit', '--no-fund')
Lancer $NPM @('--prefix', "$SITE\client", 'run', 'build')

Etape 'Création des tables et du compte administrateur'
Lancer $NODE @('db\init.js') "$SITE\server"
$fichierEnv = Join-Path $SITE 'server\.env'
Ecrire $fichierEnv (((Get-Content $fichierEnv -Raw) -replace '(?m)^ADMIN_PASSWORD=.*$', 'ADMIN_PASSWORD='))

# ---------- Services Windows (WinSW) ----------
function InstallerService($id, $nom, $description, $exe, $arguments, $dossier, $dependances, $variables) {
  $winsw = Telecharger 'https://github.com/winsw/winsw/releases/download/v2.12.0/WinSW-x64.exe' 'WinSW-x64-2.12.0.exe'
  $svcExe = Join-Path $OUTILS "$id-service.exe"
  $svcXml = Join-Path $OUTILS "$id-service.xml"
  if (Get-Service $id -ErrorAction SilentlyContinue) {
    Stop-Service $id -Force -ErrorAction SilentlyContinue
    & $svcExe uninstall | Out-Null
    for ($i = 0; $i -lt 20 -and (Get-Service $id -ErrorAction SilentlyContinue); $i++) { Start-Sleep -Seconds 1 }
  }
  Copy-Item $winsw $svcExe -Force
  $vars = ($variables.GetEnumerator() | ForEach-Object { "  <env name=`"$($_.Key)`" value=`"$($_.Value)`"/>" }) -join "`n"
  $dep = ($dependances | ForEach-Object { "  <depend>$_</depend>" }) -join "`n"
  Ecrire $svcXml @"
<service>
  <id>$id</id>
  <name>$nom</name>
  <description>$description</description>
  <executable>$exe</executable>
  <arguments>$arguments</arguments>
  <workingdirectory>$dossier</workingdirectory>
$vars
$dep
  <startmode>Automatic</startmode>
  <onfailure action="restart" delay="5 sec"/>
  <onfailure action="restart" delay="10 sec"/>
  <onfailure action="restart" delay="30 sec"/>
  <resetfailure>1 hour</resetfailure>
  <logpath>$JOURNAUX</logpath>
  <log mode="roll-by-size"><sizeThreshold>10240</sizeThreshold><keepFiles>5</keepFiles></log>
</service>
"@
  Lancer $svcExe @('install')
  Lancer $svcExe @('start')
}

Etape 'Service Windows du site'
InstallerService 'ovolina' 'Ovolina - site web' 'Site Ovolina (Node.js). Redémarre tout seul en cas de problème.' `
  $NODE 'src\index.js' "$SITE\server" @($PG_SERVICE) @{ NODE_ENV = 'production' }
if (-not (Attendre 'http://127.0.0.1:4000/api/site')) { Arret "Le site ne démarre pas. Journal : $JOURNAUX\ovolina-service.out.log" }
Info 'Le site tourne (service « ovolina »).'

# ---------- Caddy ----------
Etape 'Serveur web Caddy'
$caddyExe = Join-Path $OUTILS 'caddy.exe'
if (-not (Test-Path $caddyExe)) {
  $url = DerniereVersionGitHub 'caddyserver/caddy' '^caddy_[\d.]+_windows_amd64\.zip$'
  if (-not $url) { $url = 'https://github.com/caddyserver/caddy/releases/download/v2.8.4/caddy_2.8.4_windows_amd64.zip' }
  $zip = Telecharger $url ([IO.Path]::GetFileName($url))
  $tmp = Join-Path $TELECHARGEMENTS 'caddy'
  Expand-Archive $zip -DestinationPath $tmp -Force
  Copy-Item (Join-Path $tmp 'caddy.exe') $caddyExe -Force
}
Info "$(& $caddyExe version)"
$caddyfile = Join-Path $CADDY 'Caddyfile'
if (-not (Test-Path $caddyfile)) {
  Ecrire $caddyfile (Get-Content (Join-Path $SITE 'deploy\windows\Caddyfile.modele') -Raw).Replace('__ADRESSES__', ':80').Replace('__OPTIONS__', '').Replace('__REDIRECTION__', '')
  Info 'Site accessible par l''adresse IP du serveur, en HTTP (le HTTPS viendra avec le domaine).'
} else { Info 'Caddyfile existant conservé.' }
New-Item -ItemType Directory -Force -Path (Join-Path $CADDY 'donnees') | Out-Null
InstallerService 'ovolina-caddy' 'Ovolina - serveur web (Caddy)' 'Reçoit les visiteurs et les transmet au site. Gère le HTTPS.' `
  $caddyExe "run --config `"$caddyfile`" --adapter caddyfile" $CADDY @() @{ XDG_DATA_HOME = "$CADDY\donnees"; XDG_CONFIG_HOME = "$CADDY\donnees" }
if (-not (Attendre 'http://127.0.0.1/api/site')) { Arret "Caddy ne répond pas sur le port 80. Journal : $JOURNAUX\ovolina-caddy-service.err.log" }
Info 'Caddy répond sur le port 80.'

# ---------- Pare-feu ----------
Etape 'Pare-feu Windows'
if (-not (Get-NetFirewallRule -DisplayName 'Ovolina - Web' -ErrorAction SilentlyContinue)) {
  New-NetFirewallRule -DisplayName 'Ovolina - Web' -Direction Inbound -Protocol TCP -LocalPort 80, 443 -Action Allow | Out-Null
}
Info 'Ports 80 (HTTP) et 443 (HTTPS) ouverts. PostgreSQL (5432) et Node (4000) restent fermés à Internet.'

# ---------- Sauvegardes ----------
Etape 'Sauvegardes automatiques'
$action = New-ScheduledTaskAction -Execute 'powershell.exe' -Argument "-NoProfile -ExecutionPolicy Bypass -File `"$SITE\deploy\windows\sauvegarde.ps1`""
$declencheur = New-ScheduledTaskTrigger -Daily -At '03:15'
$principal = New-ScheduledTaskPrincipal -UserId 'SYSTEM' -LogonType ServiceAccount -RunLevel Highest
Register-ScheduledTask -TaskName 'Ovolina - sauvegarde' -Action $action -Trigger $declencheur -Principal $principal -Force | Out-Null
& powershell.exe -NoProfile -ExecutionPolicy Bypass -File "$SITE\deploy\windows\sauvegarde.ps1"
if ($LASTEXITCODE -ne 0) { Alerte 'Première sauvegarde impossible (voir le message ci-dessus).' }
else { Info "Première sauvegarde faite dans $SAUVEGARDES (puis chaque nuit à 3 h 15)." }

# ---------- Résumé ----------
$ip = try { (Invoke-RestMethod -Uri 'https://api.ipify.org' -UseBasicParsing -TimeoutSec 5) } catch { (Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.IPAddress -notlike '127.*' } | Select-Object -First 1).IPAddress }
$domaine = (Select-String -Path $caddyfile -Pattern '^\s*([a-z0-9.-]+\.[a-z]{2,})' -ErrorAction SilentlyContinue | Select-Object -First 1)
$adresse = if ($domaine) { "https://$($domaine.Matches[0].Groups[1].Value)" } else { "http://$ip" }
Write-Host ''
Write-Host '==============================================' -ForegroundColor Green
Write-Host '  Ovolina est en ligne' -ForegroundColor Green
Write-Host '==============================================' -ForegroundColor Green
Write-Host "  Site            : $adresse"
Write-Host "  Administration  : $adresse/admin   ($EmailAdmin)"
Write-Host ''
Write-Host "  Mettre à jour   : & $SITE\deploy\windows\mettre-a-jour.ps1"
Write-Host "  Relier le domaine : & $SITE\deploy\windows\lier-domaine.ps1 -Domaine ovolina.tn"
Write-Host "  Mot de passe admin oublié : & $SITE\deploy\windows\mot-de-passe.ps1"
Write-Host "  Journaux        : $JOURNAUX"
Write-Host "  Sauvegardes     : $SAUVEGARDES"
Write-Host ''
