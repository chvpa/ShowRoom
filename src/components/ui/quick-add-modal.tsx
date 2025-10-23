import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './dialog';
import { Button } from './button';
import { RadioGroup, RadioGroupItem } from './radio-group';
import { Label } from './label';
import { Badge } from './badge';
import { ShoppingCart, Package } from 'lucide-react';
import { Product } from '@/types';

interface QuickAddModalProps {
  product: Product | null;
  isOpen: boolean;
  onClose: () => void;
  onAddToCart: (product: Product, curveType: 'simple' | 'reinforced') => void;
}

type CurveType = 'simple' | 'reinforced';

export const QuickAddModal = ({ product, isOpen, onClose, onAddToCart }: QuickAddModalProps) => {
  const [selectedCurve, setSelectedCurve] = useState<CurveType>('simple');

  if (!product) return null;

  // Calcular totales de cada curva
  const simpleCurveTotal = product.variants?.reduce((total, variant) => 
    total + (variant.simple_curve || 0), 0) || 0;
  
  const reinforcedCurveTotal = product.variants?.reduce((total, variant) => 
    total + (variant.reinforced_curve || 0), 0) || 0;

  const handleAddToCart = () => {
    onAddToCart(product, selectedCurve);
    onClose();
    // Reset to simple curve for next use
    setSelectedCurve('simple');
  };

  const handleClose = () => {
    onClose();
    // Reset to simple curve
    setSelectedCurve('simple');
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5" />
            Añadir al pedido
          </DialogTitle>
          <DialogDescription>
            <span className="font-medium">{product.name}</span>
            <br />
            <span className="text-sm text-muted-foreground">SKU: {product.sku}</span>
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6 py-4">
          {/* Selección de curva */}
          <div>
            <Label className="text-base font-medium mb-3 block">
              Seleccionar tipo de curva:
            </Label>
            <RadioGroup 
              value={selectedCurve} 
              onValueChange={(value) => setSelectedCurve(value as CurveType)}
              className="space-y-3"
            >
              <div className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                <div className="flex items-center space-x-3">
                  <RadioGroupItem value="simple" id="quick-simple" />
                  <Label htmlFor="quick-simple" className="font-medium cursor-pointer">
                    Curva Simple
                  </Label>
                </div>
                <Badge variant="outline" className="ml-2">
                  <Package className="h-3 w-3 mr-1" />
                  {simpleCurveTotal} unidades
                </Badge>
              </div>
              
              <div className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                <div className="flex items-center space-x-3">
                  <RadioGroupItem value="reinforced" id="quick-reinforced" />
                  <Label htmlFor="quick-reinforced" className="font-medium cursor-pointer">
                    Curva Reforzada
                  </Label>
                </div>
                <Badge variant="outline" className="ml-2">
                  <Package className="h-3 w-3 mr-1" />
                  {reinforcedCurveTotal} unidades
                </Badge>
              </div>
            </RadioGroup>
          </div>

          {/* Resumen */}
          <div className="bg-muted/50 p-4 rounded-lg">
            <div className="flex items-center justify-between">
              <span className="font-medium">Total a añadir:</span>
              <Badge variant="secondary" className="text-base px-3 py-1">
                {selectedCurve === 'simple' ? simpleCurveTotal : reinforcedCurveTotal} unidades
              </Badge>
            </div>
          </div>
        </div>

        {/* Botones de acción */}
        <div className="flex gap-3 justify-end">
          <Button variant="outline" onClick={handleClose}>
            Cancelar
          </Button>
          <Button 
            onClick={handleAddToCart}
            disabled={
              (selectedCurve === 'simple' && simpleCurveTotal === 0) ||
              (selectedCurve === 'reinforced' && reinforcedCurveTotal === 0)
            }
            className="min-w-[120px]"
          >
            <ShoppingCart className="h-4 w-4 mr-2" />
            Añadir pedido
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}; 