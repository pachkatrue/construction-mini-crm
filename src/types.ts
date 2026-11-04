export type Role = 'manager' | 'executor'
export type TaskStatus = 'new' | 'in_progress' | 'review' | 'revision' | 'accepted'

export interface Project {
  id: string
  name: string
  address: string
  description: string
  progress: number
  tasksCount: number
}

export interface Task {
  id: string
  projectId: string
  title: string
  description: string
  assignee: string
  status: TaskStatus
  dueDate: string
  priority: 'low' | 'medium' | 'high'
}
