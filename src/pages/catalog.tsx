
import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Shirt, Footprints, Watch, ChevronRight } from 'lucide-react';
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

type CategoryCardProps = {
  title: string;
  icon: React.ElementType;
  description: string;
  onClick: () => void;
};

const CategoryCard = ({ title, icon: Icon, description, onClick }: CategoryCardProps) => {
  return (
    <Card className="category-card overflow-hidden cursor-pointer hover:shadow-md transition-shadow" onClick={onClick}>
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

interface Product {
  id: string;
  sku: string;            // codigo in CSV
  name: string;           // descripcion in CSV
  description: string | null;
  silhouette: string | null;  // silueta in CSV
  gender: string | null;      // genero in CSV
  category_id: string | null; 
  brand_id: string | null;    // marca in CSV (should store brand name or ID)
  product_type: string | null; // categoria in CSV
  rubro: string | null;       // rubro in CSV (prendas, calzados, accesorios)
  status: string | null;      // estado in CSV
  curva_simple: number | null;    // curva simple in CSV
  curva_reforzada: number | null; // curva reforzada in CSV
  talla: string | null;           // talla in CSV
  price: number | null;           // Precio in CSV
  stock_quantity: number | null;  // Cantidad Disponible in CSV
  images: string[] | null;        // IMAGEN_1 to IMAGEN_5 in CSV
  created_at: string;
  updated_at: string;
  // Custom fields for UI purposes
  category?: string;
  total_stock?: number;
  enabled?: boolean;
}

interface Brand {
  id: string;
  name: string;
  logo: string;
}

const ProductCard = ({ product }: { product: Product }) => {
  const navigate = useNavigate();
  
  const handleClick = () => {
    navigate(`/product/${product.id}`);
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
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentBrand, setCurrentBrand] = useState<Brand | null>(null);
  const { toast } = useToast();
  const navigate = useNavigate();

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
      description: "Descubre los mejores calzados para cada ocasión"
    },
    {
      id: "accesorios",
      title: "Accesorios",
      icon: Watch,
      description: "Complementa tu estilo con nuestra selección de accesorios"
    }
  ];

  useEffect(() => {
    // Obtener la marca seleccionada del localStorage
    const selectedBrandId = localStorage.getItem('selectedBrandId');
    
    if (!selectedBrandId) {
      // Si no hay marca seleccionada, redirigir a la página de selección de marca
      navigate('/brand-selection');
      return;
    }
    
    // Obtener información de la marca seleccionada
    fetchBrandInfo(selectedBrandId);
  }, [navigate]);

  useEffect(() => {
    if (selectedCategory && currentBrand) {
      fetchProductsByCategory(selectedCategory, currentBrand.id);
    }
  }, [selectedCategory, currentBrand]);

  const fetchBrandInfo = async (brandId: string) => {
    try {
      const { data, error } = await supabase
        .from('brands')
        .select('*')
        .eq('id', brandId)
        .single();
      
      if (error) throw error;
      
      setCurrentBrand(data);
    } catch (error) {
      console.error('Error fetching brand info:', error);
      toast({
        title: "Error",
        description: "No se pudo cargar la información de la marca.",
        variant: "destructive",
      });
    }
  };

  const fetchProductsByCategory = async (category: string, brandId: string) => {
    try {
      setLoading(true);
      
      // Obtener todos los productos de la marca seleccionada
      // Separar la consulta en pasos para evitar la instantiación de tipo excesivamente profunda
      const query = supabase
        .from('products')
        .select('*')
        .eq('brand_id', brandId)
        .eq('enabled', true);
        
      const { data, error } = await query;
      
      if (error) throw error;
      
      // Convertir los datos a tipo Product para evitar errores de TypeScript
      const productsData = data as unknown as Product[];
      
      // Filtrar los productos por categoría usando el campo 'rubro'
      // Convertimos todo a minúsculas para la comparación
      const filteredProducts = productsData?.filter(product => {
        // Normalizar el rubro del producto (minúsculas, sin espacios extras)
        const normalizedRubro = (product.rubro || '').toLowerCase().trim();
        const normalizedTargetCategory = category.toLowerCase().trim();
        
        // Si el rubro está definido, usamos ese campo directamente
        if (normalizedRubro) {
          return normalizedRubro === normalizedTargetCategory ||
                 normalizedRubro.includes(normalizedTargetCategory) ||
                 normalizedTargetCategory.includes(normalizedRubro);
        }
        
        // Si el rubro no está definido, intentamos inferirlo del product_type
        const normalizedProductType = (product.product_type || '').toLowerCase().trim();
        
        // Mapeo entre categorías de UI y valores del campo product_type
        const categoryMap: Record<string, string[]> = {
          'prendas': ['prendas', 'prenda', 'ropa', 'indumentaria', 'vestimenta'],
          'calzados': ['calzados', 'calzado', 'zapato', 'zapatilla', 'bota'],
          'accesorios': ['accesorios', 'accesorio', 'complemento', 'joya', 'reloj', 'bolso']
        };
        
        // Verificar si el tipo de producto corresponde a la categoría seleccionada
        return categoryMap[normalizedTargetCategory]?.some(value => 
          normalizedProductType === value || 
          normalizedProductType.includes(value) || 
          value.includes(normalizedProductType)
        ) || false;
      }) || [];
      
      console.log(`Filtrando productos para categoría '${category}':`, {
        totalProductos: productsData?.length || 0,
        productosFiltrados: filteredProducts.length,
        rubrosEncontrados: [...new Set(productsData?.map(p => p.rubro) || [])],
        tiposEncontrados: [...new Set(productsData?.map(p => p.product_type) || [])]
      });
      
      setProducts(filteredProducts);
    } catch (error) {
      console.error('Error fetching products:', error);
      toast({
        title: "Error",
        description: "No se pudieron cargar los productos.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCategorySelect = (categoryId: string) => {
    setSelectedCategory(categoryId);
  };

  return (
    <div className="p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-semibold">
          {currentBrand ? `Catálogo ${currentBrand.name}` : 'Catálogo'}
        </h1>
        {currentBrand && (
          <p className="text-muted-foreground mt-2">
            Explora todos los productos disponibles de {currentBrand.name}
          </p>
        )}
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
            
            {loading ? (
              <div className="text-center py-12">
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
                <p className="text-muted-foreground">
                  No hay productos disponibles en esta categoría.
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default CatalogPage;
