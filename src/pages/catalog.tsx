import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Shirt, Footprints, Watch, ChevronRight, Loader2, Backpack } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { useBrand } from '@/contexts/brand-context';
import { Brand, Product } from '@/types';
import { useSupabaseQuery } from '@/hooks/use-supabase-query';
import { supabase } from '@/integrations/supabase/client';

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
  
  const handleClick = () => {
    // Usar la nueva ruta con marca en la URL
    if (selectedBrand) {
      navigate(`/${selectedBrand.name.toLowerCase()}/producto/${product.id}`);
    } else {
      navigate(`/product/${product.id}`);
    }
  };
  
  return (
    <Card className="overflow-hidden cursor-pointer hover:shadow-md transition-shadow" onClick={handleClick}>
      <div className="aspect-square relative overflow-hidden">
        {product.images && product.images[0] ? (
          <img 
            src={product.images[0]} 
            alt={product.name} 
            className="h-full w-full object-cover"
            onError={(e) => {
              (e.target as HTMLImageElement).src = '/placeholder.svg';
            }} 
          />
        ) : (
          <div className="h-full w-full flex items-center justify-center bg-muted">
            <span className="text-muted-foreground">Sin imagen</span>
          </div>
        )}
      </div>
      <CardContent className="p-4">
        <p className="text-sm text-muted-foreground">{product.sku}</p>
        <h3 className="font-medium line-clamp-2 mt-1">{product.name}</h3>
        <p className="font-semibold mt-2">
          {new Intl.NumberFormat('es-AR', {
            style: 'currency',
            currency: 'ARS'
          }).format(product.price || 0)}
        </p>
      </CardContent>
    </Card>
  );
};

const CatalogPage = () => {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const { toast } = useToast();
  const navigate = useNavigate();
  const { selectedBrand, selectBrand, userBrands } = useBrand();
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
    ['products', selectedBrand.id, selectedCategory], // Query key includes brand and category
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
      enabled: !!selectedCategory, // Solo ejecutar la consulta cuando se selecciona una categoría
      staleTime: 1000 * 60 * 5, // 5 minutes cache
    }
  );

  // Extraer los productos de la respuesta
  const products = productsResponse?.data || [];

  const handleCategorySelect = (categoryId: string) => {
    setSelectedCategory(categoryId);
  };

  return (
    <div className="p-6">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold lg:text-3xl">
          Catálogo de {selectedBrand.name}
        </h1>
        <p className="text-muted-foreground mt-2">
          Explora todos los productos disponibles
        </p>
      </div>

      {!selectedCategory ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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
      ) : (
        <div>
          <div className="mb-6">
            <Button 
              variant="ghost" 
              onClick={() => setSelectedCategory(null)}
              className="mb-4"
            >
              ← Volver a categorías
            </Button>
            
            <h2 className="text-2xl font-semibold mb-6">
              {categories.find(c => c.id === selectedCategory)?.title}
            </h2>
            
            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
                <p>Cargando productos...</p>
              </div>
            ) : products.length > 0 ? (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                {products.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <p className="text-muted-foreground">No se encontraron productos en esta categoría</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default CatalogPage;
