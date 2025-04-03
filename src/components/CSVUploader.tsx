
import React, { useState, useRef } from 'react';
import { Button } from "@/components/ui/button";
import { Upload } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import Papa from 'papaparse';

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
          
          // Process products in batches to avoid overwhelming the database
          const batchSize = 20;
          const batches = Math.ceil(data.length / batchSize);
          
          for (let i = 0; i < batches; i++) {
            const start = i * batchSize;
            const end = Math.min(start + batchSize, data.length);
            const batch = data.slice(start, end);
            
            const productsToInsert = batch.map(row => {
              // Get brand ID or create if doesn't exist
              const brand_name = row.marca;
              
              // Prepare images array (filter out empty URLs)
              const images = [row.IMAGEN_1, row.IMAGEN_2, row.IMAGEN_3, row.IMAGEN_4, row.IMAGEN_5]
                .filter(url => url && url.trim() !== '');
              
              return {
                name: row.descripcion,
                description: `${row.silueta} - ${row.genero} - ${row.rubro}`,
                sku: row.codigo,
                price: 0, // You might want to add price to your CSV or set a default
                stock_quantity: parseInt(row['Cantidad Disponible']) || 0,
                images,
                // These would need to be looked up by name in the database
                category_id: null, // To be updated after category lookup/creation
                brand_id: null, // To be updated after brand lookup/creation
              };
            });
            
            // Process each product to find or create brands and categories
            for (let j = 0; j < productsToInsert.length; j++) {
              const product = productsToInsert[j];
              const csvRow = batch[j];
              
              // Find or create brand
              const { data: brandData, error: brandError } = await supabase
                .from('brands')
                .select('id')
                .eq('name', csvRow.marca)
                .single();
              
              if (brandError && brandError.code !== 'PGRST116') {
                console.error('Error finding brand:', brandError);
                continue;
              }
              
              let brandId;
              if (!brandData) {
                const { data: newBrand, error: createBrandError } = await supabase
                  .from('brands')
                  .insert({ name: csvRow.marca })
                  .select('id')
                  .single();
                
                if (createBrandError) {
                  console.error('Error creating brand:', createBrandError);
                  continue;
                }
                
                brandId = newBrand.id;
              } else {
                brandId = brandData.id;
              }
              
              // Find or create category
              const { data: categoryData, error: categoryError } = await supabase
                .from('categories')
                .select('id')
                .eq('name', csvRow.categoria)
                .single();
              
              if (categoryError && categoryError.code !== 'PGRST116') {
                console.error('Error finding category:', categoryError);
                continue;
              }
              
              let categoryId;
              if (!categoryData) {
                const { data: newCategory, error: createCategoryError } = await supabase
                  .from('categories')
                  .insert({ name: csvRow.categoria })
                  .select('id')
                  .single();
                
                if (createCategoryError) {
                  console.error('Error creating category:', createCategoryError);
                  continue;
                }
                
                categoryId = newCategory.id;
              } else {
                categoryId = categoryData.id;
              }
              
              // Update product with brand and category IDs
              product.brand_id = brandId;
              product.category_id = categoryId;
            }
            
            // Insert products
            const { error: insertError } = await supabase
              .from('products')
              .insert(productsToInsert);
            
            if (insertError) {
              console.error('Error inserting products:', insertError);
              toast({
                title: 'Error al subir productos',
                description: 'Ocurrió un error al insertar los productos en la base de datos.',
                variant: 'destructive',
              });
              setIsUploading(false);
              return;
            }
            
            setUploadProgress(prev => ({ 
              current: Math.min(prev.current + batch.length, total), 
              total 
            }));
          }
          
          toast({
            title: 'Productos subidos correctamente',
            description: `Se han subido ${total} productos.`,
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
