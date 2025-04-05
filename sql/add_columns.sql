-- SQL para agregar las columnas necesarias a la tabla products

-- Verificar si la columna 'price' ya existe, y si no, agregarla
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'products'
        AND column_name = 'price'
    ) THEN
        ALTER TABLE products ADD COLUMN price DECIMAL(10, 2) DEFAULT 0;
    END IF;
END $$;

-- Verificar si la columna 'enabled' ya existe, y si no, agregarla
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'products'
        AND column_name = 'enabled'
    ) THEN
        ALTER TABLE products ADD COLUMN enabled BOOLEAN DEFAULT TRUE;
    END IF;
END $$;

-- Verificar si la columna 'silhouette' ya existe, y si no, agregarla
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'products'
        AND column_name = 'silhouette'
    ) THEN
        ALTER TABLE products ADD COLUMN silhouette TEXT;
    END IF;
END $$;

-- Verificar si la columna 'gender' ya existe, y si no, agregarla
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'products'
        AND column_name = 'gender'
    ) THEN
        ALTER TABLE products ADD COLUMN gender TEXT;
    END IF;
END $$;

-- Verificar si la columna 'product_type' ya existe, y si no, agregarla
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'products'
        AND column_name = 'product_type'
    ) THEN
        ALTER TABLE products ADD COLUMN product_type TEXT;
    END IF;
END $$;

-- Verificar si la columna 'status' ya existe, y si no, agregarla
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'products'
        AND column_name = 'status'
    ) THEN
        ALTER TABLE products ADD COLUMN status TEXT;
    END IF;
END $$;
