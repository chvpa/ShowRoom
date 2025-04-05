-- SQL para actualizar la estructura de la tabla products
ALTER TABLE products ADD COLUMN IF NOT EXISTS rubro TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS curva_simple INTEGER;
ALTER TABLE products ADD COLUMN IF NOT EXISTS curva_reforzada INTEGER;
ALTER TABLE products ADD COLUMN IF NOT EXISTS talla TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS stock_quantity INTEGER;
