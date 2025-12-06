import { Modal, Checkbox, Space, Button, Divider } from 'antd';
import { AVAILABLE_COLUMNS } from '../../hooks/useExcelColumns';

/**
 * Модальное окно для выбора столбцов экспорта в Excel
 */
const ExcelColumnsModal = ({ visible, onCancel, columns, onUpdate, toggleColumn, selectAll, deselectAll }) => {
  // Подсчитываем активные столбцы
  const activeCount = Object.values(columns).filter(Boolean).length;
  const totalCount = AVAILABLE_COLUMNS.length;

  return (
    <Modal
      title="Столбцы для экспорта"
      open={visible}
      onCancel={onCancel}
      width={500}
      footer={
        <Space>
          <Button onClick={onCancel}>Закрыть</Button>
        </Space>
      }
    >
      <Space direction="vertical" size="middle" style={{ width: '100%' }}>
        {/* Кнопки выбрать/очистить */}
        <div style={{ display: 'flex', gap: 12, justifyContent: 'space-between' }}>
          <div>
            <span style={{ color: '#666' }}>
              Выбрано: <strong>{activeCount}</strong> из <strong>{totalCount}</strong>
            </span>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <Button type="link" size="small" onClick={selectAll}>
              Выбрать все
            </Button>
            <Button type="link" size="small" danger onClick={deselectAll}>
              Очистить
            </Button>
          </div>
        </div>

        <Divider style={{ margin: '12px 0' }} />

        {/* Список чекбоксов */}
        <Space direction="vertical" size="small" style={{ width: '100%' }}>
          {AVAILABLE_COLUMNS.map((column) => (
            <Checkbox
              key={column.key}
              checked={columns[column.key]}
              onChange={() => toggleColumn(column.key)}
            >
              {column.label}
            </Checkbox>
          ))}
        </Space>
      </Space>
    </Modal>
  );
};

export default ExcelColumnsModal;

