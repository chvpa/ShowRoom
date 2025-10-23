import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { ChevronLeft, Plus, Minus, ShoppingCart } from 'lucide-react';
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useBrand } from "@/contexts/brand-context";
import { useCart } from "@/hooks/use-cart";

interface Product {
  id: string;
  sku: string;
  name: string;
  price: number;
  images: string[];
  brand: string | null;
  category: string | null;
  description?: string;
  gender?: string;
  silhouette?: string;
  enabled?: boolean;
  variants?: ProductVariant[];
  product_type?: string;
  rubro?: string;
  status?: string;
}

interface ProductVariant {
  id: string;
  product_id: string;
  sku?: string;
  size: string;
  simple_curve: number;
  reinforced_curve: number;
  stock_quantity: number;
  created_at?: string;
  updated_at?: string;
}

type CurveType = 'simple' | 'reinforced' | 'custom';

const ProductDetailPage = () => {
  const { id, marcaSlug } = useParams<{ id: string, marcaSlug?: string }>();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [selectedCurveType, setSelectedCurveType] = useState<CurveType>('simple');
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const { toast } = useToast();
  const navigate = useNavigate();
  const { selectedBrand, selectBrand, userBrands } = useBrand();
  const { addToCart } = useCart();

  useEffect(() => {
    const loadBrandFromSlug = async () => {
      if (!marcaSlug) return;
      
      if (selectedBrand && selectedBrand.name.toLowerCase() === marcaSlug.toLowerCase()) {
        return;
      }
      
      console.log('🔄 [ProductDetail] Cargando marca desde URL slug:', marcaSlug);
      
      const brandFromUserBrands = userBrands.find(
        brand => brand.name.toLowerCase() === marcaSlug.toLowerCase()
      );
      
      if (brandFromUserBrands) {
        console.log('✅ [ProductDetail] Marca encontrada en userBrands:', brandFromUserBrands.name);
        selectBrand(brandFromUserBrands);
        return;
      }
      
      if (userBrands.length > 0) {
        try {
          const { data, error } = await supabase
            .from('brands')
            .select('*')
            .ilike('name', marcaSlug)
            .maybeSingle();
            
          if (data && !error) {
            console.log('✅ [ProductDetail] Marca encontrada en base de datos:', data.name);
            selectBrand(data);
          } else {
            console.error('❌ [ProductDetail] Marca no encontrada:', error);
          }
        } catch (error) {
          console.error('❌ [ProductDetail] Error al buscar marca:', error);
        }
      }
    };
    
    loadBrandFromSlug();
  }, [marcaSlug, userBrands.length, selectedBrand, selectBrand]);

  useEffect(() => {
    if (id) {
      fetchProductDetails(id);
    }
  }, [id]);

  const fetchProductDetails = async (productId: string) => {
    try {
      setLoading(true);
      
      const { data: productData, error: productError } = await supabase
        .from('products')
        .select('*')
        .eq('id', productId)
        .single();
      
      if (productError) throw productError;
      
      const { data: variantsData, error: variantsError } = await supabase
        .from('product_variants')
        .select('*')
        .eq('product_id', productId);
      
      if (variantsError) throw variantsError;
      
      const orderedVariants = [...(variantsData as ProductVariant[] || [])].sort((a, b) => {
        const getSizeValue = (size: string) => {
          if (!isNaN(Number(size))) {
            return Number(size);
          }
          
          const sizeMap: Record<string, number> = {
            'XXS': 10,
            'XS': 20,
            'S': 30,
            'M': 40,
            'L': 50,
            'XL': 60,
            'XXL': 70,
            'XXXL': 80
          };
          
          const upperSize = size.toUpperCase();
          
          return sizeMap[upperSize] || 1000;
        };
        
        return getSizeValue(a.size) - getSizeValue(b.size);
      });
      
      const productWithVariants: Product = {
        ...productData,
        variants: orderedVariants,
      };
      
      setProduct(productWithVariants);
      
      const initialQuantities: Record<string, number> = {};
      orderedVariants.forEach((variant) => {
        initialQuantities[variant.size || ''] = 0;
      });
      setQuantities(initialQuantities);
      
      setTimeout(() => {
        if (orderedVariants.length > 0) {
          const simpleQuantities: Record<string, number> = {};
          orderedVariants.forEach((variant) => {
            simpleQuantities[variant.size || ''] = variant.simple_curve || 0;
          });
          setQuantities(simpleQuantities);
        }
      }, 0);
      
    } catch (error) {
      console.error('Error fetching product details:', error);
      toast({
        title: "Error",
        description: "No se pudo cargar la información del producto.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleQuantityChange = (size: string, value: number) => {
    const variant = product?.variants?.find(v => v.size === size);
    const maxStock = variant?.stock_quantity || 0;
    const newValue = Math.max(0, Math.min(value, maxStock));
    
    setQuantities(prev => ({
      ...prev,
      [size]: newValue
    }));
  };

  const handleIncrement = (size: string) => {
    handleQuantityChange(size, (quantities[size] || 0) + 1);
  };

  const handleDecrement = (size: string) => {
    handleQuantityChange(size, (quantities[size] || 0) - 1);
  };
  
  const applyCurve = (curveType: CurveType) => {
    if (!product || !product.variants) return;
    
    const newQuantities: Record<string, number> = {};
    
    product.variants.forEach(variant => {
      if (curveType === 'simple') {
        newQuantities[variant.size] = variant.simple_curve || 0;
      } else if (curveType === 'reinforced') {
        newQuantities[variant.size] = variant.reinforced_curve || 0;
      } else {
        newQuantities[variant.size] = quantities[variant.size] || 0;
      }
    });
    
    setQuantities(newQuantities);
  };
  
  useEffect(() => {
    if (selectedCurveType === 'simple' || selectedCurveType === 'reinforced') {
      applyCurve(selectedCurveType);
    }
  }, [selectedCurveType]);

  const handleAddToCart = () => {
    if (!product) {
      toast({
        title: "Error",
        description: "No se pudo obtener la información del producto.",
        variant: "destructive",
      });
      return;
    }

    // Para curvas personalizadas, verificar que hay cantidades seleccionadas
    if (selectedCurveType === 'custom') {
      const totalQuantity = Object.values(quantities).reduce((sum, qty) => sum + qty, 0);
      
      if (totalQuantity === 0) {
        toast({
          title: "Error",
          description: "Debes seleccionar al menos una talla y cantidad.",
          variant: "destructive",
        });
        return;
      }

      // Para curvas personalizadas, necesitamos crear variantes temporales
      const customVariants = product.variants?.map(variant => ({
        ...variant,
        simple_curve: quantities[variant.size] || 0,
        reinforced_curve: 0
      })) || [];

             const productForCart = {
         ...product,
         variants: customVariants
       };

       addToCart(productForCart as any, 'simple');
     } else {
       // Para curvas predefinidas, usar el tipo de curva seleccionado
       addToCart(product as any, selectedCurveType);
     }
    
    // No navegar automáticamente al carrito - el usuario puede continuar viendo productos
  };

  const handleImageChange = (index: number) => {
    setCurrentImageIndex(index);
  };

  if (loading) {
    return (
      <div className="container mx-auto py-10 text-center">
        <p>Cargando información del producto...</p>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="container mx-auto py-10 text-center">
        <p>Producto no encontrado.</p>
        <Button onClick={() => navigate(-1)} className="mt-4">
          Volver
        </Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 px-4">
      <Button 
        variant="ghost" 
        onClick={() => {
          if (window.history.length > 1) {
            navigate(-1);
            return;
          }
          
          if (marcaSlug) {
            navigate(`/${marcaSlug}/catalogo`);
            return;
          }
          
          if (selectedBrand) {
            navigate(`/${selectedBrand.name.toLowerCase()}/catalogo`);
            return;
          }
          
          navigate('/brand-selection');
        }}
        className="mb-6"
      >
        <ChevronLeft className="mr-2 h-4 w-4" /> Volver
      </Button>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div>
          <div className="aspect-square overflow-hidden rounded-lg border mb-4">
            {product.images && product.images.length > 0 ? (
              <img 
                src={product.images[currentImageIndex]} 
                alt={product.name} 
                className="h-full w-full object-contain"
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
          
          {product.images && product.images.length > 1 && (
            <div className="flex gap-2 overflow-x-auto pb-2">
              {product.images.map((image, index) => (
                <div 
                  key={index}
                  className={`w-20 h-20 border rounded cursor-pointer overflow-hidden ${
                    index === currentImageIndex ? 'ring-2 ring-primary' : ''
                  }`}
                  onClick={() => handleImageChange(index)}
                >
                  <img 
                    src={image} 
                    alt={`${product.name} thumbnail ${index + 1}`} 
                    className="h-full w-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = '/placeholder.svg';
                    }} 
                  />
                </div>
              ))}
            </div>
          )}
        </div>
        
        <div>
          <div className="mb-6">
            <p className="text-sm text-muted-foreground mb-1">{product.sku}</p>
            <h1 className="text-3xl font-bold">{product.name}</h1>
            <p className="text-2xl font-semibold mt-2">
              {new Intl.NumberFormat('es-AR', {
                style: 'currency',
                currency: 'ARS'
              }).format(product.price || 0)}
            </p>
          </div>
          
          {product.description && (
            <div className="mb-6">
              <h2 className="text-lg font-semibold mb-2">Descripción</h2>
              <p className="text-muted-foreground">{product.description}</p>
            </div>
          )}
          
          <div className="mb-6">
            <h2 className="text-lg font-semibold mb-2">Tipo de Curva</h2>
            <RadioGroup 
              value={selectedCurveType} 
              onValueChange={(value) => setSelectedCurveType(value as CurveType)}
              className="flex flex-col space-y-2"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="simple" id="curve-simple" />
                <Label htmlFor="curve-simple">Curva Simple</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="reinforced" id="curve-reinforced" />
                <Label htmlFor="curve-reinforced">Curva Reforzada</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="custom" id="curve-custom" />
                <Label htmlFor="curve-custom">Armar mi propia curva</Label>
              </div>
            </RadioGroup>
            
            {selectedCurveType !== 'custom' && (
              <p className="text-sm text-muted-foreground mt-2">
                Las cantidades se han asignado automáticamente según la curva {selectedCurveType === 'simple' ? 'simple' : 'reforzada'}.
              </p>
            )}
          </div>
          
          <div className="mb-6">
            <h2 className="text-lg font-semibold mb-2">Stock</h2>
            <div className="text-sm text-muted-foreground mb-4">
              Stock: <span className="font-medium">{product.variants?.reduce((total, variant) => total + (variant.stock_quantity || 0), 0) || 0}</span> unidades en total
            </div>
            
            {product.variants && product.variants.length > 0 ? (
              <Card className="mb-4 overflow-hidden shadow-sm">
                <Table>
                  <TableHeader className="bg-muted/50">
                    <TableRow>
                      <TableHead className="w-24 text-center">Talla</TableHead>
                      <TableHead className="w-24 text-center">Stock</TableHead>
                      <TableHead className="text-center">Cantidad</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {product.variants.map((variant) => (
                      <TableRow key={variant.id} className={variant.stock_quantity === 0 ? 'opacity-50 bg-muted/20' : ''}>
                        <TableCell className="font-medium text-center">{variant.size}</TableCell>
                        <TableCell className="text-center">
                          {variant.stock_quantity > 0 ? (
                            <Badge variant="outline" className={variant.stock_quantity > 10 ? "bg-green-50" : "bg-amber-50"}>
                              {variant.stock_quantity}
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="bg-red-50">Sin stock</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center justify-center">
                            <Button
                              type="button"
                              variant="outline"
                              size="icon"
                              onClick={() => handleDecrement(variant.size)}
                              disabled={quantities[variant.size] === 0 || variant.stock_quantity === 0 || selectedCurveType !== 'custom'}
                              className="h-8 w-8"
                            >
                              <Minus className="h-3 w-3" />
                            </Button>
                            <Input
                              type="number"
                              min="0"
                              max={variant.stock_quantity}
                              value={quantities[variant.size] || 0}
                              onChange={(e) => handleQuantityChange(variant.size, parseInt(e.target.value) || 0)}
                              className="w-14 mx-1 text-center h-8 p-1"
                              disabled={variant.stock_quantity === 0 || selectedCurveType !== 'custom'}
                            />
                            <Button
                              type="button"
                              variant="outline"
                              size="icon"
                              onClick={() => handleIncrement(variant.size)}
                              disabled={quantities[variant.size] >= variant.stock_quantity || variant.stock_quantity === 0 || selectedCurveType !== 'custom'}
                              className="h-8 w-8"
                            >
                              <Plus className="h-3 w-3" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Card>
            ) : (
              <Card className="p-4 text-center">
                <p className="text-muted-foreground">No hay tallas disponibles para este producto.</p>
              </Card>
            )}
          </div>
          
          <Button 
            className="w-full mt-4"
            onClick={handleAddToCart}
            disabled={Object.values(quantities).reduce((sum, qty) => sum + qty, 0) === 0}
          >
            <ShoppingCart className="mr-2 h-4 w-4" />
            Añadir al pedido
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ProductDetailPage;
