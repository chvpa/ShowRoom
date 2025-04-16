import { Suspense, lazy } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { AuthProvider, useAuth } from "./contexts/auth-context";
import { BrandProvider, useBrand } from "./contexts/brand-context";
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
const UsersPage = lazy(() => import("./pages/users"));
const NotFound = lazy(() => import("./pages/NotFound"));

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

// Create a stable QueryClient instance with optimized settings
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 15, // 15 minutos (aumentado de 5 a 15)
      gcTime: 1000 * 60 * 60, // 60 minutos (aumentado de 30 a 60)
      retry: 1,
      refetchOnWindowFocus: false, // No actualizar al volver a la ventana
      refetchOnReconnect: false, // No actualizar al recuperar conexión
      refetchOnMount: false, // Evitar refetch al montar componentes
      retryOnMount: false, // No reintentar al montar componentes
    },
  },
});

// Crear un evento para almacenar en caché las consultas entre sesiones usando localStorage
if (typeof window !== 'undefined') {
  // Cargar consultas en caché al inicio
  const cachedQueries = localStorage.getItem('queryCache');
  if (cachedQueries) {
    try {
      const parsedQueries = JSON.parse(cachedQueries);
      Object.keys(parsedQueries).forEach(key => {
        queryClient.setQueryData(JSON.parse(key), parsedQueries[key]);
      });
    } catch (error) {
      console.error('Error loading cached queries:', error);
    }
  }

  // Guardar consultas en caché periódicamente
  setInterval(() => {
    const state = queryClient.getQueryCache().getAll()
      .filter(query => !query.isStale()) // Solo guardar datos frescos
      .reduce((acc, query) => {
        if (query.queryKey) {
          acc[JSON.stringify(query.queryKey)] = query.state.data;
        }
        return acc;
      }, {} as Record<string, any>);
    
    localStorage.setItem('queryCache', JSON.stringify(state));
  }, 1000 * 60 * 5); // Guardar cada 5 minutos
}

const App = () => {
  return (
    <HelmetProvider>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <AuthProvider>
            <BrandProvider>
              <BrowserRouter>
                <Suspense fallback={<FullScreenLoader />}>
                  <Routes>
                    {/* Public login route */}
                    <Route path="/login" element={<LoginPage />} />
                    
                    {/* Not found page */}
                    <Route path="*" element={<NotFound />} />
                    
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
            </BrandProvider>
          </AuthProvider>
        </TooltipProvider>
      </QueryClientProvider>
    </HelmetProvider>
  );
};

// Component to redirect users based on their role
const RoleBasedRedirect = () => {
  const { user } = useAuth();
  const { selectedBrand } = useBrand();
  
  if (!user) return <Navigate to="/login" replace />;
  
  switch (user.role) {
    case 'superadmin':
      return <Navigate to="/users" replace />;
    case 'admin':
      // Redireccionar a catálogo en lugar de products
      if (selectedBrand) {
        return <Navigate to={`/${selectedBrand.name.toLowerCase()}/catalogo`} replace />;
      }
      return <Navigate to="/brand-selection" replace />;
    case 'cliente':
      // Si el cliente ya tiene una marca seleccionada, redirigir a la URL con formato marca/catalogo
      if (selectedBrand) {
        return <Navigate to={`/${selectedBrand.name.toLowerCase()}/catalogo`} replace />;
      }
      // Si no tiene marca seleccionada, primero debe seleccionar una
      return <Navigate to="/brand-selection" replace />;
    default:
      return <Navigate to="/login" replace />;
  }
};

export default App;
