import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import {
  ArrowLeft,
  Download,
  FileText,
  Loader2,
  Edit,
  Save,
  X,
  Plus,
  Minus,
  Trash2,
  FileSpreadsheet,
  ShoppingBag
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from '@/contexts/auth-context';
import { OrderWithDetails, OrderStatus, OrderItem, Product } from '@/types';
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from 'xlsx';
import { Helmet } from "react-helmet-async";

const OrderDetailPage = () => {
  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();

  const [order, setOrder] = useState<OrderWithDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editedItems, setEditedItems] = useState<OrderItem[]>([]);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [showAddProductDialog, setShowAddProductDialog] = useState(false);

  // Cargar el pedido
  useEffect(() => {
    if (orderId) {
      fetchOrder();
    }
  }, [orderId]);

  const fetchOrder = async () => {
    try {
      setLoading(true);

      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          user:users(id, name, email),
          items:order_items(*)
        `)
        .eq('id', orderId)
        .single();

      if (error) throw error;

      // Transformar datos
      const orderData = {
        ...data,
        user: Array.isArray(data.user) && data.user.length > 0
          ? data.user[0]
          : data.user || undefined,
        items: data.items || []
      } as OrderWithDetails;

      setOrder(orderData);
      setEditedItems(orderData.items || []);
    } catch (error: any) {
      console.error('Error fetching order:', error);
      toast({
        title: "Error",
        description: "No se pudo cargar el pedido",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Verificar permisos de edición
  const canEdit = () => {
    if (!order || !user) return false;

    // Cliente puede editar solo si es su pedido y está en pending
    if (user.role === 'cliente') {
      return order.user_id === user.id && order.status === 'pending';
    }

    // Admin y superadmin siempre pueden editar
    return user.role === 'admin' || user.role === 'superadmin';
  };

  // Verificar permisos de cancelación
  const canCancel = () => {
    if (!order || !user) return false;

    // Cliente puede cancelar solo si es su pedido y está en pending
    if (user.role === 'cliente') {
      return order.user_id === user.id && order.status === 'pending';
    }

    // Admin y superadmin siempre pueden cancelar
    return user.role === 'admin' || user.role === 'superadmin';
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

  // Actualizar cantidad de un item
  const updateItemQuantity = (itemId: string, newQuantity: number) => {
    if (newQuantity < 0) return;

    setEditedItems(prev =>
      prev.map(item => {
        if (item.id === itemId) {
          const updatedItem = {
            ...item,
            quantity: newQuantity,
            total_price: item.unit_price * newQuantity
          };
          return updatedItem;
        }
        return item;
      }).filter(item => item.quantity > 0) // Eliminar items con cantidad 0
    );
  };

  // Eliminar un item
  const removeItem = (itemId: string) => {
    setEditedItems(prev => prev.filter(item => item.id !== itemId));
  };

  // Calcular totales
  const calculateTotals = () => {
    const totalItems = editedItems.reduce((sum, item) => sum + item.quantity, 0);
    const totalAmount = editedItems.reduce((sum, item) => sum + item.total_price, 0);
    return { totalItems, totalAmount };
  };

  // Guardar cambios
  const saveChanges = async () => {
    if (!order) return;

    try {
      setIsSaving(true);

      const { totalItems, totalAmount } = calculateTotals();

      // Obtener items originales para comparar
      const originalItemIds = order.items?.map(i => i.id) || [];
      const editedItemIds = editedItems.map(i => i.id);

      // Items a eliminar (estaban en el original pero no en editedItems)
      const itemsToDelete = originalItemIds.filter(id => !editedItemIds.includes(id));

      // Eliminar items
      if (itemsToDelete.length > 0) {
        const { error: deleteError } = await supabase
          .from('order_items')
          .delete()
          .in('id', itemsToDelete);

        if (deleteError) throw deleteError;
      }

      // Actualizar o insertar items
      for (const item of editedItems) {
        if (originalItemIds.includes(item.id)) {
          // Actualizar item existente
          const { error: updateError } = await supabase
            .from('order_items')
            .update({
              quantity: item.quantity,
              total_price: item.total_price,
            })
            .eq('id', item.id);

          if (updateError) throw updateError;
        } else {
          // Insertar nuevo item
          const { error: insertError } = await supabase
            .from('order_items')
            .insert({
              order_id: order.id,
              product_id: item.product_id,
              product_sku: item.product_sku,
              product_name: item.product_name,
              product_brand: item.product_brand,
              size: item.size,
              quantity: item.quantity,
              unit_price: item.unit_price,
              total_price: item.total_price,
            });

          if (insertError) throw insertError;
        }
      }

      // Actualizar totales del pedido
      const { error: orderError } = await supabase
        .from('orders')
        .update({
          total_items: totalItems,
          total_amount: totalAmount,
          updated_at: new Date().toISOString(),
        })
        .eq('id', order.id);

      if (orderError) throw orderError;

      toast({
        title: "Cambios guardados",
        description: "El pedido ha sido actualizado correctamente",
      });

      setIsEditing(false);
      fetchOrder(); // Recargar el pedido

    } catch (error: any) {
      console.error('Error saving changes:', error);
      toast({
        title: "Error",
        description: error.message || "No se pudieron guardar los cambios",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Cancelar el pedido
  const cancelOrder = async () => {
    if (!order) return;

    try {
      const { error } = await supabase
        .from('orders')
        .update({
          status: 'cancelled',
          updated_at: new Date().toISOString()
        })
        .eq('id', order.id);

      if (error) throw error;

      toast({
        title: "Pedido cancelado",
        description: "El pedido ha sido cancelado exitosamente",
      });

      setShowCancelDialog(false);
      fetchOrder(); // Recargar el pedido

    } catch (error: any) {
      console.error('Error cancelling order:', error);
      toast({
        title: "Error",
        description: error.message || "No se pudo cancelar el pedido",
        variant: "destructive",
      });
    }
  };

  // Generar PDF del pedido
  const generateOrderPDF = () => {
    if (!order) return;

    try {
      const doc = new jsPDF();

      // Configuración
      doc.setTextColor(0, 0, 0);
      doc.setDrawColor(220, 220, 220);

      // Información del pedido
      const orderDate = new Date(order.created_at).toLocaleDateString("es-AR");
      const customerName = order.user?.name || order.customer_name || "Cliente";
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
        title: "PDF descargado",
        description: "Se ha descargado el pedido en formato PDF",
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

  // Generar Excel del pedido
  const generateOrderExcel = () => {
    if (!order) return;

    try {
      const excelData = order.items?.map((item, index) => ({
        'Item': index + 1,
        'Producto': item.product_name,
        'SKU': item.product_sku,
        'Marca': item.product_brand,
        'Talla': item.size,
        'Cantidad': item.quantity,
        'Precio Unitario': item.unit_price,
        'Subtotal': item.total_price,
      })) || [];

      const ws = XLSX.utils.json_to_sheet(excelData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Pedido");

      const orderDate = new Date(order.created_at).toLocaleDateString('es-AR').replace(/\//g, '-');
      const fileName = `Pedido_${order.id.slice(0, 8)}_${orderDate}.xlsx`;

      XLSX.writeFile(wb, fileName);

      toast({
        title: "Excel descargado",
        description: "Se ha descargado el pedido en formato Excel",
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

  if (loading) {
    return (
      <div className="container mx-auto py-10">
        <div className="flex flex-col items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
          <p>Cargando pedido...</p>
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="container mx-auto py-10">
        <Card>
          <CardContent className="flex flex-col items-center gap-4 p-6">
            <ShoppingBag className="h-12 w-12 text-muted-foreground" />
            <div className="text-center">
              <h3 className="text-lg font-medium">Pedido no encontrado</h3>
              <p className="text-sm text-muted-foreground mt-1">
                El pedido que buscas no existe o no tienes permiso para verlo
              </p>
            </div>
            <Button onClick={() => navigate('/my-orders')}>
              Volver a Mis Pedidos
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>Pedido #{order.id.slice(0, 8)} - Showroom</title>
      </Helmet>

      <div className="container mx-auto py-6 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(-1)}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-2xl lg:text-3xl font-bold">
              Pedido #{order.id.slice(0, 8)}
            </h1>
            <p className="text-muted-foreground">
              Creado el {new Date(order.created_at).toLocaleDateString("es-AR")}
            </p>
          </div>
          <Badge variant={getStatusBadgeVariant(order.status as OrderStatus)} className="text-base px-4 py-2">
            {getStatusLabel(order.status as OrderStatus)}
          </Badge>
        </div>

        {/* Order Info Card */}
        <Card>
          <CardHeader>
            <CardTitle>Información del Pedido</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground">Cliente</label>
                <p className="font-medium">{order.user?.name || order.customer_name}</p>
                <p className="text-sm text-muted-foreground">{order.user?.email || order.customer_email}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Marca</label>
                <p className="font-medium">{order.brand_name}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Total Artículos</label>
                <p className="font-medium">{isEditing ? calculateTotals().totalItems : order.total_items}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Total</label>
                <p className="font-medium text-primary">
                  {new Intl.NumberFormat('es-AR', {
                    style: 'currency',
                    currency: 'ARS'
                  }).format(isEditing ? calculateTotals().totalAmount : order.total_amount)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Order Items */}
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle>Productos del Pedido</CardTitle>
              {isEditing && (
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setIsEditing(false);
                      setEditedItems(order.items || []);
                    }}
                  >
                    <X className="h-4 w-4 mr-2" />
                    Cancelar
                  </Button>
                  <Button
                    size="sm"
                    onClick={saveChanges}
                    disabled={isSaving}
                  >
                    {isSaving ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Save className="h-4 w-4 mr-2" />
                    )}
                    Guardar
                  </Button>
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Producto</TableHead>
                  <TableHead>SKU</TableHead>
                  <TableHead>Talla</TableHead>
                  <TableHead className="text-right">Cantidad</TableHead>
                  <TableHead className="text-right">Precio</TableHead>
                  <TableHead className="text-right">Subtotal</TableHead>
                  {isEditing && <TableHead className="w-[50px]"></TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {(isEditing ? editedItems : order.items)?.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">{item.product_name}</TableCell>
                    <TableCell>{item.product_sku}</TableCell>
                    <TableCell>{item.size}</TableCell>
                    <TableCell className="text-right">
                      {isEditing ? (
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => updateItemQuantity(item.id, item.quantity - 1)}
                          >
                            <Minus className="h-3 w-3" />
                          </Button>
                          <Input
                            type="number"
                            min="0"
                            value={item.quantity}
                            onChange={(e) => updateItemQuantity(item.id, parseInt(e.target.value) || 0)}
                            className="w-16 h-7 text-center p-1"
                          />
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => updateItemQuantity(item.id, item.quantity + 1)}
                          >
                            <Plus className="h-3 w-3" />
                          </Button>
                        </div>
                      ) : (
                        item.quantity
                      )}
                    </TableCell>
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
                    {isEditing && (
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => removeItem(item.id)}
                          className="text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Actions */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-wrap gap-3">
              <Button
                variant="outline"
                onClick={generateOrderPDF}
              >
                <Download className="mr-2 h-4 w-4" />
                Descargar PDF
              </Button>
              <Button
                variant="outline"
                onClick={generateOrderExcel}
              >
                <FileSpreadsheet className="mr-2 h-4 w-4" />
                Descargar Excel
              </Button>

              {canEdit() && !isEditing && (
                <Button
                  onClick={() => setIsEditing(true)}
                >
                  <Edit className="mr-2 h-4 w-4" />
                  Editar Pedido
                </Button>
              )}

              {canCancel() && order.status !== 'cancelled' && !isEditing && (
                <Button
                  variant="destructive"
                  onClick={() => setShowCancelDialog(true)}
                >
                  Cancelar Pedido
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Cancel Confirmation Dialog */}
        <AlertDialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>¿Cancelar este pedido?</AlertDialogTitle>
              <AlertDialogDescription>
                Esta acción marcará el pedido como cancelado.
                {order.status === 'pending' && ' Podrás crear un nuevo pedido si lo deseas.'}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>No, mantener pedido</AlertDialogCancel>
              <AlertDialogAction
                onClick={cancelOrder}
                className="bg-destructive text-destructive-foreground"
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

export default OrderDetailPage;
