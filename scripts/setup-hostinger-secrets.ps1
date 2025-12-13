param(
  [string]$Repo,
  [string]$SshKeyPath,
  [string]$HostingerHost,
  [string]$HostingerUser,
  [string]$HostingerPort = "22",
  [string]$HostingerTarget,
  [string]$HostingerDomain,
  [string]$WebOrigin,
  [string]$DatabaseUrl,
  [string]$OauthServerUrl,
  [string]$ViteOauthPortalUrl,
  [string]$ViteAppId,
  [string]$ViteServerOrigin,
  [string]$CookieSecret,
  [string]$JwtSecret,
  [string]$HostingerSshKeyContent,
  [string]$HostingerFtpHost,
  [string]$HostingerFtpUser,
  [string]$HostingerFtpPassword,
  [string]$HostingerFtpPort = "21",
  [string]$HostingerFtpTarget
)
$ErrorActionPreference = "Stop"
function EnsureGh {
  if (-not (Get-Command gh -ErrorAction SilentlyContinue)) {
    Write-Host "يرجى تثبيت gh (GitHub CLI) ثم إعادة المحاولة" -ForegroundColor Red
    exit 1
  }
}
function GetRepo {
  if ($Repo) { return $Repo }
  try {
    $r = gh repo view --json nameWithOwner -q ".nameWithOwner"
    if ($r) { return $r }
  } catch {}
  $r = Read-Host "أدخل اسم المستودع بصيغة owner/name"
  if (-not $r) {
    Write-Host "لم يتم تحديد مستودع" -ForegroundColor Red
    exit 1
  }
  return $r
}
function ReadOptional($prompt) { Read-Host $prompt }
function ReadRequired($prompt, $default) {
  while ($true) {
    $v = Read-Host "$prompt$([string]::IsNullOrEmpty($default) ? '' : " [$default]")"
    if (-not $v -and $default) { return $default }
    if ($v) { return $v }
    Write-Host "قيمة مطلوبة" -ForegroundColor Yellow
  }
}
function RandomSecret {
  [Convert]::ToBase64String([System.Security.Cryptography.RandomNumberGenerator]::GetBytes(32))
}
function SetSecret($repo, $name, $value) {
  if ([string]::IsNullOrEmpty($value)) { return }
  Write-Host "ضبط السر $name"
  $value | gh secret set $name --repo $repo --body -
}
EnsureGh
if (-not (gh auth status 2>$null)) {
  Write-Host "تنفيذ gh auth login لتسجيل الدخول" -ForegroundColor Yellow
  gh auth login
}
$repo = GetRepo
$host = $HostingerHost
if (-not $host) { $host = ReadRequired "HOSTINGER_HOST" "" }
$user = $HostingerUser
if (-not $user) { $user = ReadRequired "HOSTINGER_USER" "" }
$port = $HostingerPort
if (-not $port) { $port = ReadRequired "HOSTINGER_PORT" "22" }
$target = $HostingerTarget
if (-not $target) { $target = ReadRequired "HOSTINGER_TARGET (مسار الهدف على الخادم)" "" }
$domain = $HostingerDomain
if (-not $domain) { $domain = ReadRequired "HOSTINGER_DOMAIN (النطاق للتحقق الصحي)" "" }
$webOrigin = $WebOrigin
if (-not $webOrigin) { $webOrigin = ReadRequired "WEB_ORIGIN (مثل https://your-domain.com)" "" }
$dbUrl = $DatabaseUrl
if ($null -eq $dbUrl) { $dbUrl = ReadOptional "DATABASE_URL (اختياري)" }
$oauthServer = $OauthServerUrl
if ($null -eq $oauthServer) { $oauthServer = ReadOptional "OAUTH_SERVER_URL (اختياري)" }
$oauthPortal = $ViteOauthPortalUrl
if ($null -eq $oauthPortal) { $oauthPortal = ReadOptional "VITE_OAUTH_PORTAL_URL (اختياري)" }
$appId = $ViteAppId
if ($null -eq $appId) { $appId = ReadOptional "VITE_APP_ID (اختياري)" }
$serverOrigin = $ViteServerOrigin
if ($null -eq $serverOrigin) { $serverOrigin = ReadOptional "VITE_SERVER_ORIGIN (اختياري)" }
$cookieSecret = $CookieSecret
if (-not $cookieSecret) { $cookieSecret = RandomSecret }
$jwtSecret = $JwtSecret
if (-not $jwtSecret) { $jwtSecret = RandomSecret }
$sshKey = $HostingerSshKeyContent
if (-not $sshKey) {
  if ($SshKeyPath) {
    if (Test-Path $SshKeyPath) {
      $sshKey = Get-Content -Raw -Path $SshKeyPath
    } else {
      Write-Host "لم يتم العثور على ملف المفتاح الخاص في $SshKeyPath" -ForegroundColor Yellow
    }
  } else {
    $k = ReadOptional "ضع مسار المفتاح الخاص SSH (اختياري)"
    if ($k -and (Test-Path $k)) { $sshKey = Get-Content -Raw -Path $k }
  }
}
# FTP inputs
$ftpHost = $HostingerFtpHost
if ($null -eq $ftpHost) { $ftpHost = ReadOptional "HOSTINGER_FTP_HOST (اختياري)" }
$ftpUser = $HostingerFtpUser
if ($null -eq $ftpUser) { $ftpUser = ReadOptional "HOSTINGER_FTP_USER (اختياري)" }
$ftpPassword = $HostingerFtpPassword
if ($null -eq $ftpPassword) { $ftpPassword = ReadOptional "HOSTINGER_FTP_PASSWORD (اختياري)" }
$ftpPort = $HostingerFtpPort
if (-not $ftpPort) { $ftpPort = "21" }
$ftpTarget = $HostingerFtpTarget
if ($null -eq $ftpTarget) { $ftpTarget = ReadOptional "HOSTINGER_FTP_TARGET (اختياري، مثل /public_html)" }

SetSecret $repo "HOSTINGER_HOST" $host
SetSecret $repo "HOSTINGER_USER" $user
SetSecret $repo "HOSTINGER_PORT" $port
SetSecret $repo "HOSTINGER_TARGET" $target
SetSecret $repo "HOSTINGER_DOMAIN" $domain
SetSecret $repo "WEB_ORIGIN" $webOrigin
SetSecret $repo "DATABASE_URL" $dbUrl
SetSecret $repo "OAUTH_SERVER_URL" $oauthServer
SetSecret $repo "VITE_OAUTH_PORTAL_URL" $oauthPortal
SetSecret $repo "VITE_APP_ID" $appId
SetSecret $repo "VITE_SERVER_ORIGIN" $serverOrigin
SetSecret $repo "COOKIE_SECRET" $cookieSecret
SetSecret $repo "JWT_SECRET" $jwtSecret
SetSecret $repo "HOSTINGER_SSH_KEY" $sshKey
SetSecret $repo "HOSTINGER_FTP_HOST" $ftpHost
SetSecret $repo "HOSTINGER_FTP_USER" $ftpUser
SetSecret $repo "HOSTINGER_FTP_PASSWORD" $ftpPassword
SetSecret $repo "HOSTINGER_FTP_PORT" $ftpPort
SetSecret $repo "HOSTINGER_FTP_TARGET" $ftpTarget
Write-Host "تم ضبط الأسرار للمستودع $repo بنجاح"
