# 📡 Documentação da API - Sistema de Gestão Financeira

Documentação completa das APIs REST implementadas no sistema.

---

## 🔐 Autenticação

Todas as rotas requerem autenticação via NextAuth (exceto `/api/auth/*`). O token de sessão é enviado automaticamente via cookies.

---

## 📋 Contas Financeiras

### `GET /api/accounts`
Lista todas as contas financeiras onde o usuário é membro.

**Resposta:**
```json
[
  {
    "id": "string",
    "name": "string",
    "createdAt": "datetime",
    "updatedAt": "datetime",
    "members": [...]
  }
]
```

### `POST /api/accounts`
Cria uma nova conta financeira.
- **US-02**: Criar conta financeira

**Body:**
```json
{
  "name": "string"
}
```

---

## 👥 Convites e Membros

### `GET /api/accounts/[id]/invitations`
Lista convites pendentes de uma conta (apenas admins).
- **US-04**: Convidar usuários

### `POST /api/accounts/[id]/invitations`
Cria um novo convite para a conta.
- **US-04**: Convidar usuários
- **US-05**: Definir permissões

**Body:**
```json
{
  "email": "string",
  "role": "ADMIN" | "EDITOR" | "VIEWER"
}
```

### `POST /api/invitations/accept`
Aceita um convite para acessar uma conta.
- **US-03**: Acessar conta existente

**Body:**
```json
{
  "token": "string"
}
```

---

## 💰 Rendas

### `GET /api/incomes/fixed?accountId={id}`
Lista todas as rendas fixas de uma conta.

### `POST /api/incomes/fixed`
Cria uma nova renda fixa mensal.
- **US-06**: Cadastrar renda fixa mensal

**Body:**
```json
{
  "accountId": "string",
  "amount": number,
  "description": "string (opcional)"
}
```

### `PUT /api/incomes/fixed/[id]`
Edita uma renda fixa.
- **US-07**: Editar renda fixa

### `DELETE /api/incomes/fixed/[id]`
Exclui uma renda fixa.

---

### `GET /api/incomes/extra?accountId={id}&month={m}&year={y}`
Lista rendas extras filtradas por conta e mês/ano.

### `POST /api/incomes/extra`
Cria uma nova renda extra.
- **US-08**: Cadastrar renda extra por mês

**Body:**
```json
{
  "accountId": "string",
  "amount": number,
  "description": "string (opcional)",
  "month": number (1-12),
  "year": number
}
```

### `PUT /api/incomes/extra/[id]`
Edita uma renda extra.

### `DELETE /api/incomes/extra/[id]`
Exclui uma renda extra.

---

### `GET /api/incomes/monthly?accountId={id}&month={m}&year={y}`
Calcula a renda mensal total (fixa + extras do mês).
- **US-09**: Visualizar renda mensal

**Resposta:**
```json
{
  "fixedIncome": number,
  "extraIncome": number,
  "total": number,
  "month": number,
  "year": number
}
```

---

## 🧾 Despesas Fixas

### `GET /api/expenses/fixed?accountId={id}`
Lista despesas fixas de uma conta.

### `POST /api/expenses/fixed`
Cria uma nova despesa fixa.
- **US-10**: Cadastrar despesa fixa mensal (sem prazo)
- **US-11**: Cadastrar despesa fixa temporária (com prazo)

**Body:**
```json
{
  "accountId": "string",
  "amount": number,
  "description": "string",
  "startDate": "datetime",
  "endDate": "datetime (opcional, null = sem prazo)",
  "categoryId": "string (opcional)"
}
```

### `PUT /api/expenses/fixed/[id]`
Edita uma despesa fixa.
- **US-12**: Editar despesa fixa

### `DELETE /api/expenses/fixed/[id]`
Exclui uma despesa fixa.

---

### `GET /api/expenses/fixed/monthly-impact?accountId={id}&month={m}&year={y}`
Calcula o impacto mensal das despesas fixas.
- **US-13**: Visualizar impacto das despesas fixas

**Resposta:**
```json
{
  "month": number,
  "year": number,
  "total": number,
  "activeExpenses": [...]
}
```

---

## 💸 Despesas Variáveis

### `GET /api/expenses/variable?accountId={id}&month={m}&year={y}`
Lista despesas variáveis filtradas por conta e mês/ano.

### `POST /api/expenses/variable`
Cria uma nova despesa variável.
- **US-14**: Lançar despesa variável rapidamente
- **US-15**: Lançar várias despesas em sequência (mesma API, chamadas múltiplas)
- **US-16**: Categorizar despesas (via categoryId)

**Body:**
```json
{
  "accountId": "string",
  "amount": number,
  "description": "string (opcional)",
  "date": "datetime",
  "categoryId": "string (opcional)"
}
```

### `PUT /api/expenses/variable/[id]`
Edita uma despesa variável.
- **US-17**: Editar despesa

### `DELETE /api/expenses/variable/[id]`
Exclui uma despesa variável.
- **US-17**: Excluir despesa

---

## 🏷️ Categorias

### `GET /api/categories?accountId={id}`
Lista categorias de uma conta (incluindo padrões).
- **US-18**: Usar categorias padrão
- **US-19**: Criar categorias personalizadas

**Resposta:**
```json
{
  "default": [...],
  "custom": [...]
}
```

### `POST /api/categories`
Cria uma nova categoria personalizada.
- **US-19**: Criar categorias personalizadas

**Body:**
```json
{
  "accountId": "string",
  "name": "string",
  "description": "string (opcional)",
  "color": "string (opcional)",
  "icon": "string (opcional)"
}
```

### `PUT /api/categories/[id]`
Edita uma categoria personalizada.

### `DELETE /api/categories/[id]`
Exclui uma categoria personalizada.

---

## 🎯 Caixinhas (Piggy Banks)

### `GET /api/piggy-banks?accountId={id}`
Lista caixinhas de uma conta com progresso e valor mensal sugerido.

**Resposta:**
```json
[
  {
    "id": "string",
    "name": "string",
    "targetAmount": number,
    "currentAmount": number,
    "suggestedMonthlyAmount": number,
    "monthsRemaining": number,
    "progress": number (0-100)
  }
]
```

### `POST /api/piggy-banks`
Cria uma nova caixinha.
- **US-20**: Criar caixinha com valor objetivo
- **US-21**: Definir prazo da caixinha por meses
- **US-22**: Definir prazo da caixinha por data

**Body:**
```json
{
  "accountId": "string",
  "name": "string",
  "description": "string (opcional)",
  "targetAmount": number,
  "endDate": "datetime (opcional)",
  "months": number (opcional)
}
```

**Nota:** Informe apenas `endDate` OU `months`, não ambos.

### `GET /api/piggy-banks/[id]`
Busca uma caixinha específica com todas as transações.
- **US-27**: Visualizar progresso da caixinha

### `PUT /api/piggy-banks/[id]`
Edita uma caixinha.

### `DELETE /api/piggy-banks/[id]`
Exclui uma caixinha.

---

### `POST /api/piggy-banks/[id]/transactions`
Cria uma transação (aporte ou retirada) em uma caixinha.
- **US-24**: Fazer aporte na caixinha
- **US-25**: Retirar dinheiro da caixinha
- **US-26**: Recalcular valor mensal automaticamente (faz parte do retorno)

**Body:**
```json
{
  "amount": number,
  "type": "DEPOSIT" | "WITHDRAWAL",
  "description": "string (opcional)",
  "date": "datetime"
}
```

**Resposta:** Retorna a transação criada e a caixinha atualizada com novo `suggestedMonthlyAmount` e `progress`.

### `DELETE /api/piggy-banks/[id]/transactions/[transactionId]`
Exclui uma transação e recalcula o valor atual da caixinha.

---

### `GET /api/piggy-banks/[id]/share`
Lista compartilhamentos de uma caixinha.

### `POST /api/piggy-banks/[id]/share`
Compartilha uma caixinha com um email.
- **US-34**: Compartilhar apenas uma caixinha

**Body:**
```json
{
  "email": "string",
  "role": "ADMIN" | "EDITOR" | "VIEWER"
}
```

### `POST /api/piggy-banks/share/accept`
Aceita um compartilhamento de caixinha.

**Body:**
```json
{
  "token": "string"
}
```

---

## 📊 Relatórios e Análises

### `GET /api/financial-health?accountId={id}&month={m}&year={y}`
Calcula a saúde financeira mensal.
- **US-28**: Visualizar saúde financeira mensal
- **US-29**: Identificar meses críticos (deixa para o frontend fazer comparação)

**Resposta:**
```json
{
  "month": number,
  "year": number,
  "income": number,
  "expenses": number,
  "fixedExpenses": number,
  "variableExpenses": number,
  "balance": number,
  "healthStatus": "excellent" | "good" | "warning" | "critical",
  "healthPercentage": number
}
```

### `GET /api/monthly-summary?accountId={id}&month={m}&year={y}`
Retorna resumo financeiro completo do mês.
- **US-35**: Visualizar resumo mensal

**Resposta:**
```json
{
  "month": number,
  "year": number,
  "income": {
    "fixed": [...],
    "extra": [...],
    "total": number
  },
  "expenses": {
    "fixed": {...},
    "variable": {...},
    "total": number
  },
  "balance": number,
  "health": {...}
}
```

---

### `GET /api/reports/expenses-by-category?accountId={id}&month={m}&year={y}`
Retorna gastos agrupados por categoria.
- **US-30**: Visualizar gastos por categoria

**Resposta:**
```json
{
  "month": number | null,
  "year": number | null,
  "categories": [
    {
      "categoryId": "string | null",
      "categoryName": "string",
      "total": number,
      "count": number,
      "expenses": [...]
    }
  ],
  "total": number
}
```

### `GET /api/reports/monthly-evolution?accountId={id}&startMonth={m}&startYear={y}&endMonth={m}&endYear={y}`
Retorna evolução financeira ao longo dos meses.
- **US-31**: Visualizar evolução mensal

**Resposta:**
```json
{
  "startDate": "datetime",
  "endDate": "datetime",
  "evolution": [
    {
      "month": number,
      "year": number,
      "income": number,
      "expenses": number,
      "balance": number
    }
  ]
}
```

### `GET /api/reports/piggy-banks-progress?accountId={id}`
Retorna progresso das caixinhas.
- **US-32**: Visualizar progresso dos objetivos

**Resposta:**
```json
{
  "piggyBanks": [...],
  "total": number,
  "completed": number,
  "inProgress": number,
  "notStarted": number
}
```

---

## 🔒 Permissões

- **ADMIN**: Pode fazer tudo (criar, editar, excluir, convidar)
- **EDITOR**: Pode criar e editar (não pode excluir contas, convidar ou alterar permissões)
- **VIEWER**: Apenas visualização (pode ler todos os dados)

---

## ⚠️ Códigos de Erro

- `200`: Sucesso
- `201`: Criado com sucesso
- `400`: Dados inválidos
- `401`: Não autorizado (não autenticado)
- `403`: Acesso negado (sem permissão)
- `404`: Recurso não encontrado
- `500`: Erro interno do servidor

---

## 📝 Notas Importantes

1. Todas as rotas requerem autenticação via sessão NextAuth
2. O `accountId` deve ser passado como query parameter ou no body, dependendo da rota
3. Validações são feitas com Yup antes de processar os dados
4. Valores monetários são armazenados como `Decimal` no Prisma e retornados como `number` na API
5. Datas devem ser enviadas em formato ISO 8601
6. O sistema calcula automaticamente o valor mensal sugerido para caixinhas após cada transação
7. Despesas fixas são filtradas automaticamente para considerar apenas as ativas no mês específico




