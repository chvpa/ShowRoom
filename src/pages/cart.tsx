import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import {
  Trash2,
  ShoppingCart,
  FileText,
  Plus,
  Minus,
  Download,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";
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
import { useBrand } from "@/contexts/brand-context";
import { useAuth } from "@/contexts/auth-context";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

interface CartItem {
  productId: string;
  productName: string;
  productSku: string;
  productImage?: string;
  price: number;
  curveType: "simple" | "reinforced" | "custom";
  quantities: Record<string, number>;
  totalQuantity: number;
  totalPrice: number;
  sizes?: { id: string; name: string; quantity: number }[];
}

const CartPage = () => {
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEmptyingCart, setIsEmptyingCart] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();
  const { selectedBrand } = useBrand();
  const { user } = useAuth();
  const { marcaSlug } = useParams<{ marcaSlug?: string }>();

  useEffect(() => {
    loadCartItems();
  }, []);

  const loadCartItems = () => {
    try {
      setLoading(true);
      const storedCart = localStorage.getItem("cart");
      if (storedCart) {
        const parsedCart = JSON.parse(storedCart);

        // Transformar los datos para mostrar las tallas de manera más amigable
        const processedCart = parsedCart.map((item: CartItem) => {
          const sizes = Object.entries(item.quantities)
            .map(([sizeId, quantity]) => ({
              id: sizeId,
              name: getSizeName(sizeId), // Función auxiliar para obtener el nombre de la talla
              quantity,
            }))
            .filter((size) => size.quantity > 0);

          return {
            ...item,
            sizes,
          };
        });

        setCartItems(processedCart);
      } else {
        setCartItems([]);
      }
    } catch (error) {
      console.error("Error loading cart:", error);
      toast({
        title: "Error",
        description: "No se pudo cargar el carrito.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Función auxiliar para obtener el nombre de la talla
  const getSizeName = (sizeId: string): string => {
    // En una implementación real, esto podría venir de una base de datos
    // Para este ejemplo, usamos un mapeo simple
    const sizeMap: Record<string, string> = {
      "1": "S",
      "2": "M",
      "3": "L",
      "4": "XL",
      "5": "XXL",
    };

    return sizeMap[sizeId] || `Talla ${sizeId}`;
  };

  const updateCartItemQuantity = (
    itemIndex: number,
    sizeId: string,
    newQuantity: number
  ) => {
    if (newQuantity < 0) return;

    const updatedCart = [...cartItems];
    const item = { ...updatedCart[itemIndex] };

    // Actualizar la cantidad para esta talla específica
    const oldQuantity = item.quantities[sizeId] || 0;
    item.quantities[sizeId] = newQuantity;

    // Actualizar la cantidad total y el precio total
    item.totalQuantity = item.totalQuantity - oldQuantity + newQuantity;
    item.totalPrice = item.price * item.totalQuantity;

    // Actualizar las tallas para la visualización
    if (item.sizes) {
      const sizeIndex = item.sizes.findIndex((s) => s.id === sizeId);
      if (sizeIndex >= 0) {
        item.sizes[sizeIndex].quantity = newQuantity;
      } else if (newQuantity > 0) {
        item.sizes.push({
          id: sizeId,
          name: getSizeName(sizeId),
          quantity: newQuantity,
        });
      }
    }

    updatedCart[itemIndex] = item;

    // Si la cantidad total es 0, eliminar el item
    if (item.totalQuantity === 0) {
      updatedCart.splice(itemIndex, 1);
    }

    setCartItems(updatedCart);
    localStorage.setItem("cart", JSON.stringify(updatedCart));
  };

  const removeCartItem = (index: number) => {
    const updatedCart = [...cartItems];
    updatedCart.splice(index, 1);
    setCartItems(updatedCart);
    localStorage.setItem("cart", JSON.stringify(updatedCart));

    toast({
      title: "Producto eliminado",
      description: "El producto ha sido eliminado del carrito.",
    });
  };

  const emptyCart = () => {
    setCartItems([]);
    localStorage.removeItem("cart");
    setIsEmptyingCart(false);

    toast({
      title: "Carrito vacío",
      description: "Se han eliminado todos los productos del carrito.",
    });
  };

  const proceedToCheckout = () => {
    // Aquí implementaríamos la lógica para proceder al checkout
    // Por ahora, solo mostraremos un mensaje
    toast({
      title: "Procesando pedido",
      description: "Redirigiendo al proceso de checkout...",
    });

    // En una implementación real, redirigir a la página de checkout
    // navigate('/checkout');
  };

  const getTotalItems = () => {
    return cartItems.reduce((total, item) => total + item.totalQuantity, 0);
  };

  const getTotalPrice = () => {
    return cartItems.reduce((total, item) => total + item.totalPrice, 0);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("es-AR", {
      style: "currency",
      currency: "ARS",
    }).format(amount);
  };

  const navigateToCatalog = () => {
    // Usar la ruta con marca en la URL
    if (marcaSlug) {
      navigate(`/${marcaSlug}/catalogo`);
    } else if (selectedBrand) {
      navigate(`/${selectedBrand.name.toLowerCase()}/catalogo`);
    } else {
      navigate("/catalog");
    }
  };

  const generateOrderPDF = () => {
    try {
      const doc = new jsPDF();
      
      // Configuración minimalista
      doc.setTextColor(0, 0, 0);
      doc.setDrawColor(220, 220, 220);
      
      // Logo en esquina superior derecha con dimensiones originales
      if (selectedBrand?.logo) {
        try {
          // Crear un objeto Image para obtener dimensiones originales
          const img = new Image();
          img.src = selectedBrand.logo;
          
          // Función para añadir la imagen una vez cargada
          img.onload = function() {
            // Calcular proporciones manteniendo tamaño pequeño pero respetando ratio
            const maxWidth = 16;
            const ratio = img.width / img.height;
            const width = Math.min(maxWidth, img.width);
            const height = width / ratio;
            
            // Posicionar en esquina superior derecha
            doc.addImage(selectedBrand.logo, 'PNG', 190 - width, 15, width, height, undefined, 'FAST');
            
            // Continuar con el resto del PDF
            finalizePDF();
          };
          
          // Si la imagen no carga en 500ms, continuar sin ella
          setTimeout(() => {
            if (!img.complete) {
              console.log("La imagen está tardando, continuando sin ella");
              finalizePDF();
            }
          }, 500);
          
          // Función para finalizar el PDF
          const finalizePDF = () => {
            // Información básica - solo lo necesario
            const today = new Date();
            const formattedDate = today.toLocaleDateString("es-AR");
            
            // Datos del cliente y marca
            doc.setFontSize(10);
            doc.setFont('helvetica', 'normal');
            const brandName = selectedBrand ? selectedBrand.name : "Marca";
            const clientName = user?.name || "Cliente";
            
            doc.text(`Fecha: ${formattedDate}`, 20, 20);
            doc.text(`Cliente: ${clientName}`, 20, 27);
            doc.text(`Marca: ${brandName}`, 20, 34);
            
            // Línea separadora minimalista
            doc.setLineWidth(0.1);
            doc.line(20, 40, 190, 40);

            // Items table - sin colores
            const tableColumn = [
              "Producto",
              "SKU",
              "Talla",
              "Cantidad",
              "Precio",
              "Subtotal",
            ];
            
            let tableRows = [];

            // Process items for the table - solo datos necesarios
            cartItems.forEach((item) => {
              item.sizes?.forEach((size) => {
                if (size.quantity > 0) {
                  tableRows.push([
                    item.productName,
                    item.productSku,
                    size.name,
                    size.quantity,
                    formatCurrency(item.price),
                    formatCurrency(item.price * size.quantity),
                  ]);
                }
              });
            });

            // Configuración de tabla minimalista
            autoTable(doc, {
              head: [tableColumn],
              body: tableRows,
              startY: 45,
              theme: 'plain',
              headStyles: {
                fontStyle: 'bold',
                fillColor: false,
                textColor: 0,
                halign: 'left',
              },
              styles: {
                lineColor: [240, 240, 240],
                lineWidth: 0.1,
              },
              margin: { top: 45 },
            });

            // Total simple
            const finalY = (doc as any).lastAutoTable.finalY || 120;
            doc.setLineWidth(0.1);
            doc.line(120, finalY + 5, 190, finalY + 5);
            
            // Totales minimalistas
            doc.setFont('helvetica', 'bold');
            doc.text(`Total Cantidad: ${getTotalItems()} unidades`, 120, finalY + 12);
            doc.text(`Total: ${formatCurrency(getTotalPrice())}`, 120, finalY + 19);

            // Nombre de archivo simple
            const fileName = `Pedido_${brandName}_${formattedDate.replace(/\//g, '-')}.pdf`;
            doc.save(fileName);

            toast({
              title: "PDF generado",
              description: "Se ha descargado el resumen de tu pedido en formato PDF.",
            });
          };
          
          // En caso de que la imagen ya esté cargada
          if (img.complete) {
            img.onload(null as any);
          }
          
        } catch (error) {
          console.error('Error adding logo:', error);
          
          // Continuar con el resto del PDF si hay error con el logo
          const today = new Date();
          const formattedDate = today.toLocaleDateString("es-AR");
          const brandName = selectedBrand ? selectedBrand.name : "Marca";
          const clientName = user?.name || "Cliente";
          
          // Información básica
          doc.setFontSize(10);
          doc.setFont('helvetica', 'normal');
          doc.text(`Fecha: ${formattedDate}`, 20, 20);
          doc.text(`Cliente: ${clientName}`, 20, 27);
          doc.text(`Marca: ${brandName}`, 20, 34);
          
          // Resto del PDF...
          // [Código similar al del bloque finalizePDF]
        }
      } else {
        // Si no hay logo, generar el PDF directamente
        const today = new Date();
        const formattedDate = today.toLocaleDateString("es-AR");
        const brandName = selectedBrand ? selectedBrand.name : "Marca";
        const clientName = user?.name || "Cliente";
        
        // Información básica
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.text(`Fecha: ${formattedDate}`, 20, 20);
        doc.text(`Cliente: ${clientName}`, 20, 27);
        doc.text(`Marca: ${brandName}`, 20, 34);
        
        // Línea separadora minimalista
        doc.setLineWidth(0.1);
        doc.line(20, 40, 190, 40);

        // Items table - sin colores
        const tableColumn = [
          "Producto",
          "SKU",
          "Talla",
          "Cantidad",
          "Precio",
          "Subtotal",
        ];
        
        let tableRows = [];

        // Process items for the table - solo datos necesarios
        cartItems.forEach((item) => {
          item.sizes?.forEach((size) => {
            if (size.quantity > 0) {
              tableRows.push([
                item.productName,
                item.productSku,
                size.name,
                size.quantity,
                formatCurrency(item.price),
                formatCurrency(item.price * size.quantity),
              ]);
            }
          });
        });

        // Configuración de tabla minimalista
        autoTable(doc, {
          head: [tableColumn],
          body: tableRows,
          startY: 45,
          theme: 'plain',
          headStyles: {
            fontStyle: 'bold',
            fillColor: false,
            textColor: 0,
            halign: 'left',
          },
          styles: {
            lineColor: [240, 240, 240],
            lineWidth: 0.1,
          },
          margin: { top: 45 },
        });

        // Total simple
        const finalY = (doc as any).lastAutoTable.finalY || 120;
        doc.setLineWidth(0.1);
        doc.line(120, finalY + 5, 190, finalY + 5);
        
        // Totales minimalistas
        doc.setFont('helvetica', 'bold');
        doc.text(`Total Cantidad: ${getTotalItems()} unidades`, 120, finalY + 12);
        doc.text(`Total: ${formatCurrency(getTotalPrice())}`, 120, finalY + 19);

        // Nombre de archivo simple
        const fileName = `Pedido_${brandName}_${formattedDate.replace(/\//g, '-')}.pdf`;
        doc.save(fileName);

        toast({
          title: "PDF generado",
          description: "Se ha descargado el resumen de tu pedido en formato PDF.",
        });
      }
    } catch (error) {
      console.error("Error generating PDF:", error);
      toast({
        title: "Error",
        description: "No se pudo generar el PDF del pedido.",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto py-10 text-center">
        <p>Cargando carrito...</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 px-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Mi Carrito</h1>
        {cartItems.length > 0 && (
          <AlertDialog open={isEmptyingCart} onOpenChange={setIsEmptyingCart}>
            <AlertDialogTrigger asChild>
              <Button variant="outline" className="text-destructive">
                <Trash2 className="mr-2 h-4 w-4" />
                Vaciar carrito
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
                <AlertDialogDescription>
                  Esta acción eliminará todos los productos de tu carrito. Esta
                  acción no se puede deshacer.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction
                  onClick={emptyCart}
                  className="bg-destructive text-destructive-foreground"
                >
                  Vaciar carrito
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </div>

      {cartItems.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center">
            <ShoppingCart className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h2 className="text-xl font-semibold mb-2">
              Tu carrito está vacío
            </h2>
            <p className="text-muted-foreground mb-6">
              Añade productos al carrito para comenzar tu pedido.
            </p>
            <Button onClick={navigateToCatalog}>Explorar catálogo</Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle>Productos ({getTotalItems()})</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[80px]">Producto</TableHead>
                        <TableHead>Descripción</TableHead>
                        <TableHead>Tallas y Cantidades</TableHead>
                        <TableHead className="text-right">Precio</TableHead>
                        <TableHead className="text-right">Subtotal</TableHead>
                        <TableHead className="w-[70px]"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {cartItems.map((item, index) => (
                        <TableRow key={`${item.productId}-${index}`}>
                          <TableCell>
                            {item.productImage ? (
                              <img
                                src={item.productImage}
                                alt={item.productName}
                                className="h-16 w-16 object-cover rounded-md"
                                onError={(e) => {
                                  (e.target as HTMLImageElement).src =
                                    "/placeholder.svg";
                                }}
                              />
                            ) : (
                              <div className="h-16 w-16 bg-muted rounded-md flex items-center justify-center">
                                <span className="text-muted-foreground text-xs">
                                  Sin imagen
                                </span>
                              </div>
                            )}
                          </TableCell>
                          <TableCell>
                            <div>
                              <p className="font-medium">{item.productName}</p>
                              <p className="text-sm text-muted-foreground">
                                {item.productSku}
                              </p>
                              <p className="text-sm mt-1">
                                Curva:{" "}
                                {item.curveType === "simple"
                                  ? "Simple"
                                  : item.curveType === "reinforced"
                                  ? "Reforzada"
                                  : "Personalizada"}
                              </p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="space-y-2">
                              {item.sizes?.map((size) => (
                                <div
                                  key={size.id}
                                  className="flex items-center gap-2"
                                >
                                  <span className="text-sm font-medium min-w-[30px]">
                                    {size.name}:
                                  </span>
                                  <div className="flex items-center">
                                    <Button
                                      type="button"
                                      variant="outline"
                                      size="icon"
                                      className="h-7 w-7"
                                      onClick={() =>
                                        updateCartItemQuantity(
                                          index,
                                          size.id,
                                          size.quantity - 1
                                        )
                                      }
                                    >
                                      <Minus className="h-3 w-3" />
                                    </Button>
                                    <Input
                                      type="number"
                                      min="0"
                                      value={size.quantity}
                                      onChange={(e) =>
                                        updateCartItemQuantity(
                                          index,
                                          size.id,
                                          parseInt(e.target.value) || 0
                                        )
                                      }
                                      className="w-12 h-7 mx-1 text-center p-1"
                                    />
                                    <Button
                                      type="button"
                                      variant="outline"
                                      size="icon"
                                      className="h-7 w-7"
                                      onClick={() =>
                                        updateCartItemQuantity(
                                          index,
                                          size.id,
                                          size.quantity + 1
                                        )
                                      }
                                    >
                                      <Plus className="h-3 w-3" />
                                    </Button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            {formatCurrency(item.price)}
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            {formatCurrency(item.totalPrice)}
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => removeCartItem(index)}
                              className="text-destructive"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </div>

          <div>
            <Card>
              <CardHeader>
                <CardTitle>Resumen del Pedido</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between">
                    <span>Subtotal</span>
                    <span>{formatCurrency(getTotalPrice())}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Cantidad</span>
                    <span>{getTotalItems()} unidades</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between font-bold">
                    <span>Total</span>
                    <span>{formatCurrency(getTotalPrice())}</span>
                  </div>
                </div>
              </CardContent>
              <CardFooter className="flex flex-col space-y-2">
                <Button 
                  className="w-full"
                  onClick={generateOrderPDF}
                >
                  <Download className="mr-2 h-4 w-4" />
                  Finalizar Pedido
                </Button>
              </CardFooter>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
};

export default CartPage;
