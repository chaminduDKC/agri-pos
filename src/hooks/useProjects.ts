// src/hooks/useProjects.ts
import { useState, useEffect, useCallback } from 'react'

export interface Project {
  id: string
  client_id: string
  client_name: string
  created_by: string
  title: string
  location: string | null
  status: 'pending' | 'active' | 'completed' | 'cancelled'
  start_date: string | null
  end_date: string | null
  notes: string | null
  created_at: string
}

export interface ProjectInput {
  client_id: string
  title: string
  no_of_sub_projects?: number
  location?: string
  status?: string
  start_date?: string
  end_date?: string
  notes?: string
}

export interface ItemInput {
  name: string
  category?: string
  unit: string
  quantity?: number
  low_stock_threshold?: number
  barcode?: string
  supplier?: string
  unit_price?: number
}


export function useProjects() {
  const [projects, setProjects]     = useState<Project[]>([])
  const [loading, setLoading]       = useState(true)
  const [error, setError]           = useState<string | null>(null)

  const refresh = useCallback(async () => {
    setLoading(true); setError(null)
    try {
      const res = await window.api.projects.getAll()
      if (res.success) setProjects(res.data ?? [])
      else setError(res.error ?? 'Failed to load projects')
    } catch (err: any) { setError(err.message) }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { refresh() }, [refresh])

  const search = useCallback(async (query: string) => {
    if (!query.trim()) { refresh(); return }
    const res = await window.api.projects.search(query)
    if (res.success) setProjects(res.data ?? [])
  }, [refresh])

  const createProject = useCallback(async (input: ProjectInput): Promise<string | null> => {
    const res = await window.api.projects.create(input)
    if (res.success) { setProjects(prev => [res.data, ...prev]); return null }
    return res.error ?? 'Failed to create project'
  }, [])

  const updateProject = useCallback(async (id: string, input: Partial<ProjectInput>): Promise<string | null> => {
    const res = await window.api.projects.update(id, input)
    if (res.success) { setProjects(prev => prev.map(p => p.id === id ? res.data : p)); return null }
    return res.error ?? 'Failed to update project'
  }, [])

  const updateStatus = useCallback(async (id: string, status: string): Promise<string | null> => {
    const res = await window.api.projects.updateStatus(id, status)
    if (res.success) { setProjects(prev => prev.map(p => p.id === id ? res.data : p)); return null }
    return res.error ?? 'Failed to update status'
  }, [])

  const deleteProject = useCallback(async (id: string): Promise<string | null> => {
    const res = await window.api.projects.delete(id)
    if (res.success) { setProjects(prev => prev.filter(p => p.id !== id)); return null }
    return res.error ?? 'Failed to delete project'
  }, [])

  return { projects, loading, error, refresh, search, createProject, updateProject, updateStatus, deleteProject }
}
