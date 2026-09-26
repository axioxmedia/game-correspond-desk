$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot
Write-Host "=== Game Correspond Desk : build EXE ==="
$py = $null
foreach ($c in @("py -3", "python", "python3")) {
  try { & $c.Split(" ")[0] -c "print(1)" | Out-Null; $py = $c; break } catch {}
}
if (-not $py) { throw "Python 3.11+ not found" }
if (-not (Test-Path ".venv\Scripts\python.exe")) { iex "$py -m venv .venv" }
& ".venv\Scripts\python.exe" -m pip install -U pip
& ".venv\Scripts\python.exe" -m pip install -r requirements.txt -r requirements-build.txt
& ".venv\Scripts\python.exe" -m PyInstaller --noconfirm --clean GameCorrespondDesk.spec
Write-Host "EXE: $PWD\dist\GameCorrespondDesk.exe"
