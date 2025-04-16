import React, { useState, useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';

interface LazyImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string;
  alt: string;
  placeholderSrc?: string;
  fallbackSrc?: string;
  aspectRatio?: '1:1' | '16:9' | '4:3' | '3:2' | 'auto';
  containerClassName?: string;
}

/**
 * LazyImage - Componente para carga perezosa de imágenes con placeholders
 * Carga las imágenes solo cuando entran en la viewport y muestra un placeholder mientras carga
 */
export function LazyImage({
  src,
  alt,
  placeholderSrc = '/placeholder.svg',
  fallbackSrc = '/placeholder.svg',
  aspectRatio = 'auto',
  className,
  containerClassName,
  ...props
}: LazyImageProps) {
  const [imageSrc, setImageSrc] = useState<string>(placeholderSrc);
  const [isLoaded, setIsLoaded] = useState<boolean>(false);
  const [isError, setIsError] = useState<boolean>(false);
  const imageRef = useRef<HTMLImageElement>(null);
  const observer = useRef<IntersectionObserver | null>(null);

  // Manejar el aspecto ratio
  const aspectRatioClass = aspectRatio !== 'auto' 
    ? {
        '1:1': 'aspect-square',
        '16:9': 'aspect-video',
        '4:3': 'aspect-[4/3]',
        '3:2': 'aspect-[3/2]',
      }[aspectRatio]
    : '';

  useEffect(() => {
    // Reset estados cuando cambia la fuente
    if (src !== imageSrc && src !== placeholderSrc) {
      setIsLoaded(false);
      setIsError(false);
      setImageSrc(placeholderSrc);
    }
    
    // Cleanup de observer anteriores
    if (observer.current) {
      observer.current.disconnect();
    }

    // Crear un nuevo IntersectionObserver
    observer.current = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        // Cuando la imagen es visible en la viewport
        if (entry.isIntersecting && !isLoaded && !isError) {
          // Precarga la imagen real
          const img = new Image();
          img.src = src;
          img.onload = () => {
            setImageSrc(src);
            setIsLoaded(true);
          };
          img.onerror = () => {
            setImageSrc(fallbackSrc);
            setIsError(true);
          };
          
          // Dejar de observar una vez que se inicia la carga
          if (observer.current && imageRef.current) {
            observer.current.unobserve(imageRef.current);
          }
        }
      });
    }, {
      rootMargin: '100px', // Empezar a cargar cuando esté a 100px de la viewport
      threshold: 0.1,      // Cuando al menos el 10% de la imagen esté visible
    });

    // Empezar a observar la imagen
    if (imageRef.current) {
      observer.current.observe(imageRef.current);
    }

    return () => {
      // Limpiar observer cuando el componente se desmonte
      if (observer.current) {
        observer.current.disconnect();
      }
    };
  }, [src, placeholderSrc, fallbackSrc, isLoaded, isError]);

  return (
    <div 
      className={cn(
        'overflow-hidden bg-muted relative',
        aspectRatioClass,
        containerClassName
      )}
    >
      <img
        ref={imageRef}
        src={imageSrc}
        alt={alt}
        className={cn(
          'w-full h-full object-cover transition-opacity duration-300',
          isLoaded ? 'opacity-100' : 'opacity-70',
          className
        )}
        loading="lazy"
        onError={() => {
          // Si falla la carga de la imagen, mostrar fallback
          if (imageSrc !== fallbackSrc) {
            setImageSrc(fallbackSrc);
            setIsError(true);
          }
        }}
        {...props}
      />
      
      {!isLoaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-muted animate-pulse">
          <span className="sr-only">Cargando imagen...</span>
        </div>
      )}
    </div>
  );
} 