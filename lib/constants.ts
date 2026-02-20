// Categorias padrão do sistema
export const DEFAULT_CATEGORIES = [
  { name: 'Alimentação', color: '#FF6B6B', icon: '🍔' },
  { name: 'Transporte', color: '#4ECDC4', icon: '🚗' },
  { name: 'Moradia', color: '#45B7D1', icon: '🏠' },
  { name: 'Saúde', color: '#96CEB4', icon: '🏥' },
  { name: 'Educação', color: '#FFEAA7', icon: '📚' },
  { name: 'Lazer', color: '#DDA15E', icon: '🎮' },
  { name: 'Roupas', color: '#BC6C25', icon: '👕' },
  { name: 'Contas', color: '#6C5CE7', icon: '💳' },
  { name: 'Cartão de Crédito', color: '#E17055', icon: '💳' },
  { name: 'Outros', color: '#95A5A6', icon: '📦' },
]

// Permissões de conta
export const ACCOUNT_ROLES = {
  ADMIN: 'ADMIN',
  EDITOR: 'EDITOR',
  VIEWER: 'VIEWER',
} as const

export type AccountRole = typeof ACCOUNT_ROLES[keyof typeof ACCOUNT_ROLES]

// Meses do ano
export const MONTHS = [
  'Janeiro',
  'Fevereiro',
  'Março',
  'Abril',
  'Maio',
  'Junho',
  'Julho',
  'Agosto',
  'Setembro',
  'Outubro',
  'Novembro',
  'Dezembro',
]

