param(
    [switch]$Force,
    [switch]$VerifyOnly
)

$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'
try { [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12 } catch {}

$Root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$Vendor = Join-Path $Root 'vendor'
$Licenses = Join-Path $Root 'LICENSES'
$Temp = Join-Path $env:TEMP ("GovPDF_Core_" + [Guid]::NewGuid().ToString('N'))
$ManifestPath = Join-Path $Vendor 'CORE_FILES.sha256'

$PdfJsVersion = '6.2.108'
$PdfLibVersion = '1.17.1'
$JsZipVersion = '3.10.1'

# Fixed npm package integrity (SHA-512 SRI), pinned to exact package versions.
$PdfJsSri = 'sha512-YxFb+SQcodN2rnX9Tn3dHYlqfb7NjlzzfONPpJd+AKoKtUjEdevTfbC07d5TcczzOK6261auRkP/M8OBHs9vFQ=='
$PdfLibSri = 'sha512-V/mpyJAoTsN4cnP31vc0wfNA1+p20evqqnap0KLoRUN0Yk/p3wN52DOEsL4oBFcLdb76hlpKPtzJIgo67j/XLw=='
$JsZipSri = 'sha512-xXDvecyTpGLrqFrvkrUSoxxfJI5AH7U8zxxtVclpsUtMCq4JQ290LY8AW5c7Ggnr/Y/oK+bQMbqK2qmtk3pN4g=='

function Write-Step([string]$Text) {
    Write-Host "`n==> $Text" -ForegroundColor Cyan
}

function Get-Sha512Sri([string]$Path) {
    $sha = [System.Security.Cryptography.SHA512]::Create()
    try {
        $stream = [IO.File]::OpenRead($Path)
        try {
            $bytes = $sha.ComputeHash($stream)
        }
        finally {
            $stream.Dispose()
        }
        return 'sha512-' + [Convert]::ToBase64String($bytes)
    }
    finally {
        $sha.Dispose()
    }
}

function Get-Sha256Hex([string]$Path) {
    return (Get-FileHash -Algorithm SHA256 -LiteralPath $Path).Hash.ToLowerInvariant()
}

function Download-Verified([string[]]$Urls, [string]$Output, [string]$ExpectedSri) {
    $last = $null
    foreach ($u in $Urls) {
        try {
            Write-Host "Download: $u"
            Invoke-WebRequest -Uri $u -OutFile $Output -UseBasicParsing -TimeoutSec 60
            if (-not (Test-Path $Output) -or ((Get-Item $Output).Length -le 100)) {
                throw 'Downloaded file is empty or too small.'
            }
            $actual = Get-Sha512Sri $Output
            if ($actual -ne $ExpectedSri) {
                Remove-Item $Output -Force -ErrorAction SilentlyContinue
                throw "Integrity mismatch. Expected $ExpectedSri but got $actual"
            }
            Write-Host 'Package integrity: OK (SHA-512)' -ForegroundColor Green
            return
        }
        catch {
            $last = $_
            Remove-Item $Output -Force -ErrorAction SilentlyContinue
            Write-Warning "Verified download failed, trying next pinned registry: $($_.Exception.Message)"
        }
    }
    throw "All verified package sources failed. Last error: $last"
}

function Copy-DirIfExists([string]$Source, [string]$Destination) {
    if (Test-Path $Source) {
        if (Test-Path $Destination) {
            Remove-Item $Destination -Recurse -Force
        }
        Copy-Item $Source $Destination -Recurse -Force
    }
}

$CoreFiles = @('pdf.min.mjs', 'pdf.worker.min.mjs', 'pdf-lib.min.js', 'jszip.min.js')
$CoreDirs = @('cmaps', 'standard_fonts', 'wasm', 'iccs')

function Write-CoreManifest {
    $lines = @()
    foreach ($name in $CoreFiles) {
        $f = Join-Path $Vendor $name
        if (-not (Test-Path $f -PathType Leaf)) {
            throw "Missing core file: $name"
        }
        $lines += ("{0}  {1}" -f (Get-Sha256Hex $f), $name)
    }
    Set-Content -LiteralPath $ManifestPath -Encoding ASCII -Value $lines
}

function Test-CoreIntegrity {
    param([switch]$Quiet)

    try {
        if (-not (Test-Path $ManifestPath -PathType Leaf)) {
            throw 'CORE_FILES.sha256 is missing.'
        }

        $versionFile = Join-Path $Vendor 'CORE_VERSION.txt'
        if (-not (Test-Path $versionFile -PathType Leaf)) {
            throw 'CORE_VERSION.txt is missing.'
        }

        $versionText = Get-Content -LiteralPath $versionFile -Raw
        foreach ($token in @("PDF.js $PdfJsVersion", "pdf-lib $PdfLibVersion", "JSZip $JsZipVersion")) {
            if ($versionText -notmatch [regex]::Escape($token)) {
                throw "Core version mismatch: $token"
            }
        }

        $expected = @{}
        foreach ($line in Get-Content -LiteralPath $ManifestPath) {
            if ($line -match '^([0-9a-fA-F]{64})\s{2}(.+)$') {
                $expected[$matches[2]] = $matches[1].ToLowerInvariant()
            }
        }

        foreach ($name in $CoreFiles) {
            $f = Join-Path $Vendor $name
            if (-not (Test-Path $f -PathType Leaf)) {
                throw "Missing core file: $name"
            }
            if (-not $expected.ContainsKey($name)) {
                throw "Missing SHA-256 manifest entry: $name"
            }
            $actual = Get-Sha256Hex $f
            if ($actual -ne $expected[$name]) {
                throw "Core SHA-256 mismatch: $name"
            }
        }

        foreach ($dir in $CoreDirs) {
            $d = Join-Path $Vendor $dir
            if (-not (Test-Path $d -PathType Container)) {
                throw "Missing core directory: $dir"
            }
            $firstFile = Get-ChildItem -LiteralPath $d -Recurse -File -ErrorAction SilentlyContinue | Select-Object -First 1
            if ($null -eq $firstFile) {
                throw "Core directory is empty: $dir"
            }
        }

        if (-not $Quiet) {
            Write-Host 'Installed vendor core integrity: OK (SHA-256 manifest + required resources)' -ForegroundColor Green
        }
        return $true
    }
    catch {
        if (-not $Quiet) {
            Write-Host "Installed vendor core integrity FAILED: $($_.Exception.Message)" -ForegroundColor Red
        }
        return $false
    }
}

if ($VerifyOnly) {
    if (Test-CoreIntegrity) {
        exit 0
    }
    exit 2
}

try {
    New-Item -ItemType Directory -Force -Path $Vendor, $Licenses, $Temp | Out-Null

    if (-not $Force -and (Test-CoreIntegrity -Quiet)) {
        Write-Host 'Offline core already exists and passed integrity verification.' -ForegroundColor Green
        exit 0
    }

    $tar = Get-Command tar.exe -ErrorAction SilentlyContinue
    if (-not $tar) {
        throw 'Windows tar.exe is required for verified offline-core installation. Windows 10/11 normally includes tar.exe.'
    }

    Write-Step "Download PDF.js $PdfJsVersion"
    $pdfTgz = Join-Path $Temp 'pdfjs.tgz'
    Download-Verified @(
        "https://registry.npmjs.org/pdfjs-dist/-/pdfjs-dist-$PdfJsVersion.tgz",
        "https://registry.npmmirror.com/pdfjs-dist/-/pdfjs-dist-$PdfJsVersion.tgz"
    ) $pdfTgz $PdfJsSri
    $pdfOut = Join-Path $Temp 'pdfjs'
    New-Item -ItemType Directory -Force -Path $pdfOut | Out-Null
    & $tar.Source -xzf $pdfTgz -C $pdfOut
    if ($LASTEXITCODE -ne 0) { throw 'PDF.js extraction failed.' }
    $pdfPkg = Join-Path $pdfOut 'package'
    Copy-Item (Join-Path $pdfPkg 'build/pdf.min.mjs') (Join-Path $Vendor 'pdf.min.mjs') -Force
    Copy-Item (Join-Path $pdfPkg 'build/pdf.worker.min.mjs') (Join-Path $Vendor 'pdf.worker.min.mjs') -Force
    Copy-DirIfExists (Join-Path $pdfPkg 'cmaps') (Join-Path $Vendor 'cmaps')
    Copy-DirIfExists (Join-Path $pdfPkg 'standard_fonts') (Join-Path $Vendor 'standard_fonts')
    Copy-DirIfExists (Join-Path $pdfPkg 'wasm') (Join-Path $Vendor 'wasm')
    Copy-DirIfExists (Join-Path $pdfPkg 'iccs') (Join-Path $Vendor 'iccs')
    if (Test-Path (Join-Path $pdfPkg 'LICENSE')) {
        Copy-Item (Join-Path $pdfPkg 'LICENSE') (Join-Path $Licenses 'PDFJS_LICENSE.txt') -Force
    }

    Write-Step "Download pdf-lib $PdfLibVersion"
    $libTgz = Join-Path $Temp 'pdf-lib.tgz'
    Download-Verified @(
        "https://registry.npmjs.org/pdf-lib/-/pdf-lib-$PdfLibVersion.tgz",
        "https://registry.npmmirror.com/pdf-lib/-/pdf-lib-$PdfLibVersion.tgz"
    ) $libTgz $PdfLibSri
    $libOut = Join-Path $Temp 'pdf-lib'
    New-Item -ItemType Directory -Force -Path $libOut | Out-Null
    & $tar.Source -xzf $libTgz -C $libOut
    if ($LASTEXITCODE -ne 0) { throw 'pdf-lib extraction failed.' }
    $libPkg = Join-Path $libOut 'package'
    Copy-Item (Join-Path $libPkg 'dist/pdf-lib.min.js') (Join-Path $Vendor 'pdf-lib.min.js') -Force
    if (Test-Path (Join-Path $libPkg 'LICENSE.md')) {
        Copy-Item (Join-Path $libPkg 'LICENSE.md') (Join-Path $Licenses 'PDFLIB_LICENSE.txt') -Force
    }

    Write-Step "Download JSZip $JsZipVersion"
    $zipTgz = Join-Path $Temp 'jszip.tgz'
    Download-Verified @(
        "https://registry.npmjs.org/jszip/-/jszip-$JsZipVersion.tgz",
        "https://registry.npmmirror.com/jszip/-/jszip-$JsZipVersion.tgz"
    ) $zipTgz $JsZipSri
    $zipOut = Join-Path $Temp 'jszip'
    New-Item -ItemType Directory -Force -Path $zipOut | Out-Null
    & $tar.Source -xzf $zipTgz -C $zipOut
    if ($LASTEXITCODE -ne 0) { throw 'JSZip extraction failed.' }
    $zipPkg = Join-Path $zipOut 'package'
    Copy-Item (Join-Path $zipPkg 'dist/jszip.min.js') (Join-Path $Vendor 'jszip.min.js') -Force
    if (Test-Path (Join-Path $zipPkg 'LICENSE.markdown')) {
        Copy-Item (Join-Path $zipPkg 'LICENSE.markdown') (Join-Path $Licenses 'JSZIP_LICENSE.txt') -Force
    }

    $checks = @{
        'pdf.min.mjs'        = 100000
        'pdf.worker.min.mjs' = 300000
        'pdf-lib.min.js'     = 100000
        'jszip.min.js'       = 50000
    }
    foreach ($kv in $checks.GetEnumerator()) {
        $f = Join-Path $Vendor $kv.Key
        if (-not (Test-Path $f)) { throw "Missing core file: $($kv.Key)" }
        if ((Get-Item $f).Length -lt $kv.Value) { throw "Core file size is invalid: $($kv.Key)" }
    }
    foreach ($dir in $CoreDirs) {
        $d = Join-Path $Vendor $dir
        if (-not (Test-Path $d -PathType Container)) { throw "Missing PDF.js resource directory: $dir" }
    }

    Set-Content -Path (Join-Path $Vendor 'CORE_VERSION.txt') -Encoding UTF8 -Value @(
        "PDF.js $PdfJsVersion",
        "pdf-lib $PdfLibVersion",
        "JSZip $JsZipVersion",
        "Prepared: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"
    )
    Write-CoreManifest

    if (-not (Test-CoreIntegrity)) {
        throw 'Installed core failed post-install integrity verification.'
    }

    Write-Host "`nOffline PDF core is ready and verified." -ForegroundColor Green
    Write-Host "Location: $Vendor"
    Write-Host 'Core preparation complete. Startup will continue automatically when launched from Start_GovPDF_Editor.bat.'
}
catch {
    Write-Host "`nCore preparation failed: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host 'Files with an unexpected pinned package SHA-512 hash are rejected.'
    exit 1
}
finally {
    if (Test-Path $Temp) {
        Remove-Item $Temp -Recurse -Force -ErrorAction SilentlyContinue
    }
}
