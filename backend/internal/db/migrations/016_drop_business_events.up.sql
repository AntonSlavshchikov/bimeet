-- Разделение продуктов (docs/company.md, Этап 32): из Bimeet for People
-- деловые встречи уходят полностью. Разовая чистка — удаляем все business-события
-- (каскадом уносит participants/polls/items/carpools/change_logs через FK)
-- и таблицу ссылок на материалы, которая была чисто корпоративной фичей.

DELETE FROM events WHERE category = 'business';

DROP TABLE IF EXISTS event_links;
