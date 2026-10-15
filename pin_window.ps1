Add-Type @"
using System;
using System.Runtime.InteropServices;
public class Win32Topmost {
    [DllImport("user32.dll", SetLastError = true)]
    public static extern bool SetWindowPos(IntPtr hWnd, IntPtr hWndInsertAfter, int X, int Y, int cx, int cy, uint uFlags);
}
"@

$SWP_NOSIZE = 0x0001
$SWP_NOMOVE = 0x0002
$SWP_SHOWWINDOW = 0x0040
$flags = $SWP_NOSIZE -bor $SWP_NOMOVE -bor $SWP_SHOWWINDOW
$HWND_TOPMOST = [IntPtr](-1)

Write-Host "========================================" -ForegroundColor Green
Write-Host "   Spotify 控制器 - 系统级窗口置顶工具  " -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Green

# Find processes or windows with title containing Spotify 控制器 / Spotify Controller
$targets = Get-Process | Where-Object { $_.MainWindowTitle -like "*Spotify 控制器*" -or $_.MainWindowTitle -like "*Spotify Controller*" }

if (-not $targets) {
    Write-Host "`n[!] 当前未检测到「Spotify 控制器」独立小窗口。" -ForegroundColor Yellow
    Write-Host "请先点击扩展图标打开独立小窗/迷你窗，然后再运行本脚本。" -ForegroundColor Gray
    Write-Host "`n💡 提示：您也可以在小窗上直接点击 📌 图标开启系统级画中画置顶；" -ForegroundColor Cyan
    Write-Host "或者使用 Windows 官方 PowerToys 快捷键：" -ForegroundColor Cyan
    Write-Host "   >>> Win + Ctrl + T <<<  (对任意窗口按下即可永久置顶)" -ForegroundColor White
} else {
    foreach ($proc in $targets) {
        $hwnd = $proc.MainWindowHandle
        if ($hwnd -ne [IntPtr]::Zero) {
            [Win32Topmost]::SetWindowPos($hwnd, $HWND_TOPMOST, 0, 0, 0, 0, $flags) | Out-Null
            Write-Host "`n[OK] 成功将小窗口设为「系统级永远置顶」！" -ForegroundColor Green
            Write-Host "     窗口标题: $($proc.MainWindowTitle)" -ForegroundColor White
            Write-Host "     现在该小窗口将永远浮在所有软件与全屏应用的最顶层！`n" -ForegroundColor Cyan
        }
    }
}

Write-Host "`n按任意键退出..." -ForegroundColor Gray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
