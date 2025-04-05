// Script simple para verificar la estructura de la base de datos
import { createClient } from '@supabase/supabase-js';

// Obtener las variables de entorno directamente del archivo .env
import { config } from 'dotenv';
config();

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
  try {
    // Verificar las tablas disponibles
    console.log('Verificando tablas disponibles...');
    const { data: tables, error: tablesError } = await supabase
      .from('pg_catalog.pg_tables')
      .select('tablename')
      .eq('schemaname', 'public');
      
    if (tablesError) {
      console.log('No se pudo acceder a pg_tables, verificando tablas específicas...');
      
      // Verificar tablas específicas
      const tablesToCheck = ['products', 'brands', 'categories'];
      const availableTables = [];
      
      for (const table of tablesToCheck) {
        const { data, error } = await supabase
          .from(table)
          .select('count(*)', { count: 'exact', head: true });
          
        if (!error) {
          availableTables.push(table);
        }
      }
      
      console.log('Tablas disponibles:');
      availableTables.forEach(table => console.log(`- ${table} (accesible)`));
    } else {
      console.log('Tablas disponibles:');
      tables.forEach(table => console.log(`- ${table.tablename}`));
    }
    
    // Verificar la estructura de la tabla products
    console.log('\nVerificando estructura de la tabla products...');
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
      return;
    }
    
    console.log('Estructura actual de la tabla products:');
    const columns = Object.keys(product[0]);
    columns.forEach(column => {
      const value = product[0][column];
      const type = Array.isArray(value) ? 'array' : typeof value;
      console.log(`- ${column}: ${type}${value === null ? ' (null)' : ''}`);
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
      
      console.log('\nSQL para agregar columnas faltantes:');
      console.log(`
-- Ejecutar este SQL en el editor SQL de Supabase
${missingColumns.map(col => {
  const type = ['curva_simple', 'curva_reforzada', 'stock_quantity'].includes(col) 
    ? 'INTEGER' 
    : ['price'].includes(col) 
      ? 'NUMERIC' 
      : ['images'].includes(col) 
        ? 'TEXT[]' 
        : 'TEXT';
  return `ALTER TABLE products ADD COLUMN IF NOT EXISTS ${col} ${type};`;
}).join('\n')}
      `);
      
      console.log('\nActualización del Product interface en catalog.tsx:');
      console.log(`
interface Product {
  id: string;
  sku: string;            // codigo in CSV
  name: string;           // descripcion in CSV
  description: string | null;
  silhouette: string | null;  // silueta in CSV
  gender: string | null;      // genero in CSV
  category_id: string | null; 
  brand_id: string | null;    // marca in CSV (should store brand name or ID)
  product_type: string | null; // categoria in CSV
  rubro: string | null;       // rubro in CSV (prendas, calzados, accesorios)
  status: string | null;      // estado in CSV
  curva_simple: number | null;    // curva simple in CSV
  curva_reforzada: number | null; // curva reforzada in CSV
  talla: string | null;           // talla in CSV
  price: number | null;           // Precio in CSV
  stock_quantity: number | null;  // Cantidad Disponible in CSV
  images: string[] | null;        // IMAGEN_1 to IMAGEN_5 in CSV
  created_at: string;
  updated_at: string;
  // Custom fields for UI purposes
  category?: string;
  total_stock?: number;
  enabled?: boolean;
}
      `);
      
      console.log('\nCódigo para TypeScript en fetchProductsByCategory:');
      console.log(`
// Añadir esta línea después de obtener los datos de Supabase
const productsData = data as unknown as Product[];

// Y luego usar productsData en lugar de data en el resto de la función
      `);
    } else {
      console.log('\nLa estructura de la tabla es compatible con el formato CSV.');
    }
    
    // Verificar los productos existentes
    console.log('\nVerificando productos existentes...');
    const { data: products, error: productsError } = await supabase
      .from('products')
      .select('*')
      .limit(10);
      
    if (productsError) {
      console.error('Error al verificar productos:', productsError.message);
      return;
    }
    
    console.log(`Encontrados ${products.length} productos:`);
    products.forEach(p => {
      console.log(`ID: ${p.id}, SKU: ${p.sku}, Name: ${p.name}`);
      console.log(`Brand ID: ${p.brand_id}, Category ID: ${p.category_id}`);
      console.log(`Product Type: ${p.product_type}, Rubro: ${p.rubro || 'N/A'}`);
      console.log('---');
    });
    
  } catch (err) {
    console.error('Error:', err);
  }
}

// Ejecutar la función principal
main().catch(err => {
  console.error('Error no controlado:', err);
  process.exit(1);
});
