/**
 * Таблица транслитерации русских символов в латиницу
 */
const transliterationMap = {
  // Строчные буквы
  'а': 'a', 'б': 'b', 'в': 'v', 'г': 'g', 'д': 'd', 'е': 'e', 'ё': 'yo',
  'ж': 'zh', 'з': 'z', 'и': 'i', 'й': 'y', 'к': 'k', 'л': 'l', 'м': 'm',
  'н': 'n', 'о': 'o', 'п': 'p', 'р': 'r', 'с': 's', 'т': 't', 'у': 'u',
  'ф': 'f', 'х': 'h', 'ц': 'ts', 'ч': 'ch', 'ш': 'sh', 'щ': 'sch',
  'ъ': '', 'ы': 'y', 'ь': '', 'э': 'e', 'ю': 'yu', 'я': 'ya',
  
  // Заглавные буквы
  'А': 'A', 'Б': 'B', 'В': 'V', 'Г': 'G', 'Д': 'D', 'Е': 'E', 'Ё': 'Yo',
  'Ж': 'Zh', 'З': 'Z', 'И': 'I', 'Й': 'Y', 'К': 'K', 'Л': 'L', 'М': 'M',
  'Н': 'N', 'О': 'O', 'П': 'P', 'Р': 'R', 'С': 'S', 'Т': 'T', 'У': 'U',
  'Ф': 'F', 'Х': 'H', 'Ц': 'Ts', 'Ч': 'Ch', 'Ш': 'Sh', 'Щ': 'Sch',
  'Ъ': '', 'Ы': 'Y', 'Ь': '', 'Э': 'E', 'Ю': 'Yu', 'Я': 'Ya',
  
  // Специальные символы
  ' ': '_',
  '-': '_',
  '.': '_',
  ',': '_',
  '!': '',
  '?': '',
  '"': '',
  '\'': '',
  '№': 'N',
  '(': '',
  ')': '',
  '[': '',
  ']': '',
  '{': '',
  '}': '',
  '/': '_',
  '\\': '_',
  '|': '_',
  ':': '_',
  ';': '_',
  '<': '',
  '>': '',
  '=': '_',
  '+': '_',
  '*': '_',
  '&': '_',
  '%': '_',
  '$': '_',
  '#': '_',
  '@': '_',
  '`': '',
  '~': '_'
};

/**
 * Транслитерация текста из кириллицы в латиницу
 * @param {string} text - Исходный текст
 * @returns {string} - Транслитерированный текст
 */
export const transliterate = (text) => {
  if (!text) return '';
  
  return text
    .split('')
    .map(char => transliterationMap[char] || char)
    .join('')
    .replace(/[^a-zA-Z0-9_]/g, '_') // Заменяем оставшиеся нелатинские символы на _
    .replace(/_+/g, '_') // Убираем повторяющиеся подчеркивания
    .replace(/^_|_$/g, ''); // Убираем подчеркивания в начале и конце
};

/**
 * Построение пути для файлов сотрудника
 * @param {string} counterpartyName - Название контрагента
 * @param {string} employeeFullName - ФИО сотрудника
 * @returns {string} - Относительный путь вида /Counterparty_Name/Employee_Name
 */
export const buildEmployeeFilePath = (counterpartyName, employeeFullName) => {
  const transliteratedCounterparty = transliterate(counterpartyName);
  const transliteratedEmployee = transliterate(employeeFullName);
  
  return `/${transliteratedCounterparty}/${transliteratedEmployee}`;
};

/**
 * Безопасное имя файла (транслитерация + очистка)
 * @param {string} fileName - Исходное имя файла
 * @returns {string} - Безопасное имя файла
 */
export const sanitizeFileName = (fileName) => {
  if (!fileName) return 'file';
  
  // Разделяем имя и расширение
  const lastDotIndex = fileName.lastIndexOf('.');
  let name = fileName;
  let extension = '';
  
  if (lastDotIndex > 0) {
    name = fileName.substring(0, lastDotIndex);
    extension = fileName.substring(lastDotIndex); // Расширение с точкой
  }
  
  // Транслитерируем только имя файла (БЕЗ расширения)
  // Заменяем точки на подчеркивания только в имени, не в расширении
  const transliteratedName = transliterate(name.replace(/\./g, '_'));
  
  return `${transliteratedName}${extension}`.toLowerCase();
};


