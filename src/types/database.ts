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
      alert_mutes: {
        Row: {
          alert_type: string | null
          created_at: string
          family_id: string
          id: string
          muted_until: string | null
          ticker: string | null
        }
        Insert: {
          alert_type?: string | null
          created_at?: string
          family_id: string
          id?: string
          muted_until?: string | null
          ticker?: string | null
        }
        Update: {
          alert_type?: string | null
          created_at?: string
          family_id?: string
          id?: string
          muted_until?: string | null
          ticker?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "alert_mutes_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "families"
            referencedColumns: ["id"]
          },
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
      asset_analysis_results: {
        Row: {
          analyzed_at: string
          archetype: string | null
          id: string
          justifications: Json | null
          missing_metrics: string[] | null
          quality_score: string | null
          recommendation: string | null
          semaphores: Json | null
          solvency_override: boolean | null
          status: string
          ticker: string
          trend_downgrade: boolean | null
          valuation: string | null
        }
        Insert: {
          analyzed_at?: string
          archetype?: string | null
          id?: string
          justifications?: Json | null
          missing_metrics?: string[] | null
          quality_score?: string | null
          recommendation?: string | null
          semaphores?: Json | null
          solvency_override?: boolean | null
          status?: string
          ticker: string
          trend_downgrade?: boolean | null
          valuation?: string | null
        }
        Update: {
          analyzed_at?: string
          archetype?: string | null
          id?: string
          justifications?: Json | null
          missing_metrics?: string[] | null
          quality_score?: string | null
          recommendation?: string | null
          semaphores?: Json | null
          solvency_override?: boolean | null
          status?: string
          ticker?: string
          trend_downgrade?: boolean | null
          valuation?: string | null
        }
        Relationships: []
      }
      asset_analysis_rules: {
        Row: {
          archetype: string | null
          asset_class: string
          auto_fetch: boolean | null
          context_notes: string | null
          direction: string
          field_name: string
          id: string
          label: string
          metric_id: string
          structural: boolean | null
          threshold_critical: string
          threshold_ok: string
          threshold_warning: string
          trend_window_quarters: number | null
          unit: string | null
        }
        Insert: {
          archetype?: string | null
          asset_class?: string
          auto_fetch?: boolean | null
          context_notes?: string | null
          direction: string
          field_name: string
          id?: string
          label: string
          metric_id: string
          structural?: boolean | null
          threshold_critical: string
          threshold_ok: string
          threshold_warning: string
          trend_window_quarters?: number | null
          unit?: string | null
        }
        Update: {
          archetype?: string | null
          asset_class?: string
          auto_fetch?: boolean | null
          context_notes?: string | null
          direction?: string
          field_name?: string
          id?: string
          label?: string
          metric_id?: string
          structural?: boolean | null
          threshold_critical?: string
          threshold_ok?: string
          threshold_warning?: string
          trend_window_quarters?: number | null
          unit?: string | null
        }
        Relationships: []
      }
      asset_archetypes: {
        Row: {
          archetype: string
          asset_class: string
          classified_at: string | null
          classified_by: string | null
          sector_b3: string | null
          subsegment: string | null
          ticker: string
        }
        Insert: {
          archetype: string
          asset_class?: string
          classified_at?: string | null
          classified_by?: string | null
          sector_b3?: string | null
          subsegment?: string | null
          ticker: string
        }
        Update: {
          archetype?: string
          asset_class?: string
          classified_at?: string | null
          classified_by?: string | null
          sector_b3?: string | null
          subsegment?: string | null
          ticker?: string
        }
        Relationships: []
      }
      asset_fundamentals: {
        Row: {
          cresc_rec_5a: number | null
          div_liq_ebitda: number | null
          div_liq_patrim: number | null
          dy: number | null
          ebitda: number | null
          ev_ebitda: number | null
          fetched_at: string
          id: string
          liquidez_corr: number | null
          lucro_liquido: number | null
          manual_overrides: Json | null
          marg_bruta: number | null
          marg_ebit: number | null
          marg_liquida: number | null
          market_cap: number | null
          pl: number | null
          preco_atual: number | null
          pvp: number | null
          raw_brapi: Json | null
          raw_fundamentus: Json | null
          receita_liquida: number | null
          roa: number | null
          roe: number | null
          roic: number | null
          sector_b3: string | null
          source: string | null
          ticker: string
          volume_medio: number | null
        }
        Insert: {
          cresc_rec_5a?: number | null
          div_liq_ebitda?: number | null
          div_liq_patrim?: number | null
          dy?: number | null
          ebitda?: number | null
          ev_ebitda?: number | null
          fetched_at?: string
          id?: string
          liquidez_corr?: number | null
          lucro_liquido?: number | null
          manual_overrides?: Json | null
          marg_bruta?: number | null
          marg_ebit?: number | null
          marg_liquida?: number | null
          market_cap?: number | null
          pl?: number | null
          preco_atual?: number | null
          pvp?: number | null
          raw_brapi?: Json | null
          raw_fundamentus?: Json | null
          receita_liquida?: number | null
          roa?: number | null
          roe?: number | null
          roic?: number | null
          sector_b3?: string | null
          source?: string | null
          ticker: string
          volume_medio?: number | null
        }
        Update: {
          cresc_rec_5a?: number | null
          div_liq_ebitda?: number | null
          div_liq_patrim?: number | null
          dy?: number | null
          ebitda?: number | null
          ev_ebitda?: number | null
          fetched_at?: string
          id?: string
          liquidez_corr?: number | null
          lucro_liquido?: number | null
          manual_overrides?: Json | null
          marg_bruta?: number | null
          marg_ebit?: number | null
          marg_liquida?: number | null
          market_cap?: number | null
          pl?: number | null
          preco_atual?: number | null
          pvp?: number | null
          raw_brapi?: Json | null
          raw_fundamentus?: Json | null
          receita_liquida?: number | null
          roa?: number | null
          roe?: number | null
          roic?: number | null
          sector_b3?: string | null
          source?: string | null
          ticker?: string
          volume_medio?: number | null
        }
        Relationships: []
      }
      audit_logs: {
        Row: {
          action: string
          created_at: string
          id: string
          ip_address: string | null
          metadata: Json
          resource: string | null
          user_agent: string | null
          user_email: string | null
          user_id: string | null
          user_role: string | null
        }
        Insert: {
          action: string
          created_at?: string
          id?: string
          ip_address?: string | null
          metadata?: Json
          resource?: string | null
          user_agent?: string | null
          user_email?: string | null
          user_id?: string | null
          user_role?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          id?: string
          ip_address?: string | null
          metadata?: Json
          resource?: string | null
          user_agent?: string | null
          user_email?: string | null
          user_id?: string | null
          user_role?: string | null
        }
        Relationships: []
      }
      chat_messages: {
        Row: {
          content: string
          created_at: string
          id: string
          role: string
          session_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          role: string
          session_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          role?: string
          session_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "chat_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_sessions: {
        Row: {
          created_at: string
          id: string
          scope_holder_id: string | null
          scope_type: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          scope_holder_id?: string | null
          scope_type?: string
          title?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          scope_holder_id?: string | null
          scope_type?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_sessions_scope_holder_id_fkey"
            columns: ["scope_holder_id"]
            isOneToOne: false
            referencedRelation: "holders"
            referencedColumns: ["id"]
          },
        ]
      }
      council_messages: {
        Row: {
          content: string
          created_at: string
          id: string
          message_type: string
          participant_id: string | null
          round: number
          session_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          message_type?: string
          participant_id?: string | null
          round: number
          session_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          message_type?: string
          participant_id?: string | null
          round?: number
          session_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "council_messages_participant_id_fkey"
            columns: ["participant_id"]
            isOneToOne: false
            referencedRelation: "council_participants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "council_messages_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "council_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      council_participants: {
        Row: {
          id: string
          model: string | null
          name: string
          role_focus: string | null
          session_id: string
          sort_order: number
          type: string
        }
        Insert: {
          id?: string
          model?: string | null
          name: string
          role_focus?: string | null
          session_id: string
          sort_order?: number
          type: string
        }
        Update: {
          id?: string
          model?: string | null
          name?: string
          role_focus?: string | null
          session_id?: string
          sort_order?: number
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "council_participants_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "council_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      council_sessions: {
        Row: {
          autonomous: boolean
          completed_at: string | null
          created_at: string
          current_round: number
          holder_id: string
          id: string
          initial_prompt: string
          max_rounds: number
          mode: string
          status: string
          title: string
        }
        Insert: {
          autonomous?: boolean
          completed_at?: string | null
          created_at?: string
          current_round?: number
          holder_id: string
          id?: string
          initial_prompt?: string
          max_rounds?: number
          mode?: string
          status?: string
          title: string
        }
        Update: {
          autonomous?: boolean
          completed_at?: string | null
          created_at?: string
          current_round?: number
          holder_id?: string
          id?: string
          initial_prompt?: string
          max_rounds?: number
          mode?: string
          status?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "council_sessions_holder_id_fkey"
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
      family_advisors: {
        Row: {
          accepted_at: string | null
          family_id: string
          id: string
          invite_token: string
          invited_at: string
          invited_by: string
          invited_email: string
          role: string
          status: string
          user_id: string | null
        }
        Insert: {
          accepted_at?: string | null
          family_id: string
          id?: string
          invite_token?: string
          invited_at?: string
          invited_by: string
          invited_email: string
          role: string
          status?: string
          user_id?: string | null
        }
        Update: {
          accepted_at?: string | null
          family_id?: string
          id?: string
          invite_token?: string
          invited_at?: string
          invited_by?: string
          invited_email?: string
          role?: string
          status?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "family_advisors_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "families"
            referencedColumns: ["id"]
          },
        ]
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
      fii_analysis_results: {
        Row: {
          analyzed_at: string
          created_at: string | null
          fii_type: string | null
          id: string
          justifications: Json | null
          missing_metrics: string[] | null
          quality_score: string | null
          recommendation: string | null
          semaphores: Json | null
          status: string
          subsegment: string | null
          sustainability_override: boolean | null
          ticker: string
          trend_downgrade: boolean | null
          valuation: string | null
        }
        Insert: {
          analyzed_at: string
          created_at?: string | null
          fii_type?: string | null
          id?: string
          justifications?: Json | null
          missing_metrics?: string[] | null
          quality_score?: string | null
          recommendation?: string | null
          semaphores?: Json | null
          status: string
          subsegment?: string | null
          sustainability_override?: boolean | null
          ticker: string
          trend_downgrade?: boolean | null
          valuation?: string | null
        }
        Update: {
          analyzed_at?: string
          created_at?: string | null
          fii_type?: string | null
          id?: string
          justifications?: Json | null
          missing_metrics?: string[] | null
          quality_score?: string | null
          recommendation?: string | null
          semaphores?: Json | null
          status?: string
          subsegment?: string | null
          sustainability_override?: boolean | null
          ticker?: string
          trend_downgrade?: boolean | null
          valuation?: string | null
        }
        Relationships: []
      }
      fii_fundamentals: {
        Row: {
          cap_rate: number | null
          concentracao_devedor: number | null
          concentracao_imovel: number | null
          concentracao_inquilino: number | null
          contratos_atipicos_pct: number | null
          contratos_vencendo_24m: number | null
          created_at: string | null
          dy_12m: number | null
          dy_spread: number | null
          fetched_at: string
          high_grade_pct: number | null
          id: string
          inadimplencia_cri: number | null
          inadimplencia_inquilinos: number | null
          ltv_medio: number | null
          manual_overrides: Json | null
          prazo_medio_contratos: number | null
          preco_atual: number | null
          pvp: number | null
          raw_brapi: Json | null
          sustentabilidade_dist: number | null
          taxa_administracao: number | null
          taxa_fof: number | null
          taxa_ntnb: number | null
          ticker: string
          vacancia_financeira: number | null
          vacancia_fisica: number | null
          volume_medio: number | null
        }
        Insert: {
          cap_rate?: number | null
          concentracao_devedor?: number | null
          concentracao_imovel?: number | null
          concentracao_inquilino?: number | null
          contratos_atipicos_pct?: number | null
          contratos_vencendo_24m?: number | null
          created_at?: string | null
          dy_12m?: number | null
          dy_spread?: number | null
          fetched_at: string
          high_grade_pct?: number | null
          id?: string
          inadimplencia_cri?: number | null
          inadimplencia_inquilinos?: number | null
          ltv_medio?: number | null
          manual_overrides?: Json | null
          prazo_medio_contratos?: number | null
          preco_atual?: number | null
          pvp?: number | null
          raw_brapi?: Json | null
          sustentabilidade_dist?: number | null
          taxa_administracao?: number | null
          taxa_fof?: number | null
          taxa_ntnb?: number | null
          ticker: string
          vacancia_financeira?: number | null
          vacancia_fisica?: number | null
          volume_medio?: number | null
        }
        Update: {
          cap_rate?: number | null
          concentracao_devedor?: number | null
          concentracao_imovel?: number | null
          concentracao_inquilino?: number | null
          contratos_atipicos_pct?: number | null
          contratos_vencendo_24m?: number | null
          created_at?: string | null
          dy_12m?: number | null
          dy_spread?: number | null
          fetched_at?: string
          high_grade_pct?: number | null
          id?: string
          inadimplencia_cri?: number | null
          inadimplencia_inquilinos?: number | null
          ltv_medio?: number | null
          manual_overrides?: Json | null
          prazo_medio_contratos?: number | null
          preco_atual?: number | null
          pvp?: number | null
          raw_brapi?: Json | null
          sustentabilidade_dist?: number | null
          taxa_administracao?: number | null
          taxa_fof?: number | null
          taxa_ntnb?: number | null
          ticker?: string
          vacancia_financeira?: number | null
          vacancia_fisica?: number | null
          volume_medio?: number | null
        }
        Relationships: []
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
      portfolio_snapshots: {
        Row: {
          breakdown: Json
          created_at: string
          date: string
          fx_rate: number | null
          holder_id: string
          id: string
          total_value_brl: number
        }
        Insert: {
          breakdown?: Json
          created_at?: string
          date: string
          fx_rate?: number | null
          holder_id: string
          id?: string
          total_value_brl: number
        }
        Update: {
          breakdown?: Json
          created_at?: string
          date?: string
          fx_rate?: number | null
          holder_id?: string
          id?: string
          total_value_brl?: number
        }
        Relationships: [
          {
            foreignKeyName: "portfolio_snapshots_holder_id_fkey"
            columns: ["holder_id"]
            isOneToOne: false
            referencedRelation: "holders"
            referencedColumns: ["id"]
          },
        ]
      }
      position_snapshots: {
        Row: {
          created_at: string
          id: string
          market_value: number
          market_value_brl: number
          position_id: string
          price: number | null
          snapshot_date: string
        }
        Insert: {
          created_at?: string
          id?: string
          market_value: number
          market_value_brl: number
          position_id: string
          price?: number | null
          snapshot_date: string
        }
        Update: {
          created_at?: string
          id?: string
          market_value?: number
          market_value_brl?: number
          position_id?: string
          price?: number | null
          snapshot_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "position_snapshots_position_id_fkey"
            columns: ["position_id"]
            isOneToOne: false
            referencedRelation: "positions"
            referencedColumns: ["id"]
          },
        ]
      }
      position_structure_legs: {
        Row: {
          asset_class: string | null
          contracts: number | null
          expiration_date: string | null
          id: string
          premium: number | null
          role: string
          sort_order: number
          strike: number | null
          structure_id: string
          ticker: string | null
        }
        Insert: {
          asset_class?: string | null
          contracts?: number | null
          expiration_date?: string | null
          id?: string
          premium?: number | null
          role: string
          sort_order?: number
          strike?: number | null
          structure_id: string
          ticker?: string | null
        }
        Update: {
          asset_class?: string | null
          contracts?: number | null
          expiration_date?: string | null
          id?: string
          premium?: number | null
          role?: string
          sort_order?: number
          strike?: number | null
          structure_id?: string
          ticker?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "position_structure_legs_structure_id_fkey"
            columns: ["structure_id"]
            isOneToOne: false
            referencedRelation: "position_structures"
            referencedColumns: ["id"]
          },
        ]
      }
      position_structures: {
        Row: {
          created_at: string
          holder_id: string
          id: string
          name: string
          notes: string | null
          status: string
          type: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          holder_id: string
          id?: string
          name: string
          notes?: string | null
          status?: string
          type: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          holder_id?: string
          id?: string
          name?: string
          notes?: string | null
          status?: string
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "position_structures_holder_id_fkey"
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
          updated_at: string | null
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
          updated_at?: string | null
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
          updated_at?: string | null
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
      transfer_events: {
        Row: {
          asset_name: string
          created_at: string
          created_by: string | null
          from_institution: string
          holder_id: string
          id: string
          notes: string | null
          quantity: number
          settled_at: string | null
          settlement_date: string
          status: string
          ticker: string | null
          to_institution: string
          transfer_date: string
        }
        Insert: {
          asset_name: string
          created_at?: string
          created_by?: string | null
          from_institution: string
          holder_id: string
          id?: string
          notes?: string | null
          quantity: number
          settled_at?: string | null
          settlement_date: string
          status?: string
          ticker?: string | null
          to_institution: string
          transfer_date?: string
        }
        Update: {
          asset_name?: string
          created_at?: string
          created_by?: string | null
          from_institution?: string
          holder_id?: string
          id?: string
          notes?: string | null
          quantity?: number
          settled_at?: string | null
          settlement_date?: string
          status?: string
          ticker?: string | null
          to_institution?: string
          transfer_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "transfer_events_holder_id_fkey"
            columns: ["holder_id"]
            isOneToOne: false
            referencedRelation: "holders"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      can_read_family: { Args: { p_family_id: string }; Returns: boolean }
      can_write_family: { Args: { p_family_id: string }; Returns: boolean }
      claim_holder_by_cpf: { Args: never; Returns: string }
      get_invite_by_token: {
        Args: { p_token: string }
        Returns: {
          accepted_at: string
          family_id: string
          id: string
          invite_token: string
          invited_at: string
          invited_email: string
          role: string
          status: string
        }[]
      }
      is_family_owner: { Args: { p_family_id: string }; Returns: boolean }
      my_family_id: { Args: never; Returns: string }
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
      institution: "xp" | "btg" | "nomad" | "mercadopago"
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

// Convenience aliases — regenerated file loses these; restore after each supabase gen
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
export type DBPortfolioSnapshot = Database["public"]["Tables"]["portfolio_snapshots"]["Row"]
export type DBPositionSnapshot = Database["public"]["Tables"]["position_snapshots"]["Row"]

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
      institution: ["xp", "btg", "nomad", "mercadopago"],
      risk_profile: ["conservative", "moderate", "aggressive"],
    },
  },
} as const
