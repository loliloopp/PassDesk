import { sequelize } from '../config/database.js';
import dotenv from 'dotenv';

dotenv.config();

/**
 * Скрипт проверки подключения к базе данных
 */

async function checkConnection() {
  try {
    console.log('🔄 Проверка подключения к базе данных...\n');
    
    // Показываем параметры подключения
    console.log('📋 Параметры подключения:');
    console.log(`   Хост: ${process.env.DB_HOST}`);
    console.log(`   Порт: ${process.env.DB_PORT}`);
    console.log(`   База данных: ${process.env.DB_NAME}`);
    console.log(`   Пользователь: ${process.env.DB_USER}`);
    console.log(`   SSL: ${process.env.DB_SSL}`);
    console.log('');
    
    // Проверяем подключение
    await sequelize.authenticate();
    console.log('✅ Подключение к базе данных установлено успешно!\n');
    
    // Получаем версию PostgreSQL
    const [versionResult] = await sequelize.query('SELECT version()');
    console.log('🐘 Версия PostgreSQL:');
    console.log(`   ${versionResult[0].version}\n`);
    
    // Получаем список таблиц
    const [tables] = await sequelize.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `);
    
    console.log('📊 Таблицы в базе данных:');
    if (tables.length === 0) {
      console.log('   ❌ Таблицы не найдены!');
      console.log('   💡 Запустите: npm run db:init для создания таблиц');
    } else {
      tables.forEach(row => {
        console.log(`   ✓ ${row.table_name}`);
      });
    }
    console.log('');
    
    // Если есть таблицы, показываем количество записей
    if (tables.length > 0) {
      console.log('📈 Количество записей в таблицах:');
      for (const table of tables) {
        const tableName = table.table_name;
        try {
          const [countResult] = await sequelize.query(`SELECT COUNT(*) as count FROM "${tableName}"`);
          console.log(`   ${tableName}: ${countResult[0].count}`);
        } catch (error) {
          console.log(`   ${tableName}: ошибка подсчета`);
        }
      }
    }
    
    console.log('\n✅ Проверка завершена успешно!');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Ошибка подключения к базе данных:');
    console.error(`   ${error.message}`);
    console.error('\n💡 Проверьте:');
    console.error('   1. Правильность данных в server/.env');
    console.error('   2. Доступность кластера БД в Yandex Cloud');
    console.error('   3. Наличие файла cert/root.crt');
    console.error('   4. Настройки файрвола и групп безопасности');
    process.exit(1);
  }
}

checkConnection();

