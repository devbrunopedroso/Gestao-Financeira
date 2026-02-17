import * as yup from 'yup'

// Validações para Conta Financeira
export const financialAccountSchema = yup.object({
  name: yup.string().required('Nome da conta é obrigatório').min(3, 'Nome deve ter pelo menos 3 caracteres'),
})

// Validações para Renda Fixa
export const fixedIncomeSchema = yup.object({
  amount: yup.number().required('Valor é obrigatório').positive('Valor deve ser positivo'),
  description: yup.string().optional(),
})

// Validações para Renda Extra
export const extraIncomeSchema = yup.object({
  amount: yup.number().required('Valor é obrigatório').positive('Valor deve ser positivo'),
  description: yup.string().optional(),
  month: yup.number().required('Mês é obrigatório').min(1).max(12),
  year: yup.number().required('Ano é obrigatório').min(2000),
})

// Validações para Despesa Fixa
export const fixedExpenseSchema = yup.object({
  amount: yup.number().required('Valor é obrigatório').positive('Valor deve ser positivo'),
  description: yup.string().required('Descrição é obrigatória'),
  startDate: yup.date().required('Data de início é obrigatória'),
  endDate: yup.date().nullable().optional(),
  categoryId: yup.string().optional().nullable(),
})

// Validações para Despesa Variável
export const variableExpenseSchema = yup.object({
  amount: yup.number().required('Valor é obrigatório').positive('Valor deve ser positivo'),
  description: yup.string().optional(),
  date: yup.date().required('Data é obrigatória'),
  categoryId: yup.string().optional().nullable(),
})

// Validações para Categoria
export const categorySchema = yup.object({
  name: yup.string().required('Nome da categoria é obrigatório').min(2, 'Nome deve ter pelo menos 2 caracteres'),
  description: yup.string().optional(),
  color: yup.string().optional(),
  icon: yup.string().optional(),
})

// Validações para Caixinha
export const piggyBankSchema = yup.object({
  name: yup.string().required('Nome da caixinha é obrigatório').min(3, 'Nome deve ter pelo menos 3 caracteres'),
  description: yup.string().optional(),
  targetAmount: yup.number().required('Valor objetivo é obrigatório').positive('Valor deve ser positivo'),
  endDate: yup.date().nullable().optional(),
  months: yup.number().nullable().optional().min(1),
  monthlyContribution: yup.number().nullable().optional().positive('Valor deve ser positivo'),
})

// Validações para Transação de Caixinha
export const piggyBankTransactionSchema = yup.object({
  amount: yup.number().required('Valor é obrigatório').positive('Valor deve ser positivo'),
  type: yup.string().oneOf(['DEPOSIT', 'WITHDRAWAL']).required('Tipo de transação é obrigatório'),
  description: yup.string().optional(),
  date: yup.date().required('Data é obrigatória'),
})

// Validações para Convite
export const invitationSchema = yup.object({
  email: yup.string().email('Email inválido').required('Email é obrigatório'),
  role: yup.string().oneOf(['ADMIN', 'EDITOR', 'VIEWER']).required('Permissão é obrigatória'),
})

