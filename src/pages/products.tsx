import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import CSVUploader from '@/components/CSVUploader';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { useQueryClient } from "@tanstack/react-query";
import { Pencil, Trash2, MoreHorizontal, Loader2, Minus, ChevronDown } from "lucide-react";
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
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { AlertCircle, Package } from "lucide-react";
import { useBrand } from '@/contexts/brand-context';
import { Product } from '@/types';
import { usePaginatedQuery } from '@/hooks/use-supabase-query';
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
  
  // Estados para selección masiva
  const [selectedProducts, setSelectedProducts] = useState<Set<string>>(new Set());
  const [isDeleting, setIsDeleting] = useState(false);
  const [showBulkDeleteDialog, setShowBulkDeleteDialog] = useState(false);
  const [deleteAllProducts, setDeleteAllProducts] = useState(false); // Para distinguir si eliminar solo visibles o todos
  
  const navigate = useNavigate();
  const { selectedBrand } = useBrand();

  // Redirect to brand selection if no brand is selected
  useEffect(() => {
    if (!selectedBrand) {
      navigate('/brand-selection');
    }
  }, [selectedBrand, navigate]);

  // Early return if no brand selected (after useEffect to avoid hook rules violation)
  if (!selectedBrand) {
    return null;
  }

  // Use paginatedQuery para manejo eficiente de grandes datasets
  const pageSize = 24; // 24 productos por página para grilla de 4x6
  const { 
    data: productsResponse, 
    isLoading, 
    isError,
    refetch,
    page,
    setPage,
    nextPage,
    prevPage,
    goToPage
  } = usePaginatedQuery<Product>(
    ['products', selectedBrand.id],
    'products',
    async (client, currentPage, currentPageSize) => {
      console.log(`📄 Consultando página ${currentPage} (${currentPageSize} productos) para marca: ${selectedBrand.name}`);
      
      try {
        // Calcular offset para paginación
        const from = (currentPage - 1) * currentPageSize;
        const to = from + currentPageSize - 1;

        // Consultar productos con paginación
        const { data, error, count } = await client
          .from('products')
          .select('*', { count: 'exact' })
          .eq('brand', selectedBrand.name)
          .eq('enabled', true)
          .range(from, to)
          .order('created_at', { ascending: false });
          
        if (error) throw error;
        
        console.log(`✅ Página ${currentPage}: ${data?.length || 0} productos de ${count || 0} totales`);
        
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
              console.error('Error fetching stock for product:', product.id, error);
              return { ...product, total_stock: 0 };
            }
          }));
          
          return {
            data: productsWithStock,
            error: null,
            count: count || 0
          };
        }
        
        return {
          data: data || [],
          error: null,
          count: count || 0
        };
      } catch (error: any) {
        console.error('Error in products query:', error);
        return {
          data: [],
          error: error,
          count: 0
        };
      }
    },
    pageSize
  );

  const products = productsResponse?.data || [];
  const totalCount = productsResponse?.count || 0;
  const totalPages = Math.ceil(totalCount / pageSize);

  // Función para obtener TODOS los productos de la marca (para eliminación masiva)
  const getAllProductIds = async (): Promise<string[]> => {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('id')
        .eq('brand', selectedBrand.name)
        .eq('enabled', true);
      
      if (error) throw error;
      return data?.map(p => p.id) || [];
    } catch (error) {
      console.error('Error fetching all product IDs:', error);
      return [];
    }
  };

  // Funciones para selección masiva
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const allProductIds = new Set(products.map((product: Product) => product.id));
      setSelectedProducts(allProductIds);
      setDeleteAllProducts(false); // Solo página actual
    } else {
      setSelectedProducts(new Set());
      setDeleteAllProducts(false);
    }
  };

  const handleSelectAllBrand = async () => {
    const allIds = await getAllProductIds();
    setSelectedProducts(new Set(allIds));
    setDeleteAllProducts(true); // Toda la marca
    toast({
      title: "Productos seleccionados",
      description: `Se seleccionaron ${allIds.length} productos de toda la marca.`,
    });
  };

  const handleSelectProduct = (productId: string, checked: boolean) => {
    const newSelected = new Set(selectedProducts);
    if (checked) {
      newSelected.add(productId);
    } else {
      newSelected.delete(productId);
    }
    setSelectedProducts(newSelected);
    // Si deseleccionamos algo, ya no es "toda la marca"
    if (!checked) {
      setDeleteAllProducts(false);
    }
  };

  const isAllSelected = products.length > 0 && selectedProducts.size === products.length && !deleteAllProducts;
  const isIndeterminate = selectedProducts.size > 0 && selectedProducts.size < products.length && !deleteAllProducts;

  // Función de eliminación masiva optimizada
  const bulkDeleteProducts = async () => {
    if (selectedProducts.size === 0) return;

    setIsDeleting(true);
    try {
      const productIds = Array.from(selectedProducts);
      
      console.log(`🗑️ Eliminando ${productIds.length} productos en lote${deleteAllProducts ? ' (TODA LA MARCA)' : ' (página actual)'}...`);
      
      // Eliminar variantes primero (por la relación de foreign key)
      const { error: variantsError } = await supabase
        .from('product_variants')
        .delete()
        .in('product_id', productIds);
      
      if (variantsError) throw variantsError;
      
      // Eliminar productos
      const { error: productsError } = await supabase
        .from('products')
        .delete()
        .in('id', productIds);
      
      if (productsError) throw productsError;
      
      // Invalidar caché y actualizar UI
      queryClient.invalidateQueries({ queryKey: ['products', selectedBrand.id] });
      
      // Limpiar selección
      setSelectedProducts(new Set());
      setDeleteAllProducts(false);
      setShowBulkDeleteDialog(false);
      
      // Si eliminamos toda la marca y estamos en una página que ya no existe, volver a la página 1
      if (deleteAllProducts || (products.length === selectedProducts.size && page > 1)) {
        goToPage(1);
      }
      
      toast({
        title: "Productos eliminados",
        description: `Se eliminaron ${productIds.length} productos correctamente.`,
      });
      
      console.log(`✅ ${productIds.length} productos eliminados exitosamente`);
      
    } catch (error: any) {
      console.error('Error en eliminación masiva:', error);
      toast({
        title: "Error al eliminar productos",
        description: error.message || "No se pudieron eliminar los productos seleccionados",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const updateProduct = async (updatedProduct: Partial<Product>) => {
    if (!editingProduct) return;
    
    try {
      const { error } = await supabase
        .from('products')
        .update(updatedProduct)
        .eq('id', editingProduct.id);
      
      if (error) throw error;
      
      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['products', selectedBrand.id] });
      
      setEditingProduct(null);
      toast({
        title: "Éxito",
        description: "Producto actualizado correctamente",
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

  const deleteProduct = async () => {
    if (!productToDelete) return;
    
    try {
      // First delete variants to avoid foreign key constraint issues
      const { error: variantsError } = await supabase
        .from('product_variants')
        .delete()
        .eq('product_id', productToDelete.id);
      
      if (variantsError) throw variantsError;
      
      // Then delete the product
      const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', productToDelete.id);
      
      if (error) throw error;
      
      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['products', selectedBrand.id] });
      
      setProductToDelete(null);
      toast({
        title: "Éxito",
        description: "Producto eliminado correctamente",
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
      <div className="space-y-6" data-products-container>
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <div className='flex flex-col gap-2'>
            <h1 className="text-2xl lg:text-3xl font-bold">Productos de {selectedBrand.name}</h1>
            <p className="text-muted-foreground">
              Administra los productos de tu marca • Página {page} de {totalPages} • {totalCount} productos totales
            </p>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-2">
            {/* Botón de eliminación masiva */}
            {selectedProducts.size > 0 && (
              <div className="flex gap-2">
                {!deleteAllProducts && totalCount > products.length && (
                  <Button 
                    variant="outline" 
                    onClick={handleSelectAllBrand}
                    className="gap-2"
                  >
                    <Package className="h-4 w-4" />
                    Seleccionar toda la marca ({totalCount})
                  </Button>
                )}
                <Button 
                  variant="destructive" 
                  onClick={() => setShowBulkDeleteDialog(true)}
                  disabled={isDeleting}
                  className="gap-2"
                >
                  <Trash2 className="h-4 w-4" />
                  Eliminar seleccionados ({selectedProducts.size})
                  {deleteAllProducts && <span className="text-xs">(TODOS)</span>}
                </Button>
              </div>
            )}
            
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
        ) : totalCount === 0 ? (
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
          <>
            <div id="products-section" />
            <Card>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[50px]">
                      <div className="flex items-center justify-center">
                        {isIndeterminate ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-4 w-4 p-0 border rounded-sm bg-primary text-primary-foreground"
                            onClick={() => handleSelectAll(false)}
                            aria-label="Deseleccionar todos los productos"
                          >
                            <Minus className="h-3 w-3" />
                          </Button>
                        ) : (
                          <Checkbox
                            checked={isAllSelected}
                            onCheckedChange={handleSelectAll}
                            aria-label="Seleccionar todos los productos de esta página"
                          />
                        )}
                      </div>
                    </TableHead>
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
                        <Checkbox
                          checked={selectedProducts.has(product.id)}
                          onCheckedChange={(checked) => handleSelectProduct(product.id, checked as boolean)}
                          aria-label={`Seleccionar producto ${product.sku}`}
                        />
                      </TableCell>
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

            {/* Paginación */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  Mostrando {((page - 1) * pageSize) + 1} a {Math.min(page * pageSize, totalCount)} de {totalCount} productos
                </p>
                
                <Pagination>
                  <PaginationContent>
                    <PaginationItem>
                      <PaginationPrevious 
                        onClick={page > 1 ? prevPage : undefined}
                        className={page <= 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                      />
                    </PaginationItem>
                    
                    {/* Números de página */}
                    {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
                      let pageNumber;
                      if (totalPages <= 7) {
                        pageNumber = i + 1;
                      } else if (page <= 4) {
                        pageNumber = i + 1;
                      } else if (page >= totalPages - 3) {
                        pageNumber = totalPages - 6 + i;
                      } else {
                        pageNumber = page - 3 + i;
                      }
                      
                      return (
                        <PaginationItem key={pageNumber}>
                          <PaginationLink
                            onClick={() => goToPage(pageNumber)}
                            isActive={page === pageNumber}
                            className="cursor-pointer"
                          >
                            {pageNumber}
                          </PaginationLink>
                        </PaginationItem>
                      );
                    })}
                    
                    <PaginationItem>
                      <PaginationNext 
                        onClick={page < totalPages ? nextPage : undefined}
                        className={page >= totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
                      />
                    </PaginationItem>
                  </PaginationContent>
                </Pagination>
              </div>
            )}
          </>
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

        {/* Bulk delete confirmation */}
        <AlertDialog open={showBulkDeleteDialog} onOpenChange={setShowBulkDeleteDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>¿Eliminar productos seleccionados?</AlertDialogTitle>
              <AlertDialogDescription>
                Esta acción no se puede deshacer. Se eliminarán permanentemente {selectedProducts.size} producto{selectedProducts.size > 1 ? 's' : ''} seleccionado{selectedProducts.size > 1 ? 's' : ''} y todas sus variantes.
                {deleteAllProducts && (
                  <span className="block mt-2 font-semibold text-destructive">
                    ⚠️ ATENCIÓN: Se eliminarán TODOS los productos de la marca "{selectedBrand.name}", incluyendo los que no están visibles en esta página.
                  </span>
                )}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
              <AlertDialogAction 
                onClick={bulkDeleteProducts}
                disabled={isDeleting}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Eliminando...
                  </>
                ) : (
                  <>
                    Eliminar productos
                    {deleteAllProducts && <span className="ml-1 text-xs">(TODOS)</span>}
                  </>
                )}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </>
  );
};

export default ProductsPage;
