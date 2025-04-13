import React, { ReactNode } from 'react';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { User, LogOut, Settings, Building, Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import CartButton from './cart-button';
import { useAuth } from '@/contexts/auth-context';
import { useBrand } from '@/contexts/brand-context';
import { useNavigate } from 'react-router-dom';
import { Separator } from "@/components/ui/separator";

// Prop types para Header
interface HeaderProps {
  sidebarTrigger?: ReactNode;
}

const Header = ({ sidebarTrigger }: HeaderProps) => {
  const { user, logout } = useAuth();
  const { selectedBrand, userBrands, selectBrand } = useBrand();
  const navigate = useNavigate();

  // Función para obtener iniciales del nombre
  const getUserInitials = () => {
    if (!user?.name) return 'U';
    
    const nameParts = user.name.split(' ');
    
    if (nameParts.length === 1) {
      return nameParts[0].charAt(0).toUpperCase();
    }
    
    return (nameParts[0].charAt(0) + nameParts[nameParts.length - 1].charAt(0)).toUpperCase();
  };

  // Manejar cierre de sesión
  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  // Obtener etiqueta para el rol
  const getRoleLabel = () => {
    if (!user) return '';
    
    switch (user.role) {
      case 'superadmin':
        return 'Super Administrador';
      case 'admin':
        return 'Administrador';
      case 'cliente':
        return 'Cliente';
      default:
        return user.role;
    }
  };

  // Cambiar de marca seleccionada
  const handleBrandChange = (brandId: string) => {
    const brand = userBrands.find(b => b.id === brandId);
    if (brand) {
      selectBrand(brand);
      // Redirigir al catálogo con la nueva marca
      navigate(`/${brand.name.toLowerCase()}/catalogo`);
    }
  };

  return (
    <header className="h-16 border-b flex items-center justify-between px-4 md:px-6 bg-background">
      <div className="flex items-center">
        {sidebarTrigger || (
          <Button className="h-8 w-8 md:inline-flex">
            <Menu />
            <span className="sr-only">Toggle Sidebar</span>
          </Button>
        )}
        
        {/* Separador vertical */}
        {userBrands.length > 1 && (
          <Separator orientation="vertical" className="mx-2 h-6" />
        )}
        
        {/* Selector de marca con logos */}
        {userBrands.length > 1 && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="gap-2">
                {selectedBrand && (
                  <div className="flex items-center gap-2">
                    {selectedBrand.logo ? (
                      <img 
                        src={selectedBrand.logo} 
                        alt={selectedBrand.name}
                        className="h-8 w-8 object-contain rounded-sm"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = '/placeholder.svg';
                        }}
                      />
                    ) : (
                      <Building size={18} />
                    )}
                  </div>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-[200px]">
              <DropdownMenuLabel>Cambiar marca</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {userBrands.map(brand => (
                <DropdownMenuItem 
                  key={brand.id} 
                  onClick={() => handleBrandChange(brand.id)}
                  className={`cursor-pointer ${selectedBrand?.id === brand.id ? 'bg-muted' : ''}`}
                >
                  <div className="flex items-center gap-2">
                    {brand.logo ? (
                      <img 
                        src={brand.logo} 
                        alt={brand.name}
                        className="h-6 w-6 object-contain rounded-sm"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = '/placeholder.svg';
                        }}
                      />
                    ) : (
                      <Building size={18} />
                    )}
                    <span>{brand.name}</span>
                  </div>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
      <div className="flex items-center gap-4">
        {/* Solo mostrar el carrito para usuarios tipo cliente */}
        {user?.role === 'cliente' && <CartButton />}
        
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="relative h-8 w-8 rounded-full">
              <Avatar className="h-8 w-8">
                <AvatarImage src="/placeholder.svg" alt="Avatar" />
                <AvatarFallback>{getUserInitials()}</AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Mi cuenta</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem disabled>
              <User size={16} className="mr-2" />
              <div className="flex flex-col">
                <span className="font-medium">{user?.name}</span>
                <span className="text-xs text-muted-foreground">{user?.email}</span>
                <span className="text-xs text-muted-foreground">{getRoleLabel()}</span>
              </div>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout} className="cursor-pointer text-destructive">
              <LogOut size={16} className="mr-2" />
              <span>Cerrar sesión</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
};

export default Header;
