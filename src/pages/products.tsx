import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import CSVUploader from '@/components/CSVUploader';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Pencil, Trash2, MoreHorizontal } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

interface Product {
  id: string;
  sku: string;
  name: string;
  price: number;
  images: string[];
  total_stock: number;
  enabled?: boolean; // Hacemos que sea opcional para manejar casos donde no exista en la BD
}

interface EditProductFormProps {
  product: Product;
  onSave: (updatedProduct: Partial<Product>) => Promise<void>;
  onCancel: () => void;
}

const EditProductForm = ({ product, onSave, onCancel }: EditProductFormProps) => {
  const [formData, setFormData] = useState({
    sku: product.sku || '',
    name: product.name || '',
    price: product.price || 0,
    enabled: product.enabled !== undefined ? product.enabled : true,
  });
  const [isLoading, setIsLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'price' ? parseFloat(value) || 0 : value
    }));
  };

  const handleSwitchChange = (checked: boolean) => {
    setFormData(prev => ({
      ...prev,
      enabled: checked
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await onSave(formData);
    } catch (error) {
      console.error('Error al guardar:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="sku">Código SKU</Label>
        <Input
          id="sku"
          name="sku"
          value={formData.sku}
          onChange={handleChange}
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="name">Descripción</Label>
        <Input
          id="name"
          name="name"
          value={formData.name}
          onChange={handleChange}
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="price">Precio</Label>
        <Input
          id="price"
          name="price"
          type="number"
          step="0.01"
          value={formData.price}
          onChange={handleChange}
          required
        />
      </div>
      <div className="flex items-center space-x-2">
        <Switch
          id="enabled"
          checked={formData.enabled}
          onCheckedChange={handleSwitchChange}
        />
        <Label htmlFor="enabled" className="cursor-pointer">
          {formData.enabled ? 'Habilitado' : 'Deshabilitado'}
        </Label>
      </div>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading}>
          Cancelar
        </Button>
        <Button type="submit" disabled={isLoading}>
          {isLoading ? 'Guardando...' : 'Guardar cambios'}
        </Button>
      </DialogFooter>
    </form>
  );
};

const ProductsPage = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);

  // Función para obtener productos con stock total
  const fetchProducts = async (): Promise<Product[]> => {
    // Primero obtenemos todos los productos
    const { data: products, error: productsError } = await supabase
      .from('products')
      .select('id, sku, name, price, images, enabled');
    
    if (productsError) {
      throw new Error(`Error al cargar productos: ${productsError.message}`);
    }
    
    if (!products || products.length === 0) {
      return [];
    }
    
    // Para cada producto, obtenemos la suma del stock de todas sus variantes
    const productsWithStock = await Promise.all(products.map(async (product: any) => {
      // Validamos que el producto tenga un ID válido
      if (!product || !product.id) {
        console.error('Producto inválido:', product);
        return null;
      }
      
      // Create a validated product object with known properties
      // Using type assertion to avoid TypeScript errors
      const validProduct = {
        id: product.id as string,
        sku: (product.sku as string) || '',
        name: (product.name as string) || '',
        price: Number(product.price) || 0,
        images: Array.isArray(product.images) ? product.images : [] as string[],
        enabled: product.enabled !== undefined ? Boolean(product.enabled) : true
      };

      const { data: variants, error: variantsError } = await supabase
        .from('product_variants')
        .select('stock_quantity')
        .eq('product_id', product.id);
      
      if (variantsError) {
        console.error(`Error al cargar variantes para ${validProduct.sku || 'desconocido'}:`, variantsError);
        // Create a new object with all required Product properties
        return {
          id: validProduct.id,
          sku: validProduct.sku || '',
          name: validProduct.name || '',
          price: validProduct.price || 0,
          images: [] as string[],
          total_stock: 0,
          enabled: true
        } as Product;
      }
      
      const totalStock = variants?.reduce((sum, variant) => sum + (variant.stock_quantity || 0), 0) || 0;
      
      // Use the validated product object
      return { 
        id: validProduct.id,
        sku: validProduct.sku || '',
        name: validProduct.name || '',
        price: validProduct.price || 0,
        total_stock: totalStock,
        images: Array.isArray(validProduct.images) ? validProduct.images : [] as string[], // Aseguramos que images sea un array
        enabled: validProduct.enabled !== undefined ? validProduct.enabled : true // Manejo más robusto del valor por defecto
      } as Product;
    }));
    
    // Filtramos posibles valores nulos
    const validProducts = productsWithStock.filter(product => product !== null) as Product[];
    
    return validProducts;
  };

  // Usar React Query para manejar la carga y el caché de datos
  const { data: products, isLoading, error } = useQuery({
    queryKey: ['products'],
    queryFn: fetchProducts
  });

  // Función para actualizar un producto
  const updateProduct = async (updatedProduct: Partial<Product>) => {
    if (!editingProduct) return;
    
    try {
      // Verificamos si la columna enabled existe en la base de datos
      // Si no existe, eliminamos esa propiedad para evitar errores
      const productToUpdate = { ...updatedProduct };
      
      // Intentamos primero actualizar con todos los campos
      const { error } = await supabase
        .from('products')
        .update(productToUpdate)
        .eq('id', editingProduct.id);
      
      if (error) {
        // Si hay un error, podría ser porque la columna 'enabled' no existe
        console.warn('Error al actualizar con todos los campos:', error);
        
        // Intentamos actualizar sin el campo enabled
        if ('enabled' in productToUpdate) {
          const { enabled, ...productWithoutEnabled } = productToUpdate;
          const { error: error2 } = await supabase
            .from('products')
            .update(productWithoutEnabled)
            .eq('id', editingProduct.id);
          
          if (error2) throw error2;
        } else {
          throw error;
        }
      }
      
      toast({
        title: "Producto actualizado",
        description: "El producto ha sido actualizado exitosamente."
      });
      
      // Invalidar la caché para recargar los datos
      queryClient.invalidateQueries({ queryKey: ['products'] });
      setEditingProduct(null);
    } catch (error) {
      console.error('Error al actualizar producto:', error);
      toast({
        title: "Error",
        description: "No se pudo actualizar el producto.",
        variant: "destructive"
      });
    }
  };

  // Función para eliminar un producto
  const deleteProduct = async () => {
    if (!productToDelete) return;
    
    try {
      // Primero eliminamos las variantes asociadas al producto
      const { error: variantsError } = await supabase
        .from('product_variants')
        .delete()
        .eq('product_id', productToDelete.id);
      
      if (variantsError) throw variantsError;
      
      // Luego eliminamos el producto
      const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', productToDelete.id);
      
      if (error) throw error;
      
      toast({
        title: "Producto eliminado",
        description: "El producto ha sido eliminado exitosamente."
      });
      
      // Invalidar la caché para recargar los datos
      queryClient.invalidateQueries({ queryKey: ['products'] });
      setProductToDelete(null);
    } catch (error) {
      console.error('Error al eliminar producto:', error);
      toast({
        title: "Error",
        description: "No se pudo eliminar el producto.",
        variant: "destructive"
      });
    }
  };

  // Función para cambiar el estado de habilitado/deshabilitado de un producto
  const handleProductStatusChange = async (productId: string, enabled: boolean) => {
    try {
      // Intentamos actualizar el estado del producto
      const { error } = await supabase
        .from('products')
        .update({ enabled } as any)
        .eq('id', productId);
      
      if (error) {
        // Si hay un error, podría ser porque la columna 'enabled' no existe
        console.warn('Error al actualizar estado del producto:', error);
        
        // Verificamos si necesitamos crear la columna 'enabled'
        if (error.message && (error.message.includes('column') || error.message.includes('does not exist'))) {
          toast({
            title: "Columna no encontrada",
            description: "Es posible que necesites añadir la columna 'enabled' a la tabla de productos en Supabase.",
            variant: "destructive"
          });
          return;
        }
        
        throw error;
      }
      
      toast({
        title: enabled ? "Producto habilitado" : "Producto deshabilitado",
        description: `El producto ha sido ${enabled ? 'habilitado' : 'deshabilitado'} exitosamente.`
      });
      
      // Invalidar la caché para recargar los datos
      queryClient.invalidateQueries({ queryKey: ['products'] });
    } catch (error) {
      console.error('Error al actualizar estado del producto:', error);
      toast({
        title: "Error",
        description: "No se pudo actualizar el estado del producto.",
        variant: "destructive"
      });
    }
  };

  return (
    <div className="p-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8 gap-4">
        <h1 className="text-3xl font-semibold">Productos</h1>
        <CSVUploader />
      </div>
      
      {/* Diálogo para editar producto */}
      <Dialog open={!!editingProduct} onOpenChange={(open) => !open && setEditingProduct(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar producto</DialogTitle>
            <DialogDescription>
              Modifica los detalles del producto y guarda los cambios.
            </DialogDescription>
          </DialogHeader>
          {editingProduct && (
            <EditProductForm
              product={editingProduct}
              onSave={updateProduct}
              onCancel={() => setEditingProduct(null)}
            />
          )}
        </DialogContent>
      </Dialog>
      
      {/* Diálogo de confirmación para eliminar */}
      <AlertDialog open={!!productToDelete} onOpenChange={(open) => !open && setProductToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción eliminará permanentemente el producto "{productToDelete?.name}" y no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={deleteProduct} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

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
                    <TableHead className="w-[80px]">Imagen</TableHead>
                    <TableHead>Código</TableHead>
                    <TableHead>Descripción</TableHead>
                    <TableHead className="text-right">Precio</TableHead>
                    <TableHead className="text-right">Disponible</TableHead>
                    <TableHead className="text-center">Estado</TableHead>
                    <TableHead className="w-[100px] text-right">Acciones</TableHead>
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
                      <TableCell className="text-center">
                        <Switch
                          checked={product.enabled !== undefined ? product.enabled : false}
                          onCheckedChange={(checked) => handleProductStatusChange(product.id, checked)}
                          aria-label={`${product.enabled ? 'Deshabilitar' : 'Habilitar'} producto`}
                        />
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="h-4 w-4" />
                              <span className="sr-only">Abrir menú</span>
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => setEditingProduct(product)}>
                              <Pencil className="mr-2 h-4 w-4" />
                              Editar
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={() => setProductToDelete(product)}
                              className="text-destructive focus:text-destructive"
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Eliminar
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
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
