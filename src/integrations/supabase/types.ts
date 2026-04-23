export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5";
  };
  public: {
    Tables: {
      achievements: {
        Row: {
          created_at: string;
          description: string | null;
          icon_url: string | null;
          id: string;
          is_active: boolean;
          reward_type: string | null;
          reward_value_json: Json | null;
          slug: string;
          title: string;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          description?: string | null;
          icon_url?: string | null;
          id?: string;
          is_active?: boolean;
          reward_type?: string | null;
          reward_value_json?: Json | null;
          slug: string;
          title: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          description?: string | null;
          icon_url?: string | null;
          id?: string;
          is_active?: boolean;
          reward_type?: string | null;
          reward_value_json?: Json | null;
          slug?: string;
          title?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      active_sessions: {
        Row: {
          created_at: string;
          device_label: string | null;
          ip: string | null;
          session_token: string;
          updated_at: string;
          user_agent: string | null;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          device_label?: string | null;
          ip?: string | null;
          session_token: string;
          updated_at?: string;
          user_agent?: string | null;
          user_id: string;
        };
        Update: {
          created_at?: string;
          device_label?: string | null;
          ip?: string | null;
          session_token?: string;
          updated_at?: string;
          user_agent?: string | null;
          user_id?: string;
        };
        Relationships: [];
      };
      app_settings: {
        Row: {
          created_at: string;
          default_language: string;
          enabled_languages: string[];
          id: string;
          sender_email: string | null;
          sender_name: string | null;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          default_language?: string;
          enabled_languages?: string[];
          id?: string;
          sender_email?: string | null;
          sender_name?: string | null;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          default_language?: string;
          enabled_languages?: string[];
          id?: string;
          sender_email?: string | null;
          sender_name?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      app_settings_kv: {
        Row: {
          created_at: string;
          description: string | null;
          id: string;
          key: string;
          updated_at: string;
          updated_by: string | null;
          value_json: Json;
        };
        Insert: {
          created_at?: string;
          description?: string | null;
          id?: string;
          key: string;
          updated_at?: string;
          updated_by?: string | null;
          value_json?: Json;
        };
        Update: {
          created_at?: string;
          description?: string | null;
          id?: string;
          key?: string;
          updated_at?: string;
          updated_by?: string | null;
          value_json?: Json;
        };
        Relationships: [];
      };
      branding_settings: {
        Row: {
          accent_color: string | null;
          app_name: string | null;
          created_at: string;
          favicon_url: string | null;
          id: string;
          logo_alt: string | null;
          logo_url: string | null;
          primary_color: string | null;
          secondary_color: string | null;
          support_email: string | null;
          updated_at: string;
          updated_by: string | null;
        };
        Insert: {
          accent_color?: string | null;
          app_name?: string | null;
          created_at?: string;
          favicon_url?: string | null;
          id?: string;
          logo_alt?: string | null;
          logo_url?: string | null;
          primary_color?: string | null;
          secondary_color?: string | null;
          support_email?: string | null;
          updated_at?: string;
          updated_by?: string | null;
        };
        Update: {
          accent_color?: string | null;
          app_name?: string | null;
          created_at?: string;
          favicon_url?: string | null;
          id?: string;
          logo_alt?: string | null;
          logo_url?: string | null;
          primary_color?: string | null;
          secondary_color?: string | null;
          support_email?: string | null;
          updated_at?: string;
          updated_by?: string | null;
        };
        Relationships: [];
      };
      email_templates: {
        Row: {
          body_html: string;
          created_at: string;
          enabled: boolean;
          id: string;
          name: string;
          subject: string;
          template_key: string;
          updated_at: string;
          updated_by: string | null;
          variables: Json;
        };
        Insert: {
          body_html: string;
          created_at?: string;
          enabled?: boolean;
          id?: string;
          name: string;
          subject: string;
          template_key: string;
          updated_at?: string;
          updated_by?: string | null;
          variables?: Json;
        };
        Update: {
          body_html?: string;
          created_at?: string;
          enabled?: boolean;
          id?: string;
          name?: string;
          subject?: string;
          template_key?: string;
          updated_at?: string;
          updated_by?: string | null;
          variables?: Json;
        };
        Relationships: [];
      };
      plans: {
        Row: {
          active: boolean;
          billing_interval: string;
          code: string;
          created_at: string;
          currency: string;
          description: string | null;
          id: string;
          name: string;
          native_language: string;
          price_cents: number;
          updated_at: string;
        };
        Insert: {
          active?: boolean;
          billing_interval?: string;
          code: string;
          created_at?: string;
          currency?: string;
          description?: string | null;
          id?: string;
          name: string;
          native_language?: string;
          price_cents?: number;
          updated_at?: string;
        };
        Update: {
          active?: boolean;
          billing_interval?: string;
          code?: string;
          created_at?: string;
          currency?: string;
          description?: string | null;
          id?: string;
          name?: string;
          native_language?: string;
          price_cents?: number;
          updated_at?: string;
        };
        Relationships: [];
      };
      profiles: {
        Row: {
          avatar_url: string | null;
          child_name: string | null;
          created_at: string;
          display_name: string | null;
          id: string;
          purchase_email: string | null;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          avatar_url?: string | null;
          child_name?: string | null;
          created_at?: string;
          display_name?: string | null;
          id?: string;
          purchase_email?: string | null;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          avatar_url?: string | null;
          child_name?: string | null;
          created_at?: string;
          display_name?: string | null;
          id?: string;
          purchase_email?: string | null;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      sales: {
        Row: {
          amount_cents: number;
          created_at: string;
          currency: string;
          customer_email: string | null;
          event_type: string | null;
          external_customer_id: string | null;
          external_sale_id: string | null;
          id: string;
          plan_id: string | null;
          provider: string;
          raw_payload: Json;
          sold_at: string;
          status: string;
          subscription_id: string | null;
          updated_at: string;
          user_id: string | null;
        };
        Insert: {
          amount_cents?: number;
          created_at?: string;
          currency?: string;
          customer_email?: string | null;
          event_type?: string | null;
          external_customer_id?: string | null;
          external_sale_id?: string | null;
          id?: string;
          plan_id?: string | null;
          provider?: string;
          raw_payload?: Json;
          sold_at?: string;
          status?: string;
          subscription_id?: string | null;
          updated_at?: string;
          user_id?: string | null;
        };
        Update: {
          amount_cents?: number;
          created_at?: string;
          currency?: string;
          customer_email?: string | null;
          event_type?: string | null;
          external_customer_id?: string | null;
          external_sale_id?: string | null;
          id?: string;
          plan_id?: string | null;
          provider?: string;
          raw_payload?: Json;
          sold_at?: string;
          status?: string;
          subscription_id?: string | null;
          updated_at?: string;
          user_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "sales_plan_id_fkey";
            columns: ["plan_id"];
            isOneToOne: false;
            referencedRelation: "plans";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "sales_subscription_id_fkey";
            columns: ["subscription_id"];
            isOneToOne: false;
            referencedRelation: "subscriptions";
            referencedColumns: ["id"];
          },
        ];
      };
      stories: {
        Row: {
          age_max: number | null;
          age_min: number | null;
          age_range: string | null;
          category_id: string | null;
          cover_image_url: string | null;
          created_at: string;
          description: string | null;
          difficulty_level: number | null;
          estimated_minutes: number | null;
          id: string;
          is_active: boolean;
          is_featured: boolean;
          is_new: boolean;
          loved: number;
          short_description: string | null;
          slug: string;
          sort_order: number;
          subtitle: string | null;
          testament: string | null;
          thumbnail_url: string | null;
          title: string;
          updated_at: string;
        };
        Insert: {
          age_max?: number | null;
          age_min?: number | null;
          age_range?: string | null;
          category_id?: string | null;
          cover_image_url?: string | null;
          created_at?: string;
          description?: string | null;
          difficulty_level?: number | null;
          estimated_minutes?: number | null;
          id?: string;
          is_active?: boolean;
          is_featured?: boolean;
          is_new?: boolean;
          loved?: number;
          short_description?: string | null;
          slug: string;
          sort_order?: number;
          subtitle?: string | null;
          testament?: string | null;
          thumbnail_url?: string | null;
          title: string;
          updated_at?: string;
        };
        Update: {
          age_max?: number | null;
          age_min?: number | null;
          age_range?: string | null;
          category_id?: string | null;
          cover_image_url?: string | null;
          created_at?: string;
          description?: string | null;
          difficulty_level?: number | null;
          estimated_minutes?: number | null;
          id?: string;
          is_active?: boolean;
          is_featured?: boolean;
          is_new?: boolean;
          loved?: number;
          short_description?: string | null;
          slug?: string;
          sort_order?: number;
          subtitle?: string | null;
          testament?: string | null;
          thumbnail_url?: string | null;
          title?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "stories_category_id_fkey";
            columns: ["category_id"];
            isOneToOne: false;
            referencedRelation: "story_categories";
            referencedColumns: ["id"];
          },
        ];
      };
      stories_pages: {
        Row: {
          created_at: string;
          id: string;
          image_colored_sample_url: string | null;
          image_lineart_url: string | null;
          image_preview_url: string | null;
          is_active: boolean;
          mobile_focus_x: number | null;
          mobile_focus_y: number | null;
          page_number: number;
          recommended_zoom: number | null;
          story_id: string;
          svg_markup: string | null;
          title: string | null;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          image_colored_sample_url?: string | null;
          image_lineart_url?: string | null;
          image_preview_url?: string | null;
          is_active?: boolean;
          mobile_focus_x?: number | null;
          mobile_focus_y?: number | null;
          page_number: number;
          recommended_zoom?: number | null;
          story_id: string;
          svg_markup?: string | null;
          title?: string | null;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          image_colored_sample_url?: string | null;
          image_lineart_url?: string | null;
          image_preview_url?: string | null;
          is_active?: boolean;
          mobile_focus_x?: number | null;
          mobile_focus_y?: number | null;
          page_number?: number;
          recommended_zoom?: number | null;
          story_id?: string;
          svg_markup?: string | null;
          title?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "stories_pages_story_id_fkey";
            columns: ["story_id"];
            isOneToOne: false;
            referencedRelation: "stories";
            referencedColumns: ["id"];
          },
        ];
      };
      story_categories: {
        Row: {
          color: string | null;
          cover_image_url: string | null;
          created_at: string;
          description: string | null;
          emoji: string | null;
          icon_url: string | null;
          id: string;
          is_active: boolean;
          slug: string;
          sort_order: number;
          title: string;
          updated_at: string;
        };
        Insert: {
          color?: string | null;
          cover_image_url?: string | null;
          created_at?: string;
          description?: string | null;
          emoji?: string | null;
          icon_url?: string | null;
          id?: string;
          is_active?: boolean;
          slug: string;
          sort_order?: number;
          title: string;
          updated_at?: string;
        };
        Update: {
          color?: string | null;
          cover_image_url?: string | null;
          created_at?: string;
          description?: string | null;
          emoji?: string | null;
          icon_url?: string | null;
          id?: string;
          is_active?: boolean;
          slug?: string;
          sort_order?: number;
          title?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      story_categories_map: {
        Row: {
          category_id: string;
          created_at: string;
          story_id: string;
        };
        Insert: {
          category_id: string;
          created_at?: string;
          story_id: string;
        };
        Update: {
          category_id?: string;
          created_at?: string;
          story_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "story_categories_map_category_id_fkey";
            columns: ["category_id"];
            isOneToOne: false;
            referencedRelation: "story_categories";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "story_categories_map_story_id_fkey";
            columns: ["story_id"];
            isOneToOne: false;
            referencedRelation: "stories";
            referencedColumns: ["id"];
          },
        ];
      };
      story_completions: {
        Row: {
          completed_at: string;
          created_at: string;
          id: string;
          overall_progress_percent: number;
          story_slug: string;
          unlocked_milestone: string | null;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          completed_at?: string;
          created_at?: string;
          id?: string;
          overall_progress_percent?: number;
          story_slug: string;
          unlocked_milestone?: string | null;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          completed_at?: string;
          created_at?: string;
          id?: string;
          overall_progress_percent?: number;
          story_slug?: string;
          unlocked_milestone?: string | null;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      story_cover_overrides: {
        Row: {
          created_at: string;
          id: string;
          image_url: string;
          source: string;
          story_slug: string;
          updated_at: string;
          updated_by: string | null;
        };
        Insert: {
          created_at?: string;
          id?: string;
          image_url: string;
          source?: string;
          story_slug: string;
          updated_at?: string;
          updated_by?: string | null;
        };
        Update: {
          created_at?: string;
          id?: string;
          image_url?: string;
          source?: string;
          story_slug?: string;
          updated_at?: string;
          updated_by?: string | null;
        };
        Relationships: [];
      };
      subscriptions: {
        Row: {
          amount_cents: number;
          canceled_at: string | null;
          created_at: string;
          currency: string;
          current_period_end: string | null;
          customer_email: string | null;
          external_customer_id: string | null;
          external_subscription_id: string | null;
          id: string;
          plan_id: string | null;
          provider: string;
          started_at: string | null;
          status: string;
          updated_at: string;
          user_id: string | null;
        };
        Insert: {
          amount_cents?: number;
          canceled_at?: string | null;
          created_at?: string;
          currency?: string;
          current_period_end?: string | null;
          customer_email?: string | null;
          external_customer_id?: string | null;
          external_subscription_id?: string | null;
          id?: string;
          plan_id?: string | null;
          provider?: string;
          started_at?: string | null;
          status?: string;
          updated_at?: string;
          user_id?: string | null;
        };
        Update: {
          amount_cents?: number;
          canceled_at?: string | null;
          created_at?: string;
          currency?: string;
          current_period_end?: string | null;
          customer_email?: string | null;
          external_customer_id?: string | null;
          external_subscription_id?: string | null;
          id?: string;
          plan_id?: string | null;
          provider?: string;
          started_at?: string | null;
          status?: string;
          updated_at?: string;
          user_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "subscriptions_plan_id_fkey";
            columns: ["plan_id"];
            isOneToOne: false;
            referencedRelation: "plans";
            referencedColumns: ["id"];
          },
        ];
      };
      user_achievements: {
        Row: {
          achievement_id: string;
          created_at: string;
          id: string;
          seen_in_ui: boolean;
          unlocked_at: string;
          user_id: string;
        };
        Insert: {
          achievement_id: string;
          created_at?: string;
          id?: string;
          seen_in_ui?: boolean;
          unlocked_at?: string;
          user_id: string;
        };
        Update: {
          achievement_id?: string;
          created_at?: string;
          id?: string;
          seen_in_ui?: boolean;
          unlocked_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "user_achievements_achievement_id_fkey";
            columns: ["achievement_id"];
            isOneToOne: false;
            referencedRelation: "achievements";
            referencedColumns: ["id"];
          },
        ];
      };
      user_artworks: {
        Row: {
          canvas_data_json: Json;
          created_at: string;
          id: string;
          is_finished: boolean;
          last_color_palette_json: Json | null;
          page_id: string | null;
          page_index: number;
          rendered_image_url: string | null;
          story_id: string | null;
          story_slug: string;
          thumbnail_url: string | null;
          title: string | null;
          updated_at: string;
          user_id: string;
          version: number;
        };
        Insert: {
          canvas_data_json?: Json;
          created_at?: string;
          id?: string;
          is_finished?: boolean;
          last_color_palette_json?: Json | null;
          page_id?: string | null;
          page_index: number;
          rendered_image_url?: string | null;
          story_id?: string | null;
          story_slug: string;
          thumbnail_url?: string | null;
          title?: string | null;
          updated_at?: string;
          user_id: string;
          version?: number;
        };
        Update: {
          canvas_data_json?: Json;
          created_at?: string;
          id?: string;
          is_finished?: boolean;
          last_color_palette_json?: Json | null;
          page_id?: string | null;
          page_index?: number;
          rendered_image_url?: string | null;
          story_id?: string | null;
          story_slug?: string;
          thumbnail_url?: string | null;
          title?: string | null;
          updated_at?: string;
          user_id?: string;
          version?: number;
        };
        Relationships: [
          {
            foreignKeyName: "user_artworks_page_id_fkey";
            columns: ["page_id"];
            isOneToOne: false;
            referencedRelation: "stories_pages";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "user_artworks_story_id_fkey";
            columns: ["story_id"];
            isOneToOne: false;
            referencedRelation: "stories";
            referencedColumns: ["id"];
          },
        ];
      };
      user_favorites: {
        Row: {
          created_at: string;
          id: string;
          page_id: string | null;
          story_id: string | null;
          story_slug: string | null;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          page_id?: string | null;
          story_id?: string | null;
          story_slug?: string | null;
          user_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          page_id?: string | null;
          story_id?: string | null;
          story_slug?: string | null;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "user_favorites_page_id_fkey";
            columns: ["page_id"];
            isOneToOne: false;
            referencedRelation: "stories_pages";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "user_favorites_story_id_fkey";
            columns: ["story_id"];
            isOneToOne: false;
            referencedRelation: "stories";
            referencedColumns: ["id"];
          },
        ];
      };
      user_notification_reads: {
        Row: {
          created_at: string;
          id: string;
          story_id: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          story_id: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          story_id?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      user_page_progress: {
        Row: {
          completed_at: string | null;
          created_at: string;
          id: string;
          last_opened_at: string | null;
          page_id: string | null;
          page_index: number;
          started_at: string | null;
          status: string;
          story_id: string | null;
          story_slug: string;
          time_spent_seconds: number;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          completed_at?: string | null;
          created_at?: string;
          id?: string;
          last_opened_at?: string | null;
          page_id?: string | null;
          page_index: number;
          started_at?: string | null;
          status?: string;
          story_id?: string | null;
          story_slug: string;
          time_spent_seconds?: number;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          completed_at?: string | null;
          created_at?: string;
          id?: string;
          last_opened_at?: string | null;
          page_id?: string | null;
          page_index?: number;
          started_at?: string | null;
          status?: string;
          story_id?: string | null;
          story_slug?: string;
          time_spent_seconds?: number;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "user_page_progress_page_id_fkey";
            columns: ["page_id"];
            isOneToOne: false;
            referencedRelation: "stories_pages";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "user_page_progress_story_id_fkey";
            columns: ["story_id"];
            isOneToOne: false;
            referencedRelation: "stories";
            referencedColumns: ["id"];
          },
        ];
      };
      user_recent_activity: {
        Row: {
          activity_type: string;
          created_at: string;
          id: string;
          metadata_json: Json | null;
          reference_id: string | null;
          user_id: string;
        };
        Insert: {
          activity_type: string;
          created_at?: string;
          id?: string;
          metadata_json?: Json | null;
          reference_id?: string | null;
          user_id: string;
        };
        Update: {
          activity_type?: string;
          created_at?: string;
          id?: string;
          metadata_json?: Json | null;
          reference_id?: string | null;
          user_id?: string;
        };
        Relationships: [];
      };
      user_rewards: {
        Row: {
          created_at: string;
          granted_at: string;
          id: string;
          source: string | null;
          type: string;
          user_id: string;
          value_json: Json;
        };
        Insert: {
          created_at?: string;
          granted_at?: string;
          id?: string;
          source?: string | null;
          type: string;
          user_id: string;
          value_json?: Json;
        };
        Update: {
          created_at?: string;
          granted_at?: string;
          id?: string;
          source?: string | null;
          type?: string;
          user_id?: string;
          value_json?: Json;
        };
        Relationships: [];
      };
      user_roles: {
        Row: {
          created_at: string;
          id: string;
          role: Database["public"]["Enums"]["app_role"];
          user_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          role: Database["public"]["Enums"]["app_role"];
          user_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          role?: Database["public"]["Enums"]["app_role"];
          user_id?: string;
        };
        Relationships: [];
      };
      user_story_progress: {
        Row: {
          completed_at: string | null;
          completion_percent: number;
          created_at: string;
          current_page_id: string | null;
          current_page_index: number | null;
          id: string;
          pages_completed: number;
          started_at: string | null;
          status: string;
          story_id: string | null;
          story_slug: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          completed_at?: string | null;
          completion_percent?: number;
          created_at?: string;
          current_page_id?: string | null;
          current_page_index?: number | null;
          id?: string;
          pages_completed?: number;
          started_at?: string | null;
          status?: string;
          story_id?: string | null;
          story_slug: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          completed_at?: string | null;
          completion_percent?: number;
          created_at?: string;
          current_page_id?: string | null;
          current_page_index?: number | null;
          id?: string;
          pages_completed?: number;
          started_at?: string | null;
          status?: string;
          story_id?: string | null;
          story_slug?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "user_story_progress_current_page_id_fkey";
            columns: ["current_page_id"];
            isOneToOne: false;
            referencedRelation: "stories_pages";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "user_story_progress_story_id_fkey";
            columns: ["story_id"];
            isOneToOne: false;
            referencedRelation: "stories";
            referencedColumns: ["id"];
          },
        ];
      };
      user_streaks: {
        Row: {
          best_streak_days: number;
          created_at: string;
          current_streak_days: number;
          id: string;
          last_activity_date: string | null;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          best_streak_days?: number;
          created_at?: string;
          current_streak_days?: number;
          id?: string;
          last_activity_date?: string | null;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          best_streak_days?: number;
          created_at?: string;
          current_streak_days?: number;
          id?: string;
          last_activity_date?: string | null;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      webhook_events: {
        Row: {
          created_at: string;
          error_message: string | null;
          event_type: string | null;
          external_event_id: string | null;
          id: string;
          payload: Json;
          processed: boolean;
          provider: string;
          received_at: string;
        };
        Insert: {
          created_at?: string;
          error_message?: string | null;
          event_type?: string | null;
          external_event_id?: string | null;
          id?: string;
          payload?: Json;
          processed?: boolean;
          provider?: string;
          received_at?: string;
        };
        Update: {
          created_at?: string;
          error_message?: string | null;
          event_type?: string | null;
          external_event_id?: string | null;
          id?: string;
          payload?: Json;
          processed?: boolean;
          provider?: string;
          received_at?: string;
        };
        Relationships: [];
      };
      webhook_integrations: {
        Row: {
          active: boolean;
          created_at: string;
          endpoint_url: string;
          id: string;
          last_received_at: string | null;
          name: string;
          provider: string;
          signing_secret: string | null;
          updated_at: string;
        };
        Insert: {
          active?: boolean;
          created_at?: string;
          endpoint_url: string;
          id?: string;
          last_received_at?: string | null;
          name: string;
          provider?: string;
          signing_secret?: string | null;
          updated_at?: string;
        };
        Update: {
          active?: boolean;
          created_at?: string;
          endpoint_url?: string;
          id?: string;
          last_received_at?: string | null;
          name?: string;
          provider?: string;
          signing_secret?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"];
          _user_id: string;
        };
        Returns: boolean;
      };
    };
    Enums: {
      app_role: "admin" | "moderator" | "user";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "moderator", "user"],
    },
  },
} as const;
