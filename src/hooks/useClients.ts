import { useCallback, useEffect, useState } from 'react'
import { toast } from 'react-toastify'

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
      toast.error(err?.message)
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
    toast.error(err?.message)
    
  }
}, [refresh])

// ── Create ─────────────────────────────────────────────────
// Returns the created client so the form can close confidently,
// or returns an error string if something went wrong.
const createClient = useCallback(async (input: ClientInput) => {
  const res = await window.api.clients.create(input)
  if (res.success) {
    toast.success("Client created successfully")
    setClients(prev => [{ ...res.data, project_count: 0 }, ...prev])
    return {sucess:true} // null = no error
  }
  toast.error(res.error ?? "Failed to create client")
  return res.error ?? 'Failed to create client'
}, [])

// ── Update ─────────────────────────────────────────────────
const updateClient = useCallback(async (id: string, input: ClientInput) => {
  const res = await window.api.clients.update(id, input)
  if (res.success) {
    toast.success("Client updated successfully")
    setClients(prev => prev.map(c => c.id === id ? { ...c, ...res.data } : c))
    return {sucess:true}
  }
  toast.error(res.error ?? "Failed to update client")
  return res.error ?? 'Failed to update client'
}, [])

// ── Delete ─────────────────────────────────────────────────
const deleteClient = useCallback(async (id: string) => {
  const res = await window.api.clients.delete(id)
  if (res.success) {
    toast.success("Client deleted successfully")
    setClients(prev => prev.filter(c => c.id !== id))
    return {sucess:true}
  }
  toast.error(res.error ?? "Failed to delete client")
    return res.error ?? 'Failed to delete client'
  }, [])

  useEffect(() => { refresh() }, [refresh])

    return { clients, loading, error, search, refresh, createClient, updateClient, deleteClient }
}

