-- Script simple para crear un superadmin directamente en la base de datos
-- Ejecutar este script en la consola SQL de Supabase

-- Insertar un superadmin con credenciales conocidas
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
  raw_app_meta_data,
  raw_user_meta_data
) VALUES (
  (SELECT id FROM auth.instances LIMIT 1),
  gen_random_uuid(),
  'authenticated',
  'authenticated',
  'admin@showroom.com', -- EMAIL FIJO (puedes cambiarlo si prefieres)
  crypt('Admin123!', gen_salt('bf')), -- CONTRASEÑA FIJA: Admin123!
  NOW(),
  NOW(),
  NOW(),
  '{"provider":"email","providers":["email"]}',
  '{}'
) RETURNING id;

-- Este comando devolverá un ID, copia ese ID y úsalo en el siguiente comando:
-- Reemplaza 'ID_GENERADO_ARRIBA' con el ID que te devolvió el comando anterior

-- COPIA ESTE COMANDO y reemplaza ID_GENERADO_ARRIBA con el ID devuelto por el comando anterior
-- INSERT INTO public.users (id, email, name, role, active, created_at, updated_at) 
-- VALUES ('ID_GENERADO_ARRIBA', 'admin@showroom.com', 'Administrador Principal', 'superadmin', true, NOW(), NOW());

-- También necesitarás crear una identidad para el usuario:
-- INSERT INTO auth.identities (id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at)
-- VALUES ('ID_GENERADO_ARRIBA', 'ID_GENERADO_ARRIBA', format('{"sub":"%s","email":"%s"}', 'ID_GENERADO_ARRIBA', 'admin@showroom.com')::jsonb, 'email', 'admin@showroom.com', NOW(), NOW(), NOW()); 