-- Script para aplicar Row Level Security a tablas pendientes
-- Ejecutar en la consola SQL de Supabase
-- Fecha: 2025-10-27

-- ============================================
-- 1. TABLA USERS - Row Level Security
-- ============================================

-- Habilitar RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- DROP policies existentes si existen (para evitar duplicados)
DROP POLICY IF EXISTS "users_select_policy" ON users;
DROP POLICY IF EXISTS "users_insert_policy" ON users;
DROP POLICY IF EXISTS "users_update_policy" ON users;
DROP POLICY IF EXISTS "users_delete_policy" ON users;

-- SELECT: Superadmins pueden ver todos, otros solo a sí mismos
CREATE POLICY "users_select_policy" ON users FOR SELECT USING (
  CASE
    WHEN (SELECT role FROM users WHERE id = auth.uid()) = 'superadmin' THEN true
    ELSE id = auth.uid()
  END
);

-- INSERT: Solo superadmins pueden crear usuarios
CREATE POLICY "users_insert_policy" ON users FOR INSERT WITH CHECK (
  (SELECT role FROM users WHERE id = auth.uid()) = 'superadmin'
);

-- UPDATE: Superadmins pueden actualizar todos, usuarios pueden actualizarse a sí mismos (excepto rol)
CREATE POLICY "users_update_policy" ON users FOR UPDATE USING (
  CASE
    WHEN (SELECT role FROM users WHERE id = auth.uid()) = 'superadmin' THEN true
    WHEN id = auth.uid() THEN true
    ELSE false
  END
) WITH CHECK (
  CASE
    WHEN (SELECT role FROM users WHERE id = auth.uid()) = 'superadmin' THEN true
    -- Los usuarios no pueden cambiar su propio rol
    WHEN id = auth.uid() AND role = (SELECT role FROM users WHERE id = auth.uid()) THEN true
    ELSE false
  END
);

-- DELETE: Solo superadmins pueden eliminar usuarios
CREATE POLICY "users_delete_policy" ON users FOR DELETE USING (
  (SELECT role FROM users WHERE id = auth.uid()) = 'superadmin'
);

-- ============================================
-- 2. TABLA BRANDS - Row Level Security
-- ============================================

-- Habilitar RLS
ALTER TABLE brands ENABLE ROW LEVEL SECURITY;

-- DROP policies existentes si existen (para evitar duplicados)
DROP POLICY IF EXISTS "brands_select_policy" ON brands;
DROP POLICY IF EXISTS "brands_insert_policy" ON brands;
DROP POLICY IF EXISTS "brands_update_policy" ON brands;
DROP POLICY IF EXISTS "brands_delete_policy" ON brands;

-- SELECT: Todos los usuarios autenticados pueden ver marcas (pero solo las asignadas vía user_brands)
CREATE POLICY "brands_select_policy" ON brands FOR SELECT USING (
  CASE
    -- Superadmins ven todas las marcas
    WHEN (SELECT role FROM users WHERE id = auth.uid()) = 'superadmin' THEN true
    -- Admins y clientes solo ven marcas asignadas
    ELSE id IN (
      SELECT brand_id FROM user_brands WHERE user_id = auth.uid()
    )
  END
);

-- INSERT: Solo superadmins pueden crear marcas
CREATE POLICY "brands_insert_policy" ON brands FOR INSERT WITH CHECK (
  (SELECT role FROM users WHERE id = auth.uid()) = 'superadmin'
);

-- UPDATE: Solo superadmins pueden actualizar marcas
CREATE POLICY "brands_update_policy" ON brands FOR UPDATE USING (
  (SELECT role FROM users WHERE id = auth.uid()) = 'superadmin'
) WITH CHECK (
  (SELECT role FROM users WHERE id = auth.uid()) = 'superadmin'
);

-- DELETE: Solo superadmins pueden eliminar marcas
CREATE POLICY "brands_delete_policy" ON brands FOR DELETE USING (
  (SELECT role FROM users WHERE id = auth.uid()) = 'superadmin'
);

-- ============================================
-- 3. TABLA USER_BRANDS - Row Level Security
-- ============================================

-- Habilitar RLS
ALTER TABLE user_brands ENABLE ROW LEVEL SECURITY;

-- DROP policies existentes si existen (para evitar duplicados)
DROP POLICY IF EXISTS "user_brands_select_policy" ON user_brands;
DROP POLICY IF EXISTS "user_brands_insert_policy" ON user_brands;
DROP POLICY IF EXISTS "user_brands_update_policy" ON user_brands;
DROP POLICY IF EXISTS "user_brands_delete_policy" ON user_brands;

-- SELECT: Superadmins pueden ver todas las asignaciones, usuarios ven solo las suyas
CREATE POLICY "user_brands_select_policy" ON user_brands FOR SELECT USING (
  CASE
    WHEN (SELECT role FROM users WHERE id = auth.uid()) = 'superadmin' THEN true
    ELSE user_id = auth.uid()
  END
);

-- INSERT: Solo superadmins pueden crear asignaciones
CREATE POLICY "user_brands_insert_policy" ON user_brands FOR INSERT WITH CHECK (
  (SELECT role FROM users WHERE id = auth.uid()) = 'superadmin'
);

-- UPDATE: Solo superadmins pueden actualizar asignaciones
CREATE POLICY "user_brands_update_policy" ON user_brands FOR UPDATE USING (
  (SELECT role FROM users WHERE id = auth.uid()) = 'superadmin'
) WITH CHECK (
  (SELECT role FROM users WHERE id = auth.uid()) = 'superadmin'
);

-- DELETE: Solo superadmins pueden eliminar asignaciones
CREATE POLICY "user_brands_delete_policy" ON user_brands FOR DELETE USING (
  (SELECT role FROM users WHERE id = auth.uid()) = 'superadmin'
);

-- ============================================
-- 4. TABLA CATEGORIES - Row Level Security
-- ============================================

-- Verificar si la tabla existe antes de aplicar RLS
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'categories') THEN
        -- Habilitar RLS
        ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
        
        -- DROP policies existentes si existen (para evitar duplicados)
        DROP POLICY IF EXISTS "categories_select_policy" ON categories;
        DROP POLICY IF EXISTS "categories_insert_policy" ON categories;
        DROP POLICY IF EXISTS "categories_update_policy" ON categories;
        DROP POLICY IF EXISTS "categories_delete_policy" ON categories;
        
        -- SELECT: Todos los usuarios autenticados pueden ver categorías
        CREATE POLICY "categories_select_policy" ON categories FOR SELECT USING (
          auth.uid() IS NOT NULL
        );
        
        -- INSERT: Solo superadmins y admins pueden crear categorías
        CREATE POLICY "categories_insert_policy" ON categories FOR INSERT WITH CHECK (
          (SELECT role FROM users WHERE id = auth.uid()) IN ('superadmin', 'admin')
        );
        
        -- UPDATE: Solo superadmins y admins pueden actualizar categorías
        CREATE POLICY "categories_update_policy" ON categories FOR UPDATE USING (
          (SELECT role FROM users WHERE id = auth.uid()) IN ('superadmin', 'admin')
        ) WITH CHECK (
          (SELECT role FROM users WHERE id = auth.uid()) IN ('superadmin', 'admin')
        );
        
        -- DELETE: Solo superadmins pueden eliminar categorías
        CREATE POLICY "categories_delete_policy" ON categories FOR DELETE USING (
          (SELECT role FROM users WHERE id = auth.uid()) = 'superadmin'
        );
        
        RAISE NOTICE 'RLS aplicado correctamente a la tabla categories';
    ELSE
        RAISE NOTICE 'La tabla categories no existe, saltando RLS para categories';
    END IF;
END $$;

-- ============================================
-- 5. VERIFICACIÓN DE POLÍTICAS APLICADAS
-- ============================================

-- Consulta para verificar que todas las políticas estén aplicadas
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies 
WHERE schemaname = 'public' 
  AND tablename IN ('users', 'brands', 'user_brands', 'categories')
ORDER BY tablename, policyname;

-- Verificar que RLS esté habilitado en todas las tablas
SELECT 
  schemaname,
  tablename,
  rowsecurity as "RLS Habilitado"
FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename IN ('users', 'brands', 'user_brands', 'categories', 'products', 'product_variants', 'orders', 'order_items');

-- ============================================
-- COMENTARIOS Y DOCUMENTACIÓN
-- ============================================

COMMENT ON POLICY "users_select_policy" ON users IS 
'Superadmins pueden ver todos los usuarios, otros usuarios solo pueden verse a sí mismos';

COMMENT ON POLICY "users_insert_policy" ON users IS 
'Solo superadmins pueden crear nuevos usuarios';

COMMENT ON POLICY "users_update_policy" ON users IS 
'Superadmins pueden actualizar cualquier usuario, usuarios pueden actualizarse a sí mismos excepto su rol';

COMMENT ON POLICY "users_delete_policy" ON users IS 
'Solo superadmins pueden eliminar usuarios';

COMMENT ON POLICY "brands_select_policy" ON brands IS 
'Superadmins ven todas las marcas, admins/clientes solo ven marcas asignadas vía user_brands';

COMMENT ON POLICY "brands_insert_policy" ON brands IS 
'Solo superadmins pueden crear marcas';

COMMENT ON POLICY "user_brands_select_policy" ON user_brands IS 
'Superadmins ven todas las asignaciones, usuarios ven solo sus asignaciones';

-- ============================================
-- FIN DEL SCRIPT
-- ============================================

-- Mensaje de finalización
DO $$ 
BEGIN
    RAISE NOTICE '✅ RLS aplicado correctamente a las tablas: users, brands, user_brands, categories';
    RAISE NOTICE '⚠️ IMPORTANTE: Verifica que el contexto auth.uid() funcione correctamente con tu sistema de autenticación';
    RAISE NOTICE '📝 Revisa las políticas creadas con las consultas de verificación incluidas arriba';
END $$;

