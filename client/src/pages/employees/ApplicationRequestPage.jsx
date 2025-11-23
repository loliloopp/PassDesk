import { useState, useMemo, useEffect } from 'react';
import { Typography, Button, Checkbox, Space, App, Spin, Empty } from 'antd';
import { ArrowLeftOutlined, FileExcelOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useEmployees } from '@/entities/employee';
import { employeeService } from '@/services/employeeService';
import dayjs from 'dayjs';
import * as XLSX from 'xlsx';
import { formatSnils, formatKig, formatInn } from '@/utils/formatters';

const { Title } = Typography;

const ApplicationRequestPage = () => {
  const { message } = App.useApp();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [selectedEmployees, setSelectedEmployees] = useState([]);
  const [allSelected, setAllSelected] = useState(false);

  // Получаем список сотрудников
  const { employees, loading: employeesLoading, refetch: refetchEmployees } = useEmployees();

  // Фильтруем только сотрудников со статусами new и tb_passed
  const availableEmployees = useMemo(() => 
    employees.filter(emp => emp.status === 'new' || emp.status === 'tb_passed'),
    [employees]
  );

  // Инициализируем выбор при загрузке
  useEffect(() => {
    if (availableEmployees.length > 0 && selectedEmployees.length === 0) {
      const allIds = availableEmployees.map(emp => emp.id);
      setSelectedEmployees(allIds);
      setAllSelected(true);
    }
  }, [availableEmployees]);

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

  // Обработчик выбора отдельного сотрудника
  const handleEmployeeToggle = (employeeId) => {
    const isSelected = selectedEmployees.includes(employeeId);
    let newSelected;
    
    if (isSelected) {
      newSelected = selectedEmployees.filter(id => id !== employeeId);
    } else {
      newSelected = [...selectedEmployees, employeeId];
    }
    
    setSelectedEmployees(newSelected);
    setAllSelected(newSelected.length === availableEmployees.length);
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
      
      // Обновляем данные и возвращаемся
      console.log('Вызываем refetch...');
      await refetchEmployees();
      console.log('Refetch завершен, возвращаемся на страницу сотрудников');
      navigate('/employees');
    } catch (error) {
      console.error('Create request error:', error);
      message.error('Ошибка при создании заявки');
    } finally {
      setLoading(false);
    }
  };

  const isLoading = employeesLoading || loading;

  return (
    <div style={{ 
      height: '100vh', 
      display: 'flex', 
      flexDirection: 'column',
      background: '#fff',
      overflow: 'hidden'
    }}>
      {/* Заголовок */}
      <div style={{ 
        padding: '16px', 
        borderBottom: '1px solid #f0f0f0',
        display: 'flex',
        gap: 12,
        alignItems: 'center',
        flexShrink: 0
      }}>
        <Button 
          type="text" 
          icon={<ArrowLeftOutlined />}
          onClick={() => navigate('/employees')}
          size="large"
        />
        <Title level={3} style={{ margin: 0 }}>Создать заявку</Title>
      </div>

      {/* Контент */}
      <div style={{ flex: 1, overflow: 'auto', padding: '16px', paddingBottom: '80px' }}>
        <Spin spinning={isLoading}>
          {availableEmployees.length > 0 ? (
            <Space direction="vertical" size="large" style={{ width: '100%' }}>
              {/* Чекбокс "Выделить все / Снять все" */}
              <Checkbox
                checked={allSelected}
                onChange={handleSelectAll}
                indeterminate={selectedEmployees.length > 0 && selectedEmployees.length < availableEmployees.length}
              >
                <strong>Выделить все ({availableEmployees.length})</strong>
              </Checkbox>

              {/* Список сотрудников */}
              <Space direction="vertical" size="small" style={{ width: '100%' }}>
                {availableEmployees.map((employee) => (
                  <div
                    key={employee.id}
                    style={{
                      padding: '12px',
                      border: '1px solid #d9d9d9',
                      borderRadius: '4px',
                      background: selectedEmployees.includes(employee.id) ? '#f6f8fb' : '#fff',
                      cursor: 'pointer',
                      transition: 'all 0.3s'
                    }}
                    onClick={() => handleEmployeeToggle(employee.id)}
                  >
                    <Checkbox
                      checked={selectedEmployees.includes(employee.id)}
                      onChange={() => handleEmployeeToggle(employee.id)}
                      onClick={(e) => e.stopPropagation()}
                      style={{ marginRight: 12 }}
                    />
                    <span style={{ fontWeight: 500 }}>
                      {employee.lastName} {employee.firstName} {employee.middleName || ''}
                    </span>
                    <div style={{ fontSize: '12px', color: '#999', marginTop: 4 }}>
                      {employee.position?.name && <span>{employee.position.name}</span>}
                      {employee.kig && <span> • КИГ: {formatKig(employee.kig)}</span>}
                      {employee.status === 'new' && <span style={{ marginLeft: 8, color: '#faad14' }}>● Новый</span>}
                      {employee.status === 'tb_passed' && <span style={{ marginLeft: 8, color: '#52c41a' }}>● Прошел ТБ</span>}
                    </div>
                  </div>
                ))}
              </Space>
            </Space>
          ) : (
            <Empty
              description="Нет доступных сотрудников"
              style={{ marginTop: '40px' }}
            />
          )}
        </Spin>
      </div>

      {/* Кнопки действий - закреплены внизу */}
      <div style={{
        padding: '16px',
        borderTop: '1px solid #f0f0f0',
        display: 'flex',
        gap: 12,
        background: '#fff',
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 100
      }}>
        <Button 
          onClick={() => navigate('/employees')}
          style={{ flex: 1 }}
        >
          Отмена
        </Button>
        <Button
          type="primary"
          icon={<FileExcelOutlined />}
          onClick={handleCreateRequest}
          loading={isLoading}
          disabled={selectedEmployees.length === 0 || availableEmployees.length === 0}
          style={{ flex: 1, background: '#52c41a', borderColor: '#52c41a' }}
        >
          Создать ({selectedEmployees.length})
        </Button>
      </div>
    </div>
  );
};

export default ApplicationRequestPage;

