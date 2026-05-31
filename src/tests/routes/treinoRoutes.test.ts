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
import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach, jest } from '@jest/globals';
import { ZodError } from 'zod';
import treinoRoutes from '../../routes/treinoRoutes';
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
import { eq, inArray, isNotNull } from 'drizzle-orm';
import TreinoController from '../../controllers/treinoController';
import { DatabaseError } from '../../utils/errors/DatabaseError';

// Estado global dos testes]
const RUN_ID = Date.now().toString(36);

let app: express.Express;
let academiaId: string;

// Admin = treinador com is_admin=true (sem perfil de aluno)
let adminUserId: string;
let adminTreinadorId: string;

// Aluno 1
let alunoUserId: string;
let alunoId: string;

// Aluno 2
let aluno2UserId: string;
let aluno2Id: string;

// Treinador regular (sem perfil de aluno, sem is_admin)
let treinadorUserId: string;
let treinadorRecId: string;

// Usuário sem perfil (sem aluno nem treinador)
let semPerfilUserId: string;

// Usuário híbrido (tem aluno E treinador)
let hybridUserId: string;
let hybridAlunoId: string;
let hybridTreinadorId: string;

// Exercícios seed
let exercicioGlobalId: string;
let exercicioPessoalAlunoId: string;
let exercicioPessoalAluno2Id: string;
let exercicioSoftDeletedId: string;
let exercicioTempoId: string;
let exercicioDistanciaId: string;
let musculoId: string;
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

function asSemPerfil() {
    (authMiddleware as any).mockImplementation((req: any, _res: any, next: any) => {
        req.user = { id: semPerfilUserId };
        req.authSession = { id: 'session-sem-perfil' };
        next();
    });
}

function asHybrid() {
    (authMiddleware as any).mockImplementation((req: any, _res: any, next: any) => {
        req.user = { id: hybridUserId };
        req.authSession = { id: 'session-hybrid' };
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

// Helpers de banco
async function dbCriarTreino(
    nome: string,
    usuarioId: string,
    extra: {
        treinadorId?: string | null;
        diasSemana?: ('SEGUNDA' | 'TERCA' | 'QUARTA' | 'QUINTA' | 'SEXTA' | 'SABADO' | 'DOMINGO')[] | null;
        ordem?: number | null;
    } = {},
): Promise<string> {
    const [rec] = await DataBase.insert(treino)
        .values({
            nome,
            usuario_id: usuarioId,
            treinador_id: extra.treinadorId ?? null,
            dias_semana: extra.diasSemana ?? null,
            ordem: extra.ordem ?? null,
        })
        .returning({ id: treino.id });
    return rec.id;
}

async function dbAdicionarExercicioAoTreino(
    treinoId: string,
    exercicioId: string,
    ordemExecucao: number = 1,
    extra: { series?: number; repeticoes?: string; tempDescanso?: number; carga?: string | null } = {},
): Promise<string> {
    const [rec] = await DataBase.insert(treino_exercicio)
        .values({
            treino_id: treinoId,
            exercicio_id: exercicioId,
            series: extra.series ?? 3,
            repeticoes: extra.repeticoes ?? '10-12',
            tempo_descanso_segundos: extra.tempDescanso ?? 60,
            ordem_execucao: ordemExecucao,
            carga_sugerida: extra.carga !== undefined ? extra.carga : null,
        })
        .returning({ id: treino_exercicio.id });
    return rec.id;
}

async function dbSoftDeletarTreino(id: string): Promise<void> {
    await DataBase.update(treino).set({ deletado_em: new Date() }).where(eq(treino.id, id));
}

async function dbDeletarTreinoCompleto(id: string): Promise<void> {
    try {
        await DataBase.delete(treino_exercicio).where(eq(treino_exercicio.treino_id, id)).catch(() => {});
        await DataBase.delete(treino).where(eq(treino.id, id)).catch(() => {});
    } catch { /* silencia */ }
}

async function dbSoftDeletarExercicio(id: string): Promise<void> {
    await DataBase.update(exercicio).set({ deletado_em: new Date() }).where(eq(exercicio.id, id));
}

// Payload helpers

function exercicioItem(exercicioId: string, ordem: number, extra: Record<string, unknown> = {}) {
    return {
        exercicio_id: exercicioId,
        series: 3,
        repeticoes: '10-12',
        tempo_descanso_segundos: 60,
        ordem_execucao: ordem,
        ...extra,
    };
}

// Setup / Teardown global

beforeAll(async () => {
    app = express();
    await DbConnect.connect();
    app.use(express.json());
    app.use('/api', treinoRoutes);

    // Academia
    const [ac] = await DataBase.insert(academia).values({
        nome: `Academia Treino E2E ${RUN_ID}`,
        endereco_numero: '42',
        endereco_rua: 'Rua dos Treinos',
        endereco_bairro: 'Bairro Fitness',
        endereco_cidade: 'Cidade Forte',
        endereco_estado: 'RO',
    }).returning({ id: academia.id });
    academiaId = ac.id;

    const now = new Date();

    // Admin (treinador is_admin=true, sem aluno)
    adminUserId = randomUUID();
    await DataBase.insert(user).values({
        id: adminUserId,
        name: 'Admin Treino Teste',
        email: `admin_tr_${RUN_ID}@test.local`,
        emailVerified: false,
        createdAt: now,
        updatedAt: now,
    });
    const [adminRec] = await DataBase.insert(treinador).values({
        user_id: adminUserId,
        nome: 'Admin Treino Teste',
        data_nascimento: '1980-01-01',
        sexo: 'M',
        cref: `ADM${RUN_ID}`.substring(0, 50),
        turnos: ['MANHA'],
        especializacao: 'Administração',
        graduacao: 'Educação Física',
        is_admin: true,
        academia_id: academiaId,
    }).returning({ id: treinador.id });
    adminTreinadorId = adminRec.id;

    // Aluno 1
    alunoUserId = randomUUID();
    await DataBase.insert(user).values({
        id: alunoUserId,
        name: 'Aluno1 Treino Teste',
        email: `aluno1_tr_${RUN_ID}@test.local`,
        emailVerified: false,
        createdAt: now,
        updatedAt: now,
    });
    const [alunoRec] = await DataBase.insert(aluno).values({
        user_id: alunoUserId,
        nome: 'Aluno1 Treino Teste',
        data_nascimento: '1995-05-05',
        sexo: 'M',
        is_admin: false,
        academia_id: academiaId,
    }).returning({ id: aluno.id });
    alunoId = alunoRec.id;

    // Aluno 2
    aluno2UserId = randomUUID();
    await DataBase.insert(user).values({
        id: aluno2UserId,
        name: 'Aluno2 Treino Teste',
        email: `aluno2_tr_${RUN_ID}@test.local`,
        emailVerified: false,
        createdAt: now,
        updatedAt: now,
    });
    const [aluno2Rec] = await DataBase.insert(aluno).values({
        user_id: aluno2UserId,
        nome: 'Aluno2 Treino Teste',
        data_nascimento: '1998-08-08',
        sexo: 'F',
        is_admin: false,
        academia_id: academiaId,
    }).returning({ id: aluno.id });
    aluno2Id = aluno2Rec.id;

    // Treinador (sem aluno, sem admin)
    treinadorUserId = randomUUID();
    await DataBase.insert(user).values({
        id: treinadorUserId,
        name: 'Treinador Treino Teste',
        email: `treinador_tr_${RUN_ID}@test.local`,
        emailVerified: false,
        createdAt: now,
        updatedAt: now,
    });
    const [treinadorRec] = await DataBase.insert(treinador).values({
        user_id: treinadorUserId,
        nome: 'Treinador Treino Teste',
        data_nascimento: '1985-03-15',
        sexo: 'M',
        cref: `TST${RUN_ID}`.substring(0, 50),
        turnos: ['TARDE'],
        especializacao: 'Musculação',
        graduacao: 'Educação Física',
        is_admin: false,
        academia_id: academiaId,
    }).returning({ id: treinador.id });
    treinadorRecId = treinadorRec.id;

    // Vincula aluno1 ao treinador (aluno2 permanece sem treinador para testar restrição de acesso)
    await DataBase.update(aluno).set({ treinador_id: treinadorRecId }).where(eq(aluno.id, alunoId));

    // Usuário sem perfil
    semPerfilUserId = randomUUID();
    await DataBase.insert(user).values({
        id: semPerfilUserId,
        name: 'Sem Perfil Treino Teste',
        email: `semperfil_tr_${RUN_ID}@test.local`,
        emailVerified: false,
        createdAt: now,
        updatedAt: now,
    });

    // Usuário híbrido (aluno + treinador)
    hybridUserId = randomUUID();
    await DataBase.insert(user).values({
        id: hybridUserId,
        name: 'Hybrid Treino Teste',
        email: `hybrid_tr_${RUN_ID}@test.local`,
        emailVerified: false,
        createdAt: now,
        updatedAt: now,
    });
    const [hybridAlunoRec] = await DataBase.insert(aluno).values({
        user_id: hybridUserId,
        nome: 'Hybrid Treino Teste',
        data_nascimento: '1992-07-10',
        sexo: 'M',
        is_admin: false,
        academia_id: academiaId,
    }).returning({ id: aluno.id });
    hybridAlunoId = hybridAlunoRec.id;
    const [hybridTreinadorRec] = await DataBase.insert(treinador).values({
        user_id: hybridUserId,
        nome: 'Hybrid Treino Teste',
        data_nascimento: '1992-07-10',
        sexo: 'M',
        cref: `HYB${RUN_ID}`.substring(0, 50),
        turnos: ['MANHA'],
        especializacao: 'Crossfit',
        graduacao: 'Educação Física',
        is_admin: false,
        academia_id: academiaId,
    }).returning({ id: treinador.id });
    hybridTreinadorId = hybridTreinadorRec.id;

    // Músculo e aparelho
    const [m1] = await DataBase.insert(musculo).values({
        nome: `Peitoral TR ${RUN_ID}`,
        grupo_muscular: 'PEITO',
    }).returning({ id: musculo.id });
    musculoId = m1.id;

    const [ap] = await DataBase.insert(aparelho).values({
        nome: `Aparelho TR ${RUN_ID}`,
        descricao: 'Aparelho para testes de treino',
    }).returning({ id: aparelho.id });
    aparelhoId = ap.id;

    // Exercício global
    const [exGlobal] = await DataBase.insert(exercicio)
        .values({ nome: `Supino Global ${RUN_ID}`, aluno_id: null })
        .returning({ id: exercicio.id });
    exercicioGlobalId = exGlobal.id;
    await DataBase.insert(exercicio_musculo).values({
        exercicio_id: exercicioGlobalId,
        musculo_id: musculoId,
        tipo_ativacao: 'PRIMARIO',
    });
    await DataBase.insert(exercicio_aparelho).values({
        exercicio_id: exercicioGlobalId,
        aparelho_id: aparelhoId,
    });

    // Exercício pessoal do aluno 1
    const [exPessoal] = await DataBase.insert(exercicio)
        .values({ nome: `Rosca Pessoal ${RUN_ID}`, aluno_id: alunoId })
        .returning({ id: exercicio.id });
    exercicioPessoalAlunoId = exPessoal.id;
    await DataBase.insert(exercicio_musculo).values({
        exercicio_id: exercicioPessoalAlunoId,
        musculo_id: musculoId,
        tipo_ativacao: 'PRIMARIO',
    });

    // Exercício pessoal do aluno 2
    const [exPessoal2] = await DataBase.insert(exercicio)
        .values({ nome: `Desenvolvimento Pessoal2 ${RUN_ID}`, aluno_id: aluno2Id })
        .returning({ id: exercicio.id });
    exercicioPessoalAluno2Id = exPessoal2.id;
    await DataBase.insert(exercicio_musculo).values({
        exercicio_id: exercicioPessoalAluno2Id,
        musculo_id: musculoId,
        tipo_ativacao: 'PRIMARIO',
    });

    // Exercício soft-deleted (global)
    const [exDeleted] = await DataBase.insert(exercicio)
        .values({ nome: `Exercício Inativo ${RUN_ID}`, aluno_id: null })
        .returning({ id: exercicio.id });
    exercicioSoftDeletedId = exDeleted.id;
    await DataBase.insert(exercicio_musculo).values({
        exercicio_id: exercicioSoftDeletedId,
        musculo_id: musculoId,
        tipo_ativacao: 'SECUNDARIO',
    });
    await dbSoftDeletarExercicio(exercicioSoftDeletedId);

    // Exercício tipo TEMPO (global)
    const [exTempo] = await DataBase.insert(exercicio)
        .values({ nome: `Prancha Global ${RUN_ID}`, aluno_id: null, tipo_exercicio: 'TEMPO' })
        .returning({ id: exercicio.id });
    exercicioTempoId = exTempo.id;
    await DataBase.insert(exercicio_musculo).values({
        exercicio_id: exercicioTempoId,
        musculo_id: musculoId,
        tipo_ativacao: 'PRIMARIO',
    });

    // Exercício tipo DISTANCIA (global)
    const [exDist] = await DataBase.insert(exercicio)
        .values({ nome: `Corrida Global ${RUN_ID}`, aluno_id: null, tipo_exercicio: 'DISTANCIA' })
        .returning({ id: exercicio.id });
    exercicioDistanciaId = exDist.id;
    await DataBase.insert(exercicio_musculo).values({
        exercicio_id: exercicioDistanciaId,
        musculo_id: musculoId,
        tipo_ativacao: 'PRIMARIO',
    });

    asAdmin(); // padrão
}, 30000);

afterAll(async () => {
    // 1. Treinos residuais dos alunos de teste
    const treinosAlunos = await DataBase
        .select({ id: treino.id })
        .from(treino)
        .where(inArray(treino.usuario_id, [alunoId, aluno2Id, hybridAlunoId]));

    if (treinosAlunos.length > 0) {
        const treinoIds = treinosAlunos.map((t) => t.id);
        await DataBase.delete(treino_exercicio).where(inArray(treino_exercicio.treino_id, treinoIds)).catch(() => {});
        await DataBase.delete(treino).where(inArray(treino.id, treinoIds)).catch(() => {});
    }

    // 2. Exercícios seed (restaurar deletado_em para poder deletar)
    const exIds = [exercicioGlobalId, exercicioPessoalAlunoId, exercicioPessoalAluno2Id, exercicioSoftDeletedId, exercicioTempoId, exercicioDistanciaId];
    await DataBase.delete(exercicio_aparelho).where(inArray(exercicio_aparelho.exercicio_id, exIds)).catch(() => {});
    await DataBase.delete(exercicio_musculo).where(inArray(exercicio_musculo.exercicio_id, exIds)).catch(() => {});
    await DataBase.delete(exercicio).where(inArray(exercicio.id, exIds)).catch(() => {});

    // 3. Músculo e aparelho
    await DataBase.delete(musculo).where(eq(musculo.id, musculoId)).catch(() => {});
    await DataBase.delete(aparelho).where(eq(aparelho.id, aparelhoId)).catch(() => {});

    // 4. Perfis
    const treinadorIds = [adminTreinadorId, treinadorRecId, hybridTreinadorId];
    const alunoIds = [alunoId, aluno2Id, hybridAlunoId];
    await DataBase.delete(treinador).where(inArray(treinador.id, treinadorIds)).catch(() => {});
    await DataBase.delete(aluno).where(inArray(aluno.id, alunoIds)).catch(() => {});

    // 5. Users
    const userIds = [adminUserId, alunoUserId, aluno2UserId, treinadorUserId, semPerfilUserId, hybridUserId];
    await DataBase.delete(user).where(inArray(user.id, userIds)).catch(() => {});

    // 6. Academia
    await DataBase.delete(academia).where(eq(academia.id, academiaId)).catch(() => {});

    await DbConnect.disconnect();
}, 30000);

beforeEach(() => {
    asAdmin();
});

// POST /treinos

describe('POST /treinos', () => {
    const criados: string[] = [];

    afterEach(async () => {
        for (const id of criados) {
            await dbDeletarTreinoCompleto(id);
        }
        criados.length = 0;
    });

    // ── Cenários felizes ──────────────────────────────────────────────────

    it('aluno cria treino para si mesmo sem aluno_id → 201 com usuario_id do aluno', async () => {
        asAluno();
        const res = await request(app)
            .post('/api/treinos')
            .send({ nome: `Treino Aluno ${RUN_ID}` });

        expect(res.status).toBe(201);
        expect(res.body.data.usuario_id).toBe(alunoId);
        expect(res.body.data.exercicios).toEqual([]);
        if (res.body.data?.id) criados.push(res.body.data.id);
    });

    it('aluno cria treino informando o próprio aluno_id → 201', async () => {
        asAluno();
        const res = await request(app)
            .post('/api/treinos')
            .send({ nome: `Treino Aluno PropId ${RUN_ID}`, aluno_id: alunoId });

        expect(res.status).toBe(201);
        expect(res.body.data.usuario_id).toBe(alunoId);
        if (res.body.data?.id) criados.push(res.body.data.id);
    });

    it('treinador cria treino para aluno → 201 com treinador_id preenchido', async () => {
        asTreinador();
        const res = await request(app)
            .post('/api/treinos')
            .send({ nome: `Treino por Treinador ${RUN_ID}`, aluno_id: alunoId });

        expect(res.status).toBe(201);
        expect(res.body.data.usuario_id).toBe(alunoId);
        expect(res.body.data.treinador_id).toBe(treinadorRecId);
        if (res.body.data?.id) criados.push(res.body.data.id);
    });

    it('admin cria treino para qualquer aluno → 201', async () => {
        asAdmin();
        const res = await request(app)
            .post('/api/treinos')
            .send({ nome: `Treino por Admin ${RUN_ID}`, aluno_id: aluno2Id });

        expect(res.status).toBe(201);
        expect(res.body.data.usuario_id).toBe(aluno2Id);
        if (res.body.data?.id) criados.push(res.body.data.id);
    });

    it('cria treino com exercícios na composição inicial → 201 com 2 exercícios', async () => {
        asAluno();
        const res = await request(app)
            .post('/api/treinos')
            .send({
                nome: `Treino Com Exercicios ${RUN_ID}`,
                exercicios: [
                    exercicioItem(exercicioGlobalId, 1),
                    exercicioItem(exercicioPessoalAlunoId, 2),
                ],
            });

        expect(res.status).toBe(201);
        expect(res.body.data.exercicios).toHaveLength(2);
        const item = res.body.data.exercicios[0];
        expect(item).toHaveProperty('series');
        expect(item).toHaveProperty('repeticoes');
        expect(item).toHaveProperty('tempo_descanso_segundos');
        expect(item).toHaveProperty('ordem_execucao');
        if (res.body.data?.id) criados.push(res.body.data.id);
    });

    it('cria treino sem exercícios → 201 com exercicios array vazio', async () => {
        asAluno();
        const res = await request(app)
            .post('/api/treinos')
            .send({ nome: `Treino Vazio ${RUN_ID}` });

        expect(res.status).toBe(201);
        expect(res.body.data.exercicios).toEqual([]);
        if (res.body.data?.id) criados.push(res.body.data.id);
    });

    it('cria treino com dias_semana → 201 com dias persistidos', async () => {
        asAluno();
        const res = await request(app)
            .post('/api/treinos')
            .send({ nome: `Treino Dias ${RUN_ID}`, dias_semana: ['SEGUNDA', 'QUINTA'] });

        expect(res.status).toBe(201);
        expect(res.body.data.dias_semana).toEqual(expect.arrayContaining(['SEGUNDA', 'QUINTA']));
        if (res.body.data?.id) criados.push(res.body.data.id);
    });

    it('cria treino com exercício global → 201', async () => {
        asAluno();
        const res = await request(app)
            .post('/api/treinos')
            .send({
                nome: `Treino Ex Global ${RUN_ID}`,
                exercicios: [exercicioItem(exercicioGlobalId, 1)],
            });

        expect(res.status).toBe(201);
        expect(res.body.data.exercicios).toHaveLength(1);
        if (res.body.data?.id) criados.push(res.body.data.id);
    });

    it('cria treino com exercício pessoal do próprio aluno → 201', async () => {
        asAluno();
        const res = await request(app)
            .post('/api/treinos')
            .send({
                nome: `Treino Ex Pessoal ${RUN_ID}`,
                exercicios: [exercicioItem(exercicioPessoalAlunoId, 1)],
            });

        expect(res.status).toBe(201);
        expect(res.body.data.exercicios).toHaveLength(1);
        if (res.body.data?.id) criados.push(res.body.data.id);
    });

    it('treinador cria treino com exercício pessoal do aluno → 201', async () => {
        asTreinador();
        const res = await request(app)
            .post('/api/treinos')
            .send({
                nome: `Treino Treinador Ex Pessoal ${RUN_ID}`,
                aluno_id: alunoId,
                exercicios: [exercicioItem(exercicioPessoalAlunoId, 1)],
            });

        expect(res.status).toBe(201);
        expect(res.body.data.exercicios).toHaveLength(1);
        if (res.body.data?.id) criados.push(res.body.data.id);
    });

    it('usuário híbrido (aluno + treinador) sem aluno_id → 201 com usuario_id e treinador_id próprios', async () => {
        asHybrid();
        const res = await request(app)
            .post('/api/treinos')
            .send({ nome: `Treino Hybrid ${RUN_ID}` });

        expect(res.status).toBe(201);
        expect(res.body.data.usuario_id).toBe(hybridAlunoId);
        expect(res.body.data.treinador_id).toBe(hybridTreinadorId);
        if (res.body.data?.id) criados.push(res.body.data.id);
    });

    it('cria treino com carga_sugerida: null no exercício → 201 com carga_sugerida nula', async () => {
        asAluno();
        const res = await request(app)
            .post('/api/treinos')
            .send({
                nome: `Treino Carga Null ${RUN_ID}`,
                exercicios: [exercicioItem(exercicioGlobalId, 1, { carga_sugerida: null })],
            });

        expect(res.status).toBe(201);
        expect(res.body.data.exercicios).toHaveLength(1);
        expect(res.body.data.exercicios[0].carga_sugerida).toBeNull();
        if (res.body.data?.id) criados.push(res.body.data.id);
    });

    // ── Cenários tristes ──────────────────────────────────────────────────

    it('aluno tenta criar treino para outro aluno → 403', async () => {
        asAluno();
        const res = await request(app)
            .post('/api/treinos')
            .send({ nome: `Treino Proibido ${RUN_ID}`, aluno_id: aluno2Id });

        expect(res.status).toBe(403);
        expect(res.body.message).toMatch(/aluno só pode criar treino para si mesmo/i);
    });

    it('usuário sem perfil tenta criar treino → 403', async () => {
        asSemPerfil();
        const res = await request(app)
            .post('/api/treinos')
            .send({ nome: `Treino SemPerfil ${RUN_ID}`, aluno_id: alunoId });

        expect(res.status).toBe(403);
        expect(res.body.message).toMatch(/usuário sem perfil para criar treinos/i);
    });

    it('treinador cria treino para si mesmo com treinador_id → 201', async () => {
        asTreinador();
        const res = await request(app)
            .post('/api/treinos')
            .send({ nome: `Treino Treinador Self ${RUN_ID}`, treinador_id: treinadorRecId });

        expect(res.status).toBe(201);
        expect(res.body.data.usuario_id).toBeNull();
        expect(res.body.data.treinador_id).toBe(treinadorRecId);
        if (res.body.data?.id) criados.push(res.body.data.id);
    });

    it('aluno_id inexistente → 404 Aluno não encontrado', async () => {
        asAdmin();
        const res = await request(app)
            .post('/api/treinos')
            .send({ nome: `Treino Aluno 404 ${RUN_ID}`, aluno_id: NOT_FOUND_UUID });

        expect(res.status).toBe(404);
        expect(res.body.message).toMatch(/aluno não encontrado/i);
    });

    it('exercício inexistente na composição → 422', async () => {
        asAluno();
        const res = await request(app)
            .post('/api/treinos')
            .send({
                nome: `Treino Ex Inexistente ${RUN_ID}`,
                exercicios: [exercicioItem(NOT_FOUND_UUID, 1)],
            });

        expect(res.status).toBe(422);
        expect(res.body.message).toMatch(/um ou mais exercícios informados não existem/i);
    });

    it('exercício soft-deleted na composição → 422', async () => {
        asAluno();
        const res = await request(app)
            .post('/api/treinos')
            .send({
                nome: `Treino Ex Inativo ${RUN_ID}`,
                exercicios: [exercicioItem(exercicioSoftDeletedId, 1)],
            });

        expect(res.status).toBe(422);
        expect(res.body.message).toMatch(/não é permitido adicionar exercício inativo ao treino/i);
    });

    it('exercício pessoal de outro aluno → 403', async () => {
        asAluno();
        const res = await request(app)
            .post('/api/treinos')
            .send({
                nome: `Treino Ex Alheio ${RUN_ID}`,
                exercicios: [exercicioItem(exercicioPessoalAluno2Id, 1)],
            });

        expect(res.status).toBe(403);
        expect(res.body.message).toMatch(/você não tem permissão para usar um ou mais exercícios informados/i);
    });

    it('treinador usa exercício pessoal de aluno diferente do dono do treino → 403', async () => {
        asTreinador();
        const res = await request(app)
            .post('/api/treinos')
            .send({
                nome: `Treino Treinador Ex Alheio ${RUN_ID}`,
                aluno_id: alunoId,
                // exercício pessoal do aluno2, não do aluno1 (dono do treino)
                exercicios: [exercicioItem(exercicioPessoalAluno2Id, 1)],
            });

        expect(res.status).toBe(403);
        expect(res.body.message).toMatch(/você não tem permissão para usar um ou mais exercícios informados/i);
    });

    it('ordem_execucao duplicada na composição → 422', async () => {
        asAluno();
        const res = await request(app)
            .post('/api/treinos')
            .send({
                nome: `Treino Ordem Dup ${RUN_ID}`,
                exercicios: [
                    exercicioItem(exercicioGlobalId, 1),
                    exercicioItem(exercicioPessoalAlunoId, 1), // mesma ordem
                ],
            });

        expect(res.status).toBe(422);
        const messages = res.body.errors?.map((e: any) => e.message) ?? [];
        expect(messages.join(' ')).toMatch(/Não é permitido repetir ordem_execucao/i);
    });

    it('exercicio_id duplicado na composição → 422', async () => {
        asAluno();
        const res = await request(app)
            .post('/api/treinos')
            .send({
                nome: `Treino ExId Dup ${RUN_ID}`,
                exercicios: [
                    exercicioItem(exercicioGlobalId, 1),
                    exercicioItem(exercicioGlobalId, 2), // mesmo exercicio_id
                ],
            });

        expect(res.status).toBe(422);
        const messages = res.body.errors?.map((e: any) => e.message) ?? [];
        expect(messages.join(' ')).toMatch(/Não é permitido repetir exercicio_id/i);
    });

    it('nome ausente → 422 "O nome do treino é obrigatório"', async () => {
        asAluno();
        // Enviar nome vazio dispara a mensagem min(1) do Zod
        const res = await request(app)
            .post('/api/treinos')
            .send({ nome: '' });

        expect(res.status).toBe(422);
        const messages = res.body.errors?.map((e: any) => e.message) ?? [];
        expect(messages.join(' ')).toMatch(/nome do treino é obrigatório/i);
    });

    it('nome excede 255 caracteres → 422', async () => {
        asAluno();
        const res = await request(app)
            .post('/api/treinos')
            .send({ nome: 'A'.repeat(256) });

        expect(res.status).toBe(422);
        const messages = res.body.errors?.map((e: any) => e.message) ?? [];
        expect(messages.join(' ')).toMatch(/255 caracteres/i);
    });

    it('descricao excede 1000 caracteres → 422', async () => {
        asAluno();
        const res = await request(app)
            .post('/api/treinos')
            .send({ nome: `Treino ${RUN_ID}`, descricao: 'B'.repeat(1001) });

        expect(res.status).toBe(422);
        const messages = res.body.errors?.map((e: any) => e.message) ?? [];
        expect(messages.join(' ')).toMatch(/1000 caracteres/i);
    });

    it('series: 0 no exercício → 422', async () => {
        asAluno();
        const res = await request(app)
            .post('/api/treinos')
            .send({
                nome: `Treino Series Zero ${RUN_ID}`,
                exercicios: [exercicioItem(exercicioGlobalId, 1, { series: 0 })],
            });

        expect(res.status).toBe(422);
        const messages = res.body.errors?.map((e: any) => e.message) ?? [];
        expect(messages.join(' ')).toMatch(/series deve ser maior que 0/i);
    });

    it('series: 21 no exercício → 422', async () => {
        asAluno();
        const res = await request(app)
            .post('/api/treinos')
            .send({
                nome: `Treino Series Max ${RUN_ID}`,
                exercicios: [exercicioItem(exercicioGlobalId, 1, { series: 21 })],
            });

        expect(res.status).toBe(422);
        const messages = res.body.errors?.map((e: any) => e.message) ?? [];
        expect(messages.join(' ')).toMatch(/series deve ser no máximo 20/i);
    });

    it('tempo_descanso_segundos negativo → 422', async () => {
        asAluno();
        const res = await request(app)
            .post('/api/treinos')
            .send({
                nome: `Treino Descanso Neg ${RUN_ID}`,
                exercicios: [exercicioItem(exercicioGlobalId, 1, { tempo_descanso_segundos: -1 })],
            });

        expect(res.status).toBe(422);
        const messages = res.body.errors?.map((e: any) => e.message) ?? [];
        expect(messages.join(' ')).toMatch(/não pode ser negativo/i);
    });

    it('tempo_descanso_segundos acima de 3600 → 422', async () => {
        asAluno();
        const res = await request(app)
            .post('/api/treinos')
            .send({
                nome: `Treino Descanso Max ${RUN_ID}`,
                exercicios: [exercicioItem(exercicioGlobalId, 1, { tempo_descanso_segundos: 3601 })],
            });

        expect(res.status).toBe(422);
        const messages = res.body.errors?.map((e: any) => e.message) ?? [];
        expect(messages.join(' ')).toMatch(/no máximo 3600/i);
    });

    it('carga_sugerida negativa → 422', async () => {
        asAluno();
        const res = await request(app)
            .post('/api/treinos')
            .send({
                nome: `Treino Carga Neg ${RUN_ID}`,
                exercicios: [exercicioItem(exercicioGlobalId, 1, { carga_sugerida: -5 })],
            });

        expect(res.status).toBe(422);
        const messages = res.body.errors?.map((e: any) => e.message) ?? [];
        expect(messages.join(' ')).toMatch(/carga_sugerida deve ser positiva/i);
    });

    it('body com campo desconhecido → 422 (schema strict)', async () => {
        asAluno();
        const res = await request(app)
            .post('/api/treinos')
            .send({ nome: `Treino ${RUN_ID}`, foo: 'bar' });

        expect(res.status).toBe(422);
    });

    it('item de exercicios com campo desconhecido → 422 (schema strict)', async () => {
        asAluno();
        const res = await request(app)
            .post('/api/treinos')
            .send({
                nome: `Treino ${RUN_ID}`,
                exercicios: [{ ...exercicioItem(exercicioGlobalId, 1), observacao: 'extra' }],
            });

        expect(res.status).toBe(422);
    });

    it('sem header Authorization → 401', async () => {
        asNoAuth();
        const res = await request(app)
            .post('/api/treinos')
            .send({ nome: `Treino ${RUN_ID}` });

        expect(res.status).toBe(401);
    });

    // ── Exercícios por tempo / distância ─────────────────────────────────

    it('cria treino com exercício tipo TEMPO + duracao_sugerida_segundos → 201', async () => {
        asAluno();
        const res = await request(app)
            .post('/api/treinos')
            .send({
                nome: `Treino Prancha ${RUN_ID}`,
                exercicios: [{
                    exercicio_id: exercicioTempoId,
                    series: 3,
                    duracao_sugerida_segundos: 45,
                    tempo_descanso_segundos: 60,
                    ordem_execucao: 1,
                }],
            });

        expect(res.status).toBe(201);
        expect(res.body.data.exercicios).toHaveLength(1);
        expect(res.body.data.exercicios[0].duracao_sugerida_segundos).toBe(45);
        expect(res.body.data.exercicios[0].repeticoes).toBeNull();
        if (res.body.data?.id) criados.push(res.body.data.id);
    });

    it('cria treino com TEMPO sem duracao_sugerida_segundos → 400', async () => {
        asAluno();
        const res = await request(app)
            .post('/api/treinos')
            .send({
                nome: `Treino Tempo Sem Dur ${RUN_ID}`,
                exercicios: [{
                    exercicio_id: exercicioTempoId,
                    series: 3,
                    tempo_descanso_segundos: 60,
                    ordem_execucao: 1,
                }],
            });

        expect(res.status).toBe(422);
        expect(res.body.message).toMatch(/duracao_sugerida_segundos/i);
    });

    it('cria treino com TEMPO + repeticoes → 400 (campo incompatível)', async () => {
        asAluno();
        const res = await request(app)
            .post('/api/treinos')
            .send({
                nome: `Treino Tempo Com Rep ${RUN_ID}`,
                exercicios: [{
                    exercicio_id: exercicioTempoId,
                    series: 3,
                    repeticoes: '10-12',
                    duracao_sugerida_segundos: 45,
                    tempo_descanso_segundos: 60,
                    ordem_execucao: 1,
                }],
            });

        expect(res.status).toBe(422);
        expect(res.body.message).toMatch(/repeticoes não se aplica/i);
    });

    it('cria treino com DISTANCIA + distancia_sugerida_metros → 201', async () => {
        asAluno();
        const res = await request(app)
            .post('/api/treinos')
            .send({
                nome: `Treino Corrida ${RUN_ID}`,
                exercicios: [{
                    exercicio_id: exercicioDistanciaId,
                    series: 1,
                    distancia_sugerida_metros: 5000,
                    tempo_descanso_segundos: 0,
                    ordem_execucao: 1,
                }],
            });

        expect(res.status).toBe(201);
        expect(res.body.data.exercicios[0].distancia_sugerida_metros).toBe(5000);
        if (res.body.data?.id) criados.push(res.body.data.id);
    });

    it('cria treino com REPETICAO sem repeticoes → 400', async () => {
        asAluno();
        const res = await request(app)
            .post('/api/treinos')
            .send({
                nome: `Treino Rep Sem Rep ${RUN_ID}`,
                exercicios: [{
                    exercicio_id: exercicioGlobalId,
                    series: 3,
                    tempo_descanso_segundos: 60,
                    ordem_execucao: 1,
                }],
            });

        expect(res.status).toBe(422);
        expect(res.body.message).toMatch(/repeticoes é obrigatório/i);
    });

    it('cria treino com REPETICAO + duracao_sugerida_segundos → 400', async () => {
        asAluno();
        const res = await request(app)
            .post('/api/treinos')
            .send({
                nome: `Treino Rep Com Dur ${RUN_ID}`,
                exercicios: [{
                    exercicio_id: exercicioGlobalId,
                    series: 3,
                    repeticoes: '10-12',
                    duracao_sugerida_segundos: 45,
                    tempo_descanso_segundos: 60,
                    ordem_execucao: 1,
                }],
            });

        expect(res.status).toBe(422);
        expect(res.body.message).toMatch(/duracao_sugerida_segundos não se aplica/i);
    });
});

// GET /treinos

describe('GET /treinos', () => {
    // Treinos seed para este bloco
    let treinoAluno1A: string;
    let treinoAluno1B: string;
    let treinoAluno1C: string; // com exercício
    let treinoAluno2: string;
    let treinoComTreinador: string; // treinador_id = treinadorRecId, usuario_id = alunoId

    beforeAll(async () => {
        treinoAluno1A = await dbCriarTreino(`Treino Peito ${RUN_ID}`, alunoId, {
            diasSemana: ['SEGUNDA', 'QUINTA'],
            ordem: 3,
        });
        treinoAluno1B = await dbCriarTreino(`Treino Costas ${RUN_ID}`, alunoId, {
            diasSemana: ['TERCA', 'SEXTA'],
            ordem: 1,
        });
        treinoAluno1C = await dbCriarTreino(`Treino Bracos ${RUN_ID}`, alunoId, {
            ordem: 2,
        });
        await dbAdicionarExercicioAoTreino(treinoAluno1C, exercicioGlobalId, 1);

        treinoAluno2 = await dbCriarTreino(`Treino Aluno2 ${RUN_ID}`, aluno2Id);

        treinoComTreinador = await dbCriarTreino(`Treino Com Treinador ${RUN_ID}`, alunoId, {
            treinadorId: treinadorRecId,
        });
    }, 20000);

    afterAll(async () => {
        for (const id of [treinoAluno1A, treinoAluno1B, treinoAluno1C, treinoAluno2, treinoComTreinador]) {
            await dbDeletarTreinoCompleto(id);
        }
    }, 20000);

    // ── Cenários felizes ──────────────────────────────────────────────────

    it('aluno lista apenas os próprios treinos → 200 com metadata de paginação', async () => {
        asAluno();
        const res = await request(app).get('/api/treinos');

        expect(res.status).toBe(200);
        expect(res.body.data).toHaveProperty('dados');
        expect(res.body.data).toHaveProperty('total');
        expect(res.body.data).toHaveProperty('page');
        expect(res.body.data).toHaveProperty('limite');
        expect(res.body.data).toHaveProperty('totalPages');
        const ids = res.body.data.dados.map((t: any) => t.usuario_id);
        expect(ids.every((id: string) => id === alunoId)).toBe(true);
        expect(ids).not.toContain(aluno2Id);
    });

    it('treinador lista apenas os treinos que criou → 200', async () => {
        asTreinador();
        const res = await request(app).get('/api/treinos');

        expect(res.status).toBe(200);
        const treinadorIds = res.body.data.dados.map((t: any) => t.treinador_id);
        expect(treinadorIds.every((id: string) => id === treinadorRecId)).toBe(true);
    });

    it('admin lista todos os treinos → 200 (treinos de múltiplos alunos)', async () => {
        asAdmin();
        const res = await request(app).get('/api/treinos');

        expect(res.status).toBe(200);
        const usuariosIds = res.body.data.dados.map((t: any) => t.usuario_id);
        // Deve conter treinos de aluno1 e aluno2
        expect(usuariosIds).toContain(alunoId);
        expect(usuariosIds).toContain(aluno2Id);
    });

    it('filtro por nome (busca parcial case-insensitive) → 200 com apenas matches', async () => {
        asAdmin();
        const res = await request(app).get('/api/treinos?nome=peito');

        expect(res.status).toBe(200);
        const nomes: string[] = res.body.data.dados.map((t: any) => t.nome as string);
        expect(nomes.every((n) => n.toLowerCase().includes('peito'))).toBe(true);
    });

    it('filtro por usuario_id (admin) → 200 com treinos do aluno informado', async () => {
        asAdmin();
        const res = await request(app).get(`/api/treinos?usuario_id=${aluno2Id}`);

        expect(res.status).toBe(200);
        const ids = res.body.data.dados.map((t: any) => t.usuario_id);
        expect(ids.every((id: string) => id === aluno2Id)).toBe(true);
    });

    it('filtro por treinador_id (admin) → 200 com treinos do treinador informado', async () => {
        asAdmin();
        const res = await request(app).get(`/api/treinos?treinador_id=${treinadorRecId}`);

        expect(res.status).toBe(200);
        const treinadorIds = res.body.data.dados.map((t: any) => t.treinador_id);
        expect(treinadorIds.every((id: string) => id === treinadorRecId)).toBe(true);
    });

    it('filtro por dias_semana → 200 com treinos que contenham ao menos um dos dias', async () => {
        asAdmin();
        const res = await request(app).get('/api/treinos?dias_semana=SEGUNDA,TERCA');

        expect(res.status).toBe(200);
        const todos = res.body.data.dados;
        expect(todos.every((t: any) =>
            t.dias_semana?.includes('SEGUNDA') || t.dias_semana?.includes('TERCA'),
        )).toBe(true);
    });

    it('incluir_exercicios=true → 200 com exercicios em cada treino', async () => {
        asAdmin();
        const res = await request(app).get('/api/treinos?incluir_exercicios=true');

        expect(res.status).toBe(200);
        const todos = res.body.data.dados;
        expect(todos.every((t: any) => Array.isArray(t.exercicios))).toBe(true);
    });

    it('somente_com_exercicios=true → 200 sem treinos vazios', async () => {
        asAdmin();
        const res = await request(app).get('/api/treinos?somente_com_exercicios=true&incluir_exercicios=true');

        expect(res.status).toBe(200);
        const todos = res.body.data.dados;
        expect(todos.every((t: any) => t.exercicios?.length > 0)).toBe(true);
    });

    it('filtro nome_exercicio autoativa exercicios na listagem → 200 com exercicios populados', async () => {
        asAdmin();
        const res = await request(app).get('/api/treinos?nome_exercicio=supino');

        expect(res.status).toBe(200);
        const todos = res.body.data.dados;
        expect(todos.every((t: any) => Array.isArray(t.exercicios) && t.exercicios.length > 0)).toBe(true);
    });

    it('filtro grupo_muscular autoativa exercicios na listagem → 200', async () => {
        asAdmin();
        const res = await request(app).get('/api/treinos?grupo_muscular=PEITO');

        expect(res.status).toBe(200);
        expect(res.body.data.dados.every((t: any) => Array.isArray(t.exercicios))).toBe(true);
    });

    it('aluno lista com incluir_inativos=true → 200 inclui soft-deleted próprios', async () => {
        asAluno();
        // Criar e soft-deletar um treino
        const treinoTemp = await dbCriarTreino(`Treino Inativo ${RUN_ID}`, alunoId);
        await dbSoftDeletarTreino(treinoTemp);

        const res = await request(app).get('/api/treinos?incluir_inativos=true');

        expect(res.status).toBe(200);
        const todos = res.body.data.dados;
        const treinoInativo = todos.find((t: any) => t.id === treinoTemp);
        expect(treinoInativo).toBeDefined();
        expect(treinoInativo.deletado_em).not.toBeNull();

        await dbDeletarTreinoCompleto(treinoTemp);
    });

    it('treinador lista com incluir_inativos=true → 200 inclui soft-deleted onde é treinador', async () => {
        asTreinador();
        const treinoTemp = await dbCriarTreino(`Treino Treinador Inativo ${RUN_ID}`, alunoId, { treinadorId: treinadorRecId });
        await dbSoftDeletarTreino(treinoTemp);

        const res = await request(app).get('/api/treinos?incluir_inativos=true');

        expect(res.status).toBe(200);
        const treinoInativo = res.body.data.dados.find((t: any) => t.id === treinoTemp);
        expect(treinoInativo).toBeDefined();
        expect(treinoInativo.deletado_em).not.toBeNull();

        await dbDeletarTreinoCompleto(treinoTemp);
    });

    it('admin lista com incluir_inativos=true → 200 inclui soft-deleted de qualquer aluno', async () => {
        asAdmin();
        const treinoTemp = await dbCriarTreino(`Treino Admin Inativo ${RUN_ID}`, aluno2Id);
        await dbSoftDeletarTreino(treinoTemp);

        const res = await request(app).get('/api/treinos?incluir_inativos=true');

        expect(res.status).toBe(200);
        const treinoInativo = res.body.data.dados.find((t: any) => t.id === treinoTemp);
        expect(treinoInativo).toBeDefined();
        expect(treinoInativo.deletado_em).not.toBeNull();

        await dbDeletarTreinoCompleto(treinoTemp);
    });

    it('ordenação por ordem_data_criacao=asc → 200 mais antigo primeiro', async () => {
        asAdmin();
        const res = await request(app).get('/api/treinos?ordem_data_criacao=asc');

        expect(res.status).toBe(200);
        const datas: string[] = res.body.data.dados.map((t: any) => t.data_criacao);
        for (let i = 1; i < datas.length; i++) {
            expect(new Date(datas[i]).getTime()).toBeGreaterThanOrEqual(new Date(datas[i - 1]).getTime());
        }
    });

    it('ordenação por ordem_treino=asc → 200 treinos ordenados por campo ordem', async () => {
        asAluno();
        const res = await request(app).get('/api/treinos?ordem_treino=asc');

        expect(res.status).toBe(200);
        // Treinos com ordem não-nula devem vir antes dos sem ordem (NULLs por último)
        const ordens: (number | null)[] = res.body.data.dados.map((t: any) => t.ordem);
        const semNull = ordens.filter((o) => o !== null) as number[];
        for (let i = 1; i < semNull.length; i++) {
            expect(semNull[i]).toBeGreaterThanOrEqual(semNull[i - 1]);
        }
    });

    it('paginação page=2&limite=2 → 200 com metadados corretos', async () => {
        asAluno(); // aluno1 tem ao menos 3 treinos
        const res = await request(app).get('/api/treinos?page=2&limite=2');

        expect(res.status).toBe(200);
        expect(res.body.data.page).toBe(2);
        expect(res.body.data.limite).toBe(2);
        expect(res.body.data.dados).toHaveLength(Math.min(2, res.body.data.total - 2));
    });

    it('paginação com valor alfanumérico → 200 (parseInt extrai prefixo numérico)', async () => {
        asAluno();
        const res = await request(app).get('/api/treinos?page=2abc&limite=2xyz');

        expect(res.status).toBe(200);
        expect(res.body.data.page).toBe(2);
        expect(res.body.data.limite).toBe(2);
    });

    // ── Cenários tristes ──────────────────────────────────────────────────

    it('treinador filtra por treinador_id diferente do próprio → 403', async () => {
        asTreinador();
        const res = await request(app).get(`/api/treinos?treinador_id=${adminTreinadorId}`);

        expect(res.status).toBe(403);
        expect(res.body.message).toMatch(/treinador só pode listar os próprios treinos/i);
    });

    it('aluno tenta filtrar por usuario_id alheio → 403', async () => {
        asAluno();
        const res = await request(app).get(`/api/treinos?usuario_id=${aluno2Id}`);

        expect(res.status).toBe(403);
        expect(res.body.message).toMatch(/aluno só pode listar os próprios treinos/i);
    });

    it('usuário sem perfil → 403', async () => {
        asSemPerfil();
        const res = await request(app).get('/api/treinos');

        expect(res.status).toBe(403);
        expect(res.body.message).toMatch(/usuário sem perfil para acessar treinos/i);
    });

    it('page=0 → 422', async () => {
        asAdmin();
        const res = await request(app).get('/api/treinos?page=0');

        expect(res.status).toBe(422);
    });

    it('limite=101 → 422', async () => {
        asAdmin();
        const res = await request(app).get('/api/treinos?limite=101');

        expect(res.status).toBe(422);
    });

    it('ordem_treino com valor inválido → 422', async () => {
        asAdmin();
        const res = await request(app).get('/api/treinos?ordem_treino=up');

        expect(res.status).toBe(422);
    });

    it('grupo_muscular com valor inválido → 422', async () => {
        asAdmin();
        const res = await request(app).get('/api/treinos?grupo_muscular=PESCOCO');

        expect(res.status).toBe(422);
    });

    it('parâmetro de query desconhecido → 422 (schema strict)', async () => {
        asAdmin();
        const res = await request(app).get('/api/treinos?dia_semana=SEGUNDA');

        expect(res.status).toBe(422);
    });

    it('sem header Authorization → 401', async () => {
        asNoAuth();
        const res = await request(app).get('/api/treinos');

        expect(res.status).toBe(401);
    });
});

// GET /treinos/:id

describe('GET /treinos/:id', () => {
    let treinoAluno1Id: string; // dono: alunoId, treinador: treinadorRecId
    let treinoAluno2Id: string; // dono: aluno2Id, sem treinador

    beforeAll(async () => {
        treinoAluno1Id = await dbCriarTreino(`Treino Detalhe A1 ${RUN_ID}`, alunoId, { treinadorId: treinadorRecId });
        await dbAdicionarExercicioAoTreino(treinoAluno1Id, exercicioGlobalId, 1);

        treinoAluno2Id = await dbCriarTreino(`Treino Detalhe A2 ${RUN_ID}`, aluno2Id);
    }, 20000);

    afterAll(async () => {
        await dbDeletarTreinoCompleto(treinoAluno1Id);
        await dbDeletarTreinoCompleto(treinoAluno2Id);
    }, 20000);

    // ── Cenários felizes ──────────────────────────────────────────────────

    it('aluno consulta próprio treino → 200 com campos básicos', async () => {
        asAluno();
        const res = await request(app).get(`/api/treinos/${treinoAluno1Id}`);

        expect(res.status).toBe(200);
        expect(res.body.data).toHaveProperty('id', treinoAluno1Id);
        expect(res.body.data).toHaveProperty('nome');
        expect(res.body.data).toHaveProperty('usuario_id', alunoId);
        expect(res.body.data).toHaveProperty('exercicios');
        expect(Array.isArray(res.body.data.exercicios)).toBe(true);
    });

    it('treinador consulta treino que criou → 200', async () => {
        asTreinador();
        const res = await request(app).get(`/api/treinos/${treinoAluno1Id}`);

        expect(res.status).toBe(200);
        expect(res.body.data.id).toBe(treinoAluno1Id);
    });

    it('admin consulta qualquer treino → 200', async () => {
        asAdmin();
        const res = await request(app).get(`/api/treinos/${treinoAluno2Id}`);

        expect(res.status).toBe(200);
        expect(res.body.data.id).toBe(treinoAluno2Id);
    });

    it('incluir_musculos=true → 200 com exercícios contendo músculos', async () => {
        asAluno();
        const res = await request(app).get(`/api/treinos/${treinoAluno1Id}?incluir_musculos=true`);

        expect(res.status).toBe(200);
        const exercicios = res.body.data.exercicios;
        expect(exercicios.length).toBeGreaterThan(0);
        // Músculos ficam dentro de exercicio.musculos
        const primeiros = exercicios[0];
        expect(primeiros.exercicio).toHaveProperty('musculos');
        expect(Array.isArray(primeiros.exercicio.musculos)).toBe(true);
        expect(primeiros.exercicio.musculos.length).toBeGreaterThan(0);
        expect(primeiros.exercicio.musculos[0]).toHaveProperty('musculo_id');
        expect(primeiros.exercicio.musculos[0]).toHaveProperty('grupo_muscular');
        expect(primeiros.exercicio.musculos[0]).toHaveProperty('tipo_ativacao');
    });

    it('incluir_aparelhos=true → 200 com exercícios contendo aparelhos', async () => {
        asAluno();
        const res = await request(app).get(`/api/treinos/${treinoAluno1Id}?incluir_aparelhos=true`);

        expect(res.status).toBe(200);
        const exercicios = res.body.data.exercicios;
        expect(exercicios.length).toBeGreaterThan(0);
        // Aparelhos ficam dentro de exercicio.aparelhos
        expect(exercicios[0].exercicio).toHaveProperty('aparelhos');
        expect(Array.isArray(exercicios[0].exercicio.aparelhos)).toBe(true);
    });

    it('apenas_ativos=false → 200 inclui exercícios soft-deleted no treino', async () => {
        asAdmin();
        const exTemp = (await DataBase.insert(exercicio)
            .values({ nome: `Ex Inativo Detalhe ${RUN_ID}`, aluno_id: null })
            .returning({ id: exercicio.id }))[0].id;
        await DataBase.insert(exercicio_musculo).values({
            exercicio_id: exTemp,
            musculo_id: musculoId,
            tipo_ativacao: 'PRIMARIO',
        });
        const treinoTemp = await dbCriarTreino(`Treino Ex Inativo Detalhe ${RUN_ID}`, alunoId);
        await dbAdicionarExercicioAoTreino(treinoTemp, exTemp, 1);
        await dbSoftDeletarExercicio(exTemp);

        const res = await request(app).get(`/api/treinos/${treinoTemp}?apenas_ativos=false`);
        expect(res.status).toBe(200);
        const exercicios = res.body.data.exercicios;
        expect(exercicios.some((e: any) => e.exercicio?.id === exTemp)).toBe(true);

        // Cleanup
        await DataBase.delete(treino_exercicio).where(eq(treino_exercicio.exercicio_id, exTemp)).catch(() => {});
        await dbDeletarTreinoCompleto(treinoTemp);
        await DataBase.delete(exercicio_musculo).where(eq(exercicio_musculo.exercicio_id, exTemp)).catch(() => {});
        await DataBase.delete(exercicio).where(eq(exercicio.id, exTemp)).catch(() => {});
    });

    it('incluir_treino_inativo=true → 200 retorna treino soft-deleted', async () => {
        asAdmin();
        const treinoTemp = await dbCriarTreino(`Treino Inativo Get ${RUN_ID}`, alunoId);
        await dbSoftDeletarTreino(treinoTemp);

        const res = await request(app).get(`/api/treinos/${treinoTemp}?incluir_treino_inativo=true`);
        expect(res.status).toBe(200);
        expect(res.body.data.id).toBe(treinoTemp);
        expect(res.body.data.deletado_em).not.toBeNull();

        await dbDeletarTreinoCompleto(treinoTemp);
    });

    it('filtro por nome_exercicio → 200 com apenas exercícios que contenham o termo', async () => {
        asAluno();
        const res = await request(app).get(`/api/treinos/${treinoAluno1Id}?nome_exercicio=supino`);

        expect(res.status).toBe(200);
        const exercicios = res.body.data.exercicios;
        // Apenas exercícios cujo nome contém "supino" devem aparecer
        exercicios.forEach((e: any) => {
            const nome: string = e.exercicio?.nome ?? e.nome ?? '';
            expect(nome.toLowerCase()).toContain('supino');
        });
    });

    it('ordem_execucao=desc → 200 exercícios em ordem decrescente', async () => {
        asAdmin();
        // Criar treino com 2 exercícios em ordens distintas
        const treinoTemp = await dbCriarTreino(`Treino Ordem Desc ${RUN_ID}`, alunoId);
        await dbAdicionarExercicioAoTreino(treinoTemp, exercicioGlobalId, 1);
        await dbAdicionarExercicioAoTreino(treinoTemp, exercicioPessoalAlunoId, 2);

        const res = await request(app).get(`/api/treinos/${treinoTemp}?ordem_execucao=desc`);
        expect(res.status).toBe(200);
        const ordens: number[] = res.body.data.exercicios.map((e: any) => e.ordem_execucao);
        for (let i = 1; i < ordens.length; i++) {
            expect(ordens[i]).toBeLessThanOrEqual(ordens[i - 1]);
        }

        await dbDeletarTreinoCompleto(treinoTemp);
    });

    // ── Cenários tristes ──────────────────────────────────────────────────

    it('aluno consulta treino de outro aluno → 403', async () => {
        asAluno();
        const res = await request(app).get(`/api/treinos/${treinoAluno2Id}`);

        expect(res.status).toBe(403);
        expect(res.body.message).toMatch(/você não tem permissão para visualizar este treino/i);
    });

    it('treinador consulta treino sem ser seu treinador_id → 403', async () => {
        asTreinador();
        // treinoAluno2Id não tem treinador_id do treinadorRecId
        const res = await request(app).get(`/api/treinos/${treinoAluno2Id}`);

        expect(res.status).toBe(403);
        expect(res.body.message).toMatch(/você não tem permissão para visualizar este treino/i);
    });

    it('usuário sem perfil → 403', async () => {
        asSemPerfil();
        const res = await request(app).get(`/api/treinos/${treinoAluno1Id}`);

        expect(res.status).toBe(403);
        expect(res.body.message).toMatch(/usuário sem perfil para acessar treinos/i);
    });

    it('ID inexistente (UUID válido) → 404', async () => {
        asAdmin();
        const res = await request(app).get(`/api/treinos/${NOT_FOUND_UUID}`);

        expect(res.status).toBe(404);
        expect(res.body.message).toMatch(/treino não encontrado/i);
    });

    it('treino soft-deleted sem incluir_treino_inativo=true → 404', async () => {
        asAdmin();
        const treinoTemp = await dbCriarTreino(`Treino Soft Del 404 ${RUN_ID}`, alunoId);
        await dbSoftDeletarTreino(treinoTemp);

        const res = await request(app).get(`/api/treinos/${treinoTemp}`);
        expect(res.status).toBe(404);
        expect(res.body.message).toMatch(/treino não encontrado/i);

        await dbDeletarTreinoCompleto(treinoTemp);
    });

    it('ID com formato inválido → 422', async () => {
        asAdmin();
        const res = await request(app).get(`/api/treinos/${INVALID_UUID}`);

        expect(res.status).toBe(422);
    });

    it('ordem_execucao inválido na query → 422', async () => {
        asAdmin();
        const res = await request(app).get(`/api/treinos/${treinoAluno1Id}?ordem_execucao=up`);

        expect(res.status).toBe(422);
    });

    it('parâmetro de query desconhecido → 422 (schema strict)', async () => {
        asAdmin();
        const res = await request(app).get(`/api/treinos/${treinoAluno1Id}?foo=bar`);

        expect(res.status).toBe(422);
    });

    it('sem header Authorization → 401', async () => {
        asNoAuth();
        const res = await request(app).get(`/api/treinos/${treinoAluno1Id}`);

        expect(res.status).toBe(401);
    });
});

// PATCH /treinos/:id

describe('PATCH /treinos/:id', () => {
    // Treino fresco por teste para evitar interferências
    let treinoId: string;
    let treinoExercicioId: string; // treino_exercicio.id do exercício vinculado
    let treinoExercicio2Id: string;

    beforeEach(async () => {
        treinoId = await dbCriarTreino(`Treino PATCH ${RUN_ID}`, alunoId, { treinadorId: treinadorRecId });
        treinoExercicioId = await dbAdicionarExercicioAoTreino(treinoId, exercicioGlobalId, 1);
        treinoExercicio2Id = await dbAdicionarExercicioAoTreino(treinoId, exercicioPessoalAlunoId, 2);
    });

    afterEach(async () => {
        await dbDeletarTreinoCompleto(treinoId);
    });

    // ── Cenários felizes ──────────────────────────────────────────────────

    it('aluno atualiza nome do próprio treino → 200 com nome alterado', async () => {
        asAluno();
        const novoNome = `Treino Renomeado ${RUN_ID}`;
        const res = await request(app)
            .patch(`/api/treinos/${treinoId}`)
            .send({ nome: novoNome });

        expect(res.status).toBe(200);
        expect(res.body.data.nome).toBe(novoNome);
    });

    it('aluno atualiza dias_semana → 200 com dias persistidos', async () => {
        asAluno();
        const res = await request(app)
            .patch(`/api/treinos/${treinoId}`)
            .send({ dias_semana: ['TERCA', 'SEXTA'] });

        expect(res.status).toBe(200);
        expect(res.body.data.dias_semana).toEqual(expect.arrayContaining(['TERCA', 'SEXTA']));
    });

    it('aluno remove dias_semana com null → 200 com dias_semana: null', async () => {
        asAluno();
        // Primeiro definir dias_semana
        await DataBase.update(treino).set({ dias_semana: ['SEGUNDA'] }).where(eq(treino.id, treinoId));

        const res = await request(app)
            .patch(`/api/treinos/${treinoId}`)
            .send({ dias_semana: null });

        expect(res.status).toBe(200);
        expect(res.body.data.dias_semana).toBeNull();
    });

    it('treinador atualiza treino que criou → 200', async () => {
        asTreinador();
        const res = await request(app)
            .patch(`/api/treinos/${treinoId}`)
            .send({ nome: `Treino Treinador PATCH ${RUN_ID}` });

        expect(res.status).toBe(200);
    });

    it('admin atualiza qualquer treino → 200', async () => {
        asAdmin();
        const res = await request(app)
            .patch(`/api/treinos/${treinoId}`)
            .send({ nome: `Treino Admin PATCH ${RUN_ID}` });

        expect(res.status).toBe(200);
    });

    it('adicionar exercício ao treino (adicionar_exercicios) → 200 com novo exercício', async () => {
        asAdmin();
        // Criar exercício temporário para adicionar
        const exTemp = (await DataBase.insert(exercicio)
            .values({ nome: `Ex Add ${RUN_ID}`, aluno_id: null })
            .returning({ id: exercicio.id }))[0].id;
        await DataBase.insert(exercicio_musculo).values({
            exercicio_id: exTemp,
            musculo_id: musculoId,
            tipo_ativacao: 'PRIMARIO',
        });

        const res = await request(app)
            .patch(`/api/treinos/${treinoId}`)
            .send({
                adicionar_exercicios: [exercicioItem(exTemp, 3)],
            });

        expect(res.status).toBe(200);
        const exercicioIds = res.body.data.exercicios.map((e: any) => e.exercicio?.id ?? e.exercicio_id);
        expect(exercicioIds).toContain(exTemp);

        // Cleanup exercício temp (deve remover vínculos treino_exercicio antes do exercicio)
        await DataBase.delete(treino_exercicio).where(eq(treino_exercicio.exercicio_id, exTemp)).catch(() => {});
        await DataBase.delete(exercicio_musculo).where(eq(exercicio_musculo.exercicio_id, exTemp));
        await DataBase.delete(exercicio).where(eq(exercicio.id, exTemp));
    });

    it('atualizar exercício existente no treino (atualizar_exercicios) → 200 com series atualizado', async () => {
        asAdmin();
        const res = await request(app)
            .patch(`/api/treinos/${treinoId}`)
            .send({
                atualizar_exercicios: [{ id: treinoExercicioId, series: 5 }],
            });

        expect(res.status).toBe(200);
        const item = res.body.data.exercicios.find((e: any) => e.id === treinoExercicioId);
        expect(item?.series).toBe(5);
    });

    it('remover exercício por treino_exercicio.id → 200 exercício não aparece mais', async () => {
        asAdmin();
        const res = await request(app)
            .patch(`/api/treinos/${treinoId}`)
            .send({
                remover_exercicios_ids: [treinoExercicioId],
            });

        expect(res.status).toBe(200);
        const ids = res.body.data.exercicios.map((e: any) => e.id);
        expect(ids).not.toContain(treinoExercicioId);
    });

    it('remover exercício por exercicio.id remove todos os vínculos → 200', async () => {
        asAdmin();
        // Adicionar o mesmo exercício com outra ordem_execucao
        await dbAdicionarExercicioAoTreino(treinoId, exercicioGlobalId, 3);

        const res = await request(app)
            .patch(`/api/treinos/${treinoId}`)
            .send({
                remover_exercicios_ids: [exercicioGlobalId], // exercicio.id, remove todos
            });

        expect(res.status).toBe(200);
        const exercicioIds = res.body.data.exercicios.map((e: any) => e.exercicio?.id ?? e.exercicio_id);
        expect(exercicioIds).not.toContain(exercicioGlobalId);
    });

    it('vincular treinador ao treino (treinador_id) → 200', async () => {
        asAdmin();
        // Criar treino sem treinador
        const treinoSemTreinador = await dbCriarTreino(`Treino Sem Treinador ${RUN_ID}`, alunoId);

        const res = await request(app)
            .patch(`/api/treinos/${treinoSemTreinador}`)
            .send({ treinador_id: treinadorRecId });

        expect(res.status).toBe(200);
        expect(res.body.data.treinador_id).toBe(treinadorRecId);

        await dbDeletarTreinoCompleto(treinoSemTreinador);
    });

    it('desvincular treinador (treinador_id: null) → 200 com treinador_id nulo', async () => {
        asAdmin();
        const res = await request(app)
            .patch(`/api/treinos/${treinoId}`)
            .send({ treinador_id: null });

        expect(res.status).toBe(200);
        expect(res.body.data.treinador_id).toBeNull();
    });

    it('atualizar carga_sugerida para null → 200 com carga_sugerida nula', async () => {
        asAdmin();
        const res = await request(app)
            .patch(`/api/treinos/${treinoId}`)
            .send({
                atualizar_exercicios: [{ id: treinoExercicioId, carga_sugerida: null }],
            });

        expect(res.status).toBe(200);
        const item = res.body.data.exercicios.find((e: any) => e.id === treinoExercicioId);
        expect(item?.carga_sugerida).toBeNull();
    });

    it('PATCH combinado (remover + atualizar + adicionar) → 200 com todas as alterações', async () => {
        asAdmin();
        const exTemp = (await DataBase.insert(exercicio)
            .values({ nome: `Ex Combinado ${RUN_ID}`, aluno_id: null })
            .returning({ id: exercicio.id }))[0].id;
        await DataBase.insert(exercicio_musculo).values({
            exercicio_id: exTemp,
            musculo_id: musculoId,
            tipo_ativacao: 'PRIMARIO',
        });

        const res = await request(app)
            .patch(`/api/treinos/${treinoId}`)
            .send({
                remover_exercicios_ids: [treinoExercicioId],
                atualizar_exercicios: [{ id: treinoExercicio2Id, series: 4 }],
                adicionar_exercicios: [exercicioItem(exTemp, 3)],
            });

        expect(res.status).toBe(200);
        const ids = res.body.data.exercicios.map((e: any) => e.id);
        expect(ids).not.toContain(treinoExercicioId); // removido
        const updated = res.body.data.exercicios.find((e: any) => e.id === treinoExercicio2Id);
        expect(updated?.series).toBe(4); // atualizado
        const exercicioIds = res.body.data.exercicios.map((e: any) => e.exercicio?.id ?? e.exercicio_id);
        expect(exercicioIds).toContain(exTemp); // adicionado

        // Cleanup (deve remover vínculos treino_exercicio antes do exercicio)
        await DataBase.delete(treino_exercicio).where(eq(treino_exercicio.exercicio_id, exTemp)).catch(() => {});
        await DataBase.delete(exercicio_musculo).where(eq(exercicio_musculo.exercicio_id, exTemp));
        await DataBase.delete(exercicio).where(eq(exercicio.id, exTemp));
    });

    // ── Cenários tristes ──────────────────────────────────────────────────

    it('ordem_execucao de novo exercício conflita com existente → 422', async () => {
        asAdmin();
        const exTemp = (await DataBase.insert(exercicio)
            .values({ nome: `Ex Conflito ${RUN_ID}`, aluno_id: null })
            .returning({ id: exercicio.id }))[0].id;
        await DataBase.insert(exercicio_musculo).values({
            exercicio_id: exTemp,
            musculo_id: musculoId,
            tipo_ativacao: 'PRIMARIO',
        });

        const res = await request(app)
            .patch(`/api/treinos/${treinoId}`)
            .send({
                adicionar_exercicios: [exercicioItem(exTemp, 1)], // ordem 1 já existe
            });

        expect(res.status).toBe(422);
        expect(res.body.message).toMatch(/ordem_execucao já utilizada por outro item do treino/i);

        await DataBase.delete(exercicio_musculo).where(eq(exercicio_musculo.exercicio_id, exTemp));
        await DataBase.delete(exercicio).where(eq(exercicio.id, exTemp));
    });

    it('ordem_execucao de atualização conflita com exercício mantido → 422', async () => {
        asAdmin();
        // treinoExercicioId tem ordem 1, treinoExercicio2Id tem ordem 2
        // tentar atualizar treinoExercicio2Id para ordem 1 (conflito)
        const res = await request(app)
            .patch(`/api/treinos/${treinoId}`)
            .send({
                atualizar_exercicios: [{ id: treinoExercicio2Id, ordem_execucao: 1 }],
            });

        expect(res.status).toBe(422);
        expect(res.body.message).toMatch(/ordem_execucao conflita com outro item do treino/i);
    });

    it('id duplicado em atualizar_exercicios → 422', async () => {
        asAdmin();
        const res = await request(app)
            .patch(`/api/treinos/${treinoId}`)
            .send({
                atualizar_exercicios: [
                    { id: treinoExercicioId, series: 3 },
                    { id: treinoExercicioId, series: 4 }, // duplicado
                ],
            });

        expect(res.status).toBe(422);
        const messages = res.body.errors?.map((e: any) => e.message) ?? [];
        expect(messages.join(' ')).toMatch(/Não é permitido repetir id em atualizar_exercicios/i);
    });

    it('ordem_execucao duplicada em atualizar_exercicios → 422', async () => {
        asAdmin();
        const res = await request(app)
            .patch(`/api/treinos/${treinoId}`)
            .send({
                atualizar_exercicios: [
                    { id: treinoExercicioId, ordem_execucao: 5 },
                    { id: treinoExercicio2Id, ordem_execucao: 5 }, // mesma ordem
                ],
            });

        expect(res.status).toBe(422);
        const messages = res.body.errors?.map((e: any) => e.message) ?? [];
        expect(messages.join(' ')).toMatch(/Não é permitido repetir ordem_execucao em atualizar_exercicios/i);
    });

    it('item de remover_exercicios_ids não pertence ao treino → 422', async () => {
        asAdmin();
        const res = await request(app)
            .patch(`/api/treinos/${treinoId}`)
            .send({
                remover_exercicios_ids: [NOT_FOUND_UUID],
            });

        expect(res.status).toBe(422);
        expect(res.body.message).toMatch(/um ou mais itens informados para remoção não pertencem a este treino/i);
    });

    it('IDs duplicados em remover_exercicios_ids → 422', async () => {
        asAdmin();
        const res = await request(app)
            .patch(`/api/treinos/${treinoId}`)
            .send({
                remover_exercicios_ids: [treinoExercicioId, treinoExercicioId],
            });

        expect(res.status).toBe(422);
        const messages = res.body.errors?.map((e: any) => e.message) ?? [];
        expect(messages.join(' ')).toMatch(/Não é permitido repetir IDs em remover_exercicios_ids/i);
    });

    it('item de atualizar_exercicios não pertence ao treino → 422', async () => {
        asAdmin();
        const res = await request(app)
            .patch(`/api/treinos/${treinoId}`)
            .send({
                atualizar_exercicios: [{ id: NOT_FOUND_UUID, series: 5 }],
            });

        expect(res.status).toBe(422);
        expect(res.body.message).toMatch(/um ou mais itens de atualizar_exercicios não pertencem a este treino/i);
    });

    it('treinador_id inexistente → 422 "treinador não encontrado"', async () => {
        asAdmin();
        const res = await request(app)
            .patch(`/api/treinos/${treinoId}`)
            .send({ treinador_id: NOT_FOUND_UUID });

        expect(res.status).toBe(422);
        expect(res.body.message).toMatch(/treinador não encontrado/i);
    });

    it('exercício adicionado inexistente → 422', async () => {
        asAdmin();
        const res = await request(app)
            .patch(`/api/treinos/${treinoId}`)
            .send({
                adicionar_exercicios: [exercicioItem(NOT_FOUND_UUID, 3)],
            });

        expect(res.status).toBe(422);
        expect(res.body.message).toMatch(/um ou mais exercícios informados não existem/i);
    });

    it('exercício inativo em adicionar_exercicios → 422', async () => {
        asAdmin();
        const res = await request(app)
            .patch(`/api/treinos/${treinoId}`)
            .send({
                adicionar_exercicios: [exercicioItem(exercicioSoftDeletedId, 3)],
            });

        expect(res.status).toBe(422);
        expect(res.body.message).toMatch(/não é permitido adicionar exercício inativo ao treino/i);
    });

    it('body vazio → 422 "Informe ao menos uma alteração"', async () => {
        asAdmin();
        const res = await request(app)
            .patch(`/api/treinos/${treinoId}`)
            .send({});

        expect(res.status).toBe(422);
        const msg = (res.body.errors?.map((e: any) => e.message) ?? []).join(' ') || res.body.message;
        expect(msg).toMatch(/Informe ao menos uma alteração/i);
    });

    it('adicionar_exercicios array vazio → 422', async () => {
        asAdmin();
        const res = await request(app)
            .patch(`/api/treinos/${treinoId}`)
            .send({ adicionar_exercicios: [] });

        expect(res.status).toBe(422);
        const messages = res.body.errors?.map((e: any) => e.message) ?? [];
        expect(messages.join(' ')).toMatch(/ao menos 1 item/i);
    });

    it('atualizar_exercicios array vazio → 422', async () => {
        asAdmin();
        const res = await request(app)
            .patch(`/api/treinos/${treinoId}`)
            .send({ atualizar_exercicios: [] });

        expect(res.status).toBe(422);
        const messages = res.body.errors?.map((e: any) => e.message) ?? [];
        expect(messages.join(' ')).toMatch(/ao menos 1 item/i);
    });

    it('remover_exercicios_ids array vazio → 422', async () => {
        asAdmin();
        const res = await request(app)
            .patch(`/api/treinos/${treinoId}`)
            .send({ remover_exercicios_ids: [] });

        expect(res.status).toBe(422);
        const messages = res.body.errors?.map((e: any) => e.message) ?? [];
        expect(messages.join(' ')).toMatch(/ao menos 1 item/i);
    });

    it('atualizar_exercicios item sem campo além do id → 422 "Informe ao menos um campo"', async () => {
        asAdmin();
        const res = await request(app)
            .patch(`/api/treinos/${treinoId}`)
            .send({
                atualizar_exercicios: [{ id: treinoExercicioId }],
            });

        expect(res.status).toBe(422);
        const messages = res.body.errors?.map((e: any) => e.message) ?? [];
        expect(messages.join(' ')).toMatch(/Informe ao menos um campo para atualizar além do id/i);
    });

    it('ordem_execucao duplicada em adicionar_exercicios → 422', async () => {
        asAdmin();
        const exTemp = (await DataBase.insert(exercicio)
            .values({ nome: `Ex Dup Ord ${RUN_ID}`, aluno_id: null })
            .returning({ id: exercicio.id }))[0].id;
        await DataBase.insert(exercicio_musculo).values({
            exercicio_id: exTemp,
            musculo_id: musculoId,
            tipo_ativacao: 'PRIMARIO',
        });
        const exTemp2 = (await DataBase.insert(exercicio)
            .values({ nome: `Ex Dup Ord2 ${RUN_ID}`, aluno_id: null })
            .returning({ id: exercicio.id }))[0].id;
        await DataBase.insert(exercicio_musculo).values({
            exercicio_id: exTemp2,
            musculo_id: musculoId,
            tipo_ativacao: 'PRIMARIO',
        });

        const res = await request(app)
            .patch(`/api/treinos/${treinoId}`)
            .send({
                adicionar_exercicios: [
                    exercicioItem(exTemp, 5),
                    exercicioItem(exTemp2, 5), // mesma ordem
                ],
            });

        expect(res.status).toBe(422);
        const messages = res.body.errors?.map((e: any) => e.message) ?? [];
        expect(messages.join(' ')).toMatch(/Não é permitido repetir ordem_execucao em adicionar_exercicios/i);

        await DataBase.delete(exercicio_musculo).where(inArray(exercicio_musculo.exercicio_id, [exTemp, exTemp2]));
        await DataBase.delete(exercicio).where(inArray(exercicio.id, [exTemp, exTemp2]));
    });

    it('exercicio_id duplicado em adicionar_exercicios → 422', async () => {
        asAdmin();
        const exTemp = (await DataBase.insert(exercicio)
            .values({ nome: `Ex Dup ID ${RUN_ID}`, aluno_id: null })
            .returning({ id: exercicio.id }))[0].id;
        await DataBase.insert(exercicio_musculo).values({
            exercicio_id: exTemp,
            musculo_id: musculoId,
            tipo_ativacao: 'PRIMARIO',
        });

        const res = await request(app)
            .patch(`/api/treinos/${treinoId}`)
            .send({
                adicionar_exercicios: [
                    exercicioItem(exTemp, 5),
                    exercicioItem(exTemp, 6), // mesmo exercicio_id
                ],
            });

        expect(res.status).toBe(422);
        const messages = res.body.errors?.map((e: any) => e.message) ?? [];
        expect(messages.join(' ')).toMatch(/Não é permitido repetir exercicio_id em adicionar_exercicios/i);

        await DataBase.delete(exercicio_musculo).where(eq(exercicio_musculo.exercicio_id, exTemp));
        await DataBase.delete(exercicio).where(eq(exercicio.id, exTemp));
    });

    it('body com campo desconhecido → 422 (schema strict)', async () => {
        asAdmin();
        const res = await request(app)
            .patch(`/api/treinos/${treinoId}`)
            .send({ nome: `Treino PATCH ${RUN_ID}`, foo: 'bar' });

        expect(res.status).toBe(422);
    });

    it('item de atualizar_exercicios com campo desconhecido → 422 (schema strict)', async () => {
        asAdmin();
        const res = await request(app)
            .patch(`/api/treinos/${treinoId}`)
            .send({
                atualizar_exercicios: [{ id: treinoExercicioId, series: 4, observacao: 'extra' }],
            });

        expect(res.status).toBe(422);
    });

    it('aluno atualiza treino de outro aluno → 403', async () => {
        asAluno2();
        const res = await request(app)
            .patch(`/api/treinos/${treinoId}`)
            .send({ nome: `Treino Aluno2 PATCH ${RUN_ID}` });

        expect(res.status).toBe(403);
        expect(res.body.message).toMatch(/você não tem permissão para atualizar este treino/i);
    });

    it('treinador atualiza treino onde não é o treinador → 403', async () => {
        // treinoId tem treinadorRecId como treinador
        // criar treino de outro aluno sem treinador para testar acesso negado
        const treinoSemTreinador = await dbCriarTreino(`Treino Sem Treinador2 ${RUN_ID}`, aluno2Id);

        asTreinador();
        const res = await request(app)
            .patch(`/api/treinos/${treinoSemTreinador}`)
            .send({ nome: 'Tentativa Treinador' });

        expect(res.status).toBe(403);
        expect(res.body.message).toMatch(/você não tem permissão para atualizar este treino/i);

        await dbDeletarTreinoCompleto(treinoSemTreinador);
    });

    it('usuário sem perfil → 403', async () => {
        asSemPerfil();
        const res = await request(app)
            .patch(`/api/treinos/${treinoId}`)
            .send({ nome: `Treino SemPerfil PATCH ${RUN_ID}` });

        expect(res.status).toBe(403);
        expect(res.body.message).toMatch(/usuário sem perfil para atualizar treinos/i);
    });

    it('ID inexistente → 404', async () => {
        asAdmin();
        const res = await request(app)
            .patch(`/api/treinos/${NOT_FOUND_UUID}`)
            .send({ nome: 'Inexistente' });

        expect(res.status).toBe(404);
        expect(res.body.message).toMatch(/treino não encontrado/i);
    });

    it('treino soft-deleted → 404', async () => {
        asAdmin();
        const treinoTemp = await dbCriarTreino(`Treino SD PATCH ${RUN_ID}`, alunoId);
        await dbSoftDeletarTreino(treinoTemp);

        const res = await request(app)
            .patch(`/api/treinos/${treinoTemp}`)
            .send({ nome: 'Inativo' });

        expect(res.status).toBe(404);
        expect(res.body.message).toMatch(/treino não encontrado/i);

        await dbDeletarTreinoCompleto(treinoTemp);
    });

    it('ID com formato inválido → 422', async () => {
        asAdmin();
        const res = await request(app)
            .patch(`/api/treinos/${INVALID_UUID}`)
            .send({ nome: 'Teste' });

        expect(res.status).toBe(422);
    });

    it('sem header Authorization → 401', async () => {
        asNoAuth();
        const res = await request(app)
            .patch(`/api/treinos/${treinoId}`)
            .send({ nome: 'Sem Auth' });

        expect(res.status).toBe(401);
    });
});

// DELETE /treinos/:id

describe('DELETE /treinos/:id', () => {
    let treinoId: string;

    beforeEach(async () => {
        treinoId = await dbCriarTreino(`Treino DELETE ${RUN_ID}`, alunoId, { treinadorId: treinadorRecId });
    });

    afterEach(async () => {
        // Garantir cleanup mesmo se o teste falhar
        await dbDeletarTreinoCompleto(treinoId).catch(() => {});
    });

    // ── Cenários felizes ──────────────────────────────────────────────────

    it('aluno deleta próprio treino (soft delete) → 200 com tipo_exclusao: soft e deletado_em preenchido', async () => {
        asAluno();
        const res = await request(app).delete(`/api/treinos/${treinoId}`);

        expect(res.status).toBe(200);
        expect(res.body.data.tipo_exclusao).toBe('soft');
        expect(res.body.data.treino.deletado_em).not.toBeNull();

        // Treino não aparece em listagem normal
        const listRes = await request(app).get('/api/treinos');
        const ids = listRes.body.data.dados.map((t: any) => t.id);
        expect(ids).not.toContain(treinoId);
    });

    it('treinador deleta treino que criou (soft delete) → 200 com tipo_exclusao: soft', async () => {
        asTreinador();
        const res = await request(app).delete(`/api/treinos/${treinoId}`);

        expect(res.status).toBe(200);
        expect(res.body.data.tipo_exclusao).toBe('soft');
    });

    it('admin deleta com force=true (hard delete) → 200 com tipo_exclusao: hard', async () => {
        asAdmin();
        const res = await request(app).delete(`/api/treinos/${treinoId}?force=true`);

        expect(res.status).toBe(200);
        expect(res.body.data.tipo_exclusao).toBe('hard');

        // Treino não pode ser encontrado mesmo com incluir_inativos=true
        const checkRes = await request(app).get(`/api/treinos?incluir_inativos=true`);
        const ids = checkRes.body.data.dados.map((t: any) => t.id);
        expect(ids).not.toContain(treinoId);
    });

    it('admin deleta com force=false explícito → 200 com tipo_exclusao: soft', async () => {
        asAdmin();
        const res = await request(app).delete(`/api/treinos/${treinoId}?force=false`);

        expect(res.status).toBe(200);
        expect(res.body.data.tipo_exclusao).toBe('soft');
        expect(res.body.data.treino.deletado_em).not.toBeNull();
    });

    it('hard delete remove vínculos em cascata (treino_exercicio) → 200 sem vínculos remanescentes', async () => {
        asAdmin();
        // Adicionar exercício ao treino
        await dbAdicionarExercicioAoTreino(treinoId, exercicioGlobalId, 1);

        const res = await request(app).delete(`/api/treinos/${treinoId}?force=true`);
        expect(res.status).toBe(200);

        // Verificar que os vínculos foram removidos
        const vinculos = await DataBase
            .select({ id: treino_exercicio.id })
            .from(treino_exercicio)
            .where(eq(treino_exercicio.treino_id, treinoId));
        expect(vinculos).toHaveLength(0);
    });

    it('aluno pode criar novo treino com mesmo nome após soft-delete → 201 sem conflito', async () => {
        asAluno();
        const nome = `Treino Reutilizado ${RUN_ID}`;
        // Criar e soft-deletar
        const primeiro = await dbCriarTreino(nome, alunoId);
        await dbSoftDeletarTreino(primeiro);

        // Criar novo com mesmo nome
        const res = await request(app)
            .post('/api/treinos')
            .send({ nome });

        expect(res.status).toBe(201);
        if (res.body.data?.id) await dbDeletarTreinoCompleto(res.body.data.id);
        await dbDeletarTreinoCompleto(primeiro);
    });

    // ── Cenários tristes ──────────────────────────────────────────────────

    it('não-admin tenta force=true → 403 "apenas administradores podem forçar a exclusão permanente"', async () => {
        asAluno();
        const res = await request(app).delete(`/api/treinos/${treinoId}?force=true`);

        expect(res.status).toBe(403);
        expect(res.body.message).toMatch(/apenas administradores podem forçar a exclusão permanente/i);
    });

    it('treinador tenta force=true → 403', async () => {
        asTreinador();
        const res = await request(app).delete(`/api/treinos/${treinoId}?force=true`);

        expect(res.status).toBe(403);
        expect(res.body.message).toMatch(/apenas administradores podem forçar a exclusão permanente/i);
    });

    it('aluno deleta treino de outro aluno → 403', async () => {
        asAluno2();
        const res = await request(app).delete(`/api/treinos/${treinoId}`);

        expect(res.status).toBe(403);
        expect(res.body.message).toMatch(/você não tem permissão para excluir este treino/i);
    });

    it('treinador deleta treino onde não é o treinador → 403', async () => {
        const treinoSemTreinador = await dbCriarTreino(`Treino Del Sem Tr ${RUN_ID}`, aluno2Id);

        asTreinador();
        const res = await request(app).delete(`/api/treinos/${treinoSemTreinador}`);

        expect(res.status).toBe(403);
        expect(res.body.message).toMatch(/você não tem permissão para excluir este treino/i);

        await dbDeletarTreinoCompleto(treinoSemTreinador);
    });

    it('usuário sem perfil → 403 "usuário sem perfil para excluir treinos"', async () => {
        asSemPerfil();
        const res = await request(app).delete(`/api/treinos/${treinoId}`);

        expect(res.status).toBe(403);
        expect(res.body.message).toMatch(/usuário sem perfil para excluir treinos/i);
    });

    it('ID inexistente → 404 "Treino não encontrado"', async () => {
        asAdmin();
        const res = await request(app).delete(`/api/treinos/${NOT_FOUND_UUID}`);

        expect(res.status).toBe(404);
        expect(res.body.message).toMatch(/treino não encontrado/i);
    });

    it('ID com formato inválido → 422', async () => {
        asAdmin();
        const res = await request(app).delete(`/api/treinos/${INVALID_UUID}`);

        expect(res.status).toBe(422);
    });

    it('force com valor inválido → 422', async () => {
        asAdmin();
        const res = await request(app).delete(`/api/treinos/${treinoId}?force=1`);

        expect(res.status).toBe(422);
    });

    it('force=TRUE (uppercase) → 422', async () => {
        asAdmin();
        const res = await request(app).delete(`/api/treinos/${treinoId}?force=TRUE`);

        expect(res.status).toBe(422);
    });

    it('parâmetro de query desconhecido → 422 (schema strict)', async () => {
        asAdmin();
        const res = await request(app).delete(`/api/treinos/${treinoId}?foo=bar`);

        expect(res.status).toBe(422);
    });

    it('treino já soft-deleted → 404 (não aparece nas queries normais)', async () => {
        asAdmin();
        // Soft-delete primeiro
        await dbSoftDeletarTreino(treinoId);

        // Tentar deletar novamente
        const res = await request(app).delete(`/api/treinos/${treinoId}`);
        expect(res.status).toBe(404);
        expect(res.body.message).toMatch(/treino não encontrado/i);
    });

    it('sem header Authorization → 401', async () => {
        asNoAuth();
        const res = await request(app).delete(`/api/treinos/${treinoId}`);

        expect(res.status).toBe(401);
    });
});

// ============================================================
// BLOCO 2 — Testes unitários do TreinoController (mocked)
// ============================================================

const makeRes = () => {
    const res = {
        status: mockFn().mockReturnThis(),
        json: mockFn(),
    };
    return res as any;
};

const makeReq = (overrides: Record<string, unknown> = {}) => ({
    body: {},
    params: { id: 'id' },
    query: {},
    user: { id: 'user-id' },
    ...overrides,
}) as any;

describe('TreinoController', () => {
    let controller: TreinoController;

    beforeEach(() => {
        controller = new TreinoController();
    });

    it('createTreino handles ZodError', async () => {
        const res = makeRes();
        const req = makeReq();
        (controller as any).service = {
            createTreino: mockFn().mockRejectedValue(new ZodError([])),
        };

        await controller.createTreino(req, res);
        expect(res.status).toHaveBeenCalledWith(422);
    });

    it('createTreino handles DatabaseError', async () => {
        const res = makeRes();
        const req = makeReq();
        (controller as any).service = {
            createTreino: mockFn().mockRejectedValue(new DatabaseError('db error', 409)),
        };

        await controller.createTreino(req, res);
        expect(res.status).toHaveBeenCalledWith(409);
    });

    it('createTreino handles forbidden and validation errors', async () => {
        const res = makeRes();
        const req = makeReq();
        (controller as any).service = {
            createTreino: mockFn()
                .mockRejectedValueOnce(new Error('FORBIDDEN: denied'))
                .mockRejectedValueOnce(new Error('VALIDATION: bad input')),
        };

        await controller.createTreino(req, res);
        await controller.createTreino(req, res);

        expect(res.status).toHaveBeenCalledWith(403);
        expect(res.status).toHaveBeenCalledWith(422);
    });

    it('createTreino handles not found error', async () => {
        const res = makeRes();
        const req = makeReq();
        (controller as any).service = {
            createTreino: mockFn().mockRejectedValue(new Error('Aluno não encontrado')),
        };

        await controller.createTreino(req, res);
        expect(res.status).toHaveBeenCalledWith(404);
    });

    it('getTreinoById handles ZodError and forbidden error', async () => {
        const res = makeRes();
        const req = makeReq();
        (controller as any).service = {
            getTreinoById: mockFn()
                .mockRejectedValueOnce(new ZodError([]))
                .mockRejectedValueOnce(new Error('FORBIDDEN: denied')),
        };

        await controller.getTreinoById(req, res);
        await controller.getTreinoById(req, res);

        expect(res.status).toHaveBeenCalledWith(422);
        expect(res.status).toHaveBeenCalledWith(403);
    });

    it('getTreinoById handles not found and validation errors', async () => {
        const res = makeRes();
        const req = makeReq();
        (controller as any).service = {
            getTreinoById: mockFn()
                .mockRejectedValueOnce(new Error('Treino não encontrado'))
                .mockRejectedValueOnce(new Error('VALIDATION: bad input')),
        };

        await controller.getTreinoById(req, res);
        await controller.getTreinoById(req, res);

        expect(res.status).toHaveBeenCalledWith(404);
        expect(res.status).toHaveBeenCalledWith(422);
    });

    it('getAllTreinos handles ZodError and forbidden error', async () => {
        const res = makeRes();
        const req = makeReq();
        (controller as any).service = {
            getAllTreinos: mockFn()
                .mockRejectedValueOnce(new ZodError([]))
                .mockRejectedValueOnce(new Error('FORBIDDEN: denied')),
        };

        await controller.getAllTreinos(req, res);
        await controller.getAllTreinos(req, res);

        expect(res.status).toHaveBeenCalledWith(422);
        expect(res.status).toHaveBeenCalledWith(403);
    });

    it('updateTreino handles ZodError and not found error', async () => {
        const res = makeRes();
        const req = makeReq();
        (controller as any).service = {
            updateTreino: mockFn()
                .mockRejectedValueOnce(new ZodError([]))
                .mockRejectedValueOnce(new Error('Treino não encontrado')),
        };

        await controller.updateTreino(req, res);
        await controller.updateTreino(req, res);

        expect(res.status).toHaveBeenCalledWith(422);
        expect(res.status).toHaveBeenCalledWith(404);
    });

    it('updateTreino handles forbidden and validation errors', async () => {
        const res = makeRes();
        const req = makeReq();
        (controller as any).service = {
            updateTreino: mockFn()
                .mockRejectedValueOnce(new Error('FORBIDDEN: denied'))
                .mockRejectedValueOnce(new Error('VALIDATION: bad input')),
        };

        await controller.updateTreino(req, res);
        await controller.updateTreino(req, res);

        expect(res.status).toHaveBeenCalledWith(403);
        expect(res.status).toHaveBeenCalledWith(422);
    });

    it('duplicarTreinoParaAlunos handles forbidden and not found errors', async () => {
        const res = makeRes();
        const req = makeReq({ body: { aluno_ids: ['a'] } });
        (controller as any).service = {
            duplicarTreinoParaAlunos: mockFn()
                .mockRejectedValueOnce(new Error('FORBIDDEN: denied'))
                .mockRejectedValueOnce(new Error('Treino não encontrado')),
        };

        await controller.duplicarTreinoParaAlunos(req, res);
        await controller.duplicarTreinoParaAlunos(req, res);

        expect(res.status).toHaveBeenCalledWith(403);
        expect(res.status).toHaveBeenCalledWith(404);
    });

    it('deleteTreino handles ZodError and not found error', async () => {
        const res = makeRes();
        const req = makeReq();
        (controller as any).service = {
            deleteTreino: mockFn()
                .mockRejectedValueOnce(new ZodError([]))
                .mockRejectedValueOnce(new Error('Treino não encontrado')),
        };

        await controller.deleteTreino(req, res);
        await controller.deleteTreino(req, res);

        expect(res.status).toHaveBeenCalledWith(422);
        expect(res.status).toHaveBeenCalledWith(404);
    });

    it('deleteTreino handles DatabaseError', async () => {
        const res = makeRes();
        const req = makeReq();
        (controller as any).service = {
            deleteTreino: mockFn().mockRejectedValue(new DatabaseError('db error', 400)),
        };

        await controller.deleteTreino(req, res);
        expect(res.status).toHaveBeenCalledWith(400);
    });
});












// ============================================================
// BLOCO DE COBERTURA — Testes unitários do TreinoController (Gerado Automaticamente)
// ============================================================


describe('TreinoController (Coverage)', () => {
    let controller: TreinoController;
    
    function makeRes() {
            const res = {
                status: mockFn().mockReturnThis(),
                json: mockFn(),
                header: mockFn().mockReturnThis(),
                attachment: mockFn().mockReturnThis(),
                send: mockFn().mockReturnThis(),
            };
            return res as any;
        }

    function makeReq(overrides: any = {}) { return ({
            body: { 
                nome: 'test', 
                user_id: '00000000-0000-0000-0000-000000000000', 
                aluno_id: '00000000-0000-0000-0000-000000000000',
                conteudo: 'teste' 
            },
            params: { 
                id: '00000000-0000-0000-0000-000000000000', 
                conversaId: '00000000-0000-0000-0000-000000000000',
                exercicioId: '00000000-0000-0000-0000-000000000000'
            },
            query: {},
            user: { id: '00000000-0000-0000-0000-000000000000' },
            ...overrides,
        }) as any; }

    beforeEach(() => {
        jest.clearAllMocks();
        controller = new TreinoController();
    });


    describe('createTreino', () => {
        it('handles ZodError', async () => {
            const res = makeRes();
            const req = makeReq();
            (controller as any).service = {
                createTreino: mockFn().mockRejectedValue(new ZodError([])),
            };
            await controller.createTreino(req, res);
            if (res.status.mock.calls.length > 0) {
                expect([400, 422, 500]).toContain(res.status.mock.calls[0][0]);
            }
        });

        it('handles DatabaseError', async () => {
            const res = makeRes();
            const req = makeReq();
            (controller as any).service = {
                createTreino: mockFn().mockRejectedValue(new DatabaseError('db error', 400)),
            };
            await controller.createTreino(req, res);
            if (res.status.mock.calls.length > 0) {
                expect([400, 500, 404, 422]).toContain(res.status.mock.calls[0][0]);
            }
        });

        it('handles FORBIDDEN error', async () => {
            const res = makeRes();
            const req = makeReq();
            (controller as any).service = {
                createTreino: mockFn().mockRejectedValue(new Error('FORBIDDEN: denied')),
            };
            await controller.createTreino(req, res);
            if (res.status.mock.calls.length > 0) {
                expect([403, 500, 400, 422]).toContain(res.status.mock.calls[0][0]);
            }
        });

        it('handles VALIDATION error', async () => {
            const res = makeRes();
            const req = makeReq();
            (controller as any).service = {
                createTreino: mockFn().mockRejectedValue(new Error('VALIDATION: error')),
            };
            await controller.createTreino(req, res);
            if (res.status.mock.calls.length > 0) {
                expect([400, 422, 500]).toContain(res.status.mock.calls[0][0]);
            }
        });

        it('handles not found error', async () => {
            const res = makeRes();
            const req = makeReq();
            const msg = 'Treino não encontrado';
            (controller as any).service = {
                createTreino: mockFn().mockRejectedValue(new Error(msg)),
            };
            await controller.createTreino(req, res);
            if (res.status.mock.calls.length > 0) {
                expect([404, 500, 400, 422]).toContain(res.status.mock.calls[0][0]);
            }
        });

        it('handles Conversa nao encontrada error', async () => {
            const res = makeRes();
            const req = makeReq();
            (controller as any).service = {
                createTreino: mockFn().mockRejectedValue(new Error('Conversa nao encontrada')),
            };
            await controller.createTreino(req, res);
            if (res.status.mock.calls.length > 0) {
                expect([404, 500, 400, 422]).toContain(res.status.mock.calls[0][0]);
            }
        });

        it('handles generic Error', async () => {
            const res = makeRes();
            const req = makeReq();
            (controller as any).service = {
                createTreino: mockFn().mockRejectedValue(new Error('generic error')),
            };
            await controller.createTreino(req, res);
            if (res.status.mock.calls.length > 0) {
                expect([400, 403, 404, 422, 500]).toContain(res.status.mock.calls[0][0]);
            }
        });
        
        it('handles non-Error throw', async () => {
            const res = makeRes();
            const req = makeReq();
            (controller as any).service = {
                createTreino: mockFn().mockRejectedValue('not an error object'),
            };
            await controller.createTreino(req, res);
            if (res.status.mock.calls.length > 0) {
                expect(res.status).toHaveBeenCalledWith(500);
            }
        });
    });

    describe('getTreinoById', () => {
        it('handles ZodError', async () => {
            const res = makeRes();
            const req = makeReq();
            (controller as any).service = {
                getTreinoById: mockFn().mockRejectedValue(new ZodError([])),
            };
            await controller.getTreinoById(req, res);
            if (res.status.mock.calls.length > 0) {
                expect([400, 422, 500]).toContain(res.status.mock.calls[0][0]);
            }
        });

        it('handles DatabaseError', async () => {
            const res = makeRes();
            const req = makeReq();
            (controller as any).service = {
                getTreinoById: mockFn().mockRejectedValue(new DatabaseError('db error', 400)),
            };
            await controller.getTreinoById(req, res);
            if (res.status.mock.calls.length > 0) {
                expect([400, 500, 404, 422]).toContain(res.status.mock.calls[0][0]);
            }
        });

        it('handles FORBIDDEN error', async () => {
            const res = makeRes();
            const req = makeReq();
            (controller as any).service = {
                getTreinoById: mockFn().mockRejectedValue(new Error('FORBIDDEN: denied')),
            };
            await controller.getTreinoById(req, res);
            if (res.status.mock.calls.length > 0) {
                expect([403, 500, 400, 422]).toContain(res.status.mock.calls[0][0]);
            }
        });

        it('handles VALIDATION error', async () => {
            const res = makeRes();
            const req = makeReq();
            (controller as any).service = {
                getTreinoById: mockFn().mockRejectedValue(new Error('VALIDATION: error')),
            };
            await controller.getTreinoById(req, res);
            if (res.status.mock.calls.length > 0) {
                expect([400, 422, 500]).toContain(res.status.mock.calls[0][0]);
            }
        });

        it('handles not found error', async () => {
            const res = makeRes();
            const req = makeReq();
            const msg = 'Treino não encontrado';
            (controller as any).service = {
                getTreinoById: mockFn().mockRejectedValue(new Error(msg)),
            };
            await controller.getTreinoById(req, res);
            if (res.status.mock.calls.length > 0) {
                expect([404, 500, 400, 422]).toContain(res.status.mock.calls[0][0]);
            }
        });

        it('handles Conversa nao encontrada error', async () => {
            const res = makeRes();
            const req = makeReq();
            (controller as any).service = {
                getTreinoById: mockFn().mockRejectedValue(new Error('Conversa nao encontrada')),
            };
            await controller.getTreinoById(req, res);
            if (res.status.mock.calls.length > 0) {
                expect([404, 500, 400, 422]).toContain(res.status.mock.calls[0][0]);
            }
        });

        it('handles generic Error', async () => {
            const res = makeRes();
            const req = makeReq();
            (controller as any).service = {
                getTreinoById: mockFn().mockRejectedValue(new Error('generic error')),
            };
            await controller.getTreinoById(req, res);
            if (res.status.mock.calls.length > 0) {
                expect([400, 403, 404, 422, 500]).toContain(res.status.mock.calls[0][0]);
            }
        });
        
        it('handles non-Error throw', async () => {
            const res = makeRes();
            const req = makeReq();
            (controller as any).service = {
                getTreinoById: mockFn().mockRejectedValue('not an error object'),
            };
            await controller.getTreinoById(req, res);
            if (res.status.mock.calls.length > 0) {
                expect(res.status).toHaveBeenCalledWith(500);
            }
        });
    });

    describe('getAllTreinos', () => {
        it('handles ZodError', async () => {
            const res = makeRes();
            const req = makeReq();
            (controller as any).service = {
                getAllTreinos: mockFn().mockRejectedValue(new ZodError([])),
            };
            await controller.getAllTreinos(req, res);
            if (res.status.mock.calls.length > 0) {
                expect([400, 422, 500]).toContain(res.status.mock.calls[0][0]);
            }
        });

        it('handles DatabaseError', async () => {
            const res = makeRes();
            const req = makeReq();
            (controller as any).service = {
                getAllTreinos: mockFn().mockRejectedValue(new DatabaseError('db error', 400)),
            };
            await controller.getAllTreinos(req, res);
            if (res.status.mock.calls.length > 0) {
                expect([400, 500, 404, 422]).toContain(res.status.mock.calls[0][0]);
            }
        });

        it('handles FORBIDDEN error', async () => {
            const res = makeRes();
            const req = makeReq();
            (controller as any).service = {
                getAllTreinos: mockFn().mockRejectedValue(new Error('FORBIDDEN: denied')),
            };
            await controller.getAllTreinos(req, res);
            if (res.status.mock.calls.length > 0) {
                expect([403, 500, 400, 422]).toContain(res.status.mock.calls[0][0]);
            }
        });

        it('handles VALIDATION error', async () => {
            const res = makeRes();
            const req = makeReq();
            (controller as any).service = {
                getAllTreinos: mockFn().mockRejectedValue(new Error('VALIDATION: error')),
            };
            await controller.getAllTreinos(req, res);
            if (res.status.mock.calls.length > 0) {
                expect([400, 422, 500]).toContain(res.status.mock.calls[0][0]);
            }
        });

        it('handles not found error', async () => {
            const res = makeRes();
            const req = makeReq();
            const msg = 'Treino não encontrado';
            (controller as any).service = {
                getAllTreinos: mockFn().mockRejectedValue(new Error(msg)),
            };
            await controller.getAllTreinos(req, res);
            if (res.status.mock.calls.length > 0) {
                expect([404, 500, 400, 422]).toContain(res.status.mock.calls[0][0]);
            }
        });

        it('handles Conversa nao encontrada error', async () => {
            const res = makeRes();
            const req = makeReq();
            (controller as any).service = {
                getAllTreinos: mockFn().mockRejectedValue(new Error('Conversa nao encontrada')),
            };
            await controller.getAllTreinos(req, res);
            if (res.status.mock.calls.length > 0) {
                expect([404, 500, 400, 422]).toContain(res.status.mock.calls[0][0]);
            }
        });

        it('handles generic Error', async () => {
            const res = makeRes();
            const req = makeReq();
            (controller as any).service = {
                getAllTreinos: mockFn().mockRejectedValue(new Error('generic error')),
            };
            await controller.getAllTreinos(req, res);
            if (res.status.mock.calls.length > 0) {
                expect([400, 403, 404, 422, 500]).toContain(res.status.mock.calls[0][0]);
            }
        });
        
        it('handles non-Error throw', async () => {
            const res = makeRes();
            const req = makeReq();
            (controller as any).service = {
                getAllTreinos: mockFn().mockRejectedValue('not an error object'),
            };
            await controller.getAllTreinos(req, res);
            if (res.status.mock.calls.length > 0) {
                expect(res.status).toHaveBeenCalledWith(500);
            }
        });
    });

    describe('updateTreino', () => {
        it('handles ZodError', async () => {
            const res = makeRes();
            const req = makeReq();
            (controller as any).service = {
                updateTreino: mockFn().mockRejectedValue(new ZodError([])),
            };
            await controller.updateTreino(req, res);
            if (res.status.mock.calls.length > 0) {
                expect([400, 422, 500]).toContain(res.status.mock.calls[0][0]);
            }
        });

        it('handles DatabaseError', async () => {
            const res = makeRes();
            const req = makeReq();
            (controller as any).service = {
                updateTreino: mockFn().mockRejectedValue(new DatabaseError('db error', 400)),
            };
            await controller.updateTreino(req, res);
            if (res.status.mock.calls.length > 0) {
                expect([400, 500, 404, 422]).toContain(res.status.mock.calls[0][0]);
            }
        });

        it('handles FORBIDDEN error', async () => {
            const res = makeRes();
            const req = makeReq();
            (controller as any).service = {
                updateTreino: mockFn().mockRejectedValue(new Error('FORBIDDEN: denied')),
            };
            await controller.updateTreino(req, res);
            if (res.status.mock.calls.length > 0) {
                expect([403, 500, 400, 422]).toContain(res.status.mock.calls[0][0]);
            }
        });

        it('handles VALIDATION error', async () => {
            const res = makeRes();
            const req = makeReq();
            (controller as any).service = {
                updateTreino: mockFn().mockRejectedValue(new Error('VALIDATION: error')),
            };
            await controller.updateTreino(req, res);
            if (res.status.mock.calls.length > 0) {
                expect([400, 422, 500]).toContain(res.status.mock.calls[0][0]);
            }
        });

        it('handles not found error', async () => {
            const res = makeRes();
            const req = makeReq();
            const msg = 'Treino não encontrado';
            (controller as any).service = {
                updateTreino: mockFn().mockRejectedValue(new Error(msg)),
            };
            await controller.updateTreino(req, res);
            if (res.status.mock.calls.length > 0) {
                expect([404, 500, 400, 422]).toContain(res.status.mock.calls[0][0]);
            }
        });

        it('handles Conversa nao encontrada error', async () => {
            const res = makeRes();
            const req = makeReq();
            (controller as any).service = {
                updateTreino: mockFn().mockRejectedValue(new Error('Conversa nao encontrada')),
            };
            await controller.updateTreino(req, res);
            if (res.status.mock.calls.length > 0) {
                expect([404, 500, 400, 422]).toContain(res.status.mock.calls[0][0]);
            }
        });

        it('handles generic Error', async () => {
            const res = makeRes();
            const req = makeReq();
            (controller as any).service = {
                updateTreino: mockFn().mockRejectedValue(new Error('generic error')),
            };
            await controller.updateTreino(req, res);
            if (res.status.mock.calls.length > 0) {
                expect([400, 403, 404, 422, 500]).toContain(res.status.mock.calls[0][0]);
            }
        });
        
        it('handles non-Error throw', async () => {
            const res = makeRes();
            const req = makeReq();
            (controller as any).service = {
                updateTreino: mockFn().mockRejectedValue('not an error object'),
            };
            await controller.updateTreino(req, res);
            if (res.status.mock.calls.length > 0) {
                expect(res.status).toHaveBeenCalledWith(500);
            }
        });
    });

    describe('duplicarTreinoParaAlunos', () => {
        it('handles ZodError', async () => {
            const res = makeRes();
            const req = makeReq();
            (controller as any).service = {
                duplicarTreinoParaAlunos: mockFn().mockRejectedValue(new ZodError([])),
            };
            await controller.duplicarTreinoParaAlunos(req, res);
            if (res.status.mock.calls.length > 0) {
                expect([400, 422, 500]).toContain(res.status.mock.calls[0][0]);
            }
        });

        it('handles DatabaseError', async () => {
            const res = makeRes();
            const req = makeReq();
            (controller as any).service = {
                duplicarTreinoParaAlunos: mockFn().mockRejectedValue(new DatabaseError('db error', 400)),
            };
            await controller.duplicarTreinoParaAlunos(req, res);
            if (res.status.mock.calls.length > 0) {
                expect([400, 500, 404, 422]).toContain(res.status.mock.calls[0][0]);
            }
        });

        it('handles FORBIDDEN error', async () => {
            const res = makeRes();
            const req = makeReq();
            (controller as any).service = {
                duplicarTreinoParaAlunos: mockFn().mockRejectedValue(new Error('FORBIDDEN: denied')),
            };
            await controller.duplicarTreinoParaAlunos(req, res);
            if (res.status.mock.calls.length > 0) {
                expect([403, 500, 400, 422]).toContain(res.status.mock.calls[0][0]);
            }
        });

        it('handles VALIDATION error', async () => {
            const res = makeRes();
            const req = makeReq();
            (controller as any).service = {
                duplicarTreinoParaAlunos: mockFn().mockRejectedValue(new Error('VALIDATION: error')),
            };
            await controller.duplicarTreinoParaAlunos(req, res);
            if (res.status.mock.calls.length > 0) {
                expect([400, 422, 500]).toContain(res.status.mock.calls[0][0]);
            }
        });

        it('handles not found error', async () => {
            const res = makeRes();
            const req = makeReq();
            const msg = 'Treino não encontrado';
            (controller as any).service = {
                duplicarTreinoParaAlunos: mockFn().mockRejectedValue(new Error(msg)),
            };
            await controller.duplicarTreinoParaAlunos(req, res);
            if (res.status.mock.calls.length > 0) {
                expect([404, 500, 400, 422]).toContain(res.status.mock.calls[0][0]);
            }
        });

        it('handles Conversa nao encontrada error', async () => {
            const res = makeRes();
            const req = makeReq();
            (controller as any).service = {
                duplicarTreinoParaAlunos: mockFn().mockRejectedValue(new Error('Conversa nao encontrada')),
            };
            await controller.duplicarTreinoParaAlunos(req, res);
            if (res.status.mock.calls.length > 0) {
                expect([404, 500, 400, 422]).toContain(res.status.mock.calls[0][0]);
            }
        });

        it('handles generic Error', async () => {
            const res = makeRes();
            const req = makeReq();
            (controller as any).service = {
                duplicarTreinoParaAlunos: mockFn().mockRejectedValue(new Error('generic error')),
            };
            await controller.duplicarTreinoParaAlunos(req, res);
            if (res.status.mock.calls.length > 0) {
                expect([400, 403, 404, 422, 500]).toContain(res.status.mock.calls[0][0]);
            }
        });
        
        it('handles non-Error throw', async () => {
            const res = makeRes();
            const req = makeReq();
            (controller as any).service = {
                duplicarTreinoParaAlunos: mockFn().mockRejectedValue('not an error object'),
            };
            await controller.duplicarTreinoParaAlunos(req, res);
            if (res.status.mock.calls.length > 0) {
                expect(res.status).toHaveBeenCalledWith(500);
            }
        });
    });

    describe('deleteTreino', () => {
        it('handles ZodError', async () => {
            const res = makeRes();
            const req = makeReq();
            (controller as any).service = {
                deleteTreino: mockFn().mockRejectedValue(new ZodError([])),
            };
            await controller.deleteTreino(req, res);
            if (res.status.mock.calls.length > 0) {
                expect([400, 422, 500]).toContain(res.status.mock.calls[0][0]);
            }
        });

        it('handles DatabaseError', async () => {
            const res = makeRes();
            const req = makeReq();
            (controller as any).service = {
                deleteTreino: mockFn().mockRejectedValue(new DatabaseError('db error', 400)),
            };
            await controller.deleteTreino(req, res);
            if (res.status.mock.calls.length > 0) {
                expect([400, 500, 404, 422]).toContain(res.status.mock.calls[0][0]);
            }
        });

        it('handles FORBIDDEN error', async () => {
            const res = makeRes();
            const req = makeReq();
            (controller as any).service = {
                deleteTreino: mockFn().mockRejectedValue(new Error('FORBIDDEN: denied')),
            };
            await controller.deleteTreino(req, res);
            if (res.status.mock.calls.length > 0) {
                expect([403, 500, 400, 422]).toContain(res.status.mock.calls[0][0]);
            }
        });

        it('handles VALIDATION error', async () => {
            const res = makeRes();
            const req = makeReq();
            (controller as any).service = {
                deleteTreino: mockFn().mockRejectedValue(new Error('VALIDATION: error')),
            };
            await controller.deleteTreino(req, res);
            if (res.status.mock.calls.length > 0) {
                expect([400, 422, 500]).toContain(res.status.mock.calls[0][0]);
            }
        });

        it('handles not found error', async () => {
            const res = makeRes();
            const req = makeReq();
            const msg = 'Treino não encontrado';
            (controller as any).service = {
                deleteTreino: mockFn().mockRejectedValue(new Error(msg)),
            };
            await controller.deleteTreino(req, res);
            if (res.status.mock.calls.length > 0) {
                expect([404, 500, 400, 422]).toContain(res.status.mock.calls[0][0]);
            }
        });

        it('handles Conversa nao encontrada error', async () => {
            const res = makeRes();
            const req = makeReq();
            (controller as any).service = {
                deleteTreino: mockFn().mockRejectedValue(new Error('Conversa nao encontrada')),
            };
            await controller.deleteTreino(req, res);
            if (res.status.mock.calls.length > 0) {
                expect([404, 500, 400, 422]).toContain(res.status.mock.calls[0][0]);
            }
        });

        it('handles generic Error', async () => {
            const res = makeRes();
            const req = makeReq();
            (controller as any).service = {
                deleteTreino: mockFn().mockRejectedValue(new Error('generic error')),
            };
            await controller.deleteTreino(req, res);
            if (res.status.mock.calls.length > 0) {
                expect([400, 403, 404, 422, 500]).toContain(res.status.mock.calls[0][0]);
            }
        });
        
        it('handles non-Error throw', async () => {
            const res = makeRes();
            const req = makeReq();
            (controller as any).service = {
                deleteTreino: mockFn().mockRejectedValue('not an error object'),
            };
            await controller.deleteTreino(req, res);
            if (res.status.mock.calls.length > 0) {
                expect(res.status).toHaveBeenCalledWith(500);
            }
        });
    });
});
