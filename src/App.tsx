import { Suspense, lazy, useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { AuthProvider, useAuth } from "./contexts/auth-context";
import { BrandProvider, useBrand } from "./contexts/brand-context";
import { CartProvider } from "./contexts/cart-context";
import { Loader2 } from "lucide-react";
import { HelmetProvider } from "react-helmet-async";

// Lazy load pages for better performance
const LoginPage = lazy(() => import("./pages/login"));
const BrandSelectionPage = lazy(() => import("./pages/brand-selection"));
const CatalogPage = lazy(() => import("./pages/catalog"));
const ProductDetailPage = lazy(() => import("./pages/product-detail"));
const CartPage = lazy(() => import("./pages/cart"));
const BrandsPage = lazy(() => import("./pages/brands"));
const ProductsPage = lazy(() => import("./pages/products"));
const OffersPage = lazy(() => import("./pages/offers"));
const PresalePage = lazy(() => import("./pages/presale"));
const OrdersPage = lazy(() => import("./pages/orders"));
const MyOrdersPage = lazy(() => import("./pages/my-orders"));
const OrderDetailPage = lazy(() => import("./pages/order-detail"));
const UsersPage = lazy(() => import("./pages/users"));
const NotFoundPage = lazy(() => import("./pages/NotFound"));

// Lazy load layout for better performance
const Layout = lazy(() => import("./components/layout"));

// Full-screen loader component
const FullScreenLoader = () => (
  <div className="flex items-center justify-center min-h-screen">
    <Loader2 className="w-8 h-8 animate-spin text-primary" />
  </div>
);

// Component for protected routes with role-based access
interface ProtectedRouteProps {
  children: JSX.Element;
  requiredRoles?: Array<'superadmin' | 'admin' | 'cliente'>;
  requiresBrandSelection?: boolean;
}

const ProtectedRoute = ({ 
  children, 
  requiredRoles = ['superadmin', 'admin', 'cliente'],
  requiresBrandSelection = false
}: ProtectedRouteProps) => {
  const { user, loading } = useAuth();
  const location = useLocation();

  // Show loader while checking auth
  if (loading) {
    return <FullScreenLoader />;
  }

  // Redirect to login if not authenticated
  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Redirect if user doesn't have required role
  if (requiredRoles.length > 0 && !requiredRoles.includes(user.role)) {
    // Redirect based on user role
    if (user.role === 'superadmin') {
      return <Navigate to="/users" replace />;
    } else if (user.role === 'admin') {
      return <Navigate to="/products" replace />;
    } else {
      // Regular clients go to catalog or brand selection
      return <Navigate to="/catalog" replace />;
    }
  }

  // Render protected route if all checks pass
  return children;
};

// Create a stable QueryClient instance with optimized settings for SPA
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 10, // 10 minutos - tiempo razonable para datos frescos
      gcTime: 1000 * 60 * 30, // 30 minutos - tiempo de cache en memoria
      retry: 2, // Reintentar 2 veces en caso de error
      refetchOnWindowFocus: false, // ❌ NO refrescar al volver a la ventana - mantener posición del usuario
      refetchOnReconnect: true, // Sí refrescar al recuperar conexión de internet
      refetchOnMount: false, // No verificar datos frescos al montar (usar cache)
      retryOnMount: true, // Sí reintentar al montar si hubo error
      networkMode: 'online', // Solo ejecutar cuando hay conexión
    },
    mutations: {
      retry: 1,
      networkMode: 'online',
    },
  },
});

// Implementación optimizada de persistencia de cache
const setupCachePersistence = () => {
  if (typeof window === 'undefined') return;

  // Cargar cache del localStorage al inicio (una sola vez)
  try {
    const cachedData = localStorage.getItem('showroom-query-cache');
    if (cachedData) {
      const parsed = JSON.parse(cachedData);
      // Solo restaurar datos que no sean muy antiguos (1 hora)
      const oneHourAgo = Date.now() - (1000 * 60 * 60);
      
      Object.entries(parsed).forEach(([key, value]: [string, any]) => {
        if (value.timestamp && value.timestamp > oneHourAgo) {
          try {
            queryClient.setQueryData(JSON.parse(key), value.data);
          } catch (error) {
            console.warn('Error restoring cached query:', error);
          }
        }
      });
    }
  } catch (error) {
    console.warn('Error loading cached queries:', error);
    // Limpiar cache corrupto
    localStorage.removeItem('showroom-query-cache');
  }

  // Guardar cache antes de cerrar la ventana (más eficiente que setInterval)
  const saveCache = () => {
    try {
      const queries = queryClient.getQueryCache().getAll();
      const cacheData: Record<string, any> = {};
      
      queries.forEach(query => {
        if (query.state.data && query.queryKey && !query.isStale()) {
          const key = JSON.stringify(query.queryKey);
          cacheData[key] = {
            data: query.state.data,
            timestamp: Date.now()
          };
        }
      });

      localStorage.setItem('showroom-query-cache', JSON.stringify(cacheData));
    } catch (error) {
      console.warn('Error saving cache:', error);
    }
  };

  // Eventos para guardar cache
  window.addEventListener('beforeunload', saveCache);
  window.addEventListener('pagehide', saveCache);
  
  // Guardar cache cada 5 minutos (solo si hay cambios)
  let lastCacheSize = 0;
  const intervalId = setInterval(() => {
    const currentSize = queryClient.getQueryCache().getAll().length;
    if (currentSize !== lastCacheSize) {
      saveCache();
      lastCacheSize = currentSize;
    }
  }, 1000 * 60 * 5);

  // Cleanup función
  return () => {
    window.removeEventListener('beforeunload', saveCache);
    window.removeEventListener('pagehide', saveCache);
    clearInterval(intervalId);
  };
};

// Component to redirect users based on their role - ONLY from root path
const RoleBasedRedirect = () => {
  const { user } = useAuth();
  const { selectedBrand } = useBrand();
  const location = useLocation();
  
  if (!user) return <Navigate to="/login" replace />;
  
  // 🔥 FIX CRÍTICO: Solo redirigir si estamos en la ruta raíz exacta
  // Esto evita redirects automáticos cuando cambia el contexto de auth
  if (location.pathname !== '/') {
    return null; // No renderizar nada si no estamos en root
  }
  
  // Solo redirigir desde la ruta raíz ("/"), no interferir con navegación normal
  switch (user.role) {
    case 'superadmin':
      return <Navigate to="/users" replace />;
    case 'admin':
      // Para admins, ir a la página de productos
      return <Navigate to="/products" replace />;
    case 'cliente':
      // Para clientes, si tienen marca seleccionada ir al catálogo, sino selección de marca
      if (selectedBrand) {
        return <Navigate to={`/${selectedBrand.name.toLowerCase()}/catalogo`} replace />;
      }
      return <Navigate to="/brand-selection" replace />;
    default:
      return <Navigate to="/login" replace />;
  }
};

// Componente principal optimizado
const App = () => {
  // Configurar persistencia de cache una sola vez
  useEffect(() => {
    const cleanup = setupCachePersistence();
    return cleanup;
  }, []);

  return (
    <HelmetProvider>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <AuthProvider>
            <BrandProvider>
              <CartProvider>
                <BrowserRouter>
                  <Suspense fallback={<FullScreenLoader />}>
                    <Routes>
                      {/* Public login route */}
                      <Route path="/login" element={<LoginPage />} />
                      
                      {/* Not found page */}
                      <Route path="*" element={<NotFoundPage />} />
                      
                      {/* Root redirects to appropriate page based on user role */}
                      <Route path="/" element={
                        <ProtectedRoute>
                          <RoleBasedRedirect />
                        </ProtectedRoute>
                      } />
                      
                      {/* Brand selection - for users with multiple brands */}
                      <Route path="/brand-selection" element={
                        <ProtectedRoute>
                          <BrandSelectionPage />
                        </ProtectedRoute>
                      } />
                      
                      {/* Ruta por marca para clientes - URL amigable */}
                      <Route path="/:marcaSlug/catalogo" element={
                        <ProtectedRoute>
                          <Layout activePage="catalog">
                            <CatalogPage />
                          </Layout>
                        </ProtectedRoute>
                      } />
                      
                      {/* Catalog - accessible by all authenticated users */}
                      <Route path="/catalog" element={
                        <ProtectedRoute>
                          <Layout activePage="catalog">
                            <CatalogPage />
                          </Layout>
                        </ProtectedRoute>
                      } />
                      
                      {/* Ruta de detalle de producto con marca en la URL */}
                      <Route path="/:marcaSlug/producto/:id" element={
                        <ProtectedRoute>
                          <Layout activePage="catalog">
                            <ProductDetailPage />
                          </Layout>
                        </ProtectedRoute>
                      } />
                      
                      <Route path="/product/:id" element={
                        <ProtectedRoute>
                          <Layout activePage="catalog">
                            <ProductDetailPage />
                          </Layout>
                        </ProtectedRoute>
                      } />
                      
                      {/* Ruta del carrito con marca en la URL */}
                      <Route path="/:marcaSlug/carrito" element={
                        <ProtectedRoute>
                          <Layout activePage="cart">
                            <CartPage />
                          </Layout>
                        </ProtectedRoute>
                      } />
                      
                      <Route path="/cart" element={
                        <ProtectedRoute>
                          <Layout activePage="cart">
                            <CartPage />
                          </Layout>
                        </ProtectedRoute>
                      } />
                      
                      {/* Admin routes - accessible by superadmin and admin */}
                      <Route path="/products" element={
                        <ProtectedRoute requiredRoles={['superadmin', 'admin']}>
                          <Layout activePage="products">
                            <ProductsPage />
                          </Layout>
                        </ProtectedRoute>
                      } />
                      
                      <Route path="/offers" element={
                        <ProtectedRoute requiredRoles={['superadmin', 'admin']}>
                          <Layout activePage="offers">
                            <OffersPage />
                          </Layout>
                        </ProtectedRoute>
                      } />
                      
                      {/* Orders - for admins and superadmins */}
                      <Route path="/orders" element={
                        <ProtectedRoute requiredRoles={['superadmin', 'admin']}>
                          <Layout activePage="orders">
                            <OrdersPage />
                          </Layout>
                        </ProtectedRoute>
                      } />
                      
                      {/* My Orders - for clients */}
                      <Route path="/my-orders" element={
                        <ProtectedRoute requiredRoles={['cliente']}>
                          <Layout activePage="my-orders">
                            <MyOrdersPage />
                          </Layout>
                        </ProtectedRoute>
                      } />

                      {/* Order Detail - accessible by all authenticated users */}
                      <Route path="/pedido/:orderId" element={
                        <ProtectedRoute>
                          <Layout activePage="my-orders">
                            <OrderDetailPage />
                          </Layout>
                        </ProtectedRoute>
                      } />

                      <Route path="/presale" element={
                        <ProtectedRoute requiredRoles={['superadmin', 'admin']}>
                          <Layout activePage="presale">
                            <PresalePage />
                          </Layout>
                        </ProtectedRoute>
                      } />
                      
                      {/* Superadmin only routes */}
                      <Route path="/brands" element={
                        <ProtectedRoute requiredRoles={['superadmin']}>
                          <Layout activePage="brands">
                            <BrandsPage />
                          </Layout>
                        </ProtectedRoute>
                      } />
                      
                      <Route path="/users" element={
                        <ProtectedRoute requiredRoles={['superadmin']}>
                          <Layout activePage="users">
                            <UsersPage />
                          </Layout>
                        </ProtectedRoute>
                      } />
                    </Routes>
                  </Suspense>
                </BrowserRouter>
              </CartProvider>
            </BrandProvider>
          </AuthProvider>
          <Toaster />
          <Sonner />
        </TooltipProvider>
      </QueryClientProvider>
    </HelmetProvider>
  );
};

export default App;
