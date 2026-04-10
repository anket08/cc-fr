$rootPath = $PSScriptRoot

Write-Host "Spinning up Database & Redis Containers..." -ForegroundColor Yellow
docker compose -f "$rootPath\docker-compose.yml" up -d

Write-Host "Waiting a few seconds for database to be ready..." -ForegroundColor Yellow
Start-Sleep -Seconds 5

Write-Host "Starting CYMOPS Web Dashboard (Vite) from $rootPath\frontend..." -ForegroundColor Cyan
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location -Path '$rootPath\frontend'; npm run dev"

Write-Host "Starting CYMOPS API Server (Spring Boot) from $rootPath\backend..." -ForegroundColor Cyan
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location -Path '$rootPath\backend'; .\mvnw spring-boot:run"

Write-Host "Both services have been launched in separate windows!" -ForegroundColor Green
