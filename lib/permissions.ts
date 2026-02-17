import { AccountRole } from './constants'

/**
 * Verifica se um usuário tem permissão para editar
 */
export function canEdit(role: AccountRole | null | undefined): boolean {
  return role === 'ADMIN' || role === 'EDITOR'
}

/**
 * Verifica se um usuário tem permissão de administrador
 */
export function isAdmin(role: AccountRole | null | undefined): boolean {
  return role === 'ADMIN'
}

/**
 * Verifica se um usuário tem permissão para visualizar
 */
export function canView(role: AccountRole | null | undefined): boolean {
  return role === 'ADMIN' || role === 'EDITOR' || role === 'VIEWER'
}

