<# Met le site en ligne à jour avec la dernière version de GitHub.
   Dans PowerShell « en tant qu'administrateur » :  & C:\Ovolina\site\deploy\windows\mettre-a-jour.ps1
   Ajoutez -Forcer pour tout reconstruire même si rien n'a changé. #>
param([string]$Racine = 'C:\Ovolina', [switch]$Forcer)
$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'
$SITE = Join-Path $Racine 'site'
function Etape($t) { Write-Host ''; Write-Host "> $t" -ForegroundColor Green }
function Lancer($exe, [string[]]$arguments) { & $exe @arguments; if ($LASTEXITCODE -ne 0) { throw "$exe a échoué (code $LASTEXITCODE)" } }
function Attendre($url) { for ($i = 0; $i -lt 60; $i++) { try { if ((Invoke-WebRequest $url -UseBasicParsing -TimeoutSec 5).StatusCode -eq 200) { return $true } } catch {}; Start-Sleep 1 }; $false }

$admin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $admin) { throw 'Ouvrez PowerShell « en tant qu''administrateur ».' }
$env:Path = [Environment]::GetEnvironmentVariable('Path', 'Machine') + ';' + [Environment]::GetEnvironmentVariable('Path', 'User')
$GIT = (Get-Command git).Source
$NPM = (Get-Command npm.cmd).Source

Etape 'Sauvegarde avant mise à jour'
try { & (Join-Path $SITE 'deploy\windows\sauvegarde.ps1') -Racine $Racine } catch { Write-Host "  (sauvegarde impossible : $_ ; on continue)" -ForegroundColor Yellow }

Etape 'Récupération de la dernière version'
$avant = & $GIT -C $SITE rev-parse --short HEAD
Lancer $GIT @('-C', $SITE, 'pull', '--ff-only')
$apres = & $GIT -C $SITE rev-parse --short HEAD
if ($avant -eq $apres -and -not $Forcer) { Write-Host "Déjà à jour ($apres). Rien à faire. (Ajoutez -Forcer pour tout reconstruire.)"; exit 0 }

Etape 'Compilation du site'
Lancer $NPM @('--prefix', "$SITE\client", 'install', '--no-audit', '--no-fund')
Lancer $NPM @('--prefix', "$SITE\client", 'run', 'build')

Etape 'Mise à jour du serveur (coupure d''environ une minute)'
Stop-Service ovolina -Force
try { Lancer $NPM @('--prefix', "$SITE\server", 'install', '--omit=dev', '--no-audit', '--no-fund') }
finally { Start-Service ovolina }

if ((Attendre 'http://127.0.0.1:4000/api/site') -and (Attendre 'http://127.0.0.1/api/site')) {
  Write-Host ''; Write-Host "Site à jour : $avant -> $apres" -ForegroundColor Green
} else {
  throw "Le site ne répond pas. Journaux : $Racine\journaux"
}
