import { useCallback, useEffect, useState } from 'react'

export interface Client {
    id: string
  name: string
  phone: string | null
  email: string | null
  address: string | null
  notes: string | null
  created_at: string
  project_count: number
}

export interface ClientInput {
name: string
  phone?: string
  email?: string
  address?: string
  notes?: string
}

export function useClients() {

    const [clients, setClients] = useState<Client[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError]       = useState<string | null>(null)
const refresh = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await window.api.clients.getAll()
      if (res.success) {
        setClients(res.data ?? [])
      } else {
        setError(res.error ?? 'Failed to load clients')
      }
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [])


  const search = useCallback(async (query:string)=>{
    console.log(query);
    
    if (!query.trim()) { refresh(); return }
    try {
      const res = await window.api.clients.search(query)
      if (res.success) setClients(res.data ?? [])
    } catch (err: any) {
      setError(err.message)
    }
  }, [refresh])

    // ── Create ─────────────────────────────────────────────────
  // Returns the created client so the form can close confidently,
  // or returns an error string if something went wrong.
  const createClient = useCallback(async (input: ClientInput): Promise<string | null> => {
    const res = await window.api.clients.create(input)
    if (res.success) {
      // Prepend to list — newest first, no re-fetch needed
      setClients(prev => [{ ...res.data, project_count: 0 }, ...prev])
      return null // null = no error
    }
    return res.error ?? 'Failed to create client'
  }, [])

  // ── Update ─────────────────────────────────────────────────
  const updateClient = useCallback(async (id: string, input: ClientInput): Promise<string | null> => {
    const res = await window.api.clients.update(id, input)
    if (res.success) {
      setClients(prev => prev.map(c => c.id === id ? { ...c, ...res.data } : c))
      return null
    }
    return res.error ?? 'Failed to update client'
  }, [])

  // ── Delete ─────────────────────────────────────────────────
  const deleteClient = useCallback(async (id: string): Promise<string | null> => {
    const res = await window.api.clients.delete(id)
    if (res.success) {
      setClients(prev => prev.filter(c => c.id !== id))
      return null
    }
    return res.error ?? 'Failed to delete client'
  }, [])

  useEffect(() => { refresh() }, [refresh])

    return { clients, loading, error, search, refresh, createClient, updateClient, deleteClient }
}

