// Simple Supabase CLI alternative for direct database access
import { createClient } from '@supabase/supabase-js';

// Get credentials from your existing client file
const SUPABASE_URL = "https://nplonbsyfkxcffwyaoze.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5wbG9uYnN5Zmt4Y2Zmd3lhb3plIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDM2NDQ0NjksImV4cCI6MjA1OTIyMDQ2OX0.syOpHyzMKsMd2WOR1HWj17MTBZpeEcEHNE1ipLEN--0";

// Initialize the Supabase client
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Command line arguments
const args = process.argv.slice(2);
const command = args[0];

async function main() {
  try {
    switch (command) {
      case 'list-tables':
        // List available tables using introspection
        console.log('Listing available tables...');
        
        // Try to fetch from products table to see if it exists
        const { data: productCheck, error: productCheckError } = await supabase
          .from('products')
          .select('id')
          .limit(1);
          
        console.log('Available tables:');
        console.log('- products' + (productCheckError ? ' (error accessing)' : ' (accessible)'));
        
        // Check for brands table
        const { data: brandCheck, error: brandCheckError } = await supabase
          .from('brands')
          .select('id')
          .limit(1);
          
        console.log('- brands' + (brandCheckError ? ' (error accessing)' : ' (accessible)'));
        
        // Check for categories table
        const { data: categoryCheck, error: categoryCheckError } = await supabase
          .from('categories')
          .select('id')
          .limit(1);
          
        console.log('- categories' + (categoryCheckError ? ' (error accessing)' : ' (accessible)'));
        break;

      case 'list-products':
        // List all products
        console.log('Fetching products...');
        const { data: products, error: productsError } = await supabase
          .from('products')
          .select('*')
          .limit(10);
        
        if (productsError) {
          console.error('Error fetching products:', productsError.message);
          return;
        }
        
        console.log(`Found ${products.length} products:`);
        products.forEach(product => {
          console.log(`ID: ${product.id}, SKU: ${product.sku}, Name: ${product.name}`);
          console.log(`Brand ID: ${product.brand_id}, Category ID: ${product.category_id}`);
          console.log(`Product Type: ${product.product_type || 'N/A'}, Rubro: ${product.rubro || 'N/A'}`);
          console.log('---');
        });
        break;

      case 'check-product-types':
        // Check distinct product_type values
        console.log('Checking product types...');
        const { data: productTypes, error: productTypesError } = await supabase
          .from('products')
          .select('product_type')
          .not('product_type', 'is', null);
        
        if (productTypesError) {
          console.error('Error fetching product types:', productTypesError.message);
          return;
        }
        
        // Extract unique values
        const uniqueTypes = [...new Set(productTypes.map(item => item.product_type).filter(Boolean))];
        console.log('Distinct product types:');
        uniqueTypes.forEach(type => console.log(`- ${type}`));
        break;

      case 'update-rubro':
        // Update rubro values for products based on product_type
        console.log('Updating rubro values based on product_type...');
        
        // First, let's check what product types exist
        const { data: typesForUpdate, error: typesError } = await supabase
          .from('products')
          .select('id, product_type')
          .not('product_type', 'is', null);
          
        if (typesError) {
          console.error('Error fetching product types:', typesError.message);
          return;
        }
        
        // Map product types to rubros
        const typeToRubroMap = {
          'ropa': 'prendas',
          'prenda': 'prendas',
          'vestimenta': 'prendas',
          'indumentaria': 'prendas',
          'calzado': 'calzados',
          'zapato': 'calzados',
          'zapatilla': 'calzados',
          'bota': 'calzados',
          'accesorio': 'accesorios',
          'complemento': 'accesorios',
          'joya': 'accesorios',
          'reloj': 'accesorios',
          'bolso': 'accesorios'
        };
        
        // Count products by type
        const productsByType = {};
        typesForUpdate.forEach(product => {
          const type = (product.product_type || '').toLowerCase();
          productsByType[type] = (productsByType[type] || 0) + 1;
        });
        
        console.log('Products by type:');
        Object.entries(productsByType).forEach(([type, count]) => {
          console.log(`- ${type}: ${count} products`);
        });
        
        // If specific parameters are provided, update those products
        if (args.length >= 2) {
          const productType = args[1].toLowerCase();
          const rubroValue = args.length >= 3 ? args[2] : null;
          
          // If no rubro value is provided, try to determine it from the map
          const targetRubro = rubroValue || Object.entries(typeToRubroMap).find(([key]) => 
            productType.includes(key) || key.includes(productType)
          )?.[1] || null;
          
          if (!targetRubro) {
            console.log(`Could not determine appropriate rubro for type '${productType}'`);
            console.log('Please specify a rubro value: node supabase-cli.js update-rubro <product_type> <rubro_value>');
            return;
          }
          
          console.log(`Updating products with product_type containing '${productType}' to rubro='${targetRubro}'...`);
          
          // Find products with matching product_type
          const { data: matchingProducts, error: matchError } = await supabase
            .from('products')
            .select('id, product_type')
            .ilike('product_type', `%${productType}%`);
            
          if (matchError) {
            console.error('Error finding matching products:', matchError.message);
            return;
          }
          
          console.log(`Found ${matchingProducts.length} matching products`);
          
          if (matchingProducts.length > 0) {
            // Update these products
            const { data: updateResult, error: updateError } = await supabase
              .from('products')
              .update({ rubro: targetRubro })
              .in('id', matchingProducts.map(p => p.id));
              
            if (updateError) {
              console.error('Error updating products:', updateError.message);
              return;
            }
            
            console.log(`Successfully updated ${matchingProducts.length} products to rubro='${targetRubro}'`);
          }
        } else {
          console.log('Usage: node supabase-cli.js update-rubro <product_type> [rubro_value]');
        }
        break;

      case 'check-structure':
        // Check the structure of a table
        if (args.length < 2) {
          console.log('Usage: node supabase-cli.js check-structure <table_name>');
          return;
        }
        
        const tableName = args[1];
        console.log(`Checking structure of table '${tableName}'...`);
        
        // Use a simple query to get one row and examine its structure
        const { data: sampleRow, error: structError } = await supabase
          .from(tableName)
          .select('*')
          .limit(1);
          
        if (structError) {
          console.error(`Error fetching structure of '${tableName}':`, structError.message);
          return;
        }
        
        if (!sampleRow || sampleRow.length === 0) {
          console.log(`Table '${tableName}' exists but has no rows to examine.`);
          return;
        }
        
        console.log(`Structure of table '${tableName}':`);
        const columns = Object.keys(sampleRow[0]);
        columns.forEach(column => {
          const value = sampleRow[0][column];
          const type = Array.isArray(value) ? 'array' : typeof value;
          console.log(`- ${column}: ${type}${value === null ? ' (null in sample)' : ''}`);
        });
        break;
        
      case 'fix-product-structure':
        // Add missing columns to match CSV structure
        console.log('Checking and fixing products table structure to match CSV columns...');
        
        // First, let's check current structure
        const { data: productSample, error: productSampleError } = await supabase
          .from('products')
          .select('*')
          .limit(1);
          
        if (productSampleError) {
          console.error('Error fetching product structure:', productSampleError.message);
          return;
        }
        
        if (!productSample || productSample.length === 0) {
          console.log('Products table exists but has no rows to examine.');
          // We can still proceed with the structure update
        }
        
        // Check if we need to add the 'rubro' column
        console.log('\nAttempting to add missing columns...');
        console.log('Note: This requires database admin privileges. If you get permission errors,');
        console.log('you will need to make these changes through the Supabase dashboard or SQL editor.');
        
        try {
          // Try to execute SQL to add missing columns
          // Note: This requires admin privileges and might not work with anon key
          const { data: sqlResult, error: sqlError } = await supabase.rpc('execute_sql', {
            sql: `
              -- Add rubro column if it doesn't exist
              ALTER TABLE products ADD COLUMN IF NOT EXISTS rubro TEXT;
              
              -- Add curva_simple column if it doesn't exist
              ALTER TABLE products ADD COLUMN IF NOT EXISTS curva_simple INTEGER;
              
              -- Add curva_reforzada column if it doesn't exist
              ALTER TABLE products ADD COLUMN IF NOT EXISTS curva_reforzada INTEGER;
              
              -- Add talla column if it doesn't exist
              ALTER TABLE products ADD COLUMN IF NOT EXISTS talla TEXT;
              
              -- Add stock_quantity column if it doesn't exist
              ALTER TABLE products ADD COLUMN IF NOT EXISTS stock_quantity INTEGER;
            `
          });
          
          if (sqlError) {
            console.error('Error executing SQL:', sqlError.message);
            console.log('\nAlternative: Use the Supabase dashboard SQL editor to add these columns:');
            console.log(`
-- Add missing columns to products table
ALTER TABLE products ADD COLUMN IF NOT EXISTS rubro TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS curva_simple INTEGER;
ALTER TABLE products ADD COLUMN IF NOT EXISTS curva_reforzada INTEGER;
ALTER TABLE products ADD COLUMN IF NOT EXISTS talla TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS stock_quantity INTEGER;
            `);
          } else {
            console.log('Successfully added missing columns!');
          }
        } catch (err) {
          console.error('Error:', err.message);
          console.log('\nAlternative: Use the Supabase dashboard SQL editor to add these columns:');
          console.log(`
-- Add missing columns to products table
ALTER TABLE products ADD COLUMN IF NOT EXISTS rubro TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS curva_simple INTEGER;
ALTER TABLE products ADD COLUMN IF NOT EXISTS curva_reforzada INTEGER;
ALTER TABLE products ADD COLUMN IF NOT EXISTS talla TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS stock_quantity INTEGER;
          `);
        }
        
        // Now let's update the Product interface in catalog.tsx
        console.log('\nTo update your Product interface in catalog.tsx, use this definition:');
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
  enabled: boolean | null;
}
`);
        break;
        
      default:
        console.log(`
Supabase CLI Alternative - Commands:
  node supabase-cli.js list-tables            - List available tables
  node supabase-cli.js list-products          - List first 10 products
  node supabase-cli.js check-product-types    - Check distinct product_type values
  node supabase-cli.js check-structure <table> - Check structure of a table
  node supabase-cli.js fix-product-structure   - Add missing columns to match CSV structure
  node supabase-cli.js update-rubro <type> [value] - Update rubro values based on product_type
        `);
    }
  } catch (error) {
    console.error('Error:', error.message);
  }
}

main();
