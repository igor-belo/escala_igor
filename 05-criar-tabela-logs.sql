-- ================================================
-- CRIAR TABELA DE LOGS DE AUDITORIA
-- Execute no Supabase SQL Editor
-- ================================================

CREATE TABLE IF NOT EXISTS logs_auditoria (
    id SERIAL PRIMARY KEY,
    usuario_id INTEGER REFERENCES usuarios(id),
    usuario_nome VARCHAR(255),
    acao VARCHAR(100) NOT NULL,
    tabela VARCHAR(50),
    registro_id INTEGER,
    detalhes JSONB,
    ip_address VARCHAR(45),
    user_agent TEXT,
    criado_em TIMESTAMP DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX idx_logs_usuario ON logs_auditoria(usuario_id);
CREATE INDEX idx_logs_acao ON logs_auditoria(acao);
CREATE INDEX idx_logs_tabela ON logs_auditoria(tabela);
CREATE INDEX idx_logs_data ON logs_auditoria(criado_em);

-- Verificar se foi criada
SELECT * FROM logs_auditoria LIMIT 1;

-- ================================================
-- TIPOS DE AÇÕES QUE SERÃO REGISTRADAS:
-- ================================================
-- USUARIO_CRIADO
-- USUARIO_EDITADO
-- USUARIO_INATIVADO
-- USUARIO_ATIVADO
-- SENHA_ALTERADA
-- SENHA_RESETADA
-- ESCALA_CRIADA
-- ESCALA_EDITADA
-- ESCALA_EXCLUIDA
-- AVISO_CRIADO
-- AVISO_EDITADO
-- AVISO_EXCLUIDO
-- ATENDIMENTO_INICIADO
-- ATENDIMENTO_PAUSADO
-- ATENDIMENTO_RETOMADO
-- ATENDIMENTO_FINALIZADO
-- ATENDIMENTO_TRANSFERIDO
-- ALINHAMENTO_CRIADO
-- ALINHAMENTO_MARCADO_ALINHADO
-- LOGIN_SUCESSO
-- LOGIN_FALHA
-- LOGOUT
