# Download ImageMagick installer
$installerUrl = "https://download.imagemagick.org/ImageMagick/download/binaries/ImageMagick-7.1.1-21-Q16-HDRI-x64-dll.exe"
$installerPath = "$env:TEMP\ImageMagick-installer.exe"

Write-Host "Downloading ImageMagick..."
Invoke-WebRequest -Uri $installerUrl -OutFile $installerPath

# Install ImageMagick silently
Write-Host "Installing ImageMagick..."
Start-Process -FilePath $installerPath -ArgumentList "/SILENT" -Wait

# Refresh environment variables
$env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")

# Create output directory if it doesn't exist
$outputDir = ".\public"
if (-not (Test-Path $outputDir)) {
    New-Item -ItemType Directory -Path $outputDir
}

# Generate different sizes
$sizes = @(16, 32, 144, 192)
foreach ($size in $sizes) {
    Write-Host "Generating ${size}x${size} favicon..."
    magick ".\public\favicon.PNG" -resize ${size}x${size} -background transparent -gravity center -extent ${size}x${size} "${outputDir}\favicon-${size}x${size}.png"
}

# Generate 180x180 for Apple touch icon
Write-Host "Generating Apple touch icon..."
magick ".\public\favicon.PNG" -resize 180x180 -background transparent -gravity center -extent 180x180 "${outputDir}\apple-touch-icon.png"

# Generate ICO file with multiple sizes
Write-Host "Generating ICO file..."
magick convert ".\public\favicon-16x16.png" ".\public\favicon-32x32.png" "${outputDir}\favicon.ico"

Write-Host "All favicons have been generated!" 