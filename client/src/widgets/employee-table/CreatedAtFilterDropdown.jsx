import { useState, useEffect } from 'react';
import { Button, Space, DatePicker, Tag } from 'antd';
import dayjs from 'dayjs';
import 'dayjs/locale/ru';

dayjs.locale('ru');

/**
 * Компонент фильтра для колонки "Дата создания"
 * Включает пресеты периодов и выбор произвольного диапазона
 */
export const CreatedAtFilterDropdown = ({
  setSelectedKeys,
  selectedKeys,
  confirm,
  clearFilters,
  resetTrigger,
}) => {
  const [dateRange, setDateRange] = useState(null);

  // Очищаем фильтр при сбросе фильтров на странице
  useEffect(() => {
    if (resetTrigger > 0) {
      setDateRange(null);
    }
  }, [resetTrigger]);

  // Пресеты периодов
  const presets = [
    {
      label: 'Сегодня',
      getValue: () => {
        const today = dayjs();
        return [today.format('YYYY-MM-DD'), today.format('YYYY-MM-DD')];
      },
    },
    {
      label: 'Вчера',
      getValue: () => {
        const yesterday = dayjs().subtract(1, 'day');
        return [yesterday.format('YYYY-MM-DD'), yesterday.format('YYYY-MM-DD')];
      },
    },
    {
      label: 'На неделю',
      getValue: () => {
        const today = dayjs();
        const weekAgo = today.subtract(7, 'day');
        return [weekAgo.format('YYYY-MM-DD'), today.format('YYYY-MM-DD')];
      },
    },
    {
      label: 'На месяц',
      getValue: () => {
        const today = dayjs();
        const monthAgo = today.subtract(30, 'day');
        return [monthAgo.format('YYYY-MM-DD'), today.format('YYYY-MM-DD')];
      },
    },
    {
      label: 'На 3 месяца',
      getValue: () => {
        const today = dayjs();
        const threeMonthsAgo = today.subtract(90, 'day');
        return [threeMonthsAgo.format('YYYY-MM-DD'), today.format('YYYY-MM-DD')];
      },
    },
  ];

  const handlePresetClick = (preset) => {
    const [from, to] = preset.getValue();
    setSelectedKeys([from, to]);
    setDateRange([dayjs(from), dayjs(to)]);
  };

  const handleDateRangeChange = (dates) => {
    if (dates && dates[0] && dates[1]) {
      const from = dates[0].format('YYYY-MM-DD');
      const to = dates[1].format('YYYY-MM-DD');
      setSelectedKeys([from, to]);
      setDateRange(dates);
    } else {
      setSelectedKeys([]);
      setDateRange(null);
    }
  };

  const handleReset = () => {
    setDateRange(null);
    setSelectedKeys([]);
    clearFilters();
    confirm(); // Применяем очистку фильтра
  };

  const handleApply = () => {
    confirm();
  };

  // Форматируем отображение выбранного диапазона
  const getDisplayText = () => {
    if (!selectedKeys || selectedKeys.length === 0) {
      return 'Выберите дату';
    }
    if (selectedKeys.length === 2) {
      return `${selectedKeys[0]} — ${selectedKeys[1]}`;
    }
    return 'Выберите дату';
  };

  return (
    <div style={{ padding: '12px', minWidth: '350px' }}>
      {/* Пресеты */}
      <div style={{ marginBottom: '12px' }}>
        <div style={{ fontSize: '12px', color: '#666', marginBottom: '8px' }}>
          Пресеты:
        </div>
        <Space wrap style={{ marginBottom: '12px' }}>
          {presets.map((preset) => (
            <Button
              key={preset.label}
              size="small"
              type={
                selectedKeys &&
                selectedKeys.length === 2 &&
                selectedKeys[0] === preset.getValue()[0] &&
                selectedKeys[1] === preset.getValue()[1]
                  ? 'primary'
                  : 'default'
              }
              onClick={() => handlePresetClick(preset)}
            >
              {preset.label}
            </Button>
          ))}
        </Space>
      </div>

      {/* Разделитель */}
      <div style={{ borderTop: '1px solid #f0f0f0', marginBottom: '12px' }} />

      {/* Произвольный диапазон */}
      <div style={{ marginBottom: '12px' }}>
        <div style={{ fontSize: '12px', color: '#666', marginBottom: '8px' }}>
          Произвольный период:
        </div>
        <DatePicker.RangePicker
          value={dateRange}
          onChange={handleDateRangeChange}
          format="DD.MM.YYYY"
          style={{ width: '100%' }}
          placeholder={['От', 'До']}
        />
      </div>

      {/* Текущий выбор */}
      {selectedKeys && selectedKeys.length === 2 && (
        <div style={{ marginBottom: '12px', padding: '8px', backgroundColor: '#f5f5f5', borderRadius: '4px' }}>
          <div style={{ fontSize: '12px', color: '#666', marginBottom: '4px' }}>
            Выбранный период:
          </div>
          <Tag color="blue" style={{ marginRight: 0 }}>
            {getDisplayText()}
          </Tag>
        </div>
      )}

      {/* Кнопки */}
      <Space style={{ width: '100%', justifyContent: 'space-between' }}>
        <Button
          type="primary"
          onClick={handleApply}
          size="small"
          disabled={!selectedKeys || selectedKeys.length === 0}
        >
          OK
        </Button>
        <Button onClick={handleReset} size="small">
          Сброс
        </Button>
      </Space>
    </div>
  );
};

