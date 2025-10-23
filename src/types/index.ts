import { User } from "@/contexts/auth-context";
import { Database } from "@/integrations/supabase/types";

/**
 * Brand type from the Database
 */
export type Brand = Database['public']['Tables']['brands']['Row'];

/**
 * Product type from the Database
 */
export type Product = Database['public']['Tables']['products']['Row'] & {
  total_stock?: number;
  variants?: Array<{
    id: string;
    product_id: string;
    sku?: string;
    size: string;
    simple_curve: number;
    reinforced_curve: number;
    stock_quantity: number;
    created_at?: string;
    updated_at?: string;
  }>;
};

/**
 * Category type from the Database
 */
export type Category = Database['public']['Tables']['categories']['Row'];

/**
 * Role type for users
 */
export type UserRole = 'superadmin' | 'admin' | 'cliente';

/**
 * Re-export User type from auth context
 */
export type { User };

/**
 * Cart item type
 */
export interface CartItem {
  productId: string;
  name: string;
  code: string;
  price: number;
  quantity: number;
  sizes?: {
    [size: string]: number;
  };
  imageUrl?: string;
}

/**
 * Order type from Database
 */
export type Order = Database['public']['Tables']['orders']['Row'] & {
  user?: User;
  items?: OrderItem[];
};

/**
 * Order Item type from Database
 */
export type OrderItem = Database['public']['Tables']['order_items']['Row'];

/**
 * Order with complete data for display
 */
export interface OrderWithDetails extends Order {
  user: User;
  items: OrderItem[];
}

/**
 * Order status type
 */
export type OrderStatus = 'pending' | 'confirmed' | 'processing' | 'completed' | 'cancelled';

/**
 * Pagination result type for any data
 */
export interface PaginatedResult<T> {
  data: T[];
  nextCursor: string | null;
  hasNextPage: boolean;
} 