export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      categories: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          name: string
          slug: string
          sort_order: number
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          slug: string
          sort_order?: number
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          slug?: string
          sort_order?: number
        }
        Relationships: []
      }
      coupons: {
        Row: {
          code: string
          created_at: string
          discount_type: string
          end_at: string | null
          id: string
          is_active: boolean
          min_order_amount: number | null
          start_at: string | null
          value: number
        }
        Insert: {
          code: string
          created_at?: string
          discount_type: string
          end_at?: string | null
          id?: string
          is_active?: boolean
          min_order_amount?: number | null
          start_at?: string | null
          value: number
        }
        Update: {
          code?: string
          created_at?: string
          discount_type?: string
          end_at?: string | null
          id?: string
          is_active?: boolean
          min_order_amount?: number | null
          start_at?: string | null
          value?: number
        }
        Relationships: []
      }
      customer_addresses: {
        Row: {
          address_line1: string
          address_line2: string | null
          city: string
          created_at: string
          customer_id: string
          id: string
          is_default: boolean
          island: string
          label: string
          phone: string | null
          postal_code: string | null
          updated_at: string
        }
        Insert: {
          address_line1: string
          address_line2?: string | null
          city: string
          created_at?: string
          customer_id: string
          id?: string
          is_default?: boolean
          island: string
          label?: string
          phone?: string | null
          postal_code?: string | null
          updated_at?: string
        }
        Update: {
          address_line1?: string
          address_line2?: string | null
          city?: string
          created_at?: string
          customer_id?: string
          id?: string
          is_default?: boolean
          island?: string
          label?: string
          phone?: string | null
          postal_code?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_addresses_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      customers: {
        Row: {
          address: string | null
          auth_user_id: string | null
          created_at: string
          customer_tier: string | null
          email: string | null
          id: string
          is_favorite: boolean
          island: string | null
          loyalty_points: number | null
          name: string
          phone: string | null
          tier_discount: number | null
        }
        Insert: {
          address?: string | null
          auth_user_id?: string | null
          created_at?: string
          customer_tier?: string | null
          email?: string | null
          id?: string
          is_favorite?: boolean
          island?: string | null
          loyalty_points?: number | null
          name: string
          phone?: string | null
          tier_discount?: number | null
        }
        Update: {
          address?: string | null
          auth_user_id?: string | null
          created_at?: string
          customer_tier?: string | null
          email?: string | null
          id?: string
          is_favorite?: boolean
          island?: string | null
          loyalty_points?: number | null
          name?: string
          phone?: string | null
          tier_discount?: number | null
        }
        Relationships: []
      }
      gift_cards: {
        Row: {
          balance: number
          code: string
          created_at: string
          id: string
          initial_balance: number
          is_active: boolean
          used_at: string | null
        }
        Insert: {
          balance?: number
          code: string
          created_at?: string
          id?: string
          initial_balance: number
          is_active?: boolean
          used_at?: string | null
        }
        Update: {
          balance?: number
          code?: string
          created_at?: string
          id?: string
          initial_balance?: number
          is_active?: boolean
          used_at?: string | null
        }
        Relationships: []
      }
      inventory: {
        Row: {
          created_at: string
          id: string
          location: string
          product_id: string
          qty_on_hand: number
          qty_reserved: number
          reorder_level: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          location?: string
          product_id: string
          qty_on_hand?: number
          qty_reserved?: number
          reorder_level?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          location?: string
          product_id?: string
          qty_on_hand?: number
          qty_reserved?: number
          reorder_level?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventory_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: true
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_adjustments: {
        Row: {
          adjustment_type: string
          created_at: string
          id: string
          notes: string | null
          product_id: string
          qty_change: number
          staff_id: string | null
        }
        Insert: {
          adjustment_type: string
          created_at?: string
          id?: string
          notes?: string | null
          product_id: string
          qty_change: number
          staff_id?: string | null
        }
        Update: {
          adjustment_type?: string
          created_at?: string
          id?: string
          notes?: string | null
          product_id?: string
          qty_change?: number
          staff_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inventory_adjustments_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_adjustments_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
        ]
      }
      loyalty_transactions: {
        Row: {
          created_at: string
          customer_id: string | null
          description: string | null
          id: string
          order_id: string | null
          points: number
          type: string
        }
        Insert: {
          created_at?: string
          customer_id?: string | null
          description?: string | null
          id?: string
          order_id?: string | null
          points: number
          type: string
        }
        Update: {
          created_at?: string
          customer_id?: string | null
          description?: string | null
          id?: string
          order_id?: string | null
          points?: number
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "loyalty_transactions_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "loyalty_transactions_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      offline_queue: {
        Row: {
          created_at: string
          id: string
          payload: Json
          register_id: string | null
          staff_id: string | null
          status: string | null
          synced_at: string | null
          transaction_type: string
        }
        Insert: {
          created_at?: string
          id?: string
          payload: Json
          register_id?: string | null
          staff_id?: string | null
          status?: string | null
          synced_at?: string | null
          transaction_type: string
        }
        Update: {
          created_at?: string
          id?: string
          payload?: Json
          register_id?: string | null
          staff_id?: string | null
          status?: string | null
          synced_at?: string | null
          transaction_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "offline_queue_register_id_fkey"
            columns: ["register_id"]
            isOneToOne: false
            referencedRelation: "registers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "offline_queue_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
        ]
      }
      order_items: {
        Row: {
          created_at: string
          id: string
          line_total: number
          name: string
          order_id: string
          product_id: string | null
          qty: number
          sku: string
          unit_price: number
        }
        Insert: {
          created_at?: string
          id?: string
          line_total: number
          name: string
          order_id: string
          product_id?: string | null
          qty?: number
          sku: string
          unit_price: number
        }
        Update: {
          created_at?: string
          id?: string
          line_total?: number
          name?: string
          order_id?: string
          product_id?: string | null
          qty?: number
          sku?: string
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          channel: string
          created_at: string
          customer_id: string | null
          discount_amount: number
          fulfillment_method: string
          id: string
          notes: string | null
          order_number: string
          payment_method: string | null
          payment_status: string
          pickup_code: string | null
          register_id: string | null
          staff_id: string | null
          status: string
          subtotal: number
          total: number
          updated_at: string
          vat_amount: number
        }
        Insert: {
          channel: string
          created_at?: string
          customer_id?: string | null
          discount_amount?: number
          fulfillment_method?: string
          id?: string
          notes?: string | null
          order_number: string
          payment_method?: string | null
          payment_status?: string
          pickup_code?: string | null
          register_id?: string | null
          staff_id?: string | null
          status?: string
          subtotal?: number
          total?: number
          updated_at?: string
          vat_amount?: number
        }
        Update: {
          channel?: string
          created_at?: string
          customer_id?: string | null
          discount_amount?: number
          fulfillment_method?: string
          id?: string
          notes?: string | null
          order_number?: string
          payment_method?: string | null
          payment_status?: string
          pickup_code?: string | null
          register_id?: string | null
          staff_id?: string | null
          status?: string
          subtotal?: number
          total?: number
          updated_at?: string
          vat_amount?: number
        }
        Relationships: [
          {
            foreignKeyName: "orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_register_id_fkey"
            columns: ["register_id"]
            isOneToOne: false
            referencedRelation: "registers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount: number
          created_at: string
          id: string
          method: string
          order_id: string
          reference: string | null
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          method: string
          order_id: string
          reference?: string | null
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          method?: string
          order_id?: string
          reference?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payments_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      pos_activity_logs: {
        Row: {
          action: string
          created_at: string
          details: Json | null
          id: string
          register_id: string | null
          staff_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          details?: Json | null
          id?: string
          register_id?: string | null
          staff_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          details?: Json | null
          id?: string
          register_id?: string | null
          staff_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pos_activity_logs_register_id_fkey"
            columns: ["register_id"]
            isOneToOne: false
            referencedRelation: "registers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pos_activity_logs_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          barcode: string | null
          category_id: string | null
          created_at: string
          description: string | null
          id: string
          image_url: string | null
          is_active: boolean
          name: string
          price: number
          sale_price: number | null
          sku: string
          slug: string
          tax_class: string
          updated_at: string
        }
        Insert: {
          barcode?: string | null
          category_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          name: string
          price: number
          sale_price?: number | null
          sku: string
          slug: string
          tax_class?: string
          updated_at?: string
        }
        Update: {
          barcode?: string | null
          category_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          name?: string
          price?: number
          sale_price?: number | null
          sku?: string
          slug?: string
          tax_class?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      register_sessions: {
        Row: {
          closed_at: string | null
          closing_balance: number | null
          expected_balance: number | null
          id: string
          notes: string | null
          opened_at: string
          opening_balance: number | null
          register_id: string | null
          staff_id: string | null
        }
        Insert: {
          closed_at?: string | null
          closing_balance?: number | null
          expected_balance?: number | null
          id?: string
          notes?: string | null
          opened_at?: string
          opening_balance?: number | null
          register_id?: string | null
          staff_id?: string | null
        }
        Update: {
          closed_at?: string | null
          closing_balance?: number | null
          expected_balance?: number | null
          id?: string
          notes?: string | null
          opened_at?: string
          opening_balance?: number | null
          register_id?: string | null
          staff_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "register_sessions_register_id_fkey"
            columns: ["register_id"]
            isOneToOne: false
            referencedRelation: "registers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "register_sessions_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
        ]
      }
      registers: {
        Row: {
          created_at: string
          id: string
          is_active: boolean | null
          location: string
          name: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean | null
          location?: string
          name: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean | null
          location?: string
          name?: string
        }
        Relationships: []
      }
      repair_tasks: {
        Row: {
          assigned_to: string | null
          created_at: string
          description: string | null
          due_date: string | null
          id: string
          notes: string | null
          status: string
          ticket_id: string
          title: string
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          created_at?: string
          description?: string | null
          due_date?: string | null
          id?: string
          notes?: string | null
          status?: string
          ticket_id: string
          title: string
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          created_at?: string
          description?: string | null
          due_date?: string | null
          id?: string
          notes?: string | null
          status?: string
          ticket_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "repair_tasks_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "repair_tasks_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "repair_tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      repair_tickets: {
        Row: {
          assigned_staff_id: string | null
          created_at: string
          customer_id: string | null
          customer_name: string
          deposit_amount: number | null
          deposit_paid: boolean | null
          deposit_required: boolean | null
          dropoff_method: string | null
          email: string | null
          eta_date: string | null
          id: string
          item_make: string | null
          labor_hours: number | null
          labor_rate: number | null
          model_number: string | null
          notes: string | null
          parts_cost: number | null
          parts_list: Json | null
          phone: string
          photos_urls: string[] | null
          preferred_contact: string | null
          problem_description: string
          requested_date: string | null
          serial_number: string | null
          service_type: string
          status: string
          ticket_number: string
          total_cost: number | null
          updated_at: string
        }
        Insert: {
          assigned_staff_id?: string | null
          created_at?: string
          customer_id?: string | null
          customer_name: string
          deposit_amount?: number | null
          deposit_paid?: boolean | null
          deposit_required?: boolean | null
          dropoff_method?: string | null
          email?: string | null
          eta_date?: string | null
          id?: string
          item_make?: string | null
          labor_hours?: number | null
          labor_rate?: number | null
          model_number?: string | null
          notes?: string | null
          parts_cost?: number | null
          parts_list?: Json | null
          phone: string
          photos_urls?: string[] | null
          preferred_contact?: string | null
          problem_description: string
          requested_date?: string | null
          serial_number?: string | null
          service_type: string
          status?: string
          ticket_number: string
          total_cost?: number | null
          updated_at?: string
        }
        Update: {
          assigned_staff_id?: string | null
          created_at?: string
          customer_id?: string | null
          customer_name?: string
          deposit_amount?: number | null
          deposit_paid?: boolean | null
          deposit_required?: boolean | null
          dropoff_method?: string | null
          email?: string | null
          eta_date?: string | null
          id?: string
          item_make?: string | null
          labor_hours?: number | null
          labor_rate?: number | null
          model_number?: string | null
          notes?: string | null
          parts_cost?: number | null
          parts_list?: Json | null
          phone?: string
          photos_urls?: string[] | null
          preferred_contact?: string | null
          problem_description?: string
          requested_date?: string | null
          serial_number?: string | null
          service_type?: string
          status?: string
          ticket_number?: string
          total_cost?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "repair_tickets_assigned_staff_id_fkey"
            columns: ["assigned_staff_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "repair_tickets_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      staff: {
        Row: {
          auth_user_id: string | null
          created_at: string
          email: string
          id: string
          is_active: boolean
          name: string
          role: string
        }
        Insert: {
          auth_user_id?: string | null
          created_at?: string
          email: string
          id?: string
          is_active?: boolean
          name: string
          role: string
        }
        Update: {
          auth_user_id?: string | null
          created_at?: string
          email?: string
          id?: string
          is_active?: boolean
          name?: string
          role?: string
        }
        Relationships: []
      }
      store_settings: {
        Row: {
          id: string
          key: string
          updated_at: string
          value: string
        }
        Insert: {
          id?: string
          key: string
          updated_at?: string
          value: string
        }
        Update: {
          id?: string
          key?: string
          updated_at?: string
          value?: string
        }
        Relationships: []
      }
      wishlists: {
        Row: {
          created_at: string
          customer_id: string
          id: string
          product_id: string
        }
        Insert: {
          created_at?: string
          customer_id: string
          id?: string
          product_id: string
        }
        Update: {
          created_at?: string
          customer_id?: string
          id?: string
          product_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "wishlists_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wishlists_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      generate_order_number: { Args: never; Returns: string }
      generate_pickup_code: { Args: never; Returns: string }
      generate_repair_ticket_number: { Args: never; Returns: string }
      is_admin: { Args: never; Returns: boolean }
      is_staff: { Args: never; Returns: boolean }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
