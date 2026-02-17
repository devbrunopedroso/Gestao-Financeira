# 💰 Sistema de Gestão Financeira

Sistema de gestão financeira pessoal e familiar desenvolvido com Next.js, Prisma, PostgreSQL, Yup e React Hook Form.

## 🚀 Tecnologias

- **Next.js 14** - Framework React
- **TypeScript** - Tipagem estática
- **Prisma** - ORM para PostgreSQL
- **PostgreSQL** - Banco de dados
- **NextAuth.js** - Autenticação com Google
- **React Hook Form** - Gerenciamento de formulários
- **Yup** - Validação de schemas
- **Tailwind CSS** - Estilização

## 📋 Pré-requisitos

- Node.js 18+ 
- PostgreSQL
- Conta Google (para OAuth)

## 🔧 Instalação

1. Clone o repositório
2. Instale as dependências:
```bash
npm install
```

3. Configure as variáveis de ambiente:
```bash
cp .env.example .env
```

Edite o arquivo `.env` com suas credenciais:
- `DATABASE_URL` - URL de conexão do PostgreSQL
- `NEXTAUTH_URL` - URL da aplicação (ex: http://localhost:3000)
- `NEXTAUTH_SECRET` - Chave secreta (gere com: `openssl rand -base64 32`)
- `GOOGLE_CLIENT_ID` - ID do cliente Google OAuth
- `GOOGLE_CLIENT_SECRET` - Secret do cliente Google OAuth

4. Configure o banco de dados:
```bash
# Gerar o cliente Prisma
npm run db:generate

# Criar as tabelas no banco
npm run db:push

# Ou criar migrations
npm run db:migrate
```

5. Execute o projeto:
```bash
npm run dev
```

Acesse [http://localhost:3000](http://localhost:3000)

## 📚 Estrutura do Projeto

```
├── app/                    # App Router do Next.js
│   ├── api/               # API Routes
│   ├── auth/              # Páginas de autenticação
│   └── page.tsx           # Página inicial
├── components/            # Componentes React
│   └── forms/            # Componentes de formulário
├── lib/                   # Utilitários e configurações
│   ├── auth.ts           # Configuração NextAuth
│   ├── prisma.ts         # Cliente Prisma
│   └── validations/      # Schemas Yup
├── prisma/               # Schema e migrations Prisma
│   └── schema.prisma     # Schema do banco de dados
└── public/               # Arquivos estáticos
```

## 🗄️ Modelos de Dados

O sistema possui os seguintes modelos principais:

- **User** - Usuários do sistema
- **FinancialAccount** - Contas financeiras
- **AccountMember** - Membros e permissões
- **FixedIncome** - Rendas fixas
- **ExtraIncome** - Rendas extras
- **FixedExpense** - Despesas fixas
- **VariableExpense** - Despesas variáveis
- **Category** - Categorias de gastos
- **PiggyBank** - Caixinhas/Propósitos
- **PiggyBankTransaction** - Transações das caixinhas

## 🔐 Autenticação

O sistema utiliza NextAuth.js com autenticação via Google OAuth. Para configurar:

1. Acesse [Google Cloud Console](https://console.cloud.google.com/)
2. Crie um novo projeto ou selecione um existente
3. Ative a API "Google+ API"
4. Crie credenciais OAuth 2.0
5. Adicione a URL de callback: `http://localhost:3000/api/auth/callback/google`
6. Copie o Client ID e Client Secret para o arquivo `.env`

## 📝 Scripts Disponíveis

- `npm run dev` - Inicia o servidor de desenvolvimento
- `npm run build` - Cria build de produção
- `npm run start` - Inicia servidor de produção
- `npm run lint` - Executa o linter
- `npm run db:generate` - Gera o cliente Prisma
- `npm run db:push` - Sincroniza schema com o banco
- `npm run db:migrate` - Cria e aplica migrations
- `npm run db:studio` - Abre Prisma Studio

## 🎯 Funcionalidades

Baseado nas histórias de usuário do arquivo `instrucoes.md`, o sistema suporta:

### ✅ Épico 1 — Acesso e Conta Financeira
- ✅ Login com Google (US-01)
- ✅ Criação de contas financeiras (US-02)
- ✅ Acesso a contas existentes via convite (US-03)
- ✅ Convidar usuários (US-04)
- ✅ Definir permissões (Admin, Editor, Viewer) (US-05)

### ✅ Épico 2 — Gestão de Renda
- ✅ Cadastrar renda fixa mensal (US-06)
- ✅ Editar renda fixa (US-07)
- ✅ Cadastrar renda extra por mês (US-08)
- ✅ Visualizar renda mensal total (US-09)

### ✅ Épico 3 — Despesas Fixas
- ✅ Cadastrar despesa fixa mensal (sem prazo) (US-10)
- ✅ Cadastrar despesa fixa temporária (com prazo) (US-11)
- ✅ Editar despesa fixa (US-12)
- ✅ Visualizar impacto das despesas fixas (US-13)

### ✅ Épico 4 — Despesas Variáveis
- ✅ Lançar despesa variável rapidamente (US-14)
- ✅ Lançar várias despesas em sequência (US-15)
- ✅ Categorizar despesas (US-16)
- ✅ Editar ou excluir despesa (US-17)

### ✅ Épico 5 — Categorias
- ✅ Usar categorias padrão (US-18)
- ✅ Criar categorias personalizadas (US-19)

### ✅ Épico 6 — Caixinhas / Propósitos
- ✅ Criar caixinha com valor objetivo (US-20)
- ✅ Definir prazo por meses ou data (US-21, US-22)
- ✅ Visualizar valor mensal sugerido (US-23)
- ✅ Fazer aporte e retirar dinheiro (US-24, US-25)
- ✅ Recalcular valor mensal automaticamente (US-26)
- ✅ Visualizar progresso percentual (US-27)

### ✅ Épico 7 — Saúde Financeira
- ✅ Visualizar saúde financeira mensal (US-28)
- ✅ Identificar meses críticos (US-29)

### ✅ Épico 8 — Relatórios e Gráficos
- ✅ Visualizar gastos por categoria (US-30)
- ✅ Visualizar evolução mensal (US-31)
- ✅ Visualizar progresso dos objetivos (US-32)

### ✅ Épico 9 — Compartilhamento
- ✅ Compartilhar conta financeira (US-33)
- ✅ Compartilhar apenas uma caixinha (US-34)

### ✅ Épico 10 — Visão Mensal
- ✅ Visualizar resumo mensal (US-35)
- ✅ Navegar entre meses (US-36 - suportado via query params)

## 📖 Documentação Adicional

- **`API_DOCUMENTATION.md`**: Documentação completa de todas as APIs REST
- **`EXAMPLES.md`**: Exemplos práticos de uso do sistema, incluindo:
  - Formulários com React Hook Form + Yup
  - Uso do Prisma Client
  - Helpers e utilitários
  - Estrutura de API Routes
- **`instrucoes.md`**: Histórias de usuário completas (36 US)

## 🔒 Segurança

O projeto segue boas práticas de segurança:
- Autenticação obrigatória via NextAuth
- Validação de dados com Yup
- Proteção de rotas com middleware
- Verificação de permissões em operações sensíveis

## 📄 Licença

Este projeto é privado.

