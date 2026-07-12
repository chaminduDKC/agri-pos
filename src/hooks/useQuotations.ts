// src/hooks/useQuotations.ts
import { useState, useEffect, useCallback } from 'react'
import { toast } from 'react-toastify'

export interface QuotationItem {
  id: string
  quotation_id: string
  item_id: string | null
  item_name: string
  quantity: number
  unit_price: number
  labor_cost: number
  line_total: number
}

export interface Quotation {
  id: string
  client_id: string
  client_name: string
  project_id: string | null
  project_title: string | null
  created_by: string
  status: 'draft' | 'sent' | 'approved' | 'rejected'
  total_amount: number
  valid_until: string | null
  notes: string | null
  transport_installation:number
  created_at: string
}

export interface QuotationWithItems extends Quotation {
  items: QuotationItem[]
}

export interface QuotationItemInput {
  item_id?: string
  item_name: string
  quantity: number
  unit_price: number
  
}

export interface QuotationInput {
  client_id: string
  project_id?: string
  status?: string
  valid_until?: string
  notes?: string
  transport_installation: number
  items: QuotationItemInput[]
}

export function useQuotations() {
  const [quotations, setQuotations] = useState<Quotation[]>([])
  const [loading, setLoading]       = useState(true)
  const [error, setError]           = useState<string | null>(null)

  const refresh = useCallback(async () => {
    setLoading(true); setError(null)
    try {
      const res = await window.api.quotations.getAll()
      console.log(res.data)
      if (res.success) setQuotations(res.data ?? [])
      else setError(res.error ?? 'Failed to load quotations')
    } catch (err: any) { setError(err.message) }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { refresh() }, [refresh])

  const search = useCallback(async (query: string) => {
    if (!query.trim()) { refresh(); return }
    const res = await window.api.quotations.search(query)
    if (res.success) setQuotations(res.data ?? [])
  }, [refresh])

  const createQuotation = useCallback(async (input: QuotationInput): Promise<string | null> => {
    const res = await window.api.quotations.create(input)
    if (res.success) { setQuotations(prev => [res.data, ...prev]); toast.success("Quotation created successfully."); return null }
    toast.error(`${res.error ?? 'Failed to create quotation'}`)
    return res.error ?? 'Failed to create quotation'
  }, [])
  
  const updateQuotation = useCallback(async (id: string, input: QuotationInput): Promise<string | null> => {
    const res = await window.api.quotations.update(id, input)
    if (res.success) { setQuotations(prev => prev.map(q => q.id === id ? res.data : q)); toast.success("Quotation updated successfully."); return null }
    toast.error(`${res.error ?? 'Failed to update quotation'}`)
    return res.error ?? 'Failed to update quotation'
  }, [])

  const updateStatus = useCallback(async (id: string, status: string): Promise<string | null> => {
    const res = await window.api.quotations.updateStatus(id, status)
    if (res.success) { setQuotations(prev => prev.map(q => q.id === id ? { ...q, status: status as any } : q)); toast.success("Status updated successfully."); return null }
    toast.error( `${res.error ?? 'Failed to update status'}`)
    return res.error ?? 'Failed to update status'
  }, [])
  
  const deleteQuotation = useCallback(async (id: string): Promise<string | null> => {
    const res = await window.api.quotations.delete(id)
    if (res.success) { setQuotations(prev => prev.filter(q => q.id !== id)); toast.success("Quotation deleted successfully."); return null }
    toast.error( `${res.error ?? 'Failed to delete quotation'}`)
    return res.error ?? 'Failed to delete quotation'
  }, [])

  return { quotations, loading, error, refresh, search, createQuotation, updateQuotation, updateStatus, deleteQuotation }
}
