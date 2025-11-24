# 🏗️ Архитектура PassDesk для Production (VPS)

## 🎯 Реальная конфигурация развертывания

**Развернут на VPS FirstVDS**
- **Домен:** passdesk.fvds.ru
- **IP сервера:** 185.200.179.0
- **Пользователь приложения:** passdesk
- **Управление хостингом:** ISPManager

## Общее описание

PassDesk в production развертывается как **полнофункциональная веб-система** на едином VPS с четырьмя основными компонентами:

1. **Фронтенд** - React/Vite (статические файлы)
2. **Бэкенд** - Node.js/Express (API сервер на порту 5000)
3. **База данных** - PostgreSQL (Yandex Cloud)
4. **Хранилище** - S3-совместимое (Cloud.ru)

---

## Высокоуровневая архитектура

```
┌─────────────────────────────────────────────────────────────────┐
│                        ИНТЕРНЕТ                                 │
│                   (Браузер пользователя)                        │
└──────────────────────────┬──────────────────────────────────────┘
                           │ HTTPS 443
                           │ passdesk.fvds.ru
                           │
        ┌──────────────────▼───────────────────┐
        │    VPS Server (FirstVDS)             │
        │  IP: 185.200.179.0                   │
        │  ОС: Linux (Ubuntu/Debian)           │
        │  Управление: ISPManager              │
        │                                      │
        │  ┌─────────────────────────────────┐ │
        │  │   Nginx (веб-сервер)            │ │
        │  │   Reverse Proxy                 │ │
        │  │                                 │ │
        │  │  • HTTPS/SSL (Let's Encrypt)    │ │
        │  │  • Статика React (dist/)        │ │
        │  │  • Кэширование файлов           │ │
        │  │  • Gzip компрессия              │ │
        │  └────────┬────────────────────────┘ │
        │           │                          │
        │  ┌────────▼─────────────────────────┐ │
        │  │  Node.js (localhost:5000)        │ │
        │  │  Express сервер (pm2)            │ │
        │  │                                  │ │
        │  │  • Аутентификация (JWT)          │ │
        │  │  • API endpoints (/api/v1/*)     │ │
        │  │  • Бизнес-логика                │ │
        │  │  • CORS middleware               │ │
        │  │  • Rate limiting                 │ │
        │  │  • Логирование запросов          │ │
        │  │  • Управление файлами (S3)       │ │
        │  │  • Обработка ошибок              │ │
        │  └────────┬────────────────────────┘ │
        │           │                          │
        └───────────┼──────────────────────────┘
                    │ TCP 5432
                    │
    ┌───────────────┼──────────────────┬─────────────┐
    │               │                  │             │
    ▼               ▼                  ▼             ▼
┌─────────┐  ┌──────────┐        ┌────────┐   ┌──────────┐
│PostgreSQL  │ S3        │        │Syslog  │   │Backup    │
│Database   │ Storage   │        │        │   │Service   │
│(Yandex    │(Cloud.ru) │        │        │   │          │
│Cloud)     │ или       │        │        │   │          │
│           │Yandex     │        │        │   │          │
│• employees│Cloud S3   │        │        │   │          │
│• passes   │           │        │        │   │          │
│• users    │• Documents│        │        │   │          │
│• files    │• Photos   │        │        │   │          │
│• logs     │• Reports  │        │        │   │          │
└─────────┘  └──────────┘        └────────┘   └──────────┘
```

---

## Детальное описание компонентов

### 1. Веб-сервер (Nginx)

**Роль:** Обратный прокси, раздача статики, SSL/TLS termination

**Расположение:** `/etc/nginx/vhosts/passdesk/passdesk.fvds.ru.conf`

**Путь статики:** `/var/www/passdesk/data/www/passdesk.fvds.ru/`

**Логи:** `/var/www/httpd-logs/passdesk.fvds.ru.*.log`

**Основные функции:**
```
✓ HTTPS/SSL termination (Let's Encrypt)
✓ Статические файлы фронтенда (React dist)
✓ Проксирование /api/* на Node.js
✓ Кэширование (js, css, изображения)
✓ Gzip компрессия
✓ Логирование доступа и ошибок
✓ Обработка SPA (React Router)
✓ Лимиты размера файлов (100M)
```

**Процесс обработки запроса:**

```
Запрос: GET https://yourdomain.com/api/v1/employees

1. Nginx получает HTTPS запрос (порт 443)
2. Расшифровывает SSL (используя fullchain.pem)
3. Анализирует path: /api/v1/...
4. Матчит location /api/
5. Проксирует на http://localhost:5000/api/v1/...
   (проксируемый запрос: GET http://localhost:5000/api/v1/employees)
6. Устанавливает заголовки:
   - Host: yourdomain.com
   - X-Real-IP: client-ip
   - X-Forwarded-For: client-ip, proxy-ip
   - X-Forwarded-Proto: https
7. Получает ответ от Node.js
8. Возвращает клиенту с заголовками: Content-Encoding: gzip (если применимо)
```

**Конфигурация (упрощенная):**

```nginx
server {
    listen 443 ssl;
    server_name yourdomain.com www.yourdomain.com;

    # SSL сертификаты от Let's Encrypt
    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;

    # Корневая директория для статики React
    root /var/www/passdesk/dist;
    index index.html;

    # ===== API Proxy =====
    location /api/ {
        proxy_pass http://localhost:5000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 30s;
        proxy_connect_timeout 30s;
    }

    # ===== React SPA =====
    location / {
        try_files $uri $uri/ /index.html;
    }

    # ===== Кэширование статики =====
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

---

### 2. Бэкенд сервер (Node.js/Express)

**Роль:** API сервер, бизнес-логика, управление данными

**Расположение:** `/var/www/passdesk/data/passdesk/server/`

**Процесс управления:** PM2 (Process Manager v6.0.13)

**Пользователь:** passdesk

**Порт:** 5000 (cluster mode, 2 процесса)

**Основные функции:**

```
✓ JWT аутентификация (проверка токенов)
✓ CORS middleware (управление кросс-доменными запросами)
✓ Валидация данных (express-validator)
✓ CRUD операции с БД (через Sequelize ORM)
✓ Загрузка/скачивание файлов (S3 интеграция)
✓ Логирование запросов (morgan)
✓ Обработка ошибок (унифицированная)
✓ Сжатие ответов (compression middleware)
✓ Rate limiting
✓ Health check endpoint (/health)
```

**Структура кода:**

```
server/
├── src/
│   ├── server.js                   # Точка входа
│   ├── config/
│   │   ├── database.js             # Sequelize конфигурация
│   │   ├── storage.js              # S3 конфигурация
│   │   └── cors.js                 # CORS настройки
│   ├── middleware/
│   │   ├── auth.js                 # JWT верификация
│   │   ├── errorHandler.js         # Обработка ошибок
│   │   └── validation.js           # Валидация данных
│   ├── routes/
│   │   ├── index.js                # Регистрация всех маршрутов
│   │   ├── auth.js                 # POST /auth/*
│   │   ├── employees.js            # CRUD /employees/*
│   │   ├── passes.js               # CRUD /passes/*
│   │   ├── files.js                # POST /files/upload, GET /files/download
│   │   └── admin.js                # Админ операции
│   ├── models/
│   │   ├── User.js                 # Sequelize модель пользователя
│   │   ├── Employee.js             # Sequelize модель сотрудника
│   │   ├── Pass.js                 # Sequelize модель пропуска
│   │   └── File.js                 # Sequelize модель файла
│   ├── services/
│   │   ├── authService.js          # Логика аутентификации
│   │   ├── employeeService.js      # Логика сотрудников
│   │   ├── passService.js          # Логика пропусков
│   │   ├── fileService.js          # Логика файлов (S3)
│   │   └── errorService.js         # Обработка ошибок
│   ├── utils/
│   │   ├── jwt.js                  # Работа с JWT токенами
│   │   ├── validators.js           # Пользовательские валидаторы
│   │   └── helpers.js              # Утилиты
│   └── database/
│       └── migrations/             # SQL миграции
└── ecosystem.config.js             # Конфигурация pm2
```

**Жизненный цикл запроса:**

```
Запрос: POST https://yourdomain.com/api/v1/employees/123/upload

1. Nginx получает HTTPS запрос и проксирует на localhost:5000
2. Express получает запрос с заголовками от Nginx

3. middleware/auth.js:
   - Проверяет заголовок Authorization: Bearer <token>
   - Верифицирует JWT токен
   - Присоединяет req.user = { id, role, ... }
   - Если ошибка → возвращает 401 Unauthorized

4. middleware/validation.js:
   - Валидирует тело запроса (req.body, req.params, req.files)
   - Если ошибка → возвращает 400 Bad Request

5. routes/employees.js (обработчик маршрута):
   - Вызывает employeeService.uploadFiles()

6. services/employeeService.js:
   - Обновляет запись в БД
   - Вызывает fileService.uploadToS3()

7. services/fileService.js:
   - Загружает файл на S3
   - Возвращает signed URL для скачивания

8. middleware/errorHandler.js (если ошибка):
   - Логирует ошибку
   - Возвращает JSON ответ с кодом 400/500

9. Nginx получает ответ (JSON)
10. Nginx сжимает ответ (gzip)
11. Возвращает клиенту с заголовками Content-Encoding: gzip
```

**Окружающие переменные (на VPS в `/var/www/passdesk/data/passdesk/server/.env`):**

```env
# Окружение
NODE_ENV=production
PORT=5000
API_VERSION=v1

# База данных (Yandex Cloud)
DB_HOST=rc1b-r05alhnj8s89jsb8.mdb.yandexcloud.net
DB_PORT=6432
DB_NAME=dbsu10
DB_USER=wstil
DB_PASSWORD=Ae1T...
DB_SSL=true

# CORS & безопасность
ALLOWED_ORIGINS=https://passdesk.fvds.ru,https://www.passdesk.fvds.ru
CLIENT_URL=https://passdesk.fvds.ru

# S3 Хранилище (Cloud.ru)
STORAGE_PROVIDER=cloudru
CLOUDRU_S3_ENDPOINT=https://s3.cloud.ru
CLOUDRU_S3_REGION=ru-central-1
CLOUDRU_S3_ACCESS_KEY_ID=75b5873d-08f3-4815-b059-e26dc32412dc:e9a17a2bbaef0a8cf7259decf9b23b27
CLOUDRU_S3_SECRET_ACCESS_KEY=8f65eb0...
CLOUDRU_S3_BUCKET_NAME=passdesk
CLOUDRU_S3_BASE_PATH=

# JWT
JWT_SECRET=dev_secret_key_change_in_production_12345
JWT_EXPIRE=7d
JWT_REFRESH_SECRET=dev_refresh_token_secret_67890
JWT_REFRESH_EXPIRE=30d

# Логирование
LOG_LEVEL=debug
```

**Конфигурация PM2 (`ecosystem.config.cjs`):**
```javascript
// 2 процесса в cluster mode для балансировки нагрузки
instances: 2
exec_mode: 'cluster'
error_file: '/var/www/passdesk/data/logs/error.log'
out_file: '/var/www/passdesk/data/logs/out.log'
```

---

### 3. Фронтенд (React/Vite)

**Роль:** SPA (Single Page Application), пользовательский интерфейс

**Расположение (собранный код):** `/var/www/passdesk/data/www/passdesk.fvds.ru/`

**Источник (исходный код):** `/var/www/passdesk/data/passdesk/client/`

**Основные функции:**

```
✓ React компоненты (Feature-Sliced Design)
✓ React Router для навигации
✓ API клиент (axios)
✓ State management (Zustand)
✓ Ant Design компоненты
✓ Responsive design (desktop, tablet, mobile)
✓ Аутентификация (JWT в localStorage)
✓ Загрузка/скачивание файлов
✓ Таблицы и списки данных
✓ Формы с валидацией
```

**Процесс инициализации:**

```
1. Браузер открывает https://yourdomain.com
2. Nginx отдает index.html из /var/www/passdesk/dist/
3. HTML загружает main.js (bundled React приложение)
4. React инициализируется:
   - Создает root component
   - Загружает Auth Store из localStorage
   - Если JWT токен есть:
     - Отправляет GET /api/v1/auth/me (проверка сессии)
     - Получает данные пользователя
     - Рендирит основное приложение
   - Если токена нет:
     - Показывает страницу логина
5. Пользователь взаимодействует с приложением
6. React отправляет запросы на API через axios
7. Заголовок Authorization: Bearer <token> добавляется автоматически
```

**Окружающие переменные (в `.env.local` локально, в `vite.config.js` на продакшене):**

```env
# Локальная разработка (.env.local)
VITE_API_URL=http://localhost:5000/api
VITE_API_VERSION=v1

# Production (вшито в index.html через Nginx или сборка)
# Просто используется /api/* и браузер автоматически берет текущий домен
```

**API запросы (примеры):**

```javascript
// Автоматически преобразуется в:
// POST https://yourdomain.com/api/v1/auth/login

POST /api/v1/auth/login
Body: { email, password }
Response: { token, user: { id, email, role } }

// Автоматически добавляется заголовок:
// Authorization: Bearer <token из localStorage>

GET /api/v1/employees
Headers: Authorization: Bearer <token>
Response: { employees: [...] }

POST /api/v1/employees
Headers: Authorization: Bearer <token>
Body: { firstName, lastName, phone, ... }
Response: { employee: { id, ... } }

// Загрузка файлов
POST /api/v1/employees/123/upload
Headers: Authorization: Bearer <token>
Body: FormData { file: <File> }
Response: { file: { id, name, url } }
```

---

### 4. База данных (PostgreSQL)

**Роль:** Хранилище данных

**Расположение:** Yandex Managed Service for PostgreSQL (удаленная)

**Основные таблицы:**

```sql
-- Пользователи (аутентификация)
users (
  id UUID PRIMARY KEY,
  email VARCHAR UNIQUE,
  password_hash VARCHAR,
  role ENUM('admin', 'manager', 'user'),
  created_at TIMESTAMP,
  updated_at TIMESTAMP
)

-- Сотрудники
employees (
  id UUID PRIMARY KEY,
  last_name VARCHAR NOT NULL,
  first_name VARCHAR NOT NULL,
  middle_name VARCHAR,
  phone VARCHAR,
  email VARCHAR,
  position_id UUID,
  citizenship_id UUID,
  birth_date DATE,
  passport_number VARCHAR,
  inn VARCHAR,
  snils VARCHAR,
  status_card ENUM('draft', 'active', 'inactive'),
  is_fired BOOLEAN,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
)

-- Пропуска
passes (
  id UUID PRIMARY KEY,
  number VARCHAR UNIQUE,
  employee_id UUID REFERENCES employees(id),
  status ENUM('draft', 'issued', 'revoked'),
  issue_date DATE,
  expiry_date DATE,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
)

-- Файлы (ссылки на S3)
files (
  id UUID PRIMARY KEY,
  employee_id UUID REFERENCES employees(id),
  file_name VARCHAR,
  file_size INTEGER,
  s3_key VARCHAR,  -- Ключ в S3 хранилище
  s3_url VARCHAR,  -- Подписанный URL
  created_at TIMESTAMP,
  updated_at TIMESTAMP
)
```

**Подключение:**

```
Host: rc1a-c7...yandex.net
Port: 6432
Database: passdesk_prod
User: passdesk_admin
SSL: Required (TLS)
```

---

### 5. Хранилище файлов (S3)

**Роль:** Облачное хранилище документов и файлов

**Провайдеры:**
- Cloud.ru S3
- Yandex Cloud Object Storage
- AWS S3 (опционально)

**Основные операции:**

```javascript
// Загрузка файла
PUT /passdesk-files/employees/123/passport.pdf
Body: <file binary>
Result: S3 Key = "employees/123/passport.pdf"

// Получение подписанного URL (для скачивания)
GET /passdesk-files?Action=GetObject&Key=employees/123/passport.pdf
Result: URL = "https://storage.yandex.../passdesk-files/employees/123/passport.pdf?X-Amz-Signature=..."
Expiry: 1 час

// Удаление файла
DELETE /passdesk-files/employees/123/passport.pdf
Result: Файл удален
```

**Конфигурация (на VPS):**

```env
S3_ENDPOINT=https://storage.yandexcloud.net
S3_REGION=ru-central1
S3_ACCESS_KEY=YCAJ...
S3_SECRET_KEY=YCP...
S3_BUCKET=passdesk-files
```

---

## Процессы взаимодействия

### Сценарий 1: Аутентификация пользователя

```
Пользователь вводит email/пароль
         ↓
React отправляет POST /api/v1/auth/login
         ↓
Nginx проксирует на localhost:5000
         ↓
Express middleware: auth check (пропускает, т.к. нет токена)
         ↓
authController.login():
  - Проверяет email в БД (PostgreSQL)
  - Сравнивает пароль (bcrypt)
  - Генерирует JWT токен (подписан JWT_SECRET)
  - Возвращает { token, user }
         ↓
React получает токен и сохраняет в localStorage
         ↓
React отправляет все запросы с Authorization: Bearer <token>
```

### Сценарий 2: Получение списка сотрудников

```
React вызывает GET /api/v1/employees
         ↓
Запрос отправляется с Authorization: Bearer <token>
         ↓
Nginx проксирует на localhost:5000
         ↓
Express middleware: auth.js
  - Проверяет наличие Authorization заголовка
  - Верифицирует JWT токен (JWT_SECRET)
  - Присоединяет req.user = { id, role, ... }
  - Если ошибка: возвращает 401
         ↓
employeeController.getAll():
  - Проверяет роль пользователя (если нужна фильтрация)
  - Выполняет SQL query: SELECT * FROM employees
  - Возвращает массив сотрудников
         ↓
Nginx сжимает ответ (gzip)
         ↓
React получает список и рендирит таблицу
```

### Сценарий 3: Загрузка файла

```
Пользователь выбирает файл в React
         ↓
React отправляет POST /api/v1/employees/123/upload (FormData)
Headers: Authorization: Bearer <token>
         ↓
Nginx проксирует на localhost:5000
         ↓
Express middleware:
  - Проверяет токен
  - Парсит FormData (multer middleware)
         ↓
fileController.upload():
  - Генерирует S3 key: "employees/123/passport_1234567.pdf"
  - Загружает на S3 (AWS SDK)
  - Получает подписанный URL от S3
  - Сохраняет запись в БД (files таблица)
  - Возвращает { file_id, s3_url, file_name }
         ↓
React получает URL и может отобразить файл
```

---

## Безопасность

### Authentication (JWT)

```
Процесс:
1. Пользователь логинится → получает JWT токен
2. JWT содержит: { sub: user_id, role: 'user', exp: 1704067200 }
3. Подписан с помощью JWT_SECRET (только на сервере)
4. Хранится в localStorage (браузер)
5. Отправляется в каждом запросе: Authorization: Bearer <token>
6. Сервер верифицирует токен:
   - Проверяет подпись (JWT_SECRET)
   - Проверяет срок действия (exp)
   - Если истек: возвращает 401 Unauthorized

Безопасность:
✓ Токен не может быть подделан (требуется JWT_SECRET)
✓ Токен имеет срок действия (7 дней по умолчанию)
✓ Разные пользователи не могут использовать чужие токены
✓ При выходе токен удаляется из localStorage
```

### CORS (Cross-Origin Resource Sharing)

```
Конфигурация на сервере:
ALLOWED_ORIGINS=https://yourdomain.com,https://www.yourdomain.com

Процесс:
1. Браузер на https://yourdomain.com отправляет запрос на /api/...
2. Браузер проверяет CORS:
   - Текущий origin: https://yourdomain.com
   - Ищет в ALLOWED_ORIGINS ✓ Найдено
3. Запрос отправляется
4. Сервер проверяет Origin заголовок
5. Если разрешено: возвращает Access-Control-Allow-Origin: https://yourdomain.com

Защита:
✓ Запросы с других доменов будут заблокированы браузером
✓ Только явно разрешенные origins получают доступ
```

### S3 Access

```
Безопасность:
✓ S3_ACCESS_KEY и S3_SECRET_KEY ТОЛЬКО на сервере (.env)
✓ Клиент (браузер) не видит эти ключи
✓ Все операции с S3 проходят через Express сервер
✓ Сервер генерирует подписанные URL с ограничением по времени (1 час)

Поток:
Клиент → Запрос на upload → Сервер (с S3 ключами) → S3
Клиент ← URL для скачивания (подписанный) ← Сервер
```

---

## Мониторинг и логирование

### Логирование

```
PM2 логи (от пользователя passdesk):
- /var/www/passdesk/data/logs/error.log - Ошибки приложения
- /var/www/passdesk/data/logs/out.log   - Стандартный вывод

Nginx логи:
- /var/www/httpd-logs/passdesk.fvds.ru.access.log  - Все HTTP запросы
- /var/www/httpd-logs/passdesk.fvds.ru.error.log   - Ошибки Nginx

Просмотр:
pm2 logs passdesk-server                      # Реальное время (от passdesk)
tail -f /var/www/httpd-logs/passdesk.fvds.ru.access.log  # Requests
tail -f /var/www/passdesk/data/logs/error.log # Errors
```

### Health Check

```
Эндпоинт:
GET /api/v1/health

Ответ:
{
  status: 'OK',
  timestamp: '2025-01-23T10:30:00Z',
  environment: 'production'
}

Использование:
curl https://yourdomain.com/api/v1/health
Должен вернуть 200 OK
```

---

## Масштабирование

### PM2 Cluster Mode

```javascript
// ecosystem.config.js
module.exports = {
  apps: [{
    name: 'passdesk-server',
    script: './src/server.js',
    instances: 2,           // 2 процесса (или 'max' для всех CPU)
    exec_mode: 'cluster',   // Cluster mode для балансировки
    // ...
  }]
};
```

**Результат:**
- Express приложение запускается в 2 процессах
- PM2 балансирует нагрузку между ними
- При падении одного процесса другой продолжает работать

### Кэширование

```
Nginx кэширует статику (js, css, изображения):
- Браузер кэширует на 1 год (Cache-Control: max-age=31536000)
- Nginx использует ETags для проверки изменений

API ответы:
- БД кэширует результаты запросов (внутренний кэш PostgreSQL)
- S3 подписанные URLs кэшируются браузером (1 час)
```

---

## Развертывание обновлений

```
1. На локальной машине:
   git push origin main

2. На VPS (от пользователя passdesk):
   cd /var/www/passdesk/data/passdesk
   git pull origin main

3. Если изменился бэкенд:
   cd server
   npm install
   pm2 restart passdesk-server

4. Если изменился фронтенд:
   cd ../client
   npm install
   npm run build
   cp -r dist/* /var/www/passdesk/data/www/passdesk.fvds.ru/
   sudo systemctl reload nginx

5. Проверка:
   curl http://127.0.0.1/api/v1/health
   curl http://127.0.0.1/ (должна загружаться React app)
   
6. Просмотр логов:
   pm2 logs passdesk-server --lines 50
   tail -100 /var/www/passdesk/data/logs/error.log
```

---

## Troubleshooting

| Проблема | Решение |
|----------|---------|
| Сайт не открывается | Проверить nginx: `sudo nginx -t && sudo systemctl status nginx` |
| API ошибка 502 | Проверить pm2: `pm2 logs passdesk-server` (от passdesk), перезагрузить: `su - passdesk -c "pm2 restart passdesk-server"` |
| SSL ошибка (браузер ругается) | Это самоподписанный сертификат (нормально для тестирования). Через неделю обновим на Let's Encrypt |
| Файлы не загружаются | Проверить S3 ключи Cloud.ru в `.env` и права доступа на бакет |
| PM2 процессы не живы | Проверить: `su - passdesk -c "pm2 status"`, логи: `tail -50 /var/www/passdesk/data/logs/error.log` |
| Nginx не перегружается | Проверить синтаксис: `sudo nginx -t`, конфиг: `/etc/nginx/vhosts/passdesk/passdesk.fvds.ru.conf` |

---

---

## 🎯 Реальное развертывание на VPS FirstVDS

### Дата развертывания: 2025-11-24

### Параметры VPS:
- **Доменное имя:** passdesk.fvds.ru
- **IP адрес:** 185.200.179.0
- **Пользователь приложения:** passdesk (отдельный от других сайтов)
- **Управление:** ISPManager + BIND (DNS)

### Развернутые компоненты:
✅ Git репо клонирован с GitHub  
✅ Фронтенд собран (React/Vite → dist/)  
✅ Бэкенд запущен (Node.js v18.19.1, PM2)  
✅ Nginx настроен как reverse proxy  
✅ SSL сертификат установлен (самоподписанный)  
✅ PM2 управляет 2 процессами Node.js  
✅ БД подключена (Yandex Cloud PostgreSQL)  
✅ S3 хранилище настроено (Cloud.ru)  
✅ Логирование работает  
✅ DNS записи добавлены  

### Статус:
- **Фронтенд:** ✅ Работает (React SPA)
- **Бэкенд:** ✅ Работает (API на /api/v1/*, порт 5000)
- **БД:** ✅ Подключена (Yandex Cloud)
- **S3:** ✅ Настроен (Cloud.ru S3)
- **SSL:** ✅ Установлен (самоподписанный - можно обновить на Let's Encrypt)
- **DNS:** ✅ Настроен (через ISPManager/BIND)

### Команды для управления:

```bash
# Просмотр статуса PM2 (от passdesk)
su - passdesk -c "pm2 status"

# Просмотр логов
su - passdesk -c "pm2 logs passdesk-server --lines 50"
tail -50 /var/www/passdesk/data/logs/error.log

# Перезагрузка бэкенда
su - passdesk -c "pm2 restart passdesk-server"

# Перезагрузка Nginx
sudo systemctl reload nginx

# Обновление кода
cd /var/www/passdesk/data/passdesk
git pull origin main
```

**Версия:** 2.0 (реальное развертывание)  
**Дата обновления:** 2025-11-24  
**Статус:** ✅ Развернуто на production VPS

