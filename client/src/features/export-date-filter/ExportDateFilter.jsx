import { useState } from 'react';
import { DatePicker, Button } from 'antd';
import dayjs from 'dayjs';

/**
 * Компонент для фильтрации сотрудников по диапазону дат
 * Фильтрует по дате создания или обновления статуса
 */
const ExportDateFilter = ({ onFilter, onReset }) => {
  const [dateRange, setDateRange] = useState(null);
  const [isActive, setIsActive] = useState(false);

  const handleDateRangeChange = (dates) => {
    setDateRange(dates);
  };

  const handleApplyFilter = () => {
    if (!dateRange || !dateRange[0] || !dateRange[1]) {
      return;
    }

    const dateFrom = dateRange[0].format('YYYY-MM-DD');
    const dateTo = dateRange[1].format('YYYY-MM-DD');

    onFilter({
      dateFrom,
      dateTo
    });
    setIsActive(true);
  };

  const handleResetFilter = () => {
    setDateRange(null);
    setIsActive(false);
    onReset();
  };

  return (
    <div style={{
      padding: '12px 16px',
      background: '#fafafa',
      border: '1px solid #f0f0f0',
      borderRadius: '4px',
      marginBottom: '16px',
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
      flexWrap: 'wrap'
    }}>
      <span style={{ fontSize: '14px', fontWeight: '500' }}>
        Фильтр по дате:
      </span>

      <DatePicker.RangePicker
        value={dateRange}
        onChange={handleDateRangeChange}
        format="DD.MM.YYYY"
        placeholder={['Дата с', 'Дата по']}
        style={{ width: '280px' }}
      />

      <Button
        type="primary"
        onClick={handleApplyFilter}
        disabled={!dateRange || !dateRange[0] || !dateRange[1]}
      >
        Применить фильтр
      </Button>
    </div>
  );
};

export default ExportDateFilter;

