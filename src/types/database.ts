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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
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
      holders: {
        Row: {
          birth_year: number | null
          created_at: string
          id: string
          is_minor: boolean
          name: string
          owner_id: string
          slug: string
          updated_at: string
        }
        Insert: {
          birth_year?: number | null
          created_at?: string
          id?: string
          is_minor?: boolean
          name: string
          owner_id: string
          slug: string
          updated_at?: string
        }
        Update: {
          birth_year?: number | null
          created_at?: string
          id?: string
          is_minor?: boolean
          name?: string
          owner_id?: string
          slug?: string
          updated_at?: string
        }
        Relationships: []
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
      [_ in never]: never
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
  T extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"]),
> = (DefaultSchema["Tables"] & DefaultSchema["Views"])[T] extends { Row: infer R } ? R : never

export type TablesInsert<T extends keyof DefaultSchema["Tables"]> =
  DefaultSchema["Tables"][T] extends { Insert: infer I } ? I : never

export type TablesUpdate<T extends keyof DefaultSchema["Tables"]> =
  DefaultSchema["Tables"][T] extends { Update: infer U } ? U : never

export type Enums<T extends keyof DefaultSchema["Enums"]> = DefaultSchema["Enums"][T]

// Aliases convenientes
export type DBHolder = Tables<"holders">
export type DBStrategy = Tables<"strategies">
export type DBStrategyAllocation = Tables<"strategy_allocations">
export type DBPosition = Tables<"positions">
export type DBImportBatch = Tables<"import_batches">
export type DBAlert = Tables<"alerts">
export type DBExchangeRate = Tables<"exchange_rates">
