-- Таблица для связи контрагентов и объектов (площадок)
CREATE TABLE counterparty_construction_sites_mapping (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  counterparty_id UUID NOT NULL REFERENCES counterparties(id) ON DELETE CASCADE,
  construction_site_id UUID NOT NULL REFERENCES construction_sites(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  
  -- Уникальное ограничение чтобы не было дублей
  UNIQUE(counterparty_id, construction_site_id)
);

-- Индексы для оптимизации запросов
CREATE INDEX idx_ccm_counterparty_id ON counterparty_construction_sites_mapping(counterparty_id);
CREATE INDEX idx_ccm_construction_site_id ON counterparty_construction_sites_mapping(construction_site_id);

-- Триггер для обновления updated_at
CREATE TRIGGER update_counterparty_construction_sites_mapping_updated_at
BEFORE UPDATE ON counterparty_construction_sites_mapping
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

