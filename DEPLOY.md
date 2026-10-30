# 🚀 Deploy no Vercel - Guia Completo

## 📋 Pré-requisitos

- [x] Conta no GitHub
- [x] Conta no Vercel (https://vercel.com)
- [x] Conta no Supabase (https://supabase.com)
- [x] Dados migrados para o Supabase

---

## 🔐 Segurança e LGPD

Este projeto está configurado com as seguintes medidas de segurança:

### ✅ Proteção de Dados Sensíveis
- `.gitignore` configurado para não enviar `.env` para o repositório
- Senhas e tokens apenas em variáveis de ambiente
- Helmet.js habilitado para headers de segurança
- CORS configurado adequadamente
- Rate limiting implementado
- Criptografia de senhas com bcrypt

### ✅ Conformidade LGPD
- Dados pessoais armazenados de forma criptografada
- Senhas nunca armazenadas em texto puro
- Logs não contêm informações pessoais
- Sistema de controle de acesso implementado
- Possibilidade de exclusão de dados

### ✅ Boas Práticas de Segurança
- JWT com expiração configurada
- Cookies HttpOnly e Secure
- Validação de entrada com Zod
- Prevenção de SQL Injection (prepared statements)
- Sem exposição de stack traces em produção

---

## 📝 Passo 1: Preparar o Repositório

### 1.1 Verificar .gitignore

Certifique-se de que o `.gitignore` está correto:

```bash
# Ver se .env está no gitignore
cat .gitignore | findstr .env
```

✅ Deve aparecer: `.env`

### 1.2 Verificar Arquivos Sensíveis

**NUNCA** commite estes arquivos:
- `.env` (credenciais)
- `backup-data.json` (dados sensíveis)
- `*.exe` (executáveis)
- Arquivos SQL de migração

### 1.3 Fazer Commit Inicial

```bash
git add .
git commit -m "feat: sistema de escala com Supabase, limpeza automática e filtro de inativos"
git branch -M main
git remote add origin https://github.com/igor-belo/escala_igor.git
git push -u origin main
```

---

## 🌐 Passo 2: Deploy no Vercel

### 2.1 Importar Projeto

1. Acesse: https://vercel.com
2. Clique em **"Add New Project"**
3. Importe do GitHub: `igor-belo/escala_igor`
4. **Não clique em Deploy ainda!**

### 2.2 Configurar Variáveis de Ambiente

No painel do Vercel, vá em **"Environment Variables"** e adicione:

#### Variáveis Obrigatórias:

```
NODE_ENV = production
PORT = 3000
CRYPTO_KEY = sua_chave_de_32_caracteres
```

#### Supabase (Obrigatório):

```
NEXT_PUBLIC_SUPABASE_URL = https://cbgmcrwcsuyzutaijjra.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = sb_publishable_d6jTq5iRNfBOR4gpZVNWDg_NdhIRr9E
SUPABASE_CONNECTION_STRING = postgresql://postgres.cbgmcrwcsuyzutaijjra:SoliDeoGloria@1120@aws-0-us-east-1.pooler.supabase.com:6543/postgres
```

⚠️ **IMPORTANTE:** Use a senha LITERAL (não URL encoded) no Vercel

#### Google OAuth (Opcional):

```
GOOGLE_CLIENT_ID = seu_client_id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET = seu_secret
```

#### Bimer (Opcional):

```
BIMER_USER = seu_usuario
BIMER_PASS = sua_senha
```

### 2.3 Configurar Build

O Vercel detecta automaticamente, mas confirme:

- **Framework Preset:** Other
- **Build Command:** (deixe em branco)
- **Output Directory:** public
- **Install Command:** npm install

### 2.4 Deploy

Clique em **"Deploy"** e aguarde ~2-3 minutos.

---

## 🧪 Passo 3: Testar a Aplicação

### 3.1 Acessar URL

Após deploy, você terá uma URL tipo:
```
https://escala-igor.vercel.app
```

### 3.2 Testar Funcionalidades

✅ **Login**
- Acesse a URL
- Faça login com suas credenciais

✅ **Carregar Dados**
- Escalas devem aparecer (887 registros)
- Atendimentos devem aparecer (527 registros)

✅ **Filtro de Inativos**
- Tente criar uma escala
- Apenas usuários ativos devem aparecer

✅ **Limpeza Automática**
- Veja os logs no painel do Vercel
- Deve mostrar: `[CLEANUP] Limpeza automática configurada`

---

## 🔧 Passo 4: Configurações Adicionais

### 4.1 Domínio Customizado (Opcional)

No painel do Vercel:
1. Vá em **Settings** → **Domains**
2. Adicione seu domínio
3. Configure DNS conforme instruções

### 4.2 Configurar Cron Jobs

O cron de notificações já está configurado em `vercel.json`:

```json
"crons": [
  {
    "path": "/api/cron/notificacoes",
    "schedule": "* * * * *"
  }
]
```

### 4.3 Monitoramento

- **Analytics:** Habilitado automaticamente
- **Logs:** https://vercel.com/seu-projeto/logs
- **Performance:** https://vercel.com/seu-projeto/analytics

---

## 🛡️ Passo 5: Segurança no Supabase

### 5.1 Configurar RLS (Row Level Security)

No Supabase SQL Editor, execute:

```sql
-- Habilitar RLS em todas as tabelas
ALTER TABLE usuarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE escala ENABLE ROW LEVEL SECURITY;
ALTER TABLE observacoes_dia ENABLE ROW LEVEL SECURITY;
ALTER TABLE alinhamentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE atendimentos ENABLE ROW LEVEL SECURITY;

-- Permitir acesso apenas via service role
-- (seu backend Node.js tem as credenciais corretas)
```

### 5.2 Backup Automático

- Habilitado automaticamente no Supabase
- Pode configurar em: Settings → Backups

---

## 📊 Passo 6: Monitoramento e Manutenção

### 6.1 Logs

```bash
# Ver logs no Vercel
vercel logs escala-igor
```

### 6.2 Métricas

- Acesse: https://vercel.com/seu-projeto/analytics
- Monitore:
  - Tempo de resposta
  - Taxa de erro
  - Uso de banda

### 6.3 Limpeza Automática

A limpeza roda automaticamente à meia-noite.

Para executar manualmente:
```
https://escala-igor.vercel.app/api/cleanup/executar
```

---

## 🔄 Atualizações

### Para atualizar o sistema:

```bash
# Fazer mudanças no código
git add .
git commit -m "feat: nova funcionalidade"
git push

# Deploy automático no Vercel!
```

---

## 🆘 Troubleshooting

### "Cannot connect to database"
- Verifique as variáveis de ambiente no Vercel
- Confirme que `SUPABASE_CONNECTION_STRING` está correto

### "Unauthorized"
- Verifique `CRYPTO_KEY` no Vercel
- Verifique `GOOGLE_CLIENT_ID` se usar OAuth

### "Function timeout"
- O Vercel tem limite de 10s por função
- A limpeza automática roda em background

### "CORS Error"
- Verifique se o domínio está nas configurações CORS
- O código já está configurado para `credentials: true`

---

## 📞 Suporte

- **Vercel Docs:** https://vercel.com/docs
- **Supabase Docs:** https://supabase.com/docs
- **Logs:** Painel do Vercel

---

## ✅ Checklist Final

- [ ] `.env` não está no repositório
- [ ] Variáveis de ambiente configuradas no Vercel
- [ ] Deploy realizado com sucesso
- [ ] Login funcionando
- [ ] Dados carregando corretamente
- [ ] Filtro de inativos ativo
- [ ] Limpeza automática configurada
- [ ] Cron job funcionando
- [ ] HTTPS habilitado
- [ ] Monitoramento ativo

---

**Pronto! Seu sistema está no ar com segurança e conformidade LGPD!** 🎉🚀
