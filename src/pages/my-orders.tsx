import React, { useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import {
  Package,
  Download,
  FileText,
  Loader2,
  ShoppingBag,
  Eye,
  FileSpreadsheet,
  Edit,
  XCircle
} from "lucide-react";
import { useSupabaseQuery } from '@/hooks/use-supabase-query';
import { useAuth } from '@/contexts/auth-context';
import { OrderWithDetails, OrderStatus, OrderItem } from '@/types';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from 'xlsx';
import { Helmet } from "react-helmet-async";

const MyOrdersPage = () => {
  const [selectedOrder, setSelectedOrder] = useState<OrderWithDetails | null>(null);
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [orderToCancel, setOrderToCancel] = useState<string | null>(null);
  const { toast } = useToast();
  const { user } = useAuth();
  const navigate = useNavigate();

  // Obtener pedidos del usuario actual
  const { 
    data: ordersResponse, 
    isLoading, 
    isError,
    refetch 
  } = useSupabaseQuery(
    ['my-orders', user?.id],
    'orders',
    async (client) => {
      console.log('Consultando pedidos del usuario:', user?.id);
      
      const { data, error } = await client
        .from('orders')
        .select(`
          *,
          items:order_items(*)
        `)
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Transformar los datos para agregar la información del usuario
      const ordersWithUserData = data?.map(order => ({
        ...order,
        user: user || undefined,
        items: order.items || []
      })) || [];

      return { 
        data: ordersWithUserData as OrderWithDetails[], 
        error: null, 
        count: ordersWithUserData.length 
      };
    },
    {
      enabled: !!user?.id,
      staleTime: 1000 * 60 * 5, // 5 minutos
    }
  );

  const orders = (ordersResponse?.data || []) as OrderWithDetails[];

  // Función para obtener el label del estado
  const getStatusLabel = (status: OrderStatus) => {
    const labels = {
      pending: 'Pendiente',
      confirmed: 'Confirmado', 
      processing: 'Procesando',
      completed: 'Completado',
      cancelled: 'Cancelado'
    };
    return labels[status];
  };

  // Función para obtener el color del badge según el estado
  const getStatusBadgeVariant = (status: OrderStatus) => {
    switch (status) {
      case 'pending': return 'outline';
      case 'confirmed': return 'default';
      case 'processing': return 'secondary';
      case 'completed': return 'default';
      case 'cancelled': return 'destructive';
      default: return 'outline';
    }
  };

  // Función para generar PDF de un pedido específico
  const generateOrderPDF = (order: OrderWithDetails) => {
    try {
      const doc = new jsPDF();

      // Configuración
      doc.setTextColor(0, 0, 0);
      doc.setDrawColor(220, 220, 220);

      // Información del pedido
      const orderDate = new Date(order.created_at).toLocaleDateString("es-AR");
      const customerName = user?.name || "Cliente";
      const brandName = order.brand_name;

      // Encabezado
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.text('Detalle de Pedido', 20, 20);

      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text(`Pedido ID: ${order.id}`, 20, 30);
      doc.text(`Fecha: ${orderDate}`, 20, 37);
      doc.text(`Cliente: ${customerName}`, 20, 44);
      doc.text(`Marca: ${brandName}`, 20, 51);
      doc.text(`Estado: ${getStatusLabel(order.status as OrderStatus)}`, 20, 58);

      // Línea separadora
      doc.setLineWidth(0.1);
      doc.line(20, 65, 190, 65);

      // Tabla de productos
      const tableColumn = [
        "Producto",
        "SKU", 
        "Talla",
        "Cantidad",
        "Precio Unit.",
        "Subtotal",
      ];

      const tableRows = order.items?.map((item: OrderItem) => [
        item.product_name,
        item.product_sku,
        item.size,
        item.quantity.toString(),
        new Intl.NumberFormat('es-AR', {
          style: 'currency',
          currency: 'ARS'
        }).format(item.unit_price),
        new Intl.NumberFormat('es-AR', {
          style: 'currency', 
          currency: 'ARS'
        }).format(item.total_price),
      ]) || [];

      autoTable(doc, {
        head: [tableColumn],
        body: tableRows,
        startY: 70,
        theme: 'grid',
        headStyles: {
          fillColor: [230, 230, 230],
          textColor: 0,
          fontStyle: 'bold',
        },
      });

      // Totales
      const finalY = (doc as any).lastAutoTable.finalY || 120;
      doc.setLineWidth(0.1);
      doc.line(120, finalY + 5, 190, finalY + 5);
      
      doc.setFont('helvetica', 'bold');
      doc.text(`Total Artículos: ${order.total_items}`, 120, finalY + 12);
      doc.text(`Total: ${new Intl.NumberFormat('es-AR', {
        style: 'currency',
        currency: 'ARS'
      }).format(order.total_amount)}`, 120, finalY + 19);

      // Descargar
      const fileName = `Mi_Pedido_${order.id.slice(0, 8)}_${orderDate.replace(/\//g, '-')}.pdf`;
      doc.save(fileName);

      toast({
        title: "PDF descargado",
        description: "Se ha descargado el detalle de tu pedido en formato PDF.",
      });
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast({
        title: "Error", 
        description: "No se pudo generar el PDF del pedido",
        variant: "destructive",
      });
    }
  };

  // Funciones auxiliares para categorizar productos
  const determineProductType = (productName: string): string => {
    const name = productName.toLowerCase();
    if (name.includes('zapatilla') || name.includes('zapato') || name.includes('bota') || name.includes('sandalia')) {
      return 'Calzado';
    } else if (name.includes('remera') || name.includes('pantalón') || name.includes('camisa') || name.includes('vestido') || name.includes('short') || name.includes('jean')) {
      return 'Prenda';
    } else if (name.includes('cinturón') || name.includes('cartera') || name.includes('mochila') || name.includes('gorra') || name.includes('collar')) {
      return 'Accesorio';
    }
    return 'Otro';
  };

  const determineCategory = (productName: string): string => {
    const name = productName.toLowerCase();
    // Calzado
    if (name.includes('zapatilla')) return 'Zapatillas';
    if (name.includes('zapato')) return 'Zapatos';
    if (name.includes('bota')) return 'Botas';
    if (name.includes('sandalia')) return 'Sandalias';
    
    // Prendas
    if (name.includes('remera')) return 'Remeras';
    if (name.includes('pantalón') || name.includes('jean')) return 'Pantalones';
    if (name.includes('camisa')) return 'Camisas';
    if (name.includes('vestido')) return 'Vestidos';
    if (name.includes('short')) return 'Shorts';
    
    // Accesorios
    if (name.includes('cinturón')) return 'Cinturones';
    if (name.includes('cartera')) return 'Carteras';
    if (name.includes('mochila')) return 'Mochilas';
    if (name.includes('gorra')) return 'Gorras';
    if (name.includes('collar')) return 'Collares';
    
    return 'Sin categoría';
  };

  // Función para exportar un pedido específico a Excel
  const generateOrderExcel = (order: OrderWithDetails) => {
    try {
      // Preparar datos para la tabla dinámica - cada item de pedido será una fila
      const excelData = order.items?.map((item, index) => ({
        // Información del pedido (se repite para cada item para facilitar tablas dinámicas)
        'ID Pedido': order.id,
        'Número Pedido': `#${order.id.slice(0, 8)}`,
        'Fecha Pedido': new Date(order.created_at).toLocaleDateString("es-AR"),
        'Cliente': user?.name || "Cliente",
        'Email Cliente': user?.email || "",
        'Marca': order.brand_name,
        'Estado Pedido': getStatusLabel(order.status as OrderStatus),
        'Total Items Pedido': order.total_items,
        'Total Monto Pedido': order.total_amount,
        
        // Información del producto/item específico
        'Item Número': index + 1,
        'Producto ID': item.product_id || '',
        'Producto SKU': item.product_sku || '',
        'Producto Nombre': item.product_name || '',
        'Producto Marca': item.product_brand || order.brand_name,
        
        // Información adicional de categorización (útil para tablas dinámicas)
        'Tipo Producto': determineProductType(item.product_name || ''),
        'Categoría': determineCategory(item.product_name || ''),
        
        // Detalles del item
        'Talla': item.size || '',
        'Cantidad': item.quantity || 0,
        'Precio Unitario': item.unit_price || 0,
        'Subtotal Item': item.total_price || 0,
        
        // Información adicional útil para análisis
        'Precio Unitario Formateado': new Intl.NumberFormat('es-AR', {
          style: 'currency',
          currency: 'ARS'
        }).format(item.unit_price || 0),
        'Subtotal Item Formateado': new Intl.NumberFormat('es-AR', {
          style: 'currency', 
          currency: 'ARS'
        }).format(item.total_price || 0),
        'Total Pedido Formateado': new Intl.NumberFormat('es-AR', {
          style: 'currency',
          currency: 'ARS'
        }).format(order.total_amount),
        
        // Metadatos para análisis
        'Año': new Date(order.created_at).getFullYear(),
        'Mes': new Date(order.created_at).getMonth() + 1,
        'Mes Nombre': new Date(order.created_at).toLocaleDateString("es-AR", { month: 'long' }),
        'Día Semana': new Date(order.created_at).toLocaleDateString("es-AR", { weekday: 'long' }),
        'Timestamp': new Date(order.created_at).toISOString(),
      })) || [];

      // Crear hoja de Excel
      const ws = XLSX.utils.json_to_sheet(excelData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Detalle Pedido");

      // Configurar anchos de columnas optimizados para tablas dinámicas
      const colWidths = [
        {wch: 36}, // ID Pedido
        {wch: 15}, // Número Pedido
        {wch: 12}, // Fecha Pedido
        {wch: 20}, // Cliente
        {wch: 25}, // Email Cliente
        {wch: 15}, // Marca
        {wch: 12}, // Estado Pedido
        {wch: 15}, // Total Items Pedido
        {wch: 15}, // Total Monto Pedido
        {wch: 8},  // Item Número
        {wch: 15}, // Producto ID
        {wch: 15}, // Producto SKU
        {wch: 30}, // Producto Nombre
        {wch: 15}, // Producto Marca
        {wch: 12}, // Tipo Producto
        {wch: 15}, // Categoría
        {wch: 8},  // Talla
        {wch: 10}, // Cantidad
        {wch: 12}, // Precio Unitario
        {wch: 12}, // Subtotal Item
        {wch: 18}, // Precio Unitario Formateado
        {wch: 18}, // Subtotal Item Formateado
        {wch: 18}, // Total Pedido Formateado
        {wch: 6},  // Año
        {wch: 6},  // Mes
        {wch: 12}, // Mes Nombre
        {wch: 12}, // Día Semana
        {wch: 20}, // Timestamp
      ];
      ws['!cols'] = colWidths;

      // Generar nombre de archivo descriptivo
      const orderDate = new Date(order.created_at).toLocaleDateString('es-AR').replace(/\//g, '-');
      const fileName = `Pedido_${order.id.slice(0, 8)}_${orderDate}_Detalle.xlsx`;
      
      // Descargar archivo
      XLSX.writeFile(wb, fileName);

      toast({
        title: "Excel descargado",
        description: "Se ha descargado el detalle de tu pedido en formato Excel para análisis de tablas dinámicas.",
      });
    } catch (error) {
      console.error('Error generating Excel:', error);
      toast({
        title: "Error", 
        description: "No se pudo generar el archivo Excel del pedido",
        variant: "destructive",
      });
    }
  };

  // Función para ver detalles del pedido
  const viewOrderDetails = (order: OrderWithDetails) => {
    setSelectedOrder(order);
    setIsDetailDialogOpen(true);
  };

  // Función para navegar a la página de edición
  const editOrder = (orderId: string) => {
    navigate(`/pedido/${orderId}`);
  };

  // Función para cancelar pedido
  const handleCancelOrder = (orderId: string) => {
    setOrderToCancel(orderId);
    setShowCancelDialog(true);
  };

  const confirmCancelOrder = async () => {
    if (!orderToCancel) return;

    try {
      const { error } = await supabase
        .from('orders')
        .update({
          status: 'cancelled',
          updated_at: new Date().toISOString()
        })
        .eq('id', orderToCancel);

      if (error) throw error;

      toast({
        title: "Pedido cancelado",
        description: "El pedido ha sido cancelado exitosamente",
      });

      setShowCancelDialog(false);
      setOrderToCancel(null);
      refetch(); // Recargar pedidos

    } catch (error: any) {
      console.error('Error cancelling order:', error);
      toast({
        title: "Error",
        description: error.message || "No se pudo cancelar el pedido",
        variant: "destructive",
      });
    }
  };

  return (
    <>
      <Helmet>
        <title>Mis Pedidos - Showroom</title>
      </Helmet>
      <div className="container mx-auto py-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold">Mis Pedidos</h1>
            <p className="text-muted-foreground">
              Consulta el historial de todos tus pedidos realizados
            </p>
          </div>
        </div>

        {/* Orders Table */}
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
            <p>Cargando tus pedidos...</p>
          </div>
        ) : isError ? (
          <Card>
            <CardContent className="flex items-center gap-2 p-6">
              <Package className="h-5 w-5 text-destructive" />
              <p>Hubo un error al cargar tus pedidos. Por favor intenta nuevamente.</p>
              <Button variant="outline" size="sm" onClick={() => refetch()}>Reintentar</Button>
            </CardContent>
          </Card>
        ) : orders.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center gap-4 p-6">
              <ShoppingBag className="h-12 w-12 text-muted-foreground" />
              <div className="text-center">
                <h3 className="text-lg font-medium">Aún no tienes pedidos</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  ¡Explora nuestro catálogo y realiza tu primer pedido!
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Pedido</TableHead>
                  <TableHead>Marca</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Artículos</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orders.map((order) => (
                  <TableRow key={order.id}>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-medium">#{order.id.slice(0, 8)}</span>
                        <span className="text-sm text-muted-foreground">
                          {new Date(order.created_at).toLocaleDateString("es-AR")}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>{order.brand_name}</TableCell>
                    <TableCell>
                      <Badge variant={getStatusBadgeVariant(order.status as OrderStatus)}>
                        {getStatusLabel(order.status as OrderStatus)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">{order.total_items}</TableCell>
                    <TableCell className="text-right">
                      {new Intl.NumberFormat('es-AR', {
                        style: 'currency',
                        currency: 'ARS'
                      }).format(order.total_amount)}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex gap-2 justify-end flex-wrap">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => viewOrderDetails(order)}
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          Ver
                        </Button>
                        {order.status === 'pending' && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => editOrder(order.id)}
                          >
                            <Edit className="h-4 w-4 mr-1" />
                            Editar
                          </Button>
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => generateOrderPDF(order)}
                        >
                          <Download className="h-4 w-4 mr-1" />
                          PDF
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => generateOrderExcel(order)}
                        >
                          <FileSpreadsheet className="h-4 w-4 mr-1" />
                          Excel
                        </Button>
                        {order.status === 'pending' && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleCancelOrder(order.id)}
                            className="text-destructive hover:text-destructive"
                          >
                            <XCircle className="h-4 w-4 mr-1" />
                            Cancelar
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        )}

        {/* Order Details Dialog */}
        <Dialog open={isDetailDialogOpen} onOpenChange={setIsDetailDialogOpen}>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Detalle del Pedido #{selectedOrder?.id.slice(0, 8)}</DialogTitle>
            </DialogHeader>
            
            {selectedOrder && (
              <div className="space-y-6">
                {/* Order Info */}
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Marca</label>
                    <p className="font-medium">{selectedOrder.brand_name}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Estado</label>
                    <Badge variant={getStatusBadgeVariant(selectedOrder.status as OrderStatus)} className="mt-1">
                      {getStatusLabel(selectedOrder.status as OrderStatus)}
                    </Badge>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Fecha</label>
                    <p className="font-medium">
                      {new Date(selectedOrder.created_at).toLocaleDateString("es-AR")}
                    </p>
                  </div>
                </div>

                {/* Order Items */}
                <div>
                  <h3 className="text-lg font-semibold mb-3">Productos del Pedido</h3>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Producto</TableHead>
                        <TableHead>SKU</TableHead>
                        <TableHead>Talla</TableHead>
                        <TableHead className="text-right">Cantidad</TableHead>
                        <TableHead className="text-right">Precio</TableHead>
                        <TableHead className="text-right">Subtotal</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {selectedOrder.items?.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell className="font-medium">{item.product_name}</TableCell>
                          <TableCell>{item.product_sku}</TableCell>
                          <TableCell>{item.size}</TableCell>
                          <TableCell className="text-right">{item.quantity}</TableCell>
                          <TableCell className="text-right">
                            {new Intl.NumberFormat('es-AR', {
                              style: 'currency',
                              currency: 'ARS'
                            }).format(item.unit_price)}
                          </TableCell>
                          <TableCell className="text-right">
                            {new Intl.NumberFormat('es-AR', {
                              style: 'currency',
                              currency: 'ARS'
                            }).format(item.total_price)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {/* Totals */}
                <div className="border-t pt-4">
                  <div className="flex justify-end space-x-8">
                    <div className="text-right">
                      <p className="text-sm text-muted-foreground">Total Artículos</p>
                      <p className="text-lg font-semibold">{selectedOrder.total_items}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-muted-foreground">Total Monto</p>
                      <p className="text-lg font-semibold">
                        {new Intl.NumberFormat('es-AR', {
                          style: 'currency',
                          currency: 'ARS'
                        }).format(selectedOrder.total_amount)}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Notes */}
                {selectedOrder.notes && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Notas</label>
                    <p className="mt-1 p-3 bg-muted rounded-md">{selectedOrder.notes}</p>
                  </div>
                )}

                {/* Actions */}
                <div className="flex justify-end gap-2 pt-4 border-t">
                  <Button 
                    variant="outline" 
                    onClick={() => generateOrderPDF(selectedOrder)}
                  >
                    <Download className="mr-2 h-4 w-4" />
                    Descargar PDF
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={() => generateOrderExcel(selectedOrder)}
                  >
                    <FileSpreadsheet className="mr-2 h-4 w-4" />
                    Descargar Excel
                  </Button>
                  <Button onClick={() => setIsDetailDialogOpen(false)}>
                    Cerrar
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Cancel Order Confirmation Dialog */}
        <AlertDialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>¿Cancelar este pedido?</AlertDialogTitle>
              <AlertDialogDescription>
                Esta acción marcará el pedido como cancelado. Podrás crear un nuevo pedido si lo deseas.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setOrderToCancel(null)}>
                No, mantener pedido
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={confirmCancelOrder}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Sí, cancelar pedido
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </>
  );
};

export default MyOrdersPage; 