'use client'

import { useState, useEffect, useCallback } from 'react'

const STORAGE_KEY = 'hideValues'

function getStoredMap(): Record<string, boolean> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : {}
  } catch {
    return {}
  }
}

export function useHideValues(accountId: string) {
  const [hideValues, setHideValues] = useState(false)

  // Load from localStorage when accountId changes
  useEffect(() => {
    if (!accountId) return
    const map = getStoredMap()
    setHideValues(!!map[accountId])
  }, [accountId])

  const toggleHideValues = useCallback(() => {
    setHideValues(prev => {
      const next = !prev
      if (accountId) {
        const map = getStoredMap()
        map[accountId] = next
        localStorage.setItem(STORAGE_KEY, JSON.stringify(map))
      }
      return next
    })
  }, [accountId])

  return { hideValues, toggleHideValues }
}
