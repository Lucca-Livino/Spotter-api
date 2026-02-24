import { DatabaseError as PgDatabaseError } from "pg";
import HttpStatusCode from "../helpers/httpStatusCode";

// Mapa de códigos de erro do PostgreSQL para status HTTP e mensagens amigáveis
const PG_ERROR_CODES: Record<string, { status: number; message: string }> = {
    '23505': { status: HttpStatusCode.CONFLICT.code,              message: 'Já existe um registro com esse valor' },
    '23503': { status: HttpStatusCode.UNPROCESSABLE_ENTITY.code,  message: 'Referência inválida: o registro relacionado não existe' },
    '23502': { status: HttpStatusCode.UNPROCESSABLE_ENTITY.code,  message: 'Campo obrigatório não informado' },
    '23514': { status: HttpStatusCode.UNPROCESSABLE_ENTITY.code,  message: 'Valor não atende às restrições do banco de dados' },
    '22001': { status: HttpStatusCode.UNPROCESSABLE_ENTITY.code,  message: 'Valor muito longo para o campo' },
    '22003': { status: HttpStatusCode.UNPROCESSABLE_ENTITY.code,  message: 'Valor numérico fora do intervalo permitido' },
    '42703': { status: HttpStatusCode.BAD_REQUEST.code,           message: 'Coluna não encontrada no banco de dados' },
    '08006': { status: HttpStatusCode.INTERNAL_SERVER_ERROR.code, message: 'Falha na conexão com o banco de dados' },
    '08001': { status: HttpStatusCode.INTERNAL_SERVER_ERROR.code, message: 'Não foi possível conectar ao banco de dados' },
    '57014': { status: HttpStatusCode.INTERNAL_SERVER_ERROR.code, message: 'Consulta cancelada por tempo limite excedido' },
};

export class DatabaseError extends Error {
    public readonly statusCode: number;
    public readonly detail: string | null;
    public readonly constraint: string | null;
    public readonly pgCode: string | null;

    constructor(
        message: string,
        statusCode: number = HttpStatusCode.INTERNAL_SERVER_ERROR.code,
        detail: string | null = null,
        constraint: string | null = null,
        pgCode: string | null = null,
    ) {
        super(message);
        this.name = 'DatabaseError';
        this.statusCode = statusCode;
        this.detail = detail;
        this.constraint = constraint;
        this.pgCode = pgCode;
    }

    toJSON() {
        return {
            name: this.name,
            message: this.message,
            ...(this.detail     && { detail: this.detail }),
            ...(this.constraint && { constraint: this.constraint }),
        };
    }
}

/**
 * Converte qualquer erro do Drizzle/pg em DatabaseError com mensagem amigável.
 *
 * Com drizzle-orm/node-postgres + Pool do `pg`, o Drizzle envolve o erro
 * original em um DrizzleError — o erro real do PostgreSQL fica em error.cause.
 * Por isso verificamos tanto o próprio erro quanto error.cause.
 */
export function parseDatabaseError(error: unknown, context: string): DatabaseError {
    // Drizzle/node-postgres: erro pg pode estar diretamente ou em .cause
    const candidates = [error, (error as any)?.cause];

    for (const candidate of candidates) {
        if (candidate instanceof PgDatabaseError) {
            const pgCode = candidate.code;

            if (pgCode && PG_ERROR_CODES[pgCode]) {
                const { status, message } = PG_ERROR_CODES[pgCode];
                const detail     = candidate.detail     ?? null;
                const constraint = candidate.constraint ?? null;

                console.error(`[DatabaseError] [${context}] PG ${pgCode} - ${message}`, { detail, constraint });
                return new DatabaseError(message, status, detail, constraint, pgCode ?? null);
            }

            // Código pg desconhecido mas ainda é um erro de banco
            console.error(`[DatabaseError] [${context}] PG código desconhecido (${pgCode}):`, candidate.message);
            return new DatabaseError(candidate.message);
        }
    }

    // Erro genérico (ex: DrizzleError sem causa pg)
    const message = error instanceof Error ? error.message : 'Erro desconhecido no banco de dados';
    console.error(`[DatabaseError] [${context}] Erro não mapeado:`, error);
    return new DatabaseError(message);
}
