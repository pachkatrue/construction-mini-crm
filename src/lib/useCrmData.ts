import { useCallback, useEffect, useState } from 'react'
import { supabase } from './supabase'
import type { UserProfile } from './supabase'
import type { TaskStatus } from '../types'

export interface CrmProject {
  id: string
  name: string
  address: string
  description: string
  created_at: string
  tasksCount: number
  progress: number
}

export interface CrmTaskStatusHistory {
  id: number
  task_id: string
  old_status: TaskStatus
  new_status: TaskStatus
  comment: string | null
  changed_by: string
  changed_at: string
  actor: { full_name: string } | null
}

export interface CrmTask {
  id: string
  project_id: string
  title: string
  description: string
  assignee_id: string
  status: TaskStatus
  due_date: string | null
  priority: 'low' | 'medium' | 'high'
  assignee: { id: string; full_name: string } | null
  project: { id: string; name: string } | null
}

interface CrmData {
  projects: CrmProject[]
  tasks: CrmTask[]
  history: CrmTaskStatusHistory[]
  team: UserProfile[]
  loading: boolean
  error: string | null
  reload: () => Promise<void>
  createProject: (input: { name: string; address: string; description: string }) => Promise<void>
  createTask: (input: { project_id: string; title: string; description: string; assignee_id: string; due_date: string; priority: string }) => Promise<void>
  changeStatus: (taskId: string, status: TaskStatus, comment?: string) => Promise<void>
}

export function useCrmData(user: UserProfile | null): CrmData {
  const [projects, setProjects] = useState<CrmProject[]>([])
  const [tasks, setTasks] = useState<CrmTask[]>([])
  const [history, setHistory] = useState<CrmTaskStatusHistory[]>([])
  const [team, setTeam] = useState<UserProfile[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const reload = useCallback(async () => {
    if (!supabase || !user) {
      setProjects([])
      setTasks([])
      setHistory([])
      setTeam([])
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)
    try {
      const [projectResult, taskResult, historyResult, teamResult] = await Promise.all([
        supabase.from('projects').select('id,name,address,description,created_at').order('created_at', { ascending: false }),
        supabase.from('tasks').select('id,project_id,title,description,assignee_id,status,due_date,priority,assignee:profiles!tasks_assignee_id_fkey(id,full_name),project:projects(id,name)').order('created_at', { ascending: false }),
        supabase.from('task_status_history').select('id,task_id,old_status,new_status,comment,changed_by,changed_at,actor:profiles!task_status_history_changed_by_fkey(full_name)').order('changed_at', { ascending: false }),
        user.role === 'manager'
          ? supabase.from('profiles').select('id,full_name,role,created_at').order('full_name')
          : Promise.resolve({ data: [], error: null }),
      ])
      if (projectResult.error) throw projectResult.error
      if (taskResult.error) throw taskResult.error
      if (historyResult.error) throw historyResult.error
      if (teamResult.error) throw teamResult.error

      const taskRows = (taskResult.data ?? []) as unknown as CrmTask[]
      const projectRows = projectResult.data ?? []
      setTasks(taskRows)
      setHistory((historyResult.data ?? []) as unknown as CrmTaskStatusHistory[])
      setProjects(projectRows.map(project => {
        const projectTasks = taskRows.filter(task => task.project_id === project.id)
        const accepted = projectTasks.filter(task => task.status === 'accepted').length
        return {
          ...project,
          tasksCount: projectTasks.length,
          progress: projectTasks.length ? Math.round(accepted / projectTasks.length * 100) : 0,
        }
      }))
      setTeam((teamResult.data ?? []) as UserProfile[])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось загрузить данные')
    } finally {
      setLoading(false)
    }
  }, [user?.id, user?.role])

  useEffect(() => { void reload() }, [reload])

  const createProject = useCallback(async (input: { name: string; address: string; description: string }) => {
    if (!supabase) throw new Error('Supabase не настроен')
    const { data: authData } = await supabase.auth.getUser()
    if (!authData.user) throw new Error('Необходимо войти в систему')
    const { error: insertError } = await supabase.from('projects').insert({ ...input, created_by: authData.user.id })
    if (insertError) throw insertError
    await reload()
  }, [reload])

  const createTask = useCallback(async (input: { project_id: string; title: string; description: string; assignee_id: string; due_date: string; priority: string }) => {
    if (!supabase) throw new Error('Supabase не настроен')
    const { data: authData } = await supabase.auth.getUser()
    if (!authData.user) throw new Error('Необходимо войти в систему')
    const { error: insertError } = await supabase.from('tasks').insert({
      ...input,
      due_date: input.due_date || null,
      created_by: authData.user.id,
    })
    if (insertError) throw insertError
    await reload()
  }, [reload])

  const changeStatus = useCallback(async (taskId: string, status: TaskStatus, comment?: string) => {
    if (!supabase) throw new Error('Supabase не настроен')
    const { error: updateError } = await supabase.rpc('change_task_status', {
      p_task_id: taskId,
      p_new_status: status,
      p_comment: comment ?? null,
    })
    if (updateError) throw updateError
    await reload()
  }, [reload])

  return { projects, tasks, history, team, loading, error, reload, createProject, createTask, changeStatus }
}
