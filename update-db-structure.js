#!/usr/bin/env node

// Script para actualizar la estructura de la base de datos para que coincida con el CSV
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'node:fs';
import path from 'node:path';

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

// Función principal
async function main() {
  const command = process.argv[2];
  
  if (!command) {
    showHelp();
    return;
  }
  
  switch (command) {
    case 'check-structure':
      await checkTableStructure('products');
      break;
      
    case 'update-structure':
      await updateDatabaseStructure();
      break;
      
    case 'import-csv':
      if (process.argv.length < 4) {
        console.log('Error: Debe especificar la ruta al archivo CSV.');
        console.log('Uso: node update-db-structure.js import-csv <ruta-al-csv>');
        return;
      }
      await importProductsFromCSV(process.argv[3]);
      break;
      
    default:
      showHelp();
  }
}

function showHelp() {
  console.log(`
Herramienta para actualizar la estructura de la base de datos y cargar productos desde CSV

Comandos disponibles:
  node update-db-structure.js check-structure    - Verificar la estructura actual de la tabla products
  node update-db-structure.js update-structure   - Actualizar la estructura de la tabla products
  node update-db-structure.js import-csv <file>  - Importar productos desde un archivo CSV
  `);
}

// Verificar la estructura actual de la tabla
async function checkTableStructure(tableName) {
  console.log(`Verificando estructura de la tabla '${tableName}'...`);
  
  try {
    // Obtener un registro para examinar la estructura
    const { data, error } = await supabase
      .from(tableName)
      .select('*')
      .limit(1);
      
    if (error) {
      console.error(`Error al consultar la tabla '${tableName}':`, error.message);
      return;
    }
    
    if (!data || data.length === 0) {
      console.log(`La tabla '${tableName}' existe pero no tiene registros para examinar.`);
      
      // Intentar obtener la estructura de la tabla usando información del esquema
      const { data: schemaData, error: schemaError } = await supabase
        .rpc('get_table_columns', { table_name: tableName });
        
      if (schemaError) {
        console.error('Error al obtener información del esquema:', schemaError.message);
        console.log('Nota: Esta operación requiere privilegios de administrador.');
        return;
      }
      
      if (schemaData && schemaData.length > 0) {
        console.log(`Estructura de la tabla '${tableName}' (del esquema):`);
        schemaData.forEach(column => {
          console.log(`- ${column.column_name}: ${column.data_type}`);
        });
      }
      
      return;
    }
    
    console.log(`Estructura actual de la tabla '${tableName}':`);
    const columns = Object.keys(data[0]);
    columns.forEach(column => {
      const value = data[0][column];
      const type = Array.isArray(value) ? 'array' : typeof value;
      console.log(`- ${column}: ${type}${value === null ? ' (null en la muestra)' : ''}`);
    });
    
    // Verificar si faltan columnas necesarias para el CSV
    const requiredColumns = [
      'sku', 'name', 'description', 'silhouette', 'gender', 
      'category_id', 'brand_id', 'product_type', 'rubro', 'status',
      'curva_simple', 'curva_reforzada', 'talla', 'price', 'stock_quantity',
      'images'
    ];
    
    const missingColumns = requiredColumns.filter(col => !columns.includes(col));
    
    if (missingColumns.length > 0) {
      console.log('\nColumnas faltantes para compatibilidad con CSV:');
      missingColumns.forEach(col => console.log(`- ${col}`));
      console.log('\nEjecuta "node update-db-structure.js update-structure" para agregar estas columnas.');
    } else {
      console.log('\nLa estructura de la tabla es compatible con el formato CSV.');
    }
  } catch (err) {
    console.error('Error:', err.message);
  }
}

// Actualizar la estructura de la tabla products
async function updateDatabaseStructure() {
  console.log('Actualizando estructura de la tabla products...');
  console.log('Nota: Esta operación requiere privilegios de administrador.');
  
  try {
    // Generar SQL para agregar las columnas faltantes
    const sql = `
      -- Agregar columna rubro si no existe
      ALTER TABLE products ADD COLUMN IF NOT EXISTS rubro TEXT;
      
      -- Agregar columna curva_simple si no existe
      ALTER TABLE products ADD COLUMN IF NOT EXISTS curva_simple INTEGER;
      
      -- Agregar columna curva_reforzada si no existe
      ALTER TABLE products ADD COLUMN IF NOT EXISTS curva_reforzada INTEGER;
      
      -- Agregar columna talla si no existe
      ALTER TABLE products ADD COLUMN IF NOT EXISTS talla TEXT;
      
      -- Agregar columna stock_quantity si no existe
      ALTER TABLE products ADD COLUMN IF NOT EXISTS stock_quantity INTEGER;
    `;
    
    // Intentar ejecutar el SQL usando RPC (requiere función personalizada en Supabase)
    const { data, error } = await supabase.rpc('execute_sql', { sql });
    
    if (error) {
      console.error('Error al ejecutar SQL:', error.message);
      console.log('\nAlternativa: Usa el editor SQL de Supabase para agregar estas columnas:');
      console.log(sql);
      
      // Intentar agregar las columnas una por una usando la API REST
      console.log('\nIntentando agregar columnas individualmente...');
      
      const columns = [
        { name: 'rubro', type: 'text' },
        { name: 'curva_simple', type: 'integer' },
        { name: 'curva_reforzada', type: 'integer' },
        { name: 'talla', type: 'text' },
        { name: 'stock_quantity', type: 'integer' }
      ];
      
      for (const column of columns) {
        try {
          // Nota: Esta operación no es estándar y probablemente no funcionará
          // con la API pública de Supabase, se incluye como ejemplo
          const { error: colError } = await supabase
            .from('products')
            .alter()
            .add(column.name, column.type);
            
          if (colError) {
            console.error(`Error al agregar columna ${column.name}:`, colError.message);
          } else {
            console.log(`Columna ${column.name} agregada correctamente.`);
          }
        } catch (colErr) {
          console.error(`Error al agregar columna ${column.name}:`, colErr.message);
        }
      }
      
      console.log('\nPara asegurar que las columnas se agreguen correctamente, usa el editor SQL de Supabase.');
    } else {
      console.log('Estructura de la tabla actualizada correctamente.');
    }
  } catch (err) {
    console.error('Error:', err.message);
  }
}

// Importar productos desde un archivo CSV
async function importProductsFromCSV(csvFilePath) {
  console.log(`Importando productos desde ${csvFilePath}...`);
  
  try {
    // Verificar que el archivo existe
    if (!fs.existsSync(csvFilePath)) {
      console.error(`Error: El archivo ${csvFilePath} no existe.`);
      return;
    }
    
    // Leer el archivo CSV
    const csvContent = fs.readFileSync(csvFilePath, 'utf8');
    const lines = csvContent.split('\n');
    
    // Obtener encabezados
    const headers = lines[0].split(',').map(h => h.trim());
    
    // Mapeo de columnas CSV a columnas de la base de datos
    const columnMapping = {
      'codigo': 'sku',
      'descripcion': 'name',
      'silueta': 'silhouette',
      'genero': 'gender',
      'categoria': 'product_type',
      'marca': 'brand_id', // Necesitará procesamiento adicional
      'rubro': 'rubro',
      'estado': 'status',
      'curva simple': 'curva_simple',
      'curva reforzada': 'curva_reforzada',
      'talla': 'talla',
      'Precio': 'price',
      'Cantidad Disponible': 'stock_quantity',
      'IMAGEN_1': 'images', // Necesitará procesamiento adicional
      'IMAGEN_2': 'images', // Se combinará en un array
      'IMAGEN_3': 'images',
      'IMAGEN_4': 'images',
      'IMAGEN_5': 'images'
    };
    
    // Verificar que todas las columnas necesarias están presentes
    const requiredColumns = ['codigo', 'descripcion', 'marca', 'rubro'];
    const missingColumns = requiredColumns.filter(col => !headers.includes(col));
    
    if (missingColumns.length > 0) {
      console.error('Error: Faltan columnas requeridas en el CSV:', missingColumns.join(', '));
      return;
    }
    
    // Procesar cada línea del CSV (excepto la primera que son los encabezados)
    const products = [];
    
    for (let i = 1; i < lines.length; i++) {
      if (!lines[i].trim()) continue; // Saltar líneas vacías
      
      const values = lines[i].split(',').map(v => v.trim());
      
      if (values.length !== headers.length) {
        console.warn(`Advertencia: La línea ${i+1} tiene un número incorrecto de columnas. Se omitirá.`);
        continue;
      }
      
      // Crear objeto de producto
      const product = {
        // Campos predeterminados
        enabled: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      
      // Procesar cada columna
      for (let j = 0; j < headers.length; j++) {
        const header = headers[j];
        const value = values[j];
        
        // Saltar columnas vacías
        if (!value) continue;
        
        // Mapear la columna del CSV a la columna de la base de datos
        const dbColumn = columnMapping[header];
        
        if (!dbColumn) continue; // Saltar columnas que no están en el mapeo
        
        // Procesamiento especial para ciertos campos
        if (header.startsWith('IMAGEN_')) {
          // Inicializar el array de imágenes si no existe
          if (!product.images) product.images = [];
          
          // Agregar la imagen al array
          product.images.push(value);
        } else if (header === 'marca') {
          // Aquí deberíamos buscar el ID de la marca por su nombre
          // Por ahora, guardamos el nombre y lo procesaremos después
          product.brand_name = value;
        } else if (header === 'Precio') {
          // Convertir a número
          product[dbColumn] = parseFloat(value);
        } else if (header === 'Cantidad Disponible' || header === 'curva simple' || header === 'curva reforzada') {
          // Convertir a entero
          product[dbColumn] = parseInt(value, 10);
        } else {
          // Asignar el valor directamente
          product[dbColumn] = value;
        }
      }
      
      products.push(product);
    }
    
    console.log(`Se procesaron ${products.length} productos del CSV.`);
    
    // Procesar las marcas
    console.log('Procesando marcas...');
    
    // Obtener todas las marcas únicas del CSV
    const uniqueBrandNames = [...new Set(products.map(p => p.brand_name))].filter(Boolean);
    
    console.log(`Marcas únicas encontradas: ${uniqueBrandNames.join(', ')}`);
    
    // Buscar IDs de marcas existentes
    const brandMapping = {};
    
    for (const brandName of uniqueBrandNames) {
      // Buscar la marca en la base de datos
      const { data: brands, error } = await supabase
        .from('brands')
        .select('id, name')
        .ilike('name', brandName);
        
      if (error) {
        console.error(`Error al buscar la marca ${brandName}:`, error.message);
        continue;
      }
      
      if (brands && brands.length > 0) {
        // Usar el primer resultado que coincida
        brandMapping[brandName] = brands[0].id;
        console.log(`Marca "${brandName}" encontrada con ID: ${brands[0].id}`);
      } else {
        // Crear nueva marca
        console.log(`Creando nueva marca: ${brandName}`);
        
        const { data: newBrand, error: createError } = await supabase
          .from('brands')
          .insert([{ name: brandName }])
          .select();
          
        if (createError) {
          console.error(`Error al crear la marca ${brandName}:`, createError.message);
        } else if (newBrand && newBrand.length > 0) {
          brandMapping[brandName] = newBrand[0].id;
          console.log(`Nueva marca "${brandName}" creada con ID: ${newBrand[0].id}`);
        }
      }
    }
    
    // Actualizar los productos con los IDs de marca
    for (const product of products) {
      if (product.brand_name && brandMapping[product.brand_name]) {
        product.brand_id = brandMapping[product.brand_name];
      }
      
      // Eliminar el campo temporal
      delete product.brand_name;
    }
    
    // Insertar productos en la base de datos
    console.log('Insertando productos en la base de datos...');
    
    // Insertar en lotes de 20 para evitar límites de tamaño de solicitud
    const batchSize = 20;
    
    for (let i = 0; i < products.length; i += batchSize) {
      const batch = products.slice(i, i + batchSize);
      
      const { data, error } = await supabase
        .from('products')
        .insert(batch);
        
      if (error) {
        console.error(`Error al insertar lote de productos (${i+1}-${i+batch.length}):`, error.message);
      } else {
        console.log(`Lote ${Math.floor(i/batchSize) + 1} insertado correctamente (${batch.length} productos).`);
      }
    }
    
    console.log('Importación de productos completada.');
  } catch (err) {
    console.error('Error al importar productos:', err.message);
  }
}

// Ejecutar la función principal
main().catch(err => {
  console.error('Error no controlado:', err);
  process.exit(1);
});
