-- Script para corregir recursión infinita en RLS de tabla users
-- Ejecutar en SQL Editor de Supabase
-- Fecha: 2025-10-27

-- ============================================
-- 1. ELIMINAR POLÍTICAS PROBLEMÁTICAS
-- ============================================

-- Eliminar las políticas nuevas que causan recursión
DROP POLICY IF EXISTS "users_select_policy" ON users;
DROP POLICY IF EXISTS "users_insert_policy" ON users;
DROP POLICY IF EXISTS "users_update_policy" ON users;
DROP POLICY IF EXISTS "users_delete_policy" ON users;

-- ============================================
-- 2. VERIFICAR POLÍTICAS EXISTENTES
-- ============================================

-- Ver políticas actuales (deben quedar solo las antiguas que funcionan)
SELECT 
  policyname,
  cmd as operation,
  qual as using_expression
FROM pg_policies 
WHERE schemaname = 'public' 
  AND tablename = 'users'
ORDER BY policyname;

-- ============================================
-- 3. SI FALTA ALGUNA POLÍTICA, CREARLA
-- ============================================

-- Estas políticas usan auth.jwt() ->> 'role' que NO causa recursión
-- porque el rol está en el JWT, no necesita hacer SELECT a la tabla

-- SELECT: Superadmins ven todos, admins ven no-superadmins, usuarios se ven a sí mismos
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'users'
    AND policyname = 'Los superadmins pueden ver todos los usuarios'
  ) THEN
    CREATE POLICY "Los superadmins pueden ver todos los usuarios" 
      ON users FOR SELECT 
      USING (auth.jwt() ->> 'role' = 'superadmin');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'users'
    AND policyname = 'Un usuario puede ver su propia información'
  ) THEN
    CREATE POLICY "Un usuario puede ver su propia información" 
      ON users FOR SELECT 
      USING (auth.uid() = id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'users'
    AND policyname = 'Los superadmins pueden crear usuarios'
  ) THEN
    CREATE POLICY "Los superadmins pueden crear usuarios" 
      ON users FOR INSERT 
      WITH CHECK (auth.jwt() ->> 'role' = 'superadmin');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'users'
    AND policyname = 'Los superadmins pueden actualizar cualquier usuario'
  ) THEN
    CREATE POLICY "Los superadmins pueden actualizar cualquier usuario" 
      ON users FOR UPDATE 
      USING (auth.jwt() ->> 'role' = 'superadmin');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'users'
    AND policyname = 'Los superadmins pueden eliminar cualquier usuario'
  ) THEN
    CREATE POLICY "Los superadmins pueden eliminar cualquier usuario" 
      ON users FOR DELETE 
      USING (auth.jwt() ->> 'role' = 'superadmin');
  END IF;
END $$;

-- ============================================
-- 4. VERIFICACIÓN FINAL
-- ============================================

-- Contar políticas (debe ser <= 6)
SELECT COUNT(*) as total_policies
FROM pg_policies 
WHERE schemaname = 'public' AND tablename = 'users';

-- Mostrar todas las políticas finales
SELECT 
  policyname,
  cmd as operation
FROM pg_policies 
WHERE schemaname = 'public' 
  AND tablename = 'users'
ORDER BY cmd, policyname;

DO $$ 
BEGIN
    RAISE NOTICE '✅ Políticas RLS corregidas - recursión eliminada';
    RAISE NOTICE '⚠️ IMPORTANTE: Verifica que el rol esté en el JWT de Supabase Auth';
    RAISE NOTICE '📝 Las políticas ahora usan auth.jwt() en lugar de SELECT en tabla users';
END $$;

