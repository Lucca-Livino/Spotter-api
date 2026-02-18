import 'dotenv/config';
import { drizzle, NodePgDatabase } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './db/schema';
import chalk from 'chalk';

const pool = new Pool({
    connectionString: process.env.DATABASE_URL!,
});

export let DataBase = drizzle(pool, { schema });

export class DbConnect {
    static async connect(): Promise<void> {
        try {
            const client = await pool.connect();
            client.release();
            console.log(chalk.yellowBright(`Status do banco de dados: ${chalk.greenBright('Conectado com sucesso!')}`));
        } catch (error) {
            console.error(chalk.yellowBright(`Status do banco de dados: ${chalk.redBright('Falha na conexão!')}`));
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