  -- Script para crear el primer usuario superadmin con autenticación en Supabase
  -- IMPORTANTE: Este script debe ejecutarse en la consola SQL de Supabase
  -- después de haber creado las tablas con setup-users-tables.sql

  -- Configuración del superadmin (puedes modificar estos datos)
  DO $$
  DECLARE
    _email TEXT := 'chvpa.contacto@gmail.com'; -- Cambia esto por tu email real
    _password TEXT := 'Admin123!';
    _name TEXT := 'Administrador Principal';
    _user_id UUID;
  BEGIN
    -- Verificar si el usuario ya existe en public.users
    SELECT id INTO _user_id FROM public.users WHERE email = _email;
    
    IF _user_id IS NULL THEN
      -- Crear un nuevo UUID para el usuario
      _user_id := gen_random_uuid();
      
      -- 1. Crear el usuario en la tabla auth.users
      INSERT INTO auth.users (
        instance_id,
        id,
        aud,
        role,
        email,
        encrypted_password,
        email_confirmed_at,
        created_at,
        updated_at,
        last_sign_in_at,
        raw_app_meta_data,
        raw_user_meta_data,
        is_super_admin,
        is_sso_user
      ) VALUES (
        (SELECT id FROM auth.instances LIMIT 1),
        _user_id,
        'authenticated',
        'authenticated',
        _email,
        crypt(_password, gen_salt('bf')),
        NOW(),
        NOW(),
        NOW(),
        NULL,
        '{"provider":"email","providers":["email"]}',
        '{}',
        false,
        false
      );

      -- 2. Crear entrada en auth.identities simplificada
      INSERT INTO auth.identities (
        id,
        user_id,
        identity_data,
        provider,
        provider_id,
        last_sign_in_at,
        created_at,
        updated_at
      ) VALUES (
        _user_id,
        _user_id,
        format('{"sub":"%s","email":"%s"}', _user_id::text, _email)::jsonb,
        'email',
        _email,
        NOW(),
        NOW(),
        NOW()
      );

      -- 3. Crear el usuario en nuestra tabla personalizada users
      INSERT INTO public.users (
        id,
        email,
        name,
        role,
        active,
        created_at,
        updated_at
      ) VALUES (
        _user_id,
        _email,
        _name,
        'superadmin',
        true,
        NOW(),
        NOW()
      );

      RAISE NOTICE 'Superadmin creado con éxito:';
      RAISE NOTICE '  Email: %', _email;
      RAISE NOTICE '  Password: %', _password;
      RAISE NOTICE '  Rol: superadmin';
      RAISE NOTICE '  ID: %', _user_id;
    ELSE
      RAISE NOTICE 'El usuario con email % ya existe con ID %', _email, _user_id;
      
      -- Actualizar a superadmin si existe
      UPDATE public.users
      SET role = 'superadmin', active = true, name = _name
      WHERE id = _user_id;
      
      -- Actualizar contraseña si existe en auth.users
      UPDATE auth.users
      SET encrypted_password = crypt(_password, gen_salt('bf'))
      WHERE email = _email;
      
      RAISE NOTICE 'Usuario existente actualizado a superadmin';
      RAISE NOTICE '  Email: %', _email;
      RAISE NOTICE '  Nueva password: %', _password;
    END IF;
  END $$; 