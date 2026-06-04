param(
  [int]$Port = 0
)

$ErrorActionPreference = 'Stop'

$root = Resolve-Path (Join-Path $PSScriptRoot '..')
$python = Get-Command python -ErrorAction SilentlyContinue
if (-not $python) {
  Write-Error 'python not found in PATH.'
  exit 1
}

$port = if ($Port -gt 0) { $Port } else { Get-Random -Minimum 8000 -Maximum 8999 }
$serverArgs = "-m http.server $port --bind 127.0.0.1"
$server = Start-Process -FilePath $python.Source -ArgumentList $serverArgs -WorkingDirectory $root -PassThru -WindowStyle Hidden

$stdoutFile = [IO.Path]::GetTempFileName()
$stderrFile = [IO.Path]::GetTempFileName()

try {
  Start-Sleep -Milliseconds 800

  $browserCandidates = @(
    "$env:ProgramFiles\Google\Chrome\Application\chrome.exe",
    "$env:ProgramFiles(x86)\Google\Chrome\Application\chrome.exe",
    "$env:ProgramFiles\Microsoft\Edge\Application\msedge.exe",
    "$env:ProgramFiles(x86)\Microsoft\Edge\Application\msedge.exe"
  )

  $browser = $browserCandidates | Where-Object { Test-Path $_ } | Select-Object -First 1
  if (-not $browser) {
    throw 'No supported browser found (Chrome/Edge).'
  }

  $url = "http://127.0.0.1:$port/tests/index.html"
  $browserArgs = @('--headless', '--disable-gpu', '--virtual-time-budget=5000', '--dump-dom', $url)

  $proc = Start-Process -FilePath $browser -ArgumentList $browserArgs -NoNewWindow -Wait -PassThru `
    -RedirectStandardOutput $stdoutFile -RedirectStandardError $stderrFile

  $output = Get-Content -Path $stdoutFile -Raw
  $errorOutput = Get-Content -Path $stderrFile -Raw

  if ($proc.ExitCode -ne 0) {
    $suffix = if ($errorOutput) { " $errorOutput" } else { '' }
    throw "Browser exited with code $($proc.ExitCode).$suffix"
  }

  if ($output -match 'id="summary" class="pass"' -or $output -match 'id="summary" data-status="pass"') {
    Write-Host 'Tests passed.'
    exit 0
  }

  Write-Error 'Tests failed. Open tests/index.html for details.'
  exit 1
} finally {
  if ($server) {
    Stop-Process -Id $server.Id -ErrorAction SilentlyContinue
  }
  Remove-Item -Path $stdoutFile, $stderrFile -ErrorAction SilentlyContinue
}
