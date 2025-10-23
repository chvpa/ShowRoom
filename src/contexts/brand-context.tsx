import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Brand } from '@/types';
import { useAuth } from './auth-context';

interface BrandContextType {
  selectedBrand: Brand | null;
  selectBrand: (brand: Brand) => void;
  clearBrand: () => void;
  userBrands: Brand[];
  isLoading: boolean;
}

const BrandContext = createContext<BrandContextType | undefined>(undefined);

export const useBrand = () => {
  const context = useContext(BrandContext);
  if (!context) {
    throw new Error('useBrand must be used within a BrandProvider');
  }
  return context;
};

export const BrandProvider = ({ children }: { children: ReactNode }) => {
  const [selectedBrand, setSelectedBrand] = useState<Brand | null>(null);
  const [userBrands, setUserBrands] = useState<Brand[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { user } = useAuth();

  // Load selected brand from localStorage on initial render
  useEffect(() => {
    const loadStoredBrand = async () => {
      try {
        const storedBrandId = localStorage.getItem('selectedBrandId');
        
        if (storedBrandId) {
          const { data, error } = await supabase
            .from('brands')
            .select('*')
            .eq('id', storedBrandId)
            .single();
            
          if (!error && data) {
            setSelectedBrand(data as Brand);
          }
        }
      } catch (error) {
        console.error('Error loading stored brand:', error);
      }
    };
    
    loadStoredBrand();
  }, []);

  // Load user's available brands when user changes
  useEffect(() => {
    const fetchUserBrands = async () => {
      if (!user) {
        setUserBrands([]);
        setIsLoading(false);
        return;
      }
      
      setIsLoading(true);
      
      try {
        let brandsQuery;
        
        // Superadmin can see all brands
        if (user.role === 'superadmin') {
          brandsQuery = supabase.from('brands').select('*');
        } 
        // Admin and client can only see assigned brands
        else {
          brandsQuery = supabase
            .from('user_brands')
            .select('brand_id, brands:brand_id(*)')
            .eq('user_id', user.id);
        }
        
        const { data, error } = await brandsQuery;
        
        if (error) throw error;
        
        let availableBrands: Brand[];
        
        // Process based on role and query structure
        if (user.role === 'superadmin') {
          availableBrands = data as Brand[];
        } else {
          // Extract brands from the nested structure
          availableBrands = data
            .filter(item => item.brands)
            .map(item => item.brands as Brand);
        }
        
        setUserBrands(availableBrands);
        
        // Solo auto-seleccionar si no hay marca seleccionada y el usuario tiene una sola marca
        if (availableBrands.length === 1 && !selectedBrand) {
          selectBrand(availableBrands[0]);
        }
        
        // Solo limpiar la marca si está definitivamente no disponible y hay marcas cargadas
        if (selectedBrand && availableBrands.length > 0 && !availableBrands.some(brand => brand.id === selectedBrand.id)) {
          console.warn('Marca seleccionada no disponible para el usuario, limpiando...');
          clearBrand();
        }
      } catch (error) {
        console.error('Error fetching user brands:', error);
        setUserBrands([]);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchUserBrands();
  }, [user?.id, user?.role]); // Solo depender de user.id y user.role, no de selectedBrand

  const selectBrand = (brand: Brand) => {
    setSelectedBrand(brand);
    localStorage.setItem('selectedBrandId', brand.id);
  };

  const clearBrand = () => {
    setSelectedBrand(null);
    localStorage.removeItem('selectedBrandId');
  };

  return (
    <BrandContext.Provider value={{ 
      selectedBrand, 
      selectBrand, 
      clearBrand,
      userBrands,
      isLoading
    }}>
      {children}
    </BrandContext.Provider>
  );
}; 