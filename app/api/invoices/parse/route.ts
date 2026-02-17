import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

interface ParsedTransaction {
  date: string       // YYYY-MM-DD
  description: string
  amount: number
  cardholder: string
  installment: string
  card: string
}

/**
 * POST /api/invoices/parse
 * Receives a PDF or CSV file and parses credit card transactions
 * Supports: XP (CSV), Itaú (PDF), Inter (PDF)
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ message: 'Não autorizado' }, { status: 401 })
    }

    const formData = await request.formData()
    const file = formData.get('file') as File | null
    if (!file) {
      return NextResponse.json({ message: 'Arquivo é obrigatório' }, { status: 400 })
    }

    const buffer = Buffer.from(await file.arrayBuffer())
    const fileName = file.name.toLowerCase()

    let transactions: ParsedTransaction[] = []
    let bankName = 'desconhecido'

    if (fileName.endsWith('.csv') || fileName.endsWith('.txt')) {
      // CSV parsing (XP, Nubank, etc.)
      const text = buffer.toString('utf-8')
      const result = parseCSV(text)
      transactions = result.transactions
      bankName = result.bank
    } else if (fileName.endsWith('.pdf')) {
      // PDF parsing - dynamic import to avoid module load failures on Vercel
      const { PDFParse } = await import('pdf-parse')
      const parser = new PDFParse({ data: new Uint8Array(buffer) })
      const textResult = await parser.getText()
      const text = textResult.text
      await parser.destroy()

      // Detect bank and parse
      if (text.includes('Banco Itaú') || text.includes('Itaú') || text.includes('ITAU')) {
        const result = parseItauPDF(text)
        transactions = result
        bankName = 'Itaú'
      } else if (text.includes('Banco Inter') || text.includes('banco inter') || text.includes('bancointer') || text.includes('Super App')) {
        const result = parseInterPDF(text)
        transactions = result
        bankName = 'Inter'
      } else {
        // Try generic PDF parsing
        const result = parseGenericPDF(text)
        transactions = result
        bankName = 'genérico'
      }
    } else {
      return NextResponse.json({ message: 'Formato não suportado. Use CSV ou PDF.' }, { status: 400 })
    }

    return NextResponse.json({
      bank: bankName,
      total: transactions.length,
      totalAmount: transactions.reduce((sum, t) => sum + t.amount, 0),
      transactions,
    })
  } catch (error) {
    console.error('Erro ao processar fatura:', error)
    return NextResponse.json(
      { message: 'Erro ao processar fatura' },
      { status: 500 }
    )
  }
}

// ===== CSV PARSER (XP, Nubank, etc.) =====
function parseCSV(text: string): { bank: string; transactions: ParsedTransaction[] } {
  const lines = text.split('\n').filter(l => l.trim())
  if (lines.length < 2) return { bank: 'CSV', transactions: [] }

  const header = lines[0].toLowerCase()
  const transactions: ParsedTransaction[] = []

  // XP format: Data;Estabelecimento;Portador;Valor;Parcela
  if (header.includes('estabelecimento') && header.includes(';')) {
    for (let i = 1; i < lines.length; i++) {
      const cols = lines[i].split(';').map(c => c.trim())
      if (cols.length < 4) continue

      const amount = parseBRL(cols[3])
      if (amount <= 0) continue // skip payments

      const dateParts = cols[0].split('/')
      const isoDate = dateParts.length === 3
        ? `${dateParts[2]}-${dateParts[1].padStart(2, '0')}-${dateParts[0].padStart(2, '0')}`
        : ''

      transactions.push({
        date: isoDate,
        description: cols[1],
        amount,
        cardholder: cols[2]?.trim() || '',
        installment: cols[4] || '-',
        card: '',
      })
    }
    return { bank: 'XP', transactions }
  }

  // Nubank format: date,title,amount (comma separated)
  if (header.includes('title') || header.includes('amount')) {
    const sep = header.includes('\t') ? '\t' : ','
    for (let i = 1; i < lines.length; i++) {
      const cols = lines[i].split(sep).map(c => c.trim())
      if (cols.length < 3) continue

      const amount = parseFloat(cols[2]?.replace(',', '.') || '0')
      if (amount <= 0) continue

      transactions.push({
        date: cols[0] || '',
        description: cols[1] || '',
        amount,
        cardholder: '',
        installment: '-',
        card: '',
      })
    }
    return { bank: 'Nubank', transactions }
  }

  // Generic CSV: try semicolon then comma
  const sep = lines[0].includes(';') ? ';' : ','
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(sep).map(c => c.trim())
    if (cols.length < 2) continue

    // Try to find amount in last column
    const lastCol = cols[cols.length - 1]
    const amount = parseBRL(lastCol)
    if (amount <= 0) continue

    const description = cols.slice(1, -1).join(' ').trim() || cols[0]
    const dateParts = cols[0].split('/')
    const isoDate = dateParts.length === 3
      ? `${dateParts[2]}-${dateParts[1].padStart(2, '0')}-${dateParts[0].padStart(2, '0')}`
      : cols[0]

    transactions.push({
      date: isoDate,
      description,
      amount,
      cardholder: '',
      installment: '-',
      card: '',
    })
  }
  return { bank: 'CSV', transactions }
}

// ===== ITAÚ PDF PARSER =====
function parseItauPDF(text: string): ParsedTransaction[] {
  const transactions: ParsedTransaction[] = []

  // Extract year from the document (look for "Vencimento: DD/MM/YYYY")
  const yearMatch = text.match(/Vencimento:\s*\d{2}\/\d{2}\/(\d{4})/)
  const invoiceYear = yearMatch ? yearMatch[1] : new Date().getFullYear().toString()

  // Find the cardholder section
  const cardholderMatch = text.match(/Titular\s+(.+?)(?:\n|Cartão)/)
  const cardholder = cardholderMatch ? cardholderMatch[1].trim() : ''

  // Pattern for Itaú transactions: DD/MM DESCRIPTION VALUE
  // The text extraction gives us lines like:
  // "08/01 AUTO POSTO S-CT PRIMOS 206,60"
  // followed by category lines like "VEÍCULOS .PONTA GROSSA"
  const txRegex = /(\d{2}\/\d{2})\s+(.+?)\s+(\d{1,3}(?:\.\d{3})*,\d{2})/g
  let match

  while ((match = txRegex.exec(text)) !== null) {
    const [, dateStr, rawDesc, amountStr] = match
    const amount = parseBRL(amountStr)
    if (amount <= 0) continue

    // Clean description: remove "-CT" artifacts from Itaú two-column text extraction
    const description = rawDesc
      .replace(/-CT\s*/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()

    // Skip summary lines
    if (description.match(/^(Total|Lançamentos|Saldo|Pagamento|Limite|Juros|IOF|CET|Encargos|Multa|Valor)/i)) continue
    if (description.match(/fatura/i)) continue

    // Build date: DD/MM + year from invoice
    const [day, month] = dateStr.split('/')
    const isoDate = `${invoiceYear}-${month}-${day}`

    transactions.push({
      date: isoDate,
      description,
      amount,
      cardholder,
      installment: '-',
      card: '',
    })
  }

  return transactions
}

// ===== INTER PDF PARSER =====
function parseInterPDF(text: string): ParsedTransaction[] {
  const transactions: ParsedTransaction[] = []

  // Inter format has sections like:
  // CARTÃO 5364****3145
  // Data Movimentação Beneficiário Valor
  // 14 de jan. 2026 PAGAMENTO ON LINE - + R$ 955,51
  // 16 de jan. 2026 ABAST SHELL BOX - R$ 133,02

  const monthMap: Record<string, string> = {
    'jan': '01', 'fev': '02', 'mar': '03', 'abr': '04',
    'mai': '05', 'jun': '06', 'jul': '07', 'ago': '08',
    'set': '09', 'out': '10', 'nov': '11', 'dez': '12',
  }

  let currentCard = ''

  const lines = text.split('\n')

  for (const line of lines) {
    const trimmed = line.trim()

    // Detect card section
    const cardMatch = trimmed.match(/CARTÃO\s+([\d*]+)/)
    if (cardMatch) {
      currentCard = cardMatch[1]
      continue
    }

    // Skip header and summary lines
    if (trimmed.startsWith('Data') && trimmed.includes('Movimentação')) continue
    if (trimmed.startsWith('Total ')) continue

    // Parse transaction line: "DD de MMM. YYYY DESCRIPTION - R$ VALUE"
    // or "DD de MMM. YYYY DESCRIPTION (Parcela XX de YY) - R$ VALUE"
    const txMatch = trimmed.match(
      /^(\d{1,2})\s+de\s+(\w{3})\.?\s+(\d{4})\s+(.+?)\s+-\s+([+-]?\s*R\$\s*[\d.,]+)/
    )

    if (txMatch) {
      const [, day, monthAbbr, year, rawDesc, amountStr] = txMatch
      const month = monthMap[monthAbbr.toLowerCase()] || '01'
      const amount = parseBRL(amountStr)

      // Skip payments (positive amounts with + sign, or "PAGAMENTO")
      if (amountStr.includes('+')) continue
      if (rawDesc.toUpperCase().includes('PAGAMENTO')) continue
      if (amount <= 0) continue

      // Extract installment info
      const installMatch = rawDesc.match(/\(Parcela\s+(\d+)\s+de\s+(\d+)\)/)
      const installment = installMatch ? `${installMatch[1]} de ${installMatch[2]}` : '-'
      const description = rawDesc.replace(/\(Parcela\s+\d+\s+de\s+\d+\)/, '').trim()

      const isoDate = `${year}-${month}-${day.padStart(2, '0')}`

      transactions.push({
        date: isoDate,
        description,
        amount,
        cardholder: '',
        installment,
        card: currentCard,
      })
    }
  }

  return transactions
}

// ===== GENERIC PDF PARSER =====
function parseGenericPDF(text: string): ParsedTransaction[] {
  const transactions: ParsedTransaction[] = []

  // Try to find lines with dates and amounts
  const txRegex = /(\d{2}\/\d{2}(?:\/\d{2,4})?)\s+(.+?)\s+R?\$?\s*(\d{1,3}(?:[.,]\d{3})*[.,]\d{2})/g
  let match

  while ((match = txRegex.exec(text)) !== null) {
    const [, dateStr, rawDesc, amountStr] = match
    const amount = parseBRL(amountStr)
    if (amount <= 0) continue

    const description = rawDesc.replace(/\s+/g, ' ').trim()
    if (description.match(/^(Total|Saldo|Pagamento|Limite)/i)) continue

    // Try to build ISO date
    const parts = dateStr.split('/')
    let isoDate = ''
    if (parts.length === 3) {
      const yr = parts[2].length === 2 ? `20${parts[2]}` : parts[2]
      isoDate = `${yr}-${parts[1]}-${parts[0]}`
    } else if (parts.length === 2) {
      isoDate = `${new Date().getFullYear()}-${parts[1]}-${parts[0]}`
    }

    transactions.push({
      date: isoDate,
      description,
      amount,
      cardholder: '',
      installment: '-',
      card: '',
    })
  }

  return transactions
}

// ===== HELPERS =====
function parseBRL(raw: string): number {
  const cleaned = raw.replace(/R\$/, '').replace(/\+/, '').trim()
  // Handle "6.004,34" -> 6004.34 and "123,45" -> 123.45
  const normalized = cleaned.replace(/\./g, '').replace(',', '.')
  return parseFloat(normalized) || 0
}
