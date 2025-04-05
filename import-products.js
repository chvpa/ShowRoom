// Script para importar productos desde un archivo CSV a Supabase
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import Papa from 'papaparse';
import dotenv from 'dotenv';

// Cargar variables de entorno
dotenv.config();

// Inicializar cliente de Supabase
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Error: Las variables de entorno VITE_SUPABASE_URL y VITE_SUPABASE_KEY son requeridas.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Función principal para importar productos
async function importProducts(csvFilePath) {
  console.log(`Importando productos desde ${csvFilePath}...`);
  
  try {
    // Verificar si el archivo existe
    if (!fs.existsSync(csvFilePath)) {
      console.error(`Error: El archivo ${csvFilePath} no existe.`);
      return;
    }
    
    // Leer el archivo CSV
    const csvFile = fs.readFileSync(csvFilePath, 'utf8');
    
    // Parsear el CSV
    const { data, errors } = Papa.parse(csvFile, {
      header: true,
      skipEmptyLines: true,
      transformHeader: header => header.trim()
    });
    
    if (errors.length > 0) {
      console.error('Errores al parsear el CSV:', errors);
      return;
    }
    
    console.log(`Se encontraron ${data.length} productos en el CSV.`);
    
    // Obtener las marcas existentes
    const { data: brands, error: brandsError } = await supabase
      .from('brands')
      .select('id, name');
      
    if (brandsError) {
      console.error('Error al obtener las marcas:', brandsError.message);
      return;
    }
    
    // Crear un mapa de nombres de marca a IDs
    const brandMap = new Map();
    brands.forEach(brand => {
      brandMap.set(brand.name.toLowerCase(), brand.id);
    });
    
    console.log('Marcas disponibles:', Array.from(brandMap.keys()));
    
    // Obtener las categorías existentes
    const { data: categories, error: categoriesError } = await supabase
      .from('categories')
      .select('id, name');
      
    if (categoriesError) {
      console.error('Error al obtener las categorías:', categoriesError.message);
      return;
    }
    
    // Crear un mapa de nombres de categoría a IDs
    const categoryMap = new Map();
    categories.forEach(category => {
      categoryMap.set(category.name.toLowerCase(), category.id);
    });
    
    console.log('Categorías disponibles:', Array.from(categoryMap.keys()));
    
    // Procesar y transformar los datos del CSV
    const productsToInsert = [];
    const productsToUpdate = [];
    const skippedProducts = [];
    
    // Obtener los SKUs existentes
    const { data: existingProducts, error: existingProductsError } = await supabase
      .from('products')
      .select('id, sku');
      
    if (existingProductsError) {
      console.error('Error al obtener los productos existentes:', existingProductsError.message);
      return;
    }
    
    // Crear un mapa de SKUs a IDs
    const skuMap = new Map();
    existingProducts.forEach(product => {
      skuMap.set(product.sku.toLowerCase(), product.id);
    });
    
    // Agrupar productos por SKU para manejar diferentes tallas del mismo producto
    const productsBySku = {};
    
    // Procesar cada fila del CSV
    for (const row of data) {
      try {
        const sku = row.codigo || row.sku || '';
        if (!sku) {
          console.warn('Advertencia: Fila sin SKU, se omitirá:', row);
          skippedProducts.push(row);
          continue;
        }
        
        // Si es la primera vez que vemos este SKU, inicializamos el producto base
        if (!productsBySku[sku]) {
          productsBySku[sku] = {
            sku: sku,
            name: row.descripcion || row.name || '',
            description: row.descripcion_larga || row.description || '',
            silhouette: row.silueta || row.silhouette || '',
            gender: row.genero || row.gender || '',
            product_type: row.categoria || row.product_type || '',
            rubro: row.rubro || '',
            status: row.estado || row.status || 'active',
            price: parseFloat(row.Precio || row.precio || row.price || '0') || 0,
            enabled: true,
            updated_at: new Date().toISOString(),
            // Inicializamos un mapa de tallas con sus cantidades y curvas
            sizes: {},
            // Guardamos las imágenes solo una vez por SKU
            images: []
          };
          
          // Procesar las imágenes (asumiendo que están en columnas IMAGEN_1, IMAGEN_2, etc.)
          for (let i = 1; i <= 5; i++) {
            const imageUrl = row[`IMAGEN_${i}`] || row[`imagen_${i}`] || '';
            if (imageUrl && imageUrl.trim() !== '') {
              productsBySku[sku].images.push(imageUrl.trim());
            }
          }
          
          // Buscar el ID de la marca
          const brandName = row.marca || row.brand || '';
          if (brandName) {
            const brandId = brandMap.get(brandName.toLowerCase());
            if (brandId) {
              productsBySku[sku].brand_id = brandId;
            } else {
              console.warn(`Advertencia: No se encontró la marca "${brandName}" en la base de datos.`);
            }
          }
          
          // Buscar el ID de la categoría
          const categoryName = row.categoria || row.category || '';
          if (categoryName) {
            const categoryId = categoryMap.get(categoryName.toLowerCase());
            if (categoryId) {
              productsBySku[sku].category_id = categoryId;
            } else {
              console.warn(`Advertencia: No se encontró la categoría "${categoryName}" en la base de datos.`);
            }
          }
        }
        
        // Agregar información de talla para este producto
        const talla = row.talla || '';
        if (talla) {
          productsBySku[sku].sizes[talla] = {
            curva_simple: parseInt(row['curva simple'] || '0') || 0,
            curva_reforzada: parseInt(row['curva reforzada'] || '0') || 0,
            stock_quantity: parseInt(row['Cantidad Disponible'] || row.cantidad_disponible || row.stock_quantity || '0') || 0
          };
        }
      } catch (err) {
        console.error('Error al procesar la fila:', row, err);
        skippedProducts.push(row);
      }
    }
    
    // Convertir los productos agrupados en productos individuales por talla
    for (const sku in productsBySku) {
      try {
        const baseProduct = productsBySku[sku];
        const sizes = baseProduct.sizes;
        delete baseProduct.sizes; // Eliminamos el campo sizes que no existe en la tabla
        
        // Para cada talla, creamos un producto en la base de datos
        for (const talla in sizes) {
          const product = {
            ...baseProduct,
            talla: talla,
            curva_simple: sizes[talla].curva_simple,
            curva_reforzada: sizes[talla].curva_reforzada,
            stock_quantity: sizes[talla].stock_quantity,
            // Generamos un SKU único para cada talla
            sku: `${baseProduct.sku}-${talla.replace('.', '_')}`
          };
          
          // Verificar si el producto ya existe (por SKU)
          if (product.sku && skuMap.has(product.sku.toLowerCase())) {
            // Actualizar producto existente
            const productId = skuMap.get(product.sku.toLowerCase());
            product.id = productId;
            productsToUpdate.push(product);
          } else if (product.sku) {
            // Insertar nuevo producto
            productsToInsert.push(product);
          }
        }
      } catch (err) {
        console.error('Error al procesar el producto con SKU:', sku, err);
      }
    }
    
    console.log(`Productos a insertar: ${productsToInsert.length}`);
    console.log(`Productos a actualizar: ${productsToUpdate.length}`);
    console.log(`Productos omitidos: ${skippedProducts.length}`);
    
    // Insertar nuevos productos
    if (productsToInsert.length > 0) {
      // Insertar en lotes de 100 para evitar límites de tamaño de solicitud
      const batchSize = 100;
      for (let i = 0; i < productsToInsert.length; i += batchSize) {
        const batch = productsToInsert.slice(i, i + batchSize);
        console.log(`Insertando lote ${i / batchSize + 1} de ${Math.ceil(productsToInsert.length / batchSize)}...`);
        
        const { data: insertedData, error: insertError } = await supabase
          .from('products')
          .insert(batch)
          .select();
          
        if (insertError) {
          console.error('Error al insertar productos:', insertError.message);
        } else {
          console.log(`Insertados ${insertedData.length} productos correctamente.`);
        }
      }
    }
    
    // Actualizar productos existentes
    if (productsToUpdate.length > 0) {
      // Actualizar en lotes de 100 para evitar límites de tamaño de solicitud
      const batchSize = 100;
      for (let i = 0; i < productsToUpdate.length; i += batchSize) {
        const batch = productsToUpdate.slice(i, i + batchSize);
        console.log(`Actualizando lote ${i / batchSize + 1} de ${Math.ceil(productsToUpdate.length / batchSize)}...`);
        
        // Actualizar cada producto individualmente
        for (const product of batch) {
          const { id, ...productData } = product;
          const { data: updatedData, error: updateError } = await supabase
            .from('products')
            .update(productData)
            .eq('id', id)
            .select();
            
          if (updateError) {
            console.error(`Error al actualizar producto ${id}:`, updateError.message);
          }
        }
        
        console.log(`Actualizados ${batch.length} productos correctamente.`);
      }
    }
    
    console.log('Importación completada.');
    
  } catch (error) {
    console.error('Error durante la importación:', error);
  }
}

// Función para mostrar ayuda
function showHelp() {
  console.log(`
Uso: node import-products.js <ruta-al-archivo-csv>

Ejemplo: node import-products.js ./productos.csv
  `);
}

// Función principal
async function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0 || args[0] === '--help' || args[0] === '-h') {
    showHelp();
    return;
  }
  
  const csvFilePath = args[0];
  await importProducts(csvFilePath);
}

// Ejecutar la función principal
main().catch(err => {
  console.error('Error no controlado:', err);
  process.exit(1);
});
