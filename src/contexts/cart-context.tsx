import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Product } from '@/types'; // Asegúrate de que la ruta a Product sea correcta
import { useToast } from '@/hooks/use-toast';

// Define la estructura de un ítem en el carrito
export interface CartItem {
  id: string;
  name: string;
  price: number;
  sku?: string;
  image?: string;
  // Cantidades por talla
  quantities: Record<string, number>; // { tallaId: cantidad }
  sizes: { id: string; name: string; quantity: number }[]; // Detalle de tallas
  curveType?: string; // 'simple' por defecto
}

// Define el estado y las acciones del contexto del carrito
interface CartContextType {
  cartItems: CartItem[];
  addToCart: (product: Product, curveType?: 'simple' | 'reinforced') => void;
  removeFromCart: (productId: string | number) => void;
  updateQuantity: (productId: string | number, sizeId: string, quantity: number) => void;
  clearCart: () => void;
  itemCount: number;
  totalAmount: number;
}

// Crea el contexto del carrito con un valor inicial undefined
const CartContext = createContext<CartContextType | undefined>(undefined);

// Props para el proveedor del contexto del carrito
interface CartProviderProps {
  children: ReactNode;
}

// Proveedor del contexto del carrito
export const CartProvider: React.FC<CartProviderProps> = ({ children }) => {
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const { toast } = useToast();

  // Cargar el carrito desde localStorage al iniciar
  useEffect(() => {
    const storedCart = localStorage.getItem('cart');
    if (storedCart) {
      try {
        const parsedCart: CartItem[] = JSON.parse(storedCart);
        setCartItems(parsedCart);
      } catch (error) {
        console.error('Error al parsear el carrito desde localStorage:', error);
        localStorage.removeItem('cart'); // Limpiar carrito corrupto
      }
    }
  }, []);

  // Guardar el carrito en localStorage cada vez que cambie
  useEffect(() => {
    localStorage.setItem('cart', JSON.stringify(cartItems));
  }, [cartItems]);

  // Función para añadir un producto al carrito con tipo de curva seleccionado
  const addToCart = (product: Product, curveType: 'simple' | 'reinforced' = 'simple') => {
    // Usar product.variants para construir la curva seleccionada
    if (!product.variants || !Array.isArray(product.variants) || product.variants.length === 0) {
      toast({
        title: 'Error',
        description: 'El producto no tiene variantes/tallas definidas.',
        variant: 'destructive',
      });
      return;
    }
    
    // Construir quantities y sizes a partir del tipo de curva seleccionado
    const quantities: Record<string, number> = {};
    const sizes: { id: string; name: string; quantity: number }[] = [];
    
    product.variants.forEach(variant => {
      const curveQuantity = curveType === 'simple' ? variant.simple_curve : variant.reinforced_curve;
      if (curveQuantity > 0) {
        quantities[variant.size] = curveQuantity;
        sizes.push({ id: variant.size, name: variant.size, quantity: curveQuantity });
      }
    });
    
    if (sizes.length === 0) {
      toast({
        title: 'Error',
        description: `El producto no tiene curva ${curveType === 'simple' ? 'simple' : 'reforzada'} definida.`,
        variant: 'destructive',
      });
      return;
    }
    setCartItems(prevItems => {
      // Crear un ID único que combine product.id y curveType
      const uniqueId = `${product.id}_${curveType}`;
      const existing = prevItems.find(item => item.id === uniqueId);
      if (existing) {
        // Sumar cantidades por talla
        const newQuantities = { ...existing.quantities };
        sizes.forEach(size => {
          newQuantities[size.id] = (newQuantities[size.id] || 0) + size.quantity;
        });
        const newSizes = Object.entries(newQuantities).map(([id, quantity]) => {
          return { id, name: id, quantity };
        });
        toast({
          title: 'Producto actualizado',
          description: `${product.name} (${curveType === 'simple' ? 'Curva Simple' : 'Curva Reforzada'}) cantidades actualizadas en el pedido.`,
        });
        return prevItems.map(item =>
          item.id === uniqueId
            ? { ...item, quantities: newQuantities, sizes: newSizes, curveType }
            : item
        );
      } else {
        toast({
          title: 'Producto añadido',
          description: `${product.name} (${curveType === 'simple' ? 'Curva Simple' : 'Curva Reforzada'}) añadido al pedido.`,
        });
        return [
          ...prevItems,
          {
            id: uniqueId,
            name: product.name,
            price: product.price,
            sku: product.sku,
            image: product.images && product.images[0],
            quantities,
            sizes,
            curveType,
          },
        ];
      }
    });
  };

  // Función para eliminar un producto del carrito
  const removeFromCart = (productId: string | number) => {
    setCartItems(prevItems => {
      const itemToRemove = prevItems.find(item => item.id === productId);
      if (itemToRemove) {
        toast({
          title: 'Producto eliminado',
          description: `${itemToRemove.name} eliminado del pedido.`,
          variant: 'destructive',
        });
      }
      return prevItems.filter(item => item.id !== productId);
    });
  };

  // Función para actualizar la cantidad de una talla específica de un producto
  const updateQuantity = (productId: string | number, sizeId: string, quantity: number) => {
    setCartItems(prevItems =>
      prevItems
        .map(item => {
          if (item.id === productId) {
            const newQuantities = { ...item.quantities, [sizeId]: Math.max(0, quantity) };
            const newSizes = item.sizes.map(s =>
              s.id === sizeId ? { ...s, quantity: Math.max(0, quantity) } : s
            );
            return { ...item, quantities: newQuantities, sizes: newSizes };
          }
          return item;
        })
        .filter(item => Object.values(item.quantities).some(q => q > 0)) // Eliminar si todas las tallas son 0
    );
  };

  // Función para vaciar el carrito
  const clearCart = () => {
    setCartItems([]);
    toast({
      title: 'Pedido vaciado',
      description: 'Todos los productos han sido eliminados del pedido.',
    });
  };

  // Calcula la cantidad total de ítems en el carrito
  const itemCount = cartItems.reduce((total, item) => total + Object.values(item.quantities).reduce((a, b) => a + b, 0), 0);

  // Calcula el monto total del carrito
  const totalAmount = cartItems.reduce((total, item) => total + (item.price || 0) * Object.values(item.quantities).reduce((a, b) => a + b, 0), 0);

  return (
    <CartContext.Provider value={{ cartItems, addToCart, removeFromCart, updateQuantity, clearCart, itemCount, totalAmount }}>
      {children}
    </CartContext.Provider>
  );
};

// Hook personalizado para usar el contexto del carrito
export const useCart = () => {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error('useCart debe ser usado dentro de un CartProvider');
  }
  return context;
};