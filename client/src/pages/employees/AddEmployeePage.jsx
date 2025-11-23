import { useNavigate, useParams } from 'react-router-dom';
import { Button, Typography, Grid, App } from 'antd';
import { ArrowLeftOutlined } from '@ant-design/icons';
import { useState, useEffect } from 'react';
import { useEmployeeActions } from '@/entities/employee';
import { employeeService } from '@/services/employeeService';
import MobileEmployeeForm from '@/components/Employees/MobileEmployeeForm';
import EmployeeFormModal from '@/components/Employees/EmployeeFormModal';

const { Title } = Typography;
const { useBreakpoint } = Grid;

/**
 * Страница добавления/редактирования сотрудника
 * Используется на мобильных устройствах как отдельная страница
 * На десктопе остается модальное окно
 */
const AddEmployeePage = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const { message } = App.useApp();
  const screens = useBreakpoint();
  const isMobile = !screens.md;
  
  const [editingEmployee, setEditingEmployee] = useState(null);
  const [loading, setLoading] = useState(false);


  const { createEmployee, updateEmployee } = useEmployeeActions(() => {
    // Не нужно refetch, так как мы уходим со страницы
  });

  // Загружаем сотрудника при редактировании
  useEffect(() => {
    if (id) {
      setLoading(true);
      employeeService
        .getById(id)
        .then((response) => {
          setEditingEmployee(response.data);
        })
        .catch((error) => {
          message.error('Ошибка загрузки данных сотрудника');
          console.error('Error loading employee:', error);
          navigate('/employees');
        })
        .finally(() => {
          setLoading(false);
        });
    }
  }, [id, navigate, message]);

  const handleFormSuccess = async (values) => {
    try {
      if (editingEmployee) {
        // Обновление существующего сотрудника
        const updated = await updateEmployee(editingEmployee.id, values);
        setEditingEmployee(updated);
        
        // При сохранении черновика остаемся на странице
        if (!values.isDraft) {
          // После полного сохранения возвращаемся к списку
          setTimeout(() => {
            navigate('/employees');
          }, 1000);
        }
      } else {
        // Создание нового сотрудника
        const newEmployee = await createEmployee(values);
        setEditingEmployee(newEmployee);
        
        // При сохранении черновика остаемся на странице
        if (!values.isDraft) {
          // После полного сохранения возвращаемся к списку
          setTimeout(() => {
            navigate('/employees');
          }, 1000);
        }
      }
    } catch (error) {
      // Ошибка уже обработана в хуке
      throw error;
    }
  };

  const handleCancel = () => {
    navigate('/employees');
  };

  const handleClose = () => {
    navigate('/employees');
  };

  return (
    <div style={isMobile ? { display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' } : {}}>
      {/* Шапка с кнопкой назад (только для десктопа) */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          marginBottom: isMobile ? 0 : 24,
          gap: 16,
          position: 'sticky',
          top: 0,
          background: '#fff',
          zIndex: 100,
          padding: '16px 24',
          borderBottom: '1px solid #f0f0f0',
        }}
      >
        {!isMobile && (
          <Button
            icon={<ArrowLeftOutlined />}
            onClick={() => navigate('/employees')}
            size="large"
          >
            Назад
          </Button>
        )}
        <Title level={isMobile ? 4 : 2} style={{ margin: 0 }}>
          {id ? 'Редактирование сотрудника' : 'Добавление сотрудника'}
        </Title>
      </div>

      {/* Форма - мобильная или десктопная */}
      <div style={isMobile ? { flex: 1, overflow: 'hidden' } : {}}>
        {isMobile ? (
          <MobileEmployeeForm
            employee={editingEmployee}
            onSuccess={handleFormSuccess}
            onCancel={handleCancel}
          />
        ) : (
          <EmployeeFormModal
            visible={true}
            employee={editingEmployee}
            onCancel={handleClose}
            onSuccess={handleFormSuccess}
          />
        )}
      </div>
    </div>
  );
};

export default AddEmployeePage;

