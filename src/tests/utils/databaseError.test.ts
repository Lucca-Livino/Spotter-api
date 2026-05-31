import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import { DatabaseError, parseDatabaseError } from '../../utils/errors/DatabaseError';
import { DatabaseError as PgDatabaseError } from 'pg';

// Cria um PgDatabaseError simulado com os campos necessários
function makePgError(code: string, message = 'pg error', detail?: string, constraint?: string): PgDatabaseError {
    const err = Object.create((PgDatabaseError as any).prototype) as PgDatabaseError;
    (err as any).message = message;
    (err as any).code = code;
    (err as any).detail = detail ?? null;
    (err as any).constraint = constraint ?? null;
    return err;
}

describe('DatabaseError class', () => {
    it('cria instância com mensagem e statusCode padrão', () => {
        const err = new DatabaseError('mensagem de erro');

        expect(err.message).toBe('mensagem de erro');
        expect(err.statusCode).toBe(500);
        expect(err.detail).toBeNull();
        expect(err.constraint).toBeNull();
        expect(err.pgCode).toBeNull();
        expect(err.name).toBe('DatabaseError');
    });

    it('cria instância com todos os parâmetros', () => {
        const err = new DatabaseError('conflito', 409, 'detalhe', 'unique_email', '23505');

        expect(err.message).toBe('conflito');
        expect(err.statusCode).toBe(409);
        expect(err.detail).toBe('detalhe');
        expect(err.constraint).toBe('unique_email');
        expect(err.pgCode).toBe('23505');
    });

    it('é instanceof Error', () => {
        const err = new DatabaseError('erro');
        expect(err).toBeInstanceOf(Error);
    });

    it('toJSON inclui name, message sem detail/constraint quando nulos', () => {
        const err = new DatabaseError('mensagem', 500, null, null, null);
        const json = err.toJSON();

        expect(json).toEqual({
            name: 'DatabaseError',
            message: 'mensagem',
        });
        expect(json).not.toHaveProperty('detail');
        expect(json).not.toHaveProperty('constraint');
    });

    it('toJSON inclui detail quando presente', () => {
        const err = new DatabaseError('msg', 422, 'Key (email)=(x) already exists', null, null);
        const json = err.toJSON();

        expect(json.detail).toBe('Key (email)=(x) already exists');
        expect(json).not.toHaveProperty('constraint');
    });

    it('toJSON inclui constraint quando presente', () => {
        const err = new DatabaseError('msg', 409, null, 'unique_email', null);
        const json = err.toJSON();

        expect(json.constraint).toBe('unique_email');
        expect(json).not.toHaveProperty('detail');
    });

    it('toJSON inclui detail e constraint quando ambos presentes', () => {
        const err = new DatabaseError('msg', 409, 'detalhe', 'constraint_name', '23505');
        const json = err.toJSON();

        expect(json.detail).toBe('detalhe');
        expect(json.constraint).toBe('constraint_name');
    });
});

describe('parseDatabaseError', () => {
    let consoleSpy: any;

    beforeEach(() => {
        consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    });

    afterEach(() => {
        consoleSpy?.mockRestore();
    });

    it('mapeia PG code 23505 (CONFLICT) diretamente', () => {
        const pgErr = makePgError('23505', 'duplicate key', 'Key (email) already exists', 'users_email_key');
        const result = parseDatabaseError(pgErr, 'test context');

        expect(result).toBeInstanceOf(DatabaseError);
        expect(result.statusCode).toBe(409);
        expect(result.message).toMatch(/já existe/i);
        expect(result.detail).toBe('Key (email) already exists');
        expect(result.constraint).toBe('users_email_key');
        expect(result.pgCode).toBe('23505');
    });

    it('mapeia PG code 23503 (FOREIGN KEY) para 422', () => {
        const pgErr = makePgError('23503');
        const result = parseDatabaseError(pgErr, 'test');

        expect(result.statusCode).toBe(422);
        expect(result.message).toMatch(/referência inválida/i);
    });

    it('mapeia PG code 23502 (NOT NULL) para 422', () => {
        const pgErr = makePgError('23502');
        const result = parseDatabaseError(pgErr, 'test');

        expect(result.statusCode).toBe(422);
        expect(result.message).toMatch(/campo obrigatório/i);
    });

    it('mapeia PG code 08006 (CONNECTION FAILURE) para 500', () => {
        const pgErr = makePgError('08006');
        const result = parseDatabaseError(pgErr, 'test');

        expect(result.statusCode).toBe(500);
        expect(result.message).toMatch(/falha na conexão/i);
    });

    it('mapeia PG code desconhecido com mensagem do erro original', () => {
        const pgErr = makePgError('99999', 'erro pg desconhecido');
        const result = parseDatabaseError(pgErr, 'test');

        expect(result).toBeInstanceOf(DatabaseError);
        expect(result.message).toBe('erro pg desconhecido');
        expect(result.statusCode).toBe(500); // default
    });

    it('lida com PgDatabaseError dentro de .cause (padrão Drizzle)', () => {
        const pgErr = makePgError('23505', 'dup key', 'detalhe', 'constraint');
        const drizzleWrapper = new Error('DrizzleError');
        (drizzleWrapper as any).cause = pgErr;

        const result = parseDatabaseError(drizzleWrapper, 'test drizzle');

        expect(result.statusCode).toBe(409);
        expect(result.pgCode).toBe('23505');
    });

    it('lida com erro genérico (não PgDatabaseError)', () => {
        const genericError = new Error('erro genérico qualquer');
        const result = parseDatabaseError(genericError, 'test generic');

        expect(result).toBeInstanceOf(DatabaseError);
        expect(result.message).toBe('erro genérico qualquer');
        expect(result.statusCode).toBe(500);
    });

    it('lida com valor não-Error (string)', () => {
        const result = parseDatabaseError('string de erro', 'test string');

        expect(result).toBeInstanceOf(DatabaseError);
        expect(result.message).toBe('Erro desconhecido no banco de dados');
    });

    it('lida com valor não-Error (null)', () => {
        const result = parseDatabaseError(null, 'test null');

        expect(result).toBeInstanceOf(DatabaseError);
        expect(result.message).toBe('Erro desconhecido no banco de dados');
    });

    it('mapeia PG code 22001 (VALUE TOO LONG) para 422', () => {
        const pgErr = makePgError('22001');
        const result = parseDatabaseError(pgErr, 'test');

        expect(result.statusCode).toBe(422);
        expect(result.message).toMatch(/muito longo/i);
    });

    it('mapeia PG code 42703 (COLUMN NOT FOUND) para 400', () => {
        const pgErr = makePgError('42703');
        const result = parseDatabaseError(pgErr, 'test');

        expect(result.statusCode).toBe(400);
        expect(result.message).toMatch(/coluna não encontrada/i);
    });
});
