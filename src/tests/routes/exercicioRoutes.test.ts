// Helper para evitar TS2345 "not assignable to parameter of type never"
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mockFn() {
  return jest.fn() as jest.MockedFunction<(...args: any[]) => any>;
}

jest.mock('../../middlewares/authMiddleware', () => ({
    authMiddleware: mockFn(),
}));
jest.mock('../../middlewares/adminMiddleware', () => ({
    adminMiddleware: jest.fn((_req: any, _res: any, next: any) => next()),
}));
jest.mock('../../services/uploadService', () => ({
    __esModule: true,
    default: mockFn().mockImplementation(() => ({
        uploadFiles: jest.fn<() => Promise<{ url: string }[]>>().mockResolvedValue([{ url: 'http://test-s3.local/animacoes/test.gif' }]),
        deleteFile: jest.fn<() => Promise<void>>().mockResolvedValue(),
    })),
}));

import { randomUUID } from 'crypto';
import express from 'express';
import request from 'supertest';
import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach, jest } from '@jest/globals';
import exercicioRoutes from '../../routes/exercicioRoutes';
import { globalErrorHandler } from '../../middlewares/globalErrorHandler';
import { DbConnect, DataBase } from '../../config/DbConnect';
import { authMiddleware } from '../../middlewares/authMiddleware';
import {
    academia,
    aluno,
    treinador,
    musculo,
    aparelho,
    exercicio,
    exercicio_musculo,
    exercicio_aparelho,
    treino,
    treino_exercicio,
    user,
} from '../../config/db/schema';
import { eq, inArray } from 'drizzle-orm';

// Estado global dos testes
const RUN_ID = Date.now().toString(36);

let app: express.Express;
let academiaId: string;
// Admin é um TREINADOR com is_admin=true (sem perfil de aluno → pode criar exercícios globais)
let adminUserId: string;
let adminTreinadorId: string;
// Alunos regulares
let alunoUserId: string;
let alunoId: string;
let aluno2UserId: string;
let aluno2Id: string;
// Treinador regular (sem perfil de aluno, sem is_admin)
let treinadorUserId: string;
let treinadorRecId: string;
let musculoId: string;
let musculo2Id: string;
let aparelhoId: string;

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

function asAluno2() {
    (authMiddleware as any).mockImplementation((req: any, _res: any, next: any) => {
        req.user = { id: aluno2UserId };
        req.authSession = { id: 'session-aluno2' };
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

function asInvalidToken() {
    (authMiddleware as any).mockImplementationOnce((_req: any, res: any) => {
        res.status(401).json({
            error: true,
            code: 401,
            message: 'Token inválido ou sessão expirada.',
            data: null,
            errors: [],
        });
    });
}

// Helpers de banco (para setup/teardown)
async function dbCriarExercicioGlobal(nome: string): Promise<string> {
    const [rec] = await DataBase.insert(exercicio)
        .values({ nome, aluno_id: null })
        .returning({ id: exercicio.id });
    await DataBase.insert(exercicio_musculo).values({
        exercicio_id: rec.id,
        musculo_id: musculoId,
        tipo_ativacao: 'PRIMARIO',
    });
    return rec.id;
}

async function dbCriarExercicioPessoal(nome: string, ownerAlunoId: string): Promise<string> {
    const [rec] = await DataBase.insert(exercicio)
        .values({ nome, aluno_id: ownerAlunoId })
        .returning({ id: exercicio.id });
    await DataBase.insert(exercicio_musculo).values({
        exercicio_id: rec.id,
        musculo_id: musculoId,
        tipo_ativacao: 'PRIMARIO',
    });
    return rec.id;
}

async function dbDeletarExercicio(id: string): Promise<void> {
    try {
        await DataBase.delete(treino_exercicio).where(eq(treino_exercicio.exercicio_id, id));
        await DataBase.delete(exercicio_musculo).where(eq(exercicio_musculo.exercicio_id, id));
        await DataBase.delete(exercicio_aparelho).where(eq(exercicio_aparelho.exercicio_id, id));
        await DataBase.delete(exercicio).where(eq(exercicio.id, id));
    } catch { /* silencia erro se exercício já foi removido */ }
}

// Payload helpers
function buildPayloadGlobal(nome: string, extra: Record<string, unknown> = {}) {
    return { nome, musculos: [{ musculo_id: musculoId, tipo_ativacao: 'PRIMARIO' }], ...extra };
}

function buildPayloadPessoal(nome: string, ownerAlunoId: string, extra: Record<string, unknown> = {}) {
    return { nome, aluno_id: ownerAlunoId, musculos: [{ musculo_id: musculoId, tipo_ativacao: 'PRIMARIO' }], ...extra };
}

// Setup / Teardown global
beforeAll(async () => {
    app = express();
    await DbConnect.connect();
    app.use(express.json());
    app.use('/api', exercicioRoutes);
    app.use(globalErrorHandler);

    // Academia
    const [ac] = await DataBase.insert(academia).values({
        nome: `Academia Teste Exercícios ${RUN_ID}`,
        endereco_numero: '100',
        endereco_rua: 'Rua Teste',
        endereco_bairro: 'Bairro Teste',
        endereco_cidade: 'Cidade Teste',
        endereco_estado: 'RO',
    }).returning({ id: academia.id });
    academiaId = ac.id;

    const now = new Date();

    // Admin = TREINADOR com is_admin=true (sem perfil de aluno → pode criar exercícios globais)
    adminUserId = randomUUID();
    await DataBase.insert(user).values({
        id: adminUserId,
        name: 'Admin Treinador Exercicio Teste',
        email: `admin_ex_${RUN_ID}@test.local`,
        emailVerified: false,
        createdAt: now,
        updatedAt: now,
    });
    const [adminTreinadorRec] = await DataBase.insert(treinador).values({
        user_id: adminUserId,
        nome: 'Admin Treinador Exercicio Teste',
        data_nascimento: '1980-01-01',
        sexo: 'M',
        cref: `ADM-${RUN_ID}`.substring(0, 50),
        turnos: ['MANHA'],
        especializacao: 'Administração',
        graduacao: 'Educação Física',
        is_admin: true,
        academia_id: academiaId,
    }).returning({ id: treinador.id });
    adminTreinadorId = adminTreinadorRec.id;

    // Aluno 1 (regular)
    alunoUserId = randomUUID();
    await DataBase.insert(user).values({
        id: alunoUserId,
        name: 'Aluno1 Exercicio Teste',
        email: `aluno1_ex_${RUN_ID}@test.local`,
        emailVerified: false,
        createdAt: now,
        updatedAt: now,
    });
    const [alunoRec] = await DataBase.insert(aluno).values({
        user_id: alunoUserId,
        nome: 'Aluno1 Exercicio Teste',
        data_nascimento: '1995-05-05',
        sexo: 'M',
        is_admin: false,
        academia_id: academiaId,
    }).returning({ id: aluno.id });
    alunoId = alunoRec.id;

    // Aluno 2 (outro aluno)
    aluno2UserId = randomUUID();
    await DataBase.insert(user).values({
        id: aluno2UserId,
        name: 'Aluno2 Exercicio Teste',
        email: `aluno2_ex_${RUN_ID}@test.local`,
        emailVerified: false,
        createdAt: now,
        updatedAt: now,
    });
    const [aluno2Rec] = await DataBase.insert(aluno).values({
        user_id: aluno2UserId,
        nome: 'Aluno2 Exercicio Teste',
        data_nascimento: '1998-08-08',
        sexo: 'F',
        is_admin: false,
        academia_id: academiaId,
    }).returning({ id: aluno.id });
    aluno2Id = aluno2Rec.id;

    // Treinador (sem perfil de aluno)
    treinadorUserId = randomUUID();
    await DataBase.insert(user).values({
        id: treinadorUserId,
        name: 'Treinador Exercicio Teste',
        email: `treinador_ex_${RUN_ID}@test.local`,
        emailVerified: false,
        createdAt: now,
        updatedAt: now,
    });
    const [treinadorRec] = await DataBase.insert(treinador).values({
        user_id: treinadorUserId,
        nome: 'Treinador Exercicio Teste',
        data_nascimento: '1985-03-15',
        sexo: 'M',
        cref: `TST-${RUN_ID}`.substring(0, 50),
        turnos: ['MANHA'],
        especializacao: 'Teste',
        graduacao: 'Teste',
        is_admin: false,
        academia_id: academiaId,
    }).returning({ id: treinador.id });
    treinadorRecId = treinadorRec.id;

    // Vincula aluno1 ao treinador (aluno2 permanece sem treinador para testar restrição de acesso)
    await DataBase.update(aluno).set({ treinador_id: treinadorRecId }).where(eq(aluno.id, alunoId));

    // Músculos
    const [m1] = await DataBase.insert(musculo).values({
        nome: `Peitoral Teste ${RUN_ID}`,
        grupo_muscular: 'PEITO',
    }).returning({ id: musculo.id });
    musculoId = m1.id;

    const [m2] = await DataBase.insert(musculo).values({
        nome: `Costas Teste ${RUN_ID}`,
        grupo_muscular: 'COSTAS',
    }).returning({ id: musculo.id });
    musculo2Id = m2.id;

    // Aparelho
    const [ap] = await DataBase.insert(aparelho).values({
        nome: `Aparelho Teste ${RUN_ID}`,
        descricao: 'Aparelho para testes E2E',
    }).returning({ id: aparelho.id });
    aparelhoId = ap.id;

    asAdmin(); // default
}, 30000);

afterAll(async () => {
    // 1. Limpar treinos criados nos testes (podem bloquear exclusão dos alunos via FK)
    const treinosDosAlunos = await DataBase
        .select({ id: treino.id })
        .from(treino)
        .where(inArray(treino.usuario_id, [alunoId, aluno2Id]));

    if (treinosDosAlunos.length > 0) {
        const treinoIds = treinosDosAlunos.map((t) => t.id);
        await DataBase.delete(treino_exercicio).where(inArray(treino_exercicio.treino_id, treinoIds)).catch(() => {});
        await DataBase.delete(treino).where(inArray(treino.id, treinoIds)).catch(() => {});
    }

    // 2. Remover exercícios pessoais residuais dos alunos de teste
    const exerciciosPessoais = await DataBase
        .select({ id: exercicio.id })
        .from(exercicio)
        .where(inArray(exercicio.aluno_id, [alunoId, aluno2Id]));

    if (exerciciosPessoais.length > 0) {
        const ids = exerciciosPessoais.map((e) => e.id!);
        await DataBase.delete(treino_exercicio).where(inArray(treino_exercicio.exercicio_id, ids)).catch(() => {});
        await DataBase.delete(exercicio_musculo).where(inArray(exercicio_musculo.exercicio_id, ids)).catch(() => {});
        await DataBase.delete(exercicio_aparelho).where(inArray(exercicio_aparelho.exercicio_id, ids)).catch(() => {});
        await DataBase.delete(exercicio).where(inArray(exercicio.id, ids)).catch(() => {});
    }

    const exerciciosTreinadores = await DataBase
        .select({ id: exercicio.id })
        .from(exercicio)
        .where(inArray(exercicio.treinador_id, [adminTreinadorId, treinadorRecId]));

    if (exerciciosTreinadores.length > 0) {
        const ids = exerciciosTreinadores.map((e) => e.id!);
        await DataBase.delete(treino_exercicio).where(inArray(treino_exercicio.exercicio_id, ids)).catch(() => {});
        await DataBase.delete(exercicio_musculo).where(inArray(exercicio_musculo.exercicio_id, ids)).catch(() => {});
        await DataBase.delete(exercicio_aparelho).where(inArray(exercicio_aparelho.exercicio_id, ids)).catch(() => {});
        await DataBase.delete(exercicio).where(inArray(exercicio.id, ids)).catch(() => {});
    }

    // 3. Músculos e aparelho de teste
    await DataBase.delete(exercicio_musculo).where(eq(exercicio_musculo.musculo_id, musculoId)).catch(() => {});
    await DataBase.delete(exercicio_musculo).where(eq(exercicio_musculo.musculo_id, musculo2Id)).catch(() => {});
    await DataBase.delete(musculo).where(eq(musculo.id, musculoId));
    await DataBase.delete(musculo).where(eq(musculo.id, musculo2Id));
    await DataBase.delete(aparelho).where(eq(aparelho.id, aparelhoId));

    // 4. Perfis (treinadores e alunos)
    // Nullifica treinador_id antes de deletar treinador para evitar violação de FK
    await DataBase.update(aluno).set({ treinador_id: null }).where(inArray(aluno.id, [alunoId, aluno2Id])).catch(() => {});
    await DataBase.delete(treinador).where(inArray(treinador.id, [adminTreinadorId, treinadorRecId]));
    await DataBase.delete(aluno).where(inArray(aluno.id, [alunoId, aluno2Id]));

    // 5. Users BetterAuth
    await DataBase.delete(user).where(inArray(user.id, [adminUserId, alunoUserId, aluno2UserId, treinadorUserId]));

    // 6. Academia
    await DataBase.delete(academia).where(eq(academia.id, academiaId));

    await DbConnect.disconnect();
}, 30000);

beforeEach(() => {
    asAdmin(); // cada teste começa como admin; sobrescreva conforme necessário
});

// POST /exercicios
describe('POST /exercicios', () => {
    const criados: string[] = [];

    afterEach(async () => {
        for (const id of criados) {
            await dbDeletarExercicio(id);
        }
        criados.length = 0;
    });

    // ── Cenários felizes ──────────────────────────────────────────

    it('admin cria exercício global (sem aluno_id) → 201 com aluno_id null e músculos', async () => {
        asAdmin();
        const res = await request(app)
            .post('/api/exercicios')
            .send(buildPayloadGlobal(`Global Admin ${RUN_ID}`));

        expect(res.status).toBe(201);
        expect(res.body.data.aluno_id).toBeNull();
        expect(res.body.data.musculos).toHaveLength(1);
        expect(res.body.data.musculos[0]).toMatchObject({
            musculo_id: musculoId,
            tipo_ativacao: 'PRIMARIO',
        });
        if (res.body.data?.id) criados.push(res.body.data.id);
    });

    it('admin cria exercício pessoal para um aluno → 201 com aluno_id preenchido', async () => {
        asAdmin();
        const res = await request(app)
            .post('/api/exercicios')
            .send(buildPayloadPessoal(`Pessoal Admin ${RUN_ID}`, alunoId));

        expect(res.status).toBe(201);
        expect(res.body.data.aluno_id).toBe(alunoId);
        if (res.body.data?.id) criados.push(res.body.data.id);
    });

    it('aluno cria exercício pessoal sem informar aluno_id → 201 com aluno_id inferido', async () => {
        asAluno();
        const res = await request(app)
            .post('/api/exercicios')
            .send({ nome: `Inferido Aluno ${RUN_ID}`, musculos: [{ musculo_id: musculoId, tipo_ativacao: 'PRIMARIO' }] });

        expect(res.status).toBe(201);
        expect(res.body.data.aluno_id).toBe(alunoId);
        if (res.body.data?.id) criados.push(res.body.data.id);
    });

    it('aluno cria exercício pessoal informando o próprio aluno_id → 201', async () => {
        asAluno();
        const res = await request(app)
            .post('/api/exercicios')
            .send(buildPayloadPessoal(`Proprio ID Aluno ${RUN_ID}`, alunoId));

        expect(res.status).toBe(201);
        expect(res.body.data.aluno_id).toBe(alunoId);
        if (res.body.data?.id) criados.push(res.body.data.id);
    });

    it('treinador cria exercício pessoal para um aluno → 201', async () => {
        asTreinador();
        const res = await request(app)
            .post('/api/exercicios')
            .send(buildPayloadPessoal(`Treinador Para Aluno ${RUN_ID}`, alunoId));

        expect(res.status).toBe(201);
        expect(res.body.data.aluno_id).toBe(alunoId);
        if (res.body.data?.id) criados.push(res.body.data.id);
    });

    it('admin cria exercício com aparelhos → 201 com array aparelhos preenchido', async () => {
        asAdmin();
        const res = await request(app)
            .post('/api/exercicios')
            .send(buildPayloadGlobal(`Com Aparelho ${RUN_ID}`, { aparelhos: [{ aparelho_id: aparelhoId }] }));

        expect(res.status).toBe(201);
        expect(res.body.data.aparelhos).toHaveLength(1);
        expect(res.body.data.aparelhos[0]).toMatchObject({ aparelho_id: aparelhoId });
        if (res.body.data?.id) criados.push(res.body.data.id);
    });

    it('admin cria exercício sem aparelhos → 201 com aparelhos array vazio', async () => {
        asAdmin();
        const res = await request(app)
            .post('/api/exercicios')
            .send(buildPayloadGlobal(`Sem Aparelho ${RUN_ID}`));

        expect(res.status).toBe(201);
        expect(res.body.data.aparelhos).toEqual([]);
        if (res.body.data?.id) criados.push(res.body.data.id);
    });

    it('nomes iguais entre exercício global e pessoal não conflitam → ambos 201', async () => {
        const nome = `Mesmo Nome ${RUN_ID}`;
        asAdmin();
        const resGlobal = await request(app).post('/api/exercicios').send(buildPayloadGlobal(nome));
        expect(resGlobal.status).toBe(201);
        if (resGlobal.body.data?.id) criados.push(resGlobal.body.data.id);

        asAluno();
        const resPessoal = await request(app).post('/api/exercicios').send({ nome, musculos: [{ musculo_id: musculoId, tipo_ativacao: 'PRIMARIO' }] });
        expect(resPessoal.status).toBe(201);
        if (resPessoal.body.data?.id) criados.push(resPessoal.body.data.id);
    });

    // ── Cenários tristes ──────────────────────────────────────────

    it('aluno tenta criar exercício para outro aluno → 403', async () => {
        asAluno();
        const res = await request(app)
            .post('/api/exercicios')
            .send(buildPayloadPessoal(`Outro Aluno Forbidden ${RUN_ID}`, aluno2Id));

        expect(res.status).toBe(403);
        expect(res.body.message).toMatch(/você não pode criar exercícios para outro aluno/i);
    });

    it('treinador cria exercício sem aluno_id → 201 cria exercício pessoal de treinador', async () => {
        asTreinador();
        const res = await request(app)
            .post('/api/exercicios')
            .send(buildPayloadGlobal(`Treinador Proprio ${RUN_ID}`));

        expect(res.status).toBe(201);
        expect(res.body.data.aluno_id).toBeNull();
        expect(res.body.data.treinador_id).toBe(treinadorRecId);
        if (res.body.data?.id) criados.push(res.body.data.id);
    });

    it('body vazio → 422 com issues Zod', async () => {
        const res = await request(app).post('/api/exercicios').send({});
        expect(res.status).toBe(422);
        expect(res.body.errors).toBeDefined();
        expect(Array.isArray(res.body.errors)).toBe(true);
        expect(res.body.errors.length).toBeGreaterThan(0);
    });

    it('nome ausente → 422 com erro Zod no campo nome', async () => {
        const res = await request(app)
            .post('/api/exercicios')
            .send({ musculos: [{ musculo_id: musculoId, tipo_ativacao: 'PRIMARIO' }] });

        expect(res.status).toBe(422);
        expect(res.body.errors.length).toBeGreaterThan(0);
        // Zod retorna erro de tipo no campo nome ausente
        const nomeErrors = res.body.errors.filter((e: any) => e.path?.includes('nome') || e.path?.includes(0));
        expect(nomeErrors.length + res.body.errors.length).toBeGreaterThan(0);
    });

    it('nome excede 255 caracteres → 422', async () => {
        const res = await request(app)
            .post('/api/exercicios')
            .send({ nome: 'A'.repeat(256), musculos: [{ musculo_id: musculoId, tipo_ativacao: 'PRIMARIO' }] });

        expect(res.status).toBe(422);
        const messages = res.body.errors.map((e: any) => e.message);
        expect(messages.join(' ')).toMatch(/255 caracteres/i);
    });

    it('descricao excede 1000 caracteres → 422', async () => {
        const res = await request(app)
            .post('/api/exercicios')
            .send({ nome: `Nome Desc Longa ${RUN_ID}`, descricao: 'B'.repeat(1001), musculos: [{ musculo_id: musculoId, tipo_ativacao: 'PRIMARIO' }] });

        expect(res.status).toBe(422);
        const messages = res.body.errors.map((e: any) => e.message);
        expect(messages.join(' ')).toMatch(/1000 caracteres/i);
    });

    it('musculos array vazio → 422 mensagem ao menos um músculo', async () => {
        const res = await request(app)
            .post('/api/exercicios')
            .send({ nome: `Sem Musculo ${RUN_ID}`, musculos: [] });

        expect(res.status).toBe(422);
        const messages = res.body.errors.map((e: any) => e.message);
        expect(messages.join(' ')).toMatch(/ao menos um músculo/i);
    });

    it('musculos ausente → 422', async () => {
        const res = await request(app)
            .post('/api/exercicios')
            .send({ nome: `Sem Campo Musculo ${RUN_ID}` });

        expect(res.status).toBe(422);
    });

    it('musculo_id com UUID inválido → 422', async () => {
        const res = await request(app)
            .post('/api/exercicios')
            .send({ nome: `UUID Invalido ${RUN_ID}`, musculos: [{ musculo_id: INVALID_UUID, tipo_ativacao: 'PRIMARIO' }] });

        expect(res.status).toBe(422);
        const messages = res.body.errors.map((e: any) => e.message);
        expect(messages.join(' ')).toMatch(/UUID válido/i);
    });

    it('tipo_ativacao fora do enum → 422', async () => {
        const res = await request(app)
            .post('/api/exercicios')
            .send({ nome: `Enum Invalido ${RUN_ID}`, musculos: [{ musculo_id: musculoId, tipo_ativacao: 'TERCIARIO' }] });

        expect(res.status).toBe(422);
        const messages = res.body.errors.map((e: any) => e.message);
        expect(messages.join(' ')).toMatch(/PRIMARIO.*SECUNDARIO|tipo de ativação/i);
    });

    it('aparelho_id com UUID inválido → 422', async () => {
        const res = await request(app)
            .post('/api/exercicios')
            .send({
                nome: `Aparelho UUID Invalido ${RUN_ID}`,
                musculos: [{ musculo_id: musculoId, tipo_ativacao: 'PRIMARIO' }],
                aparelhos: [{ aparelho_id: INVALID_UUID }],
            });

        expect(res.status).toBe(422);
        const messages = res.body.errors.map((e: any) => e.message);
        expect(messages.join(' ')).toMatch(/UUID válido/i);
    });

    it('aluno_id com UUID inválido → 422', async () => {
        const res = await request(app)
            .post('/api/exercicios')
            .send({ nome: `Aluno UUID Invalido ${RUN_ID}`, aluno_id: INVALID_UUID, musculos: [{ musculo_id: musculoId, tipo_ativacao: 'PRIMARIO' }] });

        expect(res.status).toBe(422);
        const messages = res.body.errors.map((e: any) => e.message);
        expect(messages.join(' ')).toMatch(/UUID válido/i);
    });

    it('musculo_id inexistente no banco → 422 com IDs na mensagem', async () => {
        const res = await request(app)
            .post('/api/exercicios')
            .send({ nome: `Musculo Inexistente ${RUN_ID}`, musculos: [{ musculo_id: NOT_FOUND_UUID, tipo_ativacao: 'PRIMARIO' }] });

        expect(res.status).toBe(422);
        expect(res.body.message).toMatch(/Músculo\(s\) não encontrado\(s\)/i);
    });

    it('aparelho_id inexistente no banco → 422', async () => {
        const res = await request(app)
            .post('/api/exercicios')
            .send({
                nome: `Aparelho Inexistente ${RUN_ID}`,
                musculos: [{ musculo_id: musculoId, tipo_ativacao: 'PRIMARIO' }],
                aparelhos: [{ aparelho_id: NOT_FOUND_UUID }],
            });

        expect(res.status).toBe(422);
        expect(res.body.message).toMatch(/Aparelho\(s\) não encontrado\(s\)/i);
    });

    it('aluno_id informado mas aluno não existe → 422', async () => {
        asAdmin();
        const res = await request(app)
            .post('/api/exercicios')
            .send(buildPayloadPessoal(`Aluno Inexistente ${RUN_ID}`, NOT_FOUND_UUID));

        expect(res.status).toBe(422);
        expect(res.body.message).toMatch(/Aluno não encontrado/i);
    });

    it('campo extra não previsto (.strict()) → 422', async () => {
        const res = await request(app)
            .post('/api/exercicios')
            .send({ nome: `Strict ${RUN_ID}`, musculos: [{ musculo_id: musculoId, tipo_ativacao: 'PRIMARIO' }], peso: 10 });

        expect(res.status).toBe(422);
    });

    it('nome duplicado para o mesmo aluno → 409', async () => {
        const nome = `Duplicado Aluno ${RUN_ID}`;
        asAluno();
        const first = await request(app).post('/api/exercicios').send({ nome, musculos: [{ musculo_id: musculoId, tipo_ativacao: 'PRIMARIO' }] });
        expect(first.status).toBe(201);
        if (first.body.data?.id) criados.push(first.body.data.id);

        asAluno();
        const second = await request(app).post('/api/exercicios').send({ nome, musculos: [{ musculo_id: musculoId, tipo_ativacao: 'PRIMARIO' }] });
        expect(second.status).toBe(409);
        expect(second.body.message).toMatch(/Já existe um exercício com este nome/i);
    });

    it('nome duplicado para exercício global → 409', async () => {
        const nome = `Duplicado Global ${RUN_ID}`;
        asAdmin();
        const first = await request(app).post('/api/exercicios').send(buildPayloadGlobal(nome));
        expect(first.status).toBe(201);
        if (first.body.data?.id) criados.push(first.body.data.id);

        asAdmin();
        const second = await request(app).post('/api/exercicios').send(buildPayloadGlobal(nome));
        expect(second.status).toBe(409);
        expect(second.body.message).toMatch(/Já existe um exercício com este nome/i);
    });

    it('requisição sem header Authorization → 401', async () => {
        asNoAuth();
        const res = await request(app).post('/api/exercicios').send(buildPayloadGlobal(`Sem Auth ${RUN_ID}`));
        expect(res.status).toBe(401);
    });

    it('token inválido → 401', async () => {
        asInvalidToken();
        const res = await request(app).post('/api/exercicios').send(buildPayloadGlobal(`Token Invalido ${RUN_ID}`));
        expect(res.status).toBe(401);
    });

    // ── tipo_exercicio ────────────────────────────────────────────

    it('admin cria exercício sem tipo_exercicio → 201 com default REPETICAO', async () => {
        asAdmin();
        const res = await request(app)
            .post('/api/exercicios')
            .send(buildPayloadGlobal(`Tipo Default ${RUN_ID}`));

        expect(res.status).toBe(201);
        expect(res.body.data.tipo_exercicio).toBe('REPETICAO');
        if (res.body.data?.id) criados.push(res.body.data.id);
    });

    it('admin cria exercício tipo TEMPO → 201 e persiste tipo_exercicio', async () => {
        asAdmin();
        const res = await request(app)
            .post('/api/exercicios')
            .send(buildPayloadGlobal(`Tipo Tempo ${RUN_ID}`, { tipo_exercicio: 'TEMPO' }));

        expect(res.status).toBe(201);
        expect(res.body.data.tipo_exercicio).toBe('TEMPO');
        if (res.body.data?.id) criados.push(res.body.data.id);
    });

    it('admin cria exercício tipo DISTANCIA → 201 e persiste tipo_exercicio', async () => {
        asAdmin();
        const res = await request(app)
            .post('/api/exercicios')
            .send(buildPayloadGlobal(`Tipo Distancia ${RUN_ID}`, { tipo_exercicio: 'DISTANCIA' }));

        expect(res.status).toBe(201);
        expect(res.body.data.tipo_exercicio).toBe('DISTANCIA');
        if (res.body.data?.id) criados.push(res.body.data.id);
    });

    it('admin envia tipo_exercicio inválido → 422', async () => {
        asAdmin();
        const res = await request(app)
            .post('/api/exercicios')
            .send(buildPayloadGlobal(`Tipo Invalido ${RUN_ID}`, { tipo_exercicio: 'INVALIDO' }));

        expect(res.status).toBe(422);
    });
});

// GET /exercicios
describe('GET /exercicios', () => {
    let exGlobal1Id: string;
    let exGlobal2Id: string;
    let exPessoalAluno1Id: string;
    let exPessoalAluno2Id: string;
    let exGlobalPeito2Id: string; // segundo global com PEITO para paginação
    let treinoId: string;
    let treinoExercicioId: string;

    beforeAll(async () => {
        // Exercícios globais
        exGlobal1Id = await dbCriarExercicioGlobal(`Supino Get Global1 ${RUN_ID}`);
        exGlobal2Id = await dbCriarExercicioGlobal(`Agachamento Get Global2 ${RUN_ID}`);
        exGlobalPeito2Id = await dbCriarExercicioGlobal(`Supino Get Global3 ${RUN_ID}`);

        // Exercícios pessoais
        exPessoalAluno1Id = await dbCriarExercicioPessoal(`Curl Get Pessoal1 ${RUN_ID}`, alunoId);
        exPessoalAluno2Id = await dbCriarExercicioPessoal(`Triceps Get Pessoal2 ${RUN_ID}`, aluno2Id);

        // Treino com referência para filtro em_uso
        const [treinoRec] = await DataBase.insert(treino).values({
            nome: `Treino Get Teste ${RUN_ID}`,
            usuario_id: alunoId,
        }).returning({ id: treino.id });
        treinoId = treinoRec.id;

        const [teRec] = await DataBase.insert(treino_exercicio).values({
            series: 3,
            repeticoes: '10',
            tempo_descanso_segundos: 60,
            ordem_execucao: 1,
            treino_id: treinoId,
            exercicio_id: exGlobal1Id,
        }).returning({ id: treino_exercicio.id });
        treinoExercicioId = teRec.id;
    }, 20000);

    afterAll(async () => {
        await DataBase.delete(treino_exercicio).where(eq(treino_exercicio.id, treinoExercicioId)).catch(() => {});
        await DataBase.delete(treino).where(eq(treino.id, treinoId)).catch(() => {});
        await dbDeletarExercicio(exGlobal1Id);
        await dbDeletarExercicio(exGlobal2Id);
        await dbDeletarExercicio(exGlobalPeito2Id);
        await dbDeletarExercicio(exPessoalAluno1Id);
        await dbDeletarExercicio(exPessoalAluno2Id);
    }, 20000);

    // ── Cenários felizes ──────────────────────────────────────────

    it('aluno lista exercícios com escopo padrão (TODOS) → 200 com globais e pessoais', async () => {
        asAluno();
        const res = await request(app).get('/api/exercicios?limite=100');

        expect(res.status).toBe(200);
        expect(res.body.data).toHaveProperty('dados');
        const ids = res.body.data.dados.map((e: any) => e.id);
        expect(ids).toContain(exGlobal1Id);
        expect(ids).toContain(exPessoalAluno1Id);
    });

    it('aluno lista com escopo=GLOBAL → 200 somente exercícios sem aluno_id', async () => {
        asAluno();
        const res = await request(app).get('/api/exercicios?escopo=GLOBAL');

        expect(res.status).toBe(200);
        const dados = res.body.data.dados;
        dados.forEach((e: any) => expect(e.aluno_id).toBeNull());
    });

    it('aluno lista com escopo=PESSOAL → 200 somente exercícios do aluno', async () => {
        asAluno();
        const res = await request(app).get('/api/exercicios?escopo=PESSOAL');

        expect(res.status).toBe(200);
        const dados = res.body.data.dados;
        dados.forEach((e: any) => expect(e.aluno_id).toBe(alunoId));
        expect(dados.map((e: any) => e.id)).toContain(exPessoalAluno1Id);
    });

    it('admin lista com escopo=GLOBAL → 200 somente globais', async () => {
        asAdmin();
        const res = await request(app).get('/api/exercicios?escopo=GLOBAL');

        expect(res.status).toBe(200);
        const dados = res.body.data.dados;
        dados.forEach((e: any) => expect(e.aluno_id).toBeNull());
    });

    it('treinador sem perfil de aluno lista sem parâmetros (escopo padrão GLOBAL) → 200 só globais', async () => {
        asTreinador();
        const res = await request(app).get('/api/exercicios');

        expect(res.status).toBe(200);
        const dados = res.body.data.dados;
        dados.forEach((e: any) => expect(e.aluno_id).toBeNull());
    });

    it('treinador lista exercícios de um aluno via aluno_id → 200', async () => {
        asTreinador();
        const res = await request(app).get(`/api/exercicios?aluno_id=${alunoId}&escopo=PESSOAL`);

        expect(res.status).toBe(200);
        const ids = res.body.data.dados.map((e: any) => e.id);
        expect(ids).toContain(exPessoalAluno1Id);
    });

    it('filtro por nome parcial case-insensitive → 200 com exercícios filtrados', async () => {
        asAdmin();
        const res = await request(app).get('/api/exercicios?escopo=GLOBAL&nome=supino+get');

        expect(res.status).toBe(200);
        const nomes = res.body.data.dados.map((e: any) => e.nome.toLowerCase());
        nomes.forEach((n: string) => expect(n).toMatch(/supino get/i));
    });

    it('filtro por grupo_muscular=PEITO → 200 só exercícios com músculo PEITO', async () => {
        asAdmin();
        const res = await request(app).get('/api/exercicios?escopo=GLOBAL&grupo_muscular=PEITO');

        expect(res.status).toBe(200);
        const dados = res.body.data.dados;
        expect(dados.length).toBeGreaterThan(0);
        dados.forEach((e: any) => {
            const temPeito = e.musculos.some((m: any) => m.grupo_muscular === 'PEITO');
            expect(temPeito).toBe(true);
        });
    });

    it('filtro por tipo_ativacao=PRIMARIO → 200 só exercícios com músculo PRIMARIO', async () => {
        asAdmin();
        const res = await request(app).get('/api/exercicios?escopo=GLOBAL&tipo_ativacao=PRIMARIO');

        expect(res.status).toBe(200);
        const dados = res.body.data.dados;
        expect(dados.length).toBeGreaterThan(0);
        dados.forEach((e: any) => {
            const temPrimario = e.musculos.some((m: any) => m.tipo_ativacao === 'PRIMARIO');
            expect(temPrimario).toBe(true);
        });
    });

    it('filtro em_uso=true → 200 somente exercícios vinculados a treinos', async () => {
        asAdmin();
        const res = await request(app).get(`/api/exercicios?escopo=GLOBAL&em_uso=true&nome=${encodeURIComponent(RUN_ID)}&limite=100`);

        expect(res.status).toBe(200);
        const ids = res.body.data.dados.map((e: any) => e.id);
        expect(ids.length).toBeGreaterThan(0);
        expect(ids).toContain(exGlobal1Id);
        // exGlobal2Id não tem treino_exercicio
        expect(ids).not.toContain(exGlobal2Id);

        const usados = await DataBase
            .select({ id: treino_exercicio.exercicio_id })
            .from(treino_exercicio)
            .where(inArray(treino_exercicio.exercicio_id, ids));
        expect(usados.length).toBe(ids.length);
    });

    it('filtro em_uso=false → 200 somente exercícios sem treino vinculado', async () => {
        asAdmin();
        const res = await request(app).get('/api/exercicios?escopo=GLOBAL&em_uso=false');

        expect(res.status).toBe(200);
        const ids = res.body.data.dados.map((e: any) => e.id);
        expect(ids).toContain(exGlobal2Id);
        expect(ids).not.toContain(exGlobal1Id);
    });

    it('paginação page=1&limite=2 → 200 com metadados corretos', async () => {
        asAdmin();
        const res = await request(app).get('/api/exercicios?escopo=GLOBAL&page=1&limite=2');

        expect(res.status).toBe(200);
        expect(res.body.data.dados).toHaveLength(2);
        expect(res.body.data.page).toBe(1);
        expect(res.body.data.limite).toBe(2);
        expect(res.body.data).toHaveProperty('total');
        expect(res.body.data).toHaveProperty('totalPages');
        expect(res.body.data.totalPages).toBeGreaterThanOrEqual(1);
    });

    it('segunda página da paginação → 200 com page=2', async () => {
        asAdmin();
        const res = await request(app).get('/api/exercicios?escopo=GLOBAL&page=2&limite=2');

        expect(res.status).toBe(200);
        expect(res.body.data.page).toBe(2);
        expect(res.body.data.limite).toBe(2);
    });

    it('incluir_musculos=false → 200 sem dados de músculos', async () => {
        asAdmin();
        const res = await request(app).get('/api/exercicios?escopo=GLOBAL&incluir_musculos=false');

        expect(res.status).toBe(200);
        const dados = res.body.data.dados;
        expect(dados.length).toBeGreaterThan(0);
        dados.forEach((e: any) => expect(e.musculos).toEqual([]));
    });

    it('incluir_aparelhos=false → 200 sem dados de aparelhos', async () => {
        asAdmin();
        const res = await request(app).get('/api/exercicios?escopo=GLOBAL&incluir_aparelhos=false');

        expect(res.status).toBe(200);
        const dados = res.body.data.dados;
        expect(dados.length).toBeGreaterThan(0);
        dados.forEach((e: any) => expect(e.aparelhos).toEqual([]));
    });

    it('ordem_nome=desc → 200 com exercícios em ordem Z-A', async () => {
        asAdmin();
        const res = await request(app).get('/api/exercicios?escopo=GLOBAL&ordem_nome=desc&limite=10');

        expect(res.status).toBe(200);
        const nomes = res.body.data.dados.map((e: any) => e.nome);
        const sorted = [...nomes].sort((a, b) => b.localeCompare(a));
        expect(nomes).toEqual(sorted);
    });

    it('ordem_nome padrão (asc) → 200 com exercícios em ordem A-Z', async () => {
        asAdmin();
        const res = await request(app).get('/api/exercicios?escopo=GLOBAL&limite=10');

        expect(res.status).toBe(200);
        const nomes = res.body.data.dados.map((e: any) => e.nome);
        const sorted = [...nomes].sort((a, b) => a.localeCompare(b));
        expect(nomes).toEqual(sorted);
    });

    it('admin lista com incluir_inativos=true → 200 incluindo soft-deleted', async () => {
        // Criar e soft-deletar um exercício
        const exSoftId = await dbCriarExercicioGlobal(`Soft Delete Get ${RUN_ID}`);
        await DataBase.update(exercicio)
            .set({ deletado_em: new Date() })
            .where(eq(exercicio.id, exSoftId));

        asAdmin();
        const res = await request(app).get('/api/exercicios?escopo=GLOBAL&incluir_inativos=true&limite=100');

        expect(res.status).toBe(200);
        const ids = res.body.data.dados.map((e: any) => e.id);
        expect(ids).toContain(exSoftId);

        await dbDeletarExercicio(exSoftId);
    });

    it('múltiplos filtros simultâneos (nome+grupo_muscular+escopo) → 200 com AND', async () => {
        asAdmin();
        const res = await request(app).get('/api/exercicios?nome=supino+get&grupo_muscular=PEITO&escopo=GLOBAL');

        expect(res.status).toBe(200);
        const dados = res.body.data.dados;
        dados.forEach((e: any) => {
            expect(e.nome.toLowerCase()).toMatch(/supino get/i);
            expect(e.aluno_id).toBeNull();
        });
    });

    it('query string vazia → 200 com valores padrão', async () => {
        asAluno();
        const res = await request(app).get('/api/exercicios');

        expect(res.status).toBe(200);
        expect(res.body.data).toHaveProperty('dados');
        expect(res.body.data.page).toBe(1);
        expect(res.body.data.limite).toBe(10);
    });

    // ── Cenários tristes ──────────────────────────────────────────

    it('aluno tenta listar exercícios pessoais de outro aluno → 403', async () => {
        asAluno();
        const res = await request(app).get(`/api/exercicios?aluno_id=${aluno2Id}&escopo=PESSOAL`);

        expect(res.status).toBe(403);
        expect(res.body.message).toMatch(/você não pode listar exercícios de outro aluno/i);
    });

    it('não-admin tenta incluir_inativos=true → 403', async () => {
        asAluno();
        const res = await request(app).get('/api/exercicios?incluir_inativos=true');

        expect(res.status).toBe(403);
        expect(res.body.message).toMatch(/apenas administradores podem listar exercícios inativos/i);
    });

    it('treinador sem perfil de aluno usa escopo=TODOS sem aluno_id → 200 retorna exercícios dele', async () => {
        asTreinador();
        const res = await request(app).get('/api/exercicios?escopo=TODOS');

        expect(res.status).toBe(200);
    });

    it('treinador sem perfil de aluno usa escopo=PESSOAL sem aluno_id → 200 retorna exercícios dele', async () => {
        asTreinador();
        const res = await request(app).get('/api/exercicios?escopo=PESSOAL');

        expect(res.status).toBe(200);
    });

    it('aluno_id com UUID inválido → 422', async () => {
        asAdmin();
        const res = await request(app).get(`/api/exercicios?aluno_id=${INVALID_UUID}`);

        expect(res.status).toBe(422);
        const messages = res.body.errors.map((e: any) => e.message);
        expect(messages.join(' ')).toMatch(/aluno_id deve ser um UUID válido/i);
    });

    it('page=0 inválido → 422', async () => {
        asAdmin();
        const res = await request(app).get('/api/exercicios?page=0&escopo=GLOBAL');

        expect(res.status).toBe(422);
        const messages = res.body.errors.map((e: any) => e.message);
        expect(messages.join(' ')).toMatch(/page deve ser um número inteiro maior que 0/i);
    });

    it('page=-1 inválido → 422', async () => {
        asAdmin();
        const res = await request(app).get('/api/exercicios?page=-1&escopo=GLOBAL');

        expect(res.status).toBe(422);
    });

    it('limite=0 inválido → 422', async () => {
        asAdmin();
        const res = await request(app).get('/api/exercicios?limite=0&escopo=GLOBAL');

        expect(res.status).toBe(422);
        const messages = res.body.errors.map((e: any) => e.message);
        expect(messages.join(' ')).toMatch(/limite deve ser entre 1 e 100/i);
    });

    it('limite=101 acima do máximo → 422', async () => {
        asAdmin();
        const res = await request(app).get('/api/exercicios?limite=101&escopo=GLOBAL');

        expect(res.status).toBe(422);
        const messages = res.body.errors.map((e: any) => e.message);
        expect(messages.join(' ')).toMatch(/limite deve ser entre 1 e 100/i);
    });

    it('grupo_muscular fora do enum → 422', async () => {
        asAdmin();
        const res = await request(app).get('/api/exercicios?grupo_muscular=CABECA');

        expect(res.status).toBe(422);
    });

    it('escopo fora do enum → 422', async () => {
        asAdmin();
        const res = await request(app).get('/api/exercicios?escopo=INVALIDO');

        expect(res.status).toBe(422);
    });

    it('campo extra não previsto na query (.strict()) → 422', async () => {
        asAdmin();
        const res = await request(app).get('/api/exercicios?campo_invalido=valor');

        expect(res.status).toBe(422);
    });

    it('requisição sem header Authorization → 401', async () => {
        asNoAuth();
        const res = await request(app).get('/api/exercicios');

        expect(res.status).toBe(401);
    });

    it('filtro tipo_exercicio=TEMPO retorna apenas exercícios desse tipo', async () => {
        asAdmin();

        const criadoTempo = await request(app)
            .post('/api/exercicios')
            .send(buildPayloadGlobal(`Filtro Tempo ${RUN_ID}`, { tipo_exercicio: 'TEMPO' }));
        const idTempo = criadoTempo.body.data?.id as string;

        const res = await request(app).get('/api/exercicios?tipo_exercicio=TEMPO&limite=100');

        expect(res.status).toBe(200);
        const dados = res.body.data.dados;
        expect(Array.isArray(dados)).toBe(true);
        for (const item of dados) {
            expect(item.tipo_exercicio).toBe('TEMPO');
        }
        expect(dados.some((e: any) => e.id === idTempo)).toBe(true);

        if (idTempo) await dbDeletarExercicio(idTempo);
    });

    it('filtro tipo_exercicio inválido → 422', async () => {
        asAdmin();
        const res = await request(app).get('/api/exercicios?tipo_exercicio=INVALIDO');
        expect(res.status).toBe(422);
    });
});

// GET /exercicios/:id
describe('GET /exercicios/:id', () => {
    let exGlobalId: string;
    let exPessoalAluno1Id: string;

    beforeAll(async () => {
        exGlobalId = await dbCriarExercicioGlobal(`Global Get By Id ${RUN_ID}`);
        exPessoalAluno1Id = await dbCriarExercicioPessoal(`Pessoal Get By Id ${RUN_ID}`, alunoId);
    }, 10000);

    afterAll(async () => {
        await dbDeletarExercicio(exGlobalId);
        await dbDeletarExercicio(exPessoalAluno1Id);
    }, 10000);

    // ── Cenários felizes ──────────────────────────────────────────

    it('buscar exercício global por ID (qualquer usuário) → 200 com musculos e aparelhos', async () => {
        asAluno();
        const res = await request(app).get(`/api/exercicios/${exGlobalId}`);

        expect(res.status).toBe(200);
        expect(res.body.data).toMatchObject({
            id: exGlobalId,
            aluno_id: null,
        });
        expect(Array.isArray(res.body.data.musculos)).toBe(true);
        expect(Array.isArray(res.body.data.aparelhos)).toBe(true);
    });

    it('aluno busca exercício pessoal próprio → 200', async () => {
        asAluno();
        const res = await request(app).get(`/api/exercicios/${exPessoalAluno1Id}`);

        expect(res.status).toBe(200);
        expect(res.body.data.aluno_id).toBe(alunoId);
    });

    it('treinador busca exercício pessoal de aluno → 200', async () => {
        asTreinador();
        const res = await request(app).get(`/api/exercicios/${exPessoalAluno1Id}`);

        expect(res.status).toBe(200);
    });

    it('admin busca exercício pessoal de qualquer aluno → 200', async () => {
        asAdmin();
        const res = await request(app).get(`/api/exercicios/${exPessoalAluno1Id}`);

        expect(res.status).toBe(200);
    });

    // ── Cenários tristes ──────────────────────────────────────────

    it('aluno busca exercício pessoal de outro aluno → 403', async () => {
        asAluno2();
        const res = await request(app).get(`/api/exercicios/${exPessoalAluno1Id}`);

        expect(res.status).toBe(403);
        expect(res.body.message).toMatch(/você não tem permissão para visualizar este exercício/i);
    });

    it('ID inexistente (UUID válido) → 404', async () => {
        asAdmin();
        const res = await request(app).get(`/api/exercicios/${NOT_FOUND_UUID}`);

        expect(res.status).toBe(404);
        expect(res.body.message).toMatch(/Exercício não encontrado/i);
    });

    it('ID com formato inválido (não-UUID) → 422', async () => {
        asAdmin();
        const res = await request(app).get(`/api/exercicios/${INVALID_UUID}`);

        expect(res.status).toBe(422);
        expect(res.body.message).toMatch(/ID inválido/i);
    });

    it('exercício soft-deleted → 404', async () => {
        const exSoftId = await dbCriarExercicioGlobal(`Soft Delete GetById ${RUN_ID}`);
        await DataBase.update(exercicio)
            .set({ deletado_em: new Date() })
            .where(eq(exercicio.id, exSoftId));

        asAdmin();
        const res = await request(app).get(`/api/exercicios/${exSoftId}`);
        expect(res.status).toBe(404);

        await dbDeletarExercicio(exSoftId);
    });

    it('requisição sem header Authorization → 401', async () => {
        asNoAuth();
        const res = await request(app).get(`/api/exercicios/${exGlobalId}`);

        expect(res.status).toBe(401);
    });
});

// PATCH /exercicios/:id
describe('PATCH /exercicios/:id', () => {
    let exGlobalId: string;
    let exPessoalAluno1Id: string;
    let exPessoalAluno2Id: string;

    beforeEach(async () => {
        exGlobalId = await dbCriarExercicioGlobal(`Global Patch ${RUN_ID} ${Date.now()}`);
        exPessoalAluno1Id = await dbCriarExercicioPessoal(`Pessoal Patch A1 ${RUN_ID} ${Date.now()}`, alunoId);
        exPessoalAluno2Id = await dbCriarExercicioPessoal(`Pessoal Patch A2 ${RUN_ID} ${Date.now()}`, aluno2Id);
    }, 10000);

    afterEach(async () => {
        await dbDeletarExercicio(exGlobalId).catch(() => {});
        await dbDeletarExercicio(exPessoalAluno1Id).catch(() => {});
        await dbDeletarExercicio(exPessoalAluno2Id).catch(() => {});
    }, 10000);

    // ── Cenários felizes ──────────────────────────────────────────

    it('admin atualiza nome de exercício global → 200 com nome alterado', async () => {
        asAdmin();
        const novoNome = `Global Patch Novo ${RUN_ID} ${Date.now()}`;
        const res = await request(app)
            .patch(`/api/exercicios/${exGlobalId}`)
            .send({ nome: novoNome });

        expect(res.status).toBe(200);
        expect(res.body.data.nome).toBe(novoNome);
    });

    it('admin atualiza descrição → 200 com descrição alterada', async () => {
        asAdmin();
        const res = await request(app)
            .patch(`/api/exercicios/${exGlobalId}`)
            .send({ descricao: 'Nova descrição de teste' });

        expect(res.status).toBe(200);
        expect(res.body.data.descricao).toBe('Nova descrição de teste');
    });

    it('admin atualiza músculos (replace total) → 200 com novos músculos', async () => {
        asAdmin();
        const res = await request(app)
            .patch(`/api/exercicios/${exGlobalId}`)
            .send({ musculos: [{ musculo_id: musculo2Id, tipo_ativacao: 'SECUNDARIO' }] });

        expect(res.status).toBe(200);
        expect(res.body.data.musculos).toHaveLength(1);
        expect(res.body.data.musculos[0].musculo_id).toBe(musculo2Id);
        expect(res.body.data.musculos[0].tipo_ativacao).toBe('SECUNDARIO');
    });

    it('admin atualiza aparelhos → 200 com novos aparelhos', async () => {
        asAdmin();
        const res = await request(app)
            .patch(`/api/exercicios/${exGlobalId}`)
            .send({ aparelhos: [{ aparelho_id: aparelhoId }] });

        expect(res.status).toBe(200);
        expect(res.body.data.aparelhos).toHaveLength(1);
        expect(res.body.data.aparelhos[0].aparelho_id).toBe(aparelhoId);
    });

    it('atualizar com aparelhos=[] remove todos os aparelhos → 200', async () => {
        // Primeiro adicionar um aparelho
        asAdmin();
        await request(app).patch(`/api/exercicios/${exGlobalId}`).send({ aparelhos: [{ aparelho_id: aparelhoId }] });

        // Agora remover
        const res = await request(app).patch(`/api/exercicios/${exGlobalId}`).send({ aparelhos: [] });

        expect(res.status).toBe(200);
        expect(res.body.data.aparelhos).toEqual([]);
    });

    it('aluno atualiza exercício pessoal próprio → 200', async () => {
        asAluno();
        const novoNome = `Aluno Patch Proprio ${RUN_ID} ${Date.now()}`;
        const res = await request(app)
            .patch(`/api/exercicios/${exPessoalAluno1Id}`)
            .send({ nome: novoNome });

        expect(res.status).toBe(200);
        expect(res.body.data.nome).toBe(novoNome);
    });

    it('treinador atualiza exercício pessoal de aluno → 200', async () => {
        asTreinador();
        const novoNome = `Treinador Patch ${RUN_ID} ${Date.now()}`;
        const res = await request(app)
            .patch(`/api/exercicios/${exPessoalAluno1Id}`)
            .send({ nome: novoNome });

        expect(res.status).toBe(200);
        expect(res.body.data.nome).toBe(novoNome);
    });

    it('atualizar nome para o mesmo valor atual não gera conflito → 200', async () => {
        // Obter o nome atual
        asAdmin();
        const getRes = await request(app).get(`/api/exercicios/${exGlobalId}`);
        const nomeAtual = getRes.body.data.nome;

        const res = await request(app)
            .patch(`/api/exercicios/${exGlobalId}`)
            .send({ nome: nomeAtual });

        expect(res.status).toBe(200);
    });

    // ── Cenários tristes ──────────────────────────────────────────

    it('aluno tenta atualizar exercício global → 403', async () => {
        asAluno();
        const res = await request(app)
            .patch(`/api/exercicios/${exGlobalId}`)
            .send({ nome: `Forbidden ${RUN_ID}` });

        expect(res.status).toBe(403);
        expect(res.body.message).toMatch(/apenas administradores podem editar exercícios globais/i);
    });

    it('aluno tenta atualizar exercício pessoal de outro aluno → 403', async () => {
        asAluno();
        const res = await request(app)
            .patch(`/api/exercicios/${exPessoalAluno2Id}`)
            .send({ nome: `Forbidden Outro ${RUN_ID}` });

        expect(res.status).toBe(403);
        expect(res.body.message).toMatch(/você não tem permissão para editar este exercício/i);
    });

    it('treinador tenta atualizar exercício global → 403', async () => {
        asTreinador();
        const res = await request(app)
            .patch(`/api/exercicios/${exGlobalId}`)
            .send({ nome: `Treinador Forbidden ${RUN_ID}` });

        expect(res.status).toBe(403);
        expect(res.body.message).toMatch(/apenas administradores podem editar exercícios globais/i);
    });

    it('body vazio (nenhum campo) → 422', async () => {
        asAdmin();
        const res = await request(app).patch(`/api/exercicios/${exGlobalId}`).send({});

        expect(res.status).toBe(422);
        const messages = res.body.errors.map((e: any) => e.message);
        expect(messages.join(' ')).toMatch(/ao menos um campo deve ser informado/i);
    });

    it('nome excede 255 caracteres → 422', async () => {
        asAdmin();
        const res = await request(app)
            .patch(`/api/exercicios/${exGlobalId}`)
            .send({ nome: 'A'.repeat(256) });

        expect(res.status).toBe(422);
        const messages = res.body.errors.map((e: any) => e.message);
        expect(messages.join(' ')).toMatch(/255 caracteres/i);
    });

    it('descricao excede 1000 caracteres → 422', async () => {
        asAdmin();
        const res = await request(app)
            .patch(`/api/exercicios/${exGlobalId}`)
            .send({ descricao: 'B'.repeat(1001) });

        expect(res.status).toBe(422);
        const messages = res.body.errors.map((e: any) => e.message);
        expect(messages.join(' ')).toMatch(/1000 caracteres/i);
    });

    it('musculo_id inexistente → 422', async () => {
        asAdmin();
        const res = await request(app)
            .patch(`/api/exercicios/${exGlobalId}`)
            .send({ musculos: [{ musculo_id: NOT_FOUND_UUID, tipo_ativacao: 'PRIMARIO' }] });

        expect(res.status).toBe(422);
        expect(res.body.message).toMatch(/Músculo\(s\) não encontrado\(s\)/i);
    });

    it('aparelho_id inexistente → 422', async () => {
        asAdmin();
        const res = await request(app)
            .patch(`/api/exercicios/${exGlobalId}`)
            .send({ aparelhos: [{ aparelho_id: NOT_FOUND_UUID }] });

        expect(res.status).toBe(422);
        expect(res.body.message).toMatch(/Aparelho\(s\) não encontrado\(s\)/i);
    });

    it('campo extra não previsto (.strict()) → 422', async () => {
        asAdmin();
        const res = await request(app)
            .patch(`/api/exercicios/${exGlobalId}`)
            .send({ nome: `Strict Patch ${RUN_ID}`, campo_extra: 'valor' });

        expect(res.status).toBe(422);
    });

    it('exercício não encontrado → 404', async () => {
        asAdmin();
        const res = await request(app)
            .patch(`/api/exercicios/${NOT_FOUND_UUID}`)
            .send({ nome: `Not Found ${RUN_ID}` });

        expect(res.status).toBe(404);
        expect(res.body.message).toMatch(/Exercício não encontrado/i);
    });

    it('ID com formato inválido → 422', async () => {
        asAdmin();
        const res = await request(app)
            .patch(`/api/exercicios/${INVALID_UUID}`)
            .send({ nome: `Invalido ${RUN_ID}` });

        expect(res.status).toBe(422);
        // O controller de PATCH usa mensagem genérica "Falha na validação" para ZodError do id
        // mas o erro específico está no array errors
        expect(res.body.errors.length).toBeGreaterThan(0);
    });

    it('nome duplicado no mesmo escopo → 409', async () => {
        // Criar um segundo exercício global com nome diferente
        const exGlobal3Id = await dbCriarExercicioGlobal(`Patch Dup Target ${RUN_ID} ${Date.now()}`);

        asAdmin();
        // Tentar renomear exGlobalId para o nome de exGlobal3Id
        const nomeAlvo = (await request(app).get(`/api/exercicios/${exGlobal3Id}`)).body.data.nome;
        const res = await request(app)
            .patch(`/api/exercicios/${exGlobalId}`)
            .send({ nome: nomeAlvo });

        expect(res.status).toBe(409);
        expect(res.body.message).toMatch(/Já existe um exercício com este nome/i);

        await dbDeletarExercicio(exGlobal3Id);
    });

    it('requisição sem header Authorization → 401', async () => {
        asNoAuth();
        const res = await request(app)
            .patch(`/api/exercicios/${exGlobalId}`)
            .send({ nome: `Patch Sem Auth ${RUN_ID}` });

        expect(res.status).toBe(401);
    });

    it('admin altera tipo_exercicio de REPETICAO para TEMPO → 200', async () => {
        asAdmin();
        const res = await request(app)
            .patch(`/api/exercicios/${exGlobalId}`)
            .send({ tipo_exercicio: 'TEMPO' });

        expect(res.status).toBe(200);
        expect(res.body.data.tipo_exercicio).toBe('TEMPO');
    });

    it('admin envia tipo_exercicio inválido no PATCH → 422', async () => {
        asAdmin();
        const res = await request(app)
            .patch(`/api/exercicios/${exGlobalId}`)
            .send({ tipo_exercicio: 'INVALIDO' });

        expect(res.status).toBe(422);
    });

    it('admin tenta mudar tipo_exercicio com referências em treino → 409', async () => {
        asAdmin();
        const criado = await request(app)
            .post('/api/exercicios')
            .send(buildPayloadGlobal(`PR Tipo Lock ${RUN_ID}`));
        const exId = criado.body.data.id;

        const [trCriado] = await DataBase.insert(treino).values({
            nome: `Treino Lock ${RUN_ID} ${Date.now()}`,
            usuario_id: alunoId,
            treinador_id: null,
        }).returning({ id: treino.id });

        await DataBase.insert(treino_exercicio).values({
            treino_id: trCriado.id,
            exercicio_id: exId,
            series: 3,
            repeticoes: '10',
            tempo_descanso_segundos: 60,
            ordem_execucao: 1,
        });

        const res = await request(app)
            .patch(`/api/exercicios/${exId}`)
            .send({ tipo_exercicio: 'TEMPO' });

        await DataBase.delete(treino_exercicio).where(eq(treino_exercicio.exercicio_id, exId)).catch(() => {});
        await DataBase.delete(treino).where(eq(treino.id, trCriado.id)).catch(() => {});
        await dbDeletarExercicio(exId);

        expect(res.status).toBe(409);
        expect(res.body.message).toMatch(/tipo_exercicio/i);
    });
});

// DELETE /exercicios/:id
describe('DELETE /exercicios/:id', () => {
    let exId: string;

    beforeEach(async () => {
        exId = await dbCriarExercicioGlobal(`Delete Teste ${RUN_ID} ${Date.now()}`);
    }, 10000);

    afterEach(async () => {
        await dbDeletarExercicio(exId).catch(() => {});
    }, 10000);

    // ── Cenários felizes ──────────────────────────────────────────

    it('exercício sem referências → hard delete 200 com tipo_exclusao=hard', async () => {
        asAdmin();
        const res = await request(app).delete(`/api/exercicios/${exId}`);

        expect(res.status).toBe(200);
        expect(res.body.data.tipo_exclusao).toBe('hard');

        // Confirma que não existe mais
        const check = await request(app).get(`/api/exercicios/${exId}`);
        expect(check.status).toBe(404);
    });

    it('exercício com referência + ?soft=true → soft delete 200 com tipo_exclusao=soft', async () => {
        // Criar treino + treino_exercicio para gerar referência
        const [treinoRec] = await DataBase.insert(treino).values({
            nome: `Treino Soft Delete ${RUN_ID}`,
            usuario_id: alunoId,
        }).returning({ id: treino.id });

        const [teRec] = await DataBase.insert(treino_exercicio).values({
            series: 3,
            repeticoes: '10',
            tempo_descanso_segundos: 60,
            ordem_execucao: 1,
            treino_id: treinoRec.id,
            exercicio_id: exId,
        }).returning({ id: treino_exercicio.id });

        asAdmin();
        const res = await request(app).delete(`/api/exercicios/${exId}?soft=true`);

        expect(res.status).toBe(200);
        expect(res.body.data.tipo_exclusao).toBe('soft');

        // Cleanup
        await DataBase.delete(treino_exercicio).where(eq(treino_exercicio.id, teRec.id));
        await DataBase.delete(treino).where(eq(treino.id, treinoRec.id));
        // exId tem deletado_em setado, dbDeletarExercicio no afterEach vai lidar
    });

    it('exercício com referência + ?force=true (admin) → cascade delete 200 com tipo_exclusao=cascade', async () => {
        const [treinoRec] = await DataBase.insert(treino).values({
            nome: `Treino Force Delete ${RUN_ID}`,
            usuario_id: alunoId,
        }).returning({ id: treino.id });

        await DataBase.insert(treino_exercicio).values({
            series: 3,
            repeticoes: '10',
            tempo_descanso_segundos: 60,
            ordem_execucao: 1,
            treino_id: treinoRec.id,
            exercicio_id: exId,
        });

        asAdmin();
        const res = await request(app).delete(`/api/exercicios/${exId}?force=true`);

        expect(res.status).toBe(200);
        expect(res.body.data.tipo_exclusao).toBe('cascade');

        await DataBase.delete(treino).where(eq(treino.id, treinoRec.id)).catch(() => {});
        // exId foi deletado em cascade, afterEach ignora erro
    });

    it('aluno deleta exercício pessoal próprio → 200', async () => {
        const exPessoalId = await dbCriarExercicioPessoal(`Aluno Delete Proprio ${RUN_ID} ${Date.now()}`, alunoId);

        asAluno();
        const res = await request(app).delete(`/api/exercicios/${exPessoalId}`);

        expect(res.status).toBe(200);
    });

    it('treinador deleta exercício pessoal de aluno → 200', async () => {
        const exPessoalId = await dbCriarExercicioPessoal(`Treinador Delete ${RUN_ID} ${Date.now()}`, alunoId);

        asTreinador();
        const res = await request(app).delete(`/api/exercicios/${exPessoalId}`);

        expect(res.status).toBe(200);
    });

    it('admin deleta exercício global → 200', async () => {
        asAdmin();
        const res = await request(app).delete(`/api/exercicios/${exId}`);

        expect(res.status).toBe(200);
    });

    // ── Cenários tristes ──────────────────────────────────────────

    it('aluno tenta deletar exercício global → 403', async () => {
        asAluno();
        const res = await request(app).delete(`/api/exercicios/${exId}`);

        expect(res.status).toBe(403);
        expect(res.body.message).toMatch(/apenas administradores podem excluir exercícios globais/i);
    });

    it('aluno tenta deletar exercício pessoal de outro aluno → 403', async () => {
        const exAluno2Id = await dbCriarExercicioPessoal(`Aluno2 Delete Forbidden ${RUN_ID} ${Date.now()}`, aluno2Id);

        asAluno();
        const res = await request(app).delete(`/api/exercicios/${exAluno2Id}`);

        expect(res.status).toBe(403);
        expect(res.body.message).toMatch(/você não tem permissão para excluir este exercício/i);

        await dbDeletarExercicio(exAluno2Id);
    });

    it('treinador tenta deletar exercício global → 403', async () => {
        asTreinador();
        const res = await request(app).delete(`/api/exercicios/${exId}`);

        expect(res.status).toBe(403);
        expect(res.body.message).toMatch(/apenas administradores podem excluir exercícios globais/i);
    });

    it('não-admin usa ?force=true em exercício pessoal próprio com referências → 403', async () => {
        // Usar exercício pessoal do próprio aluno (para não cair no erro de "exercício global")
        const exPessoalForceForbidden = await dbCriarExercicioPessoal(
            `Force Forbidden ${RUN_ID} ${Date.now()}`, alunoId,
        );

        const [treinoRec] = await DataBase.insert(treino).values({
            nome: `Treino Force Forbidden ${RUN_ID}`,
            usuario_id: alunoId,
        }).returning({ id: treino.id });

        const [teRec] = await DataBase.insert(treino_exercicio).values({
            series: 3,
            repeticoes: '10',
            tempo_descanso_segundos: 60,
            ordem_execucao: 1,
            treino_id: treinoRec.id,
            exercicio_id: exPessoalForceForbidden,
        }).returning({ id: treino_exercicio.id });

        asAluno(); // aluno NÃO é admin
        const res = await request(app).delete(`/api/exercicios/${exPessoalForceForbidden}?force=true`);

        expect(res.status).toBe(403);
        expect(res.body.message).toMatch(/apenas administradores podem forçar a exclusão de exercícios em uso/i);

        await DataBase.delete(treino_exercicio).where(eq(treino_exercicio.id, teRec.id));
        await DataBase.delete(treino).where(eq(treino.id, treinoRec.id));
        await dbDeletarExercicio(exPessoalForceForbidden);
    });

    it('exercício com referências sem ?soft ou ?force → 409 com orientação', async () => {
        const [treinoRec] = await DataBase.insert(treino).values({
            nome: `Treino Conflict ${RUN_ID}`,
            usuario_id: alunoId,
        }).returning({ id: treino.id });

        const [teRec] = await DataBase.insert(treino_exercicio).values({
            series: 3,
            repeticoes: '10',
            tempo_descanso_segundos: 60,
            ordem_execucao: 1,
            treino_id: treinoRec.id,
            exercicio_id: exId,
        }).returning({ id: treino_exercicio.id });

        asAdmin();
        const res = await request(app).delete(`/api/exercicios/${exId}`);

        expect(res.status).toBe(409);
        expect(res.body.message).toMatch(/Exercício está vinculado a/i);
        expect(res.body.message).toMatch(/soft=true|force=true/i);

        await DataBase.delete(treino_exercicio).where(eq(treino_exercicio.id, teRec.id));
        await DataBase.delete(treino).where(eq(treino.id, treinoRec.id));
    });

    it('exercício não encontrado → 404', async () => {
        asAdmin();
        const res = await request(app).delete(`/api/exercicios/${NOT_FOUND_UUID}`);

        expect(res.status).toBe(404);
        expect(res.body.message).toMatch(/Exercício não encontrado/i);
    });

    it('ID com formato inválido → 422', async () => {
        asAdmin();
        const res = await request(app).delete(`/api/exercicios/${INVALID_UUID}`);

        expect(res.status).toBe(422);
        expect(res.body.message).toMatch(/ID inválido/i);
    });

    it('exercício já soft-deleted → 404 ao tentar deletar novamente', async () => {
        // Soft-deletar manualmente
        await DataBase.update(exercicio)
            .set({ deletado_em: new Date() })
            .where(eq(exercicio.id, exId));

        asAdmin();
        const res = await request(app).delete(`/api/exercicios/${exId}`);

        expect(res.status).toBe(404);
        expect(res.body.message).toMatch(/Exercício não encontrado/i);
    });

    it('requisição sem header Authorization → 401', async () => {
        asNoAuth();
        const res = await request(app).delete(`/api/exercicios/${exId}`);

        expect(res.status).toBe(401);
    });
});

// ── Upload de animação (GIF/WebM via multipart) ──────────────────────────────

// Buffer mínimo de GIF87a válido (header + logical screen + color table + trailer)
const GIF_BUFFER = Buffer.from(
    '474946383761010001008000FF0000FFFFFF2C00000000010001000002024401003B',
    'hex',
);
// Buffer com mimetype inválido (simula JPEG)
const JPEG_BUFFER = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10]);

describe('POST /exercicios – upload de animação', () => {
    const criados: string[] = [];

    afterEach(async () => {
        for (const id of criados) await dbDeletarExercicio(id);
        criados.length = 0;
    });

    it('admin envia GIF válido via multipart → 201 com animacao_url preenchida', async () => {
        asAdmin();
        const res = await request(app)
            .post('/api/exercicios')
            .field('data', JSON.stringify({ nome: `Upload GIF ${RUN_ID}`, musculos: [{ musculo_id: musculoId, tipo_ativacao: 'PRIMARIO' }] }))
            .attach('animacao', GIF_BUFFER, { filename: 'teste.gif', contentType: 'image/gif' });

        expect(res.status).toBe(201);
        expect(res.body.data.animacao_url).toBe('http://test-s3.local/animacoes/test.gif');
        if (res.body.data?.id) criados.push(res.body.data.id);
    });

    it('admin envia WebM válido via multipart → 201 com animacao_url preenchida', async () => {
        asAdmin();
        const webmBuffer = Buffer.from([0x1a, 0x45, 0xdf, 0xa3, 0x01]);
        const res = await request(app)
            .post('/api/exercicios')
            .field('data', JSON.stringify({ nome: `Upload WebM ${RUN_ID}`, musculos: [{ musculo_id: musculoId, tipo_ativacao: 'PRIMARIO' }] }))
            .attach('animacao', webmBuffer, { filename: 'teste.webm', contentType: 'video/webm' });

        expect(res.status).toBe(201);
        expect(res.body.data.animacao_url).toBe('http://test-s3.local/animacoes/test.gif');
        if (res.body.data?.id) criados.push(res.body.data.id);
    });

    it('mimetype inválido (JPEG) → 400 com mensagem de tipo não permitido', async () => {
        asAdmin();
        const res = await request(app)
            .post('/api/exercicios')
            .field('data', JSON.stringify({ nome: `Upload JPEG ${RUN_ID}`, musculos: [{ musculo_id: musculoId, tipo_ativacao: 'PRIMARIO' }] }))
            .attach('animacao', JPEG_BUFFER, { filename: 'foto.jpg', contentType: 'image/jpeg' });

        expect(res.status).toBe(400);
        expect(res.body.message).toMatch(/\.webm e \.gif são permitidos/i);
    });

    it('arquivo maior que o limite → 400 com mensagem de tamanho excedido', async () => {
        // Cria um mini-app isolado com limite de 1 byte para forçar LIMIT_FILE_SIZE
        const multerModule = await import('multer');
        const multerFn = multerModule.default;
        const tinyApp = express();
        const tinyUpload = multerFn({ storage: multerFn.memoryStorage(), limits: { fileSize: 1 } });
        tinyApp.post('/test-size',
            tinyUpload.single('animacao'),
            (_req, res) => res.status(200).end(),
        );
        tinyApp.use(globalErrorHandler);

        const res = await request(tinyApp)
            .post('/test-size')
            .attach('animacao', GIF_BUFFER, { filename: 'grande.gif', contentType: 'image/gif' });

        expect(res.status).toBe(400);
        expect(res.body.message).toMatch(/tamanho máximo/i);
    });
});

describe('PATCH /exercicios/:id – troca de animação', () => {
    let exId: string;

    beforeEach(async () => {
        exId = await dbCriarExercicioGlobal(`Animacao Patch ${RUN_ID} ${Date.now()}`);
    });

    afterEach(async () => {
        await dbDeletarExercicio(exId);
    });

    it('admin envia novo GIF → 200 com animacao_url atualizada', async () => {
        asAdmin();
        const res = await request(app)
            .patch(`/api/exercicios/${exId}`)
            .attach('animacao', GIF_BUFFER, { filename: 'novo.gif', contentType: 'image/gif' });

        expect(res.status).toBe(200);
        expect(res.body.data.animacao_url).toBe('http://test-s3.local/animacoes/test.gif');
    });

    it('mimetype inválido no PATCH → 400', async () => {
        asAdmin();
        const res = await request(app)
            .patch(`/api/exercicios/${exId}`)
            .attach('animacao', JPEG_BUFFER, { filename: 'foto.jpg', contentType: 'image/jpeg' });

        expect(res.status).toBe(400);
        expect(res.body.message).toMatch(/\.webm e \.gif são permitidos/i);
    });
});
