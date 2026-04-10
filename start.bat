@echo off
echo Spinning up Database and Redis Containers...
docker compose -f "%~dp0docker-compose.yml" up -d
timeout /t 5 /nobreak > NUL

echo Starting CYMOPS Web Dashboard (Vite)...
start cmd /k "cd /d "%~dp0frontend" && npm run dev"

echo Starting CYMOPS API Server (Spring Boot)...
start cmd /k "cd /d "%~dp0backend" && mvnw spring-boot:run"

echo Both services are starting up in separate windows!
