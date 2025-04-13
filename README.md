# ShowRoom - Catálogo Mayorista

ShowRoom es una plataforma web privada desarrollada para clientes mayoristas, permitiendo la gestión completa de catálogos por marca, carga de pedidos, administración de preventas, gestión de ofertas y control de usuarios con diferentes niveles de permisos.

## Tecnologías

- **Frontend:** React, TypeScript, Vite, Tailwind CSS, shadcn/ui
- **Backend:** Supabase (PostgreSQL, Auth, Storage, RLS)
- **Estado Global:** React Context API, React Query
- **Herramientas:** ESLint, Prettier

## Características Principales

- 🛍️ **Catálogo de productos** por marca, rubro y categoría
- 🔐 **Sistema de usuarios** con roles (superadmin, admin, cliente)
- 🛒 **Carrito de compras** con gestión de pedidos
- 📦 **Preventas** para productos de temporadas futuras
- 🏷️ **Ofertas** configurable por producto o rubro
- 📊 **Dashboard** para administradores

## Estructura del Proyecto

```
src/
├── components/       # Componentes reutilizables
│   ├── ui/           # Componentes de UI de shadcn
│   └── layout.tsx    # Layout principal
├── contexts/         # Contextos de React (auth, cart)
├── hooks/            # Custom hooks
│   ├── use-debounce.ts       # Debounce para inputs
│   ├── use-supabase-query.ts # Query hooks con caché
│   └── use-toast.ts          # Notificaciones
├── integrations/     # Integraciones externas
│   └── supabase/     # Cliente y tipos de Supabase
├── lib/              # Utilidades y funciones
├── pages/            # Páginas de la aplicación
└── types/            # Tipos TypeScript centralizados
```

## Optimizaciones Implementadas

- ⚡ **Carga diferida (lazy loading)** de componentes y rutas
- 🔄 **Cacheo eficiente** con React Query
- 📝 **Debounce de inputs** para prevenir llamadas excesivas a la API
- 🖼️ **Carga optimizada de imágenes**
- 📱 **Diseño responsive** para todos los dispositivos

## Roles de Usuario

### Superadmin
- Control total sobre usuarios, marcas, preventas y ofertas
- Acceso a todas las funcionalidades

### Admin
- Gestión de productos y marcas asignadas
- Configuración de preventas y ofertas
- Visualización de pedidos de clientes

### Cliente
- Visualización de marcas habilitadas
- Navegación por catálogo y filtrado
- Creación de pedidos y descarga de PDFs
- Acceso a preventas si está habilitado

## Desarrollo Local

```bash
# Instalar dependencias
npm install

# Iniciar servidor de desarrollo
npm run dev

# Construir para producción
npm run build

# Vista previa de producción
npm run preview
```

## Variables de Entorno

Crear un archivo `.env` con las siguientes variables:

```
VITE_SUPABASE_URL=your-supabase-url
VITE_SUPABASE_KEY=your-supabase-anon-key
```

## Créditos

Este proyecto fue desarrollado implementando mejores prácticas y optimizaciones para un rendimiento máximo en grandes volúmenes de datos.
