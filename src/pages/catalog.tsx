import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, useLocation, useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Shirt, Footprints, ChevronRight, Loader2, Backpack, Search, ShoppingCart, Eye } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { useBrand } from '@/contexts/brand-context';
import { useAuth } from '@/contexts/auth-context';
import { Brand, Product } from '@/types';
import { useSupabaseQuery } from '@/hooks/use-supabase-query';
import { supabase } from '@/integrations/supabase/client';
import { Input } from "@/components/ui/input";

import { LazyImage } from '@/components/ui/lazy-image';
import { useDebounce } from '@/hooks/use-debounce';

import { useCart } from '@/hooks/use-cart'; 
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationPrevious, PaginationNext, PaginationEllipsis } from '@/components/ui/pagination';
import { usePaginatedQuery } from '@/hooks/use-supabase-query';
import { QuickAddModal } from '@/components/ui/quick-add-modal';

type CategoryCardProps = {
  title: string;
  icon: React.ElementType;
  description: string;
  onClick: () => void;
};

const CategoryCard = ({ title, icon: Icon, description, onClick }: CategoryCardProps) => {
  return (
    <Card className="category-card overflow-hidden cursor-pointer hover:shadow-md transition-shadow justify-between flex flex-col" onClick={onClick}>
      <CardContent className="p-6 flex flex-col items-center text-center gap-4">
        <div className="h-16 w-16 rounded-full bg-secondary flex items-center justify-center">
          <Icon size={32} />
        </div>
        <h3 className="font-semibold text-xl">{title}</h3>
        <p className="text-muted-foreground text-sm">{description}</p>
      </CardContent>
      <CardFooter className="bg-muted/50 p-4 flex justify-center">
        <Button variant="ghost" size="sm" className="gap-1">
          Ver productos <ChevronRight size={16} />
        </Button>
      </CardFooter>
    </Card>
  );
};

const ProductCard = ({ product }: { product: Product }) => {
  const navigate = useNavigate();
  const { selectedBrand } = useBrand();
  const { addToCart } = useCart();
  const [showQuickAdd, setShowQuickAdd] = React.useState(false);
  
  const handleClick = () => {
    // Navegar al detalle del producto
    if (selectedBrand) {
      navigate(`/${selectedBrand.name.toLowerCase()}/producto/${product.id}`);
    } else {
      navigate(`/product/${product.id}`);
    }
  };

  const handleAddToCart = (e: React.MouseEvent) => {
    e.stopPropagation(); // Evitar navegación
    console.log('🛒 ProductCard handleAddToCart clickeado para producto:', product.name);
    console.log('🛒 Variantes del producto:', product.variants);
    setShowQuickAdd(true); // Mostrar modal de selección rápida
    console.log('🛒 showQuickAdd establecido a true');
  };

  const handleQuickAddToCart = (product: Product, curveType: 'simple' | 'reinforced') => {
    addToCart(product, curveType);
  };
  
  return (
    <Card className="overflow-hidden hover:shadow-md transition-all group flex flex-col h-full">
      <div onClick={handleClick} className="cursor-pointer flex-grow flex flex-col">
        <div className="aspect-square relative overflow-hidden">
          <LazyImage
            src={product.images && product.images[0] ? product.images[0] : ''}
            alt={product.name}
            aspectRatio="1:1"
            placeholderSrc="/placeholder.svg"
            fallbackSrc="/placeholder.svg"
            className="group-hover:scale-105 transition-transform duration-300"
          />
        </div>
        <CardContent className="p-4 flex-grow">
          <p className="text-sm text-muted-foreground">{product.sku}</p>
          <h3 className="font-medium line-clamp-2 mt-1">{product.name}</h3>
          <p className="font-semibold mt-2 text-primary">
            {new Intl.NumberFormat('es-AR', {
              style: 'currency',
              currency: 'ARS'
            }).format(product.price || 0)}
          </p>
        </CardContent>
      </div>
      
      <CardFooter className="p-3 border-t bg-muted/30 mt-auto flex gap-2">
        <Button
          onClick={handleAddToCart}
          size="sm"
          className="flex-1 flex items-center justify-center gap-2"
        >
          <ShoppingCart size={16} />
          Añadir rápido
        </Button>
        <Button
          onClick={(e) => {
            e.stopPropagation();
            handleClick();
          }}
          size="sm"
          variant="outline"
          className="px-3"
          title="Ver detalles del producto"
        >
          <Eye size={16} />
        </Button>
      </CardFooter>
      
      {/* Modal de selección rápida */}
      <QuickAddModal
        product={product}
        isOpen={showQuickAdd}
        onClose={() => setShowQuickAdd(false)}
        onAddToCart={handleQuickAddToCart}
      />
    </Card>
  );
};

const PAGE_SIZE = 24;

const CatalogPage = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const { selectedBrand, selectBrand, userBrands } = useBrand();
  const { user } = useAuth();
  // Obtener el parámetro de marca de la URL
  const { marcaSlug } = useParams<{ marcaSlug?: string }>();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  
  // 🔥 FIX: Obtener estado desde URL query params para persistir al cambiar de pestaña
  const selectedCategory = searchParams.get('categoria') || null;
  const searchTerm = searchParams.get('busqueda') || '';
  const debouncedSearchTerm = useDebounce(searchTerm, 300);
  
  // Helper function para actualizar query params manteniendo otros valores
  const updateSearchParams = (updates: Record<string, string | null>) => {
    const newParams = new URLSearchParams(searchParams);
    Object.entries(updates).forEach(([key, value]) => {
      if (value === null || value === '') {
        newParams.delete(key);
      } else {
        newParams.set(key, value);
      }
    });
    setSearchParams(newParams);
  };
  
  // Efecto para seleccionar la marca basada en el parámetro de la URL
  useEffect(() => {
    const loadBrandFromSlug = async () => {
      // Solo ejecutar si hay marcaSlug en la URL y no coincide con la marca actual
      if (!marcaSlug) return;
      
      // 🔥 FIX CRÍTICO: No ejecutar si estamos en una ruta de producto
      // Esto evita interferencia cuando se vuelve de otra pestaña desde product-detail
      if (location.pathname.includes('/producto/')) {
        console.log('🔇 [Catalog] Ignorando carga de marca - estamos en product detail');
        return; // No hacer nada si estamos en product detail
      }
      
      // 🔥 FIX CRÍTICO: No ejecutar si no estamos en una ruta de catalog
      // Solo ejecutar en rutas de catálogo (/marca/catalogo)
      if (!location.pathname.includes('/catalogo')) {
        console.log('🔇 [Catalog] Ignorando carga de marca - no estamos en ruta de catálogo');
        return;
      }
      
      // Si ya tenemos la marca correcta, no hacer nada
      if (selectedBrand && selectedBrand.name.toLowerCase() === marcaSlug.toLowerCase()) {
        return;
      }
      
      console.log('🔄 [Catalog] Cargando marca desde URL slug:', marcaSlug);
      
      // Primero intentar encontrar la marca en las marcas del usuario (más rápido)
      const brandFromUserBrands = userBrands.find(
        brand => brand.name.toLowerCase() === marcaSlug.toLowerCase()
      );
      
      if (brandFromUserBrands) {
        console.log('✅ [Catalog] Marca encontrada en userBrands:', brandFromUserBrands.name);
        selectBrand(brandFromUserBrands);
        return;
      }
      
      // Solo buscar en la base de datos si tenemos userBrands cargados y no encontramos la marca
      if (userBrands.length > 0) {
        console.log('🔍 [Catalog] Buscando marca en base de datos:', marcaSlug);
        try {
          const { data, error } = await supabase
            .from('brands')
            .select('*')
            .ilike('name', marcaSlug)
            .maybeSingle();
            
          if (data && !error) {
            console.log('✅ [Catalog] Marca encontrada en base de datos:', data.name);
            selectBrand(data);
          } else {
            // Solo redirigir si realmente no se encuentra la marca
            console.error('❌ [Catalog] Marca no encontrada, error:', error);
            navigate('/brand-selection', { replace: true });
            toast({
              title: "Marca no encontrada",
              description: "La marca especificada en la URL no existe o no tienes acceso a ella",
              variant: "destructive",
            });
          }
        } catch (error) {
          console.error('❌ [Catalog] Error al buscar marca:', error);
        }
      }
    };
    
    // Solo ejecutar cuando cambie marcaSlug o cuando userBrands se cargue por primera vez
    loadBrandFromSlug();
  }, [marcaSlug, userBrands.length, location.pathname]); // Agregada location.pathname a las dependencias

  // Loading state mejorado - solo mostrar si realmente estamos cargando
  // 🔥 FIX: Solo mostrar loading si estamos específicamente en una ruta de catálogo
  if (!selectedBrand && marcaSlug && location.pathname.includes('/catalogo')) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
        <p>Cargando catálogo de {marcaSlug}...</p>
      </div>
    );
  }

  const categories = [
    {
      id: "prendas",
      title: "Prendas",
      icon: Shirt,
      description: "Explora nuestra colección de prendas de alta calidad"
    },
    {
      id: "calzados",
      title: "Calzados",
      icon: Footprints,
      description: "Descubre el mejor calzado para cada ocasión"
    },
    {
      id: "accesorios",
      title: "Accesorios",
      icon: Backpack,
      description: "Complementa tu estilo con nuestra colección de accesorios"
    }
  ];

  // Use paginated query para productos filtrados por marca y categoría
  const {
    data: productsResponse,
    isLoading,
    page,
    setPage,
    pageSize,
  } = usePaginatedQuery<Product>(
    ['products', selectedBrand?.id ?? '', selectedCategory, debouncedSearchTerm],
    'products',
    async (query, page, pageSize) => {
      // Si no hay marca seleccionada, retornar vacío
      if (!selectedBrand) {
        return { data: [], error: null, count: 0 };
      }

      // Simplificamos por ahora - solo productos sin variantes para testear el botón
      let baseQuery = query
        .from('products')
        .select('*')
        .eq('enabled', true)
        .eq('brand', selectedBrand.name);
      
      if (selectedCategory) {
        const categoryUppercase = selectedCategory.toUpperCase();
        baseQuery = baseQuery.eq('product_type', categoryUppercase);
      }
      if (debouncedSearchTerm) {
        baseQuery = baseQuery.or(`name.ilike.%${debouncedSearchTerm}%,sku.ilike.%${debouncedSearchTerm}%`);
      }
      
      // Paginación: calcular rango
      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;
      baseQuery = baseQuery.range(from, to);
      
      // Obtener productos con count
      const { data: products, error, count } = await baseQuery;
      if (error) {
        throw error;
      }
      
      // Si count es null, hacer una consulta aparte solo para el total
      let totalCount = count;
      if (typeof totalCount !== 'number') {
        let countQuery = query
          .from('products')
          .select('id', { count: 'exact', head: true })
          .eq('enabled', true)
          .eq('brand', selectedBrand.name);
        if (selectedCategory) {
          countQuery = countQuery.eq('product_type', selectedCategory.toUpperCase());
        }
        if (debouncedSearchTerm) {
          countQuery = countQuery.or(`name.ilike.%${debouncedSearchTerm}%,sku.ilike.%${debouncedSearchTerm}%`);
        }
        const { count: total, error: countError } = await countQuery;
        if (!countError) totalCount = total;
      }
      
      // Obtener variantes para los productos
      let transformedData: Product[] = [];
      if (products && products.length > 0) {
        try {
          const productIds = products.map(p => p.id);
          const { data: variants, error: variantsError } = await query
            .from('product_variants')
            .select('id, product_id, size, simple_curve, reinforced_curve, stock_quantity, created_at, updated_at')
            .in('product_id', productIds);
          
          if (variantsError) {
            console.error('Error obteniendo variantes:', variantsError);
          }
          
          // Agrupar variantes por producto
          const variantsByProduct: Record<string, any[]> = {};
          if (variants) {
            variants.forEach(variant => {
              if (!variantsByProduct[variant.product_id]) {
                variantsByProduct[variant.product_id] = [];
              }
              variantsByProduct[variant.product_id].push({
                id: variant.id,
                product_id: variant.product_id,
                size: variant.size,
                simple_curve: variant.simple_curve || 0,
                reinforced_curve: variant.reinforced_curve || 0,
                stock_quantity: variant.stock_quantity || 0,
                created_at: variant.created_at,
                updated_at: variant.updated_at
              });
            });
          }
          
          // Combinar productos con sus variantes
          transformedData = products.map(product => ({
            ...product,
            variants: variantsByProduct[product.id] || []
          })) as Product[];
          
        } catch (error) {
          console.error('Error procesando variantes:', error);
          // Si hay error, al menos retornar productos sin variantes
          transformedData = (products || []).map(product => ({
            ...product,
            variants: []
          })) as Product[];
        }
      } else {
        transformedData = [];
      }
      
      return {
        data: transformedData,
        error: null,
        count: totalCount || 0,
      };
    },
    PAGE_SIZE
  );

  const handleCategorySelect = (categoryId: string) => {
    console.log('Seleccionando categoría:', categoryId);
    // 🔥 FIX: Usar query params para persistir categoría al cambiar de pestaña
    updateSearchParams({ categoria: categoryId, busqueda: null });
  };

  const handleBackToCategories = () => {
    // 🔥 FIX: Limpiar query params para volver a vista de categorías
    updateSearchParams({ categoria: null, busqueda: null });
  };

  return (
    <div className="container mx-auto py-6 space-y-6" data-products-container>
      {selectedCategory ? (
        // Vista de productos de categoría
        <div>
          <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
            <div>
              <Button 
                variant="ghost" 
                onClick={handleBackToCategories}
                className="mb-2 -ml-4 text-muted-foreground"
              >
                ← Volver a categorías
              </Button>
              <h1 className="text-3xl font-bold capitalize">{selectedCategory}</h1>
              <p className="text-muted-foreground">
                Explora todos los productos disponibles
              </p>
            </div>

            {/* Barra de búsqueda */}
            <div className="relative w-full sm:w-auto">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Buscar productos..."
                className="pl-8 w-full sm:w-[250px] md:w-[300px]"
                value={searchTerm}
                onChange={(e) => updateSearchParams({ busqueda: e.target.value })}
              />
            </div>
          </div>

          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
              <p>Cargando productos...</p>
            </div>
          ) : productsResponse?.count === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">No se encontraron productos en esta categoría.</p>
              {debouncedSearchTerm && (
                <Button variant="link" onClick={() => updateSearchParams({ busqueda: null })}>
                  Limpiar búsqueda
                </Button>
              )}
            </div>
          ) : (
            <>
              <div id="products-section" />
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
                {productsResponse?.data.map((product) => (
                  <ProductCard
                    key={product.id}
                    product={product}
                  />
                ))}
              </div>
              {/* Paginador */}
              {productsResponse && productsResponse.count > pageSize && (
                <div className="flex justify-center mt-8">
                  <Pagination>
                    <PaginationContent>
                      <PaginationItem>
                        <PaginationPrevious
                          onClick={page > 1 ? () => setPage(page - 1) : undefined}
                          className={page === 1 ? 'pointer-events-none opacity-50' : ''}
                        />
                      </PaginationItem>
                      {/* Mostrar hasta 5 páginas alrededor de la actual */}
                      {Array.from({ length: Math.ceil(productsResponse.count / pageSize) }, (_, i) => i + 1)
                        .filter(p =>
                          p === 1 ||
                          p === Math.ceil(productsResponse.count / pageSize) ||
                          (p >= page - 2 && p <= page + 2)
                        )
                        .map((p, idx, arr) => (
                          <React.Fragment key={p}>
                            {idx > 0 && p - arr[idx - 1] > 1 && (
                              <PaginationItem>
                                <PaginationEllipsis />
                              </PaginationItem>
                            )}
                            <PaginationItem>
                              <PaginationLink
                                isActive={p === page}
                                onClick={() => setPage(p)}
                              >
                                {p}
                              </PaginationLink>
                            </PaginationItem>
                          </React.Fragment>
                        ))}
                      <PaginationItem>
                        <PaginationNext
                          onClick={page < Math.ceil(productsResponse.count / pageSize) ? () => setPage(page + 1) : undefined}
                          className={page === Math.ceil(productsResponse.count / pageSize) ? 'pointer-events-none opacity-50' : ''}
                        />
                      </PaginationItem>
                    </PaginationContent>
                  </Pagination>
                </div>
              )}
            </>
          )}

        </div>
      ) : (
        // Vista de selección de categoría
        <div>
          <div className="mb-6">
            <h1 className="text-3xl font-bold">Catálogo de {selectedBrand.name}</h1>
            <p className="text-muted-foreground">
              Explora todos los productos disponibles
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {categories.map((category) => (
              <CategoryCard
                key={category.id}
                title={category.title}
                icon={category.icon}
                description={category.description}
                onClick={() => handleCategorySelect(category.id)}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default CatalogPage;
