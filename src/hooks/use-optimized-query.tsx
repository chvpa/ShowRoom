import { useQuery, useQueryClient, UseQueryOptions } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useEffect, useRef } from 'react';

// Tipo para los resultados de Supabase
interface SupabaseResult<TData> {
  data: TData;
  error: any;
}

interface UseOptimizedQueryOptions<TData> extends Omit<UseQueryOptions<SupabaseResult<TData>, Error, SupabaseResult<TData>>, 'queryKey' | 'queryFn'> {
  /**
   * Tiempo de persistencia de caché en localStorage (en minutos)
   * Si es null, no se guardará en localStorage
   */
  localStorageTime?: number | null;
  /**
   * Tiempo máximo para considerar los datos como válidos sin necesidad de revalidar (en minutos)
   */
  maxStaleTime?: number;
}

/**
 * Hook personalizado para consultas a Supabase con caché optimizada en memoria y localStorage
 * @param table Nombre de la tabla de Supabase
 * @param queryKey Clave única para identificar la consulta en caché
 * @param queryFn Función que realiza la consulta a Supabase
 * @param options Opciones adicionales de configuración
 */
export function useOptimizedQuery<TData = any>(
  table: string,
  queryKey: any[],
  queryFn: () => Promise<SupabaseResult<TData>>,
  options: UseOptimizedQueryOptions<TData> = {}
) {
  const queryClient = useQueryClient();
  const hasCheckedLocalStorage = useRef(false);
  const fullQueryKey = [`supabase-${table}`, ...queryKey];
  
  const {
    localStorageTime = 60, // 1 hora por defecto
    maxStaleTime = 120, // 2 horas por defecto
    ...restOptions
  } = options;

  // Verificar localStorage al montar el componente (sólo una vez)
  useEffect(() => {
    if (
      typeof window !== 'undefined' &&
      !hasCheckedLocalStorage.current &&
      localStorageTime !== null
    ) {
      const cacheKey = `supabase-cache-${fullQueryKey.join('-')}`;
      const cachedData = localStorage.getItem(cacheKey);
      
      if (cachedData) {
        try {
          const { data, timestamp } = JSON.parse(cachedData);
          const ageInMinutes = (Date.now() - timestamp) / (1000 * 60);
          
          // Si los datos son lo suficientemente recientes, los usamos
          if (ageInMinutes < maxStaleTime) {
            queryClient.setQueryData(fullQueryKey, { data, error: null });
            
            // Si los datos son muy antiguos pero aún válidos, planificamos una revalidación en segundo plano
            if (ageInMinutes > localStorageTime / 2) {
              setTimeout(() => {
                queryClient.invalidateQueries({ queryKey: fullQueryKey });
              }, 2000); // Revalidar después de 2 segundos (experiencia de usuario primero)
            }
          }
        } catch (error) {
          console.error('Error parsing cached data:', error);
        }
      }
      
      hasCheckedLocalStorage.current = true;
    }
  }, []);

  // Ejecutar la consulta con React Query
  const result = useQuery<SupabaseResult<TData>, Error, SupabaseResult<TData>>({
    queryKey: fullQueryKey,
    queryFn: async () => {
      const result = await queryFn();
      
      // Guardar en localStorage si está configurado
      if (typeof window !== 'undefined' && localStorageTime !== null) {
        try {
          const cacheKey = `supabase-cache-${fullQueryKey.join('-')}`;
          localStorage.setItem(
            cacheKey,
            JSON.stringify({
              data: result.data,
              timestamp: Date.now(),
            })
          );
          
          // Configurar limpieza automática después del tiempo especificado
          setTimeout(() => {
            localStorage.removeItem(cacheKey);
          }, localStorageTime * 60 * 1000);
        } catch (error) {
          console.error('Error caching data:', error);
        }
      }
      
      return result;
    },
    staleTime: 1000 * 60 * (localStorageTime || 15), // Usar localStorageTime como staleTime o 15 minutos
    ...restOptions,
  });

  return result;
}

/**
 * Hook para obtener datos de una tabla específica de Supabase con caché optimizada
 */
export function useSupabaseTable<T = any>(
  table: string,
  options: {
    select?: string;
    filter?: Record<string, any>;
    order?: { column: string; ascending?: boolean };
    limit?: number;
    queryKey?: any[];
    cacheTime?: number;
  } = {}
) {
  const {
    select = '*',
    filter = {},
    order,
    limit,
    queryKey = [],
    cacheTime = 60, // 1 hora por defecto
  } = options;

  // Construir la clave de la consulta
  const key = [
    table,
    select,
    ...queryKey,
    ...Object.entries(filter).flat(),
    order && `${order.column}-${order.ascending ? 'asc' : 'desc'}`,
    limit,
  ].filter(Boolean);

  const result = useOptimizedQuery<T[]>(
    table,
    key,
    async () => {
      try {
        // Iniciar la consulta a Supabase
        let query = (supabase as any)
          .from(table)
          .select(select);

        // Aplicar filtros si existen
        Object.entries(filter).forEach(([column, value]) => {
          if (Array.isArray(value)) {
            query = query.in(column, value);
          } else {
            query = query.eq(column, value);
          }
        });

        // Aplicar ordenamiento
        if (order) {
          query = query.order(order.column, {
            ascending: order.ascending ?? true,
          });
        }

        // Aplicar límite
        if (limit) {
          query = query.limit(limit);
        }

        // Ejecutar la consulta
        const { data, error } = await query;

        if (error) throw error;
        return { data, error: null };
      } catch (error) {
        console.error(`Error fetching ${table}:`, error);
        return { data: [], error };
      }
    },
    {
      localStorageTime: cacheTime,
      maxStaleTime: cacheTime * 2,
      retry: 1,
      // Desactivar revalidaciones automáticas para mejorar rendimiento
      refetchOnWindowFocus: false,
      refetchOnMount: false,
    }
  );

  // Devolver solo los datos para facilitar el uso
  return {
    data: result.data?.data || [],
    isLoading: result.isLoading,
    isError: result.isError,
    error: result.error,
    refetch: result.refetch
  };
} 