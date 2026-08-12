export type ActivityType = "call" | "note" | "stage_change" | "fathom_summary";
export type PaymentStatus = "pending" | "paid" | "cancelled";

export interface Database {
  public: {
    Tables: {
      contacts: {
        Row: {
          id: string;
          name: string;
          phone: string | null;
          email: string | null;
          website: string | null;
          source: string | null;
          tags: string[];
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          phone?: string | null;
          email?: string | null;
          website?: string | null;
          source?: string | null;
          tags?: string[];
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["contacts"]["Insert"]>;
        Relationships: [];
      };
      pipelines: {
        Row: {
          id: string;
          name: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["pipelines"]["Insert"]>;
        Relationships: [];
      };
      pipeline_stages: {
        Row: {
          id: string;
          pipeline_id: string;
          name: string;
          position: number;
          is_won: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          pipeline_id: string;
          name: string;
          position: number;
          is_won?: boolean;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["pipeline_stages"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "pipeline_stages_pipeline_id_fkey";
            columns: ["pipeline_id"];
            isOneToOne: false;
            referencedRelation: "pipelines";
            referencedColumns: ["id"];
          },
        ];
      };
      opportunities: {
        Row: {
          id: string;
          contact_id: string;
          pipeline_id: string;
          stage_id: string;
          value: number | null;
          campaign: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          contact_id: string;
          pipeline_id: string;
          stage_id: string;
          value?: number | null;
          campaign?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["opportunities"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "opportunities_contact_id_fkey";
            columns: ["contact_id"];
            isOneToOne: false;
            referencedRelation: "contacts";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "opportunities_pipeline_id_fkey";
            columns: ["pipeline_id"];
            isOneToOne: false;
            referencedRelation: "pipelines";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "opportunities_stage_id_fkey";
            columns: ["stage_id"];
            isOneToOne: false;
            referencedRelation: "pipeline_stages";
            referencedColumns: ["id"];
          },
        ];
      };
      activity_log: {
        Row: {
          id: string;
          contact_id: string;
          opportunity_id: string | null;
          type: ActivityType;
          content: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          contact_id: string;
          opportunity_id?: string | null;
          type: ActivityType;
          content?: string | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["activity_log"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "activity_log_contact_id_fkey";
            columns: ["contact_id"];
            isOneToOne: false;
            referencedRelation: "contacts";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "activity_log_opportunity_id_fkey";
            columns: ["opportunity_id"];
            isOneToOne: false;
            referencedRelation: "opportunities";
            referencedColumns: ["id"];
          },
        ];
      };
      payments: {
        Row: {
          id: string;
          contact_id: string;
          amount: number;
          status: PaymentStatus;
          invoice_ref: string | null;
          notes: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          contact_id: string;
          amount: number;
          status?: PaymentStatus;
          invoice_ref?: string | null;
          notes?: string | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["payments"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "payments_contact_id_fkey";
            columns: ["contact_id"];
            isOneToOne: false;
            referencedRelation: "contacts";
            referencedColumns: ["id"];
          },
        ];
      };
      tasks: {
        Row: {
          id: string;
          contact_id: string;
          title: string;
          due_at: string | null;
          done: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          contact_id: string;
          title: string;
          due_at?: string | null;
          done?: boolean;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["tasks"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "tasks_contact_id_fkey";
            columns: ["contact_id"];
            isOneToOne: false;
            referencedRelation: "contacts";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: {
      activity_type: ActivityType;
      payment_status: PaymentStatus;
    };
    CompositeTypes: Record<string, never>;
  };
}
