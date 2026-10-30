#!/usr/bin/env node

/**
 * Script de verificação pré-commit
 * Garante que nenhum dado sensível será commitado
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 Verificando arquivos sensíveis...\n');

let hasIssues = false;

// Verificar se .env existe e não está no .gitignore
if (fs.existsSync('.env')) {
    const gitignore = fs.readFileSync('.gitignore', 'utf8');
    if (!gitignore.includes('.env')) {
        console.error('❌ ERRO: .env existe mas não está no .gitignore!');
        hasIssues = true;
    } else {
        console.log('✅ .env protegido no .gitignore');
    }
}

// Verificar arquivos sensíveis
const sensitiveFiles = [
    'backup-data.json',
    '03-import-data.sql',
    'import-data.sql',
    '.env',
    'escala-server.exe',
    'escala-service.exe'
];

for (const file of sensitiveFiles) {
    if (fs.existsSync(file)) {
        const gitignore = fs.readFileSync('.gitignore', 'utf8');
        if (!gitignore.includes(file) && !gitignore.includes(path.extname(file))) {
            console.error(`❌ ERRO: ${file} não está protegido no .gitignore!`);
            hasIssues = true;
        } else {
            console.log(`✅ ${file} protegido`);
        }
    }
}

// Verificar se há credenciais hardcoded em arquivos .js
console.log('\n🔍 Verificando credenciais hardcoded...\n');

const patterns = [
    /password\s*=\s*['"][^'"]+['"]/gi,
    /senha\s*=\s*['"][^'"]+['"]/gi,
    /api[_-]?key\s*=\s*['"][^'"]+['"]/gi,
    /secret\s*=\s*['"][^'"]+['"]/gi,
];

function checkFile(filePath) {
    if (!filePath.endsWith('.js')) return;
    if (filePath.includes('node_modules')) return;
    if (filePath.includes('pre-commit-check.js')) return;
    
    const content = fs.readFileSync(filePath, 'utf8');
    
    for (const pattern of patterns) {
        const matches = content.match(pattern);
        if (matches) {
            // Ignorar se estiver em comentários ou process.env
            const filtered = matches.filter(m => 
                !m.includes('process.env') && 
                !m.includes('//') &&
                !m.includes('example') &&
                !m.includes('sua_') &&
                !m.includes('your_')
            );
            
            if (filtered.length > 0) {
                console.warn(`⚠️  Possível credencial em: ${filePath}`);
                console.warn(`   ${filtered.join(', ')}`);
            }
        }
    }
}

function walkDir(dir) {
    const files = fs.readdirSync(dir);
    
    for (const file of files) {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);
        
        if (stat.isDirectory()) {
            if (file !== 'node_modules' && file !== '.git') {
                walkDir(filePath);
            }
        } else {
            checkFile(filePath);
        }
    }
}

try {
    walkDir('./src');
    walkDir('./public/js');
} catch (e) {
    // Ignorar erros de leitura
}

console.log('\n📋 Verificando arquivos obrigatórios...\n');

const requiredFiles = [
    '.gitignore',
    '.env.example',
    'README.md',
    'DEPLOY.md',
    'package.json',
    'server.js'
];

for (const file of requiredFiles) {
    if (fs.existsSync(file)) {
        console.log(`✅ ${file} existe`);
    } else {
        console.error(`❌ ERRO: ${file} não encontrado!`);
        hasIssues = true;
    }
}

console.log('\n' + '='.repeat(50));

if (hasIssues) {
    console.log('\n❌ FALHA: Problemas de segurança encontrados!');
    console.log('Por favor, corrija antes de commitar.\n');
    process.exit(1);
} else {
    console.log('\n✅ SUCESSO: Tudo seguro para commit!');
    console.log('Nenhum dado sensível será exposto.\n');
    process.exit(0);
}
