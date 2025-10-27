import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './dialog';
import { Button } from './button';
import { Badge } from './badge';
import { ShoppingCart, Package, Eye, Check } from 'lucide-react';
import { Product } from '@/types';
import { useBrand } from '@/contexts/brand-context';
import { cn } from '@/lib/utils';

interface QuickAddModalProps {
  product: Product | null;
  isOpen: boolean;
  onClose: () => void;
  onAddToCart: (product: Product, curveType: 'simple' | 'reinforced') => void;
}

type CurveType = 'simple' | 'reinforced';

export const QuickAddModal = ({ product, isOpen, onClose, onAddToCart }: QuickAddModalProps) => {
  const [selectedCurve, setSelectedCurve] = useState<CurveType>('simple');
  const navigate = useNavigate();
  const { selectedBrand } = useBrand();

  if (!product) return null;

  // Calcular totales de cada curva
  const simpleCurveTotal = product.variants?.reduce((total, variant) =>
    total + (variant.simple_curve || 0), 0) || 0;

  const reinforcedCurveTotal = product.variants?.reduce((total, variant) =>
    total + (variant.reinforced_curve || 0), 0) || 0;

  const handleAddToCart = () => {
    onAddToCart(product, selectedCurve);
    onClose();
    setSelectedCurve('simple');
  };

  const handleClose = () => {
    onClose();
    setSelectedCurve('simple');
  };

  const handleViewDetails = () => {
    onClose();
    if (selectedBrand) {
      navigate(`/${selectedBrand.name.toLowerCase()}/producto/${product.id}`);
    } else {
      navigate(`/product/${product.id}`);
    }
  };

  const currentTotal = selectedCurve === 'simple' ? simpleCurveTotal : reinforcedCurveTotal;
  const totalPrice = (product.price || 0) * currentTotal;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <div className="flex gap-4 items-start">
            {/* Imagen del producto */}
            <div className="w-20 h-20 rounded-lg overflow-hidden border flex-shrink-0 bg-muted">
              {product.images && product.images[0] ? (
                <img
                  src={product.images[0]}
                  alt={product.name}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = '/placeholder.svg';
                  }}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Package className="h-8 w-8 text-muted-foreground" />
                </div>
              )}
            </div>

            {/* Info del producto */}
            <div className="flex-1">
              <DialogTitle className="text-xl mb-1">
                Añadir al pedido
              </DialogTitle>
              <div className="space-y-1">
                <div className="font-medium text-foreground">{product.name}</div>
                <div className="text-sm text-muted-foreground">SKU: {product.sku}</div>
                <div className="text-sm font-semibold text-primary">
                  {new Intl.NumberFormat('es-AR', {
                    style: 'currency',
                    currency: 'ARS'
                  }).format(product.price || 0)}
                  <span className="text-muted-foreground font-normal"> / unidad</span>
                </div>
              </div>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Selección de curva con Cards */}
          <div>
            <h3 className="text-sm font-medium mb-3">Seleccionar tipo de curva:</h3>
            <div className="grid grid-cols-2 gap-3">
              {/* Curva Simple Card */}
              <button
                onClick={() => setSelectedCurve('simple')}
                className={cn(
                  "relative p-4 border-2 rounded-lg text-left transition-all",
                  "hover:border-primary/50 hover:shadow-sm",
                  selectedCurve === 'simple'
                    ? "border-primary bg-primary/5 shadow-sm"
                    : "border-border"
                )}
              >
                {selectedCurve === 'simple' && (
                  <div className="absolute top-2 right-2 bg-primary text-primary-foreground rounded-full p-1">
                    <Check className="h-3 w-3" />
                  </div>
                )}
                <div className="space-y-2">
                  <div className="font-medium">Curva Simple</div>
                  <div className="flex items-center gap-1 text-sm text-muted-foreground">
                    <Package className="h-4 w-4" />
                    <span>{simpleCurveTotal} unidades</span>
                  </div>
                </div>
              </button>

              {/* Curva Reforzada Card */}
              <button
                onClick={() => setSelectedCurve('reinforced')}
                className={cn(
                  "relative p-4 border-2 rounded-lg text-left transition-all",
                  "hover:border-primary/50 hover:shadow-sm",
                  selectedCurve === 'reinforced'
                    ? "border-primary bg-primary/5 shadow-sm"
                    : "border-border"
                )}
              >
                {selectedCurve === 'reinforced' && (
                  <div className="absolute top-2 right-2 bg-primary text-primary-foreground rounded-full p-1">
                    <Check className="h-3 w-3" />
                  </div>
                )}
                <div className="space-y-2">
                  <div className="font-medium">Curva Reforzada</div>
                  <div className="flex items-center gap-1 text-sm text-muted-foreground">
                    <Package className="h-4 w-4" />
                    <span>{reinforcedCurveTotal} unidades</span>
                  </div>
                </div>
              </button>
            </div>
          </div>

          {/* Breakdown de tallas (opcional - muestra primeras 6 tallas) */}
          {product.variants && product.variants.length > 0 && (
            <div className="bg-muted/30 p-3 rounded-lg">
              <div className="text-xs font-medium text-muted-foreground mb-2">
                Distribución por tallas:
              </div>
              <div className="grid grid-cols-6 gap-1 text-xs">
                {product.variants.slice(0, 6).map((variant) => {
                  const quantity = selectedCurve === 'simple'
                    ? variant.simple_curve
                    : variant.reinforced_curve;
                  return (
                    <div key={variant.id} className="text-center">
                      <div className="font-medium">{variant.size}</div>
                      <div className="text-muted-foreground">{quantity}</div>
                    </div>
                  );
                })}
                {product.variants.length > 6 && (
                  <div className="text-center text-muted-foreground">
                    +{product.variants.length - 6}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Resumen con precio total */}
          <div className="bg-primary/5 border border-primary/20 p-4 rounded-lg space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-medium">Total a añadir:</span>
              <Badge variant="secondary" className="text-base px-3 py-1">
                {currentTotal} unidades
              </Badge>
            </div>
            <div className="flex items-center justify-between pt-2 border-t border-primary/10">
              <span className="text-sm text-muted-foreground">Precio total:</span>
              <span className="text-lg font-bold text-primary">
                {new Intl.NumberFormat('es-AR', {
                  style: 'currency',
                  currency: 'ARS'
                }).format(totalPrice)}
              </span>
            </div>
          </div>
        </div>

        {/* Botones de acción */}
        <div className="flex flex-col gap-3">
          <div className="flex gap-3">
            <Button variant="outline" onClick={handleClose} className="flex-1">
              Cancelar
            </Button>
            <Button
              onClick={handleAddToCart}
              disabled={currentTotal === 0}
              className="flex-1"
            >
              <ShoppingCart className="h-4 w-4 mr-2" />
              Añadir pedido
            </Button>
          </div>

          {/* Link para ver detalles completos */}
          <Button
            variant="ghost"
            size="sm"
            onClick={handleViewDetails}
            className="w-full text-muted-foreground hover:text-foreground"
          >
            <Eye className="h-4 w-4 mr-2" />
            Ver detalles completos del producto
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}; 