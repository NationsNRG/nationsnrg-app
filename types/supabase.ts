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
      accounts: {
        Row: {
          company_name: string | null
          contact_name: string | null
          created_at: string | null
          email: string | null
          id: string
          phone: string | null
          state: string | null
        }
        Insert: {
          company_name?: string | null
          contact_name?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          phone?: string | null
          state?: string | null
        }
        Update: {
          company_name?: string | null
          contact_name?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          phone?: string | null
          state?: string | null
        }
        Relationships: []
      }
      agents: {
        Row: {
          created_at: string
          full_name: string | null
          id: string
          name: string | null
          role: string
        }
        Insert: {
          created_at?: string
          full_name?: string | null
          id?: string
          name?: string | null
          role?: string
        }
        Update: {
          created_at?: string
          full_name?: string | null
          id?: string
          name?: string | null
          role?: string
        }
        Relationships: []
      }
      ai_conversations: {
        Row: {
          channel: string | null
          conversation_stage: string | null
          created_at: string | null
          deal_score: number | null
          deal_score_normalized: number | null
          id: string
          last_contact_at: string | null
          last_message: string | null
          last_sender: string | null
          lead_id: string | null
          message_count: number | null
          next_action_at: string | null
          objection_count: number | null
          positive_signals: number | null
          price_mentioned: boolean | null
          sentiment: string | null
          updated_at: string | null
        }
        Insert: {
          channel?: string | null
          conversation_stage?: string | null
          created_at?: string | null
          deal_score?: number | null
          deal_score_normalized?: number | null
          id?: string
          last_contact_at?: string | null
          last_message?: string | null
          last_sender?: string | null
          lead_id?: string | null
          message_count?: number | null
          next_action_at?: string | null
          objection_count?: number | null
          positive_signals?: number | null
          price_mentioned?: boolean | null
          sentiment?: string | null
          updated_at?: string | null
        }
        Update: {
          channel?: string | null
          conversation_stage?: string | null
          created_at?: string | null
          deal_score?: number | null
          deal_score_normalized?: number | null
          id?: string
          last_contact_at?: string | null
          last_message?: string | null
          last_sender?: string | null
          lead_id?: string | null
          message_count?: number | null
          next_action_at?: string | null
          objection_count?: number | null
          positive_signals?: number | null
          price_mentioned?: boolean | null
          sentiment?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_conversations_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: true
            referencedRelation: "discovered_leads"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_decisions: {
        Row: {
          conversation_id: string | null
          created_at: string | null
          decision: string
          id: string
          outcome: string | null
          reasoning: string | null
        }
        Insert: {
          conversation_id?: string | null
          created_at?: string | null
          decision: string
          id?: string
          outcome?: string | null
          reasoning?: string | null
        }
        Update: {
          conversation_id?: string | null
          created_at?: string | null
          decision?: string
          id?: string
          outcome?: string | null
          reasoning?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_decisions_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "ai_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_message_log: {
        Row: {
          conversation_id: string | null
          created_at: string | null
          id: string
          intent: string | null
          message: string
          sender: string | null
          stage: string | null
        }
        Insert: {
          conversation_id?: string | null
          created_at?: string | null
          id?: string
          intent?: string | null
          message: string
          sender?: string | null
          stage?: string | null
        }
        Update: {
          conversation_id?: string | null
          created_at?: string | null
          id?: string
          intent?: string | null
          message?: string
          sender?: string | null
          stage?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_message_log_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "ai_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_performance: {
        Row: {
          created_at: string
          date: string
          id: string
          negative_responses: number
          neutral_responses: number
          objection_type: string | null
          positive_responses: number
          response_template: string | null
          success_rate: number | null
          successful_closes: number
          times_used: number
        }
        Insert: {
          created_at?: string
          date: string
          id?: string
          negative_responses?: number
          neutral_responses?: number
          objection_type?: string | null
          positive_responses?: number
          response_template?: string | null
          success_rate?: number | null
          successful_closes?: number
          times_used?: number
        }
        Update: {
          created_at?: string
          date?: string
          id?: string
          negative_responses?: number
          neutral_responses?: number
          objection_type?: string | null
          positive_responses?: number
          response_template?: string | null
          success_rate?: number | null
          successful_closes?: number
          times_used?: number
        }
        Relationships: []
      }
      analytics_daily: {
        Row: {
          ai_close_rate: number | null
          ai_conversations_started: number
          ai_messages_sent: number
          avg_commission: number | null
          conversion_rate: number | null
          created_at: string
          date: string
          deals_closed: number
          email_clicks: number
          email_opens: number
          enterprise_leads: number
          id: string
          leads_contacted: number
          linkedin_messages: number
          new_leads: number
          projected_commission: number | null
          proposals_sent: number
          qualified_leads: number
          sms_responses: number
          sms_sent: number
          total_commission: number
          total_leads: number
        }
        Insert: {
          ai_close_rate?: number | null
          ai_conversations_started?: number
          ai_messages_sent?: number
          avg_commission?: number | null
          conversion_rate?: number | null
          created_at?: string
          date: string
          deals_closed?: number
          email_clicks?: number
          email_opens?: number
          enterprise_leads?: number
          id?: string
          leads_contacted?: number
          linkedin_messages?: number
          new_leads?: number
          projected_commission?: number | null
          proposals_sent?: number
          qualified_leads?: number
          sms_responses?: number
          sms_sent?: number
          total_commission?: number
          total_leads?: number
        }
        Update: {
          ai_close_rate?: number | null
          ai_conversations_started?: number
          ai_messages_sent?: number
          avg_commission?: number | null
          conversion_rate?: number | null
          created_at?: string
          date?: string
          deals_closed?: number
          email_clicks?: number
          email_opens?: number
          enterprise_leads?: number
          id?: string
          leads_contacted?: number
          linkedin_messages?: number
          new_leads?: number
          projected_commission?: number | null
          proposals_sent?: number
          qualified_leads?: number
          sms_responses?: number
          sms_sent?: number
          total_commission?: number
          total_leads?: number
        }
        Relationships: []
      }
      autonomous_deals: {
        Row: {
          auto_close_eligible: boolean | null
          contract_signed: boolean | null
          created_at: string | null
          energy_spend: number | null
          estimated_savings: number | null
          id: string
          lead_id: string | null
          proposal_sent: boolean | null
          switch_probability: number | null
        }
        Insert: {
          auto_close_eligible?: boolean | null
          contract_signed?: boolean | null
          created_at?: string | null
          energy_spend?: number | null
          estimated_savings?: number | null
          id?: string
          lead_id?: string | null
          proposal_sent?: boolean | null
          switch_probability?: number | null
        }
        Update: {
          auto_close_eligible?: boolean | null
          contract_signed?: boolean | null
          created_at?: string | null
          energy_spend?: number | null
          estimated_savings?: number | null
          id?: string
          lead_id?: string | null
          proposal_sent?: boolean | null
          switch_probability?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "autonomous_deals_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: true
            referencedRelation: "discovered_leads"
            referencedColumns: ["id"]
          },
        ]
      }
      autonomous_executor_events: {
        Row: {
          created_at: string
          deal_id: string
          decisions_evaluated: number
          executor_status: string
          failed_actions: number
          id: string
          metadata: Json
          run_fingerprint: string | null
          successful_actions: number
        }
        Insert: {
          created_at?: string
          deal_id: string
          decisions_evaluated?: number
          executor_status?: string
          failed_actions?: number
          id?: string
          metadata?: Json
          run_fingerprint?: string | null
          successful_actions?: number
        }
        Update: {
          created_at?: string
          deal_id?: string
          decisions_evaluated?: number
          executor_status?: string
          failed_actions?: number
          id?: string
          metadata?: Json
          run_fingerprint?: string | null
          successful_actions?: number
        }
        Relationships: [
          {
            foreignKeyName: "autonomous_executor_events_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
        ]
      }
      bid_requests: {
        Row: {
          bid_deadline: string | null
          calculation_id: string | null
          competitiveness: string | null
          created_at: string | null
          estimated_annual_mwh: number | null
          id: string
          market_avg_rate: number | null
          required_by: string | null
          status: string | null
          supplier_count: number | null
          team_id: string | null
        }
        Insert: {
          bid_deadline?: string | null
          calculation_id?: string | null
          competitiveness?: string | null
          created_at?: string | null
          estimated_annual_mwh?: number | null
          id?: string
          market_avg_rate?: number | null
          required_by?: string | null
          status?: string | null
          supplier_count?: number | null
          team_id?: string | null
        }
        Update: {
          bid_deadline?: string | null
          calculation_id?: string | null
          competitiveness?: string | null
          created_at?: string | null
          estimated_annual_mwh?: number | null
          id?: string
          market_avg_rate?: number | null
          required_by?: string | null
          status?: string | null
          supplier_count?: number | null
          team_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bid_requests_calculation_id_fkey"
            columns: ["calculation_id"]
            isOneToOne: false
            referencedRelation: "calculations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bid_requests_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      bids: {
        Row: {
          bid_request_id: string | null
          expires_at: string | null
          id: string
          is_winning: boolean | null
          notes: string | null
          rate: number
          savings_estimate: number | null
          status: string | null
          submitted_at: string | null
          supplier_id: string | null
          term_months: number
        }
        Insert: {
          bid_request_id?: string | null
          expires_at?: string | null
          id?: string
          is_winning?: boolean | null
          notes?: string | null
          rate: number
          savings_estimate?: number | null
          status?: string | null
          submitted_at?: string | null
          supplier_id?: string | null
          term_months: number
        }
        Update: {
          bid_request_id?: string | null
          expires_at?: string | null
          id?: string
          is_winning?: boolean | null
          notes?: string | null
          rate?: number
          savings_estimate?: number | null
          status?: string | null
          submitted_at?: string | null
          supplier_id?: string | null
          term_months?: number
        }
        Relationships: [
          {
            foreignKeyName: "bids_bid_request_id_fkey"
            columns: ["bid_request_id"]
            isOneToOne: false
            referencedRelation: "bid_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bids_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      big_deal_desk_queue: {
        Row: {
          assigned_owner: string | null
          created_at: string
          deal_id: string
          escalation_reason: string
          escalation_status: string
          id: string
          metadata: Json
          queued_at: string
          review_notes: string | null
          reviewed_at: string | null
          triage_lane: string
          triage_score: number
          triage_tier: string
        }
        Insert: {
          assigned_owner?: string | null
          created_at?: string
          deal_id: string
          escalation_reason: string
          escalation_status?: string
          id?: string
          metadata?: Json
          queued_at?: string
          review_notes?: string | null
          reviewed_at?: string | null
          triage_lane: string
          triage_score: number
          triage_tier: string
        }
        Update: {
          assigned_owner?: string | null
          created_at?: string
          deal_id?: string
          escalation_reason?: string
          escalation_status?: string
          id?: string
          metadata?: Json
          queued_at?: string
          review_notes?: string | null
          reviewed_at?: string | null
          triage_lane?: string
          triage_score?: number
          triage_tier?: string
        }
        Relationships: [
          {
            foreignKeyName: "big_deal_desk_queue_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: true
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
        ]
      }
      bills: {
        Row: {
          created_at: string
          file_url: string
          id: string
        }
        Insert: {
          created_at?: string
          file_url: string
          id?: string
        }
        Update: {
          created_at?: string
          file_url?: string
          id?: string
        }
        Relationships: []
      }
      bundle_services: {
        Row: {
          bundle_id: string
          created_at: string
          service_id: string
        }
        Insert: {
          bundle_id: string
          created_at?: string
          service_id: string
        }
        Update: {
          bundle_id?: string
          created_at?: string
          service_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bundle_services_bundle_id_fkey"
            columns: ["bundle_id"]
            isOneToOne: false
            referencedRelation: "bundles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bundle_services_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "service_catalog"
            referencedColumns: ["id"]
          },
        ]
      }
      bundles: {
        Row: {
          bundle_discount: number | null
          category: string | null
          commission_total: number | null
          created_at: string
          description: string | null
          final_price: number | null
          id: string
          is_active: boolean
          name: string
          popularity_score: number
          total_annual_price: number | null
          total_monthly_price: number | null
          updated_at: string
        }
        Insert: {
          bundle_discount?: number | null
          category?: string | null
          commission_total?: number | null
          created_at?: string
          description?: string | null
          final_price?: number | null
          id?: string
          is_active?: boolean
          name: string
          popularity_score?: number
          total_annual_price?: number | null
          total_monthly_price?: number | null
          updated_at?: string
        }
        Update: {
          bundle_discount?: number | null
          category?: string | null
          commission_total?: number | null
          created_at?: string
          description?: string | null
          final_price?: number | null
          id?: string
          is_active?: boolean
          name?: string
          popularity_score?: number
          total_annual_price?: number | null
          total_monthly_price?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      business_types: {
        Row: {
          created_at: string | null
          electricity_kwh_per_sqft: number
          gas_therms_per_sqft: number
          id: number
          name: string
        }
        Insert: {
          created_at?: string | null
          electricity_kwh_per_sqft: number
          gas_therms_per_sqft: number
          id?: number
          name: string
        }
        Update: {
          created_at?: string | null
          electricity_kwh_per_sqft?: number
          gas_therms_per_sqft?: number
          id?: number
          name?: string
        }
        Relationships: []
      }
      calculations: {
        Row: {
          business_name: string | null
          business_type_id: number | null
          confidence_score: number | null
          contract_expiration_date: string | null
          created_at: string | null
          electricity_rate: number | null
          gas_rate: number | null
          id: string
          last_contacted: string | null
          locations: number
          potential_savings_electricity: number | null
          potential_savings_gas: number | null
          source: string | null
          source_job_id: string | null
          sqft_per_location: number
          status: string | null
          team_id: string | null
          total_electricity_cost: number | null
          total_electricity_kwh: number | null
          total_energy_cost: number | null
          total_gas_cost: number | null
          total_gas_therms: number | null
          total_potential_savings: number | null
          user_email: string | null
        }
        Insert: {
          business_name?: string | null
          business_type_id?: number | null
          confidence_score?: number | null
          contract_expiration_date?: string | null
          created_at?: string | null
          electricity_rate?: number | null
          gas_rate?: number | null
          id?: string
          last_contacted?: string | null
          locations: number
          potential_savings_electricity?: number | null
          potential_savings_gas?: number | null
          source?: string | null
          source_job_id?: string | null
          sqft_per_location: number
          status?: string | null
          team_id?: string | null
          total_electricity_cost?: number | null
          total_electricity_kwh?: number | null
          total_energy_cost?: number | null
          total_gas_cost?: number | null
          total_gas_therms?: number | null
          total_potential_savings?: number | null
          user_email?: string | null
        }
        Update: {
          business_name?: string | null
          business_type_id?: number | null
          confidence_score?: number | null
          contract_expiration_date?: string | null
          created_at?: string | null
          electricity_rate?: number | null
          gas_rate?: number | null
          id?: string
          last_contacted?: string | null
          locations?: number
          potential_savings_electricity?: number | null
          potential_savings_gas?: number | null
          source?: string | null
          source_job_id?: string | null
          sqft_per_location?: number
          status?: string | null
          team_id?: string | null
          total_electricity_cost?: number | null
          total_electricity_kwh?: number | null
          total_energy_cost?: number | null
          total_gas_cost?: number | null
          total_gas_therms?: number | null
          total_potential_savings?: number | null
          user_email?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "calculations_business_type_id_fkey"
            columns: ["business_type_id"]
            isOneToOne: false
            referencedRelation: "business_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "calculations_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      call_logs: {
        Row: {
          called_at: string
          created_at: string | null
          duration: number | null
          id: string
          lead_id: string | null
          notes: string | null
          status: string | null
        }
        Insert: {
          called_at: string
          created_at?: string | null
          duration?: number | null
          id?: string
          lead_id?: string | null
          notes?: string | null
          status?: string | null
        }
        Update: {
          called_at?: string
          created_at?: string | null
          duration?: number | null
          id?: string
          lead_id?: string | null
          notes?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "call_logs_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "discovered_leads"
            referencedColumns: ["id"]
          },
        ]
      }
      channel_conversations: {
        Row: {
          ai_conversation_id: string
          channel_id: string
          channel_thread_id: string | null
          created_at: string
          id: string
          lead_id: string
        }
        Insert: {
          ai_conversation_id: string
          channel_id: string
          channel_thread_id?: string | null
          created_at?: string
          id?: string
          lead_id: string
        }
        Update: {
          ai_conversation_id?: string
          channel_id?: string
          channel_thread_id?: string | null
          created_at?: string
          id?: string
          lead_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "channel_conversations_ai_conversation_id_fkey"
            columns: ["ai_conversation_id"]
            isOneToOne: false
            referencedRelation: "ai_conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "channel_conversations_channel_id_fkey"
            columns: ["channel_id"]
            isOneToOne: false
            referencedRelation: "channels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "channel_conversations_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "discovered_leads"
            referencedColumns: ["id"]
          },
        ]
      }
      channel_performance: {
        Row: {
          channel: string
          click_rate: number | null
          conversion_rate: number | null
          created_at: string
          date: string
          id: string
          messages_sent: number
          open_rate: number | null
          response_rate: number | null
        }
        Insert: {
          channel: string
          click_rate?: number | null
          conversion_rate?: number | null
          created_at?: string
          date: string
          id?: string
          messages_sent?: number
          open_rate?: number | null
          response_rate?: number | null
        }
        Update: {
          channel?: string
          click_rate?: number | null
          conversion_rate?: number | null
          created_at?: string
          date?: string
          id?: string
          messages_sent?: number
          open_rate?: number | null
          response_rate?: number | null
        }
        Relationships: []
      }
      channels: {
        Row: {
          config: Json
          created_at: string
          daily_limit: number | null
          hourly_limit: number | null
          id: string
          is_active: boolean
          name: string
          priority: number
        }
        Insert: {
          config?: Json
          created_at?: string
          daily_limit?: number | null
          hourly_limit?: number | null
          id?: string
          is_active?: boolean
          name: string
          priority?: number
        }
        Update: {
          config?: Json
          created_at?: string
          daily_limit?: number | null
          hourly_limit?: number | null
          id?: string
          is_active?: boolean
          name?: string
          priority?: number
        }
        Relationships: []
      }
      commission_claims: {
        Row: {
          claim_amount: number | null
          claim_basis: string
          claim_currency: string
          claim_status: string
          claim_trigger_event: string
          compensation_term_id: string | null
          counterparty_identifier: string | null
          created_at: string
          deal_id: string
          id: string
          invoice_reference: string | null
          metadata: Json
          notes: string | null
          paid_at: string | null
          payout_due_at: string | null
          updated_at: string
        }
        Insert: {
          claim_amount?: number | null
          claim_basis: string
          claim_currency?: string
          claim_status?: string
          claim_trigger_event: string
          compensation_term_id?: string | null
          counterparty_identifier?: string | null
          created_at?: string
          deal_id: string
          id?: string
          invoice_reference?: string | null
          metadata?: Json
          notes?: string | null
          paid_at?: string | null
          payout_due_at?: string | null
          updated_at?: string
        }
        Update: {
          claim_amount?: number | null
          claim_basis?: string
          claim_currency?: string
          claim_status?: string
          claim_trigger_event?: string
          compensation_term_id?: string | null
          counterparty_identifier?: string | null
          created_at?: string
          deal_id?: string
          id?: string
          invoice_reference?: string | null
          metadata?: Json
          notes?: string | null
          paid_at?: string | null
          payout_due_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "commission_claims_compensation_term_id_fkey"
            columns: ["compensation_term_id"]
            isOneToOne: false
            referencedRelation: "compensation_terms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commission_claims_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
        ]
      }
      commission_forecasts: {
        Row: {
          actual_amount: number | null
          confidence_score: number | null
          created_at: string
          id: string
          month: string
          projected_amount: number | null
          source: string | null
          updated_at: string
        }
        Insert: {
          actual_amount?: number | null
          confidence_score?: number | null
          created_at?: string
          id?: string
          month: string
          projected_amount?: number | null
          source?: string | null
          updated_at?: string
        }
        Update: {
          actual_amount?: number | null
          confidence_score?: number | null
          created_at?: string
          id?: string
          month?: string
          projected_amount?: number | null
          source?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      commissions: {
        Row: {
          amount: number | null
          bid_id: string | null
          created_at: string | null
          id: string
          paid_at: string | null
          status: string | null
          stripe_payment_intent_id: string | null
          supplier_id: string | null
          team_id: string | null
        }
        Insert: {
          amount?: number | null
          bid_id?: string | null
          created_at?: string | null
          id?: string
          paid_at?: string | null
          status?: string | null
          stripe_payment_intent_id?: string | null
          supplier_id?: string | null
          team_id?: string | null
        }
        Update: {
          amount?: number | null
          bid_id?: string | null
          created_at?: string | null
          id?: string
          paid_at?: string | null
          status?: string | null
          stripe_payment_intent_id?: string | null
          supplier_id?: string | null
          team_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "commissions_bid_id_fkey"
            columns: ["bid_id"]
            isOneToOne: false
            referencedRelation: "bids"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commissions_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commissions_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      commodity_counterparties: {
        Row: {
          created_at: string | null
          deal_id: string | null
          id: string
          name: string
          risk_flags: string[] | null
          role: string
          verification_status: string | null
        }
        Insert: {
          created_at?: string | null
          deal_id?: string | null
          id?: string
          name: string
          risk_flags?: string[] | null
          role: string
          verification_status?: string | null
        }
        Update: {
          created_at?: string | null
          deal_id?: string | null
          id?: string
          name?: string
          risk_flags?: string[] | null
          role?: string
          verification_status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "commodity_counterparties_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "commodity_deals"
            referencedColumns: ["id"]
          },
        ]
      }
      commodity_deals: {
        Row: {
          buyer_name: string | null
          case_summary: Json
          commodity: string
          created_at: string | null
          currency: string | null
          deal_name: string
          escalation_status: string
          id: string
          operator_notes: string | null
          operator_review_status: string
          price: number | null
          ready_for_presentment: boolean
          ready_for_rejection: boolean
          risk_score: number | null
          seller_name: string | null
          status: string
          unit: string | null
          verification_status: string
          volume: number | null
        }
        Insert: {
          buyer_name?: string | null
          case_summary?: Json
          commodity: string
          created_at?: string | null
          currency?: string | null
          deal_name: string
          escalation_status?: string
          id?: string
          operator_notes?: string | null
          operator_review_status?: string
          price?: number | null
          ready_for_presentment?: boolean
          ready_for_rejection?: boolean
          risk_score?: number | null
          seller_name?: string | null
          status?: string
          unit?: string | null
          verification_status?: string
          volume?: number | null
        }
        Update: {
          buyer_name?: string | null
          case_summary?: Json
          commodity?: string
          created_at?: string | null
          currency?: string | null
          deal_name?: string
          escalation_status?: string
          id?: string
          operator_notes?: string | null
          operator_review_status?: string
          price?: number | null
          ready_for_presentment?: boolean
          ready_for_rejection?: boolean
          risk_score?: number | null
          seller_name?: string | null
          status?: string
          unit?: string | null
          verification_status?: string
          volume?: number | null
        }
        Relationships: []
      }
      commodity_documents: {
        Row: {
          checksum_sha256: string | null
          created_at: string | null
          deal_id: string | null
          document_type: string
          document_url: string | null
          file_name: string | null
          file_size_bytes: number | null
          id: string
          mime_type: string | null
          notes: string | null
          source_type: string | null
          uploaded_by: string | null
          verified: boolean | null
        }
        Insert: {
          checksum_sha256?: string | null
          created_at?: string | null
          deal_id?: string | null
          document_type: string
          document_url?: string | null
          file_name?: string | null
          file_size_bytes?: number | null
          id?: string
          mime_type?: string | null
          notes?: string | null
          source_type?: string | null
          uploaded_by?: string | null
          verified?: boolean | null
        }
        Update: {
          checksum_sha256?: string | null
          created_at?: string | null
          deal_id?: string | null
          document_type?: string
          document_url?: string | null
          file_name?: string | null
          file_size_bytes?: number | null
          id?: string
          mime_type?: string | null
          notes?: string | null
          source_type?: string | null
          uploaded_by?: string | null
          verified?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "commodity_documents_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "commodity_deals"
            referencedColumns: ["id"]
          },
        ]
      }
      commodity_fraud_signals: {
        Row: {
          created_at: string
          deal_id: string
          id: string
          metadata: Json
          notes: string | null
          severity: string
          signal_type: string
          status: string
        }
        Insert: {
          created_at?: string
          deal_id: string
          id?: string
          metadata?: Json
          notes?: string | null
          severity?: string
          signal_type: string
          status?: string
        }
        Update: {
          created_at?: string
          deal_id?: string
          id?: string
          metadata?: Json
          notes?: string | null
          severity?: string
          signal_type?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "commodity_fraud_signals_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "commodity_deals"
            referencedColumns: ["id"]
          },
        ]
      }
      commodity_verification_logs: {
        Row: {
          action: string
          created_at: string | null
          deal_id: string | null
          id: string
          notes: string | null
          result: string | null
        }
        Insert: {
          action: string
          created_at?: string | null
          deal_id?: string | null
          id?: string
          notes?: string | null
          result?: string | null
        }
        Update: {
          action?: string
          created_at?: string | null
          deal_id?: string | null
          id?: string
          notes?: string | null
          result?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "commodity_verification_logs_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "commodity_deals"
            referencedColumns: ["id"]
          },
        ]
      }
      compensation_claim_history: {
        Row: {
          action: string
          claim_id: string
          claim_type: string
          created_at: string
          deal_id: string
          id: string
          invoice_reference: string | null
          metadata: Json
          new_status: string
          notes: string | null
          paid_at: string | null
          payout_due_at: string | null
          previous_status: string | null
        }
        Insert: {
          action: string
          claim_id: string
          claim_type: string
          created_at?: string
          deal_id: string
          id?: string
          invoice_reference?: string | null
          metadata?: Json
          new_status: string
          notes?: string | null
          paid_at?: string | null
          payout_due_at?: string | null
          previous_status?: string | null
        }
        Update: {
          action?: string
          claim_id?: string
          claim_type?: string
          created_at?: string
          deal_id?: string
          id?: string
          invoice_reference?: string | null
          metadata?: Json
          new_status?: string
          notes?: string | null
          paid_at?: string | null
          payout_due_at?: string | null
          previous_status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "compensation_claim_history_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
        ]
      }
      compensation_terms: {
        Row: {
          beneficiary_type: string
          compensation_status: string
          compensation_type: string
          created_at: string
          currency: string
          deal_id: string
          disclosure_allowed: boolean
          expected_value: number | null
          id: string
          metadata: Json
          notes: string | null
          payment_basis: string
          payment_trigger: string
          payor_identifier: string | null
          payor_type: string
          protection_level: string
          signed_acknowledgment_received: boolean
          signed_acknowledgment_required: boolean
          term_summary: string
          updated_at: string
        }
        Insert: {
          beneficiary_type?: string
          compensation_status?: string
          compensation_type: string
          created_at?: string
          currency?: string
          deal_id: string
          disclosure_allowed?: boolean
          expected_value?: number | null
          id?: string
          metadata?: Json
          notes?: string | null
          payment_basis: string
          payment_trigger: string
          payor_identifier?: string | null
          payor_type: string
          protection_level?: string
          signed_acknowledgment_received?: boolean
          signed_acknowledgment_required?: boolean
          term_summary: string
          updated_at?: string
        }
        Update: {
          beneficiary_type?: string
          compensation_status?: string
          compensation_type?: string
          created_at?: string
          currency?: string
          deal_id?: string
          disclosure_allowed?: boolean
          expected_value?: number | null
          id?: string
          metadata?: Json
          notes?: string | null
          payment_basis?: string
          payment_trigger?: string
          payor_identifier?: string | null
          payor_type?: string
          protection_level?: string
          signed_acknowledgment_received?: boolean
          signed_acknowledgment_required?: boolean
          term_summary?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "compensation_terms_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
        ]
      }
      content_insight_assets: {
        Row: {
          asset_type: string
          content: string | null
          created_at: string | null
          id: string
          insight_id: string
          metadata: Json | null
        }
        Insert: {
          asset_type: string
          content?: string | null
          created_at?: string | null
          id?: string
          insight_id: string
          metadata?: Json | null
        }
        Update: {
          asset_type?: string
          content?: string | null
          created_at?: string | null
          id?: string
          insight_id?: string
          metadata?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "content_insight_assets_insight_id_fkey"
            columns: ["insight_id"]
            isOneToOne: false
            referencedRelation: "content_insights"
            referencedColumns: ["id"]
          },
        ]
      }
      content_insight_distribution: {
        Row: {
          channel: string
          created_at: string
          external_id: string | null
          external_url: string | null
          id: string
          insight_id: string
          performance: Json
          published_at: string | null
          scheduled_at: string | null
          status: string
          updated_at: string
          variant_id: string
        }
        Insert: {
          channel: string
          created_at?: string
          external_id?: string | null
          external_url?: string | null
          id?: string
          insight_id: string
          performance?: Json
          published_at?: string | null
          scheduled_at?: string | null
          status?: string
          updated_at?: string
          variant_id: string
        }
        Update: {
          channel?: string
          created_at?: string
          external_id?: string | null
          external_url?: string | null
          id?: string
          insight_id?: string
          performance?: Json
          published_at?: string | null
          scheduled_at?: string | null
          status?: string
          updated_at?: string
          variant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "content_insight_distribution_insight_id_fkey"
            columns: ["insight_id"]
            isOneToOne: false
            referencedRelation: "content_insights"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_insight_distribution_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "content_insight_variants"
            referencedColumns: ["id"]
          },
        ]
      }
      content_insight_runs: {
        Row: {
          completed_at: string | null
          created_at: string | null
          error_message: string | null
          id: string
          metadata: Json | null
          source_type: string | null
          status: string
          trigger_type: string | null
        }
        Insert: {
          completed_at?: string | null
          created_at?: string | null
          error_message?: string | null
          id?: string
          metadata?: Json | null
          source_type?: string | null
          status?: string
          trigger_type?: string | null
        }
        Update: {
          completed_at?: string | null
          created_at?: string | null
          error_message?: string | null
          id?: string
          metadata?: Json | null
          source_type?: string | null
          status?: string
          trigger_type?: string | null
        }
        Relationships: []
      }
      content_insight_variants: {
        Row: {
          body: string | null
          created_at: string | null
          cta: string | null
          id: string
          insight_id: string
          metadata: Json | null
          status: string
          title: string | null
          updated_at: string | null
          variant_type: string
        }
        Insert: {
          body?: string | null
          created_at?: string | null
          cta?: string | null
          id?: string
          insight_id: string
          metadata?: Json | null
          status?: string
          title?: string | null
          updated_at?: string | null
          variant_type: string
        }
        Update: {
          body?: string | null
          created_at?: string | null
          cta?: string | null
          id?: string
          insight_id?: string
          metadata?: Json | null
          status?: string
          title?: string | null
          updated_at?: string | null
          variant_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "content_insight_variants_insight_id_fkey"
            columns: ["insight_id"]
            isOneToOne: false
            referencedRelation: "content_insights"
            referencedColumns: ["id"]
          },
        ]
      }
      content_insights: {
        Row: {
          angle: string | null
          audience: string | null
          canonical_body: string | null
          canonical_summary: string | null
          confidence_score: number | null
          created_at: string | null
          id: string
          published_at: string | null
          seo_keyword: string | null
          slug: string | null
          source_data: Json | null
          source_type: string | null
          status: string
          title: string
          updated_at: string | null
        }
        Insert: {
          angle?: string | null
          audience?: string | null
          canonical_body?: string | null
          canonical_summary?: string | null
          confidence_score?: number | null
          created_at?: string | null
          id?: string
          published_at?: string | null
          seo_keyword?: string | null
          slug?: string | null
          source_data?: Json | null
          source_type?: string | null
          status?: string
          title: string
          updated_at?: string | null
        }
        Update: {
          angle?: string | null
          audience?: string | null
          canonical_body?: string | null
          canonical_summary?: string | null
          confidence_score?: number | null
          created_at?: string | null
          id?: string
          published_at?: string | null
          seo_keyword?: string | null
          slug?: string | null
          source_data?: Json | null
          source_type?: string | null
          status?: string
          title?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      contract_gap_events: {
        Row: {
          created_at: string
          deal_id: string
          gap_description: string | null
          gap_severity: number
          gap_status: string
          gap_title: string
          gap_type: string
          id: string
          metadata: Json
          resolution_action: string | null
          resolved_at: string | null
        }
        Insert: {
          created_at?: string
          deal_id: string
          gap_description?: string | null
          gap_severity?: number
          gap_status?: string
          gap_title: string
          gap_type: string
          id?: string
          metadata?: Json
          resolution_action?: string | null
          resolved_at?: string | null
        }
        Update: {
          created_at?: string
          deal_id?: string
          gap_description?: string | null
          gap_severity?: number
          gap_status?: string
          gap_title?: string
          gap_type?: string
          id?: string
          metadata?: Json
          resolution_action?: string | null
          resolved_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contract_gap_events_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
        ]
      }
      contract_intelligence: {
        Row: {
          business_id: string | null
          confidence_score: number | null
          contract_term_years: number | null
          created_at: string | null
          estimated_energy_spend: number | null
          estimated_expiration_date: string | null
          estimated_start_date: string | null
          expiration_window_days: number | null
          id: string
          months_into_contract: number | null
          months_remaining: number | null
          renewal_risk_score: number | null
          switch_probability: number | null
        }
        Insert: {
          business_id?: string | null
          confidence_score?: number | null
          contract_term_years?: number | null
          created_at?: string | null
          estimated_energy_spend?: number | null
          estimated_expiration_date?: string | null
          estimated_start_date?: string | null
          expiration_window_days?: number | null
          id?: string
          months_into_contract?: number | null
          months_remaining?: number | null
          renewal_risk_score?: number | null
          switch_probability?: number | null
        }
        Update: {
          business_id?: string | null
          confidence_score?: number | null
          contract_term_years?: number | null
          created_at?: string | null
          estimated_energy_spend?: number | null
          estimated_expiration_date?: string | null
          estimated_start_date?: string | null
          expiration_window_days?: number | null
          id?: string
          months_into_contract?: number | null
          months_remaining?: number | null
          renewal_risk_score?: number | null
          switch_probability?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "contract_intelligence_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "discovered_leads"
            referencedColumns: ["id"]
          },
        ]
      }
      contract_outcomes: {
        Row: {
          closed_at: string
          closed_reason: string | null
          commodity: string | null
          contract_rate: number | null
          contract_rate_unit: string | null
          created_at: string
          enrollment_attempt_id: string | null
          estimated_annual_savings: number | null
          estimated_monthly_savings: number | null
          id: string
          notes: string | null
          outcome_payload: Json
          pipeline_id: string
          pricing_quote_id: string | null
          realized_commission: number | null
          status: Database["public"]["Enums"]["contract_outcome_status"]
          supplier_name: string | null
          term_months: number | null
          updated_at: string
          utility_name: string | null
        }
        Insert: {
          closed_at?: string
          closed_reason?: string | null
          commodity?: string | null
          contract_rate?: number | null
          contract_rate_unit?: string | null
          created_at?: string
          enrollment_attempt_id?: string | null
          estimated_annual_savings?: number | null
          estimated_monthly_savings?: number | null
          id?: string
          notes?: string | null
          outcome_payload?: Json
          pipeline_id: string
          pricing_quote_id?: string | null
          realized_commission?: number | null
          status: Database["public"]["Enums"]["contract_outcome_status"]
          supplier_name?: string | null
          term_months?: number | null
          updated_at?: string
          utility_name?: string | null
        }
        Update: {
          closed_at?: string
          closed_reason?: string | null
          commodity?: string | null
          contract_rate?: number | null
          contract_rate_unit?: string | null
          created_at?: string
          enrollment_attempt_id?: string | null
          estimated_annual_savings?: number | null
          estimated_monthly_savings?: number | null
          id?: string
          notes?: string | null
          outcome_payload?: Json
          pipeline_id?: string
          pricing_quote_id?: string | null
          realized_commission?: number | null
          status?: Database["public"]["Enums"]["contract_outcome_status"]
          supplier_name?: string | null
          term_months?: number | null
          updated_at?: string
          utility_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contract_outcomes_enrollment_attempt_id_fkey"
            columns: ["enrollment_attempt_id"]
            isOneToOne: false
            referencedRelation: "enrollment_attempts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contract_outcomes_pipeline_id_fkey"
            columns: ["pipeline_id"]
            isOneToOne: true
            referencedRelation: "deal_pipeline"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contract_outcomes_pricing_quote_id_fkey"
            columns: ["pricing_quote_id"]
            isOneToOne: false
            referencedRelation: "pricing_quotes"
            referencedColumns: ["id"]
          },
        ]
      }
      contract_readiness_profiles: {
        Row: {
          authority_status: string
          blocker_count: number
          buyer_identity_status: string
          compensation_protection_status: string
          created_at: string
          deal_id: string
          execution_lane: string
          id: string
          legal_review_status: string
          metadata: Json
          next_required_action: string | null
          readiness_reason: string
          readiness_score: number
          readiness_status: string
          site_data_status: string
          supplier_package_status: string
          updated_at: string
          usage_data_status: string
        }
        Insert: {
          authority_status?: string
          blocker_count?: number
          buyer_identity_status?: string
          compensation_protection_status?: string
          created_at?: string
          deal_id: string
          execution_lane?: string
          id?: string
          legal_review_status?: string
          metadata?: Json
          next_required_action?: string | null
          readiness_reason: string
          readiness_score?: number
          readiness_status?: string
          site_data_status?: string
          supplier_package_status?: string
          updated_at?: string
          usage_data_status?: string
        }
        Update: {
          authority_status?: string
          blocker_count?: number
          buyer_identity_status?: string
          compensation_protection_status?: string
          created_at?: string
          deal_id?: string
          execution_lane?: string
          id?: string
          legal_review_status?: string
          metadata?: Json
          next_required_action?: string | null
          readiness_reason?: string
          readiness_score?: number
          readiness_status?: string
          site_data_status?: string
          supplier_package_status?: string
          updated_at?: string
          usage_data_status?: string
        }
        Relationships: [
          {
            foreignKeyName: "contract_readiness_profiles_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: true
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
        ]
      }
      contract_readiness_score_events: {
        Row: {
          created_at: string
          deal_id: string
          id: string
          metadata: Json
          next_score: number
          next_status: string
          previous_score: number | null
          previous_status: string | null
          score_reason: string
          trigger_source: string
        }
        Insert: {
          created_at?: string
          deal_id: string
          id?: string
          metadata?: Json
          next_score: number
          next_status: string
          previous_score?: number | null
          previous_status?: string | null
          score_reason: string
          trigger_source?: string
        }
        Update: {
          created_at?: string
          deal_id?: string
          id?: string
          metadata?: Json
          next_score?: number
          next_status?: string
          previous_score?: number | null
          previous_status?: string | null
          score_reason?: string
          trigger_source?: string
        }
        Relationships: [
          {
            foreignKeyName: "contract_readiness_score_events_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
        ]
      }
      contract_required_documents: {
        Row: {
          created_at: string
          deal_id: string
          document_label: string
          document_type: string
          id: string
          is_required: boolean
          metadata: Json
          notes: string | null
          received_at: string | null
          required_for_stage: string
          requirement_status: string
          updated_at: string
          verified_at: string | null
        }
        Insert: {
          created_at?: string
          deal_id: string
          document_label: string
          document_type: string
          id?: string
          is_required?: boolean
          metadata?: Json
          notes?: string | null
          received_at?: string | null
          required_for_stage?: string
          requirement_status?: string
          updated_at?: string
          verified_at?: string | null
        }
        Update: {
          created_at?: string
          deal_id?: string
          document_label?: string
          document_type?: string
          id?: string
          is_required?: boolean
          metadata?: Json
          notes?: string | null
          received_at?: string | null
          required_for_stage?: string
          requirement_status?: string
          updated_at?: string
          verified_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contract_required_documents_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
        ]
      }
      conversation_insights: {
        Row: {
          ai_response: string | null
          conversation_id: string | null
          created_at: string | null
          effectiveness_score: number | null
          id: string
          industry: string | null
          lead_id: string | null
          lead_score_range: string | null
          led_to_close: boolean | null
          led_to_interest: boolean | null
          moved_stage: string | null
          objection_type: string | null
          sentiment_after: string | null
          sentiment_before: string | null
          times_used: number | null
          trigger_message: string | null
        }
        Insert: {
          ai_response?: string | null
          conversation_id?: string | null
          created_at?: string | null
          effectiveness_score?: number | null
          id?: string
          industry?: string | null
          lead_id?: string | null
          lead_score_range?: string | null
          led_to_close?: boolean | null
          led_to_interest?: boolean | null
          moved_stage?: string | null
          objection_type?: string | null
          sentiment_after?: string | null
          sentiment_before?: string | null
          times_used?: number | null
          trigger_message?: string | null
        }
        Update: {
          ai_response?: string | null
          conversation_id?: string | null
          created_at?: string | null
          effectiveness_score?: number | null
          id?: string
          industry?: string | null
          lead_id?: string | null
          lead_score_range?: string | null
          led_to_close?: boolean | null
          led_to_interest?: boolean | null
          moved_stage?: string | null
          objection_type?: string | null
          sentiment_after?: string | null
          sentiment_before?: string | null
          times_used?: number | null
          trigger_message?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "conversation_insights_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "ai_conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversation_insights_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "discovered_leads"
            referencedColumns: ["id"]
          },
        ]
      }
      cross_sell_activations: {
        Row: {
          activation_payload: Json
          activation_status: string
          created_at: string
          external_reference: string | null
          id: string
          offer_id: string
          pipeline_id: string
          recommendation_id: string | null
        }
        Insert: {
          activation_payload?: Json
          activation_status?: string
          created_at?: string
          external_reference?: string | null
          id?: string
          offer_id: string
          pipeline_id: string
          recommendation_id?: string | null
        }
        Update: {
          activation_payload?: Json
          activation_status?: string
          created_at?: string
          external_reference?: string | null
          id?: string
          offer_id?: string
          pipeline_id?: string
          recommendation_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cross_sell_activations_offer_id_fkey"
            columns: ["offer_id"]
            isOneToOne: false
            referencedRelation: "cross_sell_offers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cross_sell_activations_pipeline_id_fkey"
            columns: ["pipeline_id"]
            isOneToOne: false
            referencedRelation: "deal_pipeline"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cross_sell_activations_recommendation_id_fkey"
            columns: ["recommendation_id"]
            isOneToOne: false
            referencedRelation: "cross_sell_recommendations"
            referencedColumns: ["id"]
          },
        ]
      }
      cross_sell_categories: {
        Row: {
          category_key: string
          category_name: string
          created_at: string
          description: string | null
          id: string
          is_active: boolean
        }
        Insert: {
          category_key: string
          category_name: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
        }
        Update: {
          category_key?: string
          category_name?: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
        }
        Relationships: []
      }
      cross_sell_offers: {
        Row: {
          activation_url: string | null
          category_id: string
          created_at: string
          description: string | null
          headline: string | null
          id: string
          is_active: boolean
          offer_key: string
          offer_name: string
          provider_name: string
          source_type: string
        }
        Insert: {
          activation_url?: string | null
          category_id: string
          created_at?: string
          description?: string | null
          headline?: string | null
          id?: string
          is_active?: boolean
          offer_key: string
          offer_name: string
          provider_name: string
          source_type: string
        }
        Update: {
          activation_url?: string | null
          category_id?: string
          created_at?: string
          description?: string | null
          headline?: string | null
          id?: string
          is_active?: boolean
          offer_key?: string
          offer_name?: string
          provider_name?: string
          source_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "cross_sell_offers_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "cross_sell_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      cross_sell_recommendations: {
        Row: {
          category_id: string
          created_at: string
          id: string
          offer_id: string
          pipeline_id: string
          recommendation_rank: number
          recommendation_reason: string | null
          status: string
        }
        Insert: {
          category_id: string
          created_at?: string
          id?: string
          offer_id: string
          pipeline_id: string
          recommendation_rank?: number
          recommendation_reason?: string | null
          status?: string
        }
        Update: {
          category_id?: string
          created_at?: string
          id?: string
          offer_id?: string
          pipeline_id?: string
          recommendation_rank?: number
          recommendation_reason?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "cross_sell_recommendations_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "cross_sell_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cross_sell_recommendations_offer_id_fkey"
            columns: ["offer_id"]
            isOneToOne: false
            referencedRelation: "cross_sell_offers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cross_sell_recommendations_pipeline_id_fkey"
            columns: ["pipeline_id"]
            isOneToOne: false
            referencedRelation: "deal_pipeline"
            referencedColumns: ["id"]
          },
        ]
      }
      cross_sell_rules: {
        Row: {
          category_id: string
          created_at: string
          id: string
          industry_key: string
          is_active: boolean
          priority: number
        }
        Insert: {
          category_id: string
          created_at?: string
          id?: string
          industry_key: string
          is_active?: boolean
          priority?: number
        }
        Update: {
          category_id?: string
          created_at?: string
          id?: string
          industry_key?: string
          is_active?: boolean
          priority?: number
        }
        Relationships: [
          {
            foreignKeyName: "cross_sell_rules_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "cross_sell_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      deal_action_queues: {
        Row: {
          created_at: string | null
          deal_id: string
          id: string
          metadata: Json | null
          priority_score: number | null
          queue_reason: string | null
          queue_type: Database["public"]["Enums"]["deal_queue_type"] | null
        }
        Insert: {
          created_at?: string | null
          deal_id: string
          id?: string
          metadata?: Json | null
          priority_score?: number | null
          queue_reason?: string | null
          queue_type?: Database["public"]["Enums"]["deal_queue_type"] | null
        }
        Update: {
          created_at?: string | null
          deal_id?: string
          id?: string
          metadata?: Json | null
          priority_score?: number | null
          queue_reason?: string | null
          queue_type?: Database["public"]["Enums"]["deal_queue_type"] | null
        }
        Relationships: []
      }
      deal_auto_progression_events: {
        Row: {
          created_at: string
          deal_id: string
          id: string
          metadata: Json
          next_status: string
          previous_status: string | null
          progression_reason: string
          should_update: boolean
          trigger_source: string
          updated: boolean
        }
        Insert: {
          created_at?: string
          deal_id: string
          id?: string
          metadata?: Json
          next_status: string
          previous_status?: string | null
          progression_reason: string
          should_update: boolean
          trigger_source?: string
          updated?: boolean
        }
        Update: {
          created_at?: string
          deal_id?: string
          id?: string
          metadata?: Json
          next_status?: string
          previous_status?: string | null
          progression_reason?: string
          should_update?: boolean
          trigger_source?: string
          updated?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "deal_auto_progression_events_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
        ]
      }
      deal_blocker_states: {
        Row: {
          blocker_type: Database["public"]["Enums"]["deal_blocker_type"] | null
          created_at: string | null
          deal_id: string
          id: string
          metadata: Json | null
          owner_type: string | null
          severity: number | null
          unblock_condition: string | null
        }
        Insert: {
          blocker_type?: Database["public"]["Enums"]["deal_blocker_type"] | null
          created_at?: string | null
          deal_id: string
          id?: string
          metadata?: Json | null
          owner_type?: string | null
          severity?: number | null
          unblock_condition?: string | null
        }
        Update: {
          blocker_type?: Database["public"]["Enums"]["deal_blocker_type"] | null
          created_at?: string | null
          deal_id?: string
          id?: string
          metadata?: Json | null
          owner_type?: string | null
          severity?: number | null
          unblock_condition?: string | null
        }
        Relationships: []
      }
      deal_briefs: {
        Row: {
          competitors: Json | null
          contract_expires: string | null
          created_at: string | null
          current_energy_spend: number | null
          deal_value: number | null
          digital_maturity: number | null
          employee_count: number | null
          estimated_savings: number | null
          executive_summary: string | null
          exported_at: string | null
          id: string
          lead_id: string | null
          locations: number | null
          market_volatility: string | null
          next_steps: Json | null
          objections: Json | null
          recommended_term: number | null
          sales_script: Json | null
          security_posture: string | null
          urgency: string | null
          viewed_at: string | null
          your_commission: number | null
        }
        Insert: {
          competitors?: Json | null
          contract_expires?: string | null
          created_at?: string | null
          current_energy_spend?: number | null
          deal_value?: number | null
          digital_maturity?: number | null
          employee_count?: number | null
          estimated_savings?: number | null
          executive_summary?: string | null
          exported_at?: string | null
          id?: string
          lead_id?: string | null
          locations?: number | null
          market_volatility?: string | null
          next_steps?: Json | null
          objections?: Json | null
          recommended_term?: number | null
          sales_script?: Json | null
          security_posture?: string | null
          urgency?: string | null
          viewed_at?: string | null
          your_commission?: number | null
        }
        Update: {
          competitors?: Json | null
          contract_expires?: string | null
          created_at?: string | null
          current_energy_spend?: number | null
          deal_value?: number | null
          digital_maturity?: number | null
          employee_count?: number | null
          estimated_savings?: number | null
          executive_summary?: string | null
          exported_at?: string | null
          id?: string
          lead_id?: string | null
          locations?: number | null
          market_volatility?: string | null
          next_steps?: Json | null
          objections?: Json | null
          recommended_term?: number | null
          sales_script?: Json | null
          security_posture?: string | null
          urgency?: string | null
          viewed_at?: string | null
          your_commission?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "deal_briefs_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: true
            referencedRelation: "discovered_leads"
            referencedColumns: ["id"]
          },
        ]
      }
      deal_counterparties: {
        Row: {
          counterparty_identifier: string | null
          counterparty_name: string
          counterparty_type: string
          created_at: string
          deal_id: string
          id: string
          metadata: Json
          notes: string | null
          role_label: string | null
          status: string
          updated_at: string
          visibility_level: string
        }
        Insert: {
          counterparty_identifier?: string | null
          counterparty_name: string
          counterparty_type: string
          created_at?: string
          deal_id: string
          id?: string
          metadata?: Json
          notes?: string | null
          role_label?: string | null
          status?: string
          updated_at?: string
          visibility_level?: string
        }
        Update: {
          counterparty_identifier?: string | null
          counterparty_name?: string
          counterparty_type?: string
          created_at?: string
          deal_id?: string
          id?: string
          metadata?: Json
          notes?: string | null
          role_label?: string | null
          status?: string
          updated_at?: string
          visibility_level?: string
        }
        Relationships: [
          {
            foreignKeyName: "deal_counterparties_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
        ]
      }
      deal_demand_estimates: {
        Row: {
          assumed_blended_rate_per_kwh: number
          confidence_band: string
          confidence_score: number
          created_at: string
          deal_id: string
          estimated_annual_kwh: number
          estimated_annual_spend: number
          estimated_average_kw: number
          estimated_peak_kw: number
          id: string
          load_band: string
          reasoning: Json
        }
        Insert: {
          assumed_blended_rate_per_kwh: number
          confidence_band: string
          confidence_score: number
          created_at?: string
          deal_id: string
          estimated_annual_kwh: number
          estimated_annual_spend: number
          estimated_average_kw: number
          estimated_peak_kw: number
          id?: string
          load_band: string
          reasoning?: Json
        }
        Update: {
          assumed_blended_rate_per_kwh?: number
          confidence_band?: string
          confidence_score?: number
          created_at?: string
          deal_id?: string
          estimated_annual_kwh?: number
          estimated_annual_spend?: number
          estimated_average_kw?: number
          estimated_peak_kw?: number
          id?: string
          load_band?: string
          reasoning?: Json
        }
        Relationships: [
          {
            foreignKeyName: "deal_demand_estimates_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
        ]
      }
      deal_economic_stack_decisions: {
        Row: {
          compensation_attachment_status:
            | Database["public"]["Enums"]["compensation_attachment_status"]
            | null
          created_at: string | null
          deal_id: string
          margin_protection_flags: string[] | null
          metadata: Json | null
          primary_transaction_model: string | null
          retained_rights: string[] | null
          secondary_layers: string[] | null
          stack_type: Database["public"]["Enums"]["economic_stack_type"] | null
          tertiary_layers: string[] | null
        }
        Insert: {
          compensation_attachment_status?:
            | Database["public"]["Enums"]["compensation_attachment_status"]
            | null
          created_at?: string | null
          deal_id: string
          margin_protection_flags?: string[] | null
          metadata?: Json | null
          primary_transaction_model?: string | null
          retained_rights?: string[] | null
          secondary_layers?: string[] | null
          stack_type?: Database["public"]["Enums"]["economic_stack_type"] | null
          tertiary_layers?: string[] | null
        }
        Update: {
          compensation_attachment_status?:
            | Database["public"]["Enums"]["compensation_attachment_status"]
            | null
          created_at?: string | null
          deal_id?: string
          margin_protection_flags?: string[] | null
          metadata?: Json | null
          primary_transaction_model?: string | null
          retained_rights?: string[] | null
          secondary_layers?: string[] | null
          stack_type?: Database["public"]["Enums"]["economic_stack_type"] | null
          tertiary_layers?: string[] | null
        }
        Relationships: []
      }
      deal_economics: {
        Row: {
          acquisition_cost: number | null
          actual_commission: number | null
          bid_id: string | null
          closed_at: string | null
          commission_rate_used: number | null
          created_at: string
          estimated_commission: number | null
          estimated_savings: number | null
          expected_retention_months: number
          first_payment_at: string | null
          id: string
          last_payment_at: string | null
          lead_id: string
          lifetime_value: number | null
          margin: number | null
          profitability_score: number | null
          rate: number | null
          renewal_probability: number
          supplier_id: string | null
          term_months: number | null
          updated_at: string
          volume_mwh: number | null
        }
        Insert: {
          acquisition_cost?: number | null
          actual_commission?: number | null
          bid_id?: string | null
          closed_at?: string | null
          commission_rate_used?: number | null
          created_at?: string
          estimated_commission?: number | null
          estimated_savings?: number | null
          expected_retention_months?: number
          first_payment_at?: string | null
          id?: string
          last_payment_at?: string | null
          lead_id: string
          lifetime_value?: number | null
          margin?: number | null
          profitability_score?: number | null
          rate?: number | null
          renewal_probability?: number
          supplier_id?: string | null
          term_months?: number | null
          updated_at?: string
          volume_mwh?: number | null
        }
        Update: {
          acquisition_cost?: number | null
          actual_commission?: number | null
          bid_id?: string | null
          closed_at?: string | null
          commission_rate_used?: number | null
          created_at?: string
          estimated_commission?: number | null
          estimated_savings?: number | null
          expected_retention_months?: number
          first_payment_at?: string | null
          id?: string
          last_payment_at?: string | null
          lead_id?: string
          lifetime_value?: number | null
          margin?: number | null
          profitability_score?: number | null
          rate?: number | null
          renewal_probability?: number
          supplier_id?: string | null
          term_months?: number | null
          updated_at?: string
          volume_mwh?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "deal_economics_bid_id_fkey"
            columns: ["bid_id"]
            isOneToOne: false
            referencedRelation: "bids"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deal_economics_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "discovered_leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deal_economics_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      deal_next_best_actions: {
        Row: {
          action_description: string | null
          action_title: string | null
          confidence_score: number | null
          created_at: string | null
          deal_id: string
          id: string
          metadata: Json | null
          requires_human_review: boolean | null
          source_engine: string | null
        }
        Insert: {
          action_description?: string | null
          action_title?: string | null
          confidence_score?: number | null
          created_at?: string | null
          deal_id: string
          id?: string
          metadata?: Json | null
          requires_human_review?: boolean | null
          source_engine?: string | null
        }
        Update: {
          action_description?: string | null
          action_title?: string | null
          confidence_score?: number | null
          created_at?: string | null
          deal_id?: string
          id?: string
          metadata?: Json | null
          requires_human_review?: boolean | null
          source_engine?: string | null
        }
        Relationships: []
      }
      deal_operator_tasks: {
        Row: {
          created_at: string | null
          deal_id: string
          due_at: string | null
          id: string
          metadata: Json | null
          owner_identifier: string | null
          owner_type: string | null
          task_description: string | null
          task_status: Database["public"]["Enums"]["deal_task_status"] | null
          task_title: string | null
          task_type: Database["public"]["Enums"]["deal_task_type"] | null
        }
        Insert: {
          created_at?: string | null
          deal_id: string
          due_at?: string | null
          id?: string
          metadata?: Json | null
          owner_identifier?: string | null
          owner_type?: string | null
          task_description?: string | null
          task_status?: Database["public"]["Enums"]["deal_task_status"] | null
          task_title?: string | null
          task_type?: Database["public"]["Enums"]["deal_task_type"] | null
        }
        Update: {
          created_at?: string | null
          deal_id?: string
          due_at?: string | null
          id?: string
          metadata?: Json | null
          owner_identifier?: string | null
          owner_type?: string | null
          task_description?: string | null
          task_status?: Database["public"]["Enums"]["deal_task_status"] | null
          task_title?: string | null
          task_type?: Database["public"]["Enums"]["deal_task_type"] | null
        }
        Relationships: []
      }
      deal_package_share_events: {
        Row: {
          created_at: string
          deal_id: string
          id: string
          metadata: Json
          notes: string | null
          package_id: string
          recipient_identifier: string
          recipient_type: string
          share_channel: string
          share_status: string
        }
        Insert: {
          created_at?: string
          deal_id: string
          id?: string
          metadata?: Json
          notes?: string | null
          package_id: string
          recipient_identifier: string
          recipient_type: string
          share_channel: string
          share_status?: string
        }
        Update: {
          created_at?: string
          deal_id?: string
          id?: string
          metadata?: Json
          notes?: string | null
          package_id?: string
          recipient_identifier?: string
          recipient_type?: string
          share_channel?: string
          share_status?: string
        }
        Relationships: [
          {
            foreignKeyName: "deal_package_share_events_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deal_package_share_events_package_id_fkey"
            columns: ["package_id"]
            isOneToOne: false
            referencedRelation: "deal_packages"
            referencedColumns: ["id"]
          },
        ]
      }
      deal_package_versions: {
        Row: {
          audience: Database["public"]["Enums"]["deal_package_audience"] | null
          change_summary: string | null
          created_at: string | null
          deal_id: string
          disclosure_tier:
            | Database["public"]["Enums"]["deal_disclosure_tier"]
            | null
          id: string
          package_payload: Json | null
          package_title: string | null
          parent_package_id: string | null
          release_conditions: string[] | null
          release_notes: string | null
          release_status: string | null
          version_number: number
        }
        Insert: {
          audience?: Database["public"]["Enums"]["deal_package_audience"] | null
          change_summary?: string | null
          created_at?: string | null
          deal_id: string
          disclosure_tier?:
            | Database["public"]["Enums"]["deal_disclosure_tier"]
            | null
          id?: string
          package_payload?: Json | null
          package_title?: string | null
          parent_package_id?: string | null
          release_conditions?: string[] | null
          release_notes?: string | null
          release_status?: string | null
          version_number: number
        }
        Update: {
          audience?: Database["public"]["Enums"]["deal_package_audience"] | null
          change_summary?: string | null
          created_at?: string | null
          deal_id?: string
          disclosure_tier?:
            | Database["public"]["Enums"]["deal_disclosure_tier"]
            | null
          id?: string
          package_payload?: Json | null
          package_title?: string | null
          parent_package_id?: string | null
          release_conditions?: string[] | null
          release_notes?: string | null
          release_status?: string | null
          version_number?: number
        }
        Relationships: []
      }
      deal_packages: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          audience: string
          created_at: string
          deal_id: string
          generated_by: string | null
          id: string
          package_payload: Json
          package_type: string
          package_version: number
          status: string
          summary: string | null
          superseded_at: string | null
          title: string
          updated_at: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          audience: string
          created_at?: string
          deal_id: string
          generated_by?: string | null
          id?: string
          package_payload?: Json
          package_type: string
          package_version: number
          status?: string
          summary?: string | null
          superseded_at?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          audience?: string
          created_at?: string
          deal_id?: string
          generated_by?: string | null
          id?: string
          package_payload?: Json
          package_type?: string
          package_version?: number
          status?: string
          summary?: string | null
          superseded_at?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "deal_packages_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
        ]
      }
      deal_pipeline: {
        Row: {
          account_number: string | null
          annual_usage_kwh: number | null
          annual_usage_therms: number | null
          autonomous_deal_id: string | null
          closed_at: string | null
          commodity: string | null
          created_at: string
          created_by: string | null
          customer_email: string | null
          customer_name: string | null
          customer_phone: string | null
          deal_name: string
          id: string
          lead_id: string | null
          lost_at: string | null
          metadata: Json
          notes: string | null
          proposal_id: string | null
          service_address: string | null
          stage: Database["public"]["Enums"]["pipeline_stage"]
          supplier_name: string | null
          updated_at: string
          utility_name: string | null
          won_at: string | null
        }
        Insert: {
          account_number?: string | null
          annual_usage_kwh?: number | null
          annual_usage_therms?: number | null
          autonomous_deal_id?: string | null
          closed_at?: string | null
          commodity?: string | null
          created_at?: string
          created_by?: string | null
          customer_email?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          deal_name: string
          id?: string
          lead_id?: string | null
          lost_at?: string | null
          metadata?: Json
          notes?: string | null
          proposal_id?: string | null
          service_address?: string | null
          stage?: Database["public"]["Enums"]["pipeline_stage"]
          supplier_name?: string | null
          updated_at?: string
          utility_name?: string | null
          won_at?: string | null
        }
        Update: {
          account_number?: string | null
          annual_usage_kwh?: number | null
          annual_usage_therms?: number | null
          autonomous_deal_id?: string | null
          closed_at?: string | null
          commodity?: string | null
          created_at?: string
          created_by?: string | null
          customer_email?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          deal_name?: string
          id?: string
          lead_id?: string | null
          lost_at?: string | null
          metadata?: Json
          notes?: string | null
          proposal_id?: string | null
          service_address?: string | null
          stage?: Database["public"]["Enums"]["pipeline_stage"]
          supplier_name?: string | null
          updated_at?: string
          utility_name?: string | null
          won_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "deal_pipeline_autonomous_deal_id_fkey"
            columns: ["autonomous_deal_id"]
            isOneToOne: false
            referencedRelation: "autonomous_deals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deal_pipeline_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "discovered_leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deal_pipeline_proposal_id_fkey"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "proposals"
            referencedColumns: ["id"]
          },
        ]
      }
      deal_post_close_assets: {
        Row: {
          asset_type: string | null
          created_at: string | null
          deal_id: string | null
          id: string
          metadata: Json | null
        }
        Insert: {
          asset_type?: string | null
          created_at?: string | null
          deal_id?: string | null
          id?: string
          metadata?: Json | null
        }
        Update: {
          asset_type?: string | null
          created_at?: string | null
          deal_id?: string | null
          id?: string
          metadata?: Json | null
        }
        Relationships: []
      }
      deal_risk_flags: {
        Row: {
          created_at: string | null
          deal_id: string | null
          id: string
          metadata: Json | null
          risk_score: number | null
          risk_type: string | null
        }
        Insert: {
          created_at?: string | null
          deal_id?: string | null
          id?: string
          metadata?: Json | null
          risk_score?: number | null
          risk_type?: string | null
        }
        Update: {
          created_at?: string | null
          deal_id?: string | null
          id?: string
          metadata?: Json | null
          risk_score?: number | null
          risk_type?: string | null
        }
        Relationships: []
      }
      deal_runner_events: {
        Row: {
          created_at: string
          failure_count: number
          id: string
          metadata: Json
          processed_count: number
          run_mode: string
          run_status: string
          success_count: number
        }
        Insert: {
          created_at?: string
          failure_count?: number
          id?: string
          metadata?: Json
          processed_count?: number
          run_mode: string
          run_status?: string
          success_count?: number
        }
        Update: {
          created_at?: string
          failure_count?: number
          id?: string
          metadata?: Json
          processed_count?: number
          run_mode?: string
          run_status?: string
          success_count?: number
        }
        Relationships: []
      }
      deal_wait_states: {
        Row: {
          created_at: string | null
          deal_id: string
          id: string
          is_active: boolean | null
          metadata: Json | null
          reason: string | null
          resume_trigger: string | null
          wait_state: Database["public"]["Enums"]["deal_wait_state"] | null
        }
        Insert: {
          created_at?: string | null
          deal_id: string
          id?: string
          is_active?: boolean | null
          metadata?: Json | null
          reason?: string | null
          resume_trigger?: string | null
          wait_state?: Database["public"]["Enums"]["deal_wait_state"] | null
        }
        Update: {
          created_at?: string | null
          deal_id?: string
          id?: string
          is_active?: boolean | null
          metadata?: Json | null
          reason?: string | null
          resume_trigger?: string | null
          wait_state?: Database["public"]["Enums"]["deal_wait_state"] | null
        }
        Relationships: []
      }
      deals: {
        Row: {
          business_name: string
          created_at: string
          estimated_monthly_bill: number | null
          id: string
          intake_source: string | null
          state: string | null
          status: string
        }
        Insert: {
          business_name: string
          created_at?: string
          estimated_monthly_bill?: number | null
          id?: string
          intake_source?: string | null
          state?: string | null
          status?: string
        }
        Update: {
          business_name?: string
          created_at?: string
          estimated_monthly_bill?: number | null
          id?: string
          intake_source?: string | null
          state?: string | null
          status?: string
        }
        Relationships: []
      }
      discovered_leads: {
        Row: {
          address: string | null
          ai_conversation_id: string | null
          broker_value_score: number | null
          building_footprint_sqft: number | null
          business_name: string
          city: string | null
          created_at: string | null
          email: string | null
          employee_count: number | null
          enrichment_data: Json | null
          enrichment_status: string | null
          estimated_commission: number | null
          estimated_energy_spend: number | null
          estimated_expiration_window: number | null
          estimated_savings: number | null
          google_rating: number | null
          google_reviews: number | null
          handoff_assigned_to: string | null
          handoff_contacted_at: string | null
          handoff_notes: string | null
          handoff_prepared_at: string | null
          handoff_reviewed_at: string | null
          handoff_status: string | null
          id: string
          industry: string | null
          is_enterprise: boolean | null
          iso_region: string | null
          lead_score: number | null
          naics_code: string | null
          parcel_id: string | null
          phone: string | null
          place_id: string | null
          price_level: number | null
          property_type: string | null
          source_id: string | null
          square_feet: number | null
          state: string | null
          status: string | null
          team_id: string | null
          utility_provider: string | null
          website: string | null
          year_built: number | null
          year_founded: number | null
          zip: string | null
        }
        Insert: {
          address?: string | null
          ai_conversation_id?: string | null
          broker_value_score?: number | null
          building_footprint_sqft?: number | null
          business_name: string
          city?: string | null
          created_at?: string | null
          email?: string | null
          employee_count?: number | null
          enrichment_data?: Json | null
          enrichment_status?: string | null
          estimated_commission?: number | null
          estimated_energy_spend?: number | null
          estimated_expiration_window?: number | null
          estimated_savings?: number | null
          google_rating?: number | null
          google_reviews?: number | null
          handoff_assigned_to?: string | null
          handoff_contacted_at?: string | null
          handoff_notes?: string | null
          handoff_prepared_at?: string | null
          handoff_reviewed_at?: string | null
          handoff_status?: string | null
          id?: string
          industry?: string | null
          is_enterprise?: boolean | null
          iso_region?: string | null
          lead_score?: number | null
          naics_code?: string | null
          parcel_id?: string | null
          phone?: string | null
          place_id?: string | null
          price_level?: number | null
          property_type?: string | null
          source_id?: string | null
          square_feet?: number | null
          state?: string | null
          status?: string | null
          team_id?: string | null
          utility_provider?: string | null
          website?: string | null
          year_built?: number | null
          year_founded?: number | null
          zip?: string | null
        }
        Update: {
          address?: string | null
          ai_conversation_id?: string | null
          broker_value_score?: number | null
          building_footprint_sqft?: number | null
          business_name?: string
          city?: string | null
          created_at?: string | null
          email?: string | null
          employee_count?: number | null
          enrichment_data?: Json | null
          enrichment_status?: string | null
          estimated_commission?: number | null
          estimated_energy_spend?: number | null
          estimated_expiration_window?: number | null
          estimated_savings?: number | null
          google_rating?: number | null
          google_reviews?: number | null
          handoff_assigned_to?: string | null
          handoff_contacted_at?: string | null
          handoff_notes?: string | null
          handoff_prepared_at?: string | null
          handoff_reviewed_at?: string | null
          handoff_status?: string | null
          id?: string
          industry?: string | null
          is_enterprise?: boolean | null
          iso_region?: string | null
          lead_score?: number | null
          naics_code?: string | null
          parcel_id?: string | null
          phone?: string | null
          place_id?: string | null
          price_level?: number | null
          property_type?: string | null
          source_id?: string | null
          square_feet?: number | null
          state?: string | null
          status?: string | null
          team_id?: string | null
          utility_provider?: string | null
          website?: string | null
          year_built?: number | null
          year_founded?: number | null
          zip?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "discovered_leads_source_id_fkey"
            columns: ["source_id"]
            isOneToOne: false
            referencedRelation: "lead_sources"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "discovered_leads_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      discovered_leads_backup_03172026: {
        Row: {
          address: string | null
          broker_value_score: number | null
          building_footprint_sqft: number | null
          business_name: string | null
          city: string | null
          created_at: string | null
          email: string | null
          employee_count: number | null
          enrichment_data: Json | null
          enrichment_status: string | null
          estimated_commission: number | null
          estimated_energy_spend: number | null
          estimated_expiration_window: number | null
          estimated_savings: number | null
          google_rating: number | null
          google_reviews: number | null
          handoff_assigned_to: string | null
          handoff_contacted_at: string | null
          handoff_notes: string | null
          handoff_prepared_at: string | null
          handoff_reviewed_at: string | null
          handoff_status: string | null
          id: string | null
          industry: string | null
          is_enterprise: boolean | null
          iso_region: string | null
          lead_score: number | null
          naics_code: string | null
          parcel_id: string | null
          phone: string | null
          place_id: string | null
          price_level: number | null
          property_type: string | null
          source_id: string | null
          square_feet: number | null
          state: string | null
          status: string | null
          team_id: string | null
          utility_provider: string | null
          website: string | null
          year_built: number | null
          year_founded: number | null
          zip: string | null
        }
        Insert: {
          address?: string | null
          broker_value_score?: number | null
          building_footprint_sqft?: number | null
          business_name?: string | null
          city?: string | null
          created_at?: string | null
          email?: string | null
          employee_count?: number | null
          enrichment_data?: Json | null
          enrichment_status?: string | null
          estimated_commission?: number | null
          estimated_energy_spend?: number | null
          estimated_expiration_window?: number | null
          estimated_savings?: number | null
          google_rating?: number | null
          google_reviews?: number | null
          handoff_assigned_to?: string | null
          handoff_contacted_at?: string | null
          handoff_notes?: string | null
          handoff_prepared_at?: string | null
          handoff_reviewed_at?: string | null
          handoff_status?: string | null
          id?: string | null
          industry?: string | null
          is_enterprise?: boolean | null
          iso_region?: string | null
          lead_score?: number | null
          naics_code?: string | null
          parcel_id?: string | null
          phone?: string | null
          place_id?: string | null
          price_level?: number | null
          property_type?: string | null
          source_id?: string | null
          square_feet?: number | null
          state?: string | null
          status?: string | null
          team_id?: string | null
          utility_provider?: string | null
          website?: string | null
          year_built?: number | null
          year_founded?: number | null
          zip?: string | null
        }
        Update: {
          address?: string | null
          broker_value_score?: number | null
          building_footprint_sqft?: number | null
          business_name?: string | null
          city?: string | null
          created_at?: string | null
          email?: string | null
          employee_count?: number | null
          enrichment_data?: Json | null
          enrichment_status?: string | null
          estimated_commission?: number | null
          estimated_energy_spend?: number | null
          estimated_expiration_window?: number | null
          estimated_savings?: number | null
          google_rating?: number | null
          google_reviews?: number | null
          handoff_assigned_to?: string | null
          handoff_contacted_at?: string | null
          handoff_notes?: string | null
          handoff_prepared_at?: string | null
          handoff_reviewed_at?: string | null
          handoff_status?: string | null
          id?: string | null
          industry?: string | null
          is_enterprise?: boolean | null
          iso_region?: string | null
          lead_score?: number | null
          naics_code?: string | null
          parcel_id?: string | null
          phone?: string | null
          place_id?: string | null
          price_level?: number | null
          property_type?: string | null
          source_id?: string | null
          square_feet?: number | null
          state?: string | null
          status?: string | null
          team_id?: string | null
          utility_provider?: string | null
          website?: string | null
          year_built?: number | null
          year_founded?: number | null
          zip?: string | null
        }
        Relationships: []
      }
      document_upload_records: {
        Row: {
          deal_id: string
          document_type: string
          file_mime_type: string | null
          file_name: string
          file_size_bytes: number | null
          id: string
          metadata: Json
          notes: string | null
          required_document_id: string | null
          storage_bucket: string | null
          storage_path: string | null
          upload_status: string
          uploaded_at: string
          uploaded_by: string | null
          verification_status: string
          verified_at: string | null
        }
        Insert: {
          deal_id: string
          document_type: string
          file_mime_type?: string | null
          file_name: string
          file_size_bytes?: number | null
          id?: string
          metadata?: Json
          notes?: string | null
          required_document_id?: string | null
          storage_bucket?: string | null
          storage_path?: string | null
          upload_status?: string
          uploaded_at?: string
          uploaded_by?: string | null
          verification_status?: string
          verified_at?: string | null
        }
        Update: {
          deal_id?: string
          document_type?: string
          file_mime_type?: string | null
          file_name?: string
          file_size_bytes?: number | null
          id?: string
          metadata?: Json
          notes?: string | null
          required_document_id?: string | null
          storage_bucket?: string | null
          storage_path?: string | null
          upload_status?: string
          uploaded_at?: string
          uploaded_by?: string | null
          verification_status?: string
          verified_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "document_upload_records_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_upload_records_required_document_id_fkey"
            columns: ["required_document_id"]
            isOneToOne: false
            referencedRelation: "contract_required_documents"
            referencedColumns: ["id"]
          },
        ]
      }
      document_verification_events: {
        Row: {
          created_at: string
          deal_id: string
          document_type: string
          event_source: string
          id: string
          metadata: Json
          next_upload_status: string | null
          next_verification_status: string
          previous_upload_status: string | null
          previous_verification_status: string | null
          required_document_id: string | null
          upload_id: string
          verification_notes: string | null
        }
        Insert: {
          created_at?: string
          deal_id: string
          document_type: string
          event_source?: string
          id?: string
          metadata?: Json
          next_upload_status?: string | null
          next_verification_status: string
          previous_upload_status?: string | null
          previous_verification_status?: string | null
          required_document_id?: string | null
          upload_id: string
          verification_notes?: string | null
        }
        Update: {
          created_at?: string
          deal_id?: string
          document_type?: string
          event_source?: string
          id?: string
          metadata?: Json
          next_upload_status?: string | null
          next_verification_status?: string
          previous_upload_status?: string | null
          previous_verification_status?: string | null
          required_document_id?: string | null
          upload_id?: string
          verification_notes?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "document_verification_events_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_verification_events_required_document_id_fkey"
            columns: ["required_document_id"]
            isOneToOne: false
            referencedRelation: "contract_required_documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_verification_events_upload_id_fkey"
            columns: ["upload_id"]
            isOneToOne: false
            referencedRelation: "document_upload_records"
            referencedColumns: ["id"]
          },
        ]
      }
      email_jobs: {
        Row: {
          created_at: string | null
          error: string | null
          id: string
          lead_id: string | null
          scheduled_for: string
          sent_at: string | null
          status: string | null
          template_id: string | null
        }
        Insert: {
          created_at?: string | null
          error?: string | null
          id?: string
          lead_id?: string | null
          scheduled_for: string
          sent_at?: string | null
          status?: string | null
          template_id?: string | null
        }
        Update: {
          created_at?: string | null
          error?: string | null
          id?: string
          lead_id?: string | null
          scheduled_for?: string
          sent_at?: string | null
          status?: string | null
          template_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "email_jobs_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "discovered_leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_jobs_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "email_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      email_sequences: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          trigger_condition: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          trigger_condition?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          trigger_condition?: string | null
        }
        Relationships: []
      }
      email_templates: {
        Row: {
          body: string
          category: string | null
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          subject: string
        }
        Insert: {
          body: string
          category?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          subject: string
        }
        Update: {
          body?: string
          category?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          subject?: string
        }
        Relationships: []
      }
      email_tests: {
        Row: {
          created_at: string | null
          id: string
          response: string | null
          sent_to: string | null
          status: string | null
          template_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          response?: string | null
          sent_to?: string | null
          status?: string | null
          template_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          response?: string | null
          sent_to?: string | null
          status?: string | null
          template_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "email_tests_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "email_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      enrollment_attempts: {
        Row: {
          created_at: string
          enrollment_payload: Json
          external_enrollment_id: string | null
          failure_reason: string | null
          id: string
          pipeline_id: string
          pricing_quote_id: string | null
          resolved_at: string | null
          response_payload: Json
          status: Database["public"]["Enums"]["enrollment_status"]
          submitted_at: string | null
          supplier_name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          enrollment_payload?: Json
          external_enrollment_id?: string | null
          failure_reason?: string | null
          id?: string
          pipeline_id: string
          pricing_quote_id?: string | null
          resolved_at?: string | null
          response_payload?: Json
          status?: Database["public"]["Enums"]["enrollment_status"]
          submitted_at?: string | null
          supplier_name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          enrollment_payload?: Json
          external_enrollment_id?: string | null
          failure_reason?: string | null
          id?: string
          pipeline_id?: string
          pricing_quote_id?: string | null
          resolved_at?: string | null
          response_payload?: Json
          status?: Database["public"]["Enums"]["enrollment_status"]
          submitted_at?: string | null
          supplier_name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "enrollment_attempts_pipeline_id_fkey"
            columns: ["pipeline_id"]
            isOneToOne: false
            referencedRelation: "deal_pipeline"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "enrollment_attempts_pricing_quote_id_fkey"
            columns: ["pricing_quote_id"]
            isOneToOne: false
            referencedRelation: "pricing_quotes"
            referencedColumns: ["id"]
          },
        ]
      }
      enrollment_executions: {
        Row: {
          created_at: string
          enrollment_attempt_id: string
          execution_payload: Json
          execution_status: string
          external_reference: string | null
          failure_reason: string | null
          id: string
          last_follow_up_at: string | null
          operator_notes: string | null
          pipeline_id: string
          recipient_company: string | null
          recipient_email: string | null
          recipient_name: string | null
          response_received_at: string | null
          send_method: string
          submitted_at: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          enrollment_attempt_id: string
          execution_payload?: Json
          execution_status: string
          external_reference?: string | null
          failure_reason?: string | null
          id?: string
          last_follow_up_at?: string | null
          operator_notes?: string | null
          pipeline_id: string
          recipient_company?: string | null
          recipient_email?: string | null
          recipient_name?: string | null
          response_received_at?: string | null
          send_method: string
          submitted_at?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          enrollment_attempt_id?: string
          execution_payload?: Json
          execution_status?: string
          external_reference?: string | null
          failure_reason?: string | null
          id?: string
          last_follow_up_at?: string | null
          operator_notes?: string | null
          pipeline_id?: string
          recipient_company?: string | null
          recipient_email?: string | null
          recipient_name?: string | null
          response_received_at?: string | null
          send_method?: string
          submitted_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "enrollment_executions_enrollment_attempt_id_fkey"
            columns: ["enrollment_attempt_id"]
            isOneToOne: false
            referencedRelation: "enrollment_attempts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "enrollment_executions_pipeline_id_fkey"
            columns: ["pipeline_id"]
            isOneToOne: false
            referencedRelation: "deal_pipeline"
            referencedColumns: ["id"]
          },
        ]
      }
      epc_deal_fit_scores: {
        Row: {
          buyer_readiness_score: number
          compensation_protection_score: number
          created_at: string
          deal_id: string
          disclosure_safety_score: number
          epc_identifier: string
          epc_profile_id: string
          execution_gate_score: number
          fit_reason: string
          fit_score: number
          geography_score: number
          id: string
          industry_score: number
          liability_boundary_score: number
          load_profile_score: number
          metadata: Json
          project_size_score: number
          recommendation_rank: number | null
          recommendation_status: string
          recommended_next_action: string | null
          recommended_package_level: string
          relationship_score: number
          response_likelihood_score: number
          site_readiness_score: number
          updated_at: string
        }
        Insert: {
          buyer_readiness_score?: number
          compensation_protection_score?: number
          created_at?: string
          deal_id: string
          disclosure_safety_score?: number
          epc_identifier: string
          epc_profile_id: string
          execution_gate_score?: number
          fit_reason: string
          fit_score?: number
          geography_score?: number
          id?: string
          industry_score?: number
          liability_boundary_score?: number
          load_profile_score?: number
          metadata?: Json
          project_size_score?: number
          recommendation_rank?: number | null
          recommendation_status?: string
          recommended_next_action?: string | null
          recommended_package_level?: string
          relationship_score?: number
          response_likelihood_score?: number
          site_readiness_score?: number
          updated_at?: string
        }
        Update: {
          buyer_readiness_score?: number
          compensation_protection_score?: number
          created_at?: string
          deal_id?: string
          disclosure_safety_score?: number
          epc_identifier?: string
          epc_profile_id?: string
          execution_gate_score?: number
          fit_reason?: string
          fit_score?: number
          geography_score?: number
          id?: string
          industry_score?: number
          liability_boundary_score?: number
          load_profile_score?: number
          metadata?: Json
          project_size_score?: number
          recommendation_rank?: number | null
          recommendation_status?: string
          recommended_next_action?: string | null
          recommended_package_level?: string
          relationship_score?: number
          response_likelihood_score?: number
          site_readiness_score?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "epc_deal_fit_scores_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "epc_deal_fit_scores_epc_profile_id_fkey"
            columns: ["epc_profile_id"]
            isOneToOne: false
            referencedRelation: "epc_partner_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      epc_partner_profiles: {
        Row: {
          account_management_required: boolean
          compensation_requirement: string
          coverage_states: string[]
          created_at: string
          disclosure_tolerance: string
          epc_identifier: string
          epc_name: string
          epc_status: string
          financing_appetite: string
          id: string
          liability_boundary_requirement: string
          maximum_project_value: number | null
          metadata: Json
          minimum_monthly_energy_bill: number | null
          minimum_project_value: number | null
          notes: string | null
          preferred_industries: string[]
          preferred_markets: string[]
          preferred_project_types: string[]
          primary_contact_email: string | null
          primary_contact_name: string | null
          primary_contact_phone: string | null
          relationship_strength_score: number
          speed_to_response_score: number
          updated_at: string
          website_url: string | null
        }
        Insert: {
          account_management_required?: boolean
          compensation_requirement?: string
          coverage_states?: string[]
          created_at?: string
          disclosure_tolerance?: string
          epc_identifier: string
          epc_name: string
          epc_status?: string
          financing_appetite?: string
          id?: string
          liability_boundary_requirement?: string
          maximum_project_value?: number | null
          metadata?: Json
          minimum_monthly_energy_bill?: number | null
          minimum_project_value?: number | null
          notes?: string | null
          preferred_industries?: string[]
          preferred_markets?: string[]
          preferred_project_types?: string[]
          primary_contact_email?: string | null
          primary_contact_name?: string | null
          primary_contact_phone?: string | null
          relationship_strength_score?: number
          speed_to_response_score?: number
          updated_at?: string
          website_url?: string | null
        }
        Update: {
          account_management_required?: boolean
          compensation_requirement?: string
          coverage_states?: string[]
          created_at?: string
          disclosure_tolerance?: string
          epc_identifier?: string
          epc_name?: string
          epc_status?: string
          financing_appetite?: string
          id?: string
          liability_boundary_requirement?: string
          maximum_project_value?: number | null
          metadata?: Json
          minimum_monthly_energy_bill?: number | null
          minimum_project_value?: number | null
          notes?: string | null
          preferred_industries?: string[]
          preferred_markets?: string[]
          preferred_project_types?: string[]
          primary_contact_email?: string | null
          primary_contact_name?: string | null
          primary_contact_phone?: string | null
          relationship_strength_score?: number
          speed_to_response_score?: number
          updated_at?: string
          website_url?: string | null
        }
        Relationships: []
      }
      epc_recommendation_events: {
        Row: {
          created_at: string
          deal_id: string
          epc_identifier: string | null
          epc_profile_id: string | null
          event_status: string
          event_summary: string | null
          event_title: string
          event_type: string
          fit_score_snapshot: number | null
          id: string
          metadata: Json
          recommended_package_level: string | null
          triggered_by: string
        }
        Insert: {
          created_at?: string
          deal_id: string
          epc_identifier?: string | null
          epc_profile_id?: string | null
          event_status?: string
          event_summary?: string | null
          event_title: string
          event_type: string
          fit_score_snapshot?: number | null
          id?: string
          metadata?: Json
          recommended_package_level?: string | null
          triggered_by?: string
        }
        Update: {
          created_at?: string
          deal_id?: string
          epc_identifier?: string | null
          epc_profile_id?: string | null
          event_status?: string
          event_summary?: string | null
          event_title?: string
          event_type?: string
          fit_score_snapshot?: number | null
          id?: string
          metadata?: Json
          recommended_package_level?: string | null
          triggered_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "epc_recommendation_events_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "epc_recommendation_events_epc_profile_id_fkey"
            columns: ["epc_profile_id"]
            isOneToOne: false
            referencedRelation: "epc_partner_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      epc_sequence_plans: {
        Row: {
          created_at: string
          deal_id: string
          epc_identifier: string
          epc_profile_id: string
          hold_reason: string | null
          id: string
          is_primary: boolean
          metadata: Json
          notes: string | null
          package_level: string
          sequence_position: number
          sequence_status: string
          sequence_type: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          deal_id: string
          epc_identifier: string
          epc_profile_id: string
          hold_reason?: string | null
          id?: string
          is_primary?: boolean
          metadata?: Json
          notes?: string | null
          package_level?: string
          sequence_position: number
          sequence_status?: string
          sequence_type?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          deal_id?: string
          epc_identifier?: string
          epc_profile_id?: string
          hold_reason?: string | null
          id?: string
          is_primary?: boolean
          metadata?: Json
          notes?: string | null
          package_level?: string
          sequence_position?: number
          sequence_status?: string
          sequence_type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "epc_sequence_plans_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "epc_sequence_plans_epc_profile_id_fkey"
            columns: ["epc_profile_id"]
            isOneToOne: false
            referencedRelation: "epc_partner_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      event_log: {
        Row: {
          action_taken: string | null
          created_at: string | null
          details: Json | null
          event_id: string | null
          id: string
          result: string | null
        }
        Insert: {
          action_taken?: string | null
          created_at?: string | null
          details?: Json | null
          event_id?: string | null
          id?: string
          result?: string | null
        }
        Update: {
          action_taken?: string | null
          created_at?: string | null
          details?: Json | null
          event_id?: string | null
          id?: string
          result?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "event_log_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "event_queue"
            referencedColumns: ["id"]
          },
        ]
      }
      event_queue: {
        Row: {
          conversation_id: string | null
          created_at: string | null
          dedupe_key: string | null
          event_data: Json
          event_type: string
          id: string
          last_error: string | null
          lead_id: string | null
          lease_expires_at: string | null
          max_retries: number
          priority: number
          processed_at: string | null
          processing_started_at: string | null
          processor_id: string | null
          retry_count: number
          scheduled_for: string | null
          status: string
          triggered_at: string | null
          updated_at: string
        }
        Insert: {
          conversation_id?: string | null
          created_at?: string | null
          dedupe_key?: string | null
          event_data?: Json
          event_type: string
          id?: string
          last_error?: string | null
          lead_id?: string | null
          lease_expires_at?: string | null
          max_retries?: number
          priority?: number
          processed_at?: string | null
          processing_started_at?: string | null
          processor_id?: string | null
          retry_count?: number
          scheduled_for?: string | null
          status?: string
          triggered_at?: string | null
          updated_at?: string
        }
        Update: {
          conversation_id?: string | null
          created_at?: string | null
          dedupe_key?: string | null
          event_data?: Json
          event_type?: string
          id?: string
          last_error?: string | null
          lead_id?: string | null
          lease_expires_at?: string | null
          max_retries?: number
          priority?: number
          processed_at?: string | null
          processing_started_at?: string | null
          processor_id?: string | null
          retry_count?: number
          scheduled_for?: string | null
          status?: string
          triggered_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_queue_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "ai_conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_queue_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "discovered_leads"
            referencedColumns: ["id"]
          },
        ]
      }
      execution_checklist_items: {
        Row: {
          checklist_id: string
          completed_at: string | null
          created_at: string
          deal_id: string
          due_at: string | null
          id: string
          item_category: string
          item_description: string | null
          item_key: string
          item_status: string
          item_title: string
          metadata: Json
          notes: string | null
          owner_identifier: string | null
          owner_type: string
          required_before_stage: string
          severity: number
          updated_at: string
          waived_at: string | null
        }
        Insert: {
          checklist_id: string
          completed_at?: string | null
          created_at?: string
          deal_id: string
          due_at?: string | null
          id?: string
          item_category: string
          item_description?: string | null
          item_key: string
          item_status?: string
          item_title: string
          metadata?: Json
          notes?: string | null
          owner_identifier?: string | null
          owner_type?: string
          required_before_stage?: string
          severity?: number
          updated_at?: string
          waived_at?: string | null
        }
        Update: {
          checklist_id?: string
          completed_at?: string | null
          created_at?: string
          deal_id?: string
          due_at?: string | null
          id?: string
          item_category?: string
          item_description?: string | null
          item_key?: string
          item_status?: string
          item_title?: string
          metadata?: Json
          notes?: string | null
          owner_identifier?: string | null
          owner_type?: string
          required_before_stage?: string
          severity?: number
          updated_at?: string
          waived_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "execution_checklist_items_checklist_id_fkey"
            columns: ["checklist_id"]
            isOneToOne: false
            referencedRelation: "execution_checklists"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "execution_checklist_items_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
        ]
      }
      execution_checklists: {
        Row: {
          blocker_count_snapshot: number
          checklist_status: string
          checklist_summary: string
          checklist_type: string
          compensation_status_snapshot: string | null
          created_at: string
          deal_id: string
          execution_lane: string
          id: string
          metadata: Json
          next_required_action: string | null
          package_status_snapshot: string | null
          readiness_score_snapshot: number | null
          updated_at: string
        }
        Insert: {
          blocker_count_snapshot?: number
          checklist_status?: string
          checklist_summary: string
          checklist_type?: string
          compensation_status_snapshot?: string | null
          created_at?: string
          deal_id: string
          execution_lane?: string
          id?: string
          metadata?: Json
          next_required_action?: string | null
          package_status_snapshot?: string | null
          readiness_score_snapshot?: number | null
          updated_at?: string
        }
        Update: {
          blocker_count_snapshot?: number
          checklist_status?: string
          checklist_summary?: string
          checklist_type?: string
          compensation_status_snapshot?: string | null
          created_at?: string
          deal_id?: string
          execution_lane?: string
          id?: string
          metadata?: Json
          next_required_action?: string | null
          package_status_snapshot?: string | null
          readiness_score_snapshot?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "execution_checklists_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
        ]
      }
      execution_gate_events: {
        Row: {
          checklist_id: string | null
          created_at: string
          deal_id: string
          evaluated_by: string
          gate_reason: string
          gate_score: number
          gate_status: string
          gate_type: string
          id: string
          metadata: Json
          recommended_action: string | null
        }
        Insert: {
          checklist_id?: string | null
          created_at?: string
          deal_id: string
          evaluated_by?: string
          gate_reason: string
          gate_score?: number
          gate_status?: string
          gate_type: string
          id?: string
          metadata?: Json
          recommended_action?: string | null
        }
        Update: {
          checklist_id?: string | null
          created_at?: string
          deal_id?: string
          evaluated_by?: string
          gate_reason?: string
          gate_score?: number
          gate_status?: string
          gate_type?: string
          id?: string
          metadata?: Json
          recommended_action?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "execution_gate_events_checklist_id_fkey"
            columns: ["checklist_id"]
            isOneToOne: false
            referencedRelation: "execution_checklists"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "execution_gate_events_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
        ]
      }
      executive_summaries: {
        Row: {
          created_at: string
          highlights: Json
          id: string
          metrics: Json
          recommendations: Json
          sent_at: string | null
          status: string
          summary: string | null
          title: string | null
          week_end: string
          week_start: string
        }
        Insert: {
          created_at?: string
          highlights?: Json
          id?: string
          metrics?: Json
          recommendations?: Json
          sent_at?: string | null
          status?: string
          summary?: string | null
          title?: string | null
          week_end: string
          week_start: string
        }
        Update: {
          created_at?: string
          highlights?: Json
          id?: string
          metrics?: Json
          recommendations?: Json
          sent_at?: string | null
          status?: string
          summary?: string | null
          title?: string | null
          week_end?: string
          week_start?: string
        }
        Relationships: []
      }
      human_intervention_queue: {
        Row: {
          ai_conversation_id: string | null
          assigned_to: string | null
          created_at: string
          id: string
          lead_id: string | null
          payload: Json
          priority: number
          reason: string
          resolved_at: string | null
          status: string
          updated_at: string
        }
        Insert: {
          ai_conversation_id?: string | null
          assigned_to?: string | null
          created_at?: string
          id?: string
          lead_id?: string | null
          payload?: Json
          priority?: number
          reason: string
          resolved_at?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          ai_conversation_id?: string | null
          assigned_to?: string | null
          created_at?: string
          id?: string
          lead_id?: string | null
          payload?: Json
          priority?: number
          reason?: string
          resolved_at?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "human_intervention_queue_ai_conversation_id_fkey"
            columns: ["ai_conversation_id"]
            isOneToOne: false
            referencedRelation: "ai_conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "human_intervention_queue_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "discovered_leads"
            referencedColumns: ["id"]
          },
        ]
      }
      insight_assets: {
        Row: {
          asset_type: string
          content: string | null
          created_at: string | null
          id: string
          insight_id: string
          metadata: Json | null
        }
        Insert: {
          asset_type: string
          content?: string | null
          created_at?: string | null
          id?: string
          insight_id: string
          metadata?: Json | null
        }
        Update: {
          asset_type?: string
          content?: string | null
          created_at?: string | null
          id?: string
          insight_id?: string
          metadata?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "insight_assets_insight_id_fkey"
            columns: ["insight_id"]
            isOneToOne: false
            referencedRelation: "insights"
            referencedColumns: ["id"]
          },
        ]
      }
      insight_runs: {
        Row: {
          completed_at: string | null
          created_at: string | null
          error_message: string | null
          id: string
          metadata: Json | null
          source_type: string | null
          status: string
          trigger_type: string | null
        }
        Insert: {
          completed_at?: string | null
          created_at?: string | null
          error_message?: string | null
          id?: string
          metadata?: Json | null
          source_type?: string | null
          status?: string
          trigger_type?: string | null
        }
        Update: {
          completed_at?: string | null
          created_at?: string | null
          error_message?: string | null
          id?: string
          metadata?: Json | null
          source_type?: string | null
          status?: string
          trigger_type?: string | null
        }
        Relationships: []
      }
      insight_variants: {
        Row: {
          body: string | null
          created_at: string | null
          cta: string | null
          id: string
          insight_id: string
          metadata: Json | null
          status: string
          title: string | null
          updated_at: string | null
          variant_type: string
        }
        Insert: {
          body?: string | null
          created_at?: string | null
          cta?: string | null
          id?: string
          insight_id: string
          metadata?: Json | null
          status?: string
          title?: string | null
          updated_at?: string | null
          variant_type: string
        }
        Update: {
          body?: string | null
          created_at?: string | null
          cta?: string | null
          id?: string
          insight_id?: string
          metadata?: Json | null
          status?: string
          title?: string | null
          updated_at?: string | null
          variant_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "insight_variants_insight_id_fkey"
            columns: ["insight_id"]
            isOneToOne: false
            referencedRelation: "insights"
            referencedColumns: ["id"]
          },
        ]
      }
      insights: {
        Row: {
          authority_score: number | null
          content: string | null
          created_at: string | null
          excerpt: string | null
          facebook_text: string | null
          id: string
          lead_id: string | null
          linkedin_text: string | null
          published_at: string | null
          reading_time: number | null
          shareability_score: number | null
          slug: string
          status: string | null
          title: string
          topics: string[] | null
          twitter_text: string | null
        }
        Insert: {
          authority_score?: number | null
          content?: string | null
          created_at?: string | null
          excerpt?: string | null
          facebook_text?: string | null
          id?: string
          lead_id?: string | null
          linkedin_text?: string | null
          published_at?: string | null
          reading_time?: number | null
          shareability_score?: number | null
          slug: string
          status?: string | null
          title: string
          topics?: string[] | null
          twitter_text?: string | null
        }
        Update: {
          authority_score?: number | null
          content?: string | null
          created_at?: string | null
          excerpt?: string | null
          facebook_text?: string | null
          id?: string
          lead_id?: string | null
          linkedin_text?: string | null
          published_at?: string | null
          reading_time?: number | null
          shareability_score?: number | null
          slug?: string
          status?: string | null
          title?: string
          topics?: string[] | null
          twitter_text?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "insights_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "discovered_leads"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_channels: {
        Row: {
          channel_id: string
          contact_value: string | null
          created_at: string
          id: string
          last_engaged_at: string | null
          lead_id: string
          open_rate: number | null
          opt_out: boolean
          response_rate: number | null
          updated_at: string
        }
        Insert: {
          channel_id: string
          contact_value?: string | null
          created_at?: string
          id?: string
          last_engaged_at?: string | null
          lead_id: string
          open_rate?: number | null
          opt_out?: boolean
          response_rate?: number | null
          updated_at?: string
        }
        Update: {
          channel_id?: string
          contact_value?: string | null
          created_at?: string
          id?: string
          last_engaged_at?: string | null
          lead_id?: string
          open_rate?: number | null
          opt_out?: boolean
          response_rate?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "lead_channels_channel_id_fkey"
            columns: ["channel_id"]
            isOneToOne: false
            referencedRelation: "channels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_channels_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "discovered_leads"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_engagement: {
        Row: {
          auto_close_amount: number | null
          auto_close_at: string | null
          auto_close_eligible: boolean | null
          auto_close_status: string | null
          calculation_id: string | null
          created_at: string | null
          current_step: number | null
          emails_opened: number | null
          id: string
          last_email_sent: string | null
          lead_id: string | null
          links_clicked: number | null
          next_email_at: string | null
          sequence_id: string | null
          status: string | null
        }
        Insert: {
          auto_close_amount?: number | null
          auto_close_at?: string | null
          auto_close_eligible?: boolean | null
          auto_close_status?: string | null
          calculation_id?: string | null
          created_at?: string | null
          current_step?: number | null
          emails_opened?: number | null
          id?: string
          last_email_sent?: string | null
          lead_id?: string | null
          links_clicked?: number | null
          next_email_at?: string | null
          sequence_id?: string | null
          status?: string | null
        }
        Update: {
          auto_close_amount?: number | null
          auto_close_at?: string | null
          auto_close_eligible?: boolean | null
          auto_close_status?: string | null
          calculation_id?: string | null
          created_at?: string | null
          current_step?: number | null
          emails_opened?: number | null
          id?: string
          last_email_sent?: string | null
          lead_id?: string | null
          links_clicked?: number | null
          next_email_at?: string | null
          sequence_id?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lead_engagement_calculation_id_fkey"
            columns: ["calculation_id"]
            isOneToOne: false
            referencedRelation: "calculations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_engagement_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "discovered_leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_engagement_sequence_id_fkey"
            columns: ["sequence_id"]
            isOneToOne: false
            referencedRelation: "email_sequences"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_followup: {
        Row: {
          created_at: string | null
          lead_id: string
          status: string | null
          template_ids: string[] | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          lead_id: string
          status?: string | null
          template_ids?: string[] | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          lead_id?: string
          status?: string | null
          template_ids?: string[] | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lead_followup_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: true
            referencedRelation: "discovered_leads"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_sources: {
        Row: {
          config: Json | null
          created_at: string | null
          fuel_type: string[] | null
          id: string
          is_active: boolean | null
          last_run: string | null
          name: string
          type: string | null
        }
        Insert: {
          config?: Json | null
          created_at?: string | null
          fuel_type?: string[] | null
          id?: string
          is_active?: boolean | null
          last_run?: string | null
          name: string
          type?: string | null
        }
        Update: {
          config?: Json | null
          created_at?: string | null
          fuel_type?: string[] | null
          id?: string
          is_active?: boolean | null
          last_run?: string | null
          name?: string
          type?: string | null
        }
        Relationships: []
      }
      leads: {
        Row: {
          agent_id: string | null
          agent_percentage: number | null
          assigned_agent: string | null
          bill_id: string | null
          bill_url: string
          city: string | null
          commission_rate: number | null
          contract_term_months: number | null
          created_at: string | null
          email: string | null
          estimated_monthly_profit: number | null
          first_name: string | null
          id: string
          last_name: string | null
          lifetime_value: number | null
          monthly_usage: number | null
          notes: string | null
          phone: string | null
          product_type: string | null
          state: string | null
          status: string | null
        }
        Insert: {
          agent_id?: string | null
          agent_percentage?: number | null
          assigned_agent?: string | null
          bill_id?: string | null
          bill_url?: string
          city?: string | null
          commission_rate?: number | null
          contract_term_months?: number | null
          created_at?: string | null
          email?: string | null
          estimated_monthly_profit?: number | null
          first_name?: string | null
          id?: string
          last_name?: string | null
          lifetime_value?: number | null
          monthly_usage?: number | null
          notes?: string | null
          phone?: string | null
          product_type?: string | null
          state?: string | null
          status?: string | null
        }
        Update: {
          agent_id?: string | null
          agent_percentage?: number | null
          assigned_agent?: string | null
          bill_id?: string | null
          bill_url?: string
          city?: string | null
          commission_rate?: number | null
          contract_term_months?: number | null
          created_at?: string | null
          email?: string | null
          estimated_monthly_profit?: number | null
          first_name?: string | null
          id?: string
          last_name?: string | null
          lifetime_value?: number | null
          monthly_usage?: number | null
          notes?: string | null
          phone?: string | null
          product_type?: string | null
          state?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "leads_bill_fk"
            columns: ["bill_id"]
            isOneToOne: false
            referencedRelation: "bills"
            referencedColumns: ["id"]
          },
        ]
      }
      lpl_escalation_candidates: {
        Row: {
          created_at: string | null
          deal_id: string | null
          escalation_status: string | null
          id: string
          metadata: Json | null
          readiness_score: number | null
        }
        Insert: {
          created_at?: string | null
          deal_id?: string | null
          escalation_status?: string | null
          id?: string
          metadata?: Json | null
          readiness_score?: number | null
        }
        Update: {
          created_at?: string | null
          deal_id?: string | null
          escalation_status?: string | null
          id?: string
          metadata?: Json | null
          readiness_score?: number | null
        }
        Relationships: []
      }
      market_prices: {
        Row: {
          created_at: string
          delivery_date: string
          id: string
          market_index: string | null
          price: number
          price_type: string
          recorded_at: string
          region: string
          source: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          delivery_date: string
          id?: string
          market_index?: string | null
          price: number
          price_type: string
          recorded_at?: string
          region: string
          source?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          delivery_date?: string
          id?: string
          market_index?: string | null
          price?: number
          price_type?: string
          recorded_at?: string
          region?: string
          source?: string
          updated_at?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          brief_url: string | null
          created_at: string | null
          id: string
          lead_id: string | null
          message: string
          read: boolean | null
          title: string
          type: string
        }
        Insert: {
          brief_url?: string | null
          created_at?: string | null
          id?: string
          lead_id?: string | null
          message: string
          read?: boolean | null
          title: string
          type: string
        }
        Update: {
          brief_url?: string | null
          created_at?: string | null
          id?: string
          lead_id?: string | null
          message?: string
          read?: boolean | null
          title?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "discovered_leads"
            referencedColumns: ["id"]
          },
        ]
      }
      operator_brief_events: {
        Row: {
          created_at: string
          deal_id: string
          event_status: string
          event_summary: string | null
          event_title: string
          event_type: string
          id: string
          metadata: Json
          operator_brief_id: string | null
          triggered_by: string
        }
        Insert: {
          created_at?: string
          deal_id: string
          event_status?: string
          event_summary?: string | null
          event_title: string
          event_type: string
          id?: string
          metadata?: Json
          operator_brief_id?: string | null
          triggered_by?: string
        }
        Update: {
          created_at?: string
          deal_id?: string
          event_status?: string
          event_summary?: string | null
          event_title?: string
          event_type?: string
          id?: string
          metadata?: Json
          operator_brief_id?: string | null
          triggered_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "operator_brief_events_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "operator_brief_events_operator_brief_id_fkey"
            columns: ["operator_brief_id"]
            isOneToOne: false
            referencedRelation: "operator_briefs"
            referencedColumns: ["id"]
          },
        ]
      }
      operator_briefs: {
        Row: {
          brief_status: string
          brief_title: string
          brief_type: string
          compensation_recommendation: string | null
          created_at: string
          current_posture: string
          deal_id: string
          delegation_recommendation: string | null
          disclosure_recommendation: string | null
          epc_recommendation: string | null
          executive_summary: string
          id: string
          metadata: Json
          money_path_summary: string | null
          next_best_action: string | null
          operator_workload_level: string
          risk_summary: string | null
          updated_at: string
        }
        Insert: {
          brief_status?: string
          brief_title: string
          brief_type?: string
          compensation_recommendation?: string | null
          created_at?: string
          current_posture: string
          deal_id: string
          delegation_recommendation?: string | null
          disclosure_recommendation?: string | null
          epc_recommendation?: string | null
          executive_summary: string
          id?: string
          metadata?: Json
          money_path_summary?: string | null
          next_best_action?: string | null
          operator_workload_level?: string
          risk_summary?: string | null
          updated_at?: string
        }
        Update: {
          brief_status?: string
          brief_title?: string
          brief_type?: string
          compensation_recommendation?: string | null
          created_at?: string
          current_posture?: string
          deal_id?: string
          delegation_recommendation?: string | null
          disclosure_recommendation?: string | null
          epc_recommendation?: string | null
          executive_summary?: string
          id?: string
          metadata?: Json
          money_path_summary?: string | null
          next_best_action?: string | null
          operator_workload_level?: string
          risk_summary?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "operator_briefs_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
        ]
      }
      operator_saved_views: {
        Row: {
          created_at: string
          created_by: string | null
          filter_payload: Json
          id: string
          is_system_view: boolean
          updated_at: string
          view_description: string | null
          view_name: string
          view_scope: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          filter_payload?: Json
          id?: string
          is_system_view?: boolean
          updated_at?: string
          view_description?: string | null
          view_name: string
          view_scope: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          filter_payload?: Json
          id?: string
          is_system_view?: boolean
          updated_at?: string
          view_description?: string | null
          view_name?: string
          view_scope?: string
        }
        Relationships: []
      }
      payout_enforcement_events: {
        Row: {
          claim_id: string
          claim_type: string
          created_at: string
          deal_id: string
          enforcement_reason: string
          enforcement_severity: number
          enforcement_status: string
          escalation_owner: string | null
          id: string
          metadata: Json
          recommended_action: string
          resolved_at: string | null
        }
        Insert: {
          claim_id: string
          claim_type: string
          created_at?: string
          deal_id: string
          enforcement_reason: string
          enforcement_severity?: number
          enforcement_status?: string
          escalation_owner?: string | null
          id?: string
          metadata?: Json
          recommended_action: string
          resolved_at?: string | null
        }
        Update: {
          claim_id?: string
          claim_type?: string
          created_at?: string
          deal_id?: string
          enforcement_reason?: string
          enforcement_severity?: number
          enforcement_status?: string
          escalation_owner?: string | null
          id?: string
          metadata?: Json
          recommended_action?: string
          resolved_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payout_enforcement_events_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
        ]
      }
      pipeline_communications: {
        Row: {
          body: string
          channel: string
          communication_type: string
          created_at: string
          generated_from: string | null
          id: string
          metadata: Json
          pipeline_id: string
          recipient_email: string | null
          recipient_name: string | null
          related_entity_id: string | null
          related_entity_type: string | null
          sent_at: string | null
          status: string
          subject: string
          updated_at: string
        }
        Insert: {
          body: string
          channel?: string
          communication_type: string
          created_at?: string
          generated_from?: string | null
          id?: string
          metadata?: Json
          pipeline_id: string
          recipient_email?: string | null
          recipient_name?: string | null
          related_entity_id?: string | null
          related_entity_type?: string | null
          sent_at?: string | null
          status?: string
          subject: string
          updated_at?: string
        }
        Update: {
          body?: string
          channel?: string
          communication_type?: string
          created_at?: string
          generated_from?: string | null
          id?: string
          metadata?: Json
          pipeline_id?: string
          recipient_email?: string | null
          recipient_name?: string | null
          related_entity_id?: string | null
          related_entity_type?: string | null
          sent_at?: string | null
          status?: string
          subject?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pipeline_communications_pipeline_id_fkey"
            columns: ["pipeline_id"]
            isOneToOne: false
            referencedRelation: "deal_pipeline"
            referencedColumns: ["id"]
          },
        ]
      }
      pipeline_objections: {
        Row: {
          created_at: string
          customer_tone: string | null
          generated_rebuttals: Json
          id: string
          objection_category: string
          objection_text: string
          pipeline_id: string
          selected_rebuttal: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          customer_tone?: string | null
          generated_rebuttals?: Json
          id?: string
          objection_category?: string
          objection_text: string
          pipeline_id: string
          selected_rebuttal?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          customer_tone?: string | null
          generated_rebuttals?: Json
          id?: string
          objection_category?: string
          objection_text?: string
          pipeline_id?: string
          selected_rebuttal?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pipeline_objections_pipeline_id_fkey"
            columns: ["pipeline_id"]
            isOneToOne: false
            referencedRelation: "deal_pipeline"
            referencedColumns: ["id"]
          },
        ]
      }
      pipeline_proposals: {
        Row: {
          created_at: string
          id: string
          pipeline_id: string
          pricing_quote_id: string
          proposal_payload: Json
          selected_message: string | null
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          pipeline_id: string
          pricing_quote_id: string
          proposal_payload?: Json
          selected_message?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          pipeline_id?: string
          pricing_quote_id?: string
          proposal_payload?: Json
          selected_message?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pipeline_proposals_pipeline_id_fkey"
            columns: ["pipeline_id"]
            isOneToOne: false
            referencedRelation: "deal_pipeline"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pipeline_proposals_pricing_quote_id_fkey"
            columns: ["pricing_quote_id"]
            isOneToOne: false
            referencedRelation: "pricing_quotes"
            referencedColumns: ["id"]
          },
        ]
      }
      portfolio_release_decisions: {
        Row: {
          created_at: string | null
          deal_id: string | null
          decision_reason: string | null
          decision_type: string | null
          id: string
          metadata: Json | null
        }
        Insert: {
          created_at?: string | null
          deal_id?: string | null
          decision_reason?: string | null
          decision_type?: string | null
          id?: string
          metadata?: Json | null
        }
        Update: {
          created_at?: string | null
          deal_id?: string | null
          decision_reason?: string | null
          decision_type?: string | null
          id?: string
          metadata?: Json | null
        }
        Relationships: []
      }
      portfolio_rollup_queue: {
        Row: {
          aggregation_reason: string
          aggregation_score: number
          assigned_cluster_key: string | null
          created_at: string
          deal_id: string
          hold_status: string
          id: string
          metadata: Json
          minimum_cluster_target: number
          release_reason: string | null
          released_to_execution: boolean
          rollup_lane: string
          state: string | null
          updated_at: string
        }
        Insert: {
          aggregation_reason: string
          aggregation_score: number
          assigned_cluster_key?: string | null
          created_at?: string
          deal_id: string
          hold_status?: string
          id?: string
          metadata?: Json
          minimum_cluster_target: number
          release_reason?: string | null
          released_to_execution?: boolean
          rollup_lane: string
          state?: string | null
          updated_at?: string
        }
        Update: {
          aggregation_reason?: string
          aggregation_score?: number
          assigned_cluster_key?: string | null
          created_at?: string
          deal_id?: string
          hold_status?: string
          id?: string
          metadata?: Json
          minimum_cluster_target?: number
          release_reason?: string | null
          released_to_execution?: boolean
          rollup_lane?: string
          state?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "portfolio_rollup_queue_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: true
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
        ]
      }
      pricing_quotes: {
        Row: {
          commission_estimate: number | null
          commodity: string | null
          created_at: string
          estimated_annual_savings: number | null
          estimated_monthly_savings: number | null
          external_quote_id: string | null
          id: string
          metadata: Json
          pipeline_id: string
          pricing_request_id: string
          quote_payload: Json
          rate: number | null
          rate_unit: string | null
          received_at: string
          selected_at: string | null
          status: Database["public"]["Enums"]["quote_status"]
          supplier_name: string
          term_months: number | null
          updated_at: string
          utility_name: string | null
          valid_until: string | null
        }
        Insert: {
          commission_estimate?: number | null
          commodity?: string | null
          created_at?: string
          estimated_annual_savings?: number | null
          estimated_monthly_savings?: number | null
          external_quote_id?: string | null
          id?: string
          metadata?: Json
          pipeline_id: string
          pricing_request_id: string
          quote_payload?: Json
          rate?: number | null
          rate_unit?: string | null
          received_at?: string
          selected_at?: string | null
          status?: Database["public"]["Enums"]["quote_status"]
          supplier_name: string
          term_months?: number | null
          updated_at?: string
          utility_name?: string | null
          valid_until?: string | null
        }
        Update: {
          commission_estimate?: number | null
          commodity?: string | null
          created_at?: string
          estimated_annual_savings?: number | null
          estimated_monthly_savings?: number | null
          external_quote_id?: string | null
          id?: string
          metadata?: Json
          pipeline_id?: string
          pricing_request_id?: string
          quote_payload?: Json
          rate?: number | null
          rate_unit?: string | null
          received_at?: string
          selected_at?: string | null
          status?: Database["public"]["Enums"]["quote_status"]
          supplier_name?: string
          term_months?: number | null
          updated_at?: string
          utility_name?: string | null
          valid_until?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pricing_quotes_pipeline_id_fkey"
            columns: ["pipeline_id"]
            isOneToOne: false
            referencedRelation: "deal_pipeline"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pricing_quotes_pricing_request_id_fkey"
            columns: ["pricing_request_id"]
            isOneToOne: false
            referencedRelation: "pricing_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      pricing_request_executions: {
        Row: {
          created_at: string
          execution_payload: Json
          execution_status: string
          external_reference: string | null
          id: string
          last_follow_up_at: string | null
          operator_notes: string | null
          pipeline_id: string
          pricing_request_id: string
          recipient_company: string | null
          recipient_email: string | null
          recipient_name: string | null
          response_due_at: string | null
          response_received_at: string | null
          send_method: string
          sent_at: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          execution_payload?: Json
          execution_status: string
          external_reference?: string | null
          id?: string
          last_follow_up_at?: string | null
          operator_notes?: string | null
          pipeline_id: string
          pricing_request_id: string
          recipient_company?: string | null
          recipient_email?: string | null
          recipient_name?: string | null
          response_due_at?: string | null
          response_received_at?: string | null
          send_method: string
          sent_at?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          execution_payload?: Json
          execution_status?: string
          external_reference?: string | null
          id?: string
          last_follow_up_at?: string | null
          operator_notes?: string | null
          pipeline_id?: string
          pricing_request_id?: string
          recipient_company?: string | null
          recipient_email?: string | null
          recipient_name?: string | null
          response_due_at?: string | null
          response_received_at?: string | null
          send_method?: string
          sent_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pricing_request_executions_pipeline_id_fkey"
            columns: ["pipeline_id"]
            isOneToOne: false
            referencedRelation: "deal_pipeline"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pricing_request_executions_pricing_request_id_fkey"
            columns: ["pricing_request_id"]
            isOneToOne: false
            referencedRelation: "pricing_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      pricing_requests: {
        Row: {
          commodity: string | null
          completed_at: string | null
          created_at: string
          failure_reason: string | null
          id: string
          pipeline_id: string
          request_payload: Json
          request_source: string
          requested_load_zone: string | null
          requested_term_months: number | null
          requested_usage: number | null
          status: Database["public"]["Enums"]["pricing_request_status"]
          submitted_at: string | null
          supplier_name: string | null
          updated_at: string
          utility_name: string | null
        }
        Insert: {
          commodity?: string | null
          completed_at?: string | null
          created_at?: string
          failure_reason?: string | null
          id?: string
          pipeline_id: string
          request_payload?: Json
          request_source?: string
          requested_load_zone?: string | null
          requested_term_months?: number | null
          requested_usage?: number | null
          status?: Database["public"]["Enums"]["pricing_request_status"]
          submitted_at?: string | null
          supplier_name?: string | null
          updated_at?: string
          utility_name?: string | null
        }
        Update: {
          commodity?: string | null
          completed_at?: string | null
          created_at?: string
          failure_reason?: string | null
          id?: string
          pipeline_id?: string
          request_payload?: Json
          request_source?: string
          requested_load_zone?: string | null
          requested_term_months?: number | null
          requested_usage?: number | null
          status?: Database["public"]["Enums"]["pricing_request_status"]
          submitted_at?: string | null
          supplier_name?: string | null
          updated_at?: string
          utility_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pricing_requests_pipeline_id_fkey"
            columns: ["pipeline_id"]
            isOneToOne: false
            referencedRelation: "deal_pipeline"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          active: boolean | null
          base_price: number | null
          category: string | null
          created_at: string | null
          description: string | null
          external_id: string | null
          id: string
          name: string | null
        }
        Insert: {
          active?: boolean | null
          base_price?: number | null
          category?: string | null
          created_at?: string | null
          description?: string | null
          external_id?: string | null
          id?: string
          name?: string | null
        }
        Update: {
          active?: boolean | null
          base_price?: number | null
          category?: string | null
          created_at?: string | null
          description?: string | null
          external_id?: string | null
          id?: string
          name?: string | null
        }
        Relationships: []
      }
      proposals: {
        Row: {
          accepted_at: string | null
          commission: number | null
          created_at: string | null
          estimated_savings: number | null
          id: string
          lead_id: string | null
          proposal_type: string | null
          sent_at: string | null
          status: string | null
          viewed_at: string | null
        }
        Insert: {
          accepted_at?: string | null
          commission?: number | null
          created_at?: string | null
          estimated_savings?: number | null
          id?: string
          lead_id?: string | null
          proposal_type?: string | null
          sent_at?: string | null
          status?: string | null
          viewed_at?: string | null
        }
        Update: {
          accepted_at?: string | null
          commission?: number | null
          created_at?: string | null
          estimated_savings?: number | null
          id?: string
          lead_id?: string | null
          proposal_type?: string | null
          sent_at?: string | null
          status?: string | null
          viewed_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "proposals_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "discovered_leads"
            referencedColumns: ["id"]
          },
        ]
      }
      public_pricing_intakes: {
        Row: {
          average_monthly_bill: number | null
          average_monthly_usage: number | null
          commodity: string
          company_name: string | null
          contact_name: string | null
          created_at: string
          email: string
          id: string
          metadata: Json
          notes: string | null
          phone: string | null
          provider: string
          source: string
          state: string | null
          status: string
          updated_at: string
          utility: string | null
          widget_type: string
          zip_code: string | null
        }
        Insert: {
          average_monthly_bill?: number | null
          average_monthly_usage?: number | null
          commodity?: string
          company_name?: string | null
          contact_name?: string | null
          created_at?: string
          email: string
          id?: string
          metadata?: Json
          notes?: string | null
          phone?: string | null
          provider?: string
          source?: string
          state?: string | null
          status?: string
          updated_at?: string
          utility?: string | null
          widget_type?: string
          zip_code?: string | null
        }
        Update: {
          average_monthly_bill?: number | null
          average_monthly_usage?: number | null
          commodity?: string
          company_name?: string | null
          contact_name?: string | null
          created_at?: string
          email?: string
          id?: string
          metadata?: Json
          notes?: string | null
          phone?: string | null
          provider?: string
          source?: string
          state?: string | null
          status?: string
          updated_at?: string
          utility?: string | null
          widget_type?: string
          zip_code?: string | null
        }
        Relationships: []
      }
      rate_alerts: {
        Row: {
          alert_date: string
          alert_type: string
          created_at: string
          id: string
          lead_id: string
          new_rate: number | null
          old_rate: number | null
          savings_impact: number | null
          sent_at: string | null
          updated_at: string
          viewed: boolean
        }
        Insert: {
          alert_date?: string
          alert_type: string
          created_at?: string
          id?: string
          lead_id: string
          new_rate?: number | null
          old_rate?: number | null
          savings_impact?: number | null
          sent_at?: string | null
          updated_at?: string
          viewed?: boolean
        }
        Update: {
          alert_date?: string
          alert_type?: string
          created_at?: string
          id?: string
          lead_id?: string
          new_rate?: number | null
          old_rate?: number | null
          savings_impact?: number | null
          sent_at?: string | null
          updated_at?: string
          viewed?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "rate_alerts_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "discovered_leads"
            referencedColumns: ["id"]
          },
        ]
      }
      referral_fee_claims: {
        Row: {
          acknowledgment_status: string
          claim_status: string
          compensation_term_id: string | null
          created_at: string
          deal_id: string
          expected_fee: number | null
          fee_currency: string
          id: string
          metadata: Json
          notes: string | null
          payment_trigger: string
          referral_party: string
          referred_counterparty: string | null
          updated_at: string
        }
        Insert: {
          acknowledgment_status?: string
          claim_status?: string
          compensation_term_id?: string | null
          created_at?: string
          deal_id: string
          expected_fee?: number | null
          fee_currency?: string
          id?: string
          metadata?: Json
          notes?: string | null
          payment_trigger: string
          referral_party: string
          referred_counterparty?: string | null
          updated_at?: string
        }
        Update: {
          acknowledgment_status?: string
          claim_status?: string
          compensation_term_id?: string | null
          created_at?: string
          deal_id?: string
          expected_fee?: number | null
          fee_currency?: string
          id?: string
          metadata?: Json
          notes?: string | null
          payment_trigger?: string
          referral_party?: string
          referred_counterparty?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "referral_fee_claims_compensation_term_id_fkey"
            columns: ["compensation_term_id"]
            isOneToOne: false
            referencedRelation: "compensation_terms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "referral_fee_claims_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
        ]
      }
      retained_right_events: {
        Row: {
          counterparty_identifier: string | null
          created_at: string
          deal_id: string
          id: string
          metadata: Json
          notes: string | null
          protected_until: string | null
          right_status: string
          right_summary: string
          right_type: string
        }
        Insert: {
          counterparty_identifier?: string | null
          created_at?: string
          deal_id: string
          id?: string
          metadata?: Json
          notes?: string | null
          protected_until?: string | null
          right_status?: string
          right_summary: string
          right_type: string
        }
        Update: {
          counterparty_identifier?: string | null
          created_at?: string
          deal_id?: string
          id?: string
          metadata?: Json
          notes?: string | null
          protected_until?: string | null
          right_status?: string
          right_summary?: string
          right_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "retained_right_events_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
        ]
      }
      scraper_jobs: {
        Row: {
          city: string
          completed_at: string | null
          created_at: string | null
          error: string | null
          id: string
          industries: string[] | null
          leads_found: number | null
          source_id: string | null
          started_at: string | null
          state: string
          status: string | null
        }
        Insert: {
          city: string
          completed_at?: string | null
          created_at?: string | null
          error?: string | null
          id?: string
          industries?: string[] | null
          leads_found?: number | null
          source_id?: string | null
          started_at?: string | null
          state: string
          status?: string | null
        }
        Update: {
          city?: string
          completed_at?: string | null
          created_at?: string | null
          error?: string | null
          id?: string
          industries?: string[] | null
          leads_found?: number | null
          source_id?: string | null
          started_at?: string | null
          state?: string
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "scraper_jobs_source_id_fkey"
            columns: ["source_id"]
            isOneToOne: false
            referencedRelation: "lead_sources"
            referencedColumns: ["id"]
          },
        ]
      }
      sequence_steps: {
        Row: {
          created_at: string | null
          delay_days: number | null
          id: string
          is_auto_close: boolean | null
          max_auto_close_amount: number | null
          sequence_id: string | null
          step_number: number
          subject: string | null
          template: string | null
        }
        Insert: {
          created_at?: string | null
          delay_days?: number | null
          id?: string
          is_auto_close?: boolean | null
          max_auto_close_amount?: number | null
          sequence_id?: string | null
          step_number: number
          subject?: string | null
          template?: string | null
        }
        Update: {
          created_at?: string | null
          delay_days?: number | null
          id?: string
          is_auto_close?: boolean | null
          max_auto_close_amount?: number | null
          sequence_id?: string | null
          step_number?: number
          subject?: string | null
          template?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sequence_steps_sequence_id_fkey"
            columns: ["sequence_id"]
            isOneToOne: false
            referencedRelation: "email_sequences"
            referencedColumns: ["id"]
          },
        ]
      }
      service_catalog: {
        Row: {
          annual_price: number | null
          bundle_discount: number
          category: string
          commission_rate: number
          commission_type: string
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          monthly_price: number | null
          name: string
          provider: string | null
          provider_service_id: string | null
          setup_fee: number | null
          synergy_score: number
          target_employee_max: number | null
          target_employee_min: number | null
          target_energy_spend_min: number | null
          target_industries: string[] | null
          target_locations_min: number | null
          updated_at: string
        }
        Insert: {
          annual_price?: number | null
          bundle_discount?: number
          category: string
          commission_rate?: number
          commission_type?: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          monthly_price?: number | null
          name: string
          provider?: string | null
          provider_service_id?: string | null
          setup_fee?: number | null
          synergy_score?: number
          target_employee_max?: number | null
          target_employee_min?: number | null
          target_energy_spend_min?: number | null
          target_industries?: string[] | null
          target_locations_min?: number | null
          updated_at?: string
        }
        Update: {
          annual_price?: number | null
          bundle_discount?: number
          category?: string
          commission_rate?: number
          commission_type?: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          monthly_price?: number | null
          name?: string
          provider?: string | null
          provider_service_id?: string | null
          setup_fee?: number | null
          synergy_score?: number
          target_employee_max?: number | null
          target_employee_min?: number | null
          target_energy_spend_min?: number | null
          target_industries?: string[] | null
          target_locations_min?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      social_posts: {
        Row: {
          content: string
          created_at: string | null
          engagement_score: number | null
          id: string
          insight_id: string | null
          platform: string | null
          post_url: string | null
          posted_at: string | null
        }
        Insert: {
          content: string
          created_at?: string | null
          engagement_score?: number | null
          id?: string
          insight_id?: string | null
          platform?: string | null
          post_url?: string | null
          posted_at?: string | null
        }
        Update: {
          content?: string
          created_at?: string | null
          engagement_score?: number | null
          id?: string
          insight_id?: string | null
          platform?: string | null
          post_url?: string | null
          posted_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "social_posts_insight_id_fkey"
            columns: ["insight_id"]
            isOneToOne: false
            referencedRelation: "insights"
            referencedColumns: ["id"]
          },
        ]
      }
      subscriptions: {
        Row: {
          account_id: string | null
          created_at: string | null
          end_date: string | null
          id: string
          margin: number | null
          monthly_revenue: number | null
          product_id: string | null
          start_date: string | null
          status: string | null
        }
        Insert: {
          account_id?: string | null
          created_at?: string | null
          end_date?: string | null
          id?: string
          margin?: number | null
          monthly_revenue?: number | null
          product_id?: string | null
          start_date?: string | null
          status?: string | null
        }
        Update: {
          account_id?: string | null
          created_at?: string | null
          end_date?: string | null
          id?: string
          margin?: number | null
          monthly_revenue?: number | null
          product_id?: string | null
          start_date?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscriptions_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      success_fee_claims: {
        Row: {
          claim_status: string
          compensation_term_id: string | null
          counterparty_identifier: string | null
          created_at: string
          deal_id: string
          expected_success_fee: number | null
          fee_currency: string
          id: string
          metadata: Json
          notes: string | null
          success_event: string
          success_fee_basis: string
          updated_at: string
        }
        Insert: {
          claim_status?: string
          compensation_term_id?: string | null
          counterparty_identifier?: string | null
          created_at?: string
          deal_id: string
          expected_success_fee?: number | null
          fee_currency?: string
          id?: string
          metadata?: Json
          notes?: string | null
          success_event: string
          success_fee_basis: string
          updated_at?: string
        }
        Update: {
          claim_status?: string
          compensation_term_id?: string | null
          counterparty_identifier?: string | null
          created_at?: string
          deal_id?: string
          expected_success_fee?: number | null
          fee_currency?: string
          id?: string
          metadata?: Json
          notes?: string | null
          success_event?: string
          success_fee_basis?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "success_fee_claims_compensation_term_id_fkey"
            columns: ["compensation_term_id"]
            isOneToOne: false
            referencedRelation: "compensation_terms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "success_fee_claims_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
        ]
      }
      supplier_capabilities: {
        Row: {
          api_supported: boolean
          commodity: string | null
          created_at: string
          enrollment_supported: boolean
          id: string
          metadata: Json
          notes: string | null
          portal_supported: boolean
          pricing_supported: boolean
          supplier_id: string
          updated_at: string
          widget_supported: boolean
        }
        Insert: {
          api_supported?: boolean
          commodity?: string | null
          created_at?: string
          enrollment_supported?: boolean
          id?: string
          metadata?: Json
          notes?: string | null
          portal_supported?: boolean
          pricing_supported?: boolean
          supplier_id: string
          updated_at?: string
          widget_supported?: boolean
        }
        Update: {
          api_supported?: boolean
          commodity?: string | null
          created_at?: string
          enrollment_supported?: boolean
          id?: string
          metadata?: Json
          notes?: string | null
          portal_supported?: boolean
          pricing_supported?: boolean
          supplier_id?: string
          updated_at?: string
          widget_supported?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "supplier_capabilities_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      supplier_commissions: {
        Row: {
          commission_rate: number | null
          commission_type: string
          created_at: string
          effective_date: string
          expiration_date: string | null
          id: string
          is_active: boolean
          supplier_id: string
          term_12_months: number | null
          term_24_months: number | null
          term_36_months: number | null
          term_48_months: number | null
          term_60_months: number | null
          tier_max_volume: number | null
          tier_min_volume: number | null
          updated_at: string
        }
        Insert: {
          commission_rate?: number | null
          commission_type: string
          created_at?: string
          effective_date?: string
          expiration_date?: string | null
          id?: string
          is_active?: boolean
          supplier_id: string
          term_12_months?: number | null
          term_24_months?: number | null
          term_36_months?: number | null
          term_48_months?: number | null
          term_60_months?: number | null
          tier_max_volume?: number | null
          tier_min_volume?: number | null
          updated_at?: string
        }
        Update: {
          commission_rate?: number | null
          commission_type?: string
          created_at?: string
          effective_date?: string
          expiration_date?: string | null
          id?: string
          is_active?: boolean
          supplier_id?: string
          term_12_months?: number | null
          term_24_months?: number | null
          term_36_months?: number | null
          term_48_months?: number | null
          term_60_months?: number | null
          tier_max_volume?: number | null
          tier_min_volume?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "supplier_commissions_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      supplier_inbound_requests: {
        Row: {
          created_at: string
          id: string
          notes: string | null
          payload: Json
          pipeline_id: string | null
          request_status: string
          request_type: string
          supplier_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          notes?: string | null
          payload?: Json
          pipeline_id?: string | null
          request_status?: string
          request_type: string
          supplier_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          notes?: string | null
          payload?: Json
          pipeline_id?: string | null
          request_status?: string
          request_type?: string
          supplier_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "supplier_inbound_requests_pipeline_id_fkey"
            columns: ["pipeline_id"]
            isOneToOne: false
            referencedRelation: "deal_pipeline"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplier_inbound_requests_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      supplier_integrations: {
        Row: {
          api_base_url: string | null
          auth_type: string | null
          created_at: string
          enrollment_supported: boolean
          id: string
          integration_mode: string
          metadata: Json
          pricing_supported: boolean
          provider_key: string
          status: string
          supplier_name: string
          updated_at: string
          widget_url: string | null
        }
        Insert: {
          api_base_url?: string | null
          auth_type?: string | null
          created_at?: string
          enrollment_supported?: boolean
          id?: string
          integration_mode: string
          metadata?: Json
          pricing_supported?: boolean
          provider_key: string
          status?: string
          supplier_name: string
          updated_at?: string
          widget_url?: string | null
        }
        Update: {
          api_base_url?: string | null
          auth_type?: string | null
          created_at?: string
          enrollment_supported?: boolean
          id?: string
          integration_mode?: string
          metadata?: Json
          pricing_supported?: boolean
          provider_key?: string
          status?: string
          supplier_name?: string
          updated_at?: string
          widget_url?: string | null
        }
        Relationships: []
      }
      supplier_rates: {
        Row: {
          business_type_id: number | null
          created_at: string | null
          expires_at: string | null
          fixed_rate: number | null
          id: string
          is_active: boolean | null
          max_offer_mwh: number | null
          min_offer_mwh: number | null
          supplier_id: string | null
          term_months: number | null
          variable_discount: number | null
        }
        Insert: {
          business_type_id?: number | null
          created_at?: string | null
          expires_at?: string | null
          fixed_rate?: number | null
          id?: string
          is_active?: boolean | null
          max_offer_mwh?: number | null
          min_offer_mwh?: number | null
          supplier_id?: string | null
          term_months?: number | null
          variable_discount?: number | null
        }
        Update: {
          business_type_id?: number | null
          created_at?: string | null
          expires_at?: string | null
          fixed_rate?: number | null
          id?: string
          is_active?: boolean | null
          max_offer_mwh?: number | null
          min_offer_mwh?: number | null
          supplier_id?: string | null
          term_months?: number | null
          variable_discount?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "supplier_rates_business_type_id_fkey"
            columns: ["business_type_id"]
            isOneToOne: false
            referencedRelation: "business_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplier_rates_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      supplier_rates_live: {
        Row: {
          business_type_id: number | null
          created_at: string
          effective_date: string
          expiration_date: string | null
          fixed_rate: number | null
          id: string
          is_active: boolean
          market_index: string | null
          region: string
          scraped_at: string
          source: string
          supplier_id: string
          term_months: number | null
          updated_at: string
          variable_discount: number | null
          volatility_score: number | null
        }
        Insert: {
          business_type_id?: number | null
          created_at?: string
          effective_date: string
          expiration_date?: string | null
          fixed_rate?: number | null
          id?: string
          is_active?: boolean
          market_index?: string | null
          region: string
          scraped_at?: string
          source?: string
          supplier_id: string
          term_months?: number | null
          updated_at?: string
          variable_discount?: number | null
          volatility_score?: number | null
        }
        Update: {
          business_type_id?: number | null
          created_at?: string
          effective_date?: string
          expiration_date?: string | null
          fixed_rate?: number | null
          id?: string
          is_active?: boolean
          market_index?: string | null
          region?: string
          scraped_at?: string
          source?: string
          supplier_id?: string
          term_months?: number | null
          updated_at?: string
          variable_discount?: number | null
          volatility_score?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "supplier_rates_live_business_type_id_fkey"
            columns: ["business_type_id"]
            isOneToOne: false
            referencedRelation: "business_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplier_rates_live_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      supplier_response_events: {
        Row: {
          confidence_signal: number | null
          created_at: string
          deal_id: string
          id: string
          metadata: Json
          notes: string | null
          objections: Json
          requested_changes: Json
          response_speed_hours: number | null
          response_status: string
          response_summary: string | null
          response_type: string
          supplier_sequence_id: string
        }
        Insert: {
          confidence_signal?: number | null
          created_at?: string
          deal_id: string
          id?: string
          metadata?: Json
          notes?: string | null
          objections?: Json
          requested_changes?: Json
          response_speed_hours?: number | null
          response_status?: string
          response_summary?: string | null
          response_type: string
          supplier_sequence_id: string
        }
        Update: {
          confidence_signal?: number | null
          created_at?: string
          deal_id?: string
          id?: string
          metadata?: Json
          notes?: string | null
          objections?: Json
          requested_changes?: Json
          response_speed_hours?: number | null
          response_status?: string
          response_summary?: string | null
          response_type?: string
          supplier_sequence_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "supplier_response_events_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplier_response_events_supplier_sequence_id_fkey"
            columns: ["supplier_sequence_id"]
            isOneToOne: false
            referencedRelation: "supplier_sequence_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      supplier_routing_action_events: {
        Row: {
          action_reason: string
          action_source: string
          action_status: string
          action_type: string
          created_at: string
          deal_id: string
          id: string
          metadata: Json
          notes: string | null
          supplier_sequence_id: string | null
          target_supplier_entity_id: string | null
        }
        Insert: {
          action_reason: string
          action_source?: string
          action_status?: string
          action_type: string
          created_at?: string
          deal_id: string
          id?: string
          metadata?: Json
          notes?: string | null
          supplier_sequence_id?: string | null
          target_supplier_entity_id?: string | null
        }
        Update: {
          action_reason?: string
          action_source?: string
          action_status?: string
          action_type?: string
          created_at?: string
          deal_id?: string
          id?: string
          metadata?: Json
          notes?: string | null
          supplier_sequence_id?: string | null
          target_supplier_entity_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "supplier_routing_action_events_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplier_routing_action_events_supplier_sequence_id_fkey"
            columns: ["supplier_sequence_id"]
            isOneToOne: false
            referencedRelation: "supplier_sequence_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      supplier_sequence_plans: {
        Row: {
          created_at: string | null
          deal_id: string
          hold_reason: string | null
          id: string
          is_primary: boolean | null
          metadata: Json | null
          package_audience:
            | Database["public"]["Enums"]["deal_package_audience"]
            | null
          sequence_position: number | null
          sequence_type:
            | Database["public"]["Enums"]["supplier_sequence_type"]
            | null
          supplier_entity_id: string | null
          visibility_tier:
            | Database["public"]["Enums"]["deal_disclosure_tier"]
            | null
        }
        Insert: {
          created_at?: string | null
          deal_id: string
          hold_reason?: string | null
          id?: string
          is_primary?: boolean | null
          metadata?: Json | null
          package_audience?:
            | Database["public"]["Enums"]["deal_package_audience"]
            | null
          sequence_position?: number | null
          sequence_type?:
            | Database["public"]["Enums"]["supplier_sequence_type"]
            | null
          supplier_entity_id?: string | null
          visibility_tier?:
            | Database["public"]["Enums"]["deal_disclosure_tier"]
            | null
        }
        Update: {
          created_at?: string | null
          deal_id?: string
          hold_reason?: string | null
          id?: string
          is_primary?: boolean | null
          metadata?: Json | null
          package_audience?:
            | Database["public"]["Enums"]["deal_package_audience"]
            | null
          sequence_position?: number | null
          sequence_type?:
            | Database["public"]["Enums"]["supplier_sequence_type"]
            | null
          supplier_entity_id?: string | null
          visibility_tier?:
            | Database["public"]["Enums"]["deal_disclosure_tier"]
            | null
        }
        Relationships: []
      }
      suppliers: {
        Row: {
          capabilities: Json
          commodity_types: Json
          company_name: string
          contact_email: string | null
          contact_name: string
          contact_phone: string | null
          created_at: string | null
          credit_rating: string | null
          email: string
          id: string
          is_active: boolean | null
          max_volume_mwh: number | null
          metadata: Json
          min_volume_mwh: number | null
          notes: string | null
          phone: string | null
          portal_status: string
          service_states: Json
          status: string
          supplier_class: string
          supplier_entity_id: string | null
          supplier_name: string | null
          territories: string[] | null
          updated_at: string | null
          user_id: string | null
          utilities: Json
        }
        Insert: {
          capabilities?: Json
          commodity_types?: Json
          company_name: string
          contact_email?: string | null
          contact_name: string
          contact_phone?: string | null
          created_at?: string | null
          credit_rating?: string | null
          email: string
          id?: string
          is_active?: boolean | null
          max_volume_mwh?: number | null
          metadata?: Json
          min_volume_mwh?: number | null
          notes?: string | null
          phone?: string | null
          portal_status?: string
          service_states?: Json
          status?: string
          supplier_class?: string
          supplier_entity_id?: string | null
          supplier_name?: string | null
          territories?: string[] | null
          updated_at?: string | null
          user_id?: string | null
          utilities?: Json
        }
        Update: {
          capabilities?: Json
          commodity_types?: Json
          company_name?: string
          contact_email?: string | null
          contact_name?: string
          contact_phone?: string | null
          created_at?: string | null
          credit_rating?: string | null
          email?: string
          id?: string
          is_active?: boolean | null
          max_volume_mwh?: number | null
          metadata?: Json
          min_volume_mwh?: number | null
          notes?: string | null
          phone?: string | null
          portal_status?: string
          service_states?: Json
          status?: string
          supplier_class?: string
          supplier_entity_id?: string | null
          supplier_name?: string | null
          territories?: string[] | null
          updated_at?: string | null
          user_id?: string | null
          utilities?: Json
        }
        Relationships: []
      }
      system_activity: {
        Row: {
          activity_type: string
          created_at: string | null
          details: Json | null
          id: string
          lead_id: string | null
        }
        Insert: {
          activity_type: string
          created_at?: string | null
          details?: Json | null
          id?: string
          lead_id?: string | null
        }
        Update: {
          activity_type?: string
          created_at?: string | null
          details?: Json | null
          id?: string
          lead_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "system_activity_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "discovered_leads"
            referencedColumns: ["id"]
          },
        ]
      }
      team_members: {
        Row: {
          created_at: string | null
          id: string
          role: string
          team_id: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          role: string
          team_id?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: string
          team_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "team_members_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      teams: {
        Row: {
          created_at: string | null
          id: string
          name: string
          owner_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          name: string
          owner_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          name?: string
          owner_id?: string | null
        }
        Relationships: []
      }
      topics: {
        Row: {
          id: number
          name: string
          post_count: number | null
          slug: string
        }
        Insert: {
          id?: number
          name: string
          post_count?: number | null
          slug: string
        }
        Update: {
          id?: number
          name?: string
          post_count?: number | null
          slug?: string
        }
        Relationships: []
      }
      winning_patterns: {
        Row: {
          confidence_score: number | null
          created_at: string | null
          id: string
          is_active: boolean | null
          last_used_at: string | null
          max_lead_score: number | null
          min_lead_score: number | null
          objection_type: string
          pattern_text: string
          recommended_response: string
          success_rate: number | null
          target_industries: string[] | null
          times_applied: number | null
        }
        Insert: {
          confidence_score?: number | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          last_used_at?: string | null
          max_lead_score?: number | null
          min_lead_score?: number | null
          objection_type: string
          pattern_text: string
          recommended_response: string
          success_rate?: number | null
          target_industries?: string[] | null
          times_applied?: number | null
        }
        Update: {
          confidence_score?: number | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          last_used_at?: string | null
          max_lead_score?: number | null
          min_lead_score?: number | null
          objection_type?: string
          pattern_text?: string
          recommended_response?: string
          success_rate?: number | null
          target_industries?: string[] | null
          times_applied?: number | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      complete_event_queue_item: {
        Args: { p_details?: Json; p_event_id: string; p_result?: string }
        Returns: {
          conversation_id: string | null
          created_at: string | null
          dedupe_key: string | null
          event_data: Json
          event_type: string
          id: string
          last_error: string | null
          lead_id: string | null
          lease_expires_at: string | null
          max_retries: number
          priority: number
          processed_at: string | null
          processing_started_at: string | null
          processor_id: string | null
          retry_count: number
          scheduled_for: string | null
          status: string
          triggered_at: string | null
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "event_queue"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      dequeue_event_queue: {
        Args: {
          p_batch_size?: number
          p_lease_seconds?: number
          p_processor_id: string
        }
        Returns: {
          conversation_id: string | null
          created_at: string | null
          dedupe_key: string | null
          event_data: Json
          event_type: string
          id: string
          last_error: string | null
          lead_id: string | null
          lease_expires_at: string | null
          max_retries: number
          priority: number
          processed_at: string | null
          processing_started_at: string | null
          processor_id: string | null
          retry_count: number
          scheduled_for: string | null
          status: string
          triggered_at: string | null
          updated_at: string
        }[]
        SetofOptions: {
          from: "*"
          to: "event_queue"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      fail_event_queue_item: {
        Args: {
          p_backoff_seconds?: number
          p_details?: Json
          p_error: string
          p_event_id: string
        }
        Returns: {
          conversation_id: string | null
          created_at: string | null
          dedupe_key: string | null
          event_data: Json
          event_type: string
          id: string
          last_error: string | null
          lead_id: string | null
          lease_expires_at: string | null
          max_retries: number
          priority: number
          processed_at: string | null
          processing_started_at: string | null
          processor_id: string | null
          retry_count: number
          scheduled_for: string | null
          status: string
          triggered_at: string | null
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "event_queue"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      find_suppliers_by_territory: {
        Args: {
          p_annual_mwh: number
          p_business_type_id: number
          p_state: string
        }
        Returns: {
          company_name: string
          contact_name: string
          distance_score: number
          email: string
          overall_score: number
          phone: string
          rate_score: number
          supplier_id: string
        }[]
      }
      get_best_rate_for_deal: {
        Args: {
          p_annual_mwh: number
          p_business_type_id: number
          p_supplier_id: string
        }
        Returns: {
          expires_at: string
          rate: number
          term_months: number
        }[]
      }
      increment: {
        Args: { column_name: string; row_id: string }
        Returns: undefined
      }
      increment_engagement: {
        Args: { p_event_type: string; p_lead_id: string }
        Returns: undefined
      }
      increment_message_count: { Args: { row_id: string }; Returns: undefined }
      increment_pattern_usage: {
        Args: { pattern_id: string }
        Returns: undefined
      }
      is_valid_distribution_transition: {
        Args: { new_status: string; old_status: string }
        Returns: boolean
      }
      is_valid_editorial_transition: {
        Args: { new_status: string; old_status: string }
        Returns: boolean
      }
      requeue_expired_event_leases: { Args: never; Returns: number }
    }
    Enums: {
      compensation_attachment_status:
        | "not_defined"
        | "preliminary"
        | "internally_attached"
        | "externally_committed"
        | "review_required"
      contract_outcome_status: "won" | "lost" | "cancelled"
      deal_blocker_type:
        | "missing_required_docs"
        | "insufficient_package_quality"
        | "counterparty_risk_flag"
        | "strategic_hold"
      deal_disclosure_tier:
        | "tier_0_internal"
        | "tier_1_teaser"
        | "tier_2_qualified"
        | "tier_3_execution"
        | "tier_4_premium"
      deal_package_audience:
        | "internal"
        | "supplier_teaser"
        | "supplier_qualified"
        | "epc"
        | "lpl"
        | "buyer"
        | "negotiation"
        | "execution"
      deal_queue_type:
        | "intake"
        | "qualification"
        | "packaging"
        | "supplier_routing"
        | "pricing"
        | "execution"
        | "escalation"
        | "review"
        | "stalled"
      deal_task_status:
        | "pending"
        | "in_progress"
        | "completed"
        | "blocked"
        | "cancelled"
      deal_task_type: "operator" | "ai" | "system" | "supervisory"
      deal_wait_state:
        | "waiting_for_supplier_response"
        | "waiting_for_cluster_rollup"
        | "waiting_for_internal_review"
      economic_stack_type:
        | "direct_execution"
        | "aggregation"
        | "infrastructure"
        | "premium_escalation"
        | "advisory_led"
      enrollment_status:
        | "pending"
        | "submitted"
        | "accepted"
        | "rejected"
        | "failed"
        | "in_review"
      pipeline_stage:
        | "lead"
        | "qualified"
        | "pricing_requested"
        | "quoted"
        | "enrollment_submitted"
        | "won"
        | "lost"
      pricing_request_status:
        | "pending"
        | "submitted"
        | "completed"
        | "failed"
        | "cancelled"
      quote_status: "received" | "selected" | "expired" | "rejected"
      supplier_sequence_type:
        | "sequential_waterfall"
        | "fallback_only"
        | "premium_first_look"
        | "hold_until_ready"
        | "do_not_show_yet"
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
      compensation_attachment_status: [
        "not_defined",
        "preliminary",
        "internally_attached",
        "externally_committed",
        "review_required",
      ],
      contract_outcome_status: ["won", "lost", "cancelled"],
      deal_blocker_type: [
        "missing_required_docs",
        "insufficient_package_quality",
        "counterparty_risk_flag",
        "strategic_hold",
      ],
      deal_disclosure_tier: [
        "tier_0_internal",
        "tier_1_teaser",
        "tier_2_qualified",
        "tier_3_execution",
        "tier_4_premium",
      ],
      deal_package_audience: [
        "internal",
        "supplier_teaser",
        "supplier_qualified",
        "epc",
        "lpl",
        "buyer",
        "negotiation",
        "execution",
      ],
      deal_queue_type: [
        "intake",
        "qualification",
        "packaging",
        "supplier_routing",
        "pricing",
        "execution",
        "escalation",
        "review",
        "stalled",
      ],
      deal_task_status: [
        "pending",
        "in_progress",
        "completed",
        "blocked",
        "cancelled",
      ],
      deal_task_type: ["operator", "ai", "system", "supervisory"],
      deal_wait_state: [
        "waiting_for_supplier_response",
        "waiting_for_cluster_rollup",
        "waiting_for_internal_review",
      ],
      economic_stack_type: [
        "direct_execution",
        "aggregation",
        "infrastructure",
        "premium_escalation",
        "advisory_led",
      ],
      enrollment_status: [
        "pending",
        "submitted",
        "accepted",
        "rejected",
        "failed",
        "in_review",
      ],
      pipeline_stage: [
        "lead",
        "qualified",
        "pricing_requested",
        "quoted",
        "enrollment_submitted",
        "won",
        "lost",
      ],
      pricing_request_status: [
        "pending",
        "submitted",
        "completed",
        "failed",
        "cancelled",
      ],
      quote_status: ["received", "selected", "expired", "rejected"],
      supplier_sequence_type: [
        "sequential_waterfall",
        "fallback_only",
        "premium_first_look",
        "hold_until_ready",
        "do_not_show_yet",
      ],
    },
  },
} as const
