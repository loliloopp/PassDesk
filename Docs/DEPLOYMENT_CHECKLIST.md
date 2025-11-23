# ✅ Чек-лист развертывания PassDesk на VPS

## 📋 ФАЗА 1: Подготовка кода (ЛОКАЛЬНО)

### Фронтенд (`client/`)

- [ ] **Обновить `vite.config.js`:**
  - [ ] Убрать `host: '192.168.1.9'` (будет работать на VPS через Nginx)
  - [ ] Обновить proxy target с конкретного IP на `http://localhost:5000`
  - [ ] Проверить, что `outDir: 'dist'` настроен

- [ ] **Создать `.env.example`:**
  ```env
  VITE_API_URL=https://yourdomain.com/api
  VITE_API_VERSION=v1
  ```

- [ ] **Протестировать локально:**
  ```bash
  cd client
  npm run dev
  # Проверить, что API запросы идут на localhost:5000
  npm run build
  # Проверить, что build завершился успешно
  ```

### Бэкенд (`server/`)

- [ ] **Обновить `src/server.js`:**
  - [ ] Убрать все жесткие IP адреса из CORS
  - [ ] Использовать `process.env.ALLOWED_ORIGINS`
  - [ ] Парсить строку в массив: `process.env.ALLOWED_ORIGINS.split(',')`

- [ ] **Создать `server/.env.example`:**
  ```env
  NODE_ENV=production
  PORT=5000
  API_VERSION=v1
  
  # Database
  DB_HOST=your-db.yandex.cloud
  DB_PORT=6432
  DB_NAME=passdesk
  DB_USER=admin
  DB_PASSWORD=your-password
  DB_SSL=true
  
  # CORS
  ALLOWED_ORIGINS=https://yourdomain.com,https://www.yourdomain.com
  CLIENT_URL=https://yourdomain.com
  
  # S3
  S3_ENDPOINT=https://storage.yandexcloud.net
  S3_REGION=ru-central1
  S3_ACCESS_KEY=your-key
  S3_SECRET_KEY=your-secret
  S3_BUCKET=passdesk-files
  
  # JWT
  JWT_SECRET=your-super-secret-key-min-32-chars
  ```

- [ ] **Создать `server/ecosystem.config.js`** (для pm2):
  ```javascript
  module.exports = {
    apps: [{
      name: 'passdesk-server',
      script: './src/server.js',
      instances: 2,
      exec_mode: 'cluster',
      env: { NODE_ENV: 'production' },
      error_file: './logs/error.log',
      out_file: './logs/out.log',
      watch: false,
      autorestart: true,
      max_memory_restart: '1G'
    }]
  };
  ```

- [ ] **Создать `server/Dockerfile`** (опционально):
  ```dockerfile
  FROM node:20-alpine
  WORKDIR /app
  COPY package*.json ./
  RUN npm ci --only=production
  COPY . .
  EXPOSE 5000
  CMD ["node", "src/server.js"]
  ```

- [ ] **Протестировать локально:**
  ```bash
  cd server
  npm run dev
  # Проверить, что сервер запускается без ошибок
  # Проверить, что БД подключилась
  ```

### Конфигурация Nginx

- [ ] **Создать `nginx/passdesk.conf`:**
  ```nginx
  server {
      listen 443 ssl;
      server_name yourdomain.com www.yourdomain.com;
      
      ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
      ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;
      
      root /var/www/passdesk/dist;
      index index.html;
      
      location /api/ {
          proxy_pass http://localhost:5000;
          proxy_set_header Host $host;
          proxy_set_header X-Real-IP $remote_addr;
          proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
          proxy_set_header X-Forwarded-Proto $scheme;
      }
      
      location / {
          try_files $uri $uri/ /index.html;
      }
      
      location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
          expires 1y;
          add_header Cache-Control "public, immutable";
      }
  }
  ```

### Скрипты развертывания

- [ ] **Создать `scripts/deploy.sh`:**
  - [ ] Собрать фронтенд: `npm run build`
  - [ ] Скопировать на VPS через SCP
  - [ ] Установить зависимости на VPS
  - [ ] Перезагрузить сервис

- [ ] **Создать `scripts/init-vps.sh`:**
  - [ ] Установить Node.js
  - [ ] Установить pm2
  - [ ] Установить Nginx
  - [ ] Установить Certbot
  - [ ] Получить SSL сертификат

---

## 🔧 ФАЗА 2: Подготовка VPS

### Доступ

- [ ] **SSH ключ настроен:**
  ```bash
  ssh -i ~/.ssh/your-key.pem user@your-vps.com
  ```

- [ ] **Пользователь создан:**
  ```bash
  sudo useradd -m -s /bin/bash wstil
  sudo usermod -aG sudo wstil
  ```

### Системные пакеты

- [ ] **Node.js 20+ установлен:**
  ```bash
  node --version  # v20.x.x
  npm --version   # 10.x.x
  ```

- [ ] **pm2 установлен глобально:**
  ```bash
  sudo npm install -g pm2
  pm2 --version
  ```

- [ ] **Nginx установлен:**
  ```bash
  sudo apt-get install -y nginx
  nginx -v
  ```

- [ ] **Certbot установлен:**
  ```bash
  sudo apt-get install -y certbot python3-certbot-nginx
  certbot --version
  ```

- [ ] **PostgreSQL клиент установлен (опционально):**
  ```bash
  sudo apt-get install -y postgresql-client
  ```

### Структура директорий

- [ ] **Создать папки:**
  ```bash
  mkdir -p /home/wstil/passdesk
  mkdir -p /home/wstil/passdesk/logs
  mkdir -p /var/www/passdesk/dist
  sudo chown -R wstil:wstil /var/www/passdesk
  ```

### SSL сертификат

- [ ] **Получить сертификат Let's Encrypt:**
  ```bash
  sudo certbot certonly --nginx -d yourdomain.com -d www.yourdomain.com
  # или
  sudo certbot certonly --standalone -d yourdomain.com -d www.yourdomain.com
  ```

- [ ] **Проверить сертификат:**
  ```bash
  sudo certbot certificates
  sudo ls -la /etc/letsencrypt/live/yourdomain.com/
  ```

---

## 📤 ФАЗА 3: Развертывание кода

### Копирование файлов

- [ ] **Собрать фронтенд локально:**
  ```bash
  cd client
  npm install
  npm run build
  ```

- [ ] **Скопировать проект на VPS:**
  ```bash
  scp -r . wstil@your-vps.com:/home/wstil/passdesk/
  # или через git (если есть репо)
  ssh wstil@your-vps.com "cd ~/passdesk && git clone ..."
  ```

- [ ] **Скопировать собранный фронтенд:**
  ```bash
  scp -r client/dist/* wstil@your-vps.com:/var/www/passdesk/dist/
  ```

### Установка зависимостей

- [ ] **На VPS установить npm пакеты:**
  ```bash
  ssh wstil@your-vps.com "cd ~/passdesk/server && npm install --production"
  ```

### Конфигурация окружения

- [ ] **Создать `.env` файл на VPS:**
  ```bash
  ssh wstil@your-vps.com "cat > ~/passdesk/server/.env << 'EOF'
  NODE_ENV=production
  PORT=5000
  DB_HOST=your-db.yandex.cloud
  DB_PORT=6432
  DB_NAME=passdesk
  DB_USER=admin
  DB_PASSWORD=your-password
  DB_SSL=true
  ALLOWED_ORIGINS=https://yourdomain.com,https://www.yourdomain.com
  CLIENT_URL=https://yourdomain.com
  S3_ENDPOINT=https://storage.yandexcloud.net
  S3_REGION=ru-central1
  S3_ACCESS_KEY=your-key
  S3_SECRET_KEY=your-secret
  S3_BUCKET=passdesk-files
  JWT_SECRET=your-super-secret-key-min-32-chars
  EOF"
  ```

- [ ] **Проверить права доступа:**
  ```bash
  ssh wstil@your-vps.com "chmod 600 ~/passdesk/server/.env"
  ```

---

## 🚀 ФАЗА 4: Запуск сервисов

### Node.js сервер

- [ ] **Запустить через pm2:**
  ```bash
  ssh wstil@your-vps.com "cd ~/passdesk/server && pm2 start ecosystem.config.js"
  ```

- [ ] **Проверить статус:**
  ```bash
  ssh wstil@your-vps.com "pm2 status"
  ssh wstil@your-vps.com "pm2 logs passdesk-server"
  ```

- [ ] **Настроить автозапуск:**
  ```bash
  ssh wstil@your-vps.com "pm2 save"
  ssh wstil@your-vps.com "pm2 startup"
  # Выполнить команду, которая выведет pm2
  ```

### Nginx

- [ ] **Скопировать конфигурацию:**
  ```bash
  sudo scp nginx/passdesk.conf root@your-vps.com:/etc/nginx/sites-available/
  ```

- [ ] **Включить сайт:**
  ```bash
  sudo ssh root@your-vps.com "ln -sf /etc/nginx/sites-available/passdesk.conf /etc/nginx/sites-enabled/"
  ```

- [ ] **Проверить синтаксис:**
  ```bash
  sudo ssh root@your-vps.com "nginx -t"
  ```

- [ ] **Перезагрузить Nginx:**
  ```bash
  sudo ssh root@your-vps.com "systemctl restart nginx"
  ```

---

## ✅ ФАЗА 5: Проверка и тестирование

### Доступность

- [ ] **Проверить основной сайт:**
  ```bash
  curl -I https://yourdomain.com
  # Должно вернуть: HTTP/2 200 OK
  ```

- [ ] **Проверить health check API:**
  ```bash
  curl https://yourdomain.com/api/v1/health
  # Должно вернуть: { status: 'OK', ... }
  ```

- [ ] **Проверить, что сайт открывается в браузере:**
  - [ ] https://yourdomain.com (должна загружаться React app)
  - [ ] https://www.yourdomain.com (редирект на основной домен)

### Функциональность

- [ ] **Протестировать аутентификацию:**
  - [ ] Открыть страницу логина
  - [ ] Ввести валидные учетные данные
  - [ ] Проверить, что редирект на главную страницу

- [ ] **Протестировать API:**
  ```bash
  # Логин и получение токена
  TOKEN=$(curl -s -X POST https://yourdomain.com/api/v1/auth/login \
    -H "Content-Type: application/json" \
    -d '{"email":"admin@example.com","password":"password"}' \
    | jq -r '.token')
  
  # Запрос данных с токеном
  curl -s -H "Authorization: Bearer $TOKEN" \
    https://yourdomain.com/api/v1/employees \
    | jq .
  ```

- [ ] **Протестировать загрузку файлов:**
  - [ ] Загрузить файл через UI
  - [ ] Проверить, что файл появился в S3
  - [ ] Проверить, что файл можно скачать

### Логирование

- [ ] **Проверить PM2 логи:**
  ```bash
  ssh wstil@your-vps.com "pm2 logs passdesk-server | head -100"
  ```

- [ ] **Проверить Nginx логи:**
  ```bash
  ssh root@your-vps.com "tail -100 /var/log/nginx/passdesk-access.log"
  ssh root@your-vps.com "tail -100 /var/log/nginx/passdesk-error.log"
  ```

### SSL сертификат

- [ ] **Проверить, что SSL работает:**
  ```bash
  curl -I https://yourdomain.com
  # Должно быть: HTTP/2 200 или HTTP/1.1 200
  ```

- [ ] **Проверить срок действия сертификата:**
  ```bash
  sudo ssh root@your-vps.com "certbot certificates"
  ```

---

## 🔒 ФАЗА 6: Безопасность и оптимизация

### Firewall

- [ ] **Настроить UFW (если используется):**
  ```bash
  sudo ufw allow ssh
  sudo ufw allow 80/tcp
  sudo ufw allow 443/tcp
  sudo ufw enable
  ```

### Обновления

- [ ] **Настроить автоматические обновления:**
  ```bash
  sudo apt-get install -y unattended-upgrades
  sudo dpkg-reconfigure -plow unattended-upgrades
  ```

### Мониторинг

- [ ] **Настроить мониторинг pm2 процесса:**
  ```bash
  ssh wstil@your-vps.com "pm2 install pm2-logrotate"
  ```

- [ ] **Настроить ротацию логов Nginx:**
  ```bash
  sudo ssh root@your-vps.com "apt-get install -y logrotate"
  ```

---

## 📝 ФАЗА 7: Документация

- [ ] **Сохранить учетные данные:**
  - [ ] VPS IP и SSH ключ
  - [ ] Доменное имя
  - [ ] DB host и credentials (в защищенном месте)
  - [ ] S3 ключи (в защищенном месте)

- [ ] **Создать runbook для администратора:**
  - [ ] Как перезагрузить сервер
  - [ ] Как обновить код
  - [ ] Как просмотреть логи
  - [ ] Как восстановить after crash

---

## 🔄 Post-Deploy Проверка

Выполнить спустя 24 часа:

- [ ] Проверить логи на ошибки
- [ ] Проверить использование памяти/CPU
- [ ] Проверить размер логов
- [ ] Проверить подключение к БД
- [ ] Проверить загруженные файлы в S3

---

## 🎉 Готово!

Если все чек-боксы отмечены ✅ - PassDesk успешно развернут на VPS!

**Поздравляем! 🚀**

---

**Версия:** 1.0  
**Дата:** 2025-01-23  
**Статус:** ✅ Чек-лист готов

