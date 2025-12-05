import { useNavigate, useParams } from 'react-router-dom';
import { Button, Typography, Grid, App } from 'antd';
import { ArrowLeftOutlined } from '@ant-design/icons';
import { useState, useEffect } from 'react';
import { useEmployeeActions, useCheckInn } from '@/entities/employee';
import { employeeService } from '@/services/employeeService';
import MobileEmployeeForm from '@/components/Employees/MobileEmployeeForm';
import EmployeeFormModal from '@/components/Employees/EmployeeFormModal';
import { usePageTitle } from '@/hooks/usePageTitle';

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
  const { message, modal } = App.useApp();
  const screens = useBreakpoint();
  const isMobile = !screens.md;
  
  const [editingEmployee, setEditingEmployee] = useState(null);
  const [loading, setLoading] = useState(false);

  const { createEmployee, updateEmployee } = useEmployeeActions(() => {
    // Не нужно refetch, так как мы уходим со страницы
  });

  const { checkInn } = useCheckInn();

  // Обработчик проверки ИНН с показом модального окна
  const handleCheckInn = async (innValue) => {
    try {
      const foundEmployee = await checkInn(innValue);
      if (foundEmployee) {
        const fullName = [foundEmployee.lastName, foundEmployee.firstName, foundEmployee.middleName]
          .filter(Boolean)
          .join(' ');
        
        modal.confirm({
          title: 'Сотрудник с таким ИНН уже существует',
          content: `Перейти к редактированию?\n\n${fullName}`,
          okText: 'ОК',
          cancelText: 'Отмена',
          onOk: () => {
            navigate(`/employees/edit/${foundEmployee.id}`);
          },
        });
      }
    } catch (error) {
      // Обработка ошибки 409 - сотрудник найден в другом контрагенте
      if (error.response?.status === 409) {
        modal.error({
          title: 'Ошибка',
          content: error.response?.data?.message || 'Сотрудник с таким ИНН уже существует. Обратитесь к администратору.',
          okText: 'ОК'
        });
      } else {
        console.error('Ошибка при проверке ИНН:', error);
      }
    }
  };

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

  // Устанавливаем название страницы для мобильной версии
  usePageTitle(id ? 'Редактирование' : 'Добавление', isMobile);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      {/* Шапка с кнопкой назад для десктопной версии */}
      {!isMobile && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            marginBottom: 24,
            gap: 16,
            padding: '16px 24',
            flexShrink: 0
          }}
        >
          <Button
            icon={<ArrowLeftOutlined />}
            onClick={() => navigate('/employees')}
            size="large"
          >
            Назад
          </Button>
          <Title level={2} style={{ margin: 0 }}>
            {id ? 'Редактирование сотрудника' : 'Добавление сотрудника'}
          </Title>
        </div>
      )}

      {/* Форма - мобильная или десктопная */}
      <div style={{ flex: 1, minHeight: 0, overflow: 'hidden' }}>
        {isMobile ? (
        <MobileEmployeeForm
          employee={editingEmployee}
          onSuccess={handleFormSuccess}
          onCancel={handleCancel}
          onCheckInn={handleCheckInn}
        />
        ) : (
        <EmployeeFormModal
          visible={true}
          employee={editingEmployee}
          onCancel={handleClose}
          onSuccess={handleFormSuccess}
          onCheckInn={handleCheckInn}
        />
        )}
      </div>
    </div>
  );
};

export default AddEmployeePage;

