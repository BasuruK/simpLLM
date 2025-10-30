# SimplLLM API Key Encryption Script
# AES-256-CBC with Zero IV and Fixed Key
# Compatible with the TypeScript decryption method used in the application
# Windows PowerShell 5.1 and PowerShell 7+ compatible

$ErrorActionPreference = "Stop"

Write-Host "`n=== SimplLLM API Key Encryption Tool ===" -ForegroundColor Cyan
Write-Host "This tool encrypts your OpenAI API key for use with SimplLLM`n" -ForegroundColor Gray

# Ask for the encryption key (must match DECRYPTION_KEY in lib/secure-storage.ts)
$ENCRYPTION_KEY = Read-Host "Enter encryption key (must match the application's decryption key)"

# Ask for the API key to encrypt
$apiKey = Read-Host "Enter your OpenAI API key (starts with sk-)"

# Validate basic format
if (-not $apiKey.StartsWith("sk-")) {
    Write-Host "`nWarning: API key doesn't start with 'sk-' - please verify it's correct" -ForegroundColor Yellow
    $continue = Read-Host "Continue anyway? (y/n)"
    if ($continue -ne 'y') {
        Write-Host "Encryption cancelled." -ForegroundColor Red
        exit
    }
}

# --- AES-256-CBC setup with Zero IV ---
# Convert the fixed key string to bytes (UTF-8)
$keyBytes = [Text.Encoding]::UTF8.GetBytes($ENCRYPTION_KEY)

# Ensure key is exactly 32 bytes (256 bits)
if ($keyBytes.Length -ne 32) {
    Write-Host "Error: Encryption key must be exactly 32 bytes (256 bits)" -ForegroundColor Red
    exit 1
}

# Create zero IV (16 bytes of zeros) - MUST match the TypeScript implementation
$iv = New-Object byte[] 16
for ($i = 0; $i -lt 16; $i++) {
    $iv[$i] = 0
}

# Create AES cipher
$aes = [System.Security.Cryptography.Aes]::Create()
$aes.Mode      = [System.Security.Cryptography.CipherMode]::CBC
$aes.Padding   = [System.Security.Cryptography.PaddingMode]::PKCS7
$aes.KeySize   = 256
$aes.BlockSize = 128
$aes.Key = $keyBytes
$aes.IV  = $iv

# --- Encrypt ---
$plainBytes = [Text.Encoding]::UTF8.GetBytes($apiKey)
$enc = $aes.CreateEncryptor()
try {
    $cipherBytes = $enc.TransformFinalBlock($plainBytes, 0, $plainBytes.Length)
}
finally {
    $enc.Dispose()
    $aes.Dispose()
}

# --- Base64 output (ciphertext only, no salt or IV) ---
$encryptedBase64 = [Convert]::ToBase64String($cipherBytes)

Write-Host "`n=== Encrypted API Key ===" -ForegroundColor Green
Write-Host $encryptedBase64 -ForegroundColor White
Write-Host "`nCopy this encrypted key and paste it into SimplLLM's login screen." -ForegroundColor Gray
Write-Host "The application will decrypt it automatically when you log in.`n" -ForegroundColor Gray

# Optional: Copy to clipboard if available
try {
    Set-Clipboard -Value $encryptedBase64
    Write-Host "✓ Encrypted key copied to clipboard!" -ForegroundColor Green
} catch {
    Write-Host "Note: Could not copy to clipboard automatically. Please copy manually." -ForegroundColor Yellow
}
