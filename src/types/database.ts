export type QuestionImportance = 'high' | 'medium' | 'low';
export type AppRole = 'admin' | 'user';

export interface Subject {
  id: string;
  name: string;
  description: string | null;
  icon: string | null;
  created_at: string;
  updated_at: string;
}

export interface Unit {
  id: string;
  subject_id: string;
  title: string;
  unit_number: number;
  description: string | null;
  created_at: string;
  updated_at: string;
}

export interface Question {
  id: string;
  unit_id: string;
  question: string;
  answer: string | null;
  importance: QuestionImportance;
  created_at: string;
  updated_at: string;
}

export interface Profile {
  id: string;
  user_id: string;
  email: string | null;
  full_name: string | null;
  created_at: string;
  updated_at: string;
}

export interface UserRole {
  id: string;
  user_id: string;
  role: AppRole;
  created_at: string;
}
