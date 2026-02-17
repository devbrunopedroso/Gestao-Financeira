'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { AccountSelector } from '@/components/accounts/AccountSelector'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog'
import { Tag, Plus, Pencil, Trash2 } from 'lucide-react'

interface Category {
  id: string; name: string; description: string | null; color: string | null; icon: string | null; isDefault: boolean
}

export function CategoriesPage() {
  const [selectedAccountId, setSelectedAccountId] = useState('')
  const [defaultCategories, setDefaultCategories] = useState<Category[]>([])
  const [customCategories, setCustomCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(false)

  // Modal
  const [modalOpen, setModalOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [formName, setFormName] = useState('')
  const [formDescription, setFormDescription] = useState('')
  const [formColor, setFormColor] = useState('#3b82f6')
  const [formIcon, setFormIcon] = useState('')
  const [saving, setSaving] = useState(false)

  const fetchCategories = useCallback(async () => {
    if (!selectedAccountId) return
    setLoading(true)
    try {
      const res = await fetch(`/api/categories?accountId=${selectedAccountId}`)
      if (res.ok) {
        const data = await res.json()
        setDefaultCategories(data.default || [])
        setCustomCategories(data.custom || [])
      }
    } catch (error) {
      console.error('Erro:', error)
    } finally {
      setLoading(false)
    }
  }, [selectedAccountId])

  useEffect(() => { fetchCategories() }, [fetchCategories])

  const openCreate = () => {
    setEditingId(null)
    setFormName('')
    setFormDescription('')
    setFormColor('#3b82f6')
    setFormIcon('')
    setModalOpen(true)
  }

  const openEdit = (cat: Category) => {
    setEditingId(cat.id)
    setFormName(cat.name)
    setFormDescription(cat.description || '')
    setFormColor(cat.color || '#3b82f6')
    setFormIcon(cat.icon || '')
    setModalOpen(true)
  }

  const handleSave = async () => {
    if (!formName || formName.length < 2) return
    setSaving(true)
    try {
      const url = editingId ? `/api/categories/${editingId}` : '/api/categories'
      const method = editingId ? 'PUT' : 'POST'
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formName,
          description: formDescription || undefined,
          color: formColor,
          icon: formIcon || undefined,
          accountId: selectedAccountId,
        }),
      })
      if (res.ok) {
        setModalOpen(false)
        fetchCategories()
      }
    } catch (error) {
      console.error('Erro:', error)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Deseja excluir esta categoria?')) return
    try {
      const res = await fetch(`/api/categories/${id}`, { method: 'DELETE' })
      if (res.ok) fetchCategories()
    } catch (error) {
      console.error('Erro:', error)
    }
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-2">
            <Tag className="h-6 w-6 sm:h-7 sm:w-7 text-primary" />
            Categorias
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Organize suas despesas por categoria</p>
        </div>
        <Button onClick={openCreate} size="sm" className="gap-1">
          <Plus className="h-4 w-4" /> Nova Categoria
        </Button>
      </div>

      <AccountSelector value={selectedAccountId} onChange={setSelectedAccountId} />

      {selectedAccountId && (
        <>
          {/* Default Categories */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base sm:text-lg">Categorias Padrao</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">{[1, 2, 3, 4, 5, 6].map(i => <Skeleton key={i} className="h-12" />)}</div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
                  {defaultCategories.map((cat, i) => (
                    <div key={cat.id || i} className="flex items-center gap-2 p-3 rounded-lg border">
                      {cat.icon && <span className="text-lg">{cat.icon}</span>}
                      <span className="text-sm font-medium flex-1">{cat.name}</span>
                      {cat.color && <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: cat.color }} />}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Custom Categories */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base sm:text-lg">Categorias Personalizadas</CardTitle>
                <Button variant="ghost" size="sm" onClick={openCreate} className="gap-1 text-xs">
                  <Plus className="h-3 w-3" /> Criar
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-2">{[1, 2].map(i => <Skeleton key={i} className="h-12" />)}</div>
              ) : customCategories.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-sm text-muted-foreground">Nenhuma categoria personalizada</p>
                  <Button variant="outline" size="sm" className="mt-3 gap-1" onClick={openCreate}>
                    <Plus className="h-4 w-4" /> Criar primeira
                  </Button>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                  {customCategories.map(cat => (
                    <div key={cat.id} className="flex items-center gap-2 p-3 rounded-lg border hover:bg-accent/50 transition-colors">
                      {cat.icon && <span className="text-lg">{cat.icon}</span>}
                      <span className="text-sm font-medium flex-1">{cat.name}</span>
                      {cat.color && <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: cat.color }} />}
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(cat)}>
                        <Pencil className="h-3 w-3" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleDelete(cat.id)}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingId ? 'Editar' : 'Nova'} Categoria</DialogTitle>
            <DialogDescription>Categorias ajudam a organizar suas despesas.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Nome</Label>
              <Input placeholder="Ex: Investimentos" value={formName} onChange={(e) => setFormName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Descricao (opcional)</Label>
              <Input placeholder="Descricao da categoria" value={formDescription} onChange={(e) => setFormDescription(e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Cor</Label>
                <div className="flex gap-2 items-center">
                  <input type="color" value={formColor} onChange={(e) => setFormColor(e.target.value)} className="h-10 w-10 rounded cursor-pointer" />
                  <Input value={formColor} onChange={(e) => setFormColor(e.target.value)} className="flex-1" />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Icone (emoji)</Label>
                <Input placeholder="Ex: 💼" value={formIcon} onChange={(e) => setFormIcon(e.target.value)} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModalOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={saving || !formName}>
              {saving ? 'Salvando...' : editingId ? 'Salvar' : 'Criar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
