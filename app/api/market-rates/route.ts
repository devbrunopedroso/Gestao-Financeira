import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

interface RateData {
  value: string
  date: string
}

interface CacheEntry {
  data: { selic: RateData | null; cdi: RateData | null; ipca: RateData | null }
  timestamp: number
}

let cache: CacheEntry | null = null
const CACHE_TTL = 24 * 60 * 60 * 1000 // 24 horas

const BCB_ENDPOINTS = {
  selic: 'https://api.bcb.gov.br/dados/serie/bcdata.sgs.432/dados/ultimos/1?formato=json',
  cdi: 'https://api.bcb.gov.br/dados/serie/bcdata.sgs.12/dados/ultimos/1?formato=json',
  ipca: 'https://api.bcb.gov.br/dados/serie/bcdata.sgs.433/dados/ultimos/1?formato=json',
}

async function fetchBCBRate(url: string): Promise<{ rawValue: number; date: string } | null> {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(10000) })
    if (!res.ok) return null
    const data = await res.json()
    if (Array.isArray(data) && data.length > 0) {
      return { rawValue: parseFloat(data[0].valor), date: data[0].data }
    }
    return null
  } catch {
    return null
  }
}

/**
 * Converte taxas BCB para % anual:
 * - Selic (série 432): já vem como taxa anual META
 * - CDI (série 12): taxa diária → anual: ((1 + taxa/100)^252 - 1) * 100
 * - IPCA (série 433): taxa mensal → anual: ((1 + taxa/100)^12 - 1) * 100
 */
function toAnnualRate(raw: { rawValue: number; date: string }, type: 'selic' | 'cdi' | 'ipca'): RateData {
  let annual: number
  if (type === 'selic') {
    annual = raw.rawValue // já é anual
  } else if (type === 'cdi') {
    annual = (Math.pow(1 + raw.rawValue / 100, 252) - 1) * 100 // diária → anual (252 dias úteis)
  } else {
    annual = (Math.pow(1 + raw.rawValue / 100, 12) - 1) * 100 // mensal → anual
  }
  return { value: annual.toFixed(2), date: raw.date }
}

/**
 * GET /api/market-rates
 * Retorna taxas atuais do mercado (Selic, CDI, IPCA) do Banco Central
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ message: 'Não autorizado' }, { status: 401 })
    }

    // Retornar cache se ainda válido
    if (cache && Date.now() - cache.timestamp < CACHE_TTL) {
      return NextResponse.json(cache.data)
    }

    // Fetch em paralelo
    const [selicRaw, cdiRaw, ipcaRaw] = await Promise.all([
      fetchBCBRate(BCB_ENDPOINTS.selic),
      fetchBCBRate(BCB_ENDPOINTS.cdi),
      fetchBCBRate(BCB_ENDPOINTS.ipca),
    ])

    const selic = selicRaw ? toAnnualRate(selicRaw, 'selic') : null
    const cdi = cdiRaw ? toAnnualRate(cdiRaw, 'cdi') : null
    const ipca = ipcaRaw ? toAnnualRate(ipcaRaw, 'ipca') : null

    const data = { selic, cdi, ipca }

    // Só cachear se pelo menos uma taxa foi obtida
    if (selic || cdi || ipca) {
      cache = { data, timestamp: Date.now() }
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error('Erro ao buscar taxas do BCB:', error)

    // Retornar cache expirado como fallback
    if (cache) {
      return NextResponse.json(cache.data)
    }

    return NextResponse.json(
      { message: 'Erro ao buscar taxas do mercado' },
      { status: 500 }
    )
  }
}
