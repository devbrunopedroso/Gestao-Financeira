'use client'

import { useForm } from 'react-hook-form'
import { yupResolver } from '@hookform/resolvers/yup'
import { financialAccountSchema } from '@/lib/validations'
import { FormInput } from './FormInput'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

type FormData = {
  name: string
}

export function CreateAccountForm() {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<FormData>({
    resolver: yupResolver(financialAccountSchema),
  })

  const onSubmit = async (data: FormData) => {
    setIsSubmitting(true)
    try {
      const response = await fetch('/api/accounts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      })

      if (response.ok) {
        reset()
        router.push('/accounts')
      } else {
        const error = await response.json()
        alert(`Erro: ${error.message || 'Erro ao criar conta'}`)
      }
    } catch (error) {
      console.error('Erro ao criar conta:', error)
      alert('Erro ao criar conta. Tente novamente.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="max-w-md">
      <FormInput
        label="Nome da Conta"
        register={register('name')}
        error={errors.name}
        placeholder="Ex: Conta Pessoal"
      />
      <div className="flex space-x-4">
        <button
          type="submit"
          disabled={isSubmitting}
          className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
        >
          {isSubmitting ? 'Criando...' : 'Criar Conta'}
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
