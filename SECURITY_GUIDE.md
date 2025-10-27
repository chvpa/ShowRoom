# 🔐 Guía de Seguridad - ShowRoom Project

> **Documento generado**: 2025-10-27  
> **Versión**: 1.0  
> **Estado**: Pendiente de aplicación

---

## 📋 RESUMEN EJECUTIVO

Este documento contiene las instrucciones para aplicar **Row Level Security (RLS)** a todas las tablas críticas del proyecto ShowRoom, completando así la capa de seguridad de la aplicación.

### Estado Actual de RLS

| Tabla | RLS Habilitado | Políticas | Estado |
|-------|----------------|-----------|--------|
| **orders** | ✅ | ✅ Completas | ✅ **LISTO** |
| **order_items** | ✅ | ✅ Completas | ✅ **LISTO** |
| **products** | ✅ | ✅ Completas | ✅ **LISTO** |
| **product_variants** | ✅ | ✅ Completas | ✅ **LISTO** |
| **users** | ❌ | ❌ Faltantes | 🔴 **PENDIENTE** |
| **brands** | ❌ | ❌ Faltantes | 🔴 **PENDIENTE** |
| **user_brands** | ❌ | ❌ Faltantes | 🔴 **PENDIENTE** |
| **categories** | ❌ | ❌ Faltantes | 🔴 **PENDIENTE** |

---

## 🚀 INSTRUCCIONES DE APLICACIÓN

### Paso 1: Acceder a Supabase SQL Editor

1. Ir a [Supabase Dashboard](https://app.supabase.com)
2. Seleccionar tu proyecto ShowRoom
3. Click en **SQL Editor** en el menú lateral
4. Click en **New query**

### Paso 2: Aplicar RLS a Tablas Pendientes

**Archivo:** `sql/apply-rls-remaining-tables.sql`

1. Abrir el archivo `sql/apply-rls-remaining-tables.sql`
2. Copiar TODO el contenido del archivo
3. Pegar en el SQL Editor de Supabase
4. Click en **Run** (o presionar Ctrl+Enter)
5. Verificar que aparezcan mensajes de éxito

**Tiempo estimado:** 2-3 minutos

**Resultado esperado:**
```
✅ RLS aplicado correctamente a las tablas: users, brands, user_brands, categories
⚠️ IMPORTANTE: Verifica que el contexto auth.uid() funcione correctamente con tu sistema de autenticación
📝 Revisa las políticas creadas con las consultas de verificación incluidas arriba
```

### Paso 3: Verificar Aplicación de RLS

**Archivo:** `sql/verify-rls-status.sql`

1. Abrir el archivo `sql/verify-rls-status.sql`
2. Copiar TODO el contenido del archivo
3. Pegar en el SQL Editor de Supabase
4. Click en **Run**
5. Revisar los resultados de verificación

**Resultado esperado:**
```
📊 RESUMEN DE SEGURIDAD RLS - SHOWROOM PROJECT
=================================================
Total de tablas monitoreadas: 8
Tablas con RLS habilitado: 8 de 8
Total de políticas aplicadas: 32+
Tablas con políticas: 8 de 8
=================================================
✅ SISTEMA SEGURO: Todas las tablas tienen RLS y políticas
```

---

## 🔒 POLÍTICAS RLS APLICADAS

### 1. Tabla `users`

#### SELECT
- **Superadmins**: Pueden ver todos los usuarios
- **Otros roles**: Solo pueden ver su propio perfil

#### INSERT
- **Superadmins**: Pueden crear nuevos usuarios
- **Otros roles**: No permitido

#### UPDATE
- **Superadmins**: Pueden actualizar cualquier usuario
- **Usuarios**: Pueden actualizarse a sí mismos (excepto cambiar su rol)

#### DELETE
- **Superadmins**: Pueden eliminar usuarios
- **Otros roles**: No permitido

### 2. Tabla `brands`

#### SELECT
- **Superadmins**: Pueden ver todas las marcas
- **Admins/Clientes**: Solo ven marcas asignadas en `user_brands`

#### INSERT/UPDATE/DELETE
- **Solo Superadmins**: Control completo sobre marcas

### 3. Tabla `user_brands`

#### SELECT
- **Superadmins**: Pueden ver todas las asignaciones
- **Usuarios**: Solo ven sus propias asignaciones

#### INSERT/UPDATE/DELETE
- **Solo Superadmins**: Control completo sobre asignaciones

### 4. Tabla `categories`

#### SELECT
- **Todos los usuarios autenticados**: Pueden ver categorías

#### INSERT/UPDATE
- **Superadmins y Admins**: Pueden crear y editar categorías

#### DELETE
- **Solo Superadmins**: Pueden eliminar categorías

---

## ⚠️ CONSIDERACIONES IMPORTANTES

### Seguridad del Contexto de Autenticación

Las políticas RLS utilizan dos funciones de Supabase:

1. **`auth.uid()`** - Obtiene el UUID del usuario autenticado
2. **`auth.jwt() ->> 'role'`** - Obtiene el rol del usuario desde el JWT

**IMPORTANTE:** Estas políticas asumen que:
- Los usuarios tienen un UUID válido en `auth.users`
- El rol del usuario está almacenado en la tabla `users` con una FK a `auth.users.id`
- La autenticación JWT funciona correctamente

### Compatibilidad con el Sistema Actual

Las políticas están diseñadas para ser compatibles con:
- Sistema de autenticación actual (Supabase Auth)
- Estructura de roles: `superadmin`, `admin`, `cliente`
- Tabla `user_brands` para asignación de marcas
- Foreign keys existentes

### Testing de Permisos

Después de aplicar las políticas, **DEBES** probar:

1. **Como Superadmin:**
   ```typescript
   // Debe poder ver todos los usuarios
   const { data } = await supabase.from('users').select('*');
   
   // Debe poder crear marcas
   const { error } = await supabase.from('brands').insert({...});
   ```

2. **Como Admin:**
   ```typescript
   // Solo debe ver sus marcas asignadas
   const { data } = await supabase.from('brands').select('*');
   
   // No debe poder crear usuarios
   const { error } = await supabase.from('users').insert({...}); // Error esperado
   ```

3. **Como Cliente:**
   ```typescript
   // Solo debe ver su propio perfil
   const { data } = await supabase.from('users').select('*');
   
   // Solo debe ver sus marcas asignadas
   const { data: brands } = await supabase.from('brands').select('*');
   ```

---

## 🐛 TROUBLESHOOTING

### Problema: "permission denied for table users"

**Causa:** RLS está habilitado pero las políticas no se aplicaron correctamente

**Solución:**
```sql
-- Verificar políticas existentes
SELECT * FROM pg_policies WHERE tablename = 'users';

-- Si no hay políticas, ejecutar nuevamente apply-rls-remaining-tables.sql
```

### Problema: "infinite recursion detected in policy"

**Causa:** Política hace referencia recursiva a la misma tabla

**Solución:**
```sql
-- Verificar que no haya recursión en las políticas
-- Las políticas actuales están diseñadas para evitar esto
```

### Problema: "role does not exist"

**Causa:** El sistema intenta obtener el rol de una tabla/columna inexistente

**Solución:**
```sql
-- Verificar estructura de tabla users
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'users' AND column_name = 'role';

-- Debe retornar: role | text
```

### Problema: Admin no puede ver productos de su marca

**Causa:** RLS en `products` puede estar muy restrictivo

**Solución:**
```sql
-- Verificar política de products
SELECT * FROM pg_policies WHERE tablename = 'products';

-- Asegurarse que permita filtrado por marca vía user_brands
```

---

## 📝 CHECKLIST DE VERIFICACIÓN

Después de aplicar las políticas, verifica:

- [ ] ✅ Todas las tablas tienen RLS habilitado
- [ ] ✅ Cada tabla tiene al menos 4 políticas (SELECT, INSERT, UPDATE, DELETE)
- [ ] ✅ Superadmin puede acceder a todas las tablas
- [ ] ✅ Admin solo ve datos de sus marcas asignadas
- [ ] ✅ Cliente solo ve sus propios datos y marcas asignadas
- [ ] ✅ Usuarios no pueden escalar privilegios cambiando su rol
- [ ] ✅ No hay errores en consola del navegador al navegar la app
- [ ] ✅ Los queries en frontend funcionan correctamente

---

## 🔄 ROLLBACK (Si algo sale mal)

Si necesitas revertir los cambios:

```sql
-- OPCIÓN 1: Deshabilitar RLS temporalmente
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE brands DISABLE ROW LEVEL SECURITY;
ALTER TABLE user_brands DISABLE ROW LEVEL SECURITY;
ALTER TABLE categories DISABLE ROW LEVEL SECURITY;

-- OPCIÓN 2: Eliminar políticas específicas
DROP POLICY IF EXISTS "users_select_policy" ON users;
DROP POLICY IF EXISTS "users_insert_policy" ON users;
DROP POLICY IF EXISTS "users_update_policy" ON users;
DROP POLICY IF EXISTS "users_delete_policy" ON users;
-- Repetir para brands, user_brands, categories

-- OPCIÓN 3: Eliminar TODAS las políticas de una tabla
DO $$ 
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN SELECT policyname FROM pg_policies WHERE tablename = 'users'
  LOOP
    EXECUTE 'DROP POLICY IF EXISTS "' || pol.policyname || '" ON users';
  END LOOP;
END $$;
```

---

## 📚 RECURSOS ADICIONALES

- [Supabase Row Level Security Docs](https://supabase.com/docs/guides/auth/row-level-security)
- [PostgreSQL RLS Documentation](https://www.postgresql.org/docs/current/ddl-rowsecurity.html)
- [Supabase Auth Helpers](https://supabase.com/docs/guides/auth/auth-helpers)

---

## 🎯 PRÓXIMOS PASOS

1. ✅ **Aplicar RLS** - Ejecutar `apply-rls-remaining-tables.sql`
2. ✅ **Verificar aplicación** - Ejecutar `verify-rls-status.sql`
3. 🔴 **Testing manual** - Probar permisos con diferentes roles
4. 🔴 **Monitoreo** - Verificar logs de Supabase por errores de permisos
5. 🔴 **Documentar** - Actualizar CLAUDE.md con estado final

---

## ✅ CONFIRMACIÓN FINAL

Una vez aplicadas todas las políticas, el sistema estará **PRODUCTION READY** en términos de seguridad de datos.

**Última actualización:** 2025-10-27  
**Autor:** Claude Code Assistant  
**Versión:** 1.0

