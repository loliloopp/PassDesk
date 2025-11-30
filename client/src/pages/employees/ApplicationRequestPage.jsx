import { useState, useMemo, useEffect } from 'react';
import { Typography, Button, Checkbox, Space, App, Spin, Empty, Input, Segmented } from 'antd';
import { ArrowLeftOutlined, FileExcelOutlined, SearchOutlined, UserAddOutlined, TeamOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useEmployees } from '@/entities/employee';
import { employeeService } from '@/services/employeeService';
import { employeeStatusService } from '@/services/employeeStatusService';
import { applicationService } from '@/services/applicationService';
import dayjs from 'dayjs';
import * as XLSX from 'xlsx';
import { formatSnils, formatKig, formatInn } from '@/utils/formatters';

const { Title } = Typography;

const ApplicationRequestPage = () => {
  const { message } = App.useApp();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [selectedEmployees, setSelectedEmployees] = useState([]);
  const [allSelected, setAllSelected] = useState(false);
  const [employeeFilter, setEmployeeFilter] = useState('new'); // 'new' или 'all'

  // Получаем список сотрудников
  const { employees, loading: employeesLoading, refetch: refetchEmployees } = useEmployees();

  // Фильтруем сотрудников в зависимости от выбранного режима
  const availableEmployees = useMemo(() => {
    let filtered = employees;
    
    // Применяем поиск если есть
    if (searchText) {
      const searchLower = searchText.toLowerCase();
      filtered = filtered.filter((employee) => {
        return (
          employee.firstName?.toLowerCase().includes(searchLower) ||
          employee.lastName?.toLowerCase().includes(searchLower) ||
          employee.middleName?.toLowerCase().includes(searchLower) ||
          employee.position?.name?.toLowerCase().includes(searchLower) ||
          employee.inn?.toLowerCase().includes(searchLower) ||
          employee.snils?.toLowerCase().includes(searchLower)
        );
      });
    }
    
    // Фильтруем по статусам в зависимости от режима
    return filtered.filter(emp => {
      const statusMapping = emp.statusMappings?.find(m => m.statusGroup === 'status' || m.status_group === 'status');
      const statusName = statusMapping?.status?.name;
      
      if (employeeFilter === 'new') {
        // Только новые: status_new и status_tb_passed
        return statusName === 'status_new' || statusName === 'status_tb_passed';
      } else {
        // Все: status_new, status_tb_passed, status_processed
        return statusName === 'status_new' || statusName === 'status_tb_passed' || statusName === 'status_processed';
      }
    });
  }, [employees, searchText, employeeFilter]);

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

      // Создаем заявку в БД
      await applicationService.create({
        employeeIds: selectedEmployees,
        // constructionSiteId и passValidUntil теперь необязательны
      });

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
      
      // Устанавливаем ширину столбцов (в символах, где 1 символ ≈ 7px)
      worksheet['!cols'] = [
        { wch: 6 },    // A: 40px
        { wch: 43 },   // B: 300px
        { wch: 17 },   // C: 120px
        { wch: 17 },   // D: 120px
        { wch: 17 },   // E: 120px
        { wch: 17 },   // F: 120px
        { wch: 20 },   // G: 140px
        { wch: 17 },   // H: 120px
      ];
      
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Заявка');

      // Генерируем имя файла
      const fileName = `Заявка_${dayjs().format('DD-MM-YYYY_HH-mm')}.xlsx`;

      // Сохраняем файл
      XLSX.writeFile(workbook, fileName);

      // Статусы обновляются на сервере автоматически при создании заявки
      message.success(`Заявка создана и файл сохранен: ${fileName}`);
      
      // Обновляем данные и возвращаемся
      await refetchEmployees();
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
      height: '100%', 
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
        flexDirection: 'column',
        gap: 12,
        flexShrink: 0
      }}>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <Button 
              type="text" 
              icon={<ArrowLeftOutlined />}
              onClick={() => navigate('/employees')}
              size="large"
            />
            <Title level={3} style={{ margin: 0 }}>Создать заявку</Title>
          </div>
          <Input
            placeholder="Поиск по ФИО, должности, ИНН, СНИЛС..."
            prefix={<SearchOutlined />}
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            allowClear
            style={{ width: 300 }}
          />
        </div>
        
        {/* Переключатель режима фильтрации */}
        <Segmented
          value={employeeFilter}
          onChange={setEmployeeFilter}
          options={[
            {
              label: 'Новые сотрудники',
              value: 'new',
              icon: <UserAddOutlined />
            },
            {
              label: 'Все сотрудники',
              value: 'all',
              icon: <TeamOutlined />
            }
          ]}
          style={{ alignSelf: 'flex-start' }}
        />
      </div>

      {/* Контент */}
      <div style={{ flex: 1, minHeight: 0, overflow: 'auto', padding: '16px', paddingBottom: '100px' }}>
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
                      {(() => {
                        const statusMapping = employee.statusMappings?.find(m => m.statusGroup === 'status' || m.status_group === 'status');
                        const statusName = statusMapping?.status?.name;
                        if (statusName === 'status_new') {
                          return <span style={{ marginLeft: 8, color: '#faad14' }}>● Новый</span>;
                        }
                        if (statusName === 'status_tb_passed') {
                          return <span style={{ marginLeft: 8, color: '#52c41a' }}>● Прошел ТБ</span>;
                        }
                        if (statusName === 'status_processed') {
                          return <span style={{ marginLeft: 8, color: '#1890ff' }}>● Обработан</span>;
                        }
                        return null;
                      })()}
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
        zIndex: 100,
        maxWidth: '100vw'
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

