# 📅 Sistema de Gerenciamento de Escala

Sistema completo para gerenciamento de escalas de trabalho, atendimentos e avisos, com integração ao Supabase, limpeza automática de dados e conformidade LGPD.

## ✨ Funcionalidades

### 🗓️ Gestão de Escalas
- Criação e edição de escalas por setor
- Gerador automático de escalas (semanal, quinzenal, mensal)
- Gerador personalizado com múltiplos turnos
- Calendário interativo com FullCalendar
- Suporte a horários específicos ou dia inteiro
- Funções fixas por período

### 👥 Gestão de Usuários
- Controle de perfis (Admin e Analista)
- Filtro automático de usuários inativos
- Configuração de horários de trabalho por dia
- Integração com Google OAuth
- Sistema de webhooks individuais

### 📊 Atendimentos
- Painel Kanban de atendimentos
- Rastreamento de status e prioridades
- Histórico completo
- Filtros avançados
- Relatórios customizados

### 📝 Avisos e Observações
- Agendamento de avisos com notificações
- Notificações via Google Chat
- Participantes múltiplos
- CRM e número de atendimento
- Histórico de alinhamentos

### 🔄 Integrações
- **Supabase:** Banco de dados na nuvem
- **Google OAuth:** Autenticação segura
- **Google Chat:** Notificações em tempo real
- **Bimer CRM:** Sincronização de atendimentos

### 🧹 Automações
- Limpeza automática de dados antigos (mantém 2 meses)
- Sincronização automática com Bimer
- Notificações programadas
- Cron jobs configuráveis

---

## 🛡️ Segurança e LGPD

### Conformidade
- ✅ Criptografia de senhas (bcrypt)
- ✅ JWT com expiração
- ✅ Cookies HttpOnly e Secure
- ✅ Rate limiting
- ✅ Helmet.js (headers de segurança)
- ✅ Validação de entrada (Zod)
- ✅ Prevenção de SQL Injection
- ✅ CORS configurado
- ✅ Sem exposição de dados sensíveis em logs

### LGPD
- ✅ Dados pessoais criptografados
- ✅ Controle de acesso por perfil
- ✅ Limpeza automática de dados antigos
- ✅ Possibilidade de exclusão de dados
- ✅ Logs sem informações pessoais

---

## 🚀 Tecnologias

### Backend
- **Node.js** 18+
- **Express** 5.x
- **PostgreSQL** via Supabase
- **JWT** para autenticação
- **Bcrypt** para senhas
- **Zod** para validação

### Frontend
- **Vanilla JavaScript**
- **Tailwind CSS**
- **FullCalendar**
- **Chart.js**
- **Font Awesome**

### DevOps
- **Vercel** para hospedagem
- **Supabase** para banco de dados
- **GitHub Actions** (opcional)
- **Node-cron** para agendamentos

---

## 📦 Instalação

### Pré-requisitos
- Node.js 18 ou superior
- Conta no Supabase
- Conta no Vercel (para produção)

### 1. Clonar Repositório

```bash
git clone https://github.com/igor-belo/escala_igor.git
cd escala_igor
```

### 2. Instalar Dependências

```bash
npm install
```

### 3. Configurar Variáveis de Ambiente

```bash
# Copiar arquivo de exemplo
cp .env.example .env

# Editar .env com suas credenciais
```

### 4. Configurar Banco de Dados

Siga as instruções em [DEPLOY.md](DEPLOY.md) para:
- Criar tabelas no Supabase
- Migrar dados (se houver)

### 5. Rodar Localmente

```bash
npm start
```

Acesse: http://localhost:3000

---

## 🌐 Deploy em Produção

Veja o guia completo em [DEPLOY.md](DEPLOY.md)

### Resumo Rápido:

1. **Push para GitHub**
```bash
git push origin main
```

2. **Deploy no Vercel**
- Importe o projeto do GitHub
- Configure variáveis de ambiente
- Deploy automático!

3. **Configurar Supabase**
- Habilitar RLS
- Configurar backups

---

## 📚 Estrutura do Projeto

```
escala_igor/
├── public/                 # Frontend
│   ├── js/                # JavaScript
│   ├── components/        # Componentes reutilizáveis
│   └── *.html            # Páginas
├── src/
│   ├── config/           # Configurações (DB, etc)
│   ├── controllers/      # Lógica de negócio
│   ├── core/             # Utilitários core
│   ├── middleware/       # Middlewares
│   ├── routes/           # Rotas da API
│   └── services/         # Serviços (cleanup, scraper)
├── server.js             # Entrada principal
├── .env.example          # Exemplo de variáveis
├── .gitignore            # Arquivos ignorados
├── package.json          # Dependências
├── vercel.json           # Configuração Vercel
├── README.md             # Este arquivo
└── DEPLOY.md             # Guia de deploy

```

---

## 🔌 API Endpoints

### Autenticação
- `POST /api/login` - Login
- `POST /api/google-login` - Login com Google
- `POST /api/logout` - Logout
- `POST /api/change-password` - Trocar senha

### Usuários
- `GET /api/usuarios` - Listar todos
- `GET /api/usuarios/ativos` - Listar apenas ativos
- `POST /api/usuarios` - Criar
- `PUT /api/usuarios/:id` - Atualizar
- `POST /api/usuarios/:id/resetar-senha` - Resetar senha

### Escalas
- `GET /api/escala` - Listar
- `POST /api/escala` - Criar
- `PUT /api/escala/:id` - Atualizar
- `POST /api/escala/gerar` - Gerar automática
- `POST /api/escala/gerar-custom` - Gerar personalizada

### Atendimentos
- `GET /api/atendimentos` - Listar
- `GET /api/atendimentos/ativos` - Ativos
- `POST /api/atendimentos` - Criar
- `PUT /api/atendimentos/:id` - Atualizar

### Limpeza Automática
- `GET /api/cleanup/preview` - Preview de limpeza
- `GET /api/cleanup/executar` - Executar limpeza

---

## 🧪 Testes

```bash
# Testar localmente
npm start

# Verificar limpeza
curl http://localhost:3000/api/cleanup/preview
```

---

## 📝 Variáveis de Ambiente

Ver `.env.example` para todas as variáveis disponíveis.

### Obrigatórias:
- `SUPABASE_CONNECTION_STRING`
- `CRYPTO_KEY`
- `NODE_ENV`

### Opcionais:
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `BIMER_USER`
- `BIMER_PASS`

---

## 🤝 Contribuindo

1. Fork o projeto
2. Crie uma branch (`git checkout -b feature/nova-funcionalidade`)
3. Commit suas mudanças (`git commit -m 'feat: adiciona nova funcionalidade'`)
4. Push para a branch (`git push origin feature/nova-funcionalidade`)
5. Abra um Pull Request

---

## 📄 Licença

Este projeto é privado e proprietário.

---

## 👤 Autor

**Igor Belo Amaral**

- GitHub: [@igor-belo](https://github.com/igor-belo)
- Email: igorbelo.sup.shop@alterdata.com.br

---

## 🙏 Agradecimentos

- Equipe Alterdata
- Supabase Team
- Vercel Team

---

## 📞 Suporte

Para suporte, abra uma issue no GitHub ou entre em contato via email.

---

**Desenvolvido com ❤️ pela equipe Alterdata**
