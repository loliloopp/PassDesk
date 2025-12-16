/**
 * Компонент для отображения статуса сроков действия документов сотрудника
 * Показывает красный/оранжевый/зеленый значок в зависимости от статуса
 */

import { Tooltip } from 'antd';
import { CloseCircleFilled, ExclamationCircleFilled, CheckCircleFilled } from '@ant-design/icons';
import { calculateDocumentExpiryStatus, getDocumentExpiryDetails } from '@/utils/documentExpiry';

export const DocumentExpiryStatus = ({ employee }) => {
  // Собираем все даты для проверки
  const dates = [
    employee.passportExpiryDate || employee.passport_expiry_date,
    employee.kigEndDate || employee.kig_end_date,
    employee.patentIssueDate || employee.patent_issue_date
      ? (() => {
          const issueDate = new Date(employee.patentIssueDate || employee.patent_issue_date);
          const expiryDate = new Date(issueDate);
          expiryDate.setFullYear(expiryDate.getFullYear() + 1);
          return expiryDate.toISOString();
        })()
      : null
  ].filter(Boolean);
  
  // Вычисляем статус
  const status = calculateDocumentExpiryStatus(dates);
  
  // Получаем детали для tooltip
  const details = getDocumentExpiryDetails(employee);
  
  // Если документов нет - ничего не показываем
  if (!details || details.length === 0) {
    return <span style={{ color: '#d9d9d9' }}>-</span>;
  }
  
  // Готовим текст для tooltip
  const tooltipTitle = (
    <div>
      {details.map((detail, idx) => (
        <div key={idx} style={{ marginBottom: idx < details.length - 1 ? '8px' : 0 }}>
          <strong>{detail.name}</strong>: {detail.date}
          <div style={{ fontSize: '12px', marginTop: '2px' }}>{detail.status}</div>
        </div>
      ))}
    </div>
  );
  
  // Определяем иконку и цвет в зависимости от статуса
  let icon;
  let color;
  
  if (status === 'expired') {
    icon = <CloseCircleFilled />;
    color = '#ff4d4f'; // красный
  } else if (status === 'expiring-soon') {
    icon = <ExclamationCircleFilled />;
    color = '#faad14'; // оранжевый
  } else {
    icon = <CheckCircleFilled />;
    color = '#52c41a'; // зеленый
  }
  
  return (
    <Tooltip title={tooltipTitle} color="#fff" styles={{ root: { padding: '8px' } }}>
      <span style={{ color, fontSize: 16, cursor: 'help' }}>
        {icon}
      </span>
    </Tooltip>
  );
};


