'use strict';

require('dotenv').config();
const { execSync } = require('child_process');
const { Pool } = require('pg');

const TEST_DB_URL = process.env.DATABASE_URL_TEST;

if (!TEST_DB_URL) {
    console.error('DATABASE_URL_TEST não está definida no .env');
    process.exit(1);
}

// Extrai nome do banco e URL base
const lastSlash = TEST_DB_URL.lastIndexOf('/');
const dbName = TEST_DB_URL.substring(lastSlash + 1);
const baseUrl = TEST_DB_URL.substring(0, lastSlash);

async function createDatabase() {
    const pool = new Pool({ connectionString: `${baseUrl}/postgres` });
    try {
        await pool.query(`CREATE DATABASE "${dbName}"`);
        console.log(`✓  Banco "${dbName}" criado com sucesso`);
    } catch (err) {
        if (err.code === '42P04') {
            console.log(`→  Banco "${dbName}" já existe, pulando criação`);
        } else {
            throw err;
        }
    } finally {
        await pool.end();
    }
}

async function applySchema() {
    console.log(`✓  Aplicando schema em "${dbName}"...`);
    execSync('npx drizzle-kit push', {
        env: { ...process.env, DATABASE_URL: TEST_DB_URL },
        stdio: 'inherit',
    });
    console.log('✓  Schema aplicado com sucesso');
}

(async () => {
    try {
        await createDatabase();
        await applySchema();
        console.log('\nBanco de teste pronto.\n');
    } catch (err) {
        console.error('Erro no setup do banco de teste:', err.message);
        process.exit(1);
    }
})();
