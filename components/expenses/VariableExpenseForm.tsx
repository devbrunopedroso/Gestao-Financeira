'use client'

import { useForm } from 'react-hook-form'
import { yupResolver } from '@hookform/resolvers/yup'
import { variableExpenseSchema } from '@/lib/validations'
import { FormInput } from '@/components/forms/FormInput'
import { FormSelect } from '@/components/forms/FormSelect'
import { AccountSelector } from '@/components/accounts/AccountSelector'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

type FormData = {
  accountId: string
  amount: number
  description?: string
  date: string
  categoryId?: string
}

export function VariableExpenseForm() {
  const router = useRouter()
  const [selectedAccountId, setSelectedAccountId] = useState<string>('')
  const [categories, setCategories] = useState<Array<{ value: string; label: string }>>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [allowContinue, setAllowContinue] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    reset,
  } = useForm<FormData>({
    resolver: yupResolver(variableExpenseSchema) as any,
    defaultValues: {
      date: new Date().toISOString().split('T')[0],
    },
  })

  useEffect(() => {
    if (selectedAccountId) {
      setValue('accountId', selectedAccountId)
      fetchCategories()
    }
  }, [selectedAccountId, setValue])

  const fetchCategories = async () => {
    if (!selectedAccountId) return

    try {
      const response = await fetch(`/api/categories?accountId=${selectedAccountId}`)
      if (response.ok) {
        const data = await response.json()
        const allCategories = [
          ...data.default.map((cat: any) => ({
            value: cat.name,
            label: `${cat.name} ${cat.icon || ''}`,
          })),
          ...data.custom.map((cat: any) => ({
            value: cat.id,
            label: cat.name,
          })),
        ]
        setCategories(allCategories)
      }
    } catch (error) {
      console.error('Erro ao buscar categorias:', error)
    }
  }

  const onSubmit = async (data: FormData) => {
    if (!selectedAccountId) {
      alert('Selecione uma conta financeira')
      return
    }

    setIsSubmitting(true)
    try {
      const payload = {
        ...data,
        accountId: selectedAccountId,
        date: new Date(data.date).toISOString(),
        categoryId: data.categoryId || null,
      }

      const response = await fetch('/api/expenses/variable', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      })

      if (response.ok) {
        if (allowContinue) {
          reset({
            accountId: selectedAccountId,
            amount: 0,
            description: '',
            date: new Date().toISOString().split('T')[0],
            categoryId: undefined,
          })
          // Mantém os campos preenchidos para lançamento rápido
        } else {
          router.push('/expenses')
        }
      } else {
        const error = await response.json()
        alert(`Erro: ${error.message || 'Erro ao lançar despesa'}`)
      }
    } catch (error) {
      console.error('Erro ao lançar despesa:', error)
      alert('Erro ao lançar despesa. Tente novamente.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div>
        <label className="block text-sm font-medium mb-2">Conta Financeira</label>
        <AccountSelector
          value={selectedAccountId}
          onChange={setSelectedAccountId}
          className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <FormInput
        label="Valor"
        type="number"
        step="0.01"
        register={register('amount', { valueAsNumber: true })}
        error={errors.amount}
        placeholder="0.00"
      />

      <FormInput
        label="Data"
        type="date"
        register={register('date')}
        error={errors.date}
      />

      <FormSelect
        label="Categoria (opcional)"
        register={register('categoryId')}
        error={errors.categoryId}
        options={categories}
        placeholder="Selecione uma categoria"
      />

      <FormInput
        label="Descrição (opcional)"
        register={register('description')}
        error={errors.description}
        placeholder="Ex: Almoço no restaurante"
      />

      <div className="flex items-center space-x-2">
        <input
          type="checkbox"
          id="continue"
          checked={allowContinue}
          onChange={(e) => setAllowContinue(e.target.checked)}
          className="w-4 h-4"
        />
        <label htmlFor="continue" className="text-sm text-gray-700">
          Continuar lançando despesas (não redirecionar após salvar)
        </label>
      </div>

      <div className="flex space-x-4">
        <button
          type="submit"
          disabled={isSubmitting || !selectedAccountId}
          className="bg-red-600 hover:bg-red-700 disabled:bg-gray-400 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
        >
          {isSubmitting ? 'Salvando...' : 'Lançar Despesa'}
        </button>
        <button
          type="button"
          onClick={() => router.back()}
          className="bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold py-3 px-6 rounded-lg transition-colors"
        >
          Cancelar
        </button>
      </div>
    </form>
  )
}




