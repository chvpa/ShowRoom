import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Brand {
  id: string;
  name: string;
  logo: string;
}

const BrandSelectionPage = () => {
  const [brands, setBrands] = useState<Brand[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    fetchUserBrands();
  }, []);

  const fetchUserBrands = async () => {
    try {
      setLoading(true);
      
      // Aquí obtendrías las marcas a las que el usuario tiene acceso
      // Por ahora, usamos datos de ejemplo
      const { data, error } = await supabase
        .from('brands')
        .select('*')
        // En una implementación real, filtrarías por las marcas a las que el usuario tiene acceso
        // .eq('user_id', currentUserId)
      
      if (error) throw error;
      
      // Transformar los datos para asegurarnos de que incluyan el campo logo
      const brandsWithLogo = (data || []).map(brand => ({
        ...brand,
        logo: brand.logo || '' // Aseguramos que exista el campo logo
      }));
      
      setBrands(brandsWithLogo);
    } catch (error) {
      console.error('Error fetching brands:', error);
      toast({
        title: "Error",
        description: "No se pudieron cargar las marcas. Por favor, intenta nuevamente.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleBrandSelect = (brandId: string) => {
    // Guardar la marca seleccionada en localStorage o en un estado global
    localStorage.setItem('selectedBrandId', brandId);
    
    // Redirigir al catálogo de la marca seleccionada
    navigate('/catalog');
  };

  return (
    <div className="container mx-auto py-10">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">Selecciona una marca</h1>
        
        {loading ? (
          <div className="flex justify-center">
            <p>Cargando marcas disponibles...</p>
          </div>
        ) : brands.length === 0 ? (
          <div className="text-center">
            <p className="text-lg text-muted-foreground">No tienes acceso a ninguna marca.</p>
            <p className="mt-2">Contacta a tu administrador para solicitar acceso.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {brands.map((brand) => (
              <Card key={brand.id} className="overflow-hidden hover:shadow-md transition-shadow">
                <CardHeader className="pb-2">
                  <CardTitle>{brand.name}</CardTitle>
                </CardHeader>
                <CardContent className="pb-2">
                  {brand.logo && (
                    <div className="h-32 flex items-center justify-center p-4">
                      <img 
                        src={brand.logo} 
                        alt={`${brand.name} logo`} 
                        className="max-h-full max-w-full object-contain"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = '/placeholder.svg';
                        }}
                      />
                    </div>
                  )}
                </CardContent>
                <CardFooter>
                  <Button 
                    className="w-full" 
                    onClick={() => handleBrandSelect(brand.id)}
                  >
                    Seleccionar
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default BrandSelectionPage;
