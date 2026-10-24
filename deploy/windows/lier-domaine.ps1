<# Relie un nom de domaine au site, avec HTTPS automatique (certificat Let's Encrypt renouvelé par Caddy).
   1. Chez votre fournisseur de domaine, faites pointer le domaine (enregistrement A) vers l'adresse IP de ce serveur.
   2. Dans PowerShell « en tant qu'administrateur » :
        & C:\Ovolina\site\deploy\windows\lier-domaine.ps1 -Domaine ovolina.tn -Email contact@ovolina.com
   Pour revenir à l'accès par adresse IP : -Domaine ip #>
param(
  [Parameter(Mandatory = $true)][string]$Domaine,
  [string]$Email,
  [string]$Racine = 'C:\Ovolina',
  [switch]$SansVerificationDns
)
$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'
$SITE = Join-Path $Racine 'site'
$caddyfile = Join-Path $Racine 'caddy\Caddyfile'
function Ecrire($chemin, $texte) { [IO.File]::WriteAllText($chemin, $texte, (New-Object Text.UTF8Encoding $false)) }

$Domaine = $Domaine.Trim().ToLower() -replace '^https?://', '' -replace '^www\.', '' -replace '/.*$', ''
$modele = Get-Content (Join-Path $SITE 'deploy\windows\Caddyfile.modele') -Raw

if ($Domaine -eq 'ip') {
  $texte = $modele.Replace('__ADRESSES__', ':80').Replace('__OPTIONS__', '').Replace('__REDIRECTION__', '')
  $adresse = 'http://<adresse IP du serveur>'
} else {
  $ip = try { Invoke-RestMethod 'https://api.ipify.org' -UseBasicParsing -TimeoutSec 5 } catch { $null }
  $adresses = @($Domaine)
  foreach ($d in @($Domaine, "www.$Domaine")) {
    $dns = try { (Resolve-DnsName $d -Type A -ErrorAction Stop | Where-Object { $_.IPAddress } | Select-Object -First 1).IPAddress } catch { $null }
    if ($d -eq $Domaine -and -not $SansVerificationDns -and $ip -and $dns -ne $ip) {
      throw "$d pointe vers « $dns » au lieu de ce serveur ($ip). Corrigez le DNS, attendez quelques minutes, puis relancez."
    }
    if ($d -ne $Domaine -and $dns -and $dns -eq $ip) { $adresses += $d }
  }
  $options = if ($Email) { "{`n`temail $Email`n}`n" } else { '' }
  # Quelqu'un qui tape l'adresse IP est renvoyé vers le domaine
  $redirection = ":80 {`n`tredir https://$Domaine{uri} permanent`n}"
  $texte = $modele.Replace('__ADRESSES__', ($adresses -join ', ')).Replace('__OPTIONS__', $options).Replace('__REDIRECTION__', $redirection)
  $adresse = "https://$Domaine"
}

Copy-Item $caddyfile "$caddyfile.precedent" -Force -ErrorAction SilentlyContinue
Ecrire $caddyfile $texte
& (Join-Path $Racine 'outils\caddy.exe') validate --config $caddyfile --adapter caddyfile
if ($LASTEXITCODE -ne 0) {
  Copy-Item "$caddyfile.precedent" $caddyfile -Force
  throw 'Configuration refusée par Caddy : l''ancienne est remise en place.'
}
Restart-Service ovolina-caddy
Write-Host ''
Write-Host "Domaine relié : $adresse" -ForegroundColor Green
Write-Host '  Le certificat HTTPS est obtenu automatiquement dans la minute (et renouvelé tout seul).'
