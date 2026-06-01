export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      position_structures: {
        Row: {
          id: string
          holder_id: string
          name: string
          type: "covered_call" | "synthetic_dividend" | "collar" | "protective_put"
          status: "active" | "expired" | "closed"
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          holder_id: string
          name: string
          type: "covered_call" | "synthetic_dividend" | "collar" | "protective_put"
          status?: "active" | "expired" | "closed"
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          holder_id?: string
          name?: string
          type?: "covered_call" | "synthetic_dividend" | "collar" | "protective_put"
          status?: "active" | "expired" | "closed"
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [{ foreignKeyName: "position_structures_holder_id_fkey"; columns: ["holder_id"]; referencedRelation: "holders"; referencedColumns: ["id"] }]
      }
      position_structure_legs: {
        Row: {
          id: string
          structure_id: string
          role: "underlying" | "short_call" | "long_put" | "short_put" | "long_call"
          ticker: string | null
          asset_class: string | null
          strike: number | null
          expiration_date: string | null
          contracts: number | null
          premium: number | null
          sort_order: number
        }
        Insert: {
          id?: string
          structure_id: string
          role: "underlying" | "short_call" | "long_put" | "short_put" | "long_call"
          ticker?: string | null
          asset_class?: string | null
          strike?: number | null
          expiration_date?: string | null
          contracts?: number | null
          premium?: number | null
          sort_order?: number
        }
        Update: {
          id?: string
          structure_id?: string
          role?: "underlying" | "short_call" | "long_put" | "short_put" | "long_call"
          ticker?: string | null
          asset_class?: string | null
          strike?: number | null
          expiration_date?: string | null
          contracts?: number | null
          premium?: number | null
          sort_order?: number
        }
        Relationships: [{ foreignKeyName: "position_structure_legs_structure_id_fkey"; columns: ["structure_id"]; referencedRelation: "position_structures"; referencedColumns: ["id"] }]
      }
      council_sessions: {
        Row: {
          id: string
          holder_id: string
          title: string
          mode: "advisor_first" | "user_first"
          initial_prompt: string
          current_round: number
          max_rounds: number
          status: "pending" | "running" | "awaiting_human" | "synthesizing" | "completed" | "no_consensus"
          created_at: string
          completed_at: string | null
        }
        Insert: {
          id?: string
          holder_id: string
          title: string
          mode?: "advisor_first" | "user_first"
          initial_prompt?: string
          current_round?: number
          max_rounds?: number
          status?: "pending" | "running" | "awaiting_human" | "synthesizing" | "completed" | "no_consensus"
          created_at?: string
          completed_at?: string | null
        }
        Update: {
          id?: string
          holder_id?: string
          title?: string
          mode?: "advisor_first" | "user_first"
          initial_prompt?: string
          current_round?: number
          max_rounds?: number
          status?: "pending" | "running" | "awaiting_human" | "synthesizing" | "completed" | "no_consensus"
          created_at?: string
          completed_at?: string | null
        }
        Relationships: [{ foreignKeyName: "council_sessions_holder_id_fkey"; columns: ["holder_id"]; referencedRelation: "holders"; referencedColumns: ["id"] }]
      }
      council_participants: {
        Row: {
          id: string
          session_id: string
          name: string
          type: "llm" | "human"
          model: string | null
          role_focus: string | null
          sort_order: number
        }
        Insert: {
          id?: string
          session_id: string
          name: string
          type: "llm" | "human"
          model?: string | null
          role_focus?: string | null
          sort_order?: number
        }
        Update: {
          id?: string
          session_id?: string
          name?: string
          type?: "llm" | "human"
          model?: string | null
          role_focus?: string | null
          sort_order?: number
        }
        Relationships: [{ foreignKeyName: "council_participants_session_id_fkey"; columns: ["session_id"]; referencedRelation: "council_sessions"; referencedColumns: ["id"] }]
      }
      council_messages: {
        Row: {
          id: string
          session_id: string
          participant_id: string | null
          round: number
          message_type: "llm" | "human_user" | "human_advisor" | "round_judge" | "synthesis"
          content: string
          created_at: string
        }
        Insert: {
          id?: string
          session_id: string
          participant_id?: string | null
          round: number
          message_type?: "llm" | "human_user" | "human_advisor" | "round_judge" | "synthesis"
          content: string
          created_at?: string
        }
        Update: {
          id?: string
          session_id?: string
          participant_id?: string | null
          round?: number
          message_type?: "llm" | "human_user" | "human_advisor" | "round_judge" | "synthesis"
          content?: string
          created_at?: string
        }
        Relationships: [
          { foreignKeyName: "council_messages_session_id_fkey"; columns: ["session_id"]; referencedRelation: "council_sessions"; referencedColumns: ["id"] },
          { foreignKeyName: "council_messages_participant_id_fkey"; columns: ["participant_id"]; referencedRelation: "council_participants"; referencedColumns: ["id"] }
        ]
      }
      alerts: {
        Row: {
          description: string
          dismissed_at: string | null
          generated_at: string
          generated_by: string
          holder_id: string | null
          id: string
          read_at: string | null
          recommendation: string | null
          severity: Database["public"]["Enums"]["alert_severity"]
          sources: string[] | null
          status: Database["public"]["Enums"]["alert_status"]
          ticker: string | null
          title: string
        }
        Insert: {
          description: string
          dismissed_at?: string | null
          generated_at?: string
          generated_by?: string
          holder_id?: string | null
          id?: string
          read_at?: string | null
          recommendation?: string | null
          severity: Database["public"]["Enums"]["alert_severity"]
          sources?: string[] | null
          status?: Database["public"]["Enums"]["alert_status"]
          ticker?: string | null
          title: string
        }
        Update: {
          description?: string
          dismissed_at?: string | null
          generated_at?: string
          generated_by?: string
          holder_id?: string | null
          id?: string
          read_at?: string | null
          recommendation?: string | null
          severity?: Database["public"]["Enums"]["alert_severity"]
          sources?: string[] | null
          status?: Database["public"]["Enums"]["alert_status"]
          ticker?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "alerts_holder_id_fkey"
            columns: ["holder_id"]
            isOneToOne: false
            referencedRelation: "holders"
            referencedColumns: ["id"]
          },
        ]
      }
      exchange_rates: {
        Row: {
          currency_pair: string
          id: string
          rate: number
          rate_date: string
          registered_at: string
          registered_by: string | null
          source: string
        }
        Insert: {
          currency_pair?: string
          id?: string
          rate: number
          rate_date: string
          registered_at?: string
          registered_by?: string | null
          source?: string
        }
        Update: {
          currency_pair?: string
          id?: string
          rate?: number
          rate_date?: string
          registered_at?: string
          registered_by?: string | null
          source?: string
        }
        Relationships: []
      }
      families: {
        Row: {
          created_at: string
          id: string
          name: string
          owner_user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          owner_user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          owner_user_id?: string
        }
        Relationships: []
      }
      family_cpfs: {
        Row: {
          added_at: string
          added_by: string
          cpf: string
          family_id: string
          id: string
        }
        Insert: {
          added_at?: string
          added_by: string
          cpf: string
          family_id: string
          id?: string
        }
        Update: {
          added_at?: string
          added_by?: string
          cpf?: string
          family_id?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "family_cpfs_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "families"
            referencedColumns: ["id"]
          },
        ]
      }
      holders: {
        Row: {
          birth_date: string | null
          cpf: string | null
          created_at: string
          family_id: string | null
          full_name: string | null
          id: string
          name: string
          role: string
          slug: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          birth_date?: string | null
          cpf?: string | null
          created_at?: string
          family_id?: string | null
          full_name?: string | null
          id?: string
          name: string
          role?: string
          slug: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          birth_date?: string | null
          cpf?: string | null
          created_at?: string
          family_id?: string | null
          full_name?: string | null
          id?: string
          name?: string
          role?: string
          slug?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "holders_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "families"
            referencedColumns: ["id"]
          },
        ]
      }
      import_batches: {
        Row: {
          completed_at: string | null
          error_message: string | null
          exchange_rate: number | null
          exchange_rate_date: string | null
          filename: string | null
          holder_id: string
          id: string
          imported_at: string
          imported_by: string | null
          institution: Database["public"]["Enums"]["institution"]
          row_count: number | null
          source: string
          status: Database["public"]["Enums"]["import_status"]
        }
        Insert: {
          completed_at?: string | null
          error_message?: string | null
          exchange_rate?: number | null
          exchange_rate_date?: string | null
          filename?: string | null
          holder_id: string
          id?: string
          imported_at?: string
          imported_by?: string | null
          institution: Database["public"]["Enums"]["institution"]
          row_count?: number | null
          source?: string
          status?: Database["public"]["Enums"]["import_status"]
        }
        Update: {
          completed_at?: string | null
          error_message?: string | null
          exchange_rate?: number | null
          exchange_rate_date?: string | null
          filename?: string | null
          holder_id?: string
          id?: string
          imported_at?: string
          imported_by?: string | null
          institution?: Database["public"]["Enums"]["institution"]
          row_count?: number | null
          source?: string
          status?: Database["public"]["Enums"]["import_status"]
        }
        Relationships: [
          {
            foreignKeyName: "import_batches_holder_id_fkey"
            columns: ["holder_id"]
            isOneToOne: false
            referencedRelation: "holders"
            referencedColumns: ["id"]
          },
        ]
      }
      positions: {
        Row: {
          asset_class: Database["public"]["Enums"]["asset_class"]
          avg_price: number | null
          batch_id: string
          cost_basis: number | null
          created_at: string
          currency: Database["public"]["Enums"]["currency"]
          current_price: number | null
          exchange_rate: number | null
          holder_id: string
          id: string
          indexer: Database["public"]["Enums"]["indexer"] | null
          indexer_rate: number | null
          institution: Database["public"]["Enums"]["institution"]
          liquidity_days: number | null
          market_value: number
          market_value_brl: number | null
          maturity_date: string | null
          name: string
          pnl: number | null
          pnl_pct: number | null
          quantity: number
          quota_date: string | null
          quota_value: number | null
          raw_data: Json | null
          ticker: string | null
        }
        Insert: {
          asset_class: Database["public"]["Enums"]["asset_class"]
          avg_price?: number | null
          batch_id: string
          cost_basis?: number | null
          created_at?: string
          currency?: Database["public"]["Enums"]["currency"]
          current_price?: number | null
          exchange_rate?: number | null
          holder_id: string
          id?: string
          indexer?: Database["public"]["Enums"]["indexer"] | null
          indexer_rate?: number | null
          institution: Database["public"]["Enums"]["institution"]
          liquidity_days?: number | null
          market_value: number
          market_value_brl?: number | null
          maturity_date?: string | null
          name: string
          pnl?: number | null
          pnl_pct?: number | null
          quantity?: number
          quota_date?: string | null
          quota_value?: number | null
          raw_data?: Json | null
          ticker?: string | null
        }
        Update: {
          asset_class?: Database["public"]["Enums"]["asset_class"]
          avg_price?: number | null
          batch_id?: string
          cost_basis?: number | null
          created_at?: string
          currency?: Database["public"]["Enums"]["currency"]
          current_price?: number | null
          exchange_rate?: number | null
          holder_id?: string
          id?: string
          indexer?: Database["public"]["Enums"]["indexer"] | null
          indexer_rate?: number | null
          institution?: Database["public"]["Enums"]["institution"]
          liquidity_days?: number | null
          market_value?: number
          market_value_brl?: number | null
          maturity_date?: string | null
          name?: string
          pnl?: number | null
          pnl_pct?: number | null
          quantity?: number
          quota_date?: string | null
          quota_value?: number | null
          raw_data?: Json | null
          ticker?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "positions_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "import_batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "positions_holder_id_fkey"
            columns: ["holder_id"]
            isOneToOne: false
            referencedRelation: "holders"
            referencedColumns: ["id"]
          },
        ]
      }
      strategies: {
        Row: {
          created_at: string
          deviation_threshold_pct: number
          goal_description: string | null
          goal_monthly_income: number | null
          goal_target_age: number | null
          holder_id: string
          id: string
          investment_horizon_years: number | null
          liquidity_min_pct: number
          notes: string | null
          restricted_assets: string[] | null
          risk_profile: Database["public"]["Enums"]["risk_profile"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          deviation_threshold_pct?: number
          goal_description?: string | null
          goal_monthly_income?: number | null
          goal_target_age?: number | null
          holder_id: string
          id?: string
          investment_horizon_years?: number | null
          liquidity_min_pct?: number
          notes?: string | null
          restricted_assets?: string[] | null
          risk_profile: Database["public"]["Enums"]["risk_profile"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          deviation_threshold_pct?: number
          goal_description?: string | null
          goal_monthly_income?: number | null
          goal_target_age?: number | null
          holder_id?: string
          id?: string
          investment_horizon_years?: number | null
          liquidity_min_pct?: number
          notes?: string | null
          restricted_assets?: string[] | null
          risk_profile?: Database["public"]["Enums"]["risk_profile"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "strategies_holder_id_fkey"
            columns: ["holder_id"]
            isOneToOne: true
            referencedRelation: "holders"
            referencedColumns: ["id"]
          },
        ]
      }
      strategy_allocations: {
        Row: {
          asset_class: Database["public"]["Enums"]["asset_class"]
          id: string
          rationale: string | null
          strategy_id: string
          target_pct: number
          tolerance_pct: number
        }
        Insert: {
          asset_class: Database["public"]["Enums"]["asset_class"]
          id?: string
          rationale?: string | null
          strategy_id: string
          target_pct: number
          tolerance_pct: number
        }
        Update: {
          asset_class?: Database["public"]["Enums"]["asset_class"]
          id?: string
          rationale?: string | null
          strategy_id?: string
          target_pct?: number
          tolerance_pct?: number
        }
        Relationships: [
          {
            foreignKeyName: "strategy_allocations_strategy_id_fkey"
            columns: ["strategy_id"]
            isOneToOne: false
            referencedRelation: "strategies"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      claim_holder_by_cpf: { Args: Record<PropertyKey, never>; Returns: string }
      is_family_owner: { Args: { p_family_id: string }; Returns: boolean }
      my_family_id: { Args: Record<PropertyKey, never>; Returns: string }
    }
    Enums: {
      alert_severity: "info" | "warning" | "critical"
      alert_status: "unread" | "read" | "dismissed"
      asset_class:
        | "fiis"
        | "stocks_br"
        | "stocks_intl"
        | "fixed_income"
        | "funds"
        | "liquidity"
        | "etf_br"
        | "etf_intl"
      currency: "BRL" | "USD"
      import_status: "pending" | "processing" | "completed" | "failed"
      indexer: "cdi" | "ipca" | "igpm" | "selic" | "prefixado" | "usd" | "none"
      institution: "xp" | "btg" | "nomad"
      risk_profile: "conservative" | "moderate" | "aggressive"
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
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
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
      alert_severity: ["info", "warning", "critical"],
      alert_status: ["unread", "read", "dismissed"],
      asset_class: [
        "fiis",
        "stocks_br",
        "stocks_intl",
        "fixed_income",
        "funds",
        "liquidity",
        "etf_br",
        "etf_intl",
      ],
      currency: ["BRL", "USD"],
      import_status: ["pending", "processing", "completed", "failed"],
      indexer: ["cdi", "ipca", "igpm", "selic", "prefixado", "usd", "none"],
      institution: ["xp", "btg", "nomad"],
      risk_profile: ["conservative", "moderate", "aggressive"],
    },
  },
} as const

// Convenience aliases
export type DBHolder = Database["public"]["Tables"]["holders"]["Row"]
export type DBFamily = Database["public"]["Tables"]["families"]["Row"]
export type DBFamilyCpf = Database["public"]["Tables"]["family_cpfs"]["Row"]
export type DBStrategy = Database["public"]["Tables"]["strategies"]["Row"]
export type DBStrategyAllocation = Database["public"]["Tables"]["strategy_allocations"]["Row"]
export type DBPosition = Database["public"]["Tables"]["positions"]["Row"]
export type DBImportBatch = Database["public"]["Tables"]["import_batches"]["Row"]
export type DBAlert = Database["public"]["Tables"]["alerts"]["Row"]
export type DBExchangeRate = Database["public"]["Tables"]["exchange_rates"]["Row"]
export type DBPositionStructure = Database["public"]["Tables"]["position_structures"]["Row"]
export type DBPositionStructureLeg = Database["public"]["Tables"]["position_structure_legs"]["Row"]
export type DBCouncilSession = Database["public"]["Tables"]["council_sessions"]["Row"]
export type DBCouncilParticipant = Database["public"]["Tables"]["council_participants"]["Row"]
export type DBCouncilMessage = Database["public"]["Tables"]["council_messages"]["Row"]
