import { Modal, Checkbox, Space, Button, Divider, Row, Col, List, Popconfirm, Tag, Tooltip } from 'antd';
import { 
  ArrowUpOutlined, 
  ArrowDownOutlined, 
  SaveOutlined, 
  DeleteOutlined, 
  EditOutlined,
  StarOutlined,
  StarFilled,
  SyncOutlined
} from '@ant-design/icons';
import { useState } from 'react';
import { useExcelColumnSets } from '@/hooks/useExcelColumnSets';
import ColumnSetFormModal from './ColumnSetFormModal';

/**
 * Модальное окно для выбора и упорядочивания столбцов экспорта в Excel
 * С поддержкой сохранения и загрузки наборов столбцов
 */
const ExcelColumnsModal = ({ 
  visible, 
  onCancel, 
  columns, 
  onUpdate, 
  toggleColumn, 
  moveColumnUp, 
  moveColumnDown, 
  selectAll, 
  deselectAll 
}) => {
  const {
    columnSets,
    loading: setsLoading,
    createColumnSet,
    updateColumnSet,
    deleteColumnSet,
    setDefaultColumnSet,
  } = useExcelColumnSets();

  const [isFormModalVisible, setIsFormModalVisible] = useState(false);
  const [editingSet, setEditingSet] = useState(null);

  // Подсчитываем активные столбцы
  const activeCount = columns.filter(col => col.enabled).length;
  const totalCount = columns.length;

  // Открыть модальное окно создания нового набора
  const handleCreateSet = () => {
    setEditingSet(null);
    setIsFormModalVisible(true);
  };

  // Открыть модальное окно редактирования набора
  const handleEditSet = (set) => {
    setEditingSet(set);
    setIsFormModalVisible(true);
  };

  // Создать или обновить набор
  const handleSubmitSet = async (values) => {
    try {
      const setData = {
        name: values.name,
        columns: columns, // Текущее состояние столбцов
        isDefault: values.isDefault || false,
      };

      if (editingSet) {
        await updateColumnSet(editingSet.id, setData);
      } else {
        await createColumnSet(setData);
      }

      setIsFormModalVisible(false);
      setEditingSet(null);
    } catch (error) {
      // Ошибка уже обработана в хуке
    }
  };

  // Применить набор (загрузить столбцы из набора)
  const handleApplySet = (set) => {
    if (set.columns && Array.isArray(set.columns)) {
      onUpdate(set.columns);
    }
  };

  // Удалить набор
  const handleDeleteSet = async (id) => {
    try {
      await deleteColumnSet(id);
    } catch (error) {
      // Ошибка уже обработана в хуке
    }
  };

  // Установить набор по умолчанию
  const handleSetDefault = async (id) => {
    try {
      await setDefaultColumnSet(id);
    } catch (error) {
      // Ошибка уже обработана в хуке
    }
  };

  // Обновить набор текущими настройками столбцов
  const handleUpdateSetColumns = async (set) => {
    try {
      await updateColumnSet(set.id, {
        columns: columns, // Текущее состояние столбцов
      });
    } catch (error) {
      // Ошибка уже обработана в хуке
    }
  };

  return (
    <>
      <Modal
        title="Столбцы для экспорта"
        open={visible}
        onCancel={onCancel}
        width={900}
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
        <div style={{ display: 'flex', gap: 16, height: '100%' }}>
          {/* Левая панель: Выбор столбцов */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
            <Space direction="vertical" size={8} style={{ width: '100%', flex: 1, minHeight: 0 }}>
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
          </div>

          <Divider type="vertical" style={{ height: 'auto', margin: '0 8px' }} />

          {/* Правая панель: Наборы */}
          <div style={{ width: 320, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
            <Space direction="vertical" size={8} style={{ width: '100%', flex: 1, minHeight: 0 }}>
              {/* Заголовок и кнопка создания */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 14, fontWeight: 500 }}>Сохранённые наборы</span>
                <Button
                  type="primary"
                  size="small"
                  icon={<SaveOutlined />}
                  onClick={handleCreateSet}
                >
                  Сохранить
                </Button>
              </div>

              <Divider style={{ margin: '4px 0' }} />

              {/* Список наборов */}
              <div style={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>
                {columnSets.length === 0 ? (
                  <div style={{ 
                    textAlign: 'center', 
                    color: '#999', 
                    padding: '20px 0',
                    fontSize: 12 
                  }}>
                    Нет сохранённых наборов
                  </div>
                ) : (
                  <List
                    size="small"
                    dataSource={columnSets}
                    loading={setsLoading}
                    renderItem={(set) => (
                      <List.Item
                        key={set.id}
                        style={{
                          padding: '8px',
                          border: '1px solid #f0f0f0',
                          borderRadius: '4px',
                          marginBottom: '6px',
                          cursor: 'pointer',
                          transition: 'all 0.2s',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.borderColor = '#1890ff';
                          e.currentTarget.style.backgroundColor = '#f0f5ff';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.borderColor = '#f0f0f0';
                          e.currentTarget.style.backgroundColor = 'transparent';
                        }}
                        onClick={() => handleApplySet(set)}
                      >
                        <List.Item.Meta
                          title={
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                              <span style={{ fontSize: 13, fontWeight: 500 }}>
                                {set.name}
                              </span>
                              {set.isDefault && (
                                <Tag color="gold" style={{ margin: 0, fontSize: 11, padding: '0 4px' }}>
                                  По умолчанию
                                </Tag>
                              )}
                            </div>
                          }
                          description={
                            <div style={{ fontSize: 11, color: '#999' }}>
                              {set.columns?.filter(c => c.enabled).length || 0} столбцов
                            </div>
                          }
                        />
                        <Space size={2} onClick={(e) => e.stopPropagation()}>
                          {/* Кнопка установки по умолчанию */}
                          <Tooltip title={set.isDefault ? 'По умолчанию' : 'Сделать по умолчанию'}>
                            <Button
                              type="text"
                              size="small"
                              icon={set.isDefault ? <StarFilled style={{ color: '#faad14' }} /> : <StarOutlined />}
                              onClick={() => handleSetDefault(set.id)}
                              style={{ padding: '2px 4px' }}
                            />
                          </Tooltip>
                          {/* Кнопка обновления текущими настройками */}
                          <Tooltip title="Обновить текущими настройками">
                            <Button
                              type="text"
                              size="small"
                              icon={<SyncOutlined />}
                              onClick={() => handleUpdateSetColumns(set)}
                              style={{ padding: '2px 4px' }}
                            />
                          </Tooltip>
                          {/* Кнопка редактирования */}
                          <Tooltip title="Редактировать название">
                            <Button
                              type="text"
                              size="small"
                              icon={<EditOutlined />}
                              onClick={() => handleEditSet(set)}
                              style={{ padding: '2px 4px' }}
                            />
                          </Tooltip>
                          {/* Кнопка удаления */}
                          <Popconfirm
                            title="Удалить набор?"
                            description="Это действие нельзя отменить"
                            onConfirm={() => handleDeleteSet(set.id)}
                            okText="Удалить"
                            cancelText="Отмена"
                            okButtonProps={{ danger: true }}
                          >
                            <Button
                              type="text"
                              size="small"
                              danger
                              icon={<DeleteOutlined />}
                              style={{ padding: '2px 4px' }}
                            />
                          </Popconfirm>
                        </Space>
                      </List.Item>
                    )}
                  />
                )}
              </div>
            </Space>
          </div>
        </div>
      </Modal>

      {/* Модальное окно создания/редактирования набора */}
      <ColumnSetFormModal
        visible={isFormModalVisible}
        onCancel={() => {
          setIsFormModalVisible(false);
          setEditingSet(null);
        }}
        onSubmit={handleSubmitSet}
        editingSet={editingSet}
        loading={setsLoading}
      />
    </>
  );
};

export default ExcelColumnsModal;

