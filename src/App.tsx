
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import CatalogPage from "./pages/catalog";
import ProductsPage from "./pages/products";
import NotFound from "./pages/NotFound";
import Layout from "./components/layout";
import BrandSelectionPage from "./pages/brand-selection";
import ProductDetailPage from "./pages/product-detail";
import CartPage from "./pages/cart";

// Placeholder pages
const BrandsPage = () => <div className="p-6"><h1 className="text-3xl font-semibold">Marcas</h1></div>;
const OffersPage = () => <div className="p-6"><h1 className="text-3xl font-semibold">Ofertas</h1></div>;
const PresalePage = () => <div className="p-6"><h1 className="text-3xl font-semibold">Preventa</h1></div>;
const UsersPage = () => <div className="p-6"><h1 className="text-3xl font-semibold">Usuarios</h1></div>;

// Create the client inside the component to ensure React context is available
const App = () => {
  const queryClient = new QueryClient();

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/brand-selection" element={<BrandSelectionPage />} />
            <Route path="/" element={
              <Layout activePage="catalog">
                <CatalogPage />
              </Layout>
            } />
            <Route path="/product/:id" element={
              <Layout activePage="catalog">
                <ProductDetailPage />
              </Layout>
            } />
            <Route path="/cart" element={
              <Layout activePage="cart">
                <CartPage />
              </Layout>
            } />
            <Route path="/brands" element={
              <Layout activePage="brands">
                <BrandsPage />
              </Layout>
            } />
            <Route path="/products" element={
              <Layout activePage="products">
                <ProductsPage />
              </Layout>
            } />
            <Route path="/offers" element={
              <Layout activePage="offers">
                <OffersPage />
              </Layout>
            } />
            <Route path="/presale" element={
              <Layout activePage="presale">
                <PresalePage />
              </Layout>
            } />
            <Route path="/users" element={
              <Layout activePage="users">
                <UsersPage />
              </Layout>
            } />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
