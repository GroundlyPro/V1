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
      audit_log: {
        Row: {
          action: string
          business_id: string
          created_at: string | null
          diff: Json | null
          entity_id: string
          entity_type: string
          id: string
          ip_address: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          business_id: string
          created_at?: string | null
          diff?: Json | null
          entity_id: string
          entity_type: string
          id?: string
          ip_address?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          business_id?: string
          created_at?: string | null
          diff?: Json | null
          entity_id?: string
          entity_type?: string
          id?: string
          ip_address?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_log_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_log_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      businesses: {
        Row: {
          address: string | null
          city: string | null
          country: string | null
          created_at: string | null
          currency: string | null
          email: string | null
          id: string
          job_reminder_1h: boolean | null
          job_reminder_24h: boolean | null
          job_reminders_enabled: boolean | null
          logo_url: string | null
          name: string
          owner_id: string
          phone: string | null
          plan: string | null
          plan_status: string | null
          state: string | null
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          timezone: string | null
          trial_ends_at: string | null
          updated_at: string | null
          zip: string | null
        }
        Insert: {
          address?: string | null
          city?: string | null
          country?: string | null
          created_at?: string | null
          currency?: string | null
          email?: string | null
          id?: string
          job_reminder_1h?: boolean | null
          job_reminder_24h?: boolean | null
          job_reminders_enabled?: boolean | null
          logo_url?: string | null
          name: string
          owner_id: string
          phone?: string | null
          plan?: string | null
          plan_status?: string | null
          state?: string | null
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          timezone?: string | null
          trial_ends_at?: string | null
          updated_at?: string | null
          zip?: string | null
        }
        Update: {
          address?: string | null
          city?: string | null
          country?: string | null
          created_at?: string | null
          currency?: string | null
          email?: string | null
          id?: string
          job_reminder_1h?: boolean | null
          job_reminder_24h?: boolean | null
          job_reminders_enabled?: boolean | null
          logo_url?: string | null
          name?: string
          owner_id?: string
          phone?: string | null
          plan?: string | null
          plan_status?: string | null
          state?: string | null
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          timezone?: string | null
          trial_ends_at?: string | null
          updated_at?: string | null
          zip?: string | null
        }
        Relationships: []
      }
      chemical_treatments: {
        Row: {
          amount: string | null
          applicator_id: string | null
          business_id: string
          chemical_name: string | null
          created_at: string | null
          date: string
          id: string
          job_id: string
          notes: string | null
          treatment: string
          unit: string | null
          updated_at: string | null
        }
        Insert: {
          amount?: string | null
          applicator_id?: string | null
          business_id: string
          chemical_name?: string | null
          created_at?: string | null
          date: string
          id?: string
          job_id: string
          notes?: string | null
          treatment: string
          unit?: string | null
          updated_at?: string | null
        }
        Update: {
          amount?: string | null
          applicator_id?: string | null
          business_id?: string
          chemical_name?: string | null
          created_at?: string | null
          date?: string
          id?: string
          job_id?: string
          notes?: string | null
          treatment?: string
          unit?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "chemical_treatments_applicator_id_fkey"
            columns: ["applicator_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chemical_treatments_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chemical_treatments_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      client_addresses: {
        Row: {
          business_id: string
          city: string
          client_id: string
          country: string | null
          created_at: string | null
          id: string
          is_billing: boolean | null
          is_primary: boolean | null
          label: string | null
          lat: number | null
          lng: number | null
          state: string
          street1: string
          street2: string | null
          tax_rate_id: string | null
          updated_at: string | null
          zip: string
        }
        Insert: {
          business_id: string
          city: string
          client_id: string
          country?: string | null
          created_at?: string | null
          id?: string
          is_billing?: boolean | null
          is_primary?: boolean | null
          label?: string | null
          lat?: number | null
          lng?: number | null
          state: string
          street1: string
          street2?: string | null
          tax_rate_id?: string | null
          updated_at?: string | null
          zip: string
        }
        Update: {
          business_id?: string
          city?: string
          client_id?: string
          country?: string | null
          created_at?: string | null
          id?: string
          is_billing?: boolean | null
          is_primary?: boolean | null
          label?: string | null
          lat?: number | null
          lng?: number | null
          state?: string
          street1?: string
          street2?: string | null
          tax_rate_id?: string | null
          updated_at?: string | null
          zip?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_addresses_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_addresses_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      client_contacts: {
        Row: {
          business_id: string
          client_id: string
          created_at: string | null
          email: string | null
          id: string
          name: string
          phone: string | null
          relationship: string | null
          updated_at: string | null
        }
        Insert: {
          business_id: string
          client_id: string
          created_at?: string | null
          email?: string | null
          id?: string
          name: string
          phone?: string | null
          relationship?: string | null
          updated_at?: string | null
        }
        Update: {
          business_id?: string
          client_id?: string
          created_at?: string | null
          email?: string | null
          id?: string
          name?: string
          phone?: string | null
          relationship?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "client_contacts_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_contacts_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      clients: {
        Row: {
          balance: number | null
          business_id: string
          company_name: string | null
          created_at: string | null
          email: string | null
          first_name: string
          id: string
          last_name: string
          lead_source: string | null
          notes: string | null
          phone: string | null
          status: string
          tags: string[] | null
          type: string
          updated_at: string | null
        }
        Insert: {
          balance?: number | null
          business_id: string
          company_name?: string | null
          created_at?: string | null
          email?: string | null
          first_name: string
          id?: string
          last_name: string
          lead_source?: string | null
          notes?: string | null
          phone?: string | null
          status?: string
          tags?: string[] | null
          type?: string
          updated_at?: string | null
        }
        Update: {
          balance?: number | null
          business_id?: string
          company_name?: string | null
          created_at?: string | null
          email?: string | null
          first_name?: string
          id?: string
          last_name?: string
          lead_source?: string | null
          notes?: string | null
          phone?: string | null
          status?: string
          tags?: string[] | null
          type?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "clients_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      expenses: {
        Row: {
          amount: number | null
          business_id: string
          category: string | null
          created_at: string | null
          date: string
          description: string | null
          id: string
          item: string
          job_id: string
          receipt_url: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          amount?: number | null
          business_id: string
          category?: string | null
          created_at?: string | null
          date: string
          description?: string | null
          id?: string
          item: string
          job_id: string
          receipt_url?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          amount?: number | null
          business_id?: string
          category?: string | null
          created_at?: string | null
          date?: string
          description?: string | null
          id?: string
          item?: string
          job_id?: string
          receipt_url?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "expenses_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      invoice_line_items: {
        Row: {
          business_id: string
          created_at: string | null
          description: string | null
          id: string
          invoice_id: string
          name: string
          quantity: number | null
          sort_order: number | null
          total: number | null
          unit_price: number | null
          updated_at: string | null
        }
        Insert: {
          business_id: string
          created_at?: string | null
          description?: string | null
          id?: string
          invoice_id: string
          name: string
          quantity?: number | null
          sort_order?: number | null
          total?: number | null
          unit_price?: number | null
          updated_at?: string | null
        }
        Update: {
          business_id?: string
          created_at?: string | null
          description?: string | null
          id?: string
          invoice_id?: string
          name?: string
          quantity?: number | null
          sort_order?: number | null
          total?: number | null
          unit_price?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "invoice_line_items_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoice_line_items_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      invoices: {
        Row: {
          amount_paid: number | null
          balance: number | null
          business_id: string
          client_id: string
          created_at: string | null
          discount_amount: number | null
          due_date: string
          id: string
          invoice_number: string
          issue_date: string
          job_id: string | null
          notes: string | null
          paid_at: string | null
          payment_method: string | null
          sent_at: string | null
          status: string
          stripe_invoice_id: string | null
          subtotal: number | null
          tax_amount: number | null
          total: number | null
          updated_at: string | null
        }
        Insert: {
          amount_paid?: number | null
          balance?: number | null
          business_id: string
          client_id: string
          created_at?: string | null
          discount_amount?: number | null
          due_date: string
          id?: string
          invoice_number?: string
          issue_date?: string
          job_id?: string | null
          notes?: string | null
          paid_at?: string | null
          payment_method?: string | null
          sent_at?: string | null
          status?: string
          stripe_invoice_id?: string | null
          subtotal?: number | null
          tax_amount?: number | null
          total?: number | null
          updated_at?: string | null
        }
        Update: {
          amount_paid?: number | null
          balance?: number | null
          business_id?: string
          client_id?: string
          created_at?: string | null
          discount_amount?: number | null
          due_date?: string
          id?: string
          invoice_number?: string
          issue_date?: string
          job_id?: string | null
          notes?: string | null
          paid_at?: string | null
          payment_method?: string | null
          sent_at?: string | null
          status?: string
          stripe_invoice_id?: string | null
          subtotal?: number | null
          tax_amount?: number | null
          total?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "invoices_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      job_forms: {
        Row: {
          business_id: string
          created_at: string | null
          fields: Json | null
          id: string
          is_active: boolean | null
          name: string
          updated_at: string | null
        }
        Insert: {
          business_id: string
          created_at?: string | null
          fields?: Json | null
          id?: string
          is_active?: boolean | null
          name: string
          updated_at?: string | null
        }
        Update: {
          business_id?: string
          created_at?: string | null
          fields?: Json | null
          id?: string
          is_active?: boolean | null
          name?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "job_forms_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      job_line_items: {
        Row: {
          business_id: string
          created_at: string | null
          description: string | null
          id: string
          job_id: string
          name: string
          quantity: number | null
          service_id: string | null
          sort_order: number | null
          total: number | null
          unit_cost: number | null
          unit_price: number | null
          updated_at: string | null
        }
        Insert: {
          business_id: string
          created_at?: string | null
          description?: string | null
          id?: string
          job_id: string
          name: string
          quantity?: number | null
          service_id?: string | null
          sort_order?: number | null
          total?: number | null
          unit_cost?: number | null
          unit_price?: number | null
          updated_at?: string | null
        }
        Update: {
          business_id?: string
          created_at?: string | null
          description?: string | null
          id?: string
          job_id?: string
          name?: string
          quantity?: number | null
          service_id?: string | null
          sort_order?: number | null
          total?: number | null
          unit_cost?: number | null
          unit_price?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "job_line_items_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_line_items_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_line_items_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      job_visits: {
        Row: {
          business_id: string
          checklist_completed: boolean | null
          completed_at: string | null
          created_at: string | null
          end_time: string | null
          id: string
          instructions: string | null
          job_id: string
          scheduled_date: string | null
          start_time: string | null
          status: string
          title: string
          updated_at: string | null
        }
        Insert: {
          business_id: string
          checklist_completed?: boolean | null
          completed_at?: string | null
          created_at?: string | null
          end_time?: string | null
          id?: string
          instructions?: string | null
          job_id: string
          scheduled_date?: string | null
          start_time?: string | null
          status?: string
          title?: string
          updated_at?: string | null
        }
        Update: {
          business_id?: string
          checklist_completed?: boolean | null
          completed_at?: string | null
          created_at?: string | null
          end_time?: string | null
          id?: string
          instructions?: string | null
          job_id?: string
          scheduled_date?: string | null
          start_time?: string | null
          status?: string
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "job_visits_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_visits_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      jobs: {
        Row: {
          address_id: string | null
          auto_payments: boolean | null
          billing_type: string | null
          business_id: string
          cleaner_confirmation_sent_at: string | null
          client_id: string
          client_confirmation_sent_at: string | null
          created_at: string | null
          created_by: string | null
          end_date: string | null
          frequency: string | null
          id: string
          instructions: string | null
          internal_notes: string | null
          job_number: string
          profit: number | null
          profit_margin: number | null
          quote_id: string | null
          start_date: string | null
          status: string
          title: string
          total_cost: number | null
          total_price: number | null
          type: string
          updated_at: string | null
        }
        Insert: {
          address_id?: string | null
          auto_payments?: boolean | null
          billing_type?: string | null
          business_id: string
          cleaner_confirmation_sent_at?: string | null
          client_id: string
          client_confirmation_sent_at?: string | null
          created_at?: string | null
          created_by?: string | null
          end_date?: string | null
          frequency?: string | null
          id?: string
          instructions?: string | null
          internal_notes?: string | null
          job_number?: string
          profit?: number | null
          profit_margin?: number | null
          quote_id?: string | null
          start_date?: string | null
          status?: string
          title: string
          total_cost?: number | null
          total_price?: number | null
          type?: string
          updated_at?: string | null
        }
        Update: {
          address_id?: string | null
          auto_payments?: boolean | null
          billing_type?: string | null
          business_id?: string
          cleaner_confirmation_sent_at?: string | null
          client_id?: string
          client_confirmation_sent_at?: string | null
          created_at?: string | null
          created_by?: string | null
          end_date?: string | null
          frequency?: string | null
          id?: string
          instructions?: string | null
          internal_notes?: string | null
          job_number?: string
          profit?: number | null
          profit_margin?: number | null
          quote_id?: string | null
          start_date?: string | null
          status?: string
          title?: string
          total_cost?: number | null
          total_price?: number | null
          type?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "jobs_address_id_fkey"
            columns: ["address_id"]
            isOneToOne: false
            referencedRelation: "client_addresses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jobs_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jobs_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jobs_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jobs_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "quotes"
            referencedColumns: ["id"]
          },
        ]
      }
      labor_entries: {
        Row: {
          business_id: string
          created_at: string | null
          date: string
          end_time: string | null
          hourly_rate: number | null
          hours: number | null
          id: string
          job_id: string
          notes: string | null
          start_time: string | null
          total_cost: number | null
          updated_at: string | null
          user_id: string
          visit_id: string | null
        }
        Insert: {
          business_id: string
          created_at?: string | null
          date: string
          end_time?: string | null
          hourly_rate?: number | null
          hours?: number | null
          id?: string
          job_id: string
          notes?: string | null
          start_time?: string | null
          total_cost?: number | null
          updated_at?: string | null
          user_id: string
          visit_id?: string | null
        }
        Update: {
          business_id?: string
          created_at?: string | null
          date?: string
          end_time?: string | null
          hourly_rate?: number | null
          hours?: number | null
          id?: string
          job_id?: string
          notes?: string | null
          start_time?: string | null
          total_cost?: number | null
          updated_at?: string | null
          user_id?: string
          visit_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "labor_entries_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "labor_entries_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "labor_entries_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "labor_entries_visit_id_fkey"
            columns: ["visit_id"]
            isOneToOne: false
            referencedRelation: "job_visits"
            referencedColumns: ["id"]
          },
        ]
      }
      notes: {
        Row: {
          author_id: string | null
          body: string
          business_id: string
          created_at: string | null
          entity_id: string
          entity_type: string
          id: string
          is_pinned: boolean | null
          updated_at: string | null
        }
        Insert: {
          author_id?: string | null
          body: string
          business_id: string
          created_at?: string | null
          entity_id: string
          entity_type: string
          id?: string
          is_pinned?: boolean | null
          updated_at?: string | null
        }
        Update: {
          author_id?: string | null
          body?: string
          business_id?: string
          created_at?: string | null
          entity_id?: string
          entity_type?: string
          id?: string
          is_pinned?: boolean | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notes_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notes_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          body: string | null
          business_id: string
          created_at: string | null
          id: string
          link: string | null
          read: boolean | null
          read_at: string | null
          title: string
          type: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          body?: string | null
          business_id: string
          created_at?: string | null
          id?: string
          link?: string | null
          read?: boolean | null
          read_at?: string | null
          title: string
          type: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          body?: string | null
          business_id?: string
          created_at?: string | null
          id?: string
          link?: string | null
          read?: boolean | null
          read_at?: string | null
          title?: string
          type?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
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
      payments: {
        Row: {
          amount: number
          business_id: string
          client_id: string
          created_at: string | null
          id: string
          invoice_id: string
          method: string
          notes: string | null
          paid_at: string | null
          status: string
          stripe_payment_intent_id: string | null
          updated_at: string | null
        }
        Insert: {
          amount: number
          business_id: string
          client_id: string
          created_at?: string | null
          id?: string
          invoice_id: string
          method: string
          notes?: string | null
          paid_at?: string | null
          status?: string
          stripe_payment_intent_id?: string | null
          updated_at?: string | null
        }
        Update: {
          amount?: number
          business_id?: string
          client_id?: string
          created_at?: string | null
          id?: string
          invoice_id?: string
          method?: string
          notes?: string | null
          paid_at?: string | null
          status?: string
          stripe_payment_intent_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payments_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      quote_line_items: {
        Row: {
          business_id: string
          created_at: string | null
          description: string | null
          id: string
          name: string
          quantity: number | null
          quote_id: string
          service_id: string | null
          sort_order: number | null
          total: number | null
          unit_cost: number | null
          unit_price: number | null
          updated_at: string | null
        }
        Insert: {
          business_id: string
          created_at?: string | null
          description?: string | null
          id?: string
          name: string
          quantity?: number | null
          quote_id: string
          service_id?: string | null
          sort_order?: number | null
          total?: number | null
          unit_cost?: number | null
          unit_price?: number | null
          updated_at?: string | null
        }
        Update: {
          business_id?: string
          created_at?: string | null
          description?: string | null
          id?: string
          name?: string
          quantity?: number | null
          quote_id?: string
          service_id?: string | null
          sort_order?: number | null
          total?: number | null
          unit_cost?: number | null
          unit_price?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "quote_line_items_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quote_line_items_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "quotes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quote_line_items_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      quotes: {
        Row: {
          address_id: string | null
          approved_at: string | null
          business_id: string
          client_id: string
          created_at: string | null
          created_by: string | null
          discount_amount: number | null
          frequency: string | null
          id: string
          internal_notes: string | null
          message_to_client: string | null
          quote_number: string
          sent_at: string | null
          service_id: string | null
          status: string
          subtotal: number | null
          tax_amount: number | null
          title: string
          total: number | null
          updated_at: string | null
          valid_until: string | null
        }
        Insert: {
          address_id?: string | null
          approved_at?: string | null
          business_id: string
          client_id: string
          created_at?: string | null
          created_by?: string | null
          discount_amount?: number | null
          frequency?: string | null
          id?: string
          internal_notes?: string | null
          message_to_client?: string | null
          quote_number?: string
          sent_at?: string | null
          service_id?: string | null
          status?: string
          subtotal?: number | null
          tax_amount?: number | null
          title: string
          total?: number | null
          updated_at?: string | null
          valid_until?: string | null
        }
        Update: {
          address_id?: string | null
          approved_at?: string | null
          business_id?: string
          client_id?: string
          created_at?: string | null
          created_by?: string | null
          discount_amount?: number | null
          frequency?: string | null
          id?: string
          internal_notes?: string | null
          message_to_client?: string | null
          quote_number?: string
          sent_at?: string | null
          service_id?: string | null
          status?: string
          subtotal?: number | null
          tax_amount?: number | null
          title?: string
          total?: number | null
          updated_at?: string | null
          valid_until?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "quotes_address_id_fkey"
            columns: ["address_id"]
            isOneToOne: false
            referencedRelation: "client_addresses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotes_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotes_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotes_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotes_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      reminders: {
        Row: {
          business_id: string
          channel: string
          created_at: string | null
          entity_id: string
          entity_type: string
          id: string
          message: string
          remind_at: string
          sent: boolean | null
          sent_at: string | null
          updated_at: string | null
        }
        Insert: {
          business_id: string
          channel?: string
          created_at?: string | null
          entity_id: string
          entity_type: string
          id?: string
          message: string
          remind_at: string
          sent?: boolean | null
          sent_at?: string | null
          updated_at?: string | null
        }
        Update: {
          business_id?: string
          channel?: string
          created_at?: string | null
          entity_id?: string
          entity_type?: string
          id?: string
          message?: string
          remind_at?: string
          sent?: boolean | null
          sent_at?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reminders_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      requests: {
        Row: {
          address: string | null
          assigned_to: string | null
          business_id: string
          client_id: string | null
          converted_to_job_id: string | null
          converted_to_quote_id: string | null
          created_at: string | null
          email: string | null
          first_name: string
          id: string
          image_url: string | null
          last_name: string
          message: string | null
          phone: string | null
          reminder_at: string | null
          requested_on: string | null
          service_type: string | null
          source: string
          status: string
          updated_at: string | null
        }
        Insert: {
          address?: string | null
          assigned_to?: string | null
          business_id: string
          client_id?: string | null
          converted_to_job_id?: string | null
          converted_to_quote_id?: string | null
          created_at?: string | null
          email?: string | null
          first_name: string
          id?: string
          image_url?: string | null
          last_name: string
          message?: string | null
          phone?: string | null
          reminder_at?: string | null
          requested_on?: string | null
          service_type?: string | null
          source?: string
          status?: string
          updated_at?: string | null
        }
        Update: {
          address?: string | null
          assigned_to?: string | null
          business_id?: string
          client_id?: string | null
          converted_to_job_id?: string | null
          converted_to_quote_id?: string | null
          created_at?: string | null
          email?: string | null
          first_name?: string
          id?: string
          image_url?: string | null
          last_name?: string
          message?: string | null
          phone?: string | null
          reminder_at?: string | null
          requested_on?: string | null
          service_type?: string | null
          source?: string
          status?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "requests_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "requests_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "requests_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "requests_converted_to_job_id_fkey"
            columns: ["converted_to_job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "requests_converted_to_quote_id_fkey"
            columns: ["converted_to_quote_id"]
            isOneToOne: false
            referencedRelation: "quotes"
            referencedColumns: ["id"]
          },
        ]
      }
      service_extras: {
        Row: {
          business_id: string
          cost: number | null
          created_at: string | null
          description: string | null
          icon: string | null
          id: string
          is_active: boolean | null
          name: string
          price: number | null
          service_id: string
          updated_at: string | null
        }
        Insert: {
          business_id: string
          cost?: number | null
          created_at?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          price?: number | null
          service_id: string
          updated_at?: string | null
        }
        Update: {
          business_id?: string
          cost?: number | null
          created_at?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          price?: number | null
          service_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "service_extras_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_extras_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      services: {
        Row: {
          business_id: string
          category: string | null
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          taxable: boolean | null
          unit: string | null
          unit_cost: number | null
          unit_price: number | null
          updated_at: string | null
        }
        Insert: {
          business_id: string
          category?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          taxable?: boolean | null
          unit?: string | null
          unit_cost?: number | null
          unit_price?: number | null
          updated_at?: string | null
        }
        Update: {
          business_id?: string
          category?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          taxable?: boolean | null
          unit?: string | null
          unit_cost?: number | null
          unit_price?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "services_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      tax_rates: {
        Row: {
          business_id: string
          created_at: string | null
          id: string
          is_default: boolean | null
          name: string
          rate: number
          updated_at: string | null
        }
        Insert: {
          business_id: string
          created_at?: string | null
          id?: string
          is_default?: boolean | null
          name: string
          rate: number
          updated_at?: string | null
        }
        Update: {
          business_id?: string
          created_at?: string | null
          id?: string
          is_default?: boolean | null
          name?: string
          rate?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tax_rates_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          auth_user_id: string | null
          avatar_url: string | null
          business_id: string
          created_at: string | null
          email: string
          first_name: string
          hourly_rate: number | null
          id: string
          is_active: boolean | null
          last_name: string
          phone: string | null
          role: string
          updated_at: string | null
        }
        Insert: {
          auth_user_id?: string | null
          avatar_url?: string | null
          business_id: string
          created_at?: string | null
          email: string
          first_name: string
          hourly_rate?: number | null
          id?: string
          is_active?: boolean | null
          last_name: string
          phone?: string | null
          role?: string
          updated_at?: string | null
        }
        Update: {
          auth_user_id?: string | null
          avatar_url?: string | null
          business_id?: string
          created_at?: string | null
          email?: string
          first_name?: string
          hourly_rate?: number | null
          id?: string
          is_active?: boolean | null
          last_name?: string
          phone?: string | null
          role?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "users_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      visit_assignments: {
        Row: {
          business_id: string
          created_at: string | null
          id: string
          updated_at: string | null
          user_id: string
          visit_id: string
        }
        Insert: {
          business_id: string
          created_at?: string | null
          id?: string
          updated_at?: string | null
          user_id: string
          visit_id: string
        }
        Update: {
          business_id?: string
          created_at?: string | null
          id?: string
          updated_at?: string | null
          user_id?: string
          visit_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "visit_assignments_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "visit_assignments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "visit_assignments_visit_id_fkey"
            columns: ["visit_id"]
            isOneToOne: false
            referencedRelation: "job_visits"
            referencedColumns: ["id"]
          },
        ]
      }
      visit_form_responses: {
        Row: {
          created_at: string | null
          form_id: string
          id: string
          responses: Json | null
          submitted_at: string | null
          updated_at: string | null
          user_id: string | null
          visit_id: string
        }
        Insert: {
          created_at?: string | null
          form_id: string
          id?: string
          responses?: Json | null
          submitted_at?: string | null
          updated_at?: string | null
          user_id?: string | null
          visit_id: string
        }
        Update: {
          created_at?: string | null
          form_id?: string
          id?: string
          responses?: Json | null
          submitted_at?: string | null
          updated_at?: string | null
          user_id?: string | null
          visit_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "visit_form_responses_form_id_fkey"
            columns: ["form_id"]
            isOneToOne: false
            referencedRelation: "job_forms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "visit_form_responses_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "visit_form_responses_visit_id_fkey"
            columns: ["visit_id"]
            isOneToOne: false
            referencedRelation: "job_visits"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_my_business_id: { Args: never; Returns: string }
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
