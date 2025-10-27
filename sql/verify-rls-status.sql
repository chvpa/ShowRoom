-- Script para verificar el estado de Row Level Security en todas las tablas
-- Ejecutar en la consola SQL de Supabase

-- ============================================
-- 1. VERIFICAR RLS HABILITADO EN TODAS LAS TABLAS
-- ============================================

SELECT 
  schemaname as "Esquema",
  tablename as "Tabla",
  CASE 
    WHEN rowsecurity THEN '✅ Habilitado'
    ELSE '❌ Deshabilitado'
  END as "Estado RLS"
FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename IN (
    'users', 
    'brands', 
    'user_brands', 
    'categories', 
    'products', 
    'product_variants', 
    'orders', 
    'order_items'
  )
ORDER BY tablename;

-- ============================================
-- 2. LISTAR TODAS LAS POLÍTICAS EXISTENTES
-- ============================================

SELECT 
  schemaname as "Esquema",
  tablename as "Tabla",
  policyname as "Política",
  CASE cmd
    WHEN 'SELECT' THEN '📖 SELECT'
    WHEN 'INSERT' THEN '➕ INSERT'
    WHEN 'UPDATE' THEN '✏️ UPDATE'
    WHEN 'DELETE' THEN '🗑️ DELETE'
    WHEN 'ALL' THEN '🔓 ALL'
  END as "Operación",
  CASE permissive
    WHEN 'PERMISSIVE' THEN '✅ Permisivo'
    WHEN 'RESTRICTIVE' THEN '🔒 Restrictivo'
  END as "Tipo"
FROM pg_policies 
WHERE schemaname = 'public'
ORDER BY tablename, cmd, policyname;

-- ============================================
-- 3. CONTAR POLÍTICAS POR TABLA
-- ============================================

SELECT 
  tablename as "Tabla",
  COUNT(*) as "Total Políticas",
  COUNT(CASE WHEN cmd = 'SELECT' THEN 1 END) as "SELECT",
  COUNT(CASE WHEN cmd = 'INSERT' THEN 1 END) as "INSERT",
  COUNT(CASE WHEN cmd = 'UPDATE' THEN 1 END) as "UPDATE",
  COUNT(CASE WHEN cmd = 'DELETE' THEN 1 END) as "DELETE",
  COUNT(CASE WHEN cmd = 'ALL' THEN 1 END) as "ALL"
FROM pg_policies 
WHERE schemaname = 'public'
GROUP BY tablename
ORDER BY tablename;

-- ============================================
-- 4. VERIFICAR FOREIGN KEYS
-- ============================================

SELECT
  tc.table_name as "Tabla",
  kcu.column_name as "Columna",
  ccu.table_name AS "Referencia a Tabla",
  ccu.column_name AS "Referencia a Columna",
  rc.update_rule as "En Update",
  rc.delete_rule as "En Delete"
FROM information_schema.table_constraints AS tc
  JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
  JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
  JOIN information_schema.referential_constraints AS rc
    ON rc.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY' 
  AND tc.table_schema = 'public'
  AND tc.table_name IN (
    'users', 'brands', 'user_brands', 'categories', 
    'products', 'product_variants', 'orders', 'order_items'
  )
ORDER BY tc.table_name, kcu.column_name;

-- ============================================
-- 5. VERIFICAR ÍNDICES IMPORTANTES
-- ============================================

SELECT
  schemaname as "Esquema",
  tablename as "Tabla",
  indexname as "Índice",
  indexdef as "Definición"
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename IN (
    'users', 'brands', 'user_brands', 'categories', 
    'products', 'product_variants', 'orders', 'order_items'
  )
ORDER BY tablename, indexname;

-- ============================================
-- 6. RESUMEN GENERAL DEL SISTEMA
-- ============================================

DO $$ 
DECLARE
  total_tables INT;
  tables_with_rls INT;
  total_policies INT;
  tables_with_policies INT;
BEGIN
  -- Contar tablas
  SELECT COUNT(*) INTO total_tables
  FROM pg_tables 
  WHERE schemaname = 'public' 
    AND tablename IN (
      'users', 'brands', 'user_brands', 'categories', 
      'products', 'product_variants', 'orders', 'order_items'
    );
  
  -- Contar tablas con RLS habilitado
  SELECT COUNT(*) INTO tables_with_rls
  FROM pg_tables 
  WHERE schemaname = 'public' 
    AND rowsecurity = true
    AND tablename IN (
      'users', 'brands', 'user_brands', 'categories', 
      'products', 'product_variants', 'orders', 'order_items'
    );
  
  -- Contar políticas totales
  SELECT COUNT(*) INTO total_policies
  FROM pg_policies 
  WHERE schemaname = 'public'
    AND tablename IN (
      'users', 'brands', 'user_brands', 'categories', 
      'products', 'product_variants', 'orders', 'order_items'
    );
  
  -- Contar tablas con al menos una política
  SELECT COUNT(DISTINCT tablename) INTO tables_with_policies
  FROM pg_policies 
  WHERE schemaname = 'public'
    AND tablename IN (
      'users', 'brands', 'user_brands', 'categories', 
      'products', 'product_variants', 'orders', 'order_items'
    );
  
  RAISE NOTICE '=================================================';
  RAISE NOTICE '📊 RESUMEN DE SEGURIDAD RLS - SHOWROOM PROJECT';
  RAISE NOTICE '=================================================';
  RAISE NOTICE 'Total de tablas monitoreadas: %', total_tables;
  RAISE NOTICE 'Tablas con RLS habilitado: % de %', tables_with_rls, total_tables;
  RAISE NOTICE 'Total de políticas aplicadas: %', total_policies;
  RAISE NOTICE 'Tablas con políticas: % de %', tables_with_policies, total_tables;
  RAISE NOTICE '=================================================';
  
  IF tables_with_rls = total_tables AND tables_with_policies = total_tables THEN
    RAISE NOTICE '✅ SISTEMA SEGURO: Todas las tablas tienen RLS y políticas';
  ELSIF tables_with_rls < total_tables THEN
    RAISE WARNING '⚠️ ATENCIÓN: Algunas tablas no tienen RLS habilitado';
  ELSIF tables_with_policies < total_tables THEN
    RAISE WARNING '⚠️ ATENCIÓN: Algunas tablas no tienen políticas definidas';
  END IF;
  
  RAISE NOTICE '=================================================';
END $$;

-- ============================================
-- 7. VERIFICAR POLÍTICAS ESPECÍFICAS POR TABLA
-- ============================================

-- Users
SELECT '👤 USERS' as "Tabla", COUNT(*) as "Políticas"
FROM pg_policies 
WHERE schemaname = 'public' AND tablename = 'users';

-- Brands
SELECT '🏷️ BRANDS' as "Tabla", COUNT(*) as "Políticas"
FROM pg_policies 
WHERE schemaname = 'public' AND tablename = 'brands';

-- User Brands
SELECT '🔗 USER_BRANDS' as "Tabla", COUNT(*) as "Políticas"
FROM pg_policies 
WHERE schemaname = 'public' AND tablename = 'user_brands';

-- Categories
SELECT '📁 CATEGORIES' as "Tabla", COUNT(*) as "Políticas"
FROM pg_policies 
WHERE schemaname = 'public' AND tablename = 'categories';

-- Products
SELECT '📦 PRODUCTS' as "Tabla", COUNT(*) as "Políticas"
FROM pg_policies 
WHERE schemaname = 'public' AND tablename = 'products';

-- Product Variants
SELECT '📊 PRODUCT_VARIANTS' as "Tabla", COUNT(*) as "Políticas"
FROM pg_policies 
WHERE schemaname = 'public' AND tablename = 'product_variants';

-- Orders
SELECT '🛒 ORDERS' as "Tabla", COUNT(*) as "Políticas"
FROM pg_policies 
WHERE schemaname = 'public' AND tablename = 'orders';

-- Order Items
SELECT '📝 ORDER_ITEMS' as "Tabla", COUNT(*) as "Políticas"
FROM pg_policies 
WHERE schemaname = 'public' AND tablename = 'order_items';

