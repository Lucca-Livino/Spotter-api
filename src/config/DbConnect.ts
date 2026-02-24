import 'dotenv/config';
import { drizzle, NodePgDatabase } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './db/schema';
import chalk from 'chalk';

const pool = new Pool({
    connectionString: process.env.DATABASE_URL!,
});

const DbURL = process.env.DATABASE_URL

export let DataBase = drizzle(pool, { schema });

export class DbConnect {
    static async connect(): Promise<void> {
        try {
            const client = await pool.connect();
            client.release();
            console.log(chalk.yellowBright(`STATUS DO BANCO DE DADOS... \n${chalk.greenBright('Conectado com sucesso!')}`));
            console.log(chalk.blueBright(`BANCO DE DADOS RODANDO EM: \n${chalk.greenBright(DbURL)}`))
        } catch (error) {
            console.error(chalk.yellowBright(`STATUS DO BANCO DE DADOS: ${chalk.redBright('Falha na conexão!')}`));
            process.exit(1);
        }
    }

    static async disconnect(): Promise<void> {
        try {
            await pool.end();
            console.log(chalk.yellowBright('Conexão com o banco de dados encerrada com sucesso!'));
        } catch (error) {
            console.error(chalk.redBright('Erro ao desconectar do banco de dados:'), error);
        }
    }
}