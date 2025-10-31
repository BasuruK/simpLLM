#!/usr/bin/env pwsh
# Pre-release security checklist script
# Run this before every release: npm run security:check

Write-Host "🔒 Running Security Checks..." -ForegroundColor Cyan
Write-Host ""

$errors = 0

# 1. Check for known vulnerabilities
Write-Host "1️⃣  Checking for known vulnerabilities..." -ForegroundColor Yellow
$auditResult = npm audit --audit-level=moderate 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "   ❌ VULNERABILITIES FOUND!" -ForegroundColor Red
    Write-Host $auditResult
    $errors++
} else {
    Write-Host "   ✅ No known vulnerabilities" -ForegroundColor Green
}
Write-Host ""

# 2. Check for outdated packages
Write-Host "2️⃣  Checking for outdated packages..." -ForegroundColor Yellow
$outdatedJson = npm outdated --json 2>&1 | ConvertFrom-Json
if ($outdatedJson) {
    Write-Host "   ⚠️  Some packages are outdated:" -ForegroundColor Yellow
    Write-Host ""
    
    # Create table header
    $tableData = @()
    foreach ($package in $outdatedJson.PSObject.Properties) {
        $tableData += [PSCustomObject]@{
            Package = $package.Name
            Current = $package.Value.current
            Wanted = $package.Value.wanted
            Latest = $package.Value.latest
            Type = if ($package.Value.location -like "*node_modules*") { "prod" } else { "dev" }
        }
    }
    
    $tableData | Format-Table -AutoSize | Out-String | ForEach-Object { Write-Host "   $_" }
    Write-Host "   💡 Run: npm update" -ForegroundColor Cyan
} else {
    Write-Host "   ✅ All packages up to date" -ForegroundColor Green
}
Write-Host ""

# 3. Check for secrets in code
Write-Host "3️⃣  Scanning for exposed secrets..." -ForegroundColor Yellow

$secretPatterns = @(
    @{ Pattern = "AIza[0-9A-Za-z-_]{35}"; Name = "Google API Key" },
    @{ Pattern = "sk-[A-Za-z0-9]{48}"; Name = "OpenAI API Key" },
    @{ Pattern = "ghp_[A-Za-z0-9]{36}"; Name = "GitHub Token" },
    @{ Pattern = "AKIA[0-9A-Z]{16}"; Name = "AWS Access Key" },
    @{ Pattern = 'password\s*=\s*[''"][^''"]+[''"]'; Name = "Hardcoded Password" },
    @{ Pattern = 'api[_-]?key\s*=\s*[''"][^''"]+[''"]'; Name = "API Key" }
)

# Get all source files (exclude node_modules, dist, etc.)
$sourceFiles = Get-ChildItem -Path . -Recurse -Include *.ts,*.tsx,*.js,*.jsx,*.json -Exclude node_modules,dist,out,.next,electron\dist | 
    Where-Object { $_.FullName -notmatch '(node_modules|dist|out|\.next|package-lock\.json)' }

$totalFiles = $sourceFiles.Count
$currentFile = 0
$foundSecrets = $false

Write-Host "   📁 Scanning $totalFiles files..." -ForegroundColor Gray

foreach ($file in $sourceFiles) {
    $currentFile++
    $relativePath = $file.FullName.Replace((Get-Location).Path, "").TrimStart('\')
    
    # Show progress every 10 files or for small sets
    if ($currentFile % 10 -eq 0 -or $totalFiles -lt 50) {
        $percent = [math]::Round(($currentFile / $totalFiles) * 100)
        Write-Host "`r   🔍 [$percent%] Scanning: $relativePath" -NoNewline -ForegroundColor DarkGray
    }
    
    foreach ($secretDef in $secretPatterns) {
        try {
            $matches = Select-String -Path $file.FullName -Pattern $secretDef.Pattern -ErrorAction SilentlyContinue
            if ($matches) {
                if (-not $foundSecrets) {
                    Write-Host "`n" # Clear progress line
                }
                Write-Host "`n   ❌ POTENTIAL $($secretDef.Name) FOUND!" -ForegroundColor Red
                foreach ($match in $matches) {
                    Write-Host "      📄 $($match.Path):$($match.LineNumber)" -ForegroundColor Yellow
                    Write-Host "         $($match.Line.Trim())" -ForegroundColor Gray
                }
                $foundSecrets = $true
                $errors++
            }
        } catch {
            # Skip files that can't be read
            continue
        }
    }
}

Write-Host "`r   " -NoNewline # Clear progress line
if (-not $foundSecrets) {
    Write-Host "✅ No hardcoded secrets detected ($totalFiles files scanned)" -ForegroundColor Green
}
Write-Host ""

# 4. Check package-lock.json exists
Write-Host "4️⃣  Verifying package-lock.json..." -ForegroundColor Yellow
if (Test-Path "package-lock.json") {
    Write-Host "   ✅ package-lock.json exists" -ForegroundColor Green
} else {
    Write-Host "   ❌ package-lock.json missing!" -ForegroundColor Red
    $errors++
}
Write-Host ""

# 5. Check for .env files in git
Write-Host "5️⃣  Checking for .env in version control..." -ForegroundColor Yellow
$envInGit = git ls-files | Select-String -Pattern "\.env$"
if ($envInGit) {
    Write-Host "   ❌ .env file tracked in git!" -ForegroundColor Red
    $errors++
} else {
    Write-Host "   ✅ No .env files in version control" -ForegroundColor Green
}
Write-Host ""

# 6. Verify SECURITY.md exists
Write-Host "6️⃣  Checking security documentation..." -ForegroundColor Yellow
if (Test-Path "SECURITY.md") {
    Write-Host "   ✅ SECURITY.md exists" -ForegroundColor Green
} else {
    Write-Host "   ⚠️  SECURITY.md missing" -ForegroundColor Yellow
}
Write-Host ""

# Summary
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
if ($errors -eq 0) {
    Write-Host "✅ ALL SECURITY CHECKS PASSED" -ForegroundColor Green
    Write-Host "   Safe to release!" -ForegroundColor Green
    exit 0
} else {
    Write-Host "❌ SECURITY CHECKS FAILED ($errors issues)" -ForegroundColor Red
    Write-Host "   Fix issues before releasing!" -ForegroundColor Red
    exit 1
}
