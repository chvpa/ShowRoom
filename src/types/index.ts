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
 * Order type
 */
export interface Order {
  id: string;
  userId: string;
  brandId: string;
  items: CartItem[];
  totalAmount: number;
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled';
  createdAt: string;
  updatedAt: string;
}

/**
 * Pagination result type for any data
 */
export interface PaginatedResult<T> {
  data: T[];
  nextCursor: string | null;
  hasNextPage: boolean;
} 