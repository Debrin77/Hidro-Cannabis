# Runs gradlew.bat with JDK 17+ (AGP 8.x). Tries Android Studio JBR on Windows if JAVA_HOME is too old or unset.
$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot

function Get-JavaMajorFromExe {
    param([string]$JavaExe)
    if (-not (Test-Path $JavaExe)) { return 0 }
    $stderr = & $JavaExe -version 2>&1 | Out-String
    if ($stderr -match 'version "1\.(\d+)') { return [int]$Matches[1] }
    if ($stderr -match 'version "(\d+)') { return [int]$Matches[1] }
    return 0
}

function Find-Jdk17Home {
    $fromPath = $null
    $javaCmd = Get-Command java -ErrorAction SilentlyContinue
    if ($javaCmd -and $javaCmd.Source) {
        $binDir = Split-Path $javaCmd.Source
        $fromPath = Split-Path $binDir
        if (-not (Test-Path (Join-Path $fromPath "bin\java.exe"))) { $fromPath = $null }
    }

    $candidates = @(
        $env:JAVA_HOME
        $fromPath
        "$env:LOCALAPPDATA\Programs\Android\Android Studio\jbr"
        "$env:LOCALAPPDATA\Android\Android Studio\jbr"
        "${env:ProgramFiles}\Android\Android Studio\jbr"
        "${env:ProgramFiles(x86)}\Android\Android Studio\jbr"
    ) | Where-Object { $_ -and (Test-Path $_) } | Select-Object -Unique

    foreach ($home in $candidates) {
        $java = Join-Path $home "bin\java.exe"
        $major = Get-JavaMajorFromExe -JavaExe $java
        if ($major -ge 17) { return $home }
    }
    foreach ($home in $candidates) {
        $java = Join-Path $home "bin\java.exe"
        $major = Get-JavaMajorFromExe -JavaExe $java
        if ($major -ge 11) { return $home }
    }
    return $null
}

$jdk = Find-Jdk17Home
if (-not $jdk) {
    Write-Error "No JDK 11+ found. Install JDK 17+ or Android Studio, then set JAVA_HOME or add its jbr folder to common install paths."
}
$env:JAVA_HOME = $jdk
Write-Host "Using JAVA_HOME=$jdk" -ForegroundColor DarkGray

& "$PSScriptRoot\gradlew.bat" @args
exit $LASTEXITCODE
