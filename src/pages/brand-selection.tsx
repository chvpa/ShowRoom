import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from 'lucide-react';
import { useBrand } from '@/contexts/brand-context';

const BrandSelectionPage = () => {
  const [selectedBrandId, setSelectedBrandId] = useState<string>("");
  const { toast } = useToast();
  const navigate = useNavigate();
  const { userBrands, isLoading, selectBrand } = useBrand();

  // Auto-redirect if user only has access to one brand
  useEffect(() => {
    if (!isLoading && userBrands.length === 1) {
      handleBrandSelect(userBrands[0].id);
      handleContinue(userBrands[0].id);
    }
  }, [userBrands, isLoading]);

  const handleBrandSelect = (brandId: string) => {
    setSelectedBrandId(brandId);
  };

  const handleContinue = (brandId?: string) => {
    const brandToUse = brandId || selectedBrandId;
    
    if (!brandToUse) {
      toast({
        title: "Selección requerida",
        description: "Por favor selecciona una marca para continuar",
        variant: "destructive",
      });
      return;
    }
    
    // Find the brand object from the list
    const brand = userBrands.find(b => b.id === brandToUse);
    
    if (brand) {
      // Use the context to set the selected brand
      selectBrand(brand);
      
      // Redirect to the catalog with the new URL format
      navigate(`/${brand.name.toLowerCase()}/catalogo`);
    } else {
      toast({
        title: "Marca no encontrada",
        description: "La marca seleccionada no pudo ser encontrada",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="container flex flex-col items-center justify-center min-h-[calc(100vh-4rem)] py-10">
      <div className="w-full max-w-md space-y-8">
        <h1 className="text-3xl font-bold text-center">Selecciona una Marca</h1>
        
        {isLoading ? (
          <div className="flex flex-col items-center justify-center gap-2">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p>Cargando marcas disponibles...</p>
          </div>
        ) : userBrands.length === 0 ? (
          <Card className="text-center p-6">
            <p className="text-lg text-muted-foreground">No tienes acceso a ninguna marca.</p>
            <p className="mt-2">Contacta a tu administrador para solicitar acceso.</p>
          </Card>
        ) : userBrands.length === 1 ? (
          <Card className="text-center p-6">
            <p className="text-lg">Redirigiendo a la única marca disponible...</p>
            <div className="flex justify-center mt-4">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          </Card>
        ) : (
          <Card className="overflow-hidden shadow-sm">
            <CardContent className="pt-6 space-y-6">
              <Select 
                value={selectedBrandId} 
                onValueChange={handleBrandSelect}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Selecciona una marca" />
                </SelectTrigger>
                <SelectContent>
                  {userBrands.map((brand) => (
                    <SelectItem key={brand.id} value={brand.id} className="py-3">
                      <div className="flex items-center space-x-3">
                        <div className="h-6 w-6 flex-shrink-0">
                          <img 
                            src={brand.logo || '/placeholder.svg'} 
                            alt={`Logo de ${brand.name}`} 
                            className="h-full w-full object-contain"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = '/placeholder.svg';
                            }}
                          />
                        </div>
                        <span>{brand.name}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              <Button 
                className="w-full" 
                onClick={() => handleContinue()}
                disabled={!selectedBrandId}
              >
                Continuar al Catálogo
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default BrandSelectionPage;
