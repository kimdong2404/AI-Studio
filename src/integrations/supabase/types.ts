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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      character_images: {
        Row: {
          character_id: string
          created_at: string
          id: string
          image_url: string
          is_master: boolean
          storage_path: string
        }
        Insert: {
          character_id: string
          created_at?: string
          id?: string
          image_url: string
          is_master?: boolean
          storage_path: string
        }
        Update: {
          character_id?: string
          created_at?: string
          id?: string
          image_url?: string
          is_master?: boolean
          storage_path?: string
        }
        Relationships: [
          {
            foreignKeyName: "character_images_character_id_fkey"
            columns: ["character_id"]
            isOneToOne: false
            referencedRelation: "characters"
            referencedColumns: ["id"]
          },
        ]
      }
      characters: {
        Row: {
          age: string
          clothing: string
          code: string
          created_at: string
          description: string
          gender: string
          id: string
          name: string
          notes: string
          recognition_features: string
        }
        Insert: {
          age?: string
          clothing?: string
          code: string
          created_at?: string
          description?: string
          gender?: string
          id?: string
          name: string
          notes?: string
          recognition_features?: string
        }
        Update: {
          age?: string
          clothing?: string
          code?: string
          created_at?: string
          description?: string
          gender?: string
          id?: string
          name?: string
          notes?: string
          recognition_features?: string
        }
        Relationships: []
      }
      ingredient_images: {
        Row: {
          created_at: string
          id: string
          image_url: string
          ingredient_id: string
          is_master: boolean
          storage_path: string
        }
        Insert: {
          created_at?: string
          id?: string
          image_url: string
          ingredient_id: string
          is_master?: boolean
          storage_path: string
        }
        Update: {
          created_at?: string
          id?: string
          image_url?: string
          ingredient_id?: string
          is_master?: boolean
          storage_path?: string
        }
        Relationships: [
          {
            foreignKeyName: "ingredient_images_ingredient_id_fkey"
            columns: ["ingredient_id"]
            isOneToOne: false
            referencedRelation: "ingredients"
            referencedColumns: ["id"]
          },
        ]
      }
      ingredients: {
        Row: {
          code: string
          color: string
          created_at: string
          description: string
          freshness: string
          id: string
          ingredient_type: string
          name: string
          notes: string
          recognition_features: string
          shape: string
        }
        Insert: {
          code: string
          color?: string
          created_at?: string
          description?: string
          freshness?: string
          id?: string
          ingredient_type?: string
          name: string
          notes?: string
          recognition_features?: string
          shape?: string
        }
        Update: {
          code?: string
          color?: string
          created_at?: string
          description?: string
          freshness?: string
          id?: string
          ingredient_type?: string
          name?: string
          notes?: string
          recognition_features?: string
          shape?: string
        }
        Relationships: []
      }
      location_images: {
        Row: {
          created_at: string
          id: string
          image_url: string
          is_master: boolean
          location_id: string
          storage_path: string
        }
        Insert: {
          created_at?: string
          id?: string
          image_url: string
          is_master?: boolean
          location_id: string
          storage_path: string
        }
        Update: {
          created_at?: string
          id?: string
          image_url?: string
          is_master?: boolean
          location_id?: string
          storage_path?: string
        }
        Relationships: [
          {
            foreignKeyName: "location_images_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
        ]
      }
      locations: {
        Row: {
          code: string
          color_lighting: string
          created_at: string
          description: string
          id: string
          location_type: string
          name: string
          notes: string
          recognition_features: string
          style: string
          time_of_day: string
        }
        Insert: {
          code: string
          color_lighting?: string
          created_at?: string
          description?: string
          id?: string
          location_type?: string
          name: string
          notes?: string
          recognition_features?: string
          style?: string
          time_of_day?: string
        }
        Update: {
          code?: string
          color_lighting?: string
          created_at?: string
          description?: string
          id?: string
          location_type?: string
          name?: string
          notes?: string
          recognition_features?: string
          style?: string
          time_of_day?: string
        }
        Relationships: []
      }
      prop_images: {
        Row: {
          created_at: string
          id: string
          image_url: string
          is_master: boolean
          prop_id: string
          storage_path: string
        }
        Insert: {
          created_at?: string
          id?: string
          image_url: string
          is_master?: boolean
          prop_id: string
          storage_path: string
        }
        Update: {
          created_at?: string
          id?: string
          image_url?: string
          is_master?: boolean
          prop_id?: string
          storage_path?: string
        }
        Relationships: [
          {
            foreignKeyName: "prop_images_prop_id_fkey"
            columns: ["prop_id"]
            isOneToOne: false
            referencedRelation: "props"
            referencedColumns: ["id"]
          },
        ]
      }
      props: {
        Row: {
          code: string
          created_at: string
          description: string
          id: string
          name: string
          notes: string
        }
        Insert: {
          code: string
          created_at?: string
          description?: string
          id?: string
          name: string
          notes?: string
        }
        Update: {
          code?: string
          created_at?: string
          description?: string
          id?: string
          name?: string
          notes?: string
        }
        Relationships: []
      }
      scene_characters: {
        Row: {
          character_id: string
          created_at: string
          id: string
          scene_id: string
        }
        Insert: {
          character_id: string
          created_at?: string
          id?: string
          scene_id: string
        }
        Update: {
          character_id?: string
          created_at?: string
          id?: string
          scene_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "scene_characters_character_id_fkey"
            columns: ["character_id"]
            isOneToOne: false
            referencedRelation: "characters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scene_characters_scene_id_fkey"
            columns: ["scene_id"]
            isOneToOne: false
            referencedRelation: "scenes"
            referencedColumns: ["id"]
          },
        ]
      }
      scene_ingredients: {
        Row: {
          created_at: string
          id: string
          ingredient_id: string
          scene_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          ingredient_id: string
          scene_id: string
        }
        Update: {
          created_at?: string
          id?: string
          ingredient_id?: string
          scene_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "scene_ingredients_ingredient_id_fkey"
            columns: ["ingredient_id"]
            isOneToOne: false
            referencedRelation: "ingredients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scene_ingredients_scene_id_fkey"
            columns: ["scene_id"]
            isOneToOne: false
            referencedRelation: "scenes"
            referencedColumns: ["id"]
          },
        ]
      }
      scene_props: {
        Row: {
          created_at: string
          id: string
          prop_id: string
          scene_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          prop_id: string
          scene_id: string
        }
        Update: {
          created_at?: string
          id?: string
          prop_id?: string
          scene_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "scene_props_prop_id_fkey"
            columns: ["prop_id"]
            isOneToOne: false
            referencedRelation: "props"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scene_props_scene_id_fkey"
            columns: ["scene_id"]
            isOneToOne: false
            referencedRelation: "scenes"
            referencedColumns: ["id"]
          },
        ]
      }
      scenes: {
        Row: {
          camera: string
          character: string
          created_at: string
          description: string
          duration: string
          id: string
          location: string
          location_id: string | null
          position: number
          props: string
          title: string
        }
        Insert: {
          camera?: string
          character?: string
          created_at?: string
          description?: string
          duration?: string
          id?: string
          location?: string
          location_id?: string | null
          position?: number
          props?: string
          title?: string
        }
        Update: {
          camera?: string
          character?: string
          created_at?: string
          description?: string
          duration?: string
          id?: string
          location?: string
          location_id?: string | null
          position?: number
          props?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "scenes_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
