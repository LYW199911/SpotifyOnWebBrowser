Add-Type -AssemblyName System.Drawing

$sizes = @(16, 32, 48, 128)

foreach ($size in $sizes) {
    $bmp = New-Object System.Drawing.Bitmap $size, $size
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality

    # Background circle with Spotify Green #1DB954
    $bgColor = [System.Drawing.Color]::FromArgb(29, 185, 84) # #1DB954
    $brush = New-Object System.Drawing.SolidBrush $bgColor
    $margin = [Math]::Max(1, [int]($size * 0.04))
    $g.FillEllipse($brush, $margin, $margin, $size - 2 * $margin, $size - 2 * $margin)

    # Dark sound waves #121212
    $penColor = [System.Drawing.Color]::FromArgb(18, 18, 18)
    
    # 3 Spotify curved arcs
    # Arc parameters scaled to size
    $penWidth = [Math]::Max(1.5, $size * 0.085)
    $pen = New-Object System.Drawing.Pen $penColor, $penWidth
    $pen.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
    $pen.EndCap = [System.Drawing.Drawing2D.LineCap]::Round

    # Top arc
    $topRect = New-Object System.Drawing.RectangleF ($size * 0.22), ($size * 0.22), ($size * 0.56), ($size * 0.50)
    $g.DrawArc($pen, $topRect, 205, 80)

    # Middle arc
    $pen.Width = [Math]::Max(1.2, $size * 0.075)
    $midRect = New-Object System.Drawing.RectangleF ($size * 0.26), ($size * 0.38), ($size * 0.48), ($size * 0.44)
    $g.DrawArc($pen, $midRect, 207, 75)

    # Bottom arc
    $pen.Width = [Math]::Max(1.0, $size * 0.065)
    $botRect = New-Object System.Drawing.RectangleF ($size * 0.30), ($size * 0.54), ($size * 0.40), ($size * 0.38)
    $g.DrawArc($pen, $botRect, 210, 70)

    $filename = "icon$size.png"
    $fullPath = Join-Path $PSScriptRoot $filename
    $bmp.Save($fullPath, [System.Drawing.Imaging.ImageFormat]::Png)

    $pen.Dispose()
    $brush.Dispose()
    $g.Dispose()
    $bmp.Dispose()
    Write-Output "Generated $filename"
}
