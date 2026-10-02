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
      ai_models: {
        Row: {
          code: string
          created_at: string
          enabled: boolean
          generation_mode: string
          id: string
          name: string
          provider_id: string
          supports_image_generation: boolean
          supports_reference_images: boolean
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          enabled?: boolean
          generation_mode?: string
          id?: string
          name: string
          provider_id: string
          supports_image_generation?: boolean
          supports_reference_images?: boolean
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          enabled?: boolean
          generation_mode?: string
          id?: string
          name?: string
          provider_id?: string
          supports_image_generation?: boolean
          supports_reference_images?: boolean
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_models_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "ai_providers"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_providers: {
        Row: {
          code: string
          created_at: string
          enabled: boolean
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          enabled?: boolean
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          enabled?: boolean
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      character_expression_images: {
        Row: {
          created_at: string
          expression_id: string
          id: string
          image_url: string
          is_master: boolean
          storage_path: string
        }
        Insert: {
          created_at?: string
          expression_id: string
          id?: string
          image_url: string
          is_master?: boolean
          storage_path: string
        }
        Update: {
          created_at?: string
          expression_id?: string
          id?: string
          image_url?: string
          is_master?: boolean
          storage_path?: string
        }
        Relationships: [
          {
            foreignKeyName: "character_expression_images_expression_id_fkey"
            columns: ["expression_id"]
            isOneToOne: false
            referencedRelation: "character_expressions"
            referencedColumns: ["id"]
          },
        ]
      }
      character_expressions: {
        Row: {
          brows_ears: string
          character_id: string
          code: string
          created_at: string
          description: string
          eyes: string
          facial_features: string
          head_pose: string
          id: string
          mouth: string
          name: string
          notes: string
        }
        Insert: {
          brows_ears?: string
          character_id: string
          code?: string
          created_at?: string
          description?: string
          eyes?: string
          facial_features?: string
          head_pose?: string
          id?: string
          mouth?: string
          name: string
          notes?: string
        }
        Update: {
          brows_ears?: string
          character_id?: string
          code?: string
          created_at?: string
          description?: string
          eyes?: string
          facial_features?: string
          head_pose?: string
          id?: string
          mouth?: string
          name?: string
          notes?: string
        }
        Relationships: [
          {
            foreignKeyName: "character_expressions_character_id_fkey"
            columns: ["character_id"]
            isOneToOne: false
            referencedRelation: "characters"
            referencedColumns: ["id"]
          },
        ]
      }
      character_images: {
        Row: {
          character_id: string
          created_at: string
          id: string
          image_url: string
          is_master: boolean
          storage_path: string
          view_type: string
        }
        Insert: {
          character_id: string
          created_at?: string
          id?: string
          image_url: string
          is_master?: boolean
          storage_path: string
          view_type?: string
        }
        Update: {
          character_id?: string
          created_at?: string
          id?: string
          image_url?: string
          is_master?: boolean
          storage_path?: string
          view_type?: string
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
      character_sheets: {
        Row: {
          accessories: string
          appearance_description: string
          appearance_lock: string
          behavior: string
          body_features: string
          breed: string
          build: string
          character_id: string
          character_identity: string
          consistency_instruction: string
          created_at: string
          demeanor: string
          ears: string
          eye_color: string
          face_shape: string
          footwear: string
          hair_color: string
          height: string
          id: string
          identity_description: string
          important_details: string
          mouth: string
          negative_avoid_changes: string
          nose: string
          outfit_color: string
          outfit_description: string
          outfit_details: string
          outfit_lock: string
          outfit_main: string
          outfit_style: string
          overall_color: string
          pattern: string
          personality: string
          special_marks: string
          species: string
          updated_at: string
          usual_expression: string
        }
        Insert: {
          accessories?: string
          appearance_description?: string
          appearance_lock?: string
          behavior?: string
          body_features?: string
          breed?: string
          build?: string
          character_id: string
          character_identity?: string
          consistency_instruction?: string
          created_at?: string
          demeanor?: string
          ears?: string
          eye_color?: string
          face_shape?: string
          footwear?: string
          hair_color?: string
          height?: string
          id?: string
          identity_description?: string
          important_details?: string
          mouth?: string
          negative_avoid_changes?: string
          nose?: string
          outfit_color?: string
          outfit_description?: string
          outfit_details?: string
          outfit_lock?: string
          outfit_main?: string
          outfit_style?: string
          overall_color?: string
          pattern?: string
          personality?: string
          special_marks?: string
          species?: string
          updated_at?: string
          usual_expression?: string
        }
        Update: {
          accessories?: string
          appearance_description?: string
          appearance_lock?: string
          behavior?: string
          body_features?: string
          breed?: string
          build?: string
          character_id?: string
          character_identity?: string
          consistency_instruction?: string
          created_at?: string
          demeanor?: string
          ears?: string
          eye_color?: string
          face_shape?: string
          footwear?: string
          hair_color?: string
          height?: string
          id?: string
          identity_description?: string
          important_details?: string
          mouth?: string
          negative_avoid_changes?: string
          nose?: string
          outfit_color?: string
          outfit_description?: string
          outfit_details?: string
          outfit_lock?: string
          outfit_main?: string
          outfit_style?: string
          overall_color?: string
          pattern?: string
          personality?: string
          special_marks?: string
          species?: string
          updated_at?: string
          usual_expression?: string
        }
        Relationships: [
          {
            foreignKeyName: "character_sheets_character_id_fkey"
            columns: ["character_id"]
            isOneToOne: true
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
      image_generations: {
        Row: {
          aspect_ratio: string
          created_at: string
          error_message: string
          generation_mode: string
          id: string
          image_count: number
          model_id: string | null
          prompt_text: string
          prompt_version_id: string | null
          provider_id: string | null
          quality: string
          resolution: string
          scene_id: string
          status: string
          updated_at: string
        }
        Insert: {
          aspect_ratio?: string
          created_at?: string
          error_message?: string
          generation_mode?: string
          id?: string
          image_count?: number
          model_id?: string | null
          prompt_text?: string
          prompt_version_id?: string | null
          provider_id?: string | null
          quality?: string
          resolution?: string
          scene_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          aspect_ratio?: string
          created_at?: string
          error_message?: string
          generation_mode?: string
          id?: string
          image_count?: number
          model_id?: string | null
          prompt_text?: string
          prompt_version_id?: string | null
          provider_id?: string | null
          quality?: string
          resolution?: string
          scene_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "image_generations_model_id_fkey"
            columns: ["model_id"]
            isOneToOne: false
            referencedRelation: "ai_models"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "image_generations_prompt_version_id_fkey"
            columns: ["prompt_version_id"]
            isOneToOne: false
            referencedRelation: "prompt_versions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "image_generations_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "ai_providers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "image_generations_scene_id_fkey"
            columns: ["scene_id"]
            isOneToOne: false
            referencedRelation: "scenes"
            referencedColumns: ["id"]
          },
        ]
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
      prompt_versions: {
        Row: {
          auto_snapshot: string
          created_at: string
          id: string
          prompt_text: string
          scene_id: string
          source_type: string
          updated_at: string
          version_number: number
        }
        Insert: {
          auto_snapshot?: string
          created_at?: string
          id?: string
          prompt_text?: string
          scene_id: string
          source_type?: string
          updated_at?: string
          version_number?: number
        }
        Update: {
          auto_snapshot?: string
          created_at?: string
          id?: string
          prompt_text?: string
          scene_id?: string
          source_type?: string
          updated_at?: string
          version_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "prompt_versions_scene_id_fkey"
            columns: ["scene_id"]
            isOneToOne: false
            referencedRelation: "scenes"
            referencedColumns: ["id"]
          },
        ]
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
          expression_id: string | null
          id: string
          scene_id: string
        }
        Insert: {
          character_id: string
          created_at?: string
          expression_id?: string | null
          id?: string
          scene_id: string
        }
        Update: {
          character_id?: string
          created_at?: string
          expression_id?: string | null
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
            foreignKeyName: "scene_characters_expression_id_fkey"
            columns: ["expression_id"]
            isOneToOne: false
            referencedRelation: "character_expressions"
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
      scene_prompts: {
        Row: {
          auto_prompt: string
          created_at: string
          edited_prompt: string
          id: string
          scene_id: string
          updated_at: string
        }
        Insert: {
          auto_prompt?: string
          created_at?: string
          edited_prompt?: string
          id?: string
          scene_id: string
          updated_at?: string
        }
        Update: {
          auto_prompt?: string
          created_at?: string
          edited_prompt?: string
          id?: string
          scene_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "scene_prompts_scene_id_fkey"
            columns: ["scene_id"]
            isOneToOne: true
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
          action: string
          ambient_sound: string
          camera: string
          camera_movement: string
          character: string
          created_at: string
          description: string
          dialogue: string
          duration: string
          expression: string
          id: string
          lighting: string
          location: string
          location_id: string | null
          position: number
          props: string
          sound_effect: string
          time_of_day: string
          title: string
          visual_style: string
        }
        Insert: {
          action?: string
          ambient_sound?: string
          camera?: string
          camera_movement?: string
          character?: string
          created_at?: string
          description?: string
          dialogue?: string
          duration?: string
          expression?: string
          id?: string
          lighting?: string
          location?: string
          location_id?: string | null
          position?: number
          props?: string
          sound_effect?: string
          time_of_day?: string
          title?: string
          visual_style?: string
        }
        Update: {
          action?: string
          ambient_sound?: string
          camera?: string
          camera_movement?: string
          character?: string
          created_at?: string
          description?: string
          dialogue?: string
          duration?: string
          expression?: string
          id?: string
          lighting?: string
          location?: string
          location_id?: string | null
          position?: number
          props?: string
          sound_effect?: string
          time_of_day?: string
          title?: string
          visual_style?: string
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
      video_generations: {
        Row: {
          aspect_ratio: string
          created_at: string
          duration: string
          error_message: string
          first_frame_url: string
          frame_rate: string
          generation_mode: string
          id: string
          last_frame_url: string
          model_id: string | null
          prompt_text: string
          prompt_version_id: string | null
          provider_id: string | null
          quality: string
          resolution: string
          scene_id: string
          source_image_id: string | null
          status: string
          thumbnail_url: string
          updated_at: string
          video_url: string
        }
        Insert: {
          aspect_ratio?: string
          created_at?: string
          duration?: string
          error_message?: string
          first_frame_url?: string
          frame_rate?: string
          generation_mode?: string
          id?: string
          last_frame_url?: string
          model_id?: string | null
          prompt_text?: string
          prompt_version_id?: string | null
          provider_id?: string | null
          quality?: string
          resolution?: string
          scene_id: string
          source_image_id?: string | null
          status?: string
          thumbnail_url?: string
          updated_at?: string
          video_url?: string
        }
        Update: {
          aspect_ratio?: string
          created_at?: string
          duration?: string
          error_message?: string
          first_frame_url?: string
          frame_rate?: string
          generation_mode?: string
          id?: string
          last_frame_url?: string
          model_id?: string | null
          prompt_text?: string
          prompt_version_id?: string | null
          provider_id?: string | null
          quality?: string
          resolution?: string
          scene_id?: string
          source_image_id?: string | null
          status?: string
          thumbnail_url?: string
          updated_at?: string
          video_url?: string
        }
        Relationships: [
          {
            foreignKeyName: "video_generations_model_id_fkey"
            columns: ["model_id"]
            isOneToOne: false
            referencedRelation: "ai_models"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "video_generations_prompt_version_id_fkey"
            columns: ["prompt_version_id"]
            isOneToOne: false
            referencedRelation: "video_prompt_versions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "video_generations_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "ai_providers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "video_generations_scene_id_fkey"
            columns: ["scene_id"]
            isOneToOne: false
            referencedRelation: "scenes"
            referencedColumns: ["id"]
          },
        ]
      }
      video_prompt_versions: {
        Row: {
          created_at: string
          id: string
          prompt_text: string
          scene_id: string
          source_type: string
          updated_at: string
          version_number: number
        }
        Insert: {
          created_at?: string
          id?: string
          prompt_text?: string
          scene_id: string
          source_type: string
          updated_at?: string
          version_number: number
        }
        Update: {
          created_at?: string
          id?: string
          prompt_text?: string
          scene_id?: string
          source_type?: string
          updated_at?: string
          version_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "video_prompt_versions_scene_id_fkey"
            columns: ["scene_id"]
            isOneToOne: false
            referencedRelation: "scenes"
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
