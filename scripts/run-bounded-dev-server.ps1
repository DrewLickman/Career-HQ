[CmdletBinding()]
param(
    [string]$Command = 'node node_modules/next/dist/bin/next dev -H 127.0.0.1',
    [AllowEmptyString()]
    [string]$WorkingDirectory = '',
    [AllowEmptyString()]
    [string]$HealthUrl = 'http://localhost:3000/',
    [ValidateRange(1, 3600)]
    [int]$ReadyTimeoutSeconds = 90,
    [ValidateRange(1, 3600)]
    [int]$MaxRuntimeSeconds = 600,
    [ValidateRange(16, 32768)]
    [int]$MemoryLimitMB = 2048,
    [ValidateRange(50, 5000)]
    [int]$PollIntervalMs = 500,
    [ValidateRange(0, 3600)]
    [int]$HoldAfterReadySeconds = 600,
    [AllowEmptyString()]
    [string]$VerificationCommand = '',
    [ValidateRange(1, 3600)]
    [int]$VerificationTimeoutSeconds = 120
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

if ($env:OS -ne 'Windows_NT') {
    throw 'The Career HQ guarded development server currently requires Windows Job Objects.'
}

if ($Command.IndexOfAny([char[]]"`r`n") -ge 0 -or $VerificationCommand.IndexOfAny([char[]]"`r`n") -ge 0) {
    throw 'Commands must be single-line strings.'
}

$workingDirectoryInput = if ([string]::IsNullOrWhiteSpace($WorkingDirectory)) {
    Join-Path $PSScriptRoot '..'
} else {
    $WorkingDirectory
}
$resolvedWorkingDirectory = (Resolve-Path -LiteralPath $workingDirectoryInput).Path

if (-not ('CareerHQ.GuardedProcessJob' -as [type])) {
    Add-Type -Language CSharp -TypeDefinition @'
using System;
using System.Collections.Generic;
using System.ComponentModel;
using System.Runtime.InteropServices;
using System.Text;
using Microsoft.Win32.SafeHandles;

namespace CareerHQ
{
    public sealed class SafeJobHandle : SafeHandleZeroOrMinusOneIsInvalid
    {
        public SafeJobHandle() : base(true) { }
        protected override bool ReleaseHandle() { return CloseHandle(handle); }

        [DllImport("kernel32.dll", SetLastError = true)]
        private static extern bool CloseHandle(IntPtr handle);
    }

    public sealed class GuardedProcessJob : IDisposable
    {
        private const uint CreateSuspended = 0x00000004;
        private const uint CreateNewProcessGroup = 0x00000200;
        private const uint JobObjectLimitJobMemory = 0x00000200;
        private const uint JobObjectLimitKillOnJobClose = 0x00002000;
        private const uint StillActive = 259;
        private const int ErrorMoreData = 234;

        [StructLayout(LayoutKind.Sequential)]
        private struct IoCounters
        {
            public ulong ReadOperationCount;
            public ulong WriteOperationCount;
            public ulong OtherOperationCount;
            public ulong ReadTransferCount;
            public ulong WriteTransferCount;
            public ulong OtherTransferCount;
        }

        [StructLayout(LayoutKind.Sequential)]
        private struct JobObjectBasicLimitInformation
        {
            public long PerProcessUserTimeLimit;
            public long PerJobUserTimeLimit;
            public uint LimitFlags;
            public UIntPtr MinimumWorkingSetSize;
            public UIntPtr MaximumWorkingSetSize;
            public uint ActiveProcessLimit;
            public UIntPtr Affinity;
            public uint PriorityClass;
            public uint SchedulingClass;
        }

        [StructLayout(LayoutKind.Sequential)]
        private struct JobObjectExtendedLimitInformation
        {
            public JobObjectBasicLimitInformation BasicLimitInformation;
            public IoCounters IoInfo;
            public UIntPtr ProcessMemoryLimit;
            public UIntPtr JobMemoryLimit;
            public UIntPtr PeakProcessMemoryUsed;
            public UIntPtr PeakJobMemoryUsed;
        }

        [StructLayout(LayoutKind.Sequential, CharSet = CharSet.Unicode)]
        private struct StartupInfo
        {
            public int cb;
            public string lpReserved;
            public string lpDesktop;
            public string lpTitle;
            public int dwX;
            public int dwY;
            public int dwXSize;
            public int dwYSize;
            public int dwXCountChars;
            public int dwYCountChars;
            public int dwFillAttribute;
            public int dwFlags;
            public short wShowWindow;
            public short cbReserved2;
            public IntPtr lpReserved2;
            public IntPtr hStdInput;
            public IntPtr hStdOutput;
            public IntPtr hStdError;
        }

        [StructLayout(LayoutKind.Sequential)]
        private struct ProcessInformation
        {
            public IntPtr hProcess;
            public IntPtr hThread;
            public uint dwProcessId;
            public uint dwThreadId;
        }

        [DllImport("kernel32.dll", CharSet = CharSet.Unicode, SetLastError = true)]
        private static extern SafeJobHandle CreateJobObject(IntPtr jobAttributes, string name);

        [DllImport("kernel32.dll", SetLastError = true)]
        private static extern bool SetInformationJobObject(
            SafeJobHandle job,
            int informationClass,
            IntPtr information,
            uint informationLength);

        [DllImport("kernel32.dll", SetLastError = true)]
        private static extern bool AssignProcessToJobObject(SafeJobHandle job, IntPtr process);

        [DllImport("kernel32.dll", SetLastError = true)]
        private static extern bool QueryInformationJobObject(
            SafeJobHandle job,
            int informationClass,
            IntPtr information,
            uint informationLength,
            IntPtr returnLength);

        [DllImport("kernel32.dll", SetLastError = true)]
        private static extern bool TerminateJobObject(SafeJobHandle job, uint exitCode);

        [DllImport("kernel32.dll", CharSet = CharSet.Unicode, SetLastError = true)]
        private static extern bool CreateProcessW(
            string applicationName,
            StringBuilder commandLine,
            IntPtr processAttributes,
            IntPtr threadAttributes,
            bool inheritHandles,
            uint creationFlags,
            IntPtr environment,
            string currentDirectory,
            ref StartupInfo startupInfo,
            out ProcessInformation processInformation);

        [DllImport("kernel32.dll", SetLastError = true)]
        private static extern uint ResumeThread(IntPtr thread);

        [DllImport("kernel32.dll", SetLastError = true)]
        private static extern bool TerminateProcess(IntPtr process, uint exitCode);

        [DllImport("kernel32.dll", SetLastError = true)]
        private static extern bool GetExitCodeProcess(IntPtr process, out uint exitCode);

        [DllImport("kernel32.dll", SetLastError = true)]
        private static extern bool CloseHandle(IntPtr handle);

        private SafeJobHandle job;
        private IntPtr rootProcess = IntPtr.Zero;
        private bool disposed;

        public int RootProcessId { get; private set; }

        public static GuardedProcessJob Start(
            string applicationName,
            string commandLine,
            string workingDirectory,
            ulong hardMemoryLimitBytes)
        {
            GuardedProcessJob guarded = new GuardedProcessJob();
            guarded.job = CreateJobObject(IntPtr.Zero, null);
            if (guarded.job == null || guarded.job.IsInvalid)
                throw new Win32Exception(Marshal.GetLastWin32Error(), "Could not create the Windows Job Object.");

            JobObjectExtendedLimitInformation limits = new JobObjectExtendedLimitInformation();
            limits.BasicLimitInformation.LimitFlags = JobObjectLimitKillOnJobClose | JobObjectLimitJobMemory;
            limits.JobMemoryLimit = new UIntPtr(hardMemoryLimitBytes);
            int limitSize = Marshal.SizeOf(typeof(JobObjectExtendedLimitInformation));
            IntPtr limitPointer = Marshal.AllocHGlobal(limitSize);
            try
            {
                Marshal.StructureToPtr(limits, limitPointer, false);
                if (!SetInformationJobObject(guarded.job, 9, limitPointer, (uint)limitSize))
                    throw new Win32Exception(Marshal.GetLastWin32Error(), "Could not configure the Windows Job Object.");
            }
            finally
            {
                Marshal.FreeHGlobal(limitPointer);
            }

            StartupInfo startup = new StartupInfo();
            startup.cb = Marshal.SizeOf(typeof(StartupInfo));
            ProcessInformation process;
            bool created = CreateProcessW(
                applicationName,
                new StringBuilder(commandLine),
                IntPtr.Zero,
                IntPtr.Zero,
                false,
                CreateSuspended | CreateNewProcessGroup,
                IntPtr.Zero,
                workingDirectory,
                ref startup,
                out process);
            if (!created)
            {
                guarded.Dispose();
                throw new Win32Exception(Marshal.GetLastWin32Error(), "Could not start the guarded process.");
            }

            guarded.rootProcess = process.hProcess;
            guarded.RootProcessId = checked((int)process.dwProcessId);
            try
            {
                if (!AssignProcessToJobObject(guarded.job, process.hProcess))
                    throw new Win32Exception(Marshal.GetLastWin32Error(), "Could not assign the process to the Windows Job Object.");
                if (ResumeThread(process.hThread) == UInt32.MaxValue)
                    throw new Win32Exception(Marshal.GetLastWin32Error(), "Could not resume the guarded process.");
            }
            catch
            {
                TerminateProcess(process.hProcess, 1);
                guarded.Dispose();
                throw;
            }
            finally
            {
                CloseHandle(process.hThread);
            }

            return guarded;
        }

        public int[] GetProcessIds()
        {
            if (disposed || job == null || job.IsInvalid) return new int[0];
            int capacity = 64;
            while (true)
            {
                int byteCount = 8 + (capacity * IntPtr.Size);
                IntPtr buffer = Marshal.AllocHGlobal(byteCount);
                try
                {
                    bool ok = QueryInformationJobObject(job, 3, buffer, (uint)byteCount, IntPtr.Zero);
                    int assigned = Marshal.ReadInt32(buffer, 0);
                    int count = Marshal.ReadInt32(buffer, 4);
                    if (!ok)
                    {
                        int error = Marshal.GetLastWin32Error();
                        if (error == ErrorMoreData)
                        {
                            capacity = Math.Max(capacity * 2, assigned + 8);
                            continue;
                        }
                        throw new Win32Exception(error, "Could not enumerate the guarded process tree.");
                    }

                    List<int> processIds = new List<int>(count);
                    for (int index = 0; index < count; index++)
                    {
                        long value = Marshal.ReadIntPtr(buffer, 8 + (index * IntPtr.Size)).ToInt64();
                        if (value > 0 && value <= Int32.MaxValue) processIds.Add((int)value);
                    }
                    return processIds.ToArray();
                }
                finally
                {
                    Marshal.FreeHGlobal(buffer);
                }
            }
        }

        public bool IsRootRunning()
        {
            uint exitCode;
            return rootProcess != IntPtr.Zero && GetExitCodeProcess(rootProcess, out exitCode) && exitCode == StillActive;
        }

        public int RootExitCode()
        {
            uint exitCode;
            if (rootProcess == IntPtr.Zero || !GetExitCodeProcess(rootProcess, out exitCode)) return -1;
            return unchecked((int)exitCode);
        }

        public void Terminate(uint exitCode)
        {
            if (!disposed && job != null && !job.IsInvalid && !job.IsClosed)
                TerminateJobObject(job, exitCode);
        }

        public void Dispose()
        {
            if (disposed) return;
            disposed = true;
            if (rootProcess != IntPtr.Zero)
            {
                CloseHandle(rootProcess);
                rootProcess = IntPtr.Zero;
            }
            if (job != null) job.Dispose();
        }
    }
}
'@
}

function New-GuardedCommand {
    param(
        [Parameter(Mandatory)]
        [string]$CommandText,
        [Parameter(Mandatory)]
        [string]$Directory,
        [Parameter(Mandatory)]
        [UInt64]$HardMemoryLimitBytes
    )

    $commandProcessor = if ($env:ComSpec) { $env:ComSpec } else { Join-Path $env:SystemRoot 'System32\cmd.exe' }
    $nativeCommandLine = 'cmd.exe /d /s /c ' + $CommandText
    return [CareerHQ.GuardedProcessJob]::Start(
        $commandProcessor,
        $nativeCommandLine,
        $Directory,
        $HardMemoryLimitBytes
    )
}

function Get-TreePrivateBytes {
    param([int[]]$ProcessIds)

    [UInt64]$total = 0
    foreach ($processId in $ProcessIds) {
        try {
            $process = Get-Process -Id $processId -ErrorAction Stop
            $total += [UInt64]$process.PrivateMemorySize64
        }
        catch {
            # A process may exit between the Job Object snapshot and this read.
        }
    }
    return $total
}

$softMemoryLimitBytes = [UInt64]$MemoryLimitMB * 1MB
# The OS-enforced ceiling protects the machine if the polling thread stalls.
# It is slightly above the reporting threshold so the wrapper can explain why it stopped.
$hardMemoryLimitBytes = [UInt64]([Math]::Ceiling($softMemoryLimitBytes * 1.25))
$timer = [Diagnostics.Stopwatch]::StartNew()
$serverJob = $null
$verificationJob = $null
$observedProcessIds = [Collections.Generic.HashSet[int]]::new()
$peakPrivateBytes = [UInt64]0
$readyPrivateBytes = $null
$lastPrivateBytes = [UInt64]0
$terminationReason = 'startup-error'
$wrapperExitStatus = 1
$errorMessage = $null
$ready = [string]::IsNullOrWhiteSpace($HealthUrl)
$readyAtSeconds = if ($ready) { 0.0 } else { $null }
$verificationStartedAtSeconds = $null

try {
    $serverJob = New-GuardedCommand -CommandText $Command -Directory $resolvedWorkingDirectory -HardMemoryLimitBytes $hardMemoryLimitBytes
    $rootPid = $serverJob.RootProcessId

    while ($true) {
        $elapsedSeconds = $timer.Elapsed.TotalSeconds
        $processIds = @($serverJob.GetProcessIds())
        foreach ($processId in $processIds) { [void]$observedProcessIds.Add($processId) }

        $privateBytes = Get-TreePrivateBytes -ProcessIds $processIds
        $lastPrivateBytes = $privateBytes
        if ($privateBytes -gt $peakPrivateBytes) { $peakPrivateBytes = $privateBytes }
        if ($ready -and $null -eq $readyPrivateBytes) { $readyPrivateBytes = $privateBytes }

        if ($privateBytes -ge $softMemoryLimitBytes) {
            $terminationReason = 'memory-limit'
            throw "The guarded process tree reached the $MemoryLimitMB MB private-memory limit."
        }
        if ($elapsedSeconds -ge $MaxRuntimeSeconds) {
            $terminationReason = 'runtime-limit'
            throw "The guarded process tree reached the $MaxRuntimeSeconds second runtime limit."
        }
        if ($processIds.Count -eq 0 -or -not $serverJob.IsRootRunning()) {
            $terminationReason = 'server-exited'
            throw "The development server exited before verification completed (exit code $($serverJob.RootExitCode()))."
        }

        if (-not $ready) {
            try {
                $response = Invoke-WebRequest -Uri $HealthUrl -Method Get -TimeoutSec 2 -UseBasicParsing
                if ($response.StatusCode -ge 200 -and $response.StatusCode -lt 500) {
                    $ready = $true
                    $readyAtSeconds = $elapsedSeconds
                    $readyPrivateBytes = $privateBytes
                }
            }
            catch {
                if ($elapsedSeconds -ge $ReadyTimeoutSeconds) {
                    $terminationReason = 'ready-timeout'
                    throw "The development server did not become ready within $ReadyTimeoutSeconds seconds."
                }
            }
        }

        if ($ready) {
            if (-not [string]::IsNullOrWhiteSpace($VerificationCommand)) {
                if ($null -eq $verificationJob) {
                    $verificationJob = New-GuardedCommand -CommandText $VerificationCommand -Directory $resolvedWorkingDirectory -HardMemoryLimitBytes 512MB
                    $verificationStartedAtSeconds = $elapsedSeconds
                }
                elseif (-not $verificationJob.IsRootRunning()) {
                    $verificationExitCode = $verificationJob.RootExitCode()
                    if ($verificationExitCode -ne 0) {
                        $terminationReason = 'verification-failed'
                        throw "The verification command failed with exit code $verificationExitCode."
                    }
                    $terminationReason = 'completed'
                    $wrapperExitStatus = 0
                    break
                }
                elseif (($elapsedSeconds - $verificationStartedAtSeconds) -ge $VerificationTimeoutSeconds) {
                    $terminationReason = 'verification-timeout'
                    throw "The verification command reached the $VerificationTimeoutSeconds second timeout."
                }
            }
            elseif (($elapsedSeconds - $readyAtSeconds) -ge $HoldAfterReadySeconds) {
                $terminationReason = 'completed'
                $wrapperExitStatus = 0
                break
            }
        }

        Start-Sleep -Milliseconds $PollIntervalMs
    }
}
catch {
    $errorMessage = $_.Exception.Message
}
finally {
    $timer.Stop()
    if ($null -ne $verificationJob) {
        $verificationJob.Terminate(1)
        $verificationJob.Dispose()
    }
    if ($null -ne $serverJob) {
        foreach ($processId in @($serverJob.GetProcessIds())) { [void]$observedProcessIds.Add($processId) }
        $serverJob.Terminate($(if ($wrapperExitStatus -eq 0) { 0 } else { 1 }))
        $serverJob.Dispose()
    }
}

$treeStopped = $false
$cleanupDeadline = [DateTime]::UtcNow.AddSeconds(5)
do {
    $remainingProcessIds = @()
    foreach ($processId in $observedProcessIds) {
        try {
            if (Get-Process -Id $processId -ErrorAction Stop) {
                $remainingProcessIds += $processId
            }
        }
        catch { }
    }
    if ($remainingProcessIds.Count -eq 0) {
        $treeStopped = $true
        break
    }
    Start-Sleep -Milliseconds 100
} while ([DateTime]::UtcNow -lt $cleanupDeadline)

if (-not $treeStopped) {
    $terminationReason = 'cleanup-failed'
    $wrapperExitStatus = 1
    $errorMessage = 'One or more guarded processes remained after Job Object teardown.'
}

$rootPidForReport = if ($null -ne $serverJob) { $serverJob.RootProcessId } else { $null }
$childPids = @($observedProcessIds | Where-Object { $_ -ne $rootPidForReport } | Sort-Object)
$readyMemoryMB = if ($null -eq $readyPrivateBytes) { $null } else { [Math]::Round($readyPrivateBytes / 1MB, 2) }
$memoryGrowthMB = if ($null -eq $readyPrivateBytes) { $null } else { [Math]::Round(([double]$lastPrivateBytes - [double]$readyPrivateBytes) / 1MB, 2) }
$summary = [ordered]@{
    runtimeSeconds = [Math]::Round($timer.Elapsed.TotalSeconds, 3)
    rootPid = $rootPidForReport
    childPids = $childPids
    readyMemoryMB = $readyMemoryMB
    finalMemoryMB = [Math]::Round($lastPrivateBytes / 1MB, 2)
    peakMemoryMB = [Math]::Round($peakPrivateBytes / 1MB, 2)
    memoryGrowthMB = $memoryGrowthMB
    memoryLimitMB = $MemoryLimitMB
    terminationReason = $terminationReason
    exitStatus = $wrapperExitStatus
    treeStopped = $treeStopped
}

Write-Output ('CAREER_HQ_DEV_SERVER_SUMMARY ' + ($summary | ConvertTo-Json -Compress))
if ($errorMessage) { Write-Error $errorMessage }
exit $wrapperExitStatus
