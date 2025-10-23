-- Script para crear la tabla de pedidos
-- Ejecutar en la consola SQL de Supabase

-- Tabla principal de pedidos
CREATE TABLE IF NOT EXISTS orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  brand_name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'processing', 'completed', 'cancelled')),
  total_items INTEGER NOT NULL DEFAULT 0,
  total_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  processed_by UUID REFERENCES users(id),
  processed_at TIMESTAMP WITH TIME ZONE
);

-- Tabla de items de pedidos
CREATE TABLE IF NOT EXISTS order_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id),
  product_sku TEXT NOT NULL,
  product_name TEXT NOT NULL,
  product_image TEXT,
  price DECIMAL(10,2) NOT NULL,
  size_name TEXT NOT NULL,
  quantity INTEGER NOT NULL,
  subtotal DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para optimizar consultas
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_brand_name ON orders(brand_name);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_product_id ON order_items(product_id);

-- Comentarios
COMMENT ON TABLE orders IS 'Tabla principal de pedidos realizados por los clientes';
COMMENT ON TABLE order_items IS 'Tabla de items individuales de cada pedido';

-- Habilitar Row Level Security
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para orders

-- Los superadmins pueden ver todos los pedidos
CREATE POLICY "Los superadmins pueden ver todos los pedidos" 
  ON orders FOR SELECT 
  USING (auth.jwt() ->> 'role' = 'superadmin');

-- Los admins pueden ver pedidos de sus marcas asignadas
CREATE POLICY "Los admins pueden ver pedidos de sus marcas" 
  ON orders FOR SELECT 
  USING (
    auth.jwt() ->> 'role' = 'admin' AND 
    brand_name IN (
      SELECT b.name 
      FROM brands b
      JOIN user_brands ub ON b.id = ub.brand_id
      WHERE ub.user_id = auth.uid()
    )
  );

-- Los clientes pueden ver solo sus propios pedidos
CREATE POLICY "Los clientes pueden ver sus propios pedidos" 
  ON orders FOR SELECT 
  USING (auth.uid() = user_id);

-- Los clientes pueden crear pedidos
CREATE POLICY "Los clientes pueden crear pedidos" 
  ON orders FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

-- Los admins y superadmins pueden actualizar pedidos
CREATE POLICY "Los admins y superadmins pueden actualizar pedidos" 
  ON orders FOR UPDATE 
  USING (
    auth.jwt() ->> 'role' IN ('superadmin', 'admin') AND
    (
      auth.jwt() ->> 'role' = 'superadmin' OR
      brand_name IN (
        SELECT b.name 
        FROM brands b
        JOIN user_brands ub ON b.id = ub.brand_id
        WHERE ub.user_id = auth.uid()
      )
    )
  );

-- Políticas RLS para order_items

-- Los superadmins pueden ver todos los items
CREATE POLICY "Los superadmins pueden ver todos los items de pedidos" 
  ON order_items FOR SELECT 
  USING (auth.jwt() ->> 'role' = 'superadmin');

-- Los admins pueden ver items de pedidos de sus marcas
CREATE POLICY "Los admins pueden ver items de pedidos de sus marcas" 
  ON order_items FOR SELECT 
  USING (
    auth.jwt() ->> 'role' = 'admin' AND 
    order_id IN (
      SELECT id FROM orders 
      WHERE brand_name IN (
        SELECT b.name 
        FROM brands b
        JOIN user_brands ub ON b.id = ub.brand_id
        WHERE ub.user_id = auth.uid()
      )
    )
  );

-- Los clientes pueden ver items de sus propios pedidos
CREATE POLICY "Los clientes pueden ver items de sus propios pedidos" 
  ON order_items FOR SELECT 
  USING (
    order_id IN (
      SELECT id FROM orders WHERE user_id = auth.uid()
    )
  );

-- Los clientes pueden crear items de pedidos
CREATE POLICY "Los clientes pueden crear items de pedidos" 
  ON order_items FOR INSERT 
  WITH CHECK (
    order_id IN (
      SELECT id FROM orders WHERE user_id = auth.uid()
    )
  );

-- Función para actualizar el timestamp de updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger para actualizar updated_at automáticamente
CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON orders
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column(); 