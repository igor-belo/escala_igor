-- ================================================
-- SCRIPT DE CRIAÇÃO DE TABELAS PARA SUPABASE
-- Execute este script no SQL Editor do Supabase
-- ================================================

-- 1. Tabela de setores
CREATE TABLE IF NOT EXISTS setores (
    id SERIAL PRIMARY KEY,
    nome VARCHAR(100) NOT NULL,
    webhook_url TEXT
);

-- 2. Tabela de tipos de atendimento
CREATE TABLE IF NOT EXISTS tipos (
    id SERIAL PRIMARY KEY,
    nome VARCHAR(100) NOT NULL
);

-- 3. Tabela de usuários
CREATE TABLE IF NOT EXISTS usuarios (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    login VARCHAR(100) UNIQUE NOT NULL,
    nome VARCHAR(255) NOT NULL,
    senha VARCHAR(255) NOT NULL,
    tipo_perfil VARCHAR(50) NOT NULL,
    setor_id INTEGER REFERENCES setores(id),
    horarios_semana JSONB,
    funcao_fixa VARCHAR(100),
    fixa_inicio DATE,
    fixa_fim DATE,
    primeiro_acesso BOOLEAN DEFAULT TRUE,
    ativo BOOLEAN DEFAULT TRUE,
    webhook_url TEXT,
    id_bimer VARCHAR(100),
    criado_em TIMESTAMP DEFAULT NOW()
);

-- 4. Tabela de escala
CREATE TABLE IF NOT EXISTS escala (
    id SERIAL PRIMARY KEY,
    usuario_id INTEGER REFERENCES usuarios(id) ON DELETE CASCADE,
    setor_id INTEGER REFERENCES setores(id) ON DELETE CASCADE,
    data DATE NOT NULL,
    funcao VARCHAR(100) NOT NULL,
    observacao TEXT,
    dia_inteiro BOOLEAN DEFAULT TRUE,
    hora_inicio TIME,
    hora_fim TIME,
    editado_manualmente BOOLEAN DEFAULT FALSE,
    criado_em TIMESTAMP DEFAULT NOW()
);

-- 5. Tabela de observações do dia
CREATE TABLE IF NOT EXISTS observacoes_dia (
    id SERIAL PRIMARY KEY,
    data DATE NOT NULL,
    setor_id INTEGER REFERENCES setores(id),
    observacao TEXT,
    usuario_id INTEGER REFERENCES usuarios(id),
    hora TIME,
    crm VARCHAR(100),
    numero_atendimento VARCHAR(100),
    assunto TEXT,
    numero_contato VARCHAR(50),
    cliente_responsavel VARCHAR(255),
    analista_contato VARCHAR(255),
    criado_por INTEGER REFERENCES usuarios(id),
    participantes JSONB,
    notificado BOOLEAN DEFAULT FALSE,
    notificado_na_hora BOOLEAN DEFAULT FALSE,
    criado_em TIMESTAMP DEFAULT NOW()
);

-- 6. Tabela de alinhamentos
CREATE TABLE IF NOT EXISTS alinhamentos (
    id SERIAL PRIMARY KEY,
    usuario_abertura_id INTEGER REFERENCES usuarios(id),
    numero_atendimento TEXT,
    ocorrencia TEXT,
    alinhado BOOLEAN DEFAULT FALSE,
    aberto_por_texto TEXT,
    data_ocorrencia DATE,
    data_criacao TIMESTAMP DEFAULT NOW()
);

-- 7. Tabela de atendimentos
CREATE TABLE IF NOT EXISTS atendimentos (
    id SERIAL PRIMARY KEY,
    numero_atendimento VARCHAR(100),
    tipo_id INTEGER,
    usuario_id INTEGER REFERENCES usuarios(id),
    setor_id INTEGER REFERENCES setores(id),
    data_inicio TIMESTAMP,
    data_fim TIMESTAMP,
    status VARCHAR(50),
    origem VARCHAR(100),
    prioridade VARCHAR(50),
    data_solicitacao TIMESTAMP,
    motivo_pausa TEXT,
    tempo_em_pausa_ms BIGINT,
    inicio_ultima_pausa TIMESTAMP,
    criado_em TIMESTAMP DEFAULT NOW()
);

-- 8. Tabela de configurações
CREATE TABLE IF NOT EXISTS configuracoes (
    id SERIAL PRIMARY KEY,
    chave TEXT UNIQUE NOT NULL,
    valor TEXT
);

-- 9. Tabela de atendimentos Bimer abertos
CREATE TABLE IF NOT EXISTS atendimentos_bimer_abertos (
    id SERIAL PRIMARY KEY,
    pessoa TEXT,
    numero_atendimento TEXT,
    data_proximo_contato TEXT,
    data_atualizacao TIMESTAMP DEFAULT NOW()
);

-- ================================================
-- ÍNDICES PARA PERFORMANCE
-- ================================================

CREATE INDEX IF NOT EXISTS idx_escala_data ON escala(data);
CREATE INDEX IF NOT EXISTS idx_escala_usuario ON escala(usuario_id);
CREATE INDEX IF NOT EXISTS idx_escala_setor ON escala(setor_id);
CREATE INDEX IF NOT EXISTS idx_usuarios_ativo ON usuarios(ativo);
CREATE INDEX IF NOT EXISTS idx_usuarios_setor ON usuarios(setor_id);
CREATE INDEX IF NOT EXISTS idx_observacoes_data ON observacoes_dia(data);
CREATE INDEX IF NOT EXISTS idx_observacoes_setor ON observacoes_dia(setor_id);
CREATE INDEX IF NOT EXISTS idx_alinhamentos_data ON alinhamentos(data_ocorrencia);
CREATE INDEX IF NOT EXISTS idx_atendimentos_setor ON atendimentos(setor_id);

-- ================================================
-- INSERIR CONFIGURAÇÃO PADRÃO
-- ================================================

INSERT INTO configuracoes (chave, valor) 
VALUES ('webhook_geral', '') 
ON CONFLICT (chave) DO NOTHING;

-- ================================================
-- FIM DO SCRIPT
-- ================================================

-- Verificar tabelas criadas
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;
