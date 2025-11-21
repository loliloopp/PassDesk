// Список запрещенных паролей
export const FORBIDDEN_PASSWORDS = [
  '12345678',
  '87654321',
  '98765432',
  '987654321',
  '123456789',
  '11223344',
  '44332211',
  '99887766',
  '147852369',
  '14785236',
  '963258741',
  '96325874',
  '55667788',
  '66778899',
  '88776655'
];

/**
 * Проверяет, не является ли пароль запрещенным
 * @param {string} password - Пароль для проверки
 * @returns {boolean} - true если пароль разрешен, false если запрещен
 */
export const isPasswordAllowed = (password) => {
  return !FORBIDDEN_PASSWORDS.includes(password);
};

/**
 * Валидатор для Ant Design Form
 */
export const forbiddenPasswordValidator = {
  validator: (_, value) => {
    if (!value || isPasswordAllowed(value)) {
      return Promise.resolve();
    }
    return Promise.reject(
      new Error('Этот пароль слишком простой. Используйте более сложный пароль.')
    );
  },
};

