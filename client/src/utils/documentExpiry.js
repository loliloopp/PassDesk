/**
 * Утилиты для проверки сроков действия документов сотрудника
 */

/**
 * Вычисляет статус истечения документов
 * @param {Array} dates - массив дат документов
 * @returns {string} 'expired' | 'expiring-soon' | 'valid'
 */
export const calculateDocumentExpiryStatus = (dates) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const twoWeeksMs = 14 * 24 * 60 * 60 * 1000;
  
  let hasExpired = false;
  let hasExpiringSoon = false;
  
  dates.forEach(dateStr => {
    if (!dateStr) return;
    
    const date = new Date(dateStr);
    date.setHours(0, 0, 0, 0);
    
    const diff = date.getTime() - today.getTime();
    
    if (diff < 0) {
      hasExpired = true;
    } else if (diff <= twoWeeksMs) {
      hasExpiringSoon = true;
    }
  });
  
  if (hasExpired) return 'expired';
  if (hasExpiringSoon) return 'expiring-soon';
  return 'valid';
};

/**
 * Получает список обязательных документов для сотрудника с их сроками
 * @param {Object} employee - объект сотрудника
 * @returns {Array} массив объектов {name, date, type}
 */
export const getRequiredDocuments = (employee) => {
  const docs = [];
  
  // Паспорт всегда обязателен (для иностранцев - иностранный паспорт)
  if (employee.passportExpiryDate || employee.passport_expiry_date) {
    docs.push({
      name: 'Паспорт иностранного гражданина',
      date: employee.passportExpiryDate || employee.passport_expiry_date,
      type: 'passport'
    });
  }
  
  // КИГ - для иностранцев
  if (employee.kigEndDate || employee.kig_end_date) {
    docs.push({
      name: 'КИГ',
      date: employee.kigEndDate || employee.kig_end_date,
      type: 'kig'
    });
  }
  
  // Патент - для иностранцев (год от выдачи)
  if (employee.patentIssueDate || employee.patent_issue_date) {
    const issueDate = new Date(employee.patentIssueDate || employee.patent_issue_date);
    const expiryDate = new Date(issueDate);
    expiryDate.setFullYear(expiryDate.getFullYear() + 1);
    
    docs.push({
      name: 'Патент',
      date: expiryDate.toISOString().split('T')[0],
      type: 'patent'
    });
  }
  
  return docs;
};

/**
 * Получает детали о сроках документов для tooltip
 * @param {Object} employee - объект сотрудника
 * @returns {Array|null} массив объектов {name, date, status} или null если документов нет
 */
export const getDocumentExpiryDetails = (employee) => {
  const docs = getRequiredDocuments(employee);
  if (docs.length === 0) return null;
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const details = docs.map(doc => {
    const date = new Date(doc.date);
    date.setHours(0, 0, 0, 0);
    
    const diff = date.getTime() - today.getTime();
    const daysLeft = Math.ceil(diff / (24 * 60 * 60 * 1000));
    
    let status = '✓ OK';
    if (daysLeft < 0) {
      status = `🔴 Истек ${Math.abs(daysLeft)} дн. назад`;
    } else if (daysLeft <= 14) {
      status = `🟠 Осталось ${daysLeft} дн.`;
    } else {
      status = `🟢 Осталось ${daysLeft} дн.`;
    }
    
    return {
      name: doc.name,
      date: date.toLocaleDateString('ru-RU'),
      status
    };
  });
  
  return details;
};

