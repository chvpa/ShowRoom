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

interface Product {
  id: string;
  sku: string;
  name: string;
  price: number;
  images: string[];
  brand_id: string;
  category_id?: string;
  product_type?: string;
  rubro?: string;
  description?: string;
  gender?: string;
  silhouette?: string;
  status?: string;
  enabled?: boolean;
  original_sku?: string;
  talla?: string;
  curva_simple?: number;
  curva_reforzada?: number;
  stock_quantity?: number;
  sizes?: ProductSize[];
}

interface ProductSize {
  sku: string;
  talla: string;
  curva_simple: number;
  curva_reforzada: number;
  stock_quantity: number;
}

type CurveType = 'simple' | 'reinforced' | 'custom';

const ProductDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [selectedCurveType, setSelectedCurveType] = useState<CurveType>('simple');
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    if (id) {
      fetchProductDetails(id);
    }
  }, [id]);

  const fetchProductDetails = async (productId: string) => {
    try {
      setLoading(true);
      
      // Fetch product details
      const { data: productData, error: productError } = await supabase
        .from('products')
        .select('*')
        .eq('id', productId)
        .single();
      
      if (productError) throw productError;
      
      // Obtener todas las tallas del mismo producto (basado en el SKU base)
      const baseSkuPattern = productData.sku.split('-')[0]; // Obtener el SKU base sin el sufijo de talla
      const { data: sizesData, error: sizesError } = await supabase
        .from('products')
        .select('*')
        .like('sku', `${baseSkuPattern}%`)
        .order('talla');
      
      if (sizesError) throw sizesError;
      
      // Mapear los datos de tallas a nuestro formato
      const productSizes: ProductSize[] = (sizesData || []).map((size: any) => ({
        sku: size.sku,
        talla: size.talla || '',
        curva_simple: size.curva_simple || 0,
        curva_reforzada: size.curva_reforzada || 0,
        stock_quantity: size.stock_quantity || 0
      }));
      
      // Combine product data with sizes
      const productWithSizes: Product = {
        id: productData.id,
        sku: productData.sku,
        name: productData.name,
        price: productData.price || 0,
        images: productData.images || [],
        brand_id: productData.brand_id,
        category_id: (productData as any).category_id,
        product_type: (productData as any).product_type,
        rubro: (productData as any).rubro,
        description: productData.description,
        gender: (productData as any).gender,
        silhouette: (productData as any).silhouette,
        status: (productData as any).status,
        enabled: (productData as any).enabled,
        // No usamos original_sku ya que ahora detectamos las tallas por el patrón del SKU
        talla: (productData as any).talla,
        curva_simple: (productData as any).curva_simple,
        curva_reforzada: (productData as any).curva_reforzada,
        stock_quantity: (productData as any).stock_quantity,
        sizes: productSizes,
      };
      
      setProduct(productWithSizes);
      
      // Initialize quantities for each size
      const initialQuantities: Record<string, number> = {};
      productSizes.forEach(size => {
        initialQuantities[size.talla] = 0;
      });
      setQuantities(initialQuantities);
      
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

  const handleQuantityChange = (sizeTalla: string, value: number) => {
    // Ensure quantity doesn't go below 0 or above available stock
    const size = product?.sizes?.find(s => s.talla === sizeTalla);
    const maxStock = size?.stock_quantity || 0;
    const newValue = Math.max(0, Math.min(value, maxStock));
    
    setQuantities(prev => ({
      ...prev,
      [sizeTalla]: newValue
    }));
  };

  const handleIncrement = (sizeTalla: string) => {
    handleQuantityChange(sizeTalla, (quantities[sizeTalla] || 0) + 1);
  };

  const handleDecrement = (sizeTalla: string) => {
    handleQuantityChange(sizeTalla, (quantities[sizeTalla] || 0) - 1);
  };
  
  // Aplicar la curva seleccionada automáticamente
  const applyCurve = (curveType: CurveType) => {
    if (!product || !product.sizes) return;
    
    const newQuantities: Record<string, number> = {};
    
    product.sizes.forEach(size => {
      if (curveType === 'simple') {
        newQuantities[size.talla] = size.curva_simple || 0;
      } else if (curveType === 'reinforced') {
        newQuantities[size.talla] = size.curva_reforzada || 0;
      } else {
        // Para curva personalizada, mantenemos los valores actuales
        newQuantities[size.talla] = quantities[size.talla] || 0;
      }
    });
    
    setQuantities(newQuantities);
  };
  
  // Actualizar cantidades cuando cambia el tipo de curva
  useEffect(() => {
    if (selectedCurveType === 'simple' || selectedCurveType === 'reinforced') {
      applyCurve(selectedCurveType);
    }
  }, [selectedCurveType]);

  const handleAddToCart = () => {
    // Check if any quantity is selected
    const totalQuantity = Object.values(quantities).reduce((sum, qty) => sum + qty, 0);
    
    if (totalQuantity === 0) {
      toast({
        title: "Error",
        description: "Debes seleccionar al menos una talla y cantidad.",
        variant: "destructive",
      });
      return;
    }
    
    // Create cart item
    const cartItem = {
      productId: product?.id,
      productName: product?.name,
      productSku: product?.sku,
      productImage: product?.images?.[0],
      price: product?.price,
      curveType: selectedCurveType,
      quantities: { ...quantities },
      totalQuantity,
      totalPrice: (product?.price || 0) * totalQuantity
    };
    
    // Get existing cart from localStorage or initialize empty array
    const existingCart = JSON.parse(localStorage.getItem('cart') || '[]');
    
    // Add new item to cart
    const updatedCart = [...existingCart, cartItem];
    
    // Save updated cart to localStorage
    localStorage.setItem('cart', JSON.stringify(updatedCart));
    
    toast({
      title: "Éxito",
      description: "Producto añadido al carrito correctamente.",
    });
    
    // Optionally navigate to cart or stay on product page
    // navigate('/cart');
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
        onClick={() => navigate(-1)}
        className="mb-6"
      >
        <ChevronLeft className="mr-2 h-4 w-4" /> Volver
      </Button>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Product Images */}
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
          
          {/* Thumbnail Gallery */}
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
        
        {/* Product Info */}
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
          
          {/* Curve Type Selection */}
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
          
          {/* Size Selection */}
          <div className="mb-6">
            <h2 className="text-lg font-semibold mb-2">Tallas Disponibles</h2>
            
            {product.sizes && product.sizes.length > 0 ? (
              <div className="grid grid-cols-2 gap-4">
                {product.sizes.map((size) => (
                  <Card key={size.talla} className={size.stock_quantity === 0 ? 'opacity-50' : ''}>
                    <CardContent className="p-4">
                      <div className="flex justify-between items-center mb-2">
                        <Label className="font-medium">{size.talla}</Label>
                        <span className="text-sm text-muted-foreground">
                          Stock: {size.stock_quantity}
                        </span>
                      </div>
                      
                      <div className="flex flex-col space-y-1">
                        <div className="flex justify-between text-xs text-muted-foreground">
                          <span>Curva Simple: {size.curva_simple}</span>
                          <span>Curva Reforzada: {size.curva_reforzada}</span>
                        </div>
                        
                        <div className="flex items-center">
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            onClick={() => handleDecrement(size.talla)}
                            disabled={quantities[size.talla] === 0 || size.stock_quantity === 0 || selectedCurveType !== 'custom'}
                          >
                            <Minus className="h-4 w-4" />
                          </Button>
                          <Input
                            type="number"
                            min="0"
                            max={size.stock_quantity}
                            value={quantities[size.talla] || 0}
                            onChange={(e) => handleQuantityChange(size.talla, parseInt(e.target.value) || 0)}
                            className="w-16 mx-2 text-center"
                            disabled={size.stock_quantity === 0 || selectedCurveType !== 'custom'}
                          />
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            onClick={() => handleIncrement(size.talla)}
                            disabled={quantities[size.talla] >= size.stock_quantity || size.stock_quantity === 0 || selectedCurveType !== 'custom'}
                          >
                            <Plus className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground">No hay tallas disponibles para este producto.</p>
            )}
          </div>
          
          {/* Add to Cart Button */}
          <Button 
            className="w-full mt-4"
            onClick={handleAddToCart}
            disabled={Object.values(quantities).reduce((sum, qty) => sum + qty, 0) === 0}
          >
            <ShoppingCart className="mr-2 h-4 w-4" />
            Añadir al Carrito
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ProductDetailPage;
