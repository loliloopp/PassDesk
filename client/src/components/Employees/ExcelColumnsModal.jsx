import { Modal, Checkbox, Space, Button, Divider, Row, Col } from 'antd';
import { ArrowUpOutlined, ArrowDownOutlined } from '@ant-design/icons';

/**
 * Модальное окно для выбора и упорядочивания столбцов экспорта в Excel
 */
const ExcelColumnsModal = ({ visible, onCancel, columns, onUpdate, toggleColumn, moveColumnUp, moveColumnDown, selectAll, deselectAll }) => {
  // Подсчитываем активные столбцы
  const activeCount = columns.filter(col => col.enabled).length;
  const totalCount = columns.length;

  return (
    <Modal
      title="Столбцы для экспорта"
      open={visible}
      onCancel={onCancel}
      width={520}
      wrapClassName="full-height-modal"
      style={{ top: '5vh', height: '90vh', display: 'flex', flexDirection: 'column' }}
      styles={{ 
        body: { display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, padding: '12px', overflowY: 'auto' },
        content: { display: 'flex', flexDirection: 'column', height: '100%' }
      }}
      footer={
        <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
          <Button onClick={onCancel}>Закрыть</Button>
        </Space>
      }
    >
      <Space direction="vertical" size={8} style={{ width: '100%' }}>
        {/* Кнопки выбрать/очистить */}
        <div style={{ display: 'flex', gap: 12, justifyContent: 'space-between', alignItems: 'center', fontSize: 12 }}>
          <span style={{ color: '#666' }}>
            Выбрано: <strong>{activeCount}</strong> / <strong>{totalCount}</strong>
          </span>
          <div style={{ display: 'flex', gap: 4 }}>
            <Button type="link" size="small" onClick={selectAll} style={{ fontSize: 12, padding: '0 4px' }}>
              Все
            </Button>
            <Button type="link" size="small" danger onClick={deselectAll} style={{ fontSize: 12, padding: '0 4px' }}>
              Очистить
            </Button>
          </div>
        </div>

        <Divider style={{ margin: '4px 0' }} />

        {/* Список столбцов с прокруткой */}
        <div style={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>
          <Space direction="vertical" size={4} style={{ width: '100%' }}>
            {columns.map((column, index) => (
              <Row
                key={column.key}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '4px 6px',
                  border: '1px solid #f0f0f0',
                  borderRadius: '3px',
                  fontSize: 13,
                }}
              >
                {/* Чекбокс */}
                <Col flex="auto" style={{ minWidth: 0 }}>
                  <Checkbox
                    checked={column.enabled}
                    onChange={() => toggleColumn(column.key)}
                    style={{ fontSize: 12 }}
                  >
                    <span style={{ fontSize: 12 }}>{column.label}</span>
                  </Checkbox>
                </Col>

                {/* Кнопки навигации */}
                <Col flex="50px" style={{ textAlign: 'right' }}>
                  <Space size={0}>
                    <Button
                      type="text"
                      size="small"
                      icon={<ArrowUpOutlined />}
                      onClick={() => moveColumnUp(column.key)}
                      disabled={index === 0}
                      title="Вверх"
                      style={{ padding: '2px 4px', height: '24px', width: '24px' }}
                    />
                    <Button
                      type="text"
                      size="small"
                      icon={<ArrowDownOutlined />}
                      onClick={() => moveColumnDown(column.key)}
                      disabled={index === columns.length - 1}
                      title="Вниз"
                      style={{ padding: '2px 4px', height: '24px', width: '24px' }}
                    />
                  </Space>
                </Col>
              </Row>
            ))}
          </Space>
        </div>
      </Space>
    </Modal>
  );
};

export default ExcelColumnsModal;

