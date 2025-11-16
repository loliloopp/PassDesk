# Скрипт для открытия портов PassDesk в брандмауэре Windows
# Запустите от имени администратора

Write-Host "🔥 Настройка брандмауэра для PassDesk..." -ForegroundColor Cyan

# Проверка прав администратора
$currentPrincipal = New-Object Security.Principal.WindowsPrincipal([Security.Principal.WindowsIdentity]::GetCurrent())
$isAdmin = $currentPrincipal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)

if (-not $isAdmin) {
    Write-Host "❌ Требуются права администратора!" -ForegroundColor Red
    Write-Host "Запустите PowerShell от имени администратора и попробуйте снова." -ForegroundColor Yellow
    pause
    exit
}

# Открываем порт 5000 (Backend API)
Write-Host "`n📡 Открываем порт 5000 (Backend)..." -ForegroundColor Yellow
try {
    New-NetFirewallRule -DisplayName "PassDesk Server (5000)" `
        -Direction Inbound `
        -LocalPort 5000 `
        -Protocol TCP `
        -Action Allow `
        -Profile Any `
        -ErrorAction Stop
    Write-Host "✅ Порт 5000 открыт" -ForegroundColor Green
} catch {
    if ($_.Exception.Message -like "*already exists*") {
        Write-Host "⚠️  Правило для порта 5000 уже существует" -ForegroundColor Yellow
    } else {
        Write-Host "❌ Ошибка: $($_.Exception.Message)" -ForegroundColor Red
    }
}

# Открываем порт 5173 (Frontend Dev Server)
Write-Host "`n🌐 Открываем порт 5173 (Frontend)..." -ForegroundColor Yellow
try {
    New-NetFirewallRule -DisplayName "PassDesk Client (5173)" `
        -Direction Inbound `
        -LocalPort 5173 `
        -Protocol TCP `
        -Action Allow `
        -Profile Any `
        -ErrorAction Stop
    Write-Host "✅ Порт 5173 открыт" -ForegroundColor Green
} catch {
    if ($_.Exception.Message -like "*already exists*") {
        Write-Host "⚠️  Правило для порта 5173 уже существует" -ForegroundColor Yellow
    } else {
        Write-Host "❌ Ошибка: $($_.Exception.Message)" -ForegroundColor Red
    }
}

# Показываем IP адреса
Write-Host "`n🔍 Ваши IP адреса:" -ForegroundColor Cyan
Get-NetIPAddress -AddressFamily IPv4 | Where-Object {
    $_.IPAddress -notmatch '^(127\.|169\.254\.)' -and $_.PrefixOrigin -eq 'Dhcp'
} | Select-Object InterfaceAlias, IPAddress | Format-Table -AutoSize

Write-Host "`n✅ Настройка завершена!" -ForegroundColor Green
Write-Host "`nТеперь вы можете подключиться с мобильного устройства:" -ForegroundColor White
Write-Host "Frontend: http://[ваш-ip]:5173" -ForegroundColor Cyan
Write-Host "Backend:  http://[ваш-ip]:5000" -ForegroundColor Cyan

pause

