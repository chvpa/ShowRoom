import { useState, useEffect, useRef, useCallback } from 'react';

/**
 * Hook para aplicar debounce a un valor que cambia frecuentemente
 * Útil para búsquedas, filtros, etc. para evitar llamadas innecesarias a la API
 * 
 * @param value Valor original a procesar
 * @param delay Tiempo de espera en ms antes de actualizar el valor (default: 500ms)
 * @returns Valor con debounce aplicado
 */
export function useDebounce<T>(value: T, delay = 500): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    // Configurar un timer para actualizar el valor después del delay
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    // Limpiar el timer si el valor o delay cambian
    return () => {
      clearTimeout(timer);
    };
  }, [value, delay]);

  return debouncedValue;
}

/**
 * Hook para debounce de una función
 * Útil para event handlers que no deberían ejecutarse en cada keystroke
 * 
 * @param fn Función a la que aplicar debounce
 * @param delay Tiempo de espera en ms (default: 500ms)
 * @returns Función con debounce aplicado
 */
export function useDebounceFn<T extends (...args: any[]) => any>(
  fn: T, 
  delay = 500
): T {
  // Guardamos el timer ID en ref para que persista entre renders
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  
  // Creamos una función con debounce que llama a la original
  const debouncedFn = useCallback(
    (...args: Parameters<T>) => {
      // Limpiar timer existente
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
      
      // Configurar nuevo timer
      timerRef.current = setTimeout(() => {
        fn(...args);
      }, delay);
    },
    [fn, delay]
  ) as T;
  
  // Limpiar el timer cuando el componente se desmonte
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, []);
  
  return debouncedFn;
} 