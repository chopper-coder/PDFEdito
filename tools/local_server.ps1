param([int]$Port = 8765)

$ErrorActionPreference = 'Stop'
$Root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$RootFull = [System.IO.Path]::GetFullPath($Root).TrimEnd([char[]]@([System.IO.Path]::DirectorySeparatorChar, [System.IO.Path]::AltDirectorySeparatorChar))
$RootBoundary = $RootFull + [System.IO.Path]::DirectorySeparatorChar
$listener = New-Object System.Net.Sockets.TcpListener([System.Net.IPAddress]::Loopback, $Port)

function Get-MimeType([string]$Path) {
    switch ([System.IO.Path]::GetExtension($Path).ToLowerInvariant()) {
        '.html' { 'text/html; charset=utf-8' }
        '.js'   { 'text/javascript; charset=utf-8' }
        '.mjs'  { 'text/javascript; charset=utf-8' }
        '.css'  { 'text/css; charset=utf-8' }
        '.json' { 'application/json; charset=utf-8' }
        '.webmanifest' { 'application/manifest+json; charset=utf-8' }
        '.svg'  { 'image/svg+xml' }
        '.png'  { 'image/png' }
        '.jpg'  { 'image/jpeg' }
        '.jpeg' { 'image/jpeg' }
        '.gif'  { 'image/gif' }
        '.wasm' { 'application/wasm' }
        '.bcmap' { 'application/octet-stream' }
        '.pfb'  { 'application/octet-stream' }
        '.ttf'  { 'font/ttf' }
        '.otf'  { 'font/otf' }
        default { 'application/octet-stream' }
    }
}

function Write-BytesSafely($Stream, [byte[]]$Buffer) {
    if ($null -eq $Stream -or $null -eq $Buffer) { return $false }
    try {
        $Stream.Write($Buffer, 0, $Buffer.Length)
        return $true
    }
    catch [System.IO.IOException] {
        # Browsers may cancel speculative/preload requests or close a tab before
        # the response is fully written. This is a normal client disconnect.
        return $false
    }
    catch [System.Net.Sockets.SocketException] { return $false }
    catch [System.ObjectDisposedException] { return $false }
}

function Send-TextResponse($Stream, [int]$Code, [string]$Status, [string]$Text, [string]$Method = 'GET') {
    $body = [System.Text.Encoding]::UTF8.GetBytes($Text)
    $head = "HTTP/1.1 $Code $Status`r`nContent-Type: text/plain; charset=utf-8`r`nContent-Length: $($body.Length)`r`nCache-Control: no-store`r`nCross-Origin-Resource-Policy: same-origin`r`nX-Content-Type-Options: nosniff`r`nReferrer-Policy: no-referrer`r`nConnection: close`r`n`r`n"
    $hb = [System.Text.Encoding]::ASCII.GetBytes($head)
    if (-not (Write-BytesSafely $Stream $hb)) { return }
    if ($Method -ne 'HEAD') { [void](Write-BytesSafely $Stream $body) }
}

function Test-PathInsideRoot([string]$Path) {
    $full = [System.IO.Path]::GetFullPath($Path)
    return $full.Equals($RootFull, [System.StringComparison]::OrdinalIgnoreCase) -or $full.StartsWith($RootBoundary, [System.StringComparison]::OrdinalIgnoreCase)
}

try {
    try { $listener.Start() }
    catch { throw "Port $Port is already in use. Close the other GovPDF/local server and run Start_GovPDF_Editor.bat again. Fixed port is required so crash recovery stays on the same browser origin." }

    $url = "http://127.0.0.1:$Port/?v=364"
    Write-Host "GovPDF Editor Web V3.6.4 local server started" -ForegroundColor Green
    Write-Host "URL: $url"
    Write-Host "Close this window to stop the local server."
    Start-Process $url

    while ($true) {
        $client = $listener.AcceptTcpClient()
        $stream = $null
        $reader = $null
        try {
            $client.ReceiveTimeout = 5000
            $client.SendTimeout = 5000
            $stream = $client.GetStream()
            $reader = New-Object System.IO.StreamReader($stream, [System.Text.Encoding]::ASCII, $false, 4096, $true)
            $requestLine = $reader.ReadLine()
            if ([string]::IsNullOrWhiteSpace($requestLine) -or $requestLine.Length -gt 8192) { Send-TextResponse $stream 400 'Bad Request' '400 Bad Request'; continue }

            $headers = @{}
            for ($i=0; $i -lt 100; $i++) {
                $line = $reader.ReadLine()
                if ([string]::IsNullOrEmpty($line)) { break }
                if ($line.Length -gt 8192) { throw 'HTTP header line too long.' }
                $pos = $line.IndexOf(':')
                if ($pos -gt 0) { $headers[$line.Substring(0,$pos).Trim().ToLowerInvariant()] = $line.Substring($pos+1).Trim() }
            }

            $parts = $requestLine.Split(' ')
            if ($parts.Length -lt 2) { Send-TextResponse $stream 400 'Bad Request' '400 Bad Request'; continue }
            $method = $parts[0].ToUpperInvariant()
            if ($method -ne 'GET' -and $method -ne 'HEAD') { Send-TextResponse $stream 405 'Method Not Allowed' '405 Method Not Allowed' $method; continue }

            # IMPORTANT: $Host is a built-in read-only PowerShell variable.
            # Never assign request host data to $Host (PowerShell is case-insensitive).
            $requestHost = if ($headers.ContainsKey('host')) { [string]$headers['host'] } else { '' }
            $allowedHosts = @("127.0.0.1:$Port", "localhost:$Port")
            if ($allowedHosts -notcontains $requestHost.ToLowerInvariant()) { Send-TextResponse $stream 403 'Forbidden' '403 Invalid Host' $method; continue }

            $rawPath = $parts[1].Split('?')[0]
            try { $decoded = [System.Uri]::UnescapeDataString($rawPath) } catch { Send-TextResponse $stream 400 'Bad Request' '400 Invalid URL encoding' $method; continue }
            if ($decoded.IndexOf([char]0) -ge 0) { Send-TextResponse $stream 400 'Bad Request' '400 Invalid path' $method; continue }
            if ($decoded -eq '/') { $decoded = '/index.html' }
            $relative = $decoded.TrimStart('/').Replace('/', [System.IO.Path]::DirectorySeparatorChar)
            try { $file = [System.IO.Path]::GetFullPath((Join-Path $RootFull $relative)) }
            catch { Send-TextResponse $stream 400 'Bad Request' '400 Invalid path' $method; continue }

            if (-not (Test-PathInsideRoot $file) -or -not (Test-Path $file -PathType Leaf)) { Send-TextResponse $stream 404 'Not Found' '404 Not Found' $method; continue }

            $bytes = [System.IO.File]::ReadAllBytes($file)
            $mime = Get-MimeType $file
            $head = "HTTP/1.1 200 OK`r`nContent-Type: $mime`r`nContent-Length: $($bytes.Length)`r`nCache-Control: no-store, no-cache, must-revalidate`r`nPragma: no-cache`r`nCross-Origin-Resource-Policy: same-origin`r`nX-Content-Type-Options: nosniff`r`nReferrer-Policy: no-referrer`r`nContent-Security-Policy: default-src 'self'; script-src 'self' 'wasm-unsafe-eval'; worker-src 'self' blob:; style-src 'self' 'unsafe-inline'; img-src 'self' blob: data:; font-src 'self' data:; connect-src 'self'; object-src 'none'; base-uri 'none';`r`nConnection: close`r`n`r`n"
            $hb = [System.Text.Encoding]::ASCII.GetBytes($head)
            if (-not (Write-BytesSafely $stream $hb)) { continue }
            if ($method -ne 'HEAD') { [void](Write-BytesSafely $stream $bytes) }
        }
        catch [System.IO.IOException] {
            # Normal browser-side cancellation/disconnect. Do not warn.
        }
        catch [System.Net.Sockets.SocketException] {
            # Normal browser-side cancellation/disconnect. Do not warn.
        }
        catch [System.ObjectDisposedException] {
            # Connection already closed by client. Do not warn.
        }
        catch {
            Write-Warning "Request processing error: $($_.Exception.Message)"
        }
        finally {
            if ($null -ne $reader) { try { $reader.Dispose() } catch {} }
            if ($null -ne $stream) { try { $stream.Dispose() } catch {} }
            try { $client.Close() } catch {}
        }
    }
}
finally { try { $listener.Stop() } catch {} }
