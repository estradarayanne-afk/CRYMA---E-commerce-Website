[CmdletBinding()]
param(
    [switch] $ValidateOnly
)

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot '../..')).Path
$backendRoot = (Resolve-Path (Join-Path $repoRoot 'backend')).Path
$qaEnvFile = Join-Path $backendRoot '.env.qa'
$exampleFile = Join-Path $backendRoot '.env.qa.example'
$configCache = Join-Path $backendRoot 'bootstrap/cache/config.php'
$localAppData = [Environment]::GetFolderPath([Environment+SpecialFolder]::LocalApplicationData)
if ([string]::IsNullOrWhiteSpace($localAppData)) {
    throw 'LocalAppData could not be resolved; refusing QA validation.'
}

$qaRoot = [IO.Path]::GetFullPath((Join-Path $localAppData 'CRYMA-QA'))
$expectedDatabase = [IO.Path]::GetFullPath((Join-Path $qaRoot 'database.sqlite'))
$existingDatabase = [IO.Path]::GetFullPath((Join-Path $backendRoot 'database/database.sqlite'))
$qaStorage = [IO.Path]::GetFullPath((Join-Path $qaRoot 'storage'))

function Assert-NoReparsePointInExistingPath([string] $Path) {
    $current = [IO.Path]::GetFullPath($Path)
    while (-not [string]::IsNullOrWhiteSpace($current)) {
        if (Test-Path -LiteralPath $current) {
            $item = Get-Item -LiteralPath $current -Force
            if (($item.Attributes -band [IO.FileAttributes]::ReparsePoint) -ne 0) {
                throw "Refusing a QA path containing a junction/symlink/reparse point: $current"
            }
        }
        $parent = [IO.Directory]::GetParent($current)
        if ($null -eq $parent) { break }
        $current = $parent.FullName
    }
}

Assert-NoReparsePointInExistingPath $qaRoot
Assert-NoReparsePointInExistingPath $expectedDatabase
Assert-NoReparsePointInExistingPath $qaStorage

function Test-PathWithinDirectory([string] $Candidate, [string] $Directory) {
    $candidateFull = [IO.Path]::GetFullPath($Candidate).TrimEnd([IO.Path]::DirectorySeparatorChar, [IO.Path]::AltDirectorySeparatorChar)
    $directoryFull = [IO.Path]::GetFullPath($Directory).TrimEnd([IO.Path]::DirectorySeparatorChar, [IO.Path]::AltDirectorySeparatorChar)
    $prefix = $directoryFull + [IO.Path]::DirectorySeparatorChar
    return $candidateFull.StartsWith($prefix, [StringComparison]::OrdinalIgnoreCase)
}

function Convert-ToCanonicalPath([string] $Value, [string] $BaseDirectory) {
    if ([string]::IsNullOrWhiteSpace($Value)) { throw 'A required QA path is empty.' }
    $expanded = $Value.Trim().Trim('"').Trim("'")
    $expanded = [regex]::Replace($expanded, '\$\{([A-Za-z_][A-Za-z0-9_]*)\}', {
        param($match)
        $variable = [Environment]::GetEnvironmentVariable($match.Groups[1].Value, 'Process')
        if ([string]::IsNullOrWhiteSpace($variable)) { throw "Environment variable $($match.Groups[1].Value) is unavailable." }
        return $variable
    })
    $expanded = [Environment]::ExpandEnvironmentVariables($expanded)
    if (-not [IO.Path]::IsPathRooted($expanded)) {
        $expanded = Join-Path $BaseDirectory $expanded
    }
    return [IO.Path]::GetFullPath($expanded)
}

if (-not (Test-Path -LiteralPath $qaEnvFile -PathType Leaf)) {
    if (Test-Path -LiteralPath $exampleFile -PathType Leaf) {
        throw 'Missing backend/.env.qa. Copy backend/.env.qa.example to backend/.env.qa, then review its QA-only paths and settings. No fallback to backend/.env is allowed.'
    }
    throw 'Missing backend/.env.qa.example; refusing to continue.'
}

if (Test-Path -LiteralPath $configCache -PathType Leaf) {
    throw 'Laravel config cache exists. Remove/rebuild it only through a separately reviewed QA-only procedure; this guard will not trust cached configuration.'
}

# Parse only the simple KEY=VALUE template format. Laravel's resolved config,
# not these text values, is authoritative in the subsequent read-only check.
$envValues = @{}
foreach ($line in Get-Content -LiteralPath $qaEnvFile) {
    if ($line -match '^\s*([A-Z][A-Z0-9_]*)\s*=\s*(.*?)\s*$') {
        $value = $Matches[2].Trim().Trim('"').Trim("'")
        $value = [Environment]::ExpandEnvironmentVariables($value)
        $envValues[$Matches[1]] = $value
    }
}

if ($envValues['APP_ENV'] -cne 'qa') { throw 'backend/.env.qa must set APP_ENV=qa exactly.' }
if ($envValues['DB_CONNECTION'] -cne 'sqlite') { throw 'backend/.env.qa must set DB_CONNECTION=sqlite exactly.' }
if (-not [string]::IsNullOrWhiteSpace($envValues['DB_URL'])) { throw 'DB_URL must be empty; URL configuration could override the isolated SQLite target.' }
if ($envValues['CACHE_STORE'] -cne 'array') { throw 'CACHE_STORE must be array.' }
if ($envValues['SESSION_DRIVER'] -cne 'array') { throw 'SESSION_DRIVER must be array.' }
if ($envValues['QUEUE_CONNECTION'] -cne 'sync') { throw 'QUEUE_CONNECTION must be sync.' }
if ($envValues['MAIL_MAILER'] -cne 'array') { throw 'MAIL_MAILER must be array so messages are not delivered.' }

$configuredDatabase = Convert-ToCanonicalPath $envValues['DB_DATABASE'] $backendRoot
if (-not (Test-PathWithinDirectory $configuredDatabase $qaRoot)) {
    throw "Database path is outside the approved QA directory: $configuredDatabase"
}
if ([string]::Equals($configuredDatabase, $existingDatabase, [StringComparison]::OrdinalIgnoreCase)) {
    throw 'The existing local application database is explicitly prohibited.'
}
if (-not [string]::Equals($configuredDatabase, $expectedDatabase, [StringComparison]::OrdinalIgnoreCase)) {
    throw "Database path must be exactly the approved isolated path: $expectedDatabase"
}

$configuredStorage = Convert-ToCanonicalPath $envValues['LARAVEL_STORAGE_PATH'] $backendRoot
if (-not (Test-PathWithinDirectory $configuredStorage $qaRoot)) {
    throw "Laravel storage path is outside the approved QA directory: $configuredStorage"
}
if (-not [string]::Equals($configuredStorage, $qaStorage, [StringComparison]::OrdinalIgnoreCase)) {
    throw "Laravel storage path must be exactly the approved isolated path: $qaStorage"
}

# Resolve the effective Laravel config without dispatching an Artisan command,
# opening a DB connection, or writing application data. Clear inherited
# settings that could override .env.qa, while retaining the explicit --env=qa.
$probeCode = @'
require getenv('CRYMA_QA_BACKEND_ROOT').'/vendor/autoload.php';
$app = require getenv('CRYMA_QA_BACKEND_ROOT').'/bootstrap/app.php';
$kernel = $app->make(\Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();
echo json_encode([
  'environment' => $app->environment(),
  'database_default' => config('database.default'),
  'database_driver' => config('database.connections.'.config('database.default').'.driver'),
  'database_path' => config('database.connections.'.config('database.default').'.database'),
  'storage_path' => storage_path(),
  'log_path' => config('logging.channels.single.path'),
  'local_disk_root' => config('filesystems.disks.local.root'),
  'public_disk_root' => config('filesystems.disks.public.root'),
  'filesystem_default' => config('filesystems.default'),
  'cache_store' => config('cache.default'),
  'session_driver' => config('session.driver'),
  'queue_driver' => config('queue.default'),
  'mail_mailer' => config('mail.default'),
]);
'@

$overrideNames = @(
    'APP_ENV', 'APP_CONFIG_CACHE', 'DB_CONNECTION', 'DB_DATABASE', 'DB_URL',
    'LARAVEL_STORAGE_PATH', 'LOG_CHANNEL', 'FILESYSTEM_DISK', 'CACHE_STORE',
    'SESSION_DRIVER', 'QUEUE_CONNECTION', 'MAIL_MAILER', 'CRYMA_QA_BACKEND_ROOT'
)
$savedEnvironment = @{}
try {
    foreach ($name in $overrideNames) {
        $savedEnvironment[$name] = [Environment]::GetEnvironmentVariable($name, 'Process')
        [Environment]::SetEnvironmentVariable($name, $null, 'Process')
    }
    $env:APP_ENV = 'qa'
    $env:CRYMA_QA_BACKEND_ROOT = $backendRoot
    $json = & php -r $probeCode -- --env=qa
    if ($LASTEXITCODE -ne 0) { throw 'Laravel QA configuration probe failed.' }
    $resolved = ($json -join "`n") | ConvertFrom-Json
}
finally {
    foreach ($name in $overrideNames) {
        [Environment]::SetEnvironmentVariable($name, $savedEnvironment[$name], 'Process')
    }
}

if ($resolved.environment -cne 'qa') { throw "Laravel resolved APP_ENV as '$($resolved.environment)', not qa." }
if ($resolved.database_default -cne 'sqlite' -or $resolved.database_driver -cne 'sqlite') {
    throw 'Laravel did not resolve its default connection to SQLite; refusing QA validation.'
}
$resolvedDatabase = Convert-ToCanonicalPath ([string]$resolved.database_path) $backendRoot
if (-not [string]::Equals($resolvedDatabase, $expectedDatabase, [StringComparison]::OrdinalIgnoreCase)) {
    throw "Laravel resolved an unexpected database path: $resolvedDatabase"
}
if (-not (Test-PathWithinDirectory $resolvedDatabase $qaRoot) -or [string]::Equals($resolvedDatabase, $existingDatabase, [StringComparison]::OrdinalIgnoreCase)) {
    throw 'Laravel resolved a prohibited database path.'
}

$resolvedStorage = Convert-ToCanonicalPath ([string]$resolved.storage_path) $backendRoot
if (-not [string]::Equals($resolvedStorage, $qaStorage, [StringComparison]::OrdinalIgnoreCase) -or -not (Test-PathWithinDirectory $resolvedStorage $qaRoot)) {
    throw "Laravel resolved a non-isolated storage path: $resolvedStorage"
}
foreach ($path in @($resolved.log_path, $resolved.local_disk_root, $resolved.public_disk_root)) {
    $resolvedPath = Convert-ToCanonicalPath ([string]$path) $backendRoot
    if (-not (Test-PathWithinDirectory $resolvedPath $qaRoot)) {
        throw "A resolved Laravel log/storage path is outside CRYMA-QA: $resolvedPath"
    }
}
if ($resolved.cache_store -cne 'array' -or $resolved.session_driver -cne 'array' -or $resolved.queue_driver -cne 'sync' -or $resolved.mail_mailer -cne 'array') {
    throw 'Laravel resolved an unsafe cache, session, queue, or mail driver.'
}
if ($resolved.filesystem_default -cne 'local') {
    throw 'Laravel default filesystem must be the isolated local disk.'
}

if (Test-Path -LiteralPath $configuredDatabase) {
    Write-Host 'QA database file already exists. It was not opened or modified.'
} else {
    Write-Host 'QA database path is valid and currently absent; no file was created.'
}
Write-Host "PASS: Laravel resolves environment=qa, SQLite=$resolvedDatabase, storage=$resolvedStorage, isolated mail/cache/session/queue."
Write-Host 'No database connection, migration, seeder, directory creation, or file write was performed.'
