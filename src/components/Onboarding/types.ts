
export interface Task {
  id: string;
  title: string;
  description: string;
  route: string;
  isCompleted: boolean;
  requiredTask?: string;
}

export interface Profile {
  id: string;
  completed_onboarding_tasks: string[];
  is_onboarded: boolean;
}
