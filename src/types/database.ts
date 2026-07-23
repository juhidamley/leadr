export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      achievements: {
        Row: {
          created_at: string
          criteria: Json | null
          description: string | null
          icon: string | null
          id: string
          key: string
          label: string
        }
        Insert: {
          created_at?: string
          criteria?: Json | null
          description?: string | null
          icon?: string | null
          id?: string
          key: string
          label: string
        }
        Update: {
          created_at?: string
          criteria?: Json | null
          description?: string | null
          icon?: string | null
          id?: string
          key?: string
          label?: string
        }
        Relationships: []
      }
      activities: {
        Row: {
          activity_type_id: string
          client_id: string
          created_at: string
          id: string
          note: string | null
          occurred_at: string
          proof_url: string | null
          source: Database["public"]["Enums"]["activity_source"]
          user_id: string
          verified: Database["public"]["Enums"]["activity_verified"]
          xp_awarded: number
        }
        Insert: {
          activity_type_id: string
          client_id: string
          created_at?: string
          id?: string
          note?: string | null
          occurred_at?: string
          proof_url?: string | null
          source?: Database["public"]["Enums"]["activity_source"]
          user_id: string
          verified?: Database["public"]["Enums"]["activity_verified"]
          xp_awarded?: number
        }
        Update: {
          activity_type_id?: string
          client_id?: string
          created_at?: string
          id?: string
          note?: string | null
          occurred_at?: string
          proof_url?: string | null
          source?: Database["public"]["Enums"]["activity_source"]
          user_id?: string
          verified?: Database["public"]["Enums"]["activity_verified"]
          xp_awarded?: number
        }
        Relationships: [
          {
            foreignKeyName: "activities_activity_type_id_fkey"
            columns: ["activity_type_id"]
            isOneToOne: false
            referencedRelation: "activity_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activities_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activities_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      activity_types: {
        Row: {
          base_xp: number
          category: string
          created_at: string
          daily_cap: number | null
          icon: string | null
          id: string
          is_active: boolean
          key: string
          label: string
          requires_proof: boolean
        }
        Insert: {
          base_xp: number
          category: string
          created_at?: string
          daily_cap?: number | null
          icon?: string | null
          id?: string
          is_active?: boolean
          key: string
          label: string
          requires_proof?: boolean
        }
        Update: {
          base_xp?: number
          category?: string
          created_at?: string
          daily_cap?: number | null
          icon?: string | null
          id?: string
          is_active?: boolean
          key?: string
          label?: string
          requires_proof?: boolean
        }
        Relationships: []
      }
      friendships: {
        Row: {
          created_at: string
          friend_id: string
          id: string
          status: Database["public"]["Enums"]["friendship_status"]
          user_id: string
        }
        Insert: {
          created_at?: string
          friend_id: string
          id?: string
          status?: Database["public"]["Enums"]["friendship_status"]
          user_id: string
        }
        Update: {
          created_at?: string
          friend_id?: string
          id?: string
          status?: Database["public"]["Enums"]["friendship_status"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "friendships_friend_id_fkey"
            columns: ["friend_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "friendships_friend_id_fkey"
            columns: ["friend_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "friendships_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "friendships_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      group_members: {
        Row: {
          group_id: string
          joined_at: string
          role: Database["public"]["Enums"]["member_role"]
          user_id: string
        }
        Insert: {
          group_id: string
          joined_at?: string
          role?: Database["public"]["Enums"]["member_role"]
          user_id: string
        }
        Update: {
          group_id?: string
          joined_at?: string
          role?: Database["public"]["Enums"]["member_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "group_members_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "group_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "group_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      groups: {
        Row: {
          created_at: string
          id: string
          join_code: string
          name: string
          owner_id: string
          type: Database["public"]["Enums"]["group_type"]
        }
        Insert: {
          created_at?: string
          id?: string
          join_code: string
          name: string
          owner_id: string
          type?: Database["public"]["Enums"]["group_type"]
        }
        Update: {
          created_at?: string
          id?: string
          join_code?: string
          name?: string
          owner_id?: string
          type?: Database["public"]["Enums"]["group_type"]
        }
        Relationships: [
          {
            foreignKeyName: "groups_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "groups_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      leaderboard_entries: {
        Row: {
          id: string
          league_division: string | null
          period_id: string
          rank: number | null
          rank_change: number
          user_id: string
          xp_in_period: number
        }
        Insert: {
          id?: string
          league_division?: string | null
          period_id: string
          rank?: number | null
          rank_change?: number
          user_id: string
          xp_in_period?: number
        }
        Update: {
          id?: string
          league_division?: string | null
          period_id?: string
          rank?: number | null
          rank_change?: number
          user_id?: string
          xp_in_period?: number
        }
        Relationships: [
          {
            foreignKeyName: "leaderboard_entries_period_id_fkey"
            columns: ["period_id"]
            isOneToOne: false
            referencedRelation: "leaderboard_periods"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leaderboard_entries_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leaderboard_entries_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      leaderboard_periods: {
        Row: {
          id: string
          period_end: string
          period_start: string
          scope: Database["public"]["Enums"]["leaderboard_scope"]
          scope_id: string | null
        }
        Insert: {
          id?: string
          period_end: string
          period_start: string
          scope: Database["public"]["Enums"]["leaderboard_scope"]
          scope_id?: string | null
        }
        Update: {
          id?: string
          period_end?: string
          period_start?: string
          scope?: Database["public"]["Enums"]["leaderboard_scope"]
          scope_id?: string | null
        }
        Relationships: []
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          payload: Json | null
          read_at: string | null
          sent_at: string | null
          type: Database["public"]["Enums"]["notification_type"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          payload?: Json | null
          read_at?: string | null
          sent_at?: string | null
          type: Database["public"]["Enums"]["notification_type"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          payload?: Json | null
          read_at?: string | null
          sent_at?: string | null
          type?: Database["public"]["Enums"]["notification_type"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      user_achievements: {
        Row: {
          achievement_id: string
          id: string
          unlocked_at: string
          user_id: string
        }
        Insert: {
          achievement_id: string
          id?: string
          unlocked_at?: string
          user_id: string
        }
        Update: {
          achievement_id?: string
          id?: string
          unlocked_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_achievements_achievement_id_fkey"
            columns: ["achievement_id"]
            isOneToOne: false
            referencedRelation: "achievements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_achievements_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_achievements_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          avatar_url: string | null
          career_goal: string | null
          created_at: string
          current_level: number
          current_streak: number
          display_name: string | null
          handle: string
          id: string
          last_active_date: string | null
          last_freeze_at: string | null
          longest_streak: number
          onboarded: boolean
          phone: string | null
          push_token: string | null
          target_role: string | null
          timezone: string
          total_xp: number
        }
        Insert: {
          avatar_url?: string | null
          career_goal?: string | null
          created_at?: string
          current_level?: number
          current_streak?: number
          display_name?: string | null
          handle: string
          id: string
          last_active_date?: string | null
          last_freeze_at?: string | null
          longest_streak?: number
          onboarded?: boolean
          phone?: string | null
          push_token?: string | null
          target_role?: string | null
          timezone?: string
          total_xp?: number
        }
        Update: {
          avatar_url?: string | null
          career_goal?: string | null
          created_at?: string
          current_level?: number
          current_streak?: number
          display_name?: string | null
          handle?: string
          id?: string
          last_active_date?: string | null
          last_freeze_at?: string | null
          longest_streak?: number
          onboarded?: boolean
          phone?: string | null
          push_token?: string | null
          target_role?: string | null
          timezone?: string
          total_xp?: number
        }
        Relationships: []
      }
    }
    Views: {
      public_profiles: {
        Row: {
          avatar_url: string | null
          current_level: number | null
          current_streak: number | null
          display_name: string | null
          handle: string | null
          id: string | null
          total_xp: number | null
        }
        Insert: {
          avatar_url?: string | null
          current_level?: number | null
          current_streak?: number | null
          display_name?: string | null
          handle?: string | null
          id?: string | null
          total_xp?: number | null
        }
        Update: {
          avatar_url?: string | null
          current_level?: number | null
          current_streak?: number | null
          display_name?: string | null
          handle?: string | null
          id?: string | null
          total_xp?: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      award_xp: {
        Args: {
          p_activity_type_key: string
          p_client_id: string
          p_note?: string
          p_occurred_at?: string
          p_proof_url?: string
          p_source?: Database["public"]["Enums"]["activity_source"]
          p_user_id: string
        }
        Returns: {
          activity_id: string
          capped: boolean
          current_level: number
          current_streak: number
          longest_streak: number
          streak_freeze_used: boolean
          total_xp: number
          xp_awarded: number
          xp_in_period: number
        }[]
      }
      block_user: { Args: { target: string }; Returns: undefined }
      cancel_friend_request: { Args: { target: string }; Returns: undefined }
      is_accepted_friend: { Args: { target: string }; Returns: boolean }
      is_group_member: { Args: { g: string }; Returns: boolean }
      is_handle_available: { Args: { candidate: string }; Returns: boolean }
      level_for_xp: { Args: { p_xp: number }; Returns: number }
      list_friend_requests: {
        Args: never
        Returns: {
          avatar_url: string
          created_at: string
          direction: Database["public"]["Enums"]["friend_request_direction"]
          display_name: string
          handle: string
          user_id: string
        }[]
      }
      list_friends: {
        Args: never
        Returns: {
          avatar_url: string
          current_level: number
          current_streak: number
          display_name: string
          handle: string
          id: string
          total_xp: number
        }[]
      }
      redeem_invite: { Args: { inviter_handle: string }; Returns: undefined }
      remove_friend: { Args: { other: string }; Returns: undefined }
      respond_to_request: {
        Args: { accept: boolean; requester: string }
        Returns: undefined
      }
      search_users: {
        Args: { lim?: number; q: string }
        Returns: {
          avatar_url: string
          display_name: string
          handle: string
          id: string
          relationship: Database["public"]["Enums"]["friend_relationship"]
        }[]
      }
      send_friend_request: {
        Args: { target: string }
        Returns: Database["public"]["Enums"]["friendship_status"]
      }
      unblock_user: { Args: { target: string }; Returns: undefined }
      xp_for_level: { Args: { p_level: number }; Returns: number }
    }
    Enums: {
      activity_source: "manual" | "gmail" | "calendar" | "linkedin"
      activity_verified: "self" | "proof" | "auto"
      friend_relationship:
        | "none"
        | "outgoing"
        | "incoming"
        | "friends"
        | "blocked"
      friend_request_direction: "incoming" | "outgoing"
      friendship_status: "pending" | "accepted" | "blocked"
      group_type: "friends" | "cohort" | "class"
      leaderboard_scope: "friends" | "group" | "league"
      member_role: "member" | "admin"
      notification_type:
        | "streak_reminder"
        | "passed_by_friend"
        | "weekly_result"
        | "achievement"
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      activity_source: ["manual", "gmail", "calendar", "linkedin"],
      activity_verified: ["self", "proof", "auto"],
      friend_relationship: [
        "none",
        "outgoing",
        "incoming",
        "friends",
        "blocked",
      ],
      friend_request_direction: ["incoming", "outgoing"],
      friendship_status: ["pending", "accepted", "blocked"],
      group_type: ["friends", "cohort", "class"],
      leaderboard_scope: ["friends", "group", "league"],
      member_role: ["member", "admin"],
      notification_type: [
        "streak_reminder",
        "passed_by_friend",
        "weekly_result",
        "achievement",
      ],
    },
  },
} as const

