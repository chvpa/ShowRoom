-- Función para crear un superadmin directamente desde la aplicación
-- Ejecutar en la consola SQL de Supabase

-- Crear la función que puede ser llamada desde el cliente
CREATE OR REPLACE FUNCTION create_superadmin_direct(
  user_id UUID, 
  user_email TEXT, 
  user_name TEXT
)
RETURNS BOOLEAN
LANGUAGE PLPGSQL
SECURITY DEFINER -- Se ejecuta con los privilegios del creador, no del llamador
AS $$
BEGIN
  -- Insertar el usuario en la tabla users con rol superadmin
  INSERT INTO public.users (
    id,
    email,
    name,
    role,
    active,
    created_at,
    updated_at
  ) VALUES (
    user_id,
    user_email,
    user_name,
    'superadmin',
    true,
    NOW(),
    NOW()
  ) ON CONFLICT (email) 
  DO UPDATE SET
    name = user_name,
    role = 'superadmin',
    active = true,
    updated_at = NOW();
    
  RETURN TRUE;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Error al crear superadmin: %', SQLERRM;
    RETURN FALSE;
END;
$$;

-- Permitir que la función sea llamada por cualquier usuario autenticado
GRANT EXECUTE ON FUNCTION create_superadmin_direct TO authenticated;
GRANT EXECUTE ON FUNCTION create_superadmin_direct TO anon;

-- Comentario explicativo
COMMENT ON FUNCTION create_superadmin_direct IS 'Función para crear un superadmin directamente desde la interfaz web, saltándose las políticas RLS';

-- Verificar permisos en la tabla users para evitar problemas de acceso
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_catalog.pg_policy 
    WHERE tablename = 'users' 
    AND policyname LIKE '%anon%'
  ) THEN
    -- Si no existe una política para anon, crear una temporal
    EXECUTE 'CREATE POLICY "Permitir inserción de usuarios desde anon" ON public.users FOR INSERT TO anon WITH CHECK (true)';
    RAISE NOTICE 'Política temporal para anon creada';
  END IF;
END;
$$;
