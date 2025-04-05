import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';

config();

// Inicializar el cliente de Supabase
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Error: Las variables de entorno VITE_SUPABASE_URL y VITE_SUPABASE_KEY deben estar configuradas.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function updateDatabaseStructure() {
  try {
    console.log('Actualizando estructura de la base de datos...');

    // Agregar columna original_sku a la tabla products si no existe
    const { error: originalSkuError } = await supabase.rpc('execute_sql', {
      query: `
        ALTER TABLE products 
        ADD COLUMN IF NOT EXISTS original_sku TEXT;
      `
    });

    if (originalSkuError) {
      console.error('Error al agregar columna original_sku:', originalSkuError);
      
      // Alternativa usando REST API si RPC no está disponible
      console.log('Intentando método alternativo...');
      
      // Verificar si la columna ya existe
      const { data: columns, error: columnsError } = await supabase
        .from('information_schema.columns')
        .select('column_name')
        .eq('table_name', 'products')
        .eq('column_name', 'original_sku');
      
      if (columnsError) {
        console.error('Error al verificar columna:', columnsError);
        return;
      }
      
      if (!columns || columns.length === 0) {
        console.log('La columna original_sku no existe, se debe crear manualmente en el panel de Supabase.');
        console.log('Ejecuta la siguiente SQL en el Editor SQL de Supabase:');
        console.log(`
          ALTER TABLE products 
          ADD COLUMN IF NOT EXISTS original_sku TEXT;
        `);
      } else {
        console.log('La columna original_sku ya existe.');
      }
    } else {
      console.log('Columna original_sku agregada correctamente.');
    }

    console.log('Actualización de estructura completada.');
  } catch (error) {
    console.error('Error al actualizar la estructura de la base de datos:', error);
  }
}

// Ejecutar la función principal
updateDatabaseStructure();
