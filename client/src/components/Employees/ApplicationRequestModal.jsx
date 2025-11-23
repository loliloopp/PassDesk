import { useState, useEffect } from 'react';
import { Modal, Table, Checkbox, Space, Button, App } from 'antd';
import { FileExcelOutlined } from '@ant-design/icons';
import { employeeService } from '../../services/employeeService';
import dayjs from 'dayjs';
import * as XLSX from 'xlsx';
import { formatSnils, formatKig, formatInn } from '../../utils/formatters';

const ApplicationRequestModal = ({ visible, onCancel, employees: allEmployees }) => {
  const { message } = App.useApp();
  const [loading, setLoading] = useState(false);
  const [selectedEmployees, setSelectedEmployees] = useState([]);
  const [allSelected, setAllSelected] = useState(false);

  // Фильтруем только сотрудников со статусами new и tb_passed
  const availableEmployees = allEmployees.filter(emp => 
    emp.status === 'new' || emp.status === 'tb_passed'
  );

  useEffect(() => {
    if (visible) {
      setSelectedEmployees(availableEmployees.map(emp => emp.id));
      setAllSelected(true);
    }
  }, [visible, availableEmployees]);

  // Обработчик выбора/снятия всех
  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedEmployees(availableEmployees.map(emp => emp.id));
      setAllSelected(true);
    } else {
      setSelectedEmployees([]);
      setAllSelected(false);
    }
  };

  // Обработчик изменения чекбокса строки
  const handleRowSelection = {
    selectedRowKeys: selectedEmployees,
    onChange: (selectedRowKeys) => {
      setSelectedEmployees(selectedRowKeys);
      setAllSelected(selectedRowKeys.length === availableEmployees.length);
    },
  };

  // Создание и экспорт Excel файла
  const handleCreateRequest = async () => {
    if (selectedEmployees.length === 0) {
      message.warning('Выберите хотя бы одного сотрудника для заявки');
      return;
    }

    try {
      setLoading(true);

      // Фильтруем только выбранных сотрудников
      const employeesToExport = availableEmployees.filter(emp => selectedEmployees.includes(emp.id));

      // Формируем данные для Excel
      const excelData = employeesToExport.map((emp, index) => {
        return {
          '№': index + 1,
          'Ф.И.О.': `${emp.lastName} ${emp.firstName} ${emp.middleName || ''}`,
          'КИГ': formatKig(emp.kig),
          'Гражданство': emp.citizenship?.name || '-',
          'Дата рождения': emp.birthDate ? dayjs(emp.birthDate).format('DD.MM.YYYY') : '-',
          'СНИЛС': formatSnils(emp.snils),
          'Должность': emp.position?.name || '-',
          'ИНН сотрудника': formatInn(emp.inn),
        };
      });

      // Создаем Excel файл
      const worksheet = XLSX.utils.json_to_sheet(excelData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Заявка');

      // Генерируем имя файла
      const fileName = `Заявка_${dayjs().format('DD-MM-YYYY_HH-mm')}.xlsx`;

      // Сохраняем файл
      XLSX.writeFile(workbook, fileName);

      // Обновляем статусы сотрудников: new и tb_passed -> processed
      const employeesToUpdate = employeesToExport
        .filter(emp => emp.status === 'new' || emp.status === 'tb_passed')
        .map(emp => ({ id: emp.id, status: 'processed' }));
      
      if (employeesToUpdate.length > 0) {
        console.log('📋 Обновляем статусы для сотрудников:', employeesToUpdate);
        try {
          const updateResults = await Promise.all(
            employeesToUpdate.map(({ id, status }) => {
              console.log(`  Отправляем обновление для сотрудника ${id}: status = '${status}'`);
              return employeeService.update(id, { status });
            })
          );
          console.log('✅ Все статусы обновлены успешно:', updateResults);
        } catch (updateError) {
          console.error('❌ Ошибка при обновлении статусов:', updateError);
          throw updateError;
        }
      } else {
        console.log('⚠️ Нет сотрудников для обновления статусов');
      }

      message.success(`Файл успешно сохранен: ${fileName}`);
      onCancel();
    } catch (error) {
      console.error('Create request error:', error);
      message.error('Ошибка при создании заявки');
    } finally {
      setLoading(false);
    }
  };

  const columns = [
    { title: '№', render: (_, __, index) => index + 1, width: 50 },
    {
      title: 'Ф.И.О.',
      render: (_, record) => `${record.lastName} ${record.firstName} ${record.middleName || ''}`,
      ellipsis: true,
    },
    { title: 'КИГ', dataIndex: 'kig', key: 'kig', ellipsis: true, render: (value) => formatKig(value) },
    { title: 'Гражданство', dataIndex: ['citizenship', 'name'], key: 'citizenship', ellipsis: true },
    {
      title: 'Дата рождения',
      dataIndex: 'birthDate',
      key: 'birthDate',
      render: (date) => (date ? dayjs(date).format('DD.MM.YYYY') : '-'),
      ellipsis: true,
    },
    { title: 'СНИЛС', dataIndex: 'snils', key: 'snils', ellipsis: true, render: (value) => formatSnils(value) },
    { title: 'Должность', dataIndex: ['position', 'name'], key: 'position', ellipsis: true },
    { title: 'ИНН сотрудника', dataIndex: 'inn', key: 'inn', ellipsis: true, render: (value) => formatInn(value) },
  ];

  return (
    <Modal
      title="Создать заявку"
      open={visible}
      onCancel={onCancel}
      width={1200}
      footer={
        <Space>
          <Button onClick={onCancel}>Отмена</Button>
          <Button
            type="primary"
            icon={<FileExcelOutlined />}
            onClick={handleCreateRequest}
            loading={loading}
            disabled={selectedEmployees.length === 0}
          >
            Создать ({selectedEmployees.length})
          </Button>
        </Space>
      }
    >
      <Space direction="vertical" size="middle" style={{ width: '100%' }}>
        {/* Чекбокс "Выделить все / Снять все" */}
        {availableEmployees.length > 0 && (
          <Checkbox
            checked={allSelected}
            onChange={handleSelectAll}
            indeterminate={selectedEmployees.length > 0 && selectedEmployees.length < availableEmployees.length}
          >
            Выделить все ({availableEmployees.length})
          </Checkbox>
        )}

        {/* Таблица сотрудников */}
        {availableEmployees.length > 0 && (
          <Table
            rowSelection={handleRowSelection}
            columns={columns}
            dataSource={availableEmployees}
            rowKey="id"
            loading={loading}
            size="small"
            pagination={{ pageSize: 10, showSizeChanger: true }}
            scroll={{ x: 1200 }}
          />
        )}

        {availableEmployees.length === 0 && !loading && (
          <div style={{ textAlign: 'center', padding: '20px', color: '#999' }}>
            Нет доступных сотрудников (требуются статусы: новый или прошедший ТБ)
          </div>
        )}
      </Space>
    </Modal>
  );
};

export default ApplicationRequestModal;

