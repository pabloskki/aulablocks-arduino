param([Parameter(Mandatory=$true)][string]$SourceDirectory)
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing
$destination = Join-Path $PSScriptRoot '../assets/sensor-illustrations'
New-Item -ItemType Directory -Path $destination -Force | Out-Null
$images = @{
  'HC-SR04' = 'exec-121a6245-678b-4ecc-ac7d-35f4e1d42111.png'
  'DHT11' = 'exec-5ffdb183-b597-4062-8282-f2ea2a8bdea0.png'
  'DHT22' = 'exec-a047a8a0-9981-40d0-892e-17555974eda5.png'
  'LDR' = 'exec-c30fca1e-170a-49de-9c1e-6286671d680a.png'
  'HC-SR501' = 'exec-3c9b2fd3-c6ed-433e-95c4-0c419890c3a1.png'
  'FC-51' = 'exec-167f1fb3-b1d1-4fd4-b23b-917e02325d9b.png'
  'TCRT5000' = 'exec-2fdc0032-b1ff-4195-8cc4-70f447c2b946.png'
  'SG90' = 'exec-1a61e003-16b7-4c72-99f2-55b599f766fb.png'
  'TB6612FNG' = 'exec-62d7547a-99d8-4ce4-a4b8-b7918b3741d2.png'
  'TT-Hall' = 'exec-4162d614-7088-4cec-8c00-3725f4121634.png'
  'PN532' = 'exec-a92d0d1d-b1fa-4266-8c0b-665b8b0b3947.png'
}
$codec = [System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() | Where-Object MimeType -eq 'image/jpeg'
foreach ($entry in $images.GetEnumerator()) {
  $source = [System.Drawing.Image]::FromFile((Join-Path $SourceDirectory $entry.Value))
  $bitmap = $null; $graphics = $null; $parameters = $null
  try {
    $scale = [Math]::Min([double]1.0, [double](640.0 / [Math]::Max($source.Width, $source.Height)))
    $bitmap = [System.Drawing.Bitmap]::new([int][Math]::Round($source.Width * $scale), [int][Math]::Round($source.Height * $scale))
    $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
    $graphics.Clear([System.Drawing.Color]::White)
    $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $graphics.DrawImage($source, 0, 0, $bitmap.Width, $bitmap.Height)
    $parameters = New-Object System.Drawing.Imaging.EncoderParameters 1
    $parameters.Param[0] = New-Object System.Drawing.Imaging.EncoderParameter ([System.Drawing.Imaging.Encoder]::Quality), ([long]90)
    $target = Join-Path $destination ($entry.Key + '.jpg')
    $bitmap.Save($target, $codec, $parameters)
    Write-Output $target
  } finally {
    if ($parameters) { $parameters.Dispose() }
    if ($graphics) { $graphics.Dispose() }
    if ($bitmap) { $bitmap.Dispose() }
    $source.Dispose()
  }
}
