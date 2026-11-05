param([switch]$NoBrowser,[int]$Port=47863)
$ErrorActionPreference = 'Stop'
$taskAppRoot = $env:LAURA_APP_ROOT
if ([string]::IsNullOrWhiteSpace($taskAppRoot)) { $taskAppRoot = $PSScriptRoot }
$taskWebRoot = [IO.Path]::GetFullPath((Join-Path $taskAppRoot 'dist'))
if (!(Test-Path -LiteralPath (Join-Path $taskWebRoot 'index.html'))) { throw 'The dist folder is missing. Extract the complete ZIP before starting.' }
$taskWebPrefix = $taskWebRoot.TrimEnd([IO.Path]::DirectorySeparatorChar) + [IO.Path]::DirectorySeparatorChar
$taskListener = [Net.Sockets.TcpListener]::new([Net.IPAddress]::Loopback, $Port)
try { $taskListener.Start() } catch {
 $taskExistingUrl = 'http://127.0.0.1:' + $Port + '/'
 try { $taskExisting = Invoke-WebRequest -Uri $taskExistingUrl -UseBasicParsing -TimeoutSec 3 } catch { $taskExisting = $null }
 if ($taskExisting -and $taskExisting.Headers['X-LAURA-App'] -eq 'food-donation') {
  Write-Host ('LAURA Food Donation is already running: ' + $taskExistingUrl)
  if (!$NoBrowser) { Start-Process $taskExistingUrl }
  return
 }
 throw ('Port ' + $Port + ' is in use by another application. Close that application and try again. LAURA uses a stable address to preserve your saved NGOs.')
}
$taskPort = ([Net.IPEndPoint]$taskListener.LocalEndpoint).Port
$taskUrl = 'http://127.0.0.1:' + $taskPort + '/'
$taskMime = @{'.html'='text/html; charset=utf-8'; '.js'='application/javascript; charset=utf-8'; '.mjs'='application/javascript; charset=utf-8'; '.css'='text/css; charset=utf-8'; '.json'='application/json; charset=utf-8'; '.geojson'='application/geo+json; charset=utf-8'; '.png'='image/png'; '.jpg'='image/jpeg'; '.jpeg'='image/jpeg'; '.svg'='image/svg+xml'; '.ico'='image/x-icon'; '.woff2'='font/woff2'; '.txt'='text/plain; charset=utf-8'}
Write-Host ''
Write-Host 'LAURA Food Donation' -ForegroundColor Green
Write-Host ('Local app: ' + $taskUrl)
Write-Host 'Leave this window open while using the app. Close it to stop the server.'
Write-Host ''
if (!$NoBrowser) { Start-Process $taskUrl }
try {
 while ($true) {
  $taskClient = $taskListener.AcceptTcpClient()
  try {
   $taskClient.ReceiveTimeout = 5000
   $taskClient.SendTimeout = 10000
   $taskStream = $taskClient.GetStream()
   $taskReader = [IO.StreamReader]::new($taskStream, [Text.Encoding]::ASCII, $false, 8192, $true)
   $taskRequest = $taskReader.ReadLine()
   if ([string]::IsNullOrWhiteSpace($taskRequest) -or $taskRequest.Length -gt 8192) { continue }
   $taskParts = $taskRequest.Split(' ')
   if ($taskParts.Length -lt 2) { continue }
   $taskMethod = $taskParts[0]
   $taskHeaderBytes = 0
   $taskCookieHeader=''; $taskOriginHeader=''; $taskSetCookie=''
   while ($true) { $taskHeader = $taskReader.ReadLine(); if ([string]::IsNullOrEmpty($taskHeader)) { break }; $taskHeaderBytes += $taskHeader.Length; if ($taskHeader -match '^Cookie:\s*(.*)$') { $taskCookieHeader=$Matches[1] }; if ($taskHeader -match '^Origin:\s*(.*)$') { $taskOriginHeader=$Matches[1] }; if ($taskHeaderBytes -gt 32768) { throw 'Request headers too large.' } }
   $taskCode = '200 OK'
   $taskType = 'text/plain; charset=utf-8'
   if (($taskParts[1].Split('?')[0]) -eq '/api/visitors' -and $taskMethod -in @('GET','POST')) {
    $taskType='application/json; charset=utf-8'
    if ($taskOriginHeader -and $taskOriginHeader -ne $taskUrl.TrimEnd('/')) {
     $taskCode='403 Forbidden'; $taskBody=[Text.Encoding]::UTF8.GetBytes('{"error":"Cross-site requests are not accepted"}')
    } else {
     try {
      $taskVisitorFolder=Join-Path $taskAppRoot '.local'
      $taskVisitorFile=Join-Path $taskVisitorFolder 'visitors.json'
      $taskVisitorIds=@()
      if (Test-Path -LiteralPath $taskVisitorFile) {
       $taskVisitorState=ConvertFrom-Json ([IO.File]::ReadAllText($taskVisitorFile))
       if ($null -eq $taskVisitorState.browsers) { throw 'Invalid visitor data' }
       if ($taskVisitorState.browsers -isnot [System.Management.Automation.PSCustomObject]) { throw 'Invalid visitor data' }
       $taskVisitorIds=@($taskVisitorState.browsers.PSObject.Properties | Where-Object { $_.MemberType -eq 'NoteProperty' } | ForEach-Object { $_.Name })
      }
      if ($taskMethod -eq 'POST') {
       $taskVisitorId=''
       if ($taskCookieHeader -match '(?:^|;\s*)laura_visitor=([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})(?:;|$)') { $taskVisitorId=$Matches[1] }
       if (!$taskVisitorId) { $taskVisitorId=[guid]::NewGuid().ToString(); $taskSetCookie="Set-Cookie: laura_visitor=$taskVisitorId; Path=/; HttpOnly; SameSite=Lax; Max-Age=31536000`r`n" }
       if ($taskVisitorIds -notcontains $taskVisitorId) {
        $taskVisitorIds+=@($taskVisitorId)
        [IO.Directory]::CreateDirectory($taskVisitorFolder) | Out-Null
        $taskVisitorMap=@{}
        foreach ($taskKnownId in $taskVisitorIds) { $taskVisitorMap[$taskKnownId]=$true }
        $taskVisitorJson=ConvertTo-Json -Depth 3 -Compress @{browsers=$taskVisitorMap}
        [IO.File]::WriteAllText($taskVisitorFile+'.tmp',$taskVisitorJson)
        Move-Item -LiteralPath ($taskVisitorFile+'.tmp') -Destination $taskVisitorFile -Force
       }
      }
      $taskBody=[Text.Encoding]::UTF8.GetBytes(('{"visitors":'+$taskVisitorIds.Count+',"metric":"anonymous-browsers"}'))
     } catch {
      $taskSetCookie=''; $taskCode='503 Service Unavailable'; $taskBody=[Text.Encoding]::UTF8.GetBytes('{"error":"Visitor count temporarily unavailable"}')
     }
    }
   } elseif ($taskMethod -ne 'GET' -and $taskMethod -ne 'HEAD') {
    $taskCode = '405 Method Not Allowed'; $taskBody = [Text.Encoding]::UTF8.GetBytes('Only GET and HEAD are supported.')
   } else {
    $taskPath = [Uri]::UnescapeDataString(($taskParts[1].Split('?')[0])).TrimStart('/')
    if ([string]::IsNullOrEmpty($taskPath)) { $taskPath = 'index.html' }
    $taskFile = [IO.Path]::GetFullPath((Join-Path $taskWebRoot $taskPath.Replace('/',[IO.Path]::DirectorySeparatorChar)))
    if (!$taskFile.StartsWith($taskWebPrefix, [StringComparison]::OrdinalIgnoreCase)) {
     $taskCode='403 Forbidden'; $taskBody=[Text.Encoding]::UTF8.GetBytes('Forbidden')
    } elseif (!(Test-Path -LiteralPath $taskFile -PathType Leaf)) {
     $taskCode='404 Not Found'; $taskBody=[Text.Encoding]::UTF8.GetBytes('File not found')
    } else {
     $taskBody=[IO.File]::ReadAllBytes($taskFile)
     $taskExtension=[IO.Path]::GetExtension($taskFile).ToLowerInvariant()
     if ($taskMime.ContainsKey($taskExtension)) { $taskType=$taskMime[$taskExtension] } else { $taskType='application/octet-stream' }
    }
   }
   $taskResponse = "HTTP/1.1 $taskCode`r`nContent-Type: $taskType`r`nContent-Length: $($taskBody.Length)`r`nConnection: close`r`n${taskSetCookie}Cache-Control: no-cache`r`nX-Content-Type-Options: nosniff`r`nX-LAURA-App: food-donation`r`n`r`n"
   $taskResponseBytes = [Text.Encoding]::ASCII.GetBytes($taskResponse)
   $taskStream.Write($taskResponseBytes,0,$taskResponseBytes.Length)
   if ($taskMethod -ne 'HEAD') { $taskStream.Write($taskBody,0,$taskBody.Length) }
   $taskStream.Flush()
  } catch { Write-Verbose $_.Exception.Message } finally { $taskClient.Close() }
 }
} finally { $taskListener.Stop() }
