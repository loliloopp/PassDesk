import { useState, useEffect } from 'react';
import { Input, Button, Space, Checkbox } from 'antd';

/**
 * Компонент фильтра для колонки "ФИО"
 * Включает поле поиска и список с чекбоксами
 */
export const FullNameFilterDropdown = ({
  setSelectedKeys,
  selectedKeys,
  confirm,
  clearFilters,
  uniqueFilterFullNames,
  resetTrigger,
}) => {
  const [searchText, setSearchText] = useState('');

  // Очищаем поле поиска при сбросе фильтров на странице
  useEffect(() => {
    setSearchText('');
  }, [resetTrigger]);

  const filteredFullNames = uniqueFilterFullNames.filter((name) =>
    name.toLowerCase().includes(searchText.toLowerCase())
  );

  const handleReset = () => {
    setSearchText('');
    setSelectedKeys([]);
    clearFilters();
  };

  return (
    <div style={{ padding: '8px', minWidth: '250px' }}>
      <Input
        placeholder="Поиск по ФИО..."
        value={searchText}
        onChange={(e) => setSearchText(e.target.value)}
        style={{ marginBottom: '8px' }}
        autoFocus
      />
      <div style={{ maxHeight: '200px', overflow: 'auto', marginBottom: '8px' }}>
        {filteredFullNames.map((name) => (
          <div key={name} style={{ marginBottom: '4px' }}>
            <Checkbox
              checked={selectedKeys.includes(name)}
              onChange={(e) => {
                if (e.target.checked) {
                  setSelectedKeys([...selectedKeys, name]);
                } else {
                  setSelectedKeys(selectedKeys.filter((v) => v !== name));
                }
              }}
            >
              {name}
            </Checkbox>
          </div>
        ))}
      </div>
      <Space style={{ width: '100%', justifyContent: 'space-between' }}>
        <Button
          type="primary"
          onClick={() => confirm()}
          size="small"
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

