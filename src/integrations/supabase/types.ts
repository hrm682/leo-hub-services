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
    PostgrestVersion: "14.15"
  }
  public: {
    Tables: {
      audit_logs: {
        Row: {
          action: string
          created_at: string
          entity_id: string | null
          entity_type: string | null
          id: string
          metadata: Json
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          metadata?: Json
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          metadata?: Json
          user_id?: string | null
        }
        Relationships: []
      }
      categories: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          name: string
          slug: string
          sort_order: number
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          slug: string
          sort_order?: number
        }
        Update: {
          created_at?: string
          description?: string | null
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
          description: string | null
          discount_percent: number
          expires_at: string | null
          id: string
          is_active: boolean
        }
        Insert: {
          code: string
          created_at?: string
          description?: string | null
          discount_percent?: number
          expires_at?: string | null
          id?: string
          is_active?: boolean
        }
        Update: {
          code?: string
          created_at?: string
          description?: string | null
          discount_percent?: number
          expires_at?: string | null
          id?: string
          is_active?: boolean
        }
        Relationships: []
      }
      customer_services: {
        Row: {
          created_at: string
          expiration_date: string | null
          id: string
          order_item_id: string | null
          product_id: string | null
          service_reference: string
          start_date: string | null
          status: Database["public"]["Enums"]["service_status"]
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          expiration_date?: string | null
          id?: string
          order_item_id?: string | null
          product_id?: string | null
          service_reference?: string
          start_date?: string | null
          status?: Database["public"]["Enums"]["service_status"]
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          expiration_date?: string | null
          id?: string
          order_item_id?: string | null
          product_id?: string | null
          service_reference?: string
          start_date?: string | null
          status?: Database["public"]["Enums"]["service_status"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_services_order_item_id_fkey"
            columns: ["order_item_id"]
            isOneToOne: false
            referencedRelation: "order_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_services_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          content: string
          created_at: string
          id: string
          metadata: Json
          read_at: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          content?: string
          created_at?: string
          id?: string
          metadata?: Json
          read_at?: string | null
          title: string
          type?: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          metadata?: Json
          read_at?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      order_items: {
        Row: {
          created_at: string
          customer_service_id: string | null
          duration_days: number
          id: string
          order_id: string
          product_id: string | null
          quantity: number
          service_name: string
          unit_price: number
        }
        Insert: {
          created_at?: string
          customer_service_id?: string | null
          duration_days?: number
          id?: string
          order_id: string
          product_id?: string | null
          quantity?: number
          service_name: string
          unit_price: number
        }
        Update: {
          created_at?: string
          customer_service_id?: string | null
          duration_days?: number
          id?: string
          order_id?: string
          product_id?: string | null
          quantity?: number
          service_name?: string
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
          coupon_code: string | null
          created_at: string
          discount: number
          id: string
          kind: string
          order_number: string
          status: Database["public"]["Enums"]["order_status"]
          subtotal: number
          total: number
          updated_at: string
          user_id: string
        }
        Insert: {
          coupon_code?: string | null
          created_at?: string
          discount?: number
          id?: string
          kind?: string
          order_number?: string
          status?: Database["public"]["Enums"]["order_status"]
          subtotal?: number
          total?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          coupon_code?: string | null
          created_at?: string
          discount?: number
          id?: string
          kind?: string
          order_number?: string
          status?: Database["public"]["Enums"]["order_status"]
          subtotal?: number
          total?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      payments: {
        Row: {
          amount: number
          created_at: string
          currency: string
          id: string
          order_id: string
          provider: string
          receipt_path: string | null
          rejection_reason: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: Database["public"]["Enums"]["payment_status"]
          transaction_reference: string | null
          updated_at: string
        }
        Insert: {
          amount: number
          created_at?: string
          currency?: string
          id?: string
          order_id: string
          provider?: string
          receipt_path?: string | null
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["payment_status"]
          transaction_reference?: string | null
          updated_at?: string
        }
        Update: {
          amount?: number
          created_at?: string
          currency?: string
          id?: string
          order_id?: string
          provider?: string
          receipt_path?: string | null
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["payment_status"]
          transaction_reference?: string | null
          updated_at?: string
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
      products: {
        Row: {
          benefits: string[]
          billing_label: string
          category_id: string | null
          created_at: string
          description: string
          duration_days: number
          id: string
          image_url: string | null
          is_active: boolean
          is_featured: boolean
          name: string
          price: number
          short_description: string
          slug: string
          support_url: string | null
          updated_at: string
        }
        Insert: {
          benefits?: string[]
          billing_label?: string
          category_id?: string | null
          created_at?: string
          description?: string
          duration_days?: number
          id?: string
          image_url?: string | null
          is_active?: boolean
          is_featured?: boolean
          name: string
          price?: number
          short_description?: string
          slug: string
          support_url?: string | null
          updated_at?: string
        }
        Update: {
          benefits?: string[]
          billing_label?: string
          category_id?: string | null
          created_at?: string
          description?: string
          duration_days?: number
          id?: string
          image_url?: string | null
          is_active?: boolean
          is_featured?: boolean
          name?: string
          price?: number
          short_description?: string
          slug?: string
          support_url?: string | null
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
      profiles: {
        Row: {
          created_at: string
          document_number: string | null
          full_name: string
          id: string
          notification_prefs: Json
          phone: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          document_number?: string | null
          full_name?: string
          id: string
          notification_prefs?: Json
          phone?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          document_number?: string | null
          full_name?: string
          id?: string
          notification_prefs?: Json
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      service_events: {
        Row: {
          created_at: string
          customer_service_id: string
          description: string
          event_type: string
          id: string
        }
        Insert: {
          created_at?: string
          customer_service_id: string
          description?: string
          event_type: string
          id?: string
        }
        Update: {
          created_at?: string
          customer_service_id?: string
          description?: string
          event_type?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "service_events_customer_service_id_fkey"
            columns: ["customer_service_id"]
            isOneToOne: false
            referencedRelation: "customer_services"
            referencedColumns: ["id"]
          },
        ]
      }
      support_tickets: {
        Row: {
          assigned_to: string | null
          category: Database["public"]["Enums"]["ticket_category"]
          closed_at: string | null
          created_at: string
          customer_service_id: string | null
          description: string
          id: string
          priority: Database["public"]["Enums"]["ticket_priority"]
          rating: number | null
          status: Database["public"]["Enums"]["ticket_status"]
          subject: string
          ticket_number: string
          updated_at: string
          user_id: string
        }
        Insert: {
          assigned_to?: string | null
          category?: Database["public"]["Enums"]["ticket_category"]
          closed_at?: string | null
          created_at?: string
          customer_service_id?: string | null
          description: string
          id?: string
          priority?: Database["public"]["Enums"]["ticket_priority"]
          rating?: number | null
          status?: Database["public"]["Enums"]["ticket_status"]
          subject: string
          ticket_number?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          assigned_to?: string | null
          category?: Database["public"]["Enums"]["ticket_category"]
          closed_at?: string | null
          created_at?: string
          customer_service_id?: string | null
          description?: string
          id?: string
          priority?: Database["public"]["Enums"]["ticket_priority"]
          rating?: number | null
          status?: Database["public"]["Enums"]["ticket_status"]
          subject?: string
          ticket_number?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "support_tickets_customer_service_id_fkey"
            columns: ["customer_service_id"]
            isOneToOne: false
            referencedRelation: "customer_services"
            referencedColumns: ["id"]
          },
        ]
      }
      ticket_messages: {
        Row: {
          attachment_path: string | null
          created_at: string
          id: string
          is_internal_note: boolean
          message: string
          sender_id: string
          ticket_id: string
        }
        Insert: {
          attachment_path?: string | null
          created_at?: string
          id?: string
          is_internal_note?: boolean
          message: string
          sender_id: string
          ticket_id: string
        }
        Update: {
          attachment_path?: string | null
          created_at?: string
          id?: string
          is_internal_note?: boolean
          message?: string
          sender_id?: string
          ticket_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ticket_messages_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "support_tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      generate_renewal_reminders: { Args: never; Returns: number }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_staff: { Args: { _user_id: string }; Returns: boolean }
    }
    Enums: {
      app_role: "admin" | "soporte" | "cliente"
      order_status: "pendiente" | "pagada" | "rechazada" | "cancelada"
      payment_status: "pendiente" | "aprobado" | "rechazado" | "reembolsado"
      service_status:
        | "pago_pendiente"
        | "activo"
        | "en_renovacion"
        | "suspendido"
        | "finalizado"
      ticket_category:
        | "acceso"
        | "facturacion"
        | "renovacion"
        | "cambio_dispositivo"
        | "consulta"
        | "otro"
        | "garantia"
      ticket_priority: "baja" | "media" | "alta"
      ticket_status:
        | "abierto"
        | "en_revision"
        | "en_espera"
        | "en_proceso"
        | "resuelto"
        | "cerrado"
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
    Enums: {
      app_role: ["admin", "soporte", "cliente"],
      order_status: ["pendiente", "pagada", "rechazada", "cancelada"],
      payment_status: ["pendiente", "aprobado", "rechazado", "reembolsado"],
      service_status: [
        "pago_pendiente",
        "activo",
        "en_renovacion",
        "suspendido",
        "finalizado",
      ],
      ticket_category: [
        "acceso",
        "facturacion",
        "renovacion",
        "cambio_dispositivo",
        "consulta",
        "otro",
        "garantia",
      ],
      ticket_priority: ["baja", "media", "alta"],
      ticket_status: [
        "abierto",
        "en_revision",
        "en_espera",
        "en_proceso",
        "resuelto",
        "cerrado",
      ],
    },
  },
} as const
