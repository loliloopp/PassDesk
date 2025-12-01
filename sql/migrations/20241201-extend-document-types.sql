-- Расширение списка типов документов
-- Добавление новых типов: диплом, мед.книжка, миграционная карта, 
-- уведомление о прибытии, чек об оплате патента, уведомление МВД

ALTER TYPE document_type ADD VALUE 'diploma' AFTER 'kig';
ALTER TYPE document_type ADD VALUE 'med_book' AFTER 'diploma';
ALTER TYPE document_type ADD VALUE 'migration_card' AFTER 'med_book';
ALTER TYPE document_type ADD VALUE 'arrival_notice' AFTER 'migration_card';
ALTER TYPE document_type ADD VALUE 'patent_payment_receipt' AFTER 'arrival_notice';
ALTER TYPE document_type ADD VALUE 'mvd_notification' AFTER 'patent_payment_receipt';

