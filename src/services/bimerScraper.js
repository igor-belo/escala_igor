
const pool = require('../config/db');

async function runBimerScraper() {
    if (!process.env.BIMER_USER || !process.env.BIMER_PASS) {
        console.error('[BimerScraper] Erro: BIMER_USER ou BIMER_PASS não configurados no .env');
        return;
    }
    
    console.log('[BimerScraper] Iniciando scraping diário...');
    
    // Limpa a tabela antes da busca para não manter atendimentos que já não estão mais com os analistas
    await pool.query('TRUNCATE TABLE atendimentos_bimer_abertos RESTART IDENTITY');
    
    let browser;
    try {
        const puppeteer = (await import('puppeteer')).default;
        browser = await puppeteer.launch({ 
            headless: 'new',
            args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1366,768'] 
        });
        
        const page = await browser.newPage();
        await page.setViewport({ width: 1366, height: 768 });
        
        console.log('[BimerScraper] Acessando CRM...');
        await page.goto('https://bimerup.alterdata.com.br/bimerup-v3/crm/atendimentos', { waitUntil: 'networkidle2' });
        
        // Verifica se precisa logar
        await new Promise(r => setTimeout(r, 5000));
        const currentUrl = page.url();
        
        if (currentUrl.includes('login') || currentUrl.includes('passaporte') || currentUrl.endsWith('/#/')) {
            console.log('[BimerScraper] Preenchendo login...');
            
            // Tentativa genérica de login
            const userInput = await page.$('input[type="email"], input[type="text"], input[name="login"], input[name="username"], input[name="email"]');
            if (userInput) await userInput.type(process.env.BIMER_USER);
            
            const passInput = await page.$('input[type="password"], input[name="password"]');
            if (passInput) await passInput.type(process.env.BIMER_PASS);
            
            const loginBtn = await page.evaluateHandle(() => {
                const buttons = Array.from(document.querySelectorAll('button'));
                return buttons.find(b => b.innerText.toLowerCase().includes('entrar'));
            });

            if (loginBtn) {
                await loginBtn.click();
                await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 30000 }).catch(() => {});
            } else {
                await page.keyboard.press('Enter');
                await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 30000 }).catch(() => {});
            }
        }

        console.log('[BimerScraper] Aguardando carregamento após login...');
        await new Promise(r => setTimeout(r, 10000));
        
        if (!page.url().includes('crm/atendimentos')) {
            console.log('[BimerScraper] Navegando para a página de Atendimentos...');
            await page.goto('https://bimerup.alterdata.com.br/bimerup-v3/crm/atendimentos', { waitUntil: 'networkidle2' });
            await new Promise(r => setTimeout(r, 10000));
        } else {
            await new Promise(r => setTimeout(r, 5000));
        }

        // Verifica se caiu na tela de "Acesso negado" do Vue Router (comum em SPAs se a rota for acessada antes do token carregar)
        const acessoNegado = await page.$('.acesso-negado, [data-test="acesso-negado-view"]');
        if (acessoNegado) {
            console.log('[BimerScraper] Tela de Acesso Negado detectada. Atualizando a página para revalidar a sessão...');
            await page.reload({ waitUntil: 'networkidle2' });
            await new Promise(r => setTimeout(r, 10000));
        }
        
        // Tenta aplicar o filtro "atendimentos em aberto igor geral"
        console.log('[BimerScraper] Aplicando filtro...');
        await page.evaluate(() => {
            // Procura o botão de filtros
            const buttons = Array.from(document.querySelectorAll('button, div, span'));
            const filterBtn = buttons.find(b => b.innerText && b.innerText.toLowerCase().includes('atendimentos em aber'));
            if (filterBtn) filterBtn.click();
        });
        
        await new Promise(r => setTimeout(r, 2000));
        
        await page.evaluate(() => {
            // Procura a opção específica
            const options = Array.from(document.querySelectorAll('li, div, span, a'));
            const specificOption = options.find(o => o.innerText && o.innerText.toLowerCase().trim() === 'atendimentos em aberto igor geral');
            if (specificOption) specificOption.click();
        });
        
        console.log('[BimerScraper] Aguardando lista atualizar...');
        await new Promise(r => setTimeout(r, 15000));
        
        // Extrai os dados dos cards
        console.log('[BimerScraper] Lendo atendimentos...');
        const dadosExtraidos = await page.evaluate(() => {
            const extraidos = [];
            // Aqui estamos buscando todos os elementos que podem ser um card
            // Essa lógica procura padrões de texto (Número de 10 dígitos + Data)
            const cards = Array.from(document.querySelectorAll('div')).filter(div => {
                const txt = div.innerText || '';
                // Filtra divs que parecem ser o card em si (têm data e um número grande)
                return txt.match(/\d{2}\/\d{2}\/\d{4}/) && txt.match(/\d{10}/);
            });
            
            // Para não duplicar (pois cards têm divs filhas), usamos um Set de números de atendimento
            const atendimentosVistos = new Set();
            
            for (const card of cards) {
                const text = card.innerText;
                
                // Pega número do atendimento (ex: 0184672740)
                const numMatch = text.match(/\b(\d{10})\b/);
                // Pega data de próximo contato (ex: 27/07/2026)
                const dataMatch = text.match(/\b(\d{2}\/\d{2}\/\d{4})\b/);
                
                if (numMatch && dataMatch) {
                    const numero = numMatch[1];
                    const data = dataMatch[1];
                    
                    if (atendimentosVistos.has(numero)) continue;
                    atendimentosVistos.add(numero);
                    
                    // A "pessoa" geralmente está perto do final do card (ex: LAYOUTSHOP)
                    // Vamos pegar a última palavra em maiúsculo com mais de 3 letras
                    const words = text.split(/\s+/);
                    let pessoa = "DESCONHECIDO";
                    for (let i = words.length - 1; i >= 0; i--) {
                        if (words[i] === words[i].toUpperCase() && words[i].length > 3 && !words[i].match(/\d/)) {
                            pessoa = words[i];
                            break;
                        }
                    }
                    
                    if (pessoa.toLowerCase().includes('igorbelo')) {
                        continue;
                    }
                    
                    extraidos.push({
                        pessoa,
                        numero_atendimento: numero,
                        data_proximo_contato: data
                    });
                }
            }
            return extraidos;
        });
        const pessoasEncontradas = [...new Set(dadosExtraidos.map(d => d.pessoa))];
        console.log(`[BimerScraper] Pessoas extraídas dos cards:`, pessoasEncontradas);
        console.log(`[BimerScraper] Encontrados ${dadosExtraidos.length} atendimentos.`);
        
        if (dadosExtraidos.length > 0) {
            for (const item of dadosExtraidos) {
                await pool.query(
                    'INSERT INTO atendimentos_bimer_abertos (pessoa, numero_atendimento, data_proximo_contato) VALUES ($1, $2, $3)',
                    [item.pessoa, item.numero_atendimento, item.data_proximo_contato]
                );
            }
            console.log('[BimerScraper] Dados salvos no banco com sucesso!');
        } else {
            console.log('[BimerScraper] Nenhum atendimento encontrado. Verifique se o filtro retornou resultados ou se a estrutura HTML mudou.');
        }
        
    } catch (e) {
        console.error('[BimerScraper] Erro durante a execução:', e);
    } finally {
        if (browser) await browser.close();
    }
}

module.exports = { runBimerScraper };
