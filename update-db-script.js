// Script para actualizar la estructura de la base de datos de Supabase
import { createClient } from '@supabase/supabase-js';
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

// Función para actualizar la estructura de la tabla products
async function updateProductsTable() {
  console.log('Actualizando la estructura de la tabla products...');
  
  try {
    // Columnas a agregar
    const columnsToAdd = [
      { name: 'rubro', type: 'TEXT' },
      { name: 'curva_simple', type: 'INTEGER' },
      { name: 'curva_reforzada', type: 'INTEGER' },
      { name: 'talla', type: 'TEXT' },
      { name: 'stock_quantity', type: 'INTEGER' }
    ];
    
    // Verificar qué columnas existen actualmente
    const { data: product, error: productError } = await supabase
      .from('products')
      .select('*')
      .limit(1);
      
    if (productError) {
      console.error('Error al verificar la tabla products:', productError.message);
      return;
    }
    
    if (!product || product.length === 0) {
      console.log('La tabla products existe pero no tiene registros para examinar.');
      // Intentamos agregar todas las columnas de todos modos
      for (const column of columnsToAdd) {
        await addColumn('products', column.name, column.type);
      }
      return;
    }
    
    // Obtener las columnas existentes
    const existingColumns = Object.keys(product[0]);
    
    // Agregar las columnas faltantes
    for (const column of columnsToAdd) {
      if (!existingColumns.includes(column.name)) {
        await addColumn('products', column.name, column.type);
      } else {
        console.log(`La columna '${column.name}' ya existe en la tabla products.`);
      }
    }
    
    console.log('Estructura de la tabla products actualizada correctamente.');
  } catch (error) {
    console.error('Error al actualizar la estructura de la tabla products:', error);
  }
}

// Función para agregar una columna a una tabla
async function addColumn(table, columnName, columnType) {
  try {
    // Usar la API de Supabase para ejecutar SQL personalizado
    const { error } = await supabase.rpc('execute_sql', {
      query: `ALTER TABLE ${table} ADD COLUMN IF NOT EXISTS ${columnName} ${columnType};`
    });
    
    if (error) {
      console.error(`Error al agregar la columna '${columnName}' a la tabla '${table}':`, error.message);
      
      // Mostrar SQL para ejecución manual
      console.log(`\nEjecuta manualmente este SQL en el editor SQL de Supabase:\n`);
      console.log(`ALTER TABLE ${table} ADD COLUMN IF NOT EXISTS ${columnName} ${columnType};\n`);
    } else {
      console.log(`Columna '${columnName}' agregada correctamente a la tabla '${table}'.`);
    }
  } catch (error) {
    console.error(`Error al agregar la columna '${columnName}' a la tabla '${table}':`, error);
    
    // Mostrar SQL para ejecución manual
    console.log(`\nEjecuta manualmente este SQL en el editor SQL de Supabase:\n`);
    console.log(`ALTER TABLE ${table} ADD COLUMN IF NOT EXISTS ${columnName} ${columnType};\n`);
  }
}

// Ejecutar la función principal
updateProductsTable().catch(err => {
  console.error('Error no controlado:', err);
  process.exit(1);
});
