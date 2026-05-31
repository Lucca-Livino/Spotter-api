// Helper para evitar TS2345 "not assignable to parameter of type never"
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mockFn() {
  return jest.fn() as jest.MockedFunction<(...args: any[]) => any>;
}

jest.mock('../../middlewares/authMiddleware', () => ({
    authMiddleware: mockFn(),
}));

import { randomUUID } from 'crypto';
import express from 'express';
import request from 'supertest';
import { describe, it, expect, beforeAll, afterAll, beforeEach, jest } from '@jest/globals';
import { ZodError } from 'zod';
import aparelhoRoutes from '../../routes/aparelhoRoutes';
import { DbConnect, DataBase } from '../../config/DbConnect';
import { authMiddleware } from '../../middlewares/authMiddleware';
import {
    academia,
    aluno,
    treinador,
    exercicio,
    exercicio_aparelho,
    aparelho,
    user,
} from '../../config/db/schema';
import { eq, inArray } from 'drizzle-orm';
import AparelhoController from '../../controllers/aparelhoController';
import { DatabaseError } from '../../utils/errors/DatabaseError';

// Estado global

const RUN_ID = Date.now().toString(36);

let app: express.Express;
let academiaId: string;

// Usuários
let adminUserId: string;
let adminTreinadorId: string;
let alunoUserId: string;
let alunoId: string;
let treinadorUserId: string;
let treinadorRecId: string;

// Aparelhos seed
let aparelhoAId: string;       // 2 exercícios ativos → mais popular
let aparelhoBId: string;       // 1 exercício ativo + 1 inativo
let aparelhoCId: string;       // sem vínculos
let aparelhoHalterId: string;  // nome com acento → filtro "halter"
let aparelhoDId: string;       // extra para paginação (total = 5)

// Exercícios seed
let exAtivo1Id: string;
let exAtivo2Id: string;
let exAtivo3Id: string;
let exInativoId: string;

const INVALID_UUID = 'nao-e-uuid';
const NOT_FOUND_UUID = '00000000-0000-0000-0000-000000000000';

// Helpers de autenticação

function asAdmin() {
    (authMiddleware as any).mockImplementation((req: any, _res: any, next: any) => {
        req.user = { id: adminUserId };
        req.authSession = { id: 'session-admin' };
        next();
    });
}

function asAluno() {
    (authMiddleware as any).mockImplementation((req: any, _res: any, next: any) => {
        req.user = { id: alunoUserId };
        req.authSession = { id: 'session-aluno' };
        next();
    });
}

function asTreinador() {
    (authMiddleware as any).mockImplementation((req: any, _res: any, next: any) => {
        req.user = { id: treinadorUserId };
        req.authSession = { id: 'session-treinador' };
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

// Setup / Teardown

beforeAll(async () => {
    app = express();
    await DbConnect.connect();
    app.use(express.json());
    app.use('/api', aparelhoRoutes);

    const [ac] = await DataBase.insert(academia).values({
        nome: `Academia Aparelho E2E ${RUN_ID}`,
        endereco_numero: '1',
        endereco_rua: 'Rua dos Aparelhos',
        endereco_bairro: 'Bairro Fit',
        endereco_cidade: 'Cidade Fit',
        endereco_estado: 'SP',
    }).returning({ id: academia.id });
    academiaId = ac.id;

    const now = new Date();

    // Admin (treinador is_admin=true)
    adminUserId = randomUUID();
    await DataBase.insert(user).values({
        id: adminUserId,
        name: 'Admin Aparelho Teste',
        email: `admin_ap_${RUN_ID}@test.local`,
        emailVerified: false,
        createdAt: now,
        updatedAt: now,
    });
    const [adminRec] = await DataBase.insert(treinador).values({
        user_id: adminUserId,
        nome: 'Admin Aparelho Teste',
        data_nascimento: '1980-01-01',
        sexo: 'M',
        cref: `ADM_AP_${RUN_ID}`.substring(0, 50),
        turnos: ['MANHA'],
        especializacao: 'Administração',
        graduacao: 'Educação Física',
        is_admin: true,
        academia_id: academiaId,
    }).returning({ id: treinador.id });
    adminTreinadorId = adminRec.id;

    // Aluno
    alunoUserId = randomUUID();
    await DataBase.insert(user).values({
        id: alunoUserId,
        name: 'Aluno Aparelho Teste',
        email: `aluno_ap_${RUN_ID}@test.local`,
        emailVerified: false,
        createdAt: now,
        updatedAt: now,
    });
    const [alunoRec] = await DataBase.insert(aluno).values({
        user_id: alunoUserId,
        nome: 'Aluno Aparelho Teste',
        data_nascimento: '1995-05-05',
        sexo: 'M',
        is_admin: false,
        academia_id: academiaId,
    }).returning({ id: aluno.id });
    alunoId = alunoRec.id;

    // Treinador
    treinadorUserId = randomUUID();
    await DataBase.insert(user).values({
        id: treinadorUserId,
        name: 'Treinador Aparelho Teste',
        email: `treinador_ap_${RUN_ID}@test.local`,
        emailVerified: false,
        createdAt: now,
        updatedAt: now,
    });
    const [treinadorRec] = await DataBase.insert(treinador).values({
        user_id: treinadorUserId,
        nome: 'Treinador Aparelho Teste',
        data_nascimento: '1985-03-15',
        sexo: 'M',
        cref: `TR_AP_${RUN_ID}`.substring(0, 50),
        turnos: ['TARDE'],
        especializacao: 'Musculação',
        graduacao: 'Educação Física',
        is_admin: false,
        academia_id: academiaId,
    }).returning({ id: treinador.id });
    treinadorRecId = treinadorRec.id;

    // Aparelhos seed (5 no total para garantir paginação)
    const [apA] = await DataBase.insert(aparelho).values({
        nome: `Aparelho Alpha AP ${RUN_ID}`,
        descricao: 'Aparelho mais popular dos testes',
    }).returning({ id: aparelho.id });
    aparelhoAId = apA.id;

    const [apB] = await DataBase.insert(aparelho).values({
        nome: `Aparelho Beta AP ${RUN_ID}`,
        descricao: 'Aparelho com exercício inativo',
    }).returning({ id: aparelho.id });
    aparelhoBId = apB.id;

    const [apC] = await DataBase.insert(aparelho).values({
        nome: `Aparelho Gamma AP ${RUN_ID}`,
        descricao: 'Aparelho sem vínculos',
    }).returning({ id: aparelho.id });
    aparelhoCId = apC.id;

    const [apH] = await DataBase.insert(aparelho).values({
        nome: `Hálter AP ${RUN_ID}`,
        descricao: 'Aparelho com acento no nome para filtro',
    }).returning({ id: aparelho.id });
    aparelhoHalterId = apH.id;

    const [apD] = await DataBase.insert(aparelho).values({
        nome: `Aparelho Delta AP ${RUN_ID}`,
        descricao: 'Aparelho extra para paginação',
    }).returning({ id: aparelho.id });
    aparelhoDId = apD.id;

    // Exercícios seed
    const [ex1] = await DataBase.insert(exercicio).values({
        nome: `Exercicio Ativo1 AP ${RUN_ID}`,
        aluno_id: null,
    }).returning({ id: exercicio.id });
    exAtivo1Id = ex1.id;

    const [ex2] = await DataBase.insert(exercicio).values({
        nome: `Exercicio Ativo2 AP ${RUN_ID}`,
        aluno_id: null,
    }).returning({ id: exercicio.id });
    exAtivo2Id = ex2.id;

    const [ex3] = await DataBase.insert(exercicio).values({
        nome: `Exercicio Ativo3 AP ${RUN_ID}`,
        aluno_id: null,
    }).returning({ id: exercicio.id });
    exAtivo3Id = ex3.id;

    const [exInativo] = await DataBase.insert(exercicio).values({
        nome: `Exercicio Inativo AP ${RUN_ID}`,
        aluno_id: null,
        deletado_em: new Date(),
    }).returning({ id: exercicio.id });
    exInativoId = exInativo.id;

    // Vínculos exercício-aparelho:
    // aparelhoA ← 2 exercícios ativos (popularidade = 2)
    await DataBase.insert(exercicio_aparelho).values({ exercicio_id: exAtivo1Id, aparelho_id: aparelhoAId });
    await DataBase.insert(exercicio_aparelho).values({ exercicio_id: exAtivo2Id, aparelho_id: aparelhoAId });
    // aparelhoB ← 1 ativo + 1 inativo (popularidade = 1)
    await DataBase.insert(exercicio_aparelho).values({ exercicio_id: exAtivo3Id, aparelho_id: aparelhoBId });
    await DataBase.insert(exercicio_aparelho).values({ exercicio_id: exInativoId, aparelho_id: aparelhoBId });
    // aparelhoC, aparelhoH, aparelhoD: sem vínculos

    asAdmin();
}, 30000);

afterAll(async () => {
    await DataBase.delete(exercicio_aparelho)
        .where(inArray(exercicio_aparelho.exercicio_id, [exAtivo1Id, exAtivo2Id, exAtivo3Id, exInativoId]))
        .catch(() => {});

    await DataBase.delete(exercicio)
        .where(inArray(exercicio.id, [exAtivo1Id, exAtivo2Id, exAtivo3Id, exInativoId]))
        .catch(() => {});

    await DataBase.delete(aparelho)
        .where(inArray(aparelho.id, [aparelhoAId, aparelhoBId, aparelhoCId, aparelhoHalterId, aparelhoDId]))
        .catch(() => {});

    await DataBase.delete(treinador).where(inArray(treinador.id, [adminTreinadorId, treinadorRecId]));
    await DataBase.delete(aluno).where(eq(aluno.id, alunoId));
    await DataBase.delete(user).where(inArray(user.id, [adminUserId, alunoUserId, treinadorUserId]));
    await DataBase.delete(academia).where(eq(academia.id, academiaId));

    await DbConnect.disconnect();
}, 30000);

beforeEach(() => {
    asAdmin();
});

// GET /aparelhos
describe('GET /aparelhos', () => {

    // ── Cenários felizes ──────────────────────────────────────────

    it('aluno autenticado lista aparelhos → 200 com estrutura paginada', async () => {
        asAluno();
        const res = await request(app).get('/api/aparelhos');

        expect(res.status).toBe(200);
        expect(res.body.data).toHaveProperty('dados');
        expect(res.body.data).toHaveProperty('total');
        expect(res.body.data).toHaveProperty('page');
        expect(res.body.data).toHaveProperty('limite');
        expect(res.body.data).toHaveProperty('totalPages');
        expect(Array.isArray(res.body.data.dados)).toBe(true);
    });

    it('treinador autenticado lista aparelhos → 200 com estrutura paginada', async () => {
        asTreinador();
        const res = await request(app).get('/api/aparelhos');

        expect(res.status).toBe(200);
        expect(res.body.data).toHaveProperty('dados');
        expect(Array.isArray(res.body.data.dados)).toBe(true);
    });

    it('parâmetros padrão quando query omitida → 200 com page=1 e limite=20', async () => {
        const res = await request(app).get('/api/aparelhos');

        expect(res.status).toBe(200);
        expect(res.body.data.page).toBe(1);
        expect(res.body.data.limite).toBe(20);
    });

    it('paginação explícita page=2&limite=2 → 200 com no máximo 2 itens e metadados coerentes', async () => {
        const res = await request(app).get('/api/aparelhos?page=2&limite=2');

        expect(res.status).toBe(200);
        expect(res.body.data.dados.length).toBeLessThanOrEqual(2);
        expect(res.body.data.page).toBe(2);
        expect(res.body.data.limite).toBe(2);
        expect(res.body.data).toHaveProperty('total');
        expect(res.body.data).toHaveProperty('totalPages');
    });

    it('filtro por nome case/accent-insensitive → 200 retorna aparelho "Hálter" ao buscar "halter"', async () => {
        const res = await request(app).get('/api/aparelhos?nome=halter');

        expect(res.status).toBe(200);
        const ids = res.body.data.dados.map((a: any) => a.id);
        expect(ids).toContain(aparelhoHalterId);
    });

    it('ordenação nome_desc → 200 com nomes em ordem decrescente', async () => {
        // Filtra pela RUN_ID para evitar interferência de outros dados no banco
        const res = await request(app).get(`/api/aparelhos?ordem=nome_desc&nome=AP+${RUN_ID}&limite=100`);

        expect(res.status).toBe(200);
        const nomes = res.body.data.dados.map((a: any) => a.nome);
        expect(nomes.length).toBeGreaterThan(1);
        const sorted = [...nomes].sort((a, b) => b.localeCompare(a));
        expect(nomes).toEqual(sorted);
    });

    it('ordenação popularidade_desc → 200 com aparelho mais popular (2 ativos) antes do menos popular (1 ativo)', async () => {
        const res = await request(app).get('/api/aparelhos?ordem=popularidade_desc&limite=100');

        expect(res.status).toBe(200);
        const ids = res.body.data.dados.map((a: any) => a.id);
        const posA = ids.indexOf(aparelhoAId);
        const posB = ids.indexOf(aparelhoBId);
        expect(posA).toBeGreaterThanOrEqual(0);
        expect(posB).toBeGreaterThanOrEqual(0);
        expect(posA).toBeLessThan(posB);
    });

    it('popularidade_desc ignora exercícios inativos → aparelhoA (2 ativos) antes de aparelhoB (1 ativo + 1 inativo)', async () => {
        // aparelhoB tem exercicioInativo vinculado, mas este não deve contar na popularidade
        const res = await request(app).get('/api/aparelhos?ordem=popularidade_desc&limite=100');

        expect(res.status).toBe(200);
        const dados = res.body.data.dados;
        const posA = dados.findIndex((a: any) => a.id === aparelhoAId);
        const posB = dados.findIndex((a: any) => a.id === aparelhoBId);
        expect(posA).toBeGreaterThanOrEqual(0);
        expect(posB).toBeGreaterThanOrEqual(0);
        // aparelhoA tem 2 exercícios ativos, aparelhoB tem 1 (inativo não conta)
        expect(posA).toBeLessThan(posB);
    });

    it('paginação alfanumérica page=2abc&limite=3xyz → 200 com page=2 e limite=3', async () => {
        const res = await request(app).get('/api/aparelhos?page=2abc&limite=3xyz');

        expect(res.status).toBe(200);
        expect(res.body.data.page).toBe(2);
        expect(res.body.data.limite).toBe(3);
    });

    it('filtro restritivo sem resultados → 200 com dados=[], total=0 e totalPages=0', async () => {
        const res = await request(app).get('/api/aparelhos?nome=aparelho-que-nao-existe-xyz-abc');

        expect(res.status).toBe(200);
        expect(res.body.data.dados).toEqual([]);
        expect(res.body.data.total).toBe(0);
        expect(res.body.data.totalPages).toBe(0);
    });

    // ── Cenários tristes ──────────────────────────────────────────

    it('ordem fora do enum → 422', async () => {
        const res = await request(app).get('/api/aparelhos?ordem=asc');

        expect(res.status).toBe(422);
    });

    it('page=0 inválido → 422 com mensagem correta', async () => {
        const res = await request(app).get('/api/aparelhos?page=0');

        expect(res.status).toBe(422);
        const messages = res.body.errors.map((e: any) => e.message);
        expect(messages.join(' ')).toMatch(/page deve ser um número inteiro maior que 0/i);
    });

    it('limite=101 acima do máximo → 422 com mensagem correta', async () => {
        const res = await request(app).get('/api/aparelhos?limite=101');

        expect(res.status).toBe(422);
        const messages = res.body.errors.map((e: any) => e.message);
        expect(messages.join(' ')).toMatch(/limite deve ser entre 1 e 100/i);
    });

    it('limite=abc não numérico → 422 com mensagem correta', async () => {
        const res = await request(app).get('/api/aparelhos?limite=abc');

        expect(res.status).toBe(422);
        const messages = res.body.errors.map((e: any) => e.message);
        expect(messages.join(' ')).toMatch(/limite deve ser entre 1 e 100/i);
    });

    it('campo extra na query (.strict()) → 422', async () => {
        const res = await request(app).get('/api/aparelhos?foo=bar');

        expect(res.status).toBe(422);
    });

    it('requisição sem header Authorization → 401', async () => {
        asNoAuth();
        const res = await request(app).get('/api/aparelhos');

        expect(res.status).toBe(401);
    });
});

// GET /aparelhos/:id
describe('GET /aparelhos/:id', () => {

    // ── Cenários felizes ──────────────────────────────────────────

    it('usuário autenticado consulta aparelho existente → 200 com id, nome, descricao e exercicios', async () => {
        asAluno();
        const res = await request(app).get(`/api/aparelhos/${aparelhoAId}`);

        expect(res.status).toBe(200);
        expect(res.body.data).toHaveProperty('id', aparelhoAId);
        expect(res.body.data).toHaveProperty('nome');
        expect(res.body.data).toHaveProperty('descricao');
        expect(Array.isArray(res.body.data.exercicios)).toBe(true);
    });

    it('detalhe exclui exercícios inativos → aparelhoB retorna apenas exercício ativo (exAtivo3)', async () => {
        const res = await request(app).get(`/api/aparelhos/${aparelhoBId}`);

        expect(res.status).toBe(200);
        const exercicioIds = res.body.data.exercicios.map((e: any) => e.exercicio_id);
        expect(exercicioIds).toContain(exAtivo3Id);
        expect(exercicioIds).not.toContain(exInativoId);
    });

    it('aparelho sem exercícios vinculados → 200 com exercicios=[]', async () => {
        const res = await request(app).get(`/api/aparelhos/${aparelhoCId}`);

        expect(res.status).toBe(200);
        expect(res.body.data.exercicios).toEqual([]);
    });

    // ── Cenários tristes ──────────────────────────────────────────

    it('ID inexistente (UUID válido) → 404 com mensagem "Aparelho não encontrado"', async () => {
        const res = await request(app).get(`/api/aparelhos/${NOT_FOUND_UUID}`);

        expect(res.status).toBe(404);
        expect(res.body.message).toMatch(/aparelho não encontrado/i);
    });

    it('ID com formato inválido → 422 com mensagem "ID inválido"', async () => {
        const res = await request(app).get(`/api/aparelhos/${INVALID_UUID}`);

        expect(res.status).toBe(422);
        expect(res.body.message).toMatch(/id inválido/i);
    });

    it('requisição sem header Authorization → 401', async () => {
        asNoAuth();
        const res = await request(app).get(`/api/aparelhos/${aparelhoAId}`);

        expect(res.status).toBe(401);
    });
});

// ============================================================
// BLOCO 2 — Testes unitários do AparelhoController (mocked)
// ============================================================

const makeRes = () => {
    const res = {
        status: mockFn().mockReturnThis(),
        json: mockFn(),
    };
    return res as any;
};

const makeReq = (overrides: Record<string, unknown> = {}) => ({
    params: { id: 'id' },
    query: {},
    ...overrides,
}) as any;

describe('AparelhoController', () => {
    let controller: AparelhoController;

    beforeEach(() => {
        controller = new AparelhoController();
    });

    it('getAll handles ZodError and DatabaseError', async () => {
        const res = makeRes();
        const req = makeReq();
        (controller as any).service = {
            getAll: mockFn()
                .mockRejectedValueOnce(new ZodError([]))
                .mockRejectedValueOnce(new DatabaseError('db error', 409)),
        };

        await controller.getAll(req, res);
        await controller.getAll(req, res);

        expect(res.status).toHaveBeenCalledWith(422);
        expect(res.status).toHaveBeenCalledWith(409);
    });

    it('getAll handles unknown error', async () => {
        const res = makeRes();
        const req = makeReq();
        (controller as any).service = {
            getAll: mockFn().mockRejectedValue(new Error('boom')),
        };

        await controller.getAll(req, res);
        expect(res.status).toHaveBeenCalledWith(500);
    });

    it('getById handles ZodError, not found, and DatabaseError', async () => {
        const res = makeRes();
        const req = makeReq({ params: { id: 'id' } });
        (controller as any).service = {
            getById: mockFn()
                .mockRejectedValueOnce(new ZodError([]))
                .mockRejectedValueOnce(new Error('Aparelho não encontrado'))
                .mockRejectedValueOnce(new DatabaseError('db error', 400)),
        };

        await controller.getById(req, res);
        await controller.getById(req, res);
        await controller.getById(req, res);

        expect(res.status).toHaveBeenCalledWith(422);
        expect(res.status).toHaveBeenCalledWith(404);
        expect(res.status).toHaveBeenCalledWith(400);
    });

    it('getById handles unknown error', async () => {
        const res = makeRes();
        const req = makeReq();
        (controller as any).service = {
            getById: mockFn().mockRejectedValue(new Error('boom')),
        };

        await controller.getById(req, res);
        expect(res.status).toHaveBeenCalledWith(500);
    });
});
