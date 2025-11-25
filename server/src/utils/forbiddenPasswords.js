// ======================================
// РАСШИРЕННЫЙ СПИСОК ЗАПРЕЩЁННЫХ ПАРОЛЕЙ
// ======================================
// Включает: числовые последовательности, популярные пароли,
// клавиатурные комбинации, слабые пароли

export const FORBIDDEN_PASSWORDS = [
  // Числовые последовательности
  '12345678', '123456789', '1234567890',
  '87654321', '987654321', '0987654321',
  '11111111', '22222222', '33333333', '44444444',
  '55555555', '66666666', '77777777', '88888888', '99999999', '00000000',
  '11223344', '44332211', '12341234', '43214321',
  '99887766', '66778899', '55667788', '88776655',
  '147852369', '14785236', '963258741', '96325874', '36925814',
  '13579246', '24681357', '11112222', '12121212',
  
  // Популярные пароли (топ по утечкам)
  'password', 'password1', 'password123',
  'qwerty12', 'qwerty123', 'qwertyui', 'qwertyuiop',
  'letmein1', 'welcome1', 'welcome123',
  'admin123', 'admin1234', 'administrator',
  'iloveyou', 'sunshine', 'princess', 'football',
  'baseball', 'superman', 'trustno1',
  'passw0rd', 'p@ssword', 'p@ssw0rd',
  
  // Кириллические популярные пароли
  'пароль12', 'пароль123', 'qwerty12', 'йцукен12',
  'привет12', 'россия12', 'любовь12',
  
  // Клавиатурные последовательности
  'qwertyui', 'asdfghjk', 'zxcvbnm1',
  '1qaz2wsx', 'qazwsxed', '1q2w3e4r', '1q2w3e4r5t',
  'zaq12wsx', 'qweasdzx',
  
  // Простые слова + цифры
  'test1234', 'testing1', 'demo1234', 'guest123',
  'user1234', 'login123', 'access12', 'master12',
  'pass1234', 'mypass12', 'secret12', 'secure12',
  
  // Даты и годы
  '01011990', '01012000', '01011980', '01011985',
  '19901990', '20002000', '19851985', '20202020', '20212021',
  '20222022', '20232023', '20242024', '20252025',
  
  // Имена
  'alexander', 'alexalex', 'michaelmichael', 'nikolay1',
  'andrey12', 'sergey12', 'dmitry12', 'ivan1234',
  
  // Компании и бренды
  'google12', 'facebook', 'yandex12', 'microsoft',
  'apple123', 'samsung1', 'iphone12',
  
  // Слабые комбинации
  'aaa11111', 'abc12345', 'abcd1234', 'aaaa1111',
  'zzzz1111', 'qqqq1111', 'aaaabbbb', 'abcdabcd',
  
  // Обходы валидации
  'Aa123456', 'Qw123456', 'Ab123456', '1Qaz2wsx',
  'Test1234', 'Pass1234', 'User1234', 'Admin123'
];

// Преобразуем в Set для быстрого поиска O(1)
const forbiddenSet = new Set(FORBIDDEN_PASSWORDS.map(p => p.toLowerCase()));

/**
 * Проверяет, не является ли пароль запрещенным
 * @param {string} password - Пароль для проверки
 * @returns {boolean} - true если пароль разрешен, false если запрещен
 */
export const isPasswordAllowed = (password) => {
  if (!password) return false;
  
  const lowerPassword = password.toLowerCase();
  
  // Проверка по списку запрещённых
  if (forbiddenSet.has(lowerPassword)) {
    return false;
  }
  
  // Проверка на повторяющиеся символы (например, aaaaaaaa или 11111111)
  if (/^(.)\1{7,}$/.test(password)) {
    return false;
  }
  
  // Проверка на простые последовательности (12345678, abcdefgh)
  if (isSequential(password)) {
    return false;
  }
  
  return true;
};

/**
 * Проверяет, является ли строка последовательностью символов
 */
const isSequential = (str) => {
  if (str.length < 6) return false;
  
  let ascending = true;
  let descending = true;
  
  for (let i = 1; i < str.length; i++) {
    const diff = str.charCodeAt(i) - str.charCodeAt(i - 1);
    if (diff !== 1) ascending = false;
    if (diff !== -1) descending = false;
    if (!ascending && !descending) return false;
  }
  
  return ascending || descending;
};

/**
 * Получает сообщение об ошибке для запрещенного пароля
 * @returns {string} - Сообщение об ошибке
 */
export const getForbiddenPasswordMessage = () => {
  return 'Этот пароль слишком простой или находится в списке распространённых. Используйте более сложный пароль: минимум 8 символов, включая буквы, цифры и специальные символы.';
};

