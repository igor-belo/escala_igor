const pool = require('../config/db');
const cron = require('node-cron');

/**
 * Função para limpar escalas antigas (mantém apenas últimos 2 meses)
 */
async function limparEscalasAntigas() {
    try {
        console.log('[CLEANUP] Iniciando limpeza de escalas antigas...');
        
        // Calcula a data de 2 meses atrás
        const dataLimite = new Date();
        dataLimite.setMonth(dataLimite.getMonth() - 2);
        const dataLimiteStr = dataLimite.toISOString().split('T')[0];
        
        // Remove escalas antigas
        const result = await pool.query(
            'DELETE FROM escala WHERE data < $1',
            [dataLimiteStr]
        );
        
        console.log(`[CLEANUP] ${result.rowCount} registros de escala removidos (anteriores a ${dataLimiteStr})`);
        
        // Limpa observações antigas também
        const resultObs = await pool.query(
            'DELETE FROM observacoes_dia WHERE data < $1',
            [dataLimiteStr]
        );
        
        console.log(`[CLEANUP] ${resultObs.rowCount} observações removidas (anteriores a ${dataLimiteStr})`);
        
        // Limpa alinhamentos antigos (se existir a tabela)
        try {
            const resultAlin = await pool.query(
                'DELETE FROM alinhamentos WHERE data < $1',
                [dataLimiteStr]
            );
            console.log(`[CLEANUP] ${resultAlin.rowCount} alinhamentos removidos (anteriores a ${dataLimiteStr})`);
        } catch (error) {
            // Tabela pode não existir, apenas ignora
        }
        
        console.log('[CLEANUP] Limpeza concluída com sucesso!');
        
        return {
            sucesso: true,
            escalasRemovidas: result.rowCount,
            observacoesRemovidas: resultObs.rowCount,
            dataLimite: dataLimiteStr
        };
        
    } catch (error) {
        console.error('[CLEANUP] Erro ao limpar escalas antigas:', error.message);
        throw error;
    }
}

/**
 * Configura a tarefa agendada para rodar diariamente à meia-noite
 */
function iniciarLimpezaAutomatica() {
    // Executa todo dia às 00:00 (meia-noite)
    cron.schedule('0 0 * * *', async () => {
        console.log('[CLEANUP] Executando limpeza automática agendada...');
        try {
            await limparEscalasAntigas();
        } catch (error) {
            console.error('[CLEANUP] Erro na limpeza automática:', error.message);
        }
    });
    
    console.log('[CLEANUP] Limpeza automática configurada para rodar diariamente às 00:00');
}

/**
 * Executa limpeza manual (pode ser chamado via endpoint)
 */
async function executarLimpezaManual() {
    return await limparEscalasAntigas();
}

module.exports = {
    iniciarLimpezaAutomatica,
    executarLimpezaManual,
    limparEscalasAntigas
};
