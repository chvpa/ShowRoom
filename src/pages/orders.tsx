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
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
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
  Search, 
  MoreVertical, 
  Eye, 
  Calendar,
  Filter,
  Loader2,
  Users,
  ShoppingBag
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useSupabaseQuery } from '@/hooks/use-supabase-query';
import { useBrand } from '@/contexts/brand-context';
import { useAuth } from '@/contexts/auth-context';
import { OrderWithDetails, OrderStatus, OrderItem } from '@/types';
import { useDebounce } from '@/hooks/use-debounce';
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from 'xlsx';
import { Helmet } from "react-helmet-async";

const OrdersPage = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<OrderStatus | 'all'>('all');
  const [selectedOrder, setSelectedOrder] = useState<OrderWithDetails | null>(null);
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);
  const debouncedSearchTerm = useDebounce(searchTerm, 300);
  const { toast } = useToast();
  const { user } = useAuth();
  const { selectedBrand } = useBrand();

  // Obtener pedidos filtrados por marca y usuario
  const {
    data: ordersResponse,
    isLoading,
    isError,
    refetch
  } = useSupabaseQuery(
    ['orders', selectedBrand?.name, statusFilter, debouncedSearchTerm],
    'orders',
    async (client) => {
      console.log('Consultando pedidos para marca:', selectedBrand?.name);

      // Si el usuario es admin y no tiene marca seleccionada, no hacer la query
      if (user?.role === 'admin' && !selectedBrand) {
        console.log('⚠️ Admin sin marca seleccionada, retornando vacío');
        return { data: [], error: null, count: 0 };
      }

      let query = client
        .from('orders')
        .select(`
          *,
          user:users(id, name, email),
          items:order_items(*)
        `);

      // Filtrar por marca si el usuario es admin (superadmin ve todos)
      if (user?.role === 'admin' && selectedBrand) {
        query = query.eq('brand_name', selectedBrand.name);
      }

      // Filtrar por estado si no es 'all'
      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }

      // Filtrar por término de búsqueda en el nombre del usuario o ID del pedido
      if (debouncedSearchTerm) {
        // Para búsqueda necesitamos hacer join con users
        const { data: usersData } = await client
          .from('users')
          .select('id')
          .ilike('name', `%${debouncedSearchTerm}%`);
        
        if (usersData && usersData.length > 0) {
          const userIds = usersData.map(u => u.id);
          query = query.in('user_id', userIds);
        } else {
          // Si no encuentra usuarios, buscar por ID de pedido
          query = query.ilike('id', `%${debouncedSearchTerm}%`);
        }
      }

      query = query.order('created_at', { ascending: false });

      const { data, error } = await query;

      if (error) throw error;

      // Transformar los datos para asegurar que tengan la estructura correcta
      const ordersWithCompleteData = data?.map(order => ({
        ...order,
        // Asegurar que user existe y tiene la estructura correcta
        user: Array.isArray(order.user) && order.user.length > 0 
          ? order.user[0] 
          : order.user || undefined,
        items: order.items || []
      })) || [];

      return { 
        data: ordersWithCompleteData as OrderWithDetails[], 
        error: null, 
        count: ordersWithCompleteData.length 
      };
    },
    {
      enabled: !!user && (user.role === 'superadmin' || (user.role === 'admin' && !!selectedBrand)),
      staleTime: 1000 * 60 * 5, // 5 minutos
    }
  );

  const orders = (ordersResponse?.data || []) as OrderWithDetails[];

  // Función para actualizar el estado de un pedido
  const updateOrderStatus = async (orderId: string, newStatus: OrderStatus) => {
    try {
      const { error } = await supabase
        .from('orders')
        .update({ 
          status: newStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', orderId);

      if (error) throw error;

      toast({
        title: "Estado actualizado",
        description: `El pedido ha sido marcado como ${getStatusLabel(newStatus)}.`,
      });

      refetch();
    } catch (error: any) {
      console.error('Error updating order status:', error);
      toast({
        title: "Error",
        description: error.message || "No se pudo actualizar el estado del pedido",
        variant: "destructive",
      });
    }
  };

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
      const customerName = order.user?.name || "Cliente";
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
      const fileName = `Pedido_${order.id.slice(0, 8)}_${orderDate.replace(/\//g, '-')}.pdf`;
      doc.save(fileName);

      toast({
        title: "PDF generado",
        description: "Se ha descargado el pedido en formato PDF.",
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

  // Función para generar Excel de pedidos
  const generateExcel = () => {
    try {
      const exportData = orders.map(order => ({
        'ID Pedido': order.id,
        'Fecha': new Date(order.created_at).toLocaleDateString("es-AR"),
        'Cliente': order.user?.name || '',
        'Email': order.user?.email || '',
        'Marca': order.brand_name,
        'Estado': getStatusLabel(order.status as OrderStatus),
        'Total Artículos': order.total_items,
        'Total Monto': order.total_amount,
        'Notas': order.notes || ''
      }));

      const ws = XLSX.utils.json_to_sheet(exportData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Pedidos");

      // Ajustar ancho de columnas
      const colWidths = [
        {wch: 25}, // ID Pedido
        {wch: 12}, // Fecha
        {wch: 20}, // Cliente
        {wch: 25}, // Email
        {wch: 15}, // Marca
        {wch: 12}, // Estado
        {wch: 15}, // Total Artículos
        {wch: 15}, // Total Monto
        {wch: 30}, // Notas
      ];
      ws['!cols'] = colWidths;

      const fileName = `Pedidos_${selectedBrand?.name || 'Todos'}_${new Date().toLocaleDateString('es-AR').replace(/\//g, '-')}.xlsx`;
      XLSX.writeFile(wb, fileName);

      toast({
        title: "Excel generado",
        description: "Se ha descargado el reporte de pedidos en formato Excel.",
      });
    } catch (error) {
      console.error('Error generating Excel:', error);
      toast({
        title: "Error",
        description: "No se pudo generar el archivo Excel",
        variant: "destructive",
      });
    }
  };

  // Función para ver detalles del pedido
  const viewOrderDetails = (order: OrderWithDetails) => {
    setSelectedOrder(order);
    setIsDetailDialogOpen(true);
  };

  // Si no hay marca seleccionada y es admin, mostrar mensaje
  if (user?.role === 'admin' && !selectedBrand) {
    return (
      <div className="container mx-auto py-6">
        <div className="text-center py-12">
          <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium">Selecciona una marca</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Para ver los pedidos, primero selecciona una marca desde el menú.
          </p>
        </div>
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>Gestión de Pedidos - Showroom</title>
      </Helmet>
      <div className="container mx-auto py-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold">Gestión de Pedidos</h1>
            <p className="text-muted-foreground">
              {user?.role === 'superadmin' 
                ? 'Administra todos los pedidos' 
                : `Pedidos de ${selectedBrand?.name}`}
            </p>
          </div>
          
          <div className="flex gap-2">
            <Button 
              onClick={generateExcel}
              variant="outline" 
              className="gap-2"
              disabled={orders.length === 0}
            >
              <Download className="h-4 w-4" />
              Exportar Excel
            </Button>
          </div>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="Buscar por cliente o ID de pedido..."
                  className="pl-8"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              
              <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as OrderStatus | 'all')}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Filtrar por estado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los estados</SelectItem>
                  <SelectItem value="pending">Pendiente</SelectItem>
                  <SelectItem value="confirmed">Confirmado</SelectItem>
                  <SelectItem value="processing">Procesando</SelectItem>
                  <SelectItem value="completed">Completado</SelectItem>
                  <SelectItem value="cancelled">Cancelado</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Orders Table */}
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
            <p>Cargando pedidos...</p>
          </div>
        ) : isError ? (
          <Card>
            <CardContent className="flex items-center gap-2 p-6">
              <Package className="h-5 w-5 text-destructive" />
              <p>Hubo un error al cargar los pedidos. Por favor intenta nuevamente.</p>
              <Button variant="outline" size="sm" onClick={() => refetch()}>Reintentar</Button>
            </CardContent>
          </Card>
        ) : orders.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center gap-4 p-6">
              <ShoppingBag className="h-12 w-12 text-muted-foreground" />
              <div className="text-center">
                <h3 className="text-lg font-medium">No se encontraron pedidos</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  {debouncedSearchTerm || statusFilter !== 'all' 
                    ? 'Intenta ajustar los filtros de búsqueda.' 
                    : 'Aún no hay pedidos registrados.'}
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
                  <TableHead>Cliente</TableHead>
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
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-medium">{order.user?.name}</span>
                        <span className="text-sm text-muted-foreground">{order.user?.email}</span>
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
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreVertical className="h-4 w-4" />
                            <span className="sr-only">Acciones</span>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => viewOrderDetails(order)}>
                            <Eye className="mr-2 h-4 w-4" />
                            Ver detalles
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => generateOrderPDF(order)}>
                            <FileText className="mr-2 h-4 w-4" />
                            Descargar PDF
                          </DropdownMenuItem>
                          
                          <DropdownMenuSeparator />
                          
                          {order.status !== 'confirmed' && (
                            <DropdownMenuItem onClick={() => updateOrderStatus(order.id, 'confirmed')}>
                              Marcar como Confirmado
                            </DropdownMenuItem>
                          )}
                          {order.status !== 'processing' && (
                            <DropdownMenuItem onClick={() => updateOrderStatus(order.id, 'processing')}>
                              Marcar como Procesando
                            </DropdownMenuItem>
                          )}
                          {order.status !== 'completed' && (
                            <DropdownMenuItem onClick={() => updateOrderStatus(order.id, 'completed')}>
                              Marcar como Completado
                            </DropdownMenuItem>
                          )}
                          {order.status !== 'cancelled' && (
                            <DropdownMenuItem 
                              onClick={() => updateOrderStatus(order.id, 'cancelled')}
                              className="text-destructive"
                            >
                              Cancelar pedido
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
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
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Cliente</label>
                    <p className="font-medium">{selectedOrder.user?.name}</p>
                    <p className="text-sm text-muted-foreground">{selectedOrder.user?.email}</p>
                  </div>
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
                  <Button onClick={() => setIsDetailDialogOpen(false)}>
                    Cerrar
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </>
  );
};

export default OrdersPage; 