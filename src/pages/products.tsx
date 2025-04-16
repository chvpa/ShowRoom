import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import CSVUploader from '@/components/CSVUploader';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { useQueryClient } from "@tanstack/react-query";
import { Pencil, Trash2, MoreHorizontal, Loader2 } from "lucide-react";
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
import { AlertCircle, Package } from "lucide-react";
import { useBrand } from '@/contexts/brand-context';
import { Product } from '@/types';
import { useSupabaseQuery } from '@/hooks/use-supabase-query';
import { Helmet } from "react-helmet-async";

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
      console.error('Error saving:', error);
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
  const navigate = useNavigate();
  const { selectedBrand } = useBrand();

  // Redirect to brand selection if no brand is selected
  if (!selectedBrand) {
    navigate('/brand-selection');
    return null;
  }

  // Use React Query via our custom hook for efficient data fetching with caching
  const { 
    data: productsResponse, 
    isLoading, 
    isError,
    refetch 
  } = useSupabaseQuery<Product>(
    ['products', selectedBrand.id],
    'products',
    async (client) => {
      console.log('Consultando productos para marca ID:', selectedBrand.id);
      console.log('Nombre de la marca:', selectedBrand.name);
      
      // Usar el cliente de supabase correctamente, pero filtrando por el campo brand (nombre) en lugar de brand_id
      const { data, error } = await client
        .from('products')
        .select('*')
        .eq('brand', selectedBrand.name);
        
      if (error) throw error;
      
      console.log('Productos encontrados:', data?.length || 0);
      
      // Process the data to include stock information from variants
      if (data && data.length > 0) {
        const productsWithStock = await Promise.all(data.map(async (product) => {
          try {
            // Get stock information from variants
            const { data: variants, error: variantsError } = await supabase
              .from('product_variants')
              .select('stock_quantity')
              .eq('product_id', product.id);
            
            if (variantsError) throw variantsError;
            
            // Calculate total stock
            const totalStock = variants?.reduce(
              (sum, variant) => sum + (variant.stock_quantity || 0), 
              0
            ) || 0;
            
            return {
              ...product,
              total_stock: totalStock
            };
          } catch (error) {
            console.error(`Error fetching stock for product ${product.id}:`, error);
            return {
              ...product,
              total_stock: 0
            };
          }
        }));
        
        return { 
          data: productsWithStock, 
          error: null, 
          count: productsWithStock.length 
        };
      }
      
      return { 
        data: data || [], 
        error: null, 
        count: data?.length || 0 
      };
    },
    {
      staleTime: 1000 * 60 * 2, // 2 minutes cache
      refetchOnWindowFocus: false
    }
  );

  // Extraer los productos de la respuesta
  const products = productsResponse?.data || [];

  // Function to update a product
  const updateProduct = async (updatedProduct: Partial<Product>) => {
    if (!editingProduct) return;
    
    try {
      const { error } = await supabase
        .from('products')
        .update(updatedProduct)
        .eq('id', editingProduct.id);
      
      if (error) throw error;
      
      // Close the dialog and invalidate queries to refresh data
      setEditingProduct(null);
      queryClient.invalidateQueries({ queryKey: ['products', selectedBrand.id] });
      
      toast({
        title: "Éxito",
        description: "El producto ha sido actualizado",
      });
    } catch (error: any) {
      console.error('Error updating product:', error);
      toast({
        title: "Error",
        description: error.message || "No se pudo actualizar el producto",
        variant: "destructive",
      });
    }
  };

  // Function to delete a product
  const deleteProduct = async () => {
    if (!productToDelete) return;
    
    try {
      const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', productToDelete.id);
      
      if (error) throw error;
      
      // Close the dialog and invalidate queries to refresh data
      setProductToDelete(null);
      queryClient.invalidateQueries({ queryKey: ['products', selectedBrand.id] });
      
      toast({
        title: "Éxito",
        description: "El producto ha sido eliminado",
      });
    } catch (error: any) {
      console.error('Error deleting product:', error);
      toast({
        title: "Error",
        description: error.message || "No se pudo eliminar el producto",
        variant: "destructive",
      });
    }
  };

  // Function to change product status (enabled/disabled)
  const handleProductStatusChange = async (productId: string, enabled: boolean) => {
    try {
      const { error } = await supabase
        .from('products')
        .update({ enabled })
        .eq('id', productId);
      
      if (error) throw error;
      
      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['products', selectedBrand.id] });
      
      toast({
        title: "Éxito",
        description: `Producto ${enabled ? 'habilitado' : 'deshabilitado'} correctamente`,
      });
    } catch (error: any) {
      console.error('Error updating product status:', error);
      toast({
        title: "Error",
        description: error.message || "No se pudo actualizar el estado del producto",
        variant: "destructive",
      });
    }
  };

  return (
    <>
      <Helmet>
        <title>Catálogo de Productos - Showroom</title>
      </Helmet>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <div className='flex flex-col gap-2'>
            <h1 className="text-2xl lg:text-3xl font-bold">Productos de {selectedBrand.name}</h1>
            <p className="text-muted-foreground">Administra los productos de tu marca</p>
          </div>
          
          <CSVUploader 
            bucketName="products" 
            onSuccess={() => {
              // Forzar la recarga de datos para asegurar que se muestren los nuevos productos
              console.log('Productos importados, refrescando datos...');
              queryClient.invalidateQueries({ queryKey: ['products', selectedBrand.id] });
              refetch();
              toast({
                title: "Éxito",
                description: "Los productos se han importado correctamente",
              });
            }}
            brandId={selectedBrand.id}
          />
        </div>
        
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
            <p>Cargando productos...</p>
          </div>
        ) : isError ? (
          <Card>
            <CardContent className="flex items-center gap-2 p-6">
              <AlertCircle className="h-5 w-5 text-destructive" />
              <p>Hubo un error al cargar los productos. Por favor intenta nuevamente.</p>
              <Button variant="outline" size="sm" onClick={() => refetch()}>Reintentar</Button>
            </CardContent>
          </Card>
        ) : products.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center gap-4 p-6">
              <Package className="h-12 w-12 text-muted-foreground" />
              <div className="text-center">
                <h3 className="text-lg font-medium">No se encontraron productos</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Importa productos usando el cargador CSV de arriba.
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[100px]">Imagen</TableHead>
                  <TableHead>SKU</TableHead>
                  <TableHead>Descripción</TableHead>
                  <TableHead className="text-right">Precio</TableHead>
                  <TableHead className="text-right">Stock</TableHead>
                  <TableHead className="text-center">Estado</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {products.map((product) => (
                  <TableRow key={product.id}>
                    <TableCell>
                      <div className="h-12 w-12 rounded border overflow-hidden">
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
                          <div className="h-full w-full bg-muted flex items-center justify-center">
                            <span className="text-xs text-muted-foreground">No img</span>
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="font-medium">{product.sku}</TableCell>
                    <TableCell>{product.name}</TableCell>
                    <TableCell className="text-right">
                      {new Intl.NumberFormat('es-AR', {
                        style: 'currency',
                        currency: 'ARS'
                      }).format(product.price || 0)}
                    </TableCell>
                    <TableCell className="text-right">{product.total_stock || 0}</TableCell>
                    <TableCell className="text-center">
                      <Switch
                        checked={product.enabled}
                        onCheckedChange={(checked) => handleProductStatusChange(product.id, checked)}
                      />
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                            <span className="sr-only">Acciones</span>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => setEditingProduct(product)}>
                            <Pencil className="mr-2 h-4 w-4" />
                            Editar
                          </DropdownMenuItem>
                          <DropdownMenuItem className='text-destructive' onClick={() => setProductToDelete(product)}>
                            <Trash2 className="mr-2 h-4 w-4"/>
                            Eliminar
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        )}
        
        {/* Edit product dialog */}
        <Dialog open={!!editingProduct} onOpenChange={(open) => !open && setEditingProduct(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Editar Producto</DialogTitle>
              <DialogDescription>
                Realiza cambios en la información del producto aquí.
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
        
        {/* Delete product confirmation */}
        <AlertDialog open={!!productToDelete} onOpenChange={(open) => !open && setProductToDelete(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
              <AlertDialogDescription>
                Esta acción no se puede deshacer. El producto se eliminará permanentemente.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={deleteProduct}>Eliminar</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </>
  );
};

export default ProductsPage;
