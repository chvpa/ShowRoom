-- Script para la configuración de tablas y políticas para usuarios
-- Ejecutar en la consola SQL de Supabase

-- Tabla para almacenar los usuarios del sistema
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('superadmin', 'admin', 'cliente')),
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Comentarios en la tabla y columnas de usuarios
COMMENT ON TABLE users IS 'Tabla para almacenar los usuarios del sistema con sus roles';
COMMENT ON COLUMN users.id IS 'Identificador único del usuario';
COMMENT ON COLUMN users.email IS 'Email del usuario, usado para iniciar sesión';
COMMENT ON COLUMN users.name IS 'Nombre completo del usuario';
COMMENT ON COLUMN users.role IS 'Rol del usuario: superadmin, admin o cliente';
COMMENT ON COLUMN users.active IS 'Indica si el usuario está activo o no';

-- Tabla para la relación entre usuarios y marcas
CREATE TABLE IF NOT EXISTS user_brands (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  brand_id UUID NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, brand_id)
);

-- Comentarios en la tabla de relación usuario-marca
COMMENT ON TABLE user_brands IS 'Tabla para asociar usuarios con las marcas a las que tienen acceso';
COMMENT ON COLUMN user_brands.user_id IS 'ID del usuario';
COMMENT ON COLUMN user_brands.brand_id IS 'ID de la marca a la que tiene acceso';

-- Habilitar Row Level Security en las tablas
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_brands ENABLE ROW LEVEL SECURITY;

-- Políticas de seguridad para usuarios

-- Los superadmins pueden ver, crear, editar y eliminar todos los usuarios
CREATE POLICY "Los superadmins pueden ver todos los usuarios" 
  ON users FOR SELECT 
  USING (auth.jwt() ->> 'role' = 'superadmin');

CREATE POLICY "Los superadmins pueden crear usuarios" 
  ON users FOR INSERT 
  WITH CHECK (auth.jwt() ->> 'role' = 'superadmin');

CREATE POLICY "Los superadmins pueden actualizar cualquier usuario" 
  ON users FOR UPDATE 
  USING (auth.jwt() ->> 'role' = 'superadmin');

CREATE POLICY "Los superadmins pueden eliminar cualquier usuario" 
  ON users FOR DELETE 
  USING (auth.jwt() ->> 'role' = 'superadmin');

-- Los admins pueden ver todos los usuarios que no sean superadmin
CREATE POLICY "Los admins pueden ver usuarios no superadmin" 
  ON users FOR SELECT 
  USING (auth.jwt() ->> 'role' = 'admin' AND role != 'superadmin');

-- Un usuario puede ver su propia información
CREATE POLICY "Un usuario puede ver su propia información" 
  ON users FOR SELECT 
  USING (auth.uid() = id);

-- Políticas para la relación usuario-marca

-- Los superadmins tienen control total sobre las asignaciones de marcas
CREATE POLICY "Los superadmins pueden gestionar todas las asignaciones de marcas" 
  ON user_brands FOR ALL 
  USING (auth.jwt() ->> 'role' = 'superadmin');

-- Los admins pueden ver todas las asignaciones de marcas pero solo editar las de usuarios cliente
CREATE POLICY "Los admins pueden ver todas las asignaciones de marcas" 
  ON user_brands FOR SELECT 
  USING (auth.jwt() ->> 'role' = 'admin');

CREATE POLICY "Los admins pueden asignar marcas a usuarios cliente" 
  ON user_brands FOR INSERT 
  WITH CHECK (
    auth.jwt() ->> 'role' = 'admin' AND 
    EXISTS (SELECT 1 FROM users WHERE id = user_brands.user_id AND role = 'cliente')
  );

-- Los clientes solo pueden ver sus propias asignaciones de marcas
CREATE POLICY "Los clientes solo ven sus propias asignaciones de marcas" 
  ON user_brands FOR SELECT 
  USING (auth.uid() = user_id);

-- Insertar un usuario superadmin inicial
INSERT INTO users (email, name, role, active)
VALUES ('admin@example.com', 'Administrador Principal', 'superadmin', true)
ON CONFLICT (email) DO NOTHING; 