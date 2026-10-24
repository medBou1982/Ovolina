<# Crée un compte administrateur du site ou change un mot de passe oublié.
   Dans PowerShell « en tant qu'administrateur » :  & C:\Ovolina\site\deploy\windows\mot-de-passe.ps1 #>
param([string]$Racine = 'C:\Ovolina')
$env:Path = [Environment]::GetEnvironmentVariable('Path', 'Machine') + ';' + [Environment]::GetEnvironmentVariable('Path', 'User')
Push-Location (Join-Path $Racine 'site\server')
try { & node db\mot-de-passe.js } finally { Pop-Location }
