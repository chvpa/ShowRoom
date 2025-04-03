
import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Upload } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import CSVUploader from '@/components/CSVUploader';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { useQuery } from "@tanstack/react-query";

interface Product {
  id: string;
  sku: string;
  name: string;
  price: number;
  images: string[];
  total_stock: number;
}

const ProductsPage = () => {
  const { toast } = useToast();

  // Función para obtener productos con stock total
  const fetchProducts = async (): Promise<Product[]> => {
    // Primero obtenemos todos los productos
    const { data: products, error: productsError } = await supabase
      .from('products')
      .select('id, sku, name, price, images');
    
    if (productsError) {
      throw new Error(`Error al cargar productos: ${productsError.message}`);
    }
    
    if (!products || products.length === 0) {
      return [];
    }
    
    // Para cada producto, obtenemos la suma del stock de todas sus variantes
    const productsWithStock = await Promise.all(products.map(async (product) => {
      const { data: variants, error: variantsError } = await supabase
        .from('product_variants')
        .select('stock_quantity')
        .eq('product_id', product.id);
      
      if (variantsError) {
        console.error(`Error al cargar variantes para ${product.sku}:`, variantsError);
        return { ...product, total_stock: 0 };
      }
      
      const totalStock = variants.reduce((sum, variant) => sum + (variant.stock_quantity || 0), 0);
      
      return { 
        ...product, 
        total_stock: totalStock,
        images: product.images || [] // Aseguramos que images sea un array incluso si es null
      };
    }));
    
    return productsWithStock;
  };

  // Usar React Query para manejar la carga y el caché de datos
  const { data: products, isLoading, error } = useQuery({
    queryKey: ['products'],
    queryFn: fetchProducts
  });

  return (
    <div className="p-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8 gap-4">
        <h1 className="text-3xl font-semibold">Productos</h1>
        <CSVUploader />
      </div>

      <Card className="mt-4">
        <CardContent className="p-6">
          {isLoading ? (
            <p className="text-center">Cargando productos...</p>
          ) : error ? (
            <div className="text-center">
              <p className="text-red-500">Error al cargar productos</p>
              <p className="text-sm text-muted-foreground">
                {(error as Error).message}
              </p>
            </div>
          ) : products && products.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[80px]"></TableHead>
                    <TableHead>Código</TableHead>
                    <TableHead>Descripción</TableHead>
                    <TableHead className="text-right">Precio</TableHead>
                    <TableHead className="text-right">Disponible</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {products.map((product) => (
                    <TableRow key={product.id}>
                      <TableCell>
                        {product.images && product.images[0] && (
                          <img 
                            src={product.images[0]} 
                            alt={product.name} 
                            className="h-12 w-12 object-cover rounded-md"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = '/placeholder.svg';
                            }} 
                          />
                        )}
                      </TableCell>
                      <TableCell className="font-medium">{product.sku}</TableCell>
                      <TableCell>{product.name}</TableCell>
                      <TableCell className="text-right">
                        {new Intl.NumberFormat('es-AR', {
                          style: 'currency',
                          currency: 'ARS'
                        }).format(product.price || 0)}
                      </TableCell>
                      <TableCell className="text-right">{product.total_stock}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <p className="text-muted-foreground">
              No hay productos cargados. Por favor, suba un archivo CSV para comenzar.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ProductsPage;
