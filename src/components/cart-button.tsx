import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { ShoppingCart } from 'lucide-react';
import { Badge } from "@/components/ui/badge";

const CartButton = () => {
  const [itemCount, setItemCount] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    // Cargar el carrito al montar el componente
    loadCartItems();

    // Agregar un event listener para detectar cambios en localStorage
    window.addEventListener('storage', handleStorageChange);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  const loadCartItems = () => {
    try {
      const storedCart = localStorage.getItem('cart');
      if (storedCart) {
        const parsedCart = JSON.parse(storedCart);
        const totalItems = parsedCart.reduce((total: number, item: any) => total + (item.totalQuantity || 0), 0);
        setItemCount(totalItems);
      } else {
        setItemCount(0);
      }
    } catch (error) {
      console.error('Error loading cart:', error);
      setItemCount(0);
    }
  };

  const handleStorageChange = (e: StorageEvent) => {
    if (e.key === 'cart') {
      loadCartItems();
    }
  };

  const handleClick = () => {
    navigate('/cart');
  };

  return (
    <Button 
      variant="outline" 
      size="icon" 
      className="relative"
      onClick={handleClick}
      aria-label="Ver carrito"
    >
      <ShoppingCart className="h-5 w-5" />
      {itemCount > 0 && (
        <Badge 
          className="absolute -top-2 -right-2 h-5 w-5 flex items-center justify-center p-0 text-xs"
          variant="destructive"
        >
          {itemCount > 99 ? '99+' : itemCount}
        </Badge>
      )}
    </Button>
  );
};

export default CartButton;
