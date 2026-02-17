# 🚀 Guia de Configuração Rápida

## Passo a Passo para Iniciar o Projeto

### 1. Instalar Dependências

```bash
npm install
```

### 2. Configurar Banco de Dados PostgreSQL

Certifique-se de ter o PostgreSQL instalado e rodando. Crie um banco de dados:

```sql
CREATE DATABASE gestao_financeira;
```

### 3. Configurar Variáveis de Ambiente

Crie um arquivo `.env` na raiz do projeto:

```env
# Database
DATABASE_URL="postgresql://usuario:senha@localhost:5432/gestao_financeira?schema=public"

# NextAuth
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=seu-secret-aqui

# Google OAuth
GOOGLE_CLIENT_ID=seu-google-client-id
GOOGLE_CLIENT_SECRET=seu-google-client-secret
```

**Gerar NEXTAUTH_SECRET:**
```bash
openssl rand -base64 32
```

### 4. Configurar Google OAuth

1. Acesse [Google Cloud Console](https://console.cloud.google.com/)
2. Crie um novo projeto
3. Ative a API "Google+ API"
4. Vá em "Credenciais" > "Criar credenciais" > "ID do cliente OAuth 2.0"
5. Configure:
   - Tipo: Aplicativo da Web
   - URIs de redirecionamento autorizados: `http://localhost:3000/api/auth/callback/google`
6. Copie o Client ID e Client Secret para o `.env`

### 5. Configurar Prisma

```bash
# Gerar o cliente Prisma
npm run db:generate

# Criar as tabelas no banco (desenvolvimento)
npm run db:push

# OU criar migration (produção)
npm run db:migrate
```

### 6. Iniciar o Servidor

```bash
npm run dev
```

Acesse [http://localhost:3000](http://localhost:3000)

## ✅ Verificação

1. Acesse `/auth/signin` - deve mostrar o botão de login
2. Faça login com Google - deve redirecionar para `/`
3. Acesse `/api/accounts` - deve retornar array vazio (ou suas contas)

## 🐛 Troubleshooting

### Erro de conexão com banco
- Verifique se o PostgreSQL está rodando
- Confirme a URL de conexão no `.env`
- Teste a conexão: `psql -U usuario -d gestao_financeira`

### Erro de autenticação Google
- Verifique se as credenciais estão corretas no `.env`
- Confirme que a URL de callback está configurada no Google Console
- Verifique se o NEXTAUTH_URL está correto

### Erro do Prisma
- Execute `npm run db:generate` novamente
- Verifique se o banco de dados existe
- Tente `npm run db:push` para sincronizar o schema

