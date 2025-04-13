-- Función para crear un nuevo usuario desde el registro
-- Esta función debe ejecutarse en la consola SQL de Supabase
-- Permite registrar un usuario en la tabla users desde el cliente sin problemas de RLS

-- Crear la función
CREATE OR REPLACE FUNCTION create_new_user(
  user_id UUID,
  user_email TEXT,
  user_name TEXT,
  user_role TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER -- Se ejecuta con los privilegios del creador, no del llamador
AS $$
BEGIN
  -- Verificar que el rol es válido
  IF user_role NOT IN ('superadmin', 'admin', 'cliente') THEN
    RAISE EXCEPTION 'Rol de usuario inválido';
  END IF;
  
  -- Insertar el nuevo usuario
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
    user_role,
    true,
    NOW(),
    NOW()
  )
  ON CONFLICT (email) DO NOTHING;
END;
$$;

-- Permitir que cualquier usuario autenticado ejecute esta función
GRANT EXECUTE ON FUNCTION create_new_user TO authenticated;
GRANT EXECUTE ON FUNCTION create_new_user TO anon;

-- Comentario explicativo
COMMENT ON FUNCTION create_new_user IS 'Función para crear un nuevo usuario en la tabla users desde el cliente sin problemas de RLS'; 