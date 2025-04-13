import { useMutation, useQuery, useQueryClient, UseQueryOptions } from '@tanstack/react-query';
import { useState, useEffect } from 'react';
import { PostgrestError } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

// Define el tipo para el builder de consultas de Supabase
type SupabaseClient = typeof supabase;

// Tipo genérico para la respuesta de una consulta a Supabase
type SupabaseQueryResponse<T> = {
  data: T[];
  error: Error | null;
  count: number | null;
};

/**
 * Hook personalizado para consultas a Supabase con React Query
 * @param queryKey Clave única para la consulta (para caché)
 * @param tableName Nombre de la tabla en Supabase
 * @param queryFn Función que realiza la consulta a Supabase
 * @param options Opciones adicionales para useQuery
 */
export function useSupabaseQuery<T>(
  queryKey: unknown[],
  tableName: string,
  queryFn: (client: SupabaseClient) => Promise<SupabaseQueryResponse<T>>,
  options?: Omit<UseQueryOptions<SupabaseQueryResponse<T>, Error>, 'queryKey' | 'queryFn'>
) {
  const queryClient = useQueryClient();

  return useQuery<SupabaseQueryResponse<T>, Error>({
    queryKey,
    queryFn: async () => {
      try {
        return await queryFn(supabase);
      } catch (error: any) {
        console.error(`Error en consulta a ${tableName}:`, error);
        throw new Error(error.message || 'Error en consulta a Supabase');
      }
    },
    // Fusionar opciones por defecto con las proporcionadas
    ...options,
  });
}

/**
 * Hook personalizado para mutaciones en Supabase con React Query
 * @param tableName Nombre de la tabla en Supabase
 * @param mutationFn Función que realiza la mutación en Supabase
 * @param invalidateQueries Claves de consultas a invalidar después de la mutación
 */
export function useSupabaseMutation<TData, TVariables>(
  tableName: string,
  mutationFn: (client: SupabaseClient, variables: TVariables) => Promise<TData>,
  invalidateQueries: unknown[][] = []
) {
  const queryClient = useQueryClient();

  return useMutation<TData, Error, TVariables>({
    mutationFn: async (variables) => {
      try {
        return await mutationFn(supabase, variables);
      } catch (error: any) {
        console.error(`Error en mutación en ${tableName}:`, error);
        throw new Error(error.message || 'Error en mutación en Supabase');
      }
    },
    onSuccess: () => {
      // Invalidar consultas específicas en lugar de invalidar todo
      invalidateQueries.forEach(queryKey => {
        queryClient.invalidateQueries({ queryKey });
      });
    },
  });
}

/**
 * Hook para consultas paginadas a Supabase
 * @param queryKeyPrefix Prefijo para la clave de consulta
 * @param tableName Nombre de la tabla
 * @param queryFn Función que realiza la consulta paginada
 * @param pageSize Tamaño de página
 */
export function usePaginatedQuery<T>(
  queryKeyPrefix: unknown[],
  tableName: string, 
  queryFn: (client: SupabaseClient, page: number, pageSize: number) => Promise<SupabaseQueryResponse<T>>,
  pageSize: number = 10
) {
  const [page, setPage] = useState(1);
  const queryClient = useQueryClient();

  // Función para pre-cargar la siguiente página
  const prefetchNextPage = async () => {
    await queryClient.prefetchQuery({
      queryKey: [...queryKeyPrefix, page + 1, pageSize],
      queryFn: () => queryFn(supabase, page + 1, pageSize),
    });
  };

  const result = useQuery<SupabaseQueryResponse<T>, Error>({
    queryKey: [...queryKeyPrefix, page, pageSize],
    queryFn: () => queryFn(supabase, page, pageSize),
    // La opción keepPreviousData se ha sustituido por placeholderData en v4
    placeholderData: (prev) => prev, // Mantener datos anteriores mientras se carga la nueva página
  });

  // Precargar la siguiente página cuando se carga la actual
  useEffect(() => {
    if (result.isSuccess) {
      prefetchNextPage();
    }
  }, [result.isSuccess, page]);

  return {
    ...result,
    page,
    setPage,
    pageSize,
    // Funciones de paginación
    nextPage: () => setPage(old => old + 1),
    prevPage: () => setPage(old => Math.max(1, old - 1)),
    goToPage: (pageNumber: number) => setPage(pageNumber),
  };
} 