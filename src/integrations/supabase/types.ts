export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      brands: {
        Row: {
          created_at: string
          id: string
          name: string
          updated_at: string
          logo?: string
          product_types?: string[]
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          updated_at?: string
          logo?: string
          product_types?: string[]
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          updated_at?: string
          logo?: string
          product_types?: string[]
        }
        Relationships: []
      }
      categories: {
        Row: {
          created_at: string
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      product_variants: {
        Row: {
          created_at: string
          id: string
          product_id: string
          reinforced_curve: number | null
          simple_curve: number | null
          size: string
          stock_quantity: number | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          product_id: string
          reinforced_curve?: number | null
          simple_curve?: number | null
          size: string
          stock_quantity?: number | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          product_id?: string
          reinforced_curve?: number | null
          simple_curve?: number | null
          size?: string
          stock_quantity?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_variants_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          brand: string | null
          category: string | null
          created_at: string
          description: string | null
          gender: string | null
          id: string
          images: string[] | null
          name: string
          price: number | null
          product_type: string | null
          silhouette: string | null
          sku: string
          status: string | null
          updated_at: string
          enabled: boolean | null
          rubro: string | null
        }
        Insert: {
          brand?: string | null
          category?: string | null
          created_at?: string
          description?: string | null
          gender?: string | null
          id?: string
          images?: string[] | null
          name: string
          price?: number | null
          product_type?: string | null
          silhouette?: string | null
          sku: string
          status?: string | null
          updated_at?: string
          enabled?: boolean | null
          rubro?: string | null
        }
        Update: {
          brand?: string | null
          category?: string | null
          created_at?: string
          description?: string | null
          gender?: string | null
          id?: string
          images?: string[] | null
          name?: string
          price?: number | null
          product_type?: string | null
          silhouette?: string | null
          sku?: string
          status?: string | null
          updated_at?: string
          enabled?: boolean | null
          rubro?: string | null
        }
        Relationships: []
      }
      users: {
        Row: {
          id: string
          email: string
          name: string
          role: 'superadmin' | 'admin' | 'cliente'
          active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          email: string
          name: string
          role: 'superadmin' | 'admin' | 'cliente'
          active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          name?: string
          role?: 'superadmin' | 'admin' | 'cliente'
          active?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      user_brands: {
        Row: {
          id: string
          user_id: string
          brand_id: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          brand_id: string
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          brand_id?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_brands_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_brands_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          }
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      create_superadmin_direct: {
        Args: {
          user_id: string
          user_email: string
          user_name: string
        }
        Returns: boolean
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type PublicSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  PublicTableNameOrOptions extends
    | keyof (PublicSchema["Tables"] & PublicSchema["Views"])
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
        Database[PublicTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
      Database[PublicTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : PublicTableNameOrOptions extends keyof (PublicSchema["Tables"] &
        PublicSchema["Views"])
    ? (PublicSchema["Tables"] &
        PublicSchema["Views"])[PublicTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  PublicEnumNameOrOptions extends
    | keyof PublicSchema["Enums"]
    | { schema: keyof Database },
  EnumName extends PublicEnumNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = PublicEnumNameOrOptions extends { schema: keyof Database }
  ? Database[PublicEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : PublicEnumNameOrOptions extends keyof PublicSchema["Enums"]
    ? PublicSchema["Enums"][PublicEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicTypeNameOrOptions extends
    | keyof PublicSchema["CompositeTypes"]
    | { schema: keyof Database },
  TypeName extends PublicTypeNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTypeNameOrOptions["schema"]]["CompositeTypes"][TypeName] extends
      infer R
    ? R
    : never
  : PublicTypeNameOrOptions extends keyof PublicSchema["CompositeTypes"]
    ? PublicSchema["CompositeTypes"][PublicTypeNameOrOptions] extends infer R
      ? R
      : never
    : never
