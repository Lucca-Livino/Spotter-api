jest.mock('../../middlewares/authMiddleware', () => ({
    authMiddleware: jest.fn(),
}));

import { randomUUID } from 'crypto';
import express from 'express';
import request from 'supertest';
import { jest, describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from '@jest/globals';
import { eq, inArray } from 'drizzle-orm';
import treinadorRoutes from '../../routes/treinadorRoutes';
import { DbConnect, DataBase } from '../../config/DbConnect';
import { authMiddleware } from '../../middlewares/authMiddleware';
import { academia, treinador, user } from '../../config/db/schema';

const RUN_ID = Date.now().toString(36);

let app: express.Express;
let academiaId: string;
let authUserId: string;
let secondAuthUserId: string;

let treinadorBaseId: string;
let treinadorBaseUserId: string;

const tempTreinadorIds: string[] = [];
const tempUserIds: string[] = [];

let warnSpy: any;
let errorSpy: any;
let logSpy: any;

const INVALID_UUID = 'nao-e-uuid';
const NOT_FOUND_UUID = '00000000-0000-0000-0000-000000000000';

function asAuth(userId: string) {
    (authMiddleware as any).mockImplementation((req: any, _res: any, next: any) => {
        req.user = { id: userId };
        req.authSession = { id: `session-${userId}` };
        next();
    });
}

function asNoAuth() {
    (authMiddleware as any).mockImplementationOnce((_req: any, res: any) => {
        res.status(401).json({
            error: true,
            code: 401,
            message: 'Não autorizado. Faça login para continuar.',
            data: null,
            errors: [],
        });
    });
}

async function criarUsuario(prefix: string): Promise<string> {
    const id = randomUUID();
    const now = new Date();

    await DataBase.insert(user).values({
        id,
        name: `${prefix} ${RUN_ID}`,
        email: `${prefix}_${RUN_ID}_${randomUUID()}@test.local`,
        emailVerified: false,
        createdAt: now,
        updatedAt: now,
    });

    tempUserIds.push(id);
    return id;
}

function payloadTreinador(extra: Record<string, unknown> = {}) {
    return {
        nome: `Treinador E2E ${RUN_ID}`,
        data_nascimento: '1988-11-20',
        sexo: 'M',
        cref: `CREF-${RUN_ID}-${randomUUID().slice(0, 8)}`,
        turnos: ['MANHA', 'NOITE'],
        especializacao: 'Hipertrofia',
        graduacao: 'Educação Física',
        academia_id: academiaId,
        ...extra,
    };
}

function extractMessages(res: any) {
    return (res.body.errors ?? []).map((e: any) => e.message).join(' ');
}

beforeAll(async () => {
    warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});

    app = express();
    await DbConnect.connect();
    app.use(express.json());
    app.use('/api', treinadorRoutes);

    const [ac] = await DataBase.insert(academia).values({
        nome: `Academia Treinador E2E ${RUN_ID}`,
        endereco_numero: '100',
        endereco_rua: 'Rua do Treinador',
        endereco_bairro: 'Centro',
        endereco_cidade: 'Porto Velho',
        endereco_estado: 'RO',
    }).returning({ id: academia.id });
    academiaId = ac.id;

    const now = new Date();

    authUserId = randomUUID();
    await DataBase.insert(user).values({
        id: authUserId,
        name: 'Auth Treinador Teste',
        email: `auth_treinador_${RUN_ID}@test.local`,
        emailVerified: false,
        createdAt: now,
        updatedAt: now,
    });

    secondAuthUserId = randomUUID();
    await DataBase.insert(user).values({
        id: secondAuthUserId,
        name: 'Second Auth Treinador Teste',
        email: `auth2_treinador_${RUN_ID}@test.local`,
        emailVerified: false,
        createdAt: now,
        updatedAt: now,
    });

    treinadorBaseUserId = randomUUID();
    await DataBase.insert(user).values({
        id: treinadorBaseUserId,
        name: 'Treinador Base Teste',
        email: `treinador_base_${RUN_ID}@test.local`,
        emailVerified: false,
        createdAt: now,
        updatedAt: now,
    });

    const [treinadorBase] = await DataBase.insert(treinador).values({
        user_id: treinadorBaseUserId,
        nome: `Treinador Base ${RUN_ID}`,
        data_nascimento: '1984-06-10',
        sexo: 'F',
        cref: `CREF-BASE-${RUN_ID}`,
        turnos: ['TARDE'],
        especializacao: 'Condicionamento físico',
        graduacao: 'Educação Física',
        academia_id: academiaId,
    }).returning({ id: treinador.id });
    treinadorBaseId = treinadorBase.id;

    asAuth(authUserId);
}, 30000);

beforeEach(() => {
    asAuth(authUserId);
});

afterEach(async () => {
    if (tempTreinadorIds.length > 0) {
        await DataBase.delete(treinador).where(inArray(treinador.id, [...tempTreinadorIds])).catch(() => {});
        tempTreinadorIds.length = 0;
    }

    if (tempUserIds.length > 0) {
        await DataBase.delete(user).where(inArray(user.id, [...tempUserIds])).catch(() => {});
        tempUserIds.length = 0;
    }

    asAuth(authUserId);
});

afterAll(async () => {
    const todosTreinadores = [treinadorBaseId, ...tempTreinadorIds];
    const treinadoresUnicos = [...new Set(todosTreinadores.filter(Boolean))];

    if (treinadoresUnicos.length > 0) {
        await DataBase.delete(treinador).where(inArray(treinador.id, treinadoresUnicos)).catch(() => {});
    }

    const usersParaRemover = [authUserId, secondAuthUserId, treinadorBaseUserId, ...tempUserIds];
    const usersUnicos = [...new Set(usersParaRemover.filter(Boolean))];

    if (usersUnicos.length > 0) {
        await DataBase.delete(user).where(inArray(user.id, usersUnicos)).catch(() => {});
    }

    await DataBase.delete(academia).where(eq(academia.id, academiaId)).catch(() => {});
    await DbConnect.disconnect();

    warnSpy?.mockRestore();
    errorSpy?.mockRestore();
    logSpy?.mockRestore();
}, 30000);

describe('GET /treinadores', () => {
    it('usuário autenticado lista treinadores com estrutura paginada → 200', async () => {
        const res = await request(app).get('/api/treinadores');

        expect(res.status).toBe(200);
        expect(Array.isArray(res.body.data.dados)).toBe(true);
        expect(res.body.data).toHaveProperty('total');
        expect(res.body.data).toHaveProperty('page');
        expect(res.body.data).toHaveProperty('limite');
        expect(res.body.data).toHaveProperty('totalPages');
    });

    it('query vazia usa valores padrão page=1 e limite=10 → 200', async () => {
        const res = await request(app).get('/api/treinadores');

        expect(res.status).toBe(200);
        expect(res.body.data.page).toBe(1);
        expect(res.body.data.limite).toBe(10);
    });

    it('paginação explícita page=1&limite=1 respeita metadados → 200', async () => {
        const res = await request(app).get('/api/treinadores?page=1&limite=1');

        expect(res.status).toBe(200);
        expect(res.body.data.page).toBe(1);
        expect(res.body.data.limite).toBe(1);
        expect(res.body.data.dados.length).toBeLessThanOrEqual(1);
    });

    it('page inválido (0) → 422', async () => {
        const res = await request(app).get('/api/treinadores?page=0');

        expect(res.status).toBe(422);
        expect(extractMessages(res)).toMatch(/page deve ser maior que 0/i);
    });

    it('limite inválido (>100) → 422', async () => {
        const res = await request(app).get('/api/treinadores?limite=101');

        expect(res.status).toBe(422);
        expect(extractMessages(res)).toMatch(/limite deve ser entre 1 e 100/i);
    });

    it('limite não numérico → 422', async () => {
        const res = await request(app).get('/api/treinadores?limite=abc');

        expect(res.status).toBe(422);
        expect(extractMessages(res)).toMatch(/limite deve ser entre 1 e 100/i);
    });

    it('campo extra na query (.strict()) → 422', async () => {
        const res = await request(app).get('/api/treinadores?foo=bar');

        expect(res.status).toBe(422);
        expect(res.body.error).toBe(true);
    });

    it('sem autenticação → 401', async () => {
        asNoAuth();
        const res = await request(app).get('/api/treinadores');

        expect(res.status).toBe(401);
    });
});

describe('GET /treinadores/:id', () => {
    it('busca treinador existente por ID → 200', async () => {
        const res = await request(app).get(`/api/treinadores/${treinadorBaseId}`);

        expect(res.status).toBe(200);
        expect(res.body.data).toHaveProperty('id', treinadorBaseId);
        expect(res.body.data).toHaveProperty('user_id', treinadorBaseUserId);
    });

    it('ID inexistente (UUID válido) → 404', async () => {
        const res = await request(app).get(`/api/treinadores/${NOT_FOUND_UUID}`);

        expect(res.status).toBe(404);
        expect(res.body.message).toMatch(/não encontrado/i);
    });

    it('ID inválido (não UUID) → 422', async () => {
        const res = await request(app).get(`/api/treinadores/${INVALID_UUID}`);

        expect(res.status).toBe(422);
        expect(extractMessages(res)).toMatch(/UUID válido/i);
    });

    it('sem autenticação → 401', async () => {
        asNoAuth();
        const res = await request(app).get(`/api/treinadores/${treinadorBaseId}`);

        expect(res.status).toBe(401);
    });
});

describe('POST /treinadores', () => {
    it('cria treinador com payload válido mínimo → 201', async () => {
        const novoUserId = await criarUsuario('treinador_post_minimo');
        asAuth(novoUserId);

        const res = await request(app)
            .post('/api/treinadores')
            .send(payloadTreinador());

        expect(res.status).toBe(201);
        expect(res.body.data.user_id).toBe(novoUserId);
        expect(res.body.data.academia_id).toBe(academiaId);
        expect(res.body.data.status_conta).toBe(true);

        tempTreinadorIds.push(res.body.data.id);
    });

    it('cria treinador com campos opcionais (url_foto, status_conta) → 201', async () => {
        const novoUserId = await criarUsuario('treinador_post_opcional');
        asAuth(novoUserId);

        const res = await request(app)
            .post('/api/treinadores')
            .send(payloadTreinador({
                sexo: 'F',
                url_foto: 'https://cdn.test.local/treinador.png',
                status_conta: false,
            }));

        expect(res.status).toBe(201);
        expect(res.body.data.user_id).toBe(novoUserId);
        expect(res.body.data.url_foto).toBe('https://cdn.test.local/treinador.png');
        expect(res.body.data.status_conta).toBe(false);

        tempTreinadorIds.push(res.body.data.id);
    });

    it('nome ausente → 400', async () => {
        const novoUserId = await criarUsuario('treinador_post_sem_nome');
        asAuth(novoUserId);

        const res = await request(app)
            .post('/api/treinadores')
            .send({
                data_nascimento: '1988-11-20',
                sexo: 'M',
                cref: `CREF-SEM-NOME-${RUN_ID}`,
                turnos: ['MANHA'],
                especializacao: 'Resistência',
                graduacao: 'Educação Física',
                academia_id: academiaId,
            });

        expect(res.status).toBe(400);
        expect(res.body.message).toMatch(/dados do treinador são obrigatórios/i);
    });

    it('academia_id inválido (não UUID) → 422', async () => {
        const novoUserId = await criarUsuario('treinador_post_academia_invalida');
        asAuth(novoUserId);

        const res = await request(app)
            .post('/api/treinadores')
            .send(payloadTreinador({ academia_id: INVALID_UUID }));

        expect(res.status).toBe(422);
        expect(extractMessages(res)).toMatch(/UUID válido/i);
    });

    it('data_nascimento em formato inválido → 422', async () => {
        const novoUserId = await criarUsuario('treinador_post_data_formato');
        asAuth(novoUserId);

        const res = await request(app)
            .post('/api/treinadores')
            .send(payloadTreinador({ data_nascimento: '20-11-1988' }));

        expect(res.status).toBe(422);
        expect(extractMessages(res)).toMatch(/formato YYYY-MM-DD/i);
    });

    it('data_nascimento impossível → 422', async () => {
        const novoUserId = await criarUsuario('treinador_post_data_impossivel');
        asAuth(novoUserId);

        const res = await request(app)
            .post('/api/treinadores')
            .send(payloadTreinador({ data_nascimento: '2025-02-30' }));

        expect(res.status).toBe(422);
        expect(extractMessages(res)).toMatch(/data de nascimento inválida/i);
    });

    it('sexo fora do enum → 422', async () => {
        const novoUserId = await criarUsuario('treinador_post_sexo');
        asAuth(novoUserId);

        const res = await request(app)
            .post('/api/treinadores')
            .send(payloadTreinador({ sexo: 'X' }));

        expect(res.status).toBe(422);
    });

    it('turnos vazio → 422', async () => {
        const novoUserId = await criarUsuario('treinador_post_turnos');
        asAuth(novoUserId);

        const res = await request(app)
            .post('/api/treinadores')
            .send(payloadTreinador({ turnos: [] }));

        expect(res.status).toBe(422);
        expect(extractMessages(res)).toMatch(/ao menos um turno/i);
    });

    it('academia_id inexistente na tabela academia → 422', async () => {
        const novoUserId = await criarUsuario('treinador_post_academia_inexistente');
        asAuth(novoUserId);

        const res = await request(app)
            .post('/api/treinadores')
            .send(payloadTreinador({ academia_id: randomUUID() }));

        expect(res.status).toBe(422);
        expect(res.body.message).toMatch(/referência inválida/i);
    });

    it('usuário autenticado já possui perfil de treinador → 409', async () => {
        const novoUserId = await criarUsuario('treinador_post_duplicado');
        asAuth(novoUserId);

        const primeiro = await request(app)
            .post('/api/treinadores')
            .send(payloadTreinador());

        expect(primeiro.status).toBe(201);
        tempTreinadorIds.push(primeiro.body.data.id);

        const duplicado = await request(app)
            .post('/api/treinadores')
            .send(payloadTreinador({ cref: `CREF-DUP-${RUN_ID}-${randomUUID().slice(0, 8)}` }));

        expect(duplicado.status).toBe(409);
        expect(duplicado.body.message).toMatch(/já possui perfil de treinador/i);
    });

    it('sem autenticação → 401', async () => {
        asNoAuth();

        const res = await request(app)
            .post('/api/treinadores')
            .send(payloadTreinador());

        expect(res.status).toBe(401);
    });
});

describe('PATCH /treinadores/:id', () => {
    it('atualiza parcialmente treinador existente → 200', async () => {
        const novoNome = `Treinador Atualizado ${RUN_ID}`;

        const res = await request(app)
            .patch(`/api/treinadores/${treinadorBaseId}`)
            .send({
                nome: novoNome,
                status_conta: false,
            });

        expect(res.status).toBe(200);
        expect(res.body.data.nome).toBe(novoNome);
        expect(res.body.data.status_conta).toBe(false);
    });

    it('atualiza turnos do treinador → 200', async () => {
        const res = await request(app)
            .patch(`/api/treinadores/${treinadorBaseId}`)
            .send({ turnos: ['MANHA', 'TARDE', 'NOITE'] });

        expect(res.status).toBe(200);
        expect(res.body.data.turnos).toEqual(['MANHA', 'TARDE', 'NOITE']);
    });

    it('body vazio → 400', async () => {
        const res = await request(app)
            .patch(`/api/treinadores/${treinadorBaseId}`)
            .send({});

        expect(res.status).toBe(400);
        expect(res.body.message).toMatch(/corpo da requisição é obrigatório/i);
    });

    it('ID inválido (não UUID) → 422', async () => {
        const res = await request(app)
            .patch(`/api/treinadores/${INVALID_UUID}`)
            .send({ nome: 'Invalido' });

        expect(res.status).toBe(422);
        expect(extractMessages(res)).toMatch(/UUID válido/i);
    });

    it('treinador inexistente → 404', async () => {
        const res = await request(app)
            .patch(`/api/treinadores/${NOT_FOUND_UUID}`)
            .send({ nome: 'Nao Existe' });

        expect(res.status).toBe(404);
        expect(res.body.message).toMatch(/não encontrado/i);
    });

    it('sexo fora do enum → 422', async () => {
        const res = await request(app)
            .patch(`/api/treinadores/${treinadorBaseId}`)
            .send({ sexo: 'X' });

        expect(res.status).toBe(422);
    });

    it('turnos vazio → 422', async () => {
        const res = await request(app)
            .patch(`/api/treinadores/${treinadorBaseId}`)
            .send({ turnos: [] });

        expect(res.status).toBe(422);
        expect(extractMessages(res)).toMatch(/ao menos um turno/i);
    });

    it('sem autenticação → 401', async () => {
        asNoAuth();

        const res = await request(app)
            .patch(`/api/treinadores/${treinadorBaseId}`)
            .send({ nome: 'Sem Auth' });

        expect(res.status).toBe(401);
    });
});
