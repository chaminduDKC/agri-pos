// src/hooks/useItems.ts
import { useState, useEffect, useCallback } from 'react'
import { toast } from 'react-toastify'

export interface Item {
  id: string
  name: string
  category: string | null
  source: string
  unit: string
  unit_size?:string
  quantity: number
  low_stock_threshold: number
  barcode: string | null
  supplier: string | null
  unit_price: number
  updated_at: string
}

export interface ItemInput {
  name: string
  source: string
  category?: string
  unit: string
  unit_size?:string
  quantity?: number
  low_stock_threshold?: number
  barcode?: string
  supplier?: string
  unit_price?: number
}

export function useItems() {
  const [items, setItems]           = useState<Item[]>([])
  const [categories, setCategories] = useState<string[]>([])
  const [loading, setLoading]       = useState(true)
  const [error, setError]           = useState<string | null>(null)

  const refresh = useCallback(async () => {
    setLoading(true); setError(null)
    try {
      const [itemsRes, catsRes] = await Promise.all([
        window.api.items.getAll(),
        window.api.items.getCategories(),
      ])
      if (itemsRes.success) setItems(itemsRes.data ?? [])
      else setError(itemsRes.error ?? 'Failed to load items')
      if (catsRes.success) setCategories(catsRes.data ?? [])
    } catch (err: any) { setError(err.message) }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { refresh() }, [refresh])

  const search = useCallback(async (query: string) => {
    if (!query.trim()) { refresh(); return }
    const res = await window.api.items.search(query)
    if (res.success) setItems(res.data ?? [])
  }, [refresh])

  const createItem = useCallback(async (input: ItemInput): Promise<string | null> => {
    const res = await window.api.items.create(input)
    if (res.success) {
      setItems(prev => [...prev, res.data].sort((a, b) => a.name.localeCompare(b.name)))
      toast.success("Item added successfully");
      if (input.category && !categories.includes(input.category))
        setCategories(prev => [...prev, input.category!].sort())
      return null
    }
    toast.error(`${res.error ?? 'Failed to add item'}`)
    return res.error ?? 'Failed to create item'
  }, [categories])
  
  const updateItem = useCallback(async (id: string, input: ItemInput): Promise<string | null> => {
    const res = await window.api.items.update(id, input)
    if (res.success) {
      toast.success("Item updated successfully");
      setItems(prev => prev.map(i => i.id === id ? res.data : i))
      return null
    }
    toast.error(`${res.error ?? 'Failed to update item'}`)
    return res.error ?? 'Failed to update item'
  }, [])
  
  const setQuantity = useCallback(async (id: string, qty: number): Promise<string | null> => {
    const res = await window.api.items.setQuantity(id, qty)
    if (res.success) {
      setItems(prev => prev.map(i => i.id === id ? res.data : i))
      return null
    }
    return res.error ?? 'Failed to update quantity'
  }, [])
  
  const deleteItem = useCallback(async (id: string): Promise<string | null> => {
    const res = await window.api.items.delete(id)
    
    if (res.success) { setItems(prev => prev.filter(i => i.id !== id)); toast.success("Item deleted successfully"); return null }
    toast.error(`${res.error ?? 'Failed to delete item'}`)
    return res.error ?? 'Failed to delete item'
  }, [])

  return { items, categories, loading, error, refresh, search, createItem, updateItem, setQuantity, deleteItem }
}
