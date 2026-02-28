# Windows notification script for Claude Code
# Called by notify-waiting.js with parameters: -Title "title" -Message "message" [-ShowDialog]
param(
    [string]$Title = "Claude Code",
    [string]$Message = "Waiting for your input",
    [switch]$ShowDialog = $false
)

# Play system sound based on event type
# Exclamation = needs attention, Asterisk = task complete, Question = general notification
if ($Title -match "Needs Input|Waiting") {
    [System.Media.SystemSounds]::Exclamation.Play()
} elseif ($Title -match "Complete|Finished") {
    [System.Media.SystemSounds]::Asterisk.Play()
} else {
    [System.Media.SystemSounds]::Question.Play()
}

# For non-dialog notifications, try BurntToast FIRST (no WinForms assembly = no focus issues)
if (-not $ShowDialog) {
    if (Get-Module -ListAvailable -Name BurntToast -ErrorAction SilentlyContinue) {
        Import-Module BurntToast
        New-BurntToastNotification -Text $Title, $Message
        exit
    }
}

# Only load WinForms when actually needed (dialog or balloon fallback)
Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing

# Show modal dialog if requested (forces user acknowledgment)
if ($ShowDialog) {
    # Save current foreground window to restore focus after dialog
    Add-Type @"
        using System;
        using System.Runtime.InteropServices;
        public class FocusHelper {
            [DllImport("user32.dll")]
            public static extern IntPtr GetForegroundWindow();
            [DllImport("user32.dll")]
            public static extern bool SetForegroundWindow(IntPtr hWnd);
        }
"@
    $previousWindow = [FocusHelper]::GetForegroundWindow()

    # Create a topmost form to ensure dialog is focused and visible
    $form = New-Object System.Windows.Forms.Form
    $form.TopMost = $true
    $form.StartPosition = 'CenterScreen'
    $form.WindowState = 'Minimized'
    $form.ShowInTaskbar = $false
    $form.Show()
    $form.Activate()

    # Show dialog with topmost form as owner
    [System.Windows.Forms.MessageBox]::Show($form, $Message, $Title, [System.Windows.Forms.MessageBoxButtons]::OK, [System.Windows.Forms.MessageBoxIcon]::Information)
    $form.Close()

    # Restore focus to original window (likely Claude terminal)
    if ($previousWindow -ne [IntPtr]::Zero) {
        [FocusHelper]::SetForegroundWindow($previousWindow) | Out-Null
    }
    exit
}

# Fallback: Windows.Forms balloon notification (won't steal focus)
$notify = New-Object System.Windows.Forms.NotifyIcon
$notify.Icon = [System.Drawing.SystemIcons]::Information
$notify.BalloonTipIcon = 'Info'
$notify.BalloonTipTitle = $Title
$notify.BalloonTipText = $Message
$notify.Visible = $true
$notify.ShowBalloonTip(5000)

# Brief wait to ensure notification displays, then cleanup
Start-Sleep -Milliseconds 500
$notify.Dispose()
