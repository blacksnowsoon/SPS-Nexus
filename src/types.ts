export type ProfileRole = 'tester' | 'admin'
export type ProfileStatus = 'pending' | 'active'
export type RoundStatus = 'planned' | 'active' | 'completed' | 'archived'
export type WorkflowStatus = 'open' | 'has_issues' | 'in_progress' | 'closed'
export type ExecutionStatus = 'not_tested' | 'passed' | 'failed' | 'not_applicable'

export interface Profile {
  id: string
  email: string | null
  display_name: string | null
  avatar_url: string | null
  role: ProfileRole
  status: ProfileStatus
}

export interface Project {
  id: string
  name: string
  description: string | null
}

export interface Round {
  id: string
  project_id: string
  name: string
  description: string | null
  status: RoundStatus
  created_at: string
}

export interface ScenarioCatalogItem {
  id: string
  module: string
  section: string
  title: string
  source_order: number
}

export interface RoundScenario {
  round_id: string
  scenario_id: string
  sort_order: number
  module: string
  section: string
  category: string
  source_number: number
  title: string
  description: string
  steps: string[]
  expected: string[]
  removed_at: string | null
}

export interface RoundWorkflow {
  round_id: string
  scenario_id: string
  status: WorkflowStatus
  assigned_to: string | null
  issue_summary: string | null
  updated_at: string
}

export interface ScenarioExecution {
  id: string
  round_id: string
  scenario_id: string
  user_id: string
  status: ExecutionStatus
  notes: string
  updated_at: string
}

export interface ScenarioIssue {
  id: string
  round_id: string
  scenario_id: string
  reported_by: string
  report: string
  created_at: string
}

export interface ExecutionCounts {
  total: number
  not_tested: number
  passed: number
  failed: number
  not_applicable: number
}

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: Profile & { created_at: string; updated_at: string } & Record<string, unknown>
        Insert: Partial<Profile> & { id: string } & Record<string, unknown>
        Update: Partial<Profile> & Record<string, unknown>
        Relationships: []
      }
      projects: {
        Row: Project & { created_at: string; updated_at: string } & Record<string, unknown>
        Insert: Partial<Project> & { name: string } & Record<string, unknown>
        Update: Partial<Project> & Record<string, unknown>
        Relationships: []
      }
      rounds: {
        Row: Round & { updated_at: string; completed_at: string | null; created_by: string | null } & Record<string, unknown>
        Insert: Partial<Round> & { project_id: string; name: string } & Record<string, unknown>
        Update: Partial<Round> & Record<string, unknown>
        Relationships: []
      }
      scenarios: {
        Row: Record<string, unknown> & {
          id: string
          source_order: number
          module: string
          section: string
          category: string
          source_number: number
          title: string
          description: string
          steps: string[]
          expected: string[]
          is_builtin: boolean
          created_at: string
          updated_at: string
        }
        Insert: never
        Update: never
        Relationships: []
      }
      round_scenarios: {
        Row: RoundScenario & {
          added_by: string | null
          added_at: string
          updated_by: string | null
          updated_at: string
        } & Record<string, unknown>
        Insert: Partial<RoundScenario> & Record<string, unknown>
        Update: Partial<RoundScenario> & Record<string, unknown>
        Relationships: []
      }
      round_scenario_workflows: {
        Row: RoundWorkflow & {
          created_at: string
          closed_at: string | null
          updated_by: string | null
        } & Record<string, unknown>
        Insert: never
        Update: never
        Relationships: []
      }
      scenario_executions: {
        Row: ScenarioExecution & { created_at: string } & Record<string, unknown>
        Insert: Partial<ScenarioExecution> & {
          round_id: string
          scenario_id: string
          user_id: string
        } & Record<string, unknown>
        Update: Partial<ScenarioExecution> & Record<string, unknown>
        Relationships: []
      }
      scenario_issues: {
        Row: ScenarioIssue & { updated_at: string } & Record<string, unknown>
        Insert: never
        Update: never
        Relationships: []
      }
    }
    Views: Record<string, never>
    Functions: {
      admin_create_round: {
        Args: { p_name: string; p_description?: string | null; p_scenario_ids?: string[] | null }
        Returns: string
      }
      admin_set_round_status: {
        Args: { p_round_id: string; p_status: RoundStatus }
        Returns: undefined
      }
      admin_update_round_scenario: {
        Args: {
          p_round_id: string
          p_scenario_id: string
          p_title: string
          p_description: string
          p_steps: string[]
          p_expected: string[]
        }
        Returns: undefined
      }
      report_scenario_issue: {
        Args: { p_round_id: string; p_scenario_id: string; p_report: string }
        Returns: string
      }
      admin_transition_round_workflow: {
        Args: {
          p_round_id: string
          p_scenario_id: string
          p_status: WorkflowStatus
          p_issue_summary?: string | null
        }
        Returns: undefined
      }
      active_member_count: {
        Args: Record<string, never>
        Returns: number
      }
    }
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}
