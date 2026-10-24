<# Sauvegarde quotidienne : base PostgreSQL + photos envoyées depuis l'administration.
   Lancée chaque nuit à 3 h 15 par la tâche planifiée « Ovolina - sauvegarde ».
   Les 14 dernières sauvegardes sont gardées dans C:\Ovolina\sauvegardes. #>
param([string]$Racine = 'C:\Ovolina', [int]$Garder = 14)
$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'

$SITE = Join-Path $Racine 'site'
$DOSSIER = Join-Path $Racine 'sauvegardes'
$PG_BIN = 'C:\Program Files\PostgreSQL\16\bin'
$date = Get-Date -Format 'yyyy-MM-dd_HHmm'
New-Item -ItemType Directory -Force -Path $DOSSIER | Out-Null

# Identifiants de la base lus dans server\.env (postgres://ovolina:motdepasse@hote:port/base)
$url = (Select-String -Path (Join-Path $SITE 'server\.env') -Pattern '^DATABASE_URL=(.+)$').Matches[0].Groups[1].Value
if ($url -notmatch '^postgres(ql)?://([^:]+):([^@]+)@([^:/]+):?(\d*)/(.+)$') { throw 'DATABASE_URL illisible dans server\.env' }
$env:PGPASSWORD = [Uri]::UnescapeDataString($Matches[3])
$port = if ($Matches[5]) { $Matches[5] } else { '5432' }

$fichierBase = Join-Path $DOSSIER "base_$date.dump"
& "$PG_BIN\pg_dump.exe" -Fc -h $Matches[4] -p $port -U $Matches[2] -d $Matches[6] -f $fichierBase
if ($LASTEXITCODE -ne 0) { throw "pg_dump a échoué (code $LASTEXITCODE)" }
Remove-Item Env:PGPASSWORD

$fichierPhotos = Join-Path $DOSSIER "photos_$date.zip"
Compress-Archive -Path (Join-Path $SITE 'server\uploads\*') -DestinationPath $fichierPhotos -Force

foreach ($motif in 'base_*.dump', 'photos_*.zip') {
  Get-ChildItem $DOSSIER -Filter $motif | Sort-Object LastWriteTime -Descending | Select-Object -Skip $Garder | Remove-Item -Force
}
Write-Host "Sauvegarde terminée : $fichierBase et $fichierPhotos"
