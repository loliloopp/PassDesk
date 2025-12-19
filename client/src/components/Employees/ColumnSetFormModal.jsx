import { Modal, Form, Input, Checkbox, App } from 'antd';
import { useEffect } from 'react';

/**
 * Модальное окно для создания или редактирования набора столбцов
 */
const ColumnSetFormModal = ({ 
  visible, 
  onCancel, 
  onSubmit, 
  editingSet = null,
  loading = false 
}) => {
  const { message } = App.useApp();
  const [form] = Form.useForm();

  const isEditing = !!editingSet;

  // Заполняем форму при редактировании
  useEffect(() => {
    if (visible) {
      if (isEditing) {
        form.setFieldsValue({
          name: editingSet.name,
          isDefault: editingSet.isDefault || false,
        });
      } else {
        form.resetFields();
      }
    }
  }, [visible, isEditing, editingSet, form]);

  // Обработчик отправки формы
  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      await onSubmit(values);
      form.resetFields();
    } catch (error) {
      if (error.errorFields) {
        message.error('Пожалуйста, заполните все обязательные поля');
      }
    }
  };

  return (
    <Modal
      title={isEditing ? 'Редактировать набор' : 'Создать новый набор'}
      open={visible}
      onCancel={onCancel}
      onOk={handleSubmit}
      okText={isEditing ? 'Сохранить' : 'Создать'}
      cancelText="Отмена"
      confirmLoading={loading}
      destroyOnClose
    >
      <Form
        form={form}
        layout="vertical"
        preserve={false}
      >
        <Form.Item
          name="name"
          label="Название набора"
          rules={[
            { required: true, message: 'Введите название набора' },
            { max: 100, message: 'Название не должно превышать 100 символов' },
          ]}
        >
          <Input 
            placeholder="Например: Стандартный набор" 
            maxLength={100}
            showCount
          />
        </Form.Item>

        <Form.Item
          name="isDefault"
          valuePropName="checked"
        >
          <Checkbox>Установить как набор по умолчанию</Checkbox>
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default ColumnSetFormModal;

