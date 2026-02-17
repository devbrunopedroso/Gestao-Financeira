# 📝 Exemplos de Uso

Este documento contém exemplos práticos de como usar o sistema de gestão financeira.

## 🔐 Autenticação

### Login com Google

O sistema já está configurado para autenticação com Google. Basta acessar `/auth/signin` e clicar em "Entrar com Google".

## 📋 Formulários com React Hook Form + Yup

### Exemplo: Criar Conta Financeira

```tsx
'use client'

import { useForm } from 'react-hook-form'
import { yupResolver } from '@hookform/resolvers/yup'
import { financialAccountSchema } from '@/lib/validations'
import { FormInput } from '@/components/forms/FormInput'

type FormData = {
  name: string
}

export function CreateAccountForm() {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({
    resolver: yupResolver(financialAccountSchema),
  })

  const onSubmit = async (data: FormData) => {
    const response = await fetch('/api/accounts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    // ... tratamento de resposta
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <FormInput
        label="Nome da Conta"
        register={register('name')}
        error={errors.name}
      />
      <button type="submit">Criar</button>
    </form>
  )
}
```

### Exemplo: Cadastrar Renda Fixa

```tsx
'use client'

import { useForm } from 'react-hook-form'
import { yupResolver } from '@hookform/resolvers/yup'
import { fixedIncomeSchema } from '@/lib/validations'
import { FormInput } from '@/components/forms/FormInput'
import { FormTextarea } from '@/components/forms/FormTextarea'

type FormData = {
  amount: number
  description?: string
}

export function FixedIncomeForm({ accountId }: { accountId: string }) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({
    resolver: yupResolver(fixedIncomeSchema),
  })

  const onSubmit = async (data: FormData) => {
    const response = await fetch('/api/incomes/fixed', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...data, accountId }),
    })
    // ... tratamento
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <FormInput
        label="Valor"
        type="number"
        step="0.01"
        register={register('amount', { valueAsNumber: true })}
        error={errors.amount}
      />
      <FormTextarea
        label="Descrição"
        register={register('description')}
        error={errors.description}
      />
      <button type="submit">Salvar</button>
    </form>
  )
}
```

### Exemplo: Cadastrar Despesa Variável

```tsx
'use client'

import { useForm } from 'react-hook-form'
import { yupResolver } from '@hookform/resolvers/yup'
import { variableExpenseSchema } from '@/lib/validations'
import { FormInput } from '@/components/forms/FormInput'
import { FormSelect } from '@/components/forms/FormSelect'

type FormData = {
  amount: number
  description?: string
  date: Date
  categoryId?: string
}

export function VariableExpenseForm({ 
  accountId, 
  categories 
}: { 
  accountId: string
  categories: Array<{ id: string; name: string }>
}) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({
    resolver: yupResolver(variableExpenseSchema),
  })

  const onSubmit = async (data: FormData) => {
    const response = await fetch('/api/expenses/variable', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...data, accountId }),
    })
    // ... tratamento
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <FormInput
        label="Valor"
        type="number"
        step="0.01"
        register={register('amount', { valueAsNumber: true })}
        error={errors.amount}
      />
      <FormInput
        label="Data"
        type="date"
        register={register('date', { valueAsDate: true })}
        error={errors.date}
      />
      <FormSelect
        label="Categoria"
        register={register('categoryId')}
        error={errors.categoryId}
        options={categories.map(cat => ({ 
          value: cat.id, 
          label: cat.name 
        }))}
        placeholder="Selecione uma categoria"
      />
      <button type="submit">Salvar</button>
    </form>
  )
}
```

## 🗄️ Uso do Prisma

### Exemplo: Buscar Contas do Usuário

```typescript
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function getUserAccounts() {
  const session = await getServerSession(authOptions)
  
  if (!session?.user?.id) {
    throw new Error('Não autorizado')
  }

  const memberships = await prisma.accountMember.findMany({
    where: { userId: session.user.id },
    include: {
      account: {
        include: {
          members: {
            include: { user: true }
          }
        }
      }
    }
  })

  return memberships.map(m => m.account)
}
```

### Exemplo: Criar Caixinha

```typescript
import { prisma } from '@/lib/prisma'

export async function createPiggyBank(data: {
  accountId: string
  name: string
  targetAmount: number
  endDate?: Date
  months?: number
}) {
  const piggyBank = await prisma.piggyBank.create({
    data: {
      name: data.name,
      targetAmount: data.targetAmount,
      accountId: data.accountId,
      endDate: data.endDate,
      months: data.months,
    }
  })

  return piggyBank
}
```

## 🎨 Helpers e Utilitários

### Formatação de Moeda

```typescript
import { formatCurrency } from '@/lib/helpers'

const value = 1234.56
console.log(formatCurrency(value)) // R$ 1.234,56
```

### Cálculo de Progresso

```typescript
import { calculateProgress } from '@/lib/helpers'

const progress = calculateProgress(500, 1000) // 50%
```

### Verificação de Permissões

```typescript
import { canEdit, isAdmin } from '@/lib/permissions'

const userRole = 'EDITOR'
if (canEdit(userRole)) {
  // Usuário pode editar
}

if (isAdmin(userRole)) {
  // Usuário é administrador
}
```

## 🔄 API Routes

### Estrutura de uma API Route

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { someSchema } from '@/lib/validations'

export async function POST(request: NextRequest) {
  try {
    // 1. Verificar autenticação
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json(
        { message: 'Não autorizado' },
        { status: 401 }
      )
    }

    // 2. Validar dados
    const body = await request.json()
    const validatedData = await someSchema.validate(body)

    // 3. Verificar permissões (se necessário)
    // ...

    // 4. Executar operação
    const result = await prisma.model.create({
      data: validatedData,
    })

    // 5. Retornar resposta
    return NextResponse.json(result, { status: 201 })
  } catch (error: any) {
    if (error.name === 'ValidationError') {
      return NextResponse.json(
        { message: error.message },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { message: 'Erro interno' },
      { status: 500 }
    )
  }
}
```

