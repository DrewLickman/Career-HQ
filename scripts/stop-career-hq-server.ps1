[CmdletBinding()]
param(
    [ValidateRange(1, 65535)]
    [int]$Port = 3000,
    [ValidateRange(1, 30)]
    [int]$WaitSeconds = 10
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$guardFileName = 'run-bounded-dev-server.ps1'
$guardPath = (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot $guardFileName)).Path

function Test-CareerHqResponse {
    try {
        $response = Invoke-WebRequest -Uri "http://127.0.0.1:$Port/" -Method Get -TimeoutSec 2 -UseBasicParsing
        return (
            $response.StatusCode -ge 200 -and
            $response.StatusCode -lt 500 -and
            $response.Content -match '<title>Career HQ'
        )
    }
    catch {
        return $false
    }
}

function Find-GuardAncestor {
    param(
        [Parameter(Mandatory)]
        [int]$ProcessId,
        [Parameter(Mandatory)]
        [hashtable]$ProcessesById
    )

    $visited = [Collections.Generic.HashSet[int]]::new()
    $currentId = $ProcessId
    while ($currentId -gt 0 -and $visited.Add($currentId)) {
        if (-not $ProcessesById.ContainsKey($currentId)) {
            return $null
        }

        $process = $ProcessesById[$currentId]
        $commandLine = [string]$process.CommandLine
        if (
            $process.Name -in @('powershell.exe', 'pwsh.exe') -and
            $commandLine.IndexOf($guardFileName, [StringComparison]::OrdinalIgnoreCase) -ge 0
        ) {
            return $process
        }
        $currentId = [int]$process.ParentProcessId
    }
    return $null
}

$processes = @(Get-CimInstance Win32_Process)
$processesById = @{}
foreach ($process in $processes) {
    $processesById[[int]$process.ProcessId] = $process
}

$wrapperIds = [Collections.Generic.HashSet[int]]::new()
$careerHqResponding = Test-CareerHqResponse

if ($careerHqResponding) {
    $listeners = @(Get-NetTCPConnection -State Listen -LocalPort $Port -ErrorAction SilentlyContinue)
    foreach ($listener in $listeners) {
        $wrapper = Find-GuardAncestor -ProcessId ([int]$listener.OwningProcess) -ProcessesById $processesById
        if ($null -ne $wrapper) {
            [void]$wrapperIds.Add([int]$wrapper.ProcessId)
        }
    }
}

# This exact-path fallback covers the few seconds while Career HQ is still starting.
foreach ($process in $processes) {
    if (
        $process.Name -in @('powershell.exe', 'pwsh.exe') -and
        [string]$process.CommandLine -like "*$guardPath*"
    ) {
        [void]$wrapperIds.Add([int]$process.ProcessId)
    }
}

if ($wrapperIds.Count -eq 0) {
    if ($careerHqResponding) {
        Write-Error 'Career HQ is responding, but its guarded server wrapper could not be verified. No process was stopped.'
        exit 2
    }

    Write-Output 'Career HQ is not running.'
    exit 0
}

foreach ($wrapperId in $wrapperIds) {
    Stop-Process -Id $wrapperId -Force -ErrorAction Stop
}

$deadline = [DateTime]::UtcNow.AddSeconds($WaitSeconds)
do {
    $remaining = @(
        foreach ($wrapperId in $wrapperIds) {
            Get-Process -Id $wrapperId -ErrorAction SilentlyContinue
        }
    )
    if ($remaining.Count -eq 0 -and -not (Test-CareerHqResponse)) {
        Write-Output 'Career HQ server stopped.'
        exit 0
    }
    Start-Sleep -Milliseconds 100
} while ([DateTime]::UtcNow -lt $deadline)

Write-Error 'Career HQ did not fully stop within the safety timeout.'
exit 1
