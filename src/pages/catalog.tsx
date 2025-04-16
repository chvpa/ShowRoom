import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Shirt, Footprints, Watch, ChevronRight, Loader2, Backpack, Search, Plus, Check, ShoppingCart } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { useBrand } from '@/contexts/brand-context';
import { useAuth } from '@/contexts/auth-context';
import { Brand, Product } from '@/types';
import { useSupabaseQuery } from '@/hooks/use-supabase-query';
import { supabase } from '@/integrations/supabase/client';
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { LazyImage } from '@/components/ui/lazy-image';
import { useDebounce } from '@/hooks/use-debounce';
import { Checkbox } from '@/components/ui/checkbox';

// Simulación de un hook de carrito
// En una implementación real, deberías crear un hook real en `/hooks/use-cart.tsx`
const useCart = () => {
  const addToCart = async (item: any) => {
    // Aquí iría la lógica real para añadir al carrito usando Supabase
    console.log('Añadiendo al carrito:', item);
    return true;
  };

  return {
    addToCart
  };
};

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

const ProductCard = ({ 
  product, 
  isSelected,
  onSelect,
  onAddToCart,
  selectionMode
}: { 
  product: Product;
  isSelected?: boolean;
  onSelect?: (product: Product) => void;
  onAddToCart: (product: Product) => void;
  selectionMode: boolean;
}) => {
  const navigate = useNavigate();
  const { selectedBrand } = useBrand();
  
  const handleClick = () => {
    if (selectionMode && onSelect) {
      onSelect(product);
      return;
    }
    
    // Usar la nueva ruta con marca en la URL
    if (selectedBrand) {
      navigate(`/${selectedBrand.name.toLowerCase()}/producto/${product.id}`);
    } else {
      navigate(`/product/${product.id}`);
    }
  };

  const handleAddToCart = (e: React.MouseEvent) => {
    e.stopPropagation(); // Evitar navegación
    onAddToCart(product);
  };
  
  return (
    <Card className={`overflow-hidden cursor-pointer hover:shadow-md transition-all relative ${isSelected ? 'ring-2 ring-primary ring-offset-2' : ''}`}>
      <div onClick={handleClick} className="flex flex-col h-full">
        <div className="aspect-square relative overflow-hidden">
          {selectionMode && (
            <div className="absolute top-2 left-2 z-10">
              <Checkbox 
                checked={isSelected}
                className={isSelected ? "bg-primary border-primary text-white" : "border-white bg-black/20"}
              />
            </div>
          )}
          <LazyImage
            src={product.images && product.images[0] ? product.images[0] : ''}
            alt={product.name}
            aspectRatio="1:1"
            placeholderSrc="/placeholder.svg"
            fallbackSrc="/placeholder.svg"
          />
        </div>
        <CardContent className="p-4 flex-grow">
          <p className="text-sm text-muted-foreground">{product.sku}</p>
          <h3 className="font-medium line-clamp-2 mt-1">{product.name}</h3>
          <p className="font-semibold mt-2">
            {new Intl.NumberFormat('es-AR', {
              style: 'currency',
              currency: 'ARS'
            }).format(product.price || 0)}
          </p>
        </CardContent>
      </div>
      <CardFooter className="p-2 border-t bg-muted/30">
        <Button 
          onClick={handleAddToCart} 
          size="sm" 
          className="w-full flex items-center gap-2"
        >
          <ShoppingCart size={16} />
          Añadir al pedido
        </Button>
      </CardFooter>
    </Card>
  );
};

const CatalogPage = () => {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedProducts, setSelectedProducts] = useState<Product[]>([]);
  const debouncedSearchTerm = useDebounce(searchTerm, 300);
  const { toast } = useToast();
  const navigate = useNavigate();
  const { selectedBrand, selectBrand, userBrands } = useBrand();
  const { user } = useAuth();
  const { addToCart } = useCart();
  // Obtener el parámetro de marca de la URL
  const { marcaSlug } = useParams<{ marcaSlug?: string }>();
  
  // Efecto para seleccionar la marca basada en el parámetro de la URL
  useEffect(() => {
    const loadBrandFromSlug = async () => {
      if (marcaSlug && (!selectedBrand || selectedBrand.name.toLowerCase() !== marcaSlug.toLowerCase())) {
        console.log('Cargando marca desde URL slug:', marcaSlug);
        // Primero intentar encontrar la marca en las marcas del usuario
        const brandFromUserBrands = userBrands.find(
          brand => brand.name.toLowerCase() === marcaSlug.toLowerCase()
        );
        
        if (brandFromUserBrands) {
          console.log('Marca encontrada en userBrands:', brandFromUserBrands.name);
          selectBrand(brandFromUserBrands);
        } else {
          // Si no está en las marcas del usuario, buscar en la base de datos
          console.log('Buscando marca en base de datos:', marcaSlug);
          const { data, error } = await supabase
            .from('brands')
            .select('*')
            .ilike('name', marcaSlug)
            .maybeSingle();
            
          if (data && !error) {
            console.log('Marca encontrada en base de datos:', data.name);
            selectBrand(data);
          } else {
            // Si no se encuentra la marca, redirigir a la selección de marca
            console.error('Marca no encontrada, error:', error);
            navigate('/brand-selection');
            toast({
              title: "Marca no encontrada",
              description: "La marca especificada en la URL no existe o no tienes acceso a ella",
              variant: "destructive",
            });
          }
        }
      }
    };
    
    loadBrandFromSlug();
  }, [marcaSlug, selectedBrand, userBrands, selectBrand, navigate, toast]);

  // Redirect to brand selection if no brand is selected
  if (!selectedBrand) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
        <p>Cargando catálogo...</p>
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

  // Use React Query to fetch products filtered by brand and category
  const { data: productsResponse, isLoading } = useSupabaseQuery<Product>(
    ['products', selectedBrand.id, selectedCategory, debouncedSearchTerm], // Query key includes brand, category, and search
    'products',
    async (query) => {
      console.log('Consultando productos para catálogo - Marca:', selectedBrand.name, 'Categoría:', selectedCategory);
      
      let baseQuery = query
        .from('products')
        .select('*')
        .eq('enabled', true)
        .eq('brand', selectedBrand.name); // Filter by selected brand name, not id
      
      // Only apply category filter if a category is selected
      if (selectedCategory) {
        // El valor en el CSV está en mayúsculas, pero el id de categoría en minúsculas
        const categoryUppercase = selectedCategory.toUpperCase();
        console.log('Buscando productos con product_type:', categoryUppercase);
        baseQuery = baseQuery.eq('product_type', categoryUppercase);
      }

      // Aplicar filtro de búsqueda si existe
      if (debouncedSearchTerm) {
        baseQuery = baseQuery.or(`name.ilike.%${debouncedSearchTerm}%,sku.ilike.%${debouncedSearchTerm}%`);
      }
      
      const { data, error } = await baseQuery;
      
      if (error) {
        console.error('Error al consultar productos para catálogo:', error);
        throw error;
      }
      
      console.log('Productos encontrados en catálogo:', data?.length || 0);
      
      return { 
        data: data || [], 
        error: null, 
        count: data?.length || 0 
      };
    },
    {
      enabled: !!selectedBrand.id, // Only run query if we have a brand
      staleTime: 1000 * 60 * 10, // 10 minutes
    }
  );

  const handleCategorySelect = (categoryId: string) => {
    console.log('Seleccionando categoría:', categoryId);
    setSelectedCategory(categoryId);
    setSearchTerm('');
    setSelectedProducts([]);
    setSelectionMode(false);
  };

  const handleBackToCategories = () => {
    setSelectedCategory(null);
    setSearchTerm('');
    setSelectedProducts([]);
    setSelectionMode(false);
  };

  const handleAddToCart = async (product: Product) => {
    // Implementación real para añadir al carrito con curva simple
    try {
      const { id, name, price, sku, images } = product;
      
      // Crear el objeto para el carrito
      const cartItem = {
        product_id: id,
        user_id: user?.id,
        brand_id: selectedBrand.id,
        quantity: 1, // Cantidad por defecto
        // En una implementación real, aquí se agregarían tallas de curva simple
        size: "Estándar", // Indicar que es talla estándar o curva simple
        product: {
          id,
          name,
          price,
          sku,
          images
        }
      };
      
      // Usar la función del hook para añadir al carrito
      await addToCart(cartItem);
      
      // Mostrar notificación de éxito
      toast({
        title: "Producto añadido al carrito",
        description: `${name} (Curva simple) se ha añadido al carrito.`,
      });
    } catch (error) {
      console.error("Error al añadir al carrito:", error);
      toast({
        title: "Error",
        description: "No se pudo añadir el producto al carrito",
        variant: "destructive",
      });
    }
  };

  const handleToggleSelection = (product: Product) => {
    setSelectedProducts(prev => {
      const isSelected = prev.some(p => p.id === product.id);
      if (isSelected) {
        return prev.filter(p => p.id !== product.id);
      } else {
        return [...prev, product];
      }
    });
  };

  const handleToggleSelectionMode = () => {
    if (selectionMode) {
      setSelectionMode(false);
      setSelectedProducts([]);
    } else {
      setSelectionMode(true);
    }
  };

  const handleAddSelectedToCart = () => {
    if (selectedProducts.length === 0) {
      toast({
        title: "No hay productos seleccionados",
        description: "Selecciona al menos un producto para añadir al carrito.",
        variant: "destructive",
      });
      return;
    }

    // Añadir todos los productos seleccionados al carrito
    selectedProducts.forEach(product => {
      handleAddToCart(product);
    });

    toast({
      title: "Productos añadidos al carrito",
      description: `Se han añadido ${selectedProducts.length} productos al carrito.`,
    });

    setSelectedProducts([]);
    setSelectionMode(false);
  };

  return (
    <div className="container mx-auto py-6">
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

            <div className="flex flex-col sm:flex-row items-center gap-3">
              {/* Barra de búsqueda */}
              <div className="relative w-full sm:w-auto">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="Buscar productos..."
                  className="pl-8 w-full sm:w-[250px] md:w-[300px]"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>

              {/* Botones de acción */}
              <div className="flex items-center gap-2">
                <Button
                  variant={selectionMode ? "secondary" : "outline"}
                  size="sm"
                  onClick={handleToggleSelectionMode}
                >
                  {selectionMode ? (
                    <>
                      <Check className="mr-1 h-4 w-4" /> Cancelar
                    </>
                  ) : (
                    <>
                      <Check className="mr-1 h-4 w-4" /> Seleccionar
                    </>
                  )}
                </Button>

                {selectionMode && (
                  <Button
                    size="sm"
                    disabled={selectedProducts.length === 0}
                    onClick={handleAddSelectedToCart}
                  >
                    <ShoppingCart className="mr-1 h-4 w-4" />
                    Añadir {selectedProducts.length > 0 && `(${selectedProducts.length})`}
                  </Button>
                )}
              </div>
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
                <Button variant="link" onClick={() => setSearchTerm('')}>
                  Limpiar búsqueda
                </Button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {productsResponse?.data.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  selectionMode={selectionMode}
                  isSelected={selectedProducts.some(p => p.id === product.id)}
                  onSelect={handleToggleSelection}
                  onAddToCart={handleAddToCart}
                />
              ))}
            </div>
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
