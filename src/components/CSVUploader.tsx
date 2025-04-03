
import React, { useState, useRef } from 'react';
import { Button } from "@/components/ui/button";
import { Upload } from 'lucide-react';
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
  IMAGEN_1: string;
  IMAGEN_2: string;
  IMAGEN_3: string;
  IMAGEN_4: string;
  IMAGEN_5: string;
}

const CSVUploader = () => {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({ current: 0, total: 0 });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setUploadProgress({ current: 0, total: 0 });

    try {
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
            setIsUploading(false);
            return;
          }

          const total = data.length;
          setUploadProgress({ current: 0, total });
          
          // Agrupar datos por SKU (código)
          const productsBySku = new Map();
          
          for (const row of data) {
            const sku = row.codigo;
            
            if (!productsBySku.has(sku)) {
              productsBySku.set(sku, {
                productData: row,
                variants: []
              });
            }
            
            // Añadir esta variante
            productsBySku.get(sku).variants.push({
              talla: row.talla,
              stock_quantity: parseInt(row['Cantidad Disponible']) || 0,
              simple_curve: parseInt(row['curva simple']) || 0,
              reinforced_curve: parseInt(row['curva reforzada']) || 0
            });
          }
          
          let processedCount = 0;
          const processedSkus = new Set();
          
          // Procesar cada producto único
          for (const [sku, productInfo] of productsBySku.entries()) {
            const { productData, variants } = productInfo;
            
            try {
              // Si ya procesamos este SKU, saltamos
              if (processedSkus.has(sku)) continue;
              processedSkus.add(sku);
              
              // 1. Buscar o crear la marca
              let brandId;
              const { data: existingBrand } = await supabase
                .from('brands')
                .select('id')
                .eq('name', productData.marca)
                .maybeSingle();
                
              if (existingBrand) {
                brandId = existingBrand.id;
              } else {
                const { data: newBrand, error: brandError } = await supabase
                  .from('brands')
                  .insert({ name: productData.marca })
                  .select('id')
                  .single();
                  
                if (brandError) {
                  console.error('Error creating brand:', brandError);
                  throw brandError;
                }
                
                brandId = newBrand.id;
              }
              
              // 2. Buscar o crear la categoría
              let categoryId;
              const { data: existingCategory } = await supabase
                .from('categories')
                .select('id')
                .eq('name', productData.categoria)
                .maybeSingle();
                
              if (existingCategory) {
                categoryId = existingCategory.id;
              } else {
                const { data: newCategory, error: categoryError } = await supabase
                  .from('categories')
                  .insert({ name: productData.categoria })
                  .select('id')
                  .single();
                  
                if (categoryError) {
                  console.error('Error creating category:', categoryError);
                  throw categoryError;
                }
                
                categoryId = newCategory.id;
              }
              
              // 3. Preparar las imágenes (filtrar URLs vacías)
              const images = [
                productData.IMAGEN_1, 
                productData.IMAGEN_2, 
                productData.IMAGEN_3, 
                productData.IMAGEN_4, 
                productData.IMAGEN_5
              ].filter(url => url && url.trim() !== '');
              
              // 4. Verificar si el producto ya existe
              const { data: existingProduct } = await supabase
                .from('products')
                .select('id')
                .eq('sku', sku)
                .maybeSingle();
                
              let productId;
              
              if (existingProduct) {
                // Actualizar producto existente
                productId = existingProduct.id;
                const { error: updateError } = await supabase
                  .from('products')
                  .update({
                    name: productData.descripcion,
                    description: `${productData.rubro} - ${productData.estado}`,
                    silhouette: productData.silueta,
                    gender: productData.genero,
                    category_id: categoryId,
                    brand_id: brandId,
                    product_type: productData.rubro,
                    status: productData.estado,
                    images
                  })
                  .eq('id', productId);
                  
                if (updateError) {
                  console.error('Error updating product:', updateError);
                  throw updateError;
                }
              } else {
                // Crear nuevo producto
                const { data: newProduct, error: productError } = await supabase
                  .from('products')
                  .insert({
                    sku: sku,
                    name: productData.descripcion,
                    description: `${productData.rubro} - ${productData.estado}`,
                    silhouette: productData.silueta,
                    gender: productData.genero,
                    category_id: categoryId,
                    brand_id: brandId,
                    product_type: productData.rubro,
                    status: productData.estado,
                    images
                  })
                  .select('id')
                  .single();
                  
                if (productError) {
                  console.error('Error creating product:', productError);
                  throw productError;
                }
                
                productId = newProduct.id;
              }
              
              // 5. Crear o actualizar las variantes
              for (const variant of variants) {
                // Verificar si la variante ya existe
                const { data: existingVariant } = await supabase
                  .from('product_variants')
                  .select('id')
                  .eq('product_id', productId)
                  .eq('size', variant.talla)
                  .maybeSingle();
                  
                if (existingVariant) {
                  // Actualizar variante existente
                  const { error: variantUpdateError } = await supabase
                    .from('product_variants')
                    .update({
                      stock_quantity: variant.stock_quantity,
                      simple_curve: variant.simple_curve,
                      reinforced_curve: variant.reinforced_curve
                    })
                    .eq('id', existingVariant.id);
                    
                  if (variantUpdateError) {
                    console.error('Error updating variant:', variantUpdateError);
                    throw variantUpdateError;
                  }
                } else {
                  // Crear nueva variante
                  const { error: variantError } = await supabase
                    .from('product_variants')
                    .insert({
                      product_id: productId,
                      size: variant.talla,
                      stock_quantity: variant.stock_quantity,
                      simple_curve: variant.simple_curve,
                      reinforced_curve: variant.reinforced_curve
                    });
                    
                  if (variantError) {
                    console.error('Error creating variant:', variantError);
                    throw variantError;
                  }
                }
              }
              
              // Actualizar el progreso
              processedCount += variants.length;
              setUploadProgress({
                current: Math.min(processedCount, total),
                total
              });
              
            } catch (error) {
              console.error(`Error procesando producto ${sku}:`, error);
              toast({
                title: 'Error al procesar producto',
                description: `Error al procesar el producto con código ${sku}`,
                variant: 'destructive',
              });
              // Continuamos con el siguiente producto
            }
          }
          
          // Actualizar caché de consultas para reflejar los cambios
          queryClient.invalidateQueries({ queryKey: ['products'] });
          
          toast({
            title: 'Productos subidos correctamente',
            description: `Se han procesado ${processedCount} variantes de productos.`,
          });
          
          // Reset the file input and uploading state
          setIsUploading(false);
          if (fileInputRef.current) {
            fileInputRef.current.value = '';
          }
        },
        error: (error) => {
          console.error('Error parsing CSV:', error);
          toast({
            title: 'Error al procesar el archivo',
            description: 'El formato del archivo no es correcto.',
            variant: 'destructive',
          });
          setIsUploading(false);
        }
      });
    } catch (error) {
      console.error('Error uploading file:', error);
      toast({
        title: 'Error al subir el archivo',
        description: 'Ocurrió un error inesperado.',
        variant: 'destructive',
      });
      setIsUploading(false);
    }
  };

  const triggerFileInput = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  return (
    <div>
      <input
        type="file"
        ref={fileInputRef}
        accept=".csv"
        onChange={handleFileUpload}
        className="hidden"
      />
      <Button 
        onClick={triggerFileInput}
        disabled={isUploading}
      >
        <Upload className="mr-2 h-4 w-4" />
        {isUploading 
          ? `Subiendo... (${uploadProgress.current}/${uploadProgress.total})` 
          : 'Importar Productos (CSV)'}
      </Button>
    </div>
  );
};

export default CSVUploader;
