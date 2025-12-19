import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import { sequelize } from './config/database.js';
import { errorHandler } from './middleware/errorHandler.js';
import routes from './routes/index.js';

// Загружаем переменные окружения
dotenv.config();

// ======================================
// ПРОВЕРКА БЕЗОПАСНОСТИ КОНФИГУРАЦИИ
// ======================================

// Проверка JWT_SECRET
if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
  console.error('❌ КРИТИЧЕСКАЯ ОШИБКА: JWT_SECRET должен быть минимум 32 символа!');
  console.error('   Установите надежный JWT_SECRET в файле .env');
  process.exit(1);
}

// Проверка JWT_REFRESH_SECRET
if (!process.env.JWT_REFRESH_SECRET || process.env.JWT_REFRESH_SECRET.length < 32) {
  console.error('❌ КРИТИЧЕСКАЯ ОШИБКА: JWT_REFRESH_SECRET должен быть минимум 32 символа!');
  console.error('   Установите надежный JWT_REFRESH_SECRET в файле .env');
  process.exit(1);
}

const app = express();
const PORT = process.env.PORT || 5000;

// ======================================
// TRUST PROXY - Для работы за Nginx
// ======================================
// Доверять заголовкам от прокси (X-Forwarded-For, X-Real-IP)
app.set('trust proxy', 1);

// ======================================
// RATE LIMITING - Защита от брутфорса
// ======================================

// Лимит для аутентификации (строгий)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 минут
  max: 5, // Максимум 5 попыток за 15 минут
  message: {
    success: false,
    message: 'Слишком много попыток входа. Попробуйте снова через 15 минут.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true // Не считать успешные запросы
});

// Лимит для refresh токена (мягкий - разрешить частые обновления)
const refreshLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 минута
  max: 30, // Максимум 30 обновлений в минуту (достаточно для проактивного обновления)
  message: {
    success: false,
    message: 'Слишком много попыток обновления токена. Попробуйте снова через минуту.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true // Не считать успешные запросы обновления
});

// Лимит для регистрации (умеренный)
const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 час
  max: 3, // Максимум 3 регистрации в час с одного IP
  message: {
    success: false,
    message: 'Слишком много попыток регистрации. Попробуйте снова через час.'
  },
  standardHeaders: true,
  legacyHeaders: false
});

// Лимит для GET запросов (мягкий - для справочников и чтения данных)
const getApiLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 минута
  max: 1000, // 1000 запросов в минуту для чтения
  message: {
    success: false,
    message: 'Слишком много запросов на чтение. Попробуйте снова через минуту.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => req.method !== 'GET' // Применяется только к GET
});

// Лимит для POST/PUT/DELETE запросов (строже - для мутаций)
const mutationApiLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 минута
  max: 100, // 100 запросов в минуту для изменений
  message: {
    success: false,
    message: 'Слишком много запросов на изменение данных. Попробуйте снова через минуту.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => req.method === 'GET' // Применяется только к POST/PUT/DELETE
});

// Middleware
app.use(helmet());
app.use(cors({
  origin: [
    'http://localhost:5173',
    'https://localhost:5173',
    'http://127.0.0.1:5173',
    'https://127.0.0.1:5173',
    process.env.CLIENT_URL // Для VPS используется переменная окружения
  ].filter(Boolean), // Убираем undefined если CLIENT_URL не установлен
  credentials: true
}));
app.use(compression());
app.use(morgan('dev'));
// Увеличиваем лимиты для больших загрузок (импорт больших файлов Excel)
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(cookieParser());

// Health check (без лимитов)
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV 
  });
});

// ======================================
// ПРИМЕНЕНИЕ RATE LIMITERS
// ======================================
const apiPrefix = `/api/${process.env.API_VERSION || 'v1'}`;

// Строгие лимиты для аутентификации
app.use(`${apiPrefix}/auth/login`, authLimiter);
app.use(`${apiPrefix}/auth/register`, registerLimiter);
app.use(`${apiPrefix}/auth/refresh`, refreshLimiter);

// Раздельные лимиты для GET и мутаций
app.use(apiPrefix, getApiLimiter); // 1000/мин для GET
app.use(apiPrefix, mutationApiLimiter); // 100/мин для POST/PUT/DELETE

// API Routes
app.use(apiPrefix, routes);

// 404 Handler
app.use((req, res) => {
  res.status(404).json({ 
    success: false,
    message: 'Route not found' 
  });
});

// Error Handler
app.use(errorHandler);

// Database connection and server start
const startServer = async () => {
  try {
    // Test database connection
    await sequelize.authenticate();
    console.log('✅ Database connected successfully');
    
    // НЕ синхронизируем модели автоматически!
    // Таблицы создаются только явно через: npm run db:init
    // Изменения в БД делаются только через миграции с явным запуском
    
    // Start server - слушаем на всех сетевых интерфейсах
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`📝 Environment: ${process.env.NODE_ENV}`);
      console.log(`🔗 API: http://localhost:${PORT}/api/${process.env.API_VERSION || 'v1'}`);
      if (process.env.SERVER_URL) {
        console.log(`🔗 API (VPS): ${process.env.SERVER_URL}/api/${process.env.API_VERSION || 'v1'}`);
      }
    });
  } catch (error) {
    console.error('❌ Unable to start server:', error);
    process.exit(1);
  }
};

startServer();

