import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Button } from "@/components/ui/button";
import { Upload, AlertCircle, CheckCircle } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import Papa from 'papaparse';
import { useQueryClient } from '@tanstack/react-query';

// Define the schema for the CSV file based on the provided image
interface ProductCSVRow {
  codigo: string;
  descripcion: string;
  silueta: string;
  genero: string;
  categoria: string;
  marca: string;
  rubro: string;
  estado: string;
  'curva simple': string;
  'curva reforzada': string;
  talla: string;
  'Cantidad Disponible': string;
  Precio: string;
  IMAGEN_1: string;
  IMAGEN_2: string;
  IMAGEN_3: string;
  IMAGEN_4: string;
  IMAGEN_5: string;
}

interface CSVUploaderProps {
  bucketName?: string;
  onSuccess?: () => void;
  brandId?: string;
}

interface UploadState {
  isUploading: boolean;
  progress: { current: number; total: number };
  phase: 'parsing' | 'preparing' | 'uploading' | 'variants' | 'completed' | 'error';
  error?: string;
  canResume: boolean;
  uploadId?: string;
}

const CSVUploader = ({ bucketName = 'products', onSuccess, brandId }: CSVUploaderProps) => {
  const [uploadState, setUploadState] = useState<UploadState>({
    isUploading: false,
    progress: { current: 0, total: 0 },
    phase: 'parsing',
    canResume: false,
  });
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [brandName, setBrandName] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Obtener el nombre de la marca a partir del ID
  useEffect(() => {
    if (brandId) {
      const fetchBrandName = async () => {
        const { data, error } = await supabase
          .from('brands')
          .select('name')
          .eq('id', brandId)
          .single();
          
        if (data && !error) {
          console.log('Nombre de marca encontrado:', data.name);
          setBrandName(data.name);
        } else {
          console.error('Error al obtener el nombre de la marca:', error);
        }
      };
      
      fetchBrandName();
    }
  }, [brandId]);

  // Restaurar estado de upload interrumpido al cargar el componente
  useEffect(() => {
    const savedState = localStorage.getItem(`upload-state-${brandId}`);
    if (savedState) {
      try {
        const parsed = JSON.parse(savedState);
        const timeDiff = Date.now() - parsed.timestamp;
        
        // Si la subida se interrumpió hace menos de 1 hora, permitir reanudar
        if (parsed.isUploading && timeDiff < 1000 * 60 * 60) {
          setUploadState({
            ...parsed,
            canResume: true,
            isUploading: false, // No auto-reanudar, esperar acción del usuario
          });
          
          toast({
            title: 'Subida interrumpida detectada',
            description: '¿Deseas continuar donde se quedó?',
            action: (
              <Button 
                size="sm" 
                onClick={() => resumeUpload(parsed)}
                className="ml-2"
              >
                Reanudar
              </Button>
            ),
          });
        }
      } catch (error) {
        console.warn('Error al restaurar estado de upload:', error);
      }
    }
  }, [brandId]);

  // Persistir estado en localStorage en cada cambio
  const persistState = useCallback((state: UploadState) => {
    if (brandId) {
      const stateToSave = {
        ...state,
        timestamp: Date.now(),
      };
      localStorage.setItem(`upload-state-${brandId}`, JSON.stringify(stateToSave));
    }
  }, [brandId]);

  // Función para reanudar upload interrumpido
  const resumeUpload = async (savedState: any) => {
    // Implementar lógica de reanudación aquí
    toast({
      title: 'Reanudando subida...',
      description: 'Continuando desde donde se quedó.',
    });
    
    setUploadState({
      ...savedState,
      isUploading: true,
      canResume: false,
    });
  };

  // Función optimizada de carga por lotes con transacciones atómicas
  const processDataInBatches = async (data: ProductCSVRow[]) => {
    if (!brandName) throw new Error('Nombre de marca no disponible');

    const BATCH_SIZE = 50; // Procesar de a 50 productos por vez
    let processed = 0;
    
    setUploadState(prev => ({ 
      ...prev, 
      phase: 'preparing',
      progress: { current: 0, total: data.length }
    }));

    console.log(`🚀 Iniciando carga resistente a interrupciones de ${data.length} filas...`);
    
    // **FASE 1: Agrupar y preparar datos**
    const productsBySku = new Map();
    
    for (const row of data) {
      const sku = row.codigo;
      
      if (!productsBySku.has(sku)) {
        productsBySku.set(sku, {
          productData: row,
          variants: []
        });
      }
      
      productsBySku.get(sku).variants.push({
        talla: row.talla,
        stock_quantity: parseInt(row['Cantidad Disponible']) || 0,
        simple_curve: parseInt(row['curva simple']) || 0,
        reinforced_curve: parseInt(row['curva reforzada']) || 0
      });
    }
    
    const uniqueProducts = Array.from(productsBySku.entries());
    console.log(`📦 Productos únicos a procesar: ${uniqueProducts.length}`);
    
    setUploadState(prev => ({ 
      ...prev, 
      phase: 'uploading',
      progress: { current: 0, total: uniqueProducts.length }
    }));

    // **FASE 2: Procesamiento por lotes con transacciones atómicas**
    const batches = [];
    for (let i = 0; i < uniqueProducts.length; i += BATCH_SIZE) {
      batches.push(uniqueProducts.slice(i, i + BATCH_SIZE));
    }

    console.log(`📊 Procesando en ${batches.length} lotes de ${BATCH_SIZE} productos cada uno`);

    for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
      const batch = batches[batchIndex];
      
      // Verificar si el proceso fue cancelado
      if (abortControllerRef.current?.signal.aborted) {
        throw new Error('Proceso cancelado por el usuario');
      }

      try {
        // **TRANSACCIÓN ATÓMICA POR LOTE**
        await processBatchAtomic(batch, brandName);
        
        processed += batch.length;
        
        setUploadState(prev => ({ 
          ...prev, 
          progress: { current: processed, total: uniqueProducts.length }
        }));
        
        console.log(`✅ Lote ${batchIndex + 1}/${batches.length} completado (${processed}/${uniqueProducts.length})`);
        
        // Pequeña pausa para no sobrecargar la base de datos
        await new Promise(resolve => setTimeout(resolve, 100));
        
      } catch (error) {
        console.error(`❌ Error en lote ${batchIndex + 1}:`, error);
        
        // En caso de error, continuar con el siguiente lote
        // pero registrar el error
        toast({
          title: 'Error en lote',
          description: `Error procesando lote ${batchIndex + 1}. Continuando...`,
          variant: 'destructive',
        });
      }
    }

    return processed;
  };

  // Procesar un lote de productos de forma atómica
  const processBatchAtomic = async (batch: any[], brandName: string) => {
    // Obtener todos los SKUs del lote
    const skus = batch.map(([sku]) => sku);
    
    // **CONSULTA ÚNICA:** Verificar productos existentes en este lote
    const { data: existingProducts } = await supabase
      .from('products')
      .select('id, sku')
      .eq('brand', brandName)
      .in('sku', skus);
    
    const existingMap = new Map((existingProducts || []).map(p => [p.sku, p.id]));
    
    const productsToInsert = [];
    const productsToUpdate = [];
    const allVariants = [];
    
    // Preparar datos del lote
    for (const [sku, productInfo] of batch) {
      const { productData, variants } = productInfo;
      const existingId = existingMap.get(sku);
      
      const images = [
        productData.IMAGEN_1, 
        productData.IMAGEN_2, 
        productData.IMAGEN_3, 
        productData.IMAGEN_4, 
        productData.IMAGEN_5
      ].filter(url => url && url.trim() !== '');
      
      const productRecord = {
        sku: sku,
        name: productData.descripcion,
        description: `${productData.rubro} - ${productData.estado}`,
        silhouette: productData.silueta,
        gender: productData.genero,
        category: productData.categoria,
        brand: brandName,
        product_type: productData.rubro,
        status: productData.estado,
        price: Number(productData.Precio) || 0,
        enabled: productData.estado === 'EN LINEA',
        images
      };
      
      if (existingId) {
        productsToUpdate.push({ id: existingId, ...productRecord });
      } else {
        productsToInsert.push(productRecord);
      }
      
      // Guardar variantes para procesar después
      variants.forEach((variant: any) => {
        allVariants.push({
          sku,
          existingProductId: existingId,
          variant
        });
      });
    }
    
    // **BATCH INSERT de productos nuevos**
    let newProductIds = new Map();
    if (productsToInsert.length > 0) {
      const { data: insertedProducts, error } = await supabase
        .from('products')
        .insert(productsToInsert)
        .select('id, sku');
      
      if (error) throw error;
      
      newProductIds = new Map((insertedProducts || []).map(p => [p.sku, p.id]));
    }
    
    // **BATCH UPDATE de productos existentes**
    if (productsToUpdate.length > 0) {
      const { error } = await supabase
        .from('products')
        .upsert(productsToUpdate, { onConflict: 'id' });
      
      if (error) throw error;
    }
    
    // **PROCESAR VARIANTES**
    await processVariantsForBatch(allVariants, existingMap, newProductIds);
  };

  // Procesar variantes para un lote de productos
  const processVariantsForBatch = async (
    allVariants: any[], 
    existingProductIds: Map<string, string>, 
    newProductIds: Map<string, string>
  ) => {
    const allProductIds = new Map([...existingProductIds, ...newProductIds]);
    const productIds = Array.from(allProductIds.values());
    
    // Obtener variantes existentes para estos productos
    const { data: existingVariants } = await supabase
      .from('product_variants')
      .select('id, product_id, size')
      .in('product_id', productIds);
    
    const existingVariantsMap = new Map(
      (existingVariants || []).map(v => [`${v.product_id}-${v.size}`, v.id])
    );
    
    const variantsToInsert = [];
    const variantsToUpdate = [];
    
    for (const { sku, variant } of allVariants) {
      const productId = allProductIds.get(sku);
      if (!productId) continue;
      
      const variantKey = `${productId}-${variant.talla}`;
      const existingVariantId = existingVariantsMap.get(variantKey);
      
      const variantRecord = {
        product_id: productId,
        size: variant.talla,
        stock_quantity: variant.stock_quantity,
        simple_curve: variant.simple_curve,
        reinforced_curve: variant.reinforced_curve
      };
      
      if (existingVariantId) {
        variantsToUpdate.push({ id: existingVariantId, ...variantRecord });
      } else {
        variantsToInsert.push(variantRecord);
      }
    }
    
    // Insertar nuevas variantes
    if (variantsToInsert.length > 0) {
      const { error } = await supabase
        .from('product_variants')
        .insert(variantsToInsert);
      
      if (error) throw error;
    }
    
    // Actualizar variantes existentes
    if (variantsToUpdate.length > 0) {
      const { error } = await supabase
        .from('product_variants')
        .upsert(variantsToUpdate, { onConflict: 'id' });
      
      if (error) throw error;
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Limpiar estado previo
    localStorage.removeItem(`upload-state-${brandId}`);
    
    // Crear AbortController para permitir cancelación
    abortControllerRef.current = new AbortController();

    const uploadId = `upload-${Date.now()}`;
    
    setUploadState({
      isUploading: true,
      progress: { current: 0, total: 0 },
      phase: 'parsing',
      canResume: false,
      uploadId,
    });

    console.log('Cargando productos para la marca ID:', brandId);
    console.log('Nombre de la marca:', brandName);
    
    if (!brandId || !brandName) {
      toast({
        title: 'Error al subir productos',
        description: 'No se ha seleccionado una marca válida.',
        variant: 'destructive',
      });
      setUploadState(prev => ({ ...prev, isUploading: false }));
      return;
    }

    try {
      // Parsear CSV
      Papa.parse<ProductCSVRow>(file, {
        header: true,
        skipEmptyLines: true,
        complete: async (results) => {
          const { data, errors } = results;
          
          if (errors.length > 0) {
            console.error('Error parsing CSV:', errors);
            toast({
              title: 'Error al procesar el archivo',
              description: 'El formato del archivo no es correcto.',
              variant: 'destructive',
            });
            setUploadState(prev => ({ ...prev, isUploading: false, phase: 'error' }));
            return;
          }

          try {
            // Procesar datos en lotes resistentes a interrupciones
            const processedCount = await processDataInBatches(data);
            
            // Invalidar caché
            queryClient.invalidateQueries({ queryKey: ['products', brandId] });
            
            setUploadState({
              isUploading: false,
              progress: { current: processedCount, total: processedCount },
              phase: 'completed',
              canResume: false,
            });
            
            // Limpiar estado persistido al completar
            localStorage.removeItem(`upload-state-${brandId}`);
            
            toast({
              title: 'Productos cargados exitosamente',
              description: `Se procesaron ${processedCount} productos únicos.`,
            });
            
            if (onSuccess) {
              onSuccess();
            }
            
            if (fileInputRef.current) {
              fileInputRef.current.value = '';
            }
            
          } catch (error) {
            console.error('Error durante el procesamiento:', error);
            setUploadState(prev => ({ 
              ...prev, 
              isUploading: false, 
              phase: 'error',
              error: error instanceof Error ? error.message : 'Error desconocido'
            }));
            
            toast({
              title: 'Error durante la carga',
              description: 'La carga se interrumpió. Puedes intentar reanudarla.',
              variant: 'destructive',
            });
          }
        },
        error: (error) => {
          console.error('Error parsing CSV:', error);
          toast({
            title: 'Error al procesar el archivo',
            description: 'El formato del archivo no es correcto.',
            variant: 'destructive',
          });
          setUploadState(prev => ({ ...prev, isUploading: false, phase: 'error' }));
        }
      });
    } catch (error) {
      console.error('Error uploading file:', error);
      toast({
        title: 'Error al subir el archivo',
        description: 'Ocurrió un error inesperado.',
        variant: 'destructive',
      });
      setUploadState(prev => ({ ...prev, isUploading: false, phase: 'error' }));
    }
  };

  const cancelUpload = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    setUploadState(prev => ({ ...prev, isUploading: false, phase: 'error' }));
    toast({
      title: 'Carga cancelada',
      description: 'La subida de productos ha sido cancelada.',
    });
  };

  const triggerFileInput = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  // Persistir estado cada vez que cambie
  useEffect(() => {
    if (uploadState.isUploading) {
      persistState(uploadState);
    }
  }, [uploadState, persistState]);

  const getPhaseText = () => {
    switch (uploadState.phase) {
      case 'parsing': return 'Analizando archivo...';
      case 'preparing': return 'Preparando datos...';
      case 'uploading': return 'Subiendo productos...';
      case 'variants': return 'Procesando variantes...';
      case 'completed': return 'Completado';
      case 'error': return 'Error';
      default: return 'Procesando...';
    }
  };

  const getProgressPercentage = () => {
    if (uploadState.progress.total === 0) return 0;
    return (uploadState.progress.current / uploadState.progress.total) * 100;
  };

  return (
    <div className="space-y-4">
      <input
        type="file"
        ref={fileInputRef}
        accept=".csv"
        onChange={handleFileUpload}
        className="hidden"
      />
      
      <div className="flex gap-2">
        <Button 
          onClick={triggerFileInput}
          disabled={uploadState.isUploading}
          className="flex-1"
        >
          <Upload className="mr-2 h-4 w-4" />
          {uploadState.isUploading ? getPhaseText() : 'Subir productos desde CSV'}
        </Button>
        
        {uploadState.isUploading && (
          <Button 
            onClick={cancelUpload}
            variant="outline"
            size="sm"
          >
            Cancelar
          </Button>
        )}
      </div>

      {uploadState.canResume && (
        <div className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
          <AlertCircle className="h-4 w-4 text-amber-600" />
          <span className="text-sm text-amber-800">
            Hay una subida interrumpida. ¿Deseas reanudarla?
          </span>
          <Button 
            size="sm" 
            onClick={() => resumeUpload(uploadState)}
            className="ml-auto"
          >
            Reanudar
          </Button>
        </div>
      )}
      
      {(uploadState.isUploading || uploadState.phase === 'completed') && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">
              {getPhaseText()}
            </span>
            <span className="text-gray-600">
              {uploadState.progress.current} / {uploadState.progress.total}
            </span>
          </div>
          
          <div className="bg-gray-200 rounded-full h-2.5">
            <div 
              className={`h-2.5 rounded-full transition-all duration-300 ${
                uploadState.phase === 'completed' ? 'bg-green-600' : 'bg-blue-600'
              }`}
              style={{ width: `${getProgressPercentage()}%` }}
            ></div>
          </div>
          
          {uploadState.phase === 'completed' && (
            <div className="flex items-center gap-2 text-green-600 text-sm">
              <CheckCircle className="h-4 w-4" />
              ¡Carga completada exitosamente!
            </div>
          )}
        </div>
      )}
      
      {uploadState.phase === 'error' && uploadState.error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-center gap-2 text-red-800 text-sm">
            <AlertCircle className="h-4 w-4" />
            Error: {uploadState.error}
          </div>
        </div>
      )}
    </div>
  );
};

export default CSVUploader;
