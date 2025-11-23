# 📋 План подготовки PassDesk к развертыванию на VPS

## Общее описание

PassDesk будет развернут на одном VPS с полной архитектурой:
- **Фронтенд**: React/Vite (собранная статика)
- **Бэкенд**: Node.js/Express (управляется через pm2)
- **База данных**: PostgreSQL (удаленная на Yandex Cloud)
- **Хранилище**: S3-совместимое (Cloud.ru / Yandex Cloud)
- **Веб-сервер**: Nginx (reverse proxy)
- **SSL**: Let's Encrypt (через Certbot)

---

## 📐 Этап 1: Подготовка кода (ЛОКАЛЬНО)

### 1.1 Удалить локальные ссылки из конфигурации

#### **Фронтенд** (`client/vite.config.js`)
❌ **Проблема:**
```javascript
host: '192.168.1.9'  // Конкретный IP
proxy: {
  '/api': {
    target: 'http://192.168.1.9:5000'  // Локальный IP
  }
}
```

✅ **Решение:**
```javascript
// На dev: прокси на localhost:5000
// На build: файлы будут работать через Nginx reverse proxy
// Переменная окружения определяет целевой API
```

**Действия:**
1. Убрать `host: '192.168.1.9'`
2. Убрать конкретный IP из proxy
3. Использовать относительные пути `/api` в прокси
4. Добавить переменные окружения для разных окружений

#### **Бэкенд** (`server/src/server.js`)
❌ **Проблема:**
```javascript
origin: [
  'http://192.168.1.9:5173',
  'http://192.168.8.118:5173',
  // Другие локальные адреса
]
```

✅ **Решение:**
```javascript
// Использовать переменные окружения
// На VPS: ALLOWED_ORIGINS будет доменным именем
```

**Действия:**
1. Убрать все жесткие IP адреса
2. Использовать `process.env.ALLOWED_ORIGINS` (строка с запятыми)
3. Парсить строку в массив

### 1.2 Создать файлы .env для разных окружений

**`server/.env.example`** - для документации:
```env
# ===== ENVIRONMENT =====
NODE_ENV=production
PORT=5000
API_VERSION=v1

# ===== DATABASE =====
DB_HOST=your-db.yandex.cloud
DB_PORT=5432
DB_NAME=passdesk
DB_USER=admin
DB_PASSWORD=your-password
DB_SSL=true

# ===== CORS & Security =====
ALLOWED_ORIGINS=https://yourdomain.com,https://www.yourdomain.com
CLIENT_URL=https://yourdomain.com

# ===== S3 Storage =====
S3_ENDPOINT=https://storage.yandexcloud.net
S3_REGION=ru-central1
S3_ACCESS_KEY=your-access-key
S3_SECRET_KEY=your-secret-key
S3_BUCKET=passdesk-files

# ===== JWT =====
JWT_SECRET=your-super-secret-key-min-32-chars
```

**`client/.env.example`** - для документации:
```env
VITE_API_URL=https://yourdomain.com/api
VITE_API_VERSION=v1
```

### 1.3 Создать конфигурации для разработки и production

**`client/.env.local`** (для локальной разработки):
```env
VITE_API_URL=http://localhost:5000/api
VITE_API_VERSION=v1
```

**`server/.env`** (для локальной разработки):
```env
NODE_ENV=development
PORT=5000
# ... остальные переменные
```

---

## 📦 Этап 2: Подготовка Docker/pm2 конфигурации

### 2.1 Создать Docker Compose для локального тестирования (опционально)

**`docker-compose.prod.yml`** - для VPS (уже может быть использован для тестирования):
```yaml
version: '3.8'

services:
  passdesk-server:
    build:
      context: ./server
      dockerfile: Dockerfile
    ports:
      - "5000:5000"
    environment:
      - NODE_ENV=production
      - PORT=5000
    env_file:
      - server/.env
    restart: always
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:5000/health"]
      interval: 30s
      timeout: 10s
      retries: 3
    depends_on:
      - postgres

  postgres:
    image: postgres:17-alpine
    environment:
      POSTGRES_DB: ${DB_NAME}
      POSTGRES_USER: ${DB_USER}
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"
    restart: always

volumes:
  postgres_data:
```

### 2.2 Создать Dockerfile для бэкенда

**`server/Dockerfile`**:
```dockerfile
FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .

EXPOSE 5000

CMD ["node", "src/server.js"]
```

### 2.3 Создать скрипт запуска для pm2

**`server/ecosystem.config.js`** - конфигурация pm2:
```javascript
module.exports = {
  apps: [{
    name: 'passdesk-server',
    script: './src/server.js',
    instances: 2,
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production'
    },
    error_file: './logs/error.log',
    out_file: './logs/out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    watch: false,
    ignore_watch: ['node_modules', 'logs'],
    merge_logs: true,
    autorestart: true,
    max_memory_restart: '1G'
  }]
};
```

---

## 🚀 Этап 3: Подготовка Nginx конфигурации

### 3.1 Создать Nginx вирт. хост

**`nginx/passdesk.conf`** (для копирования на VPS):
```nginx
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;

    # Редирект на HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl;
    server_name yourdomain.com www.yourdomain.com;

    # Пути к SSL сертификатам (Let's Encrypt)
    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;

    # SSL настройки
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;

    # Корневая директория со статикой фронтенда
    root /var/www/passdesk/dist;
    index index.html;

    # Максимальный размер файла для загрузок
    client_max_body_size 100M;

    # Логирование
    access_log /var/log/nginx/passdesk-access.log;
    error_log /var/log/nginx/passdesk-error.log;

    # Проксирование API запросов на Node.js сервер
    location /api/ {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 30s;
        proxy_connect_timeout 30s;
        proxy_send_timeout 30s;
    }

    # Обработка всех остальных запросов для SPA (React Router)
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Кэширование статических файлов
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # Запрет доступа к скрытым файлам
    location ~ /\. {
        deny all;
    }
}
```

---

## 🔧 Этап 4: Скрипты для развертывания

### 4.1 Создать скрипт развертывания на VPS

**`scripts/deploy.sh`** (запускается с локальной машины или на VPS):
```bash
#!/bin/bash
set -e

echo "🚀 Начало развертывания PassDesk..."

# Параметры
VPS_HOST=${1:-"your-vps.com"}
VPS_USER=${2:-"wstil"}
VPS_PATH="/home/$VPS_USER/passdesk"
DOMAIN=${3:-"yourdomain.com"}

echo "📦 Сборка фронтенда..."
cd client
npm install
npm run build
cd ..

echo "📦 Сборка бэкенда..."
cd server
npm install
npm run build 2>/dev/null || echo "ℹ️  No build script for backend"
cd ..

echo "🔒 Копирование на VPS..."
# Создаем папку на VPS если ее нет
ssh $VPS_USER@$VPS_HOST "mkdir -p $VPS_PATH"

# Копируем проект
scp -r . $VPS_USER@$VPS_HOST:$VPS_PATH/

echo "⚙️  Установка зависимостей на VPS..."
ssh $VPS_USER@$VPS_HOST "cd $VPS_PATH/server && npm install --production"

echo "✅ Развертывание завершено!"
echo "📋 Следующие шаги:"
echo "  1. Подключитесь на VPS: ssh $VPS_USER@$VPS_HOST"
echo "  2. Настройте .env файлы в $VPS_PATH"
echo "  3. Запустите сервер: cd $VPS_PATH/server && pm2 start ecosystem.config.js"
echo "  4. Скопируйте фронтенд в Nginx: cp -r $VPS_PATH/client/dist /var/www/passdesk/dist"
```

### 4.2 Создать скрипт инициализации на VPS

**`scripts/init-vps.sh`** (запускается один раз на VPS):
```bash
#!/bin/bash
set -e

echo "🔧 Инициализация VPS для PassDesk..."

# Создание директорий
mkdir -p /var/www/passdesk/dist
mkdir -p /var/log/passdesk
mkdir -p /home/$USER/passdesk/logs

# Установка Node.js (если нет)
if ! command -v node &> /dev/null; then
    echo "📦 Установка Node.js..."
    curl -sL https://deb.nodesource.com/setup_20.x | sudo bash -
    sudo apt-get install -y nodejs
fi

# Установка pm2 глобально
sudo npm install -g pm2

# Установка Nginx (если нет)
if ! command -v nginx &> /dev/null; then
    echo "🌐 Установка Nginx..."
    sudo apt-get install -y nginx
fi

# Установка Certbot для SSL (если нет)
if ! command -v certbot &> /dev/null; then
    echo "🔒 Установка Certbot..."
    sudo apt-get install -y certbot python3-certbot-nginx
fi

# Создание SSL сертификата
read -p "Введите домен для SSL сертификата (например: yourdomain.com): " DOMAIN
echo "🔒 Получение SSL сертификата для $DOMAIN..."
sudo certbot certonly --nginx -d $DOMAIN -d www.$DOMAIN

# Копирование Nginx конфига
echo "⚙️  Копирование Nginx конфигурации..."
sudo cp /home/$USER/passdesk/nginx/passdesk.conf /etc/nginx/sites-available/
sudo ln -sf /etc/nginx/sites-available/passdesk.conf /etc/nginx/sites-enabled/

# Проверка конфигурации Nginx
sudo nginx -t

# Перезагрузка Nginx
sudo systemctl restart nginx

echo "✅ Инициализация завершена!"
```

---

## ✅ Этап 5: Чек-лист перед развертыванием

### Код:
- [ ] Убрать все локальные IP адреса из конфигов
- [ ] Создать `.env.example` файлы
- [ ] Проверить, что используются переменные окружения
- [ ] Убедиться, что все paths относительные

### Конфигурация:
- [ ] Создан `ecosystem.config.js` для pm2
- [ ] Создан `Dockerfile` для бэкенда
- [ ] Создана Nginx конфигурация
- [ ] Готовы скрипты развертывания

### VPS:
- [ ] Зарегистрирован домен
- [ ] Доступ по SSH установлен
- [ ] PostgreSQL база готова (Yandex Cloud)
- [ ] S3 хранилище настроено

### Безопасность:
- [ ] JWT_SECRET установлен и сложный (min 32 chars)
- [ ] CORS origins правильно настроены
- [ ] DB пароль сложный и не в коде
- [ ] S3 ключи только в .env на сервере
- [ ] Firewall настроен (SSH, HTTP, HTTPS)

---

## 🚀 Процесс развертывания

### Шаг 1: Подготовка локально
```bash
cd PassDesk
# Убедиться, что код готов (Этап 1-2)
npm run build:all  # или отдельно frontend и backend
```

### Шаг 2: Инициализация VPS (первый раз)
```bash
ssh root@your-vps.com
bash /tmp/init-vps.sh  # запустить скрипт инициализации
```

### Шаг 3: Развертывание (регулярно)
```bash
./scripts/deploy.sh your-vps.com wstil yourdomain.com
```

### Шаг 4: Запуск сервера
```bash
ssh wstil@your-vps.com
cd ~/passdesk/server
pm2 start ecosystem.config.js
pm2 save
```

### Шаг 5: Проверка
```bash
curl https://yourdomain.com
curl https://yourdomain.com/api/v1/health
```

---

## 📊 Итоговая архитектура на VPS

```
┌─────────────────────────────────────┐
│    Браузер пользователя             │
│  (открывает https://yourdomain.com) │
└────────────────┬────────────────────┘
                 │ HTTPS (порт 443)
                 │
┌────────────────▼─────────────────────────────────────────┐
│                    VPS Server (Ubuntu)                    │
│                                                          │
│  ┌─────────────────────────────────────────────────┐   │
│  │  Nginx (веб-сервер, reverse proxy)              │   │
│  │  - Отдает статику React (dist/)                 │   │
│  │  - Проксирует /api/* на localhost:5000          │   │
│  │  - SSL/TLS (Let's Encrypt)                      │   │
│  └────────────────┬────────────────────────────────┘   │
│                   │ HTTP (внутри)                       │
│  ┌────────────────▼────────────────────────────────┐   │
│  │ Node.js/Express (pm2, localhost:5000)           │   │
│  │  - Аутентификация (JWT)                         │   │
│  │  - CRUD операции                               │   │
│  │  - S3 интеграция (загрузка файлов)              │   │
│  │  - Логирование и обработка ошибок              │   │
│  └────────────────┬────────────────────────────────┘   │
│                   │ PostgreSQL wire protocol             │
└───────────────────┼──────────────────────────────────────┘
                    │
        ┌───────────┼──────────────┐
        │           │              │
    ┌───▼────┐  ┌──▼──┐       ┌───▼────┐
    │PostgreSQL  │S3    │       │ Logs   │
    │(Yandex    │Store │       │(syslog)│
    │ Cloud)    │(Cloud)       │        │
    └──────────┘└──────┘       └────────┘
```

---

**Версия:** 1.0  
**Дата:** 2025-01-23  
**Статус:** 📋 План готов к реализации

