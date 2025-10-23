import React from 'react'; // useEffect y useState ya no son necesarios aquí para itemCount
import { useNavigate } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { ShoppingCart } from 'lucide-react';
import { Badge } from "@/components/ui/badge";
import { useCart } from '@/hooks/use-cart'; // Importar el hook del carrito

const CartButton = () => {
  const navigate = useNavigate();
  const { itemCount } = useCart(); // Obtener itemCount del contexto del carrito

  // La lógica de useEffect, loadCartItems y handleStorageChange se elimina
  // ya que el estado del carrito ahora es global y se maneja en CartContext.
  // CartContext ya se encarga de la persistencia en localStorage.

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
