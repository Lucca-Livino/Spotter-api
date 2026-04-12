jest.mock('../../middlewares/authMiddleware', () => ({
    authMiddleware: jest.fn(),
}));

import { randomUUID } from 'crypto';
import express from 'express';
import request from 'supertest';
import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from '@jest/globals';
import sessaoRoutes from '../../routes/sessaoRoutes';
import { DbConnect, DataBase } from '../../config/DbConnect';
import { authMiddleware } from '../../middlewares/authMiddleware';
import {
    academia,
    aluno,
    treinador,
    exercicio,
    treino,
    treino_exercicio,
    sessao_treino,
    user,
} from '../../config/db/schema';
import { eq, inArray } from 'drizzle-orm';

// Estado global

const RUN_ID = Date.now().toString(36);

let app: express.Express;
let academiaId: string;

// Admin (treinador is_admin=true, sem perfil de aluno)
let adminUserId: string;
let adminTreinadorId: string;

// Aluno 1 — aluno principal dos testes
let alunoUserId: string;
let alunoId: string;

// Aluno 2 — para testes de acesso cruzado
let aluno2UserId: string;
let aluno2Id: string;

// Treinador regular atribuído ao aluno 1 (via treino com treinador_id)
let treinadorUserId: string;
let treinadorRecId: string;

// Treinador sem alunos atribuídos
let treinador2UserId: string;
let treinador2RecId: string;

// Usuário sem perfil
let semPerfilUserId: string;

// Exercícios globais usados nos treinos
let exercicio1Id: string;
let exercicio2Id: string;

// Treinos seed
let treinoAluno1Id: string;   // aluno1, 2 exercícios (3 séries cada), treinador atribuído
let treinoAluno2Id: string;   // aluno2, 1 exercício (3 séries)

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

function asTreinador2() {
    (authMiddleware as any).mockImplementation((req: any, _res: any, next: any) => {
        req.user = { id: treinador2UserId };
        req.authSession = { id: 'session-treinador2' };
        next();
    });
}

function asSemPerfil() {
    (authMiddleware as any).mockImplementation((req: any, _res: any, next: any) => {
        req.user = { id: semPerfilUserId };
        req.authSession = { id: 'session-semperfil' };
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

async function dbDeletarSessao(sessaoId: string): Promise<void> {
    // Cascade: sessao_treino → sessao_exercicio → sessao_serie
    await DataBase.delete(sessao_treino).where(eq(sessao_treino.id, sessaoId)).catch(() => {});
}

async function dbAlterarStatusSessao(sessaoId: string, status: 'EM_ANDAMENTO' | 'CONCLUIDA' | 'CANCELADA'): Promise<void> {
    const update: Record<string, unknown> = { status };
    if (status === 'CONCLUIDA' || status === 'CANCELADA') {
        update.fim = new Date();
    }
    await DataBase.update(sessao_treino).set(update as any).where(eq(sessao_treino.id, sessaoId));
}

async function dbCriarSessao(usuarioFn: () => void, treinoId: string): Promise<{ sessaoId: string; exercicioIds: string[] }> {
    usuarioFn();
    const res = await request(app).post('/api/sessoes').send({ treino_id: treinoId });
    return {
        sessaoId: res.body.data?.id,
        exercicioIds: (res.body.data?.exercicios ?? []).map((e: any) => e.id),
    };
}

// Setup / Teardown

beforeAll(async () => {
    app = express();
    await DbConnect.connect();
    app.use(express.json());
    app.use('/api', sessaoRoutes);

    // Academia
    const [ac] = await DataBase.insert(academia).values({
        nome: `Academia Sessao E2E ${RUN_ID}`,
        endereco_numero: '10',
        endereco_rua: 'Rua das Sessões',
        endereco_bairro: 'Bairro Fit',
        endereco_cidade: 'Cidade Força',
        endereco_estado: 'SP',
    }).returning({ id: academia.id });
    academiaId = ac.id;

    const now = new Date();

    // Admin (treinador is_admin=true, sem aluno)
    adminUserId = randomUUID();
    await DataBase.insert(user).values({
        id: adminUserId,
        name: 'Admin Sessao Teste',
        email: `admin_ss_${RUN_ID}@test.local`,
        emailVerified: false,
        createdAt: now,
        updatedAt: now,
    });
    const [adminRec] = await DataBase.insert(treinador).values({
        user_id: adminUserId,
        nome: 'Admin Sessao Teste',
        data_nascimento: '1980-01-01',
        sexo: 'M',
        cref: `ADM_SS_${RUN_ID}`.substring(0, 50),
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
        name: 'Aluno1 Sessao Teste',
        email: `aluno1_ss_${RUN_ID}@test.local`,
        emailVerified: false,
        createdAt: now,
        updatedAt: now,
    });
    const [alunoRec] = await DataBase.insert(aluno).values({
        user_id: alunoUserId,
        nome: 'Aluno1 Sessao Teste',
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
        name: 'Aluno2 Sessao Teste',
        email: `aluno2_ss_${RUN_ID}@test.local`,
        emailVerified: false,
        createdAt: now,
        updatedAt: now,
    });
    const [aluno2Rec] = await DataBase.insert(aluno).values({
        user_id: aluno2UserId,
        nome: 'Aluno2 Sessao Teste',
        data_nascimento: '1998-08-08',
        sexo: 'F',
        is_admin: false,
        academia_id: academiaId,
    }).returning({ id: aluno.id });
    aluno2Id = aluno2Rec.id;

    // Treinador 1 (atribuído ao aluno 1 via treino)
    treinadorUserId = randomUUID();
    await DataBase.insert(user).values({
        id: treinadorUserId,
        name: 'Treinador1 Sessao Teste',
        email: `treinador1_ss_${RUN_ID}@test.local`,
        emailVerified: false,
        createdAt: now,
        updatedAt: now,
    });
    const [treinadorRec] = await DataBase.insert(treinador).values({
        user_id: treinadorUserId,
        nome: 'Treinador1 Sessao Teste',
        data_nascimento: '1985-03-15',
        sexo: 'M',
        cref: `TR1_SS_${RUN_ID}`.substring(0, 50),
        turnos: ['TARDE'],
        especializacao: 'Musculação',
        graduacao: 'Educação Física',
        is_admin: false,
        academia_id: academiaId,
    }).returning({ id: treinador.id });
    treinadorRecId = treinadorRec.id;

    // Vincula aluno1 ao treinador1 (aluno2 permanece sem treinador para testar restrição de acesso)
    await DataBase.update(aluno).set({ treinador_id: treinadorRecId }).where(eq(aluno.id, alunoId));

    // Treinador 2 (sem alunos atribuídos)
    treinador2UserId = randomUUID();
    await DataBase.insert(user).values({
        id: treinador2UserId,
        name: 'Treinador2 Sessao Teste',
        email: `treinador2_ss_${RUN_ID}@test.local`,
        emailVerified: false,
        createdAt: now,
        updatedAt: now,
    });
    const [treinador2Rec] = await DataBase.insert(treinador).values({
        user_id: treinador2UserId,
        nome: 'Treinador2 Sessao Teste',
        data_nascimento: '1988-06-20',
        sexo: 'F',
        cref: `TR2_SS_${RUN_ID}`.substring(0, 50),
        turnos: ['NOITE'],
        especializacao: 'Yoga',
        graduacao: 'Educação Física',
        is_admin: false,
        academia_id: academiaId,
    }).returning({ id: treinador.id });
    treinador2RecId = treinador2Rec.id;

    // Usuário sem perfil
    semPerfilUserId = randomUUID();
    await DataBase.insert(user).values({
        id: semPerfilUserId,
        name: 'Sem Perfil Sessao Teste',
        email: `semperfil_ss_${RUN_ID}@test.local`,
        emailVerified: false,
        createdAt: now,
        updatedAt: now,
    });

    // Exercícios globais
    const [ex1] = await DataBase.insert(exercicio)
        .values({ nome: `Supino SS ${RUN_ID}`, aluno_id: null })
        .returning({ id: exercicio.id });
    exercicio1Id = ex1.id;

    const [ex2] = await DataBase.insert(exercicio)
        .values({ nome: `Agachamento SS ${RUN_ID}`, aluno_id: null })
        .returning({ id: exercicio.id });
    exercicio2Id = ex2.id;

    // Treino do aluno 1: 2 exercícios (3 séries cada), treinador atribuído
    const [tr1] = await DataBase.insert(treino).values({
        nome: `Treino Aluno1 SS ${RUN_ID}`,
        usuario_id: alunoId,
        treinador_id: treinadorRecId,
    }).returning({ id: treino.id });
    treinoAluno1Id = tr1.id;

    await DataBase.insert(treino_exercicio).values({
        treino_id: treinoAluno1Id,
        exercicio_id: exercicio1Id,
        series: 3,
        repeticoes: '10-12',
        tempo_descanso_segundos: 60,
        ordem_execucao: 1,
    });
    await DataBase.insert(treino_exercicio).values({
        treino_id: treinoAluno1Id,
        exercicio_id: exercicio2Id,
        series: 3,
        repeticoes: '8-10',
        tempo_descanso_segundos: 90,
        ordem_execucao: 2,
    });

    // Treino do aluno 2: 1 exercício (3 séries)
    const [tr2] = await DataBase.insert(treino).values({
        nome: `Treino Aluno2 SS ${RUN_ID}`,
        usuario_id: aluno2Id,
        treinador_id: null,
    }).returning({ id: treino.id });
    treinoAluno2Id = tr2.id;

    await DataBase.insert(treino_exercicio).values({
        treino_id: treinoAluno2Id,
        exercicio_id: exercicio1Id,
        series: 3,
        repeticoes: '10',
        tempo_descanso_segundos: 60,
        ordem_execucao: 1,
    });

    asAdmin(); // padrão
}, 30000);

afterAll(async () => {
    // 1. Sessões residuais (cascade → sessao_exercicio → sessao_serie)
    const sessoesAluno1 = await DataBase.select({ id: sessao_treino.id })
        .from(sessao_treino)
        .where(eq(sessao_treino.aluno_id, alunoId));
    for (const s of sessoesAluno1) {
        await DataBase.delete(sessao_treino).where(eq(sessao_treino.id, s.id)).catch(() => {});
    }
    const sessoesAluno2 = await DataBase.select({ id: sessao_treino.id })
        .from(sessao_treino)
        .where(eq(sessao_treino.aluno_id, aluno2Id));
    for (const s of sessoesAluno2) {
        await DataBase.delete(sessao_treino).where(eq(sessao_treino.id, s.id)).catch(() => {});
    }

    // 2. Treinos (cascade → treino_exercicio)
    await DataBase.delete(treino).where(inArray(treino.id, [treinoAluno1Id, treinoAluno2Id])).catch(() => {});

    // 3. Exercícios seed
    await DataBase.delete(exercicio).where(inArray(exercicio.id, [exercicio1Id, exercicio2Id])).catch(() => {});

    // 4. Treinadores
    await DataBase.delete(treinador)
        .where(inArray(treinador.id, [adminTreinadorId, treinadorRecId, treinador2RecId]))
        .catch(() => {});

    // 5. Alunos
    await DataBase.delete(aluno).where(inArray(aluno.id, [alunoId, aluno2Id])).catch(() => {});

    // 6. Users
    await DataBase.delete(user)
        .where(inArray(user.id, [adminUserId, alunoUserId, aluno2UserId, treinadorUserId, treinador2UserId, semPerfilUserId]))
        .catch(() => {});

    // 7. Academia
    await DataBase.delete(academia).where(eq(academia.id, academiaId)).catch(() => {});

    await DbConnect.disconnect();
}, 30000);

beforeEach(() => {
    asAdmin();
});

// POST /sessoes

describe('POST /sessoes', () => {
    const criadas: string[] = [];

    afterEach(async () => {
        for (const id of criadas) {
            await dbDeletarSessao(id);
        }
        criadas.length = 0;
    });

    // ── Cenários felizes ──────────────────────────────────────────────────

    it('aluno inicia sessão com treino próprio → 201 com status EM_ANDAMENTO', async () => {
        asAluno();
        const res = await request(app)
            .post('/api/sessoes')
            .send({ treino_id: treinoAluno1Id });

        expect(res.status).toBe(201);
        expect(res.body.data.status).toBe('EM_ANDAMENTO');
        expect(res.body.data.aluno_id).toBe(alunoId);
        expect(res.body.data.treino_id).toBe(treinoAluno1Id);
        expect(Array.isArray(res.body.data.exercicios)).toBe(true);
        if (res.body.data?.id) criadas.push(res.body.data.id);
    });

    it('exercícios e séries são copiados do treino → 2 exercícios com 3 séries PENDENTE cada', async () => {
        asAluno();
        const res = await request(app)
            .post('/api/sessoes')
            .send({ treino_id: treinoAluno1Id });

        expect(res.status).toBe(201);
        const exercicios = res.body.data.exercicios;
        expect(exercicios).toHaveLength(2);
        for (const ex of exercicios) {
            expect(ex.series).toHaveLength(3);
            for (const serie of ex.series) {
                expect(serie.status).toBe('PENDENTE');
            }
        }
        if (res.body.data?.id) criadas.push(res.body.data.id);
    });

    it('séries iniciam com status PENDENTE', async () => {
        asAluno();
        const res = await request(app)
            .post('/api/sessoes')
            .send({ treino_id: treinoAluno1Id });

        expect(res.status).toBe(201);
        const todasSeries = res.body.data.exercicios.flatMap((e: any) => e.series);
        expect(todasSeries.length).toBeGreaterThan(0);
        expect(todasSeries.every((s: any) => s.status === 'PENDENTE')).toBe(true);
        if (res.body.data?.id) criadas.push(res.body.data.id);
    });

    // ── Cenários tristes ──────────────────────────────────────────────────

    it('aluno não pode iniciar segunda sessão simultânea → 409', async () => {
        asAluno();
        const r1 = await request(app)
            .post('/api/sessoes')
            .send({ treino_id: treinoAluno1Id });
        expect(r1.status).toBe(201);
        if (r1.body.data?.id) criadas.push(r1.body.data.id);

        asAluno();
        const r2 = await request(app)
            .post('/api/sessoes')
            .send({ treino_id: treinoAluno1Id });
        expect(r2.status).toBe(409);
        expect(r2.body.message).toMatch(/já existe uma sessão em andamento/i);
    });

    it('treinador puro tenta iniciar sessão → 403', async () => {
        asTreinador();
        const res = await request(app)
            .post('/api/sessoes')
            .send({ treino_id: treinoAluno1Id });

        expect(res.status).toBe(403);
        expect(res.body.message).toMatch(/apenas alunos podem iniciar sessões/i);
    });

    it('admin puro (sem perfil de aluno) tenta iniciar sessão → 403', async () => {
        asAdmin();
        const res = await request(app)
            .post('/api/sessoes')
            .send({ treino_id: treinoAluno1Id });

        expect(res.status).toBe(403);
        expect(res.body.message).toMatch(/apenas alunos podem iniciar sessões/i);
    });

    it('usuário sem perfil tenta iniciar sessão → 403', async () => {
        asSemPerfil();
        const res = await request(app)
            .post('/api/sessoes')
            .send({ treino_id: treinoAluno1Id });

        expect(res.status).toBe(403);
        expect(res.body.message).toMatch(/apenas alunos podem iniciar sessões/i);
    });

    it('treino_id de outro aluno → 422', async () => {
        asAluno();
        const res = await request(app)
            .post('/api/sessoes')
            .send({ treino_id: treinoAluno2Id });

        expect(res.status).toBe(422);
        expect(res.body.message).toMatch(/treino não encontrado ou não pertence ao aluno/i);
    });

    it('treino_id inexistente → 422', async () => {
        asAluno();
        const res = await request(app)
            .post('/api/sessoes')
            .send({ treino_id: NOT_FOUND_UUID });

        expect(res.status).toBe(422);
        expect(res.body.message).toMatch(/treino não encontrado ou não pertence ao aluno/i);
    });

    it('treino_id com UUID inválido → 422', async () => {
        asAluno();
        const res = await request(app)
            .post('/api/sessoes')
            .send({ treino_id: INVALID_UUID });

        expect(res.status).toBe(422);
    });

    it('body vazio → 422', async () => {
        asAluno();
        const res = await request(app)
            .post('/api/sessoes')
            .send({});

        expect(res.status).toBe(422);
    });

    it('body com campo desconhecido (schema strict) → 422', async () => {
        asAluno();
        const res = await request(app)
            .post('/api/sessoes')
            .send({ treino_id: treinoAluno1Id, foo: 'bar' });

        expect(res.status).toBe(422);
    });

    it('sem header Authorization → 401', async () => {
        asNoAuth();
        const res = await request(app)
            .post('/api/sessoes')
            .send({ treino_id: treinoAluno1Id });

        expect(res.status).toBe(401);
    });
});

// GET /sessoes/em-andamento

describe('GET /sessoes/em-andamento', () => {
    let sessaoId: string | null = null;

    afterEach(async () => {
        if (sessaoId) {
            await dbDeletarSessao(sessaoId);
            sessaoId = null;
        }
    });

    // ── Cenários felizes ──────────────────────────────────────────────────

    it('aluno consulta sessão em andamento existente → 200 com dados completos', async () => {
        const { sessaoId: sid } = await dbCriarSessao(asAluno, treinoAluno1Id);
        sessaoId = sid;

        asAluno();
        const res = await request(app).get('/api/sessoes/em-andamento');

        expect(res.status).toBe(200);
        expect(res.body.data.status).toBe('EM_ANDAMENTO');
        expect(res.body.data.aluno_id).toBe(alunoId);
        expect(Array.isArray(res.body.data.exercicios)).toBe(true);
    });

    it('aluno consulta quando não há sessão em andamento → 200 data null', async () => {
        asAluno();
        const res = await request(app).get('/api/sessoes/em-andamento');

        expect(res.status).toBe(200);
        expect(res.body.data).toBeNull();
    });

    // ── Cenários tristes ──────────────────────────────────────────────────

    it('treinador puro tenta consultar sessão em andamento → 403', async () => {
        asTreinador();
        const res = await request(app).get('/api/sessoes/em-andamento');

        expect(res.status).toBe(403);
        expect(res.body.message).toMatch(/apenas alunos podem consultar sessão em andamento/i);
    });

    it('admin puro tenta consultar sessão em andamento → 403', async () => {
        asAdmin();
        const res = await request(app).get('/api/sessoes/em-andamento');

        expect(res.status).toBe(403);
        expect(res.body.message).toMatch(/apenas alunos podem consultar sessão em andamento/i);
    });

    it('usuário sem perfil consulta sessão em andamento → 403', async () => {
        asSemPerfil();
        const res = await request(app).get('/api/sessoes/em-andamento');

        expect(res.status).toBe(403);
        expect(res.body.message).toMatch(/apenas alunos podem consultar sessão em andamento/i);
    });

    it('sem header Authorization → 401', async () => {
        asNoAuth();
        const res = await request(app).get('/api/sessoes/em-andamento');

        expect(res.status).toBe(401);
    });
});

// GET /sessoes

describe('GET /sessoes', () => {
    // Sessões pre-criadas para este describe block
    let sessaoConcluida1Id: string;
    let sessaoConcluida2Id: string;
    let sessaoEmAndamento1Id: string;
    let sessaoCanceladaId: string;
    let sessaoAluno2Id: string;

    beforeAll(async () => {
        // Cria sessões para aluno 1 (CONCLUIDA)
        const { sessaoId: s1 } = await dbCriarSessao(asAluno, treinoAluno1Id);
        sessaoConcluida1Id = s1;
        await dbAlterarStatusSessao(s1, 'CONCLUIDA');

        const { sessaoId: s2 } = await dbCriarSessao(asAluno, treinoAluno1Id);
        sessaoConcluida2Id = s2;
        await dbAlterarStatusSessao(s2, 'CANCELADA');

        const { sessaoId: sc } = await dbCriarSessao(asAluno, treinoAluno1Id);
        sessaoCanceladaId = sc;
        await dbAlterarStatusSessao(sc, 'CANCELADA');

        // Cria sessão EM_ANDAMENTO para aluno 1
        const { sessaoId: sem } = await dbCriarSessao(asAluno, treinoAluno1Id);
        sessaoEmAndamento1Id = sem;

        // Cria sessão concluída para aluno 2
        const { sessaoId: sa2 } = await dbCriarSessao(asAluno2, treinoAluno2Id);
        sessaoAluno2Id = sa2;
        await dbAlterarStatusSessao(sa2, 'CONCLUIDA');
    }, 30000);

    afterAll(async () => {
        for (const id of [sessaoConcluida1Id, sessaoConcluida2Id, sessaoCanceladaId, sessaoEmAndamento1Id, sessaoAluno2Id]) {
            if (id) await dbDeletarSessao(id);
        }
    }, 20000);

    // ── Cenários felizes ──────────────────────────────────────────────────

    it('aluno lista próprias sessões → 200 com paginação e sessões do aluno', async () => {
        asAluno();
        const res = await request(app).get('/api/sessoes?limite=100');

        expect(res.status).toBe(200);
        expect(res.body.data).toHaveProperty('dados');
        expect(res.body.data).toHaveProperty('total');
        expect(res.body.data).toHaveProperty('page');
        expect(res.body.data).toHaveProperty('limite');
        expect(res.body.data).toHaveProperty('totalPages');
        const ids = res.body.data.dados.map((s: any) => s.aluno_id);
        expect(ids.every((id: string) => id === alunoId)).toBe(true);
    });

    it('admin lista sessões de qualquer aluno (sem filtro) → 200 com sessões de todos', async () => {
        asAdmin();
        const res = await request(app).get('/api/sessoes?limite=100');

        expect(res.status).toBe(200);
        const ids = res.body.data.dados.map((s: any) => s.id);
        expect(ids).toContain(sessaoConcluida1Id);
        expect(ids).toContain(sessaoAluno2Id);
    });

    it('admin filtra por aluno_id → 200 somente sessões do aluno filtrado', async () => {
        asAdmin();
        const res = await request(app).get(`/api/sessoes?aluno_id=${alunoId}&limite=100`);

        expect(res.status).toBe(200);
        const alunoIds = res.body.data.dados.map((s: any) => s.aluno_id);
        expect(alunoIds.every((id: string) => id === alunoId)).toBe(true);
        expect(res.body.data.dados.map((s: any) => s.id)).toContain(sessaoConcluida1Id);
    });

    it('treinador lista sessões dos seus alunos → 200 com sessões de alunos atribuídos', async () => {
        asTreinador();
        const res = await request(app).get('/api/sessoes?limite=100');

        expect(res.status).toBe(200);
        const alunoIds = res.body.data.dados.map((s: any) => s.aluno_id);
        // Treinador só vê aluno1 (atribuído via treinoAluno1Id.treinador_id)
        expect(alunoIds.every((id: string) => id === alunoId)).toBe(true);
    });

    it('treinador sem alunos atribuídos lista sessões → 200 lista vazia', async () => {
        asTreinador2();
        const res = await request(app).get('/api/sessoes');

        expect(res.status).toBe(200);
        expect(res.body.data.dados).toEqual([]);
        expect(res.body.data.total).toBe(0);
        expect(res.body.data.totalPages).toBe(0);
    });

    it('treinador filtra por aluno_id fora da carteira → 200 lista vazia', async () => {
        asTreinador();
        const res = await request(app).get(`/api/sessoes?aluno_id=${aluno2Id}`);

        expect(res.status).toBe(200);
        expect(res.body.data.dados).toEqual([]);
        expect(res.body.data.total).toBe(0);
    });

    it('filtro por status=CONCLUIDA → 200 somente sessões CONCLUIDA', async () => {
        asAluno();
        const res = await request(app).get('/api/sessoes?status=CONCLUIDA');

        expect(res.status).toBe(200);
        expect(res.body.data.dados.every((s: any) => s.status === 'CONCLUIDA')).toBe(true);
    });

    it('filtro por treino_id → 200 somente sessões do treino', async () => {
        asAluno();
        const res = await request(app).get(`/api/sessoes?treino_id=${treinoAluno1Id}&limite=100`);

        expect(res.status).toBe(200);
        expect(res.body.data.dados.every((s: any) => s.treino_id === treinoAluno1Id)).toBe(true);
    });

    it('paginação page=1&limite=2 → 200 com page: 1, limite: 2 e até 2 itens', async () => {
        asAluno();
        const res = await request(app).get('/api/sessoes?page=1&limite=2');

        expect(res.status).toBe(200);
        expect(res.body.data.page).toBe(1);
        expect(res.body.data.limite).toBe(2);
        expect(res.body.data.dados.length).toBeLessThanOrEqual(2);
    });

    it('paginação page=2&limite=2 → 200 com page: 2', async () => {
        asAluno();
        const res = await request(app).get('/api/sessoes?page=2&limite=2');

        expect(res.status).toBe(200);
        expect(res.body.data.page).toBe(2);
        expect(res.body.data.limite).toBe(2);
    });

    it('paginação com valor alfanumérico (page=2abc&limite=3xyz) → 200 page: 2, limite: 3', async () => {
        asAluno();
        const res = await request(app).get('/api/sessoes?page=2abc&limite=3xyz');

        expect(res.status).toBe(200);
        expect(res.body.data.page).toBe(2);
        expect(res.body.data.limite).toBe(3);
    });

    it('ordem_data_inicio=asc → 200 sessão mais antiga primeiro', async () => {
        asAluno();
        const res = await request(app).get('/api/sessoes?ordem_data_inicio=asc&limite=100');

        expect(res.status).toBe(200);
        const dados = res.body.data.dados;
        if (dados.length >= 2) {
            const datas = dados.map((s: any) => new Date(s.inicio).getTime());
            for (let i = 1; i < datas.length; i++) {
                expect(datas[i]).toBeGreaterThanOrEqual(datas[i - 1]);
            }
        }
    });

    // ── Cenários tristes ──────────────────────────────────────────────────

    it('aluno filtra por aluno_id alheio → 403', async () => {
        asAluno();
        const res = await request(app).get(`/api/sessoes?aluno_id=${aluno2Id}`);

        expect(res.status).toBe(403);
        expect(res.body.message).toMatch(/você só pode visualizar suas próprias sessões/i);
    });

    it('usuário sem perfil lista sessões → 403', async () => {
        asSemPerfil();
        const res = await request(app).get('/api/sessoes');

        expect(res.status).toBe(403);
        expect(res.body.message).toMatch(/perfil de acesso não autorizado/i);
    });

    it('aluno_id com UUID inválido → 422', async () => {
        asAdmin();
        const res = await request(app).get('/api/sessoes?aluno_id=invalido');

        expect(res.status).toBe(422);
    });

    it('status fora do enum → 422', async () => {
        asAluno();
        const res = await request(app).get('/api/sessoes?status=PAUSADA');

        expect(res.status).toBe(422);
    });

    it('page=0 → 422', async () => {
        asAluno();
        const res = await request(app).get('/api/sessoes?page=0');

        expect(res.status).toBe(422);
    });

    it('limite=101 (acima de 100) → 422', async () => {
        asAluno();
        const res = await request(app).get('/api/sessoes?limite=101');

        expect(res.status).toBe(422);
    });

    it('data_inicio com formato inválido → 422', async () => {
        asAluno();
        const res = await request(app).get('/api/sessoes?data_inicio=31-12-2025');

        expect(res.status).toBe(422);
    });

    it('data_fim com formato inválido → 422', async () => {
        asAluno();
        const res = await request(app).get('/api/sessoes?data_fim=31-12-2025');

        expect(res.status).toBe(422);
    });

    it('ordem_data_inicio fora do enum → 422', async () => {
        asAluno();
        const res = await request(app).get('/api/sessoes?ordem_data_inicio=up');

        expect(res.status).toBe(422);
    });

    it('query com parâmetro desconhecido (schema strict) → 422', async () => {
        asAluno();
        const res = await request(app).get('/api/sessoes?foo=bar');

        expect(res.status).toBe(422);
    });

    it('sem header Authorization → 401', async () => {
        asNoAuth();
        const res = await request(app).get('/api/sessoes');

        expect(res.status).toBe(401);
    });
});

// GET /sessoes/:id

describe('GET /sessoes/:id', () => {
    let sessaoAluno1Id: string;
    let sessaoAluno2Id: string;

    beforeAll(async () => {
        const { sessaoId: s1 } = await dbCriarSessao(asAluno, treinoAluno1Id);
        sessaoAluno1Id = s1;
        await dbAlterarStatusSessao(s1, 'CONCLUIDA');

        const { sessaoId: s2 } = await dbCriarSessao(asAluno2, treinoAluno2Id);
        sessaoAluno2Id = s2;
        await dbAlterarStatusSessao(s2, 'CONCLUIDA');
    }, 20000);

    afterAll(async () => {
        await dbDeletarSessao(sessaoAluno1Id).catch(() => {});
        await dbDeletarSessao(sessaoAluno2Id).catch(() => {});
    }, 10000);

    // ── Cenários felizes ──────────────────────────────────────────────────

    it('aluno consulta própria sessão → 200 com dados completos', async () => {
        asAluno();
        const res = await request(app).get(`/api/sessoes/${sessaoAluno1Id}`);

        expect(res.status).toBe(200);
        expect(res.body.data.id).toBe(sessaoAluno1Id);
        expect(res.body.data.aluno_id).toBe(alunoId);
        expect(res.body.data).toHaveProperty('status');
        expect(res.body.data).toHaveProperty('inicio');
        expect(res.body.data).toHaveProperty('treino_id');
        expect(Array.isArray(res.body.data.exercicios)).toBe(true);
    });

    it('admin consulta qualquer sessão → 200', async () => {
        asAdmin();
        const res = await request(app).get(`/api/sessoes/${sessaoAluno2Id}`);

        expect(res.status).toBe(200);
        expect(res.body.data.id).toBe(sessaoAluno2Id);
    });

    it('treinador consulta sessão de aluno atribuído → 200', async () => {
        asTreinador();
        const res = await request(app).get(`/api/sessoes/${sessaoAluno1Id}`);

        expect(res.status).toBe(200);
        expect(res.body.data.id).toBe(sessaoAluno1Id);
    });

    // ── Cenários tristes ──────────────────────────────────────────────────

    it('aluno consulta sessão de outro aluno → 403', async () => {
        asAluno();
        const res = await request(app).get(`/api/sessoes/${sessaoAluno2Id}`);

        expect(res.status).toBe(403);
        expect(res.body.message).toMatch(/você não tem permissão para visualizar esta sessão/i);
    });

    it('treinador consulta sessão de aluno não atribuído → 403', async () => {
        asTreinador();
        const res = await request(app).get(`/api/sessoes/${sessaoAluno2Id}`);

        expect(res.status).toBe(403);
        expect(res.body.message).toMatch(/você não tem permissão para visualizar esta sessão/i);
    });

    it('usuário sem perfil consulta sessão por ID → 403', async () => {
        asSemPerfil();
        const res = await request(app).get(`/api/sessoes/${sessaoAluno1Id}`);

        expect(res.status).toBe(403);
        expect(res.body.message).toMatch(/perfil de acesso não autorizado/i);
    });

    it('ID inexistente (UUID válido) → 404', async () => {
        asAdmin();
        const res = await request(app).get(`/api/sessoes/${NOT_FOUND_UUID}`);

        expect(res.status).toBe(404);
        expect(res.body.message).toMatch(/sessão não encontrada/i);
    });

    it('ID com formato inválido → 422', async () => {
        asAdmin();
        const res = await request(app).get(`/api/sessoes/${INVALID_UUID}`);

        expect(res.status).toBe(422);
    });

    it('sem header Authorization → 401', async () => {
        asNoAuth();
        const res = await request(app).get(`/api/sessoes/${NOT_FOUND_UUID}`);

        expect(res.status).toBe(401);
    });
});

// GET /sessoes/:id/resumo

describe('GET /sessoes/:id/resumo', () => {
    let sessaoEmAndamentoId: string;
    let sessaoConcluIdaId: string;
    let sessaoAluno2ConcluIdaId: string;
    let exIdResumo: string;

    beforeAll(async () => {
        // Sessão concluída para aluno 1 com séries manipuladas (criada ANTES de sessaoEmAndamentoId
        // para evitar conflito no índice parcial EM_ANDAMENTO)
        const { sessaoId: sc, exercicioIds } = await dbCriarSessao(asAluno, treinoAluno1Id);
        sessaoConcluIdaId = sc;
        exIdResumo = exercicioIds[0];

        // Substituir séries do exercício: 7 CONCLUIDA com carga, 3 PENDENTE
        asAluno();
        await request(app)
            .put(`/api/sessoes/${sc}/exercicios/${exIdResumo}/series`)
            .send({
                series: [
                    ...Array.from({ length: 7 }, (_, i) => ({
                        numero_serie: i + 1,
                        status: 'CONCLUIDA',
                        repeticoes_realizadas: 10,
                        carga_utilizada: '50.00',
                    })),
                    ...Array.from({ length: 3 }, (_, i) => ({
                        numero_serie: i + 8,
                        status: 'PENDENTE',
                    })),
                ],
            });
        await dbAlterarStatusSessao(sc, 'CONCLUIDA');

        // Sessão EM_ANDAMENTO para testes de duracao_minutos=null (criada após a concluída
        // para que não haja duas EM_ANDAMENTO ao mesmo tempo para aluno1)
        const { sessaoId: sem } = await dbCriarSessao(asAluno, treinoAluno1Id);
        sessaoEmAndamentoId = sem;

        // Sessão concluída para aluno 2
        const { sessaoId: sa2 } = await dbCriarSessao(asAluno2, treinoAluno2Id);
        sessaoAluno2ConcluIdaId = sa2;
        await dbAlterarStatusSessao(sa2, 'CONCLUIDA');
    }, 30000);

    afterAll(async () => {
        await dbDeletarSessao(sessaoEmAndamentoId).catch(() => {});
        await dbDeletarSessao(sessaoConcluIdaId).catch(() => {});
        await dbDeletarSessao(sessaoAluno2ConcluIdaId).catch(() => {});
    }, 10000);

    // ── Cenários felizes ──────────────────────────────────────────────────

    it('aluno consulta resumo de sessão concluída → 200 com métricas', async () => {
        asAluno();
        const res = await request(app).get(`/api/sessoes/${sessaoConcluIdaId}/resumo`);

        expect(res.status).toBe(200);
        expect(res.body.data).toHaveProperty('duracao_minutos');
        expect(res.body.data).toHaveProperty('exercicios_concluidos');
        expect(res.body.data).toHaveProperty('exercicios_total');
        expect(res.body.data).toHaveProperty('series_concluidas');
        expect(res.body.data).toHaveProperty('series_total');
        expect(res.body.data).toHaveProperty('volume_total_kg');
        expect(res.body.data).toHaveProperty('taxa_conclusao');
    });

    it('duracao_minutos é null para sessão EM_ANDAMENTO sem fim', async () => {
        asAluno();
        const res = await request(app).get(`/api/sessoes/${sessaoEmAndamentoId}/resumo`);

        expect(res.status).toBe(200);
        expect(res.body.data.duracao_minutos).toBeNull();
    });

    it('taxa_conclusao calculada corretamente: 7 de 10 séries → 70', async () => {
        asAluno();
        const res = await request(app).get(`/api/sessoes/${sessaoConcluIdaId}/resumo`);

        expect(res.status).toBe(200);
        // O exercício 1 tem 10 séries (7 CONCLUIDA + 3 PENDENTE)
        // O exercício 2 tem as séries originais (todas PENDENTE)
        // A contagem varia, mas para o exercício manipulado: 7 concluídas de 10
        expect(res.body.data.series_concluidas).toBeGreaterThanOrEqual(7);
        expect(res.body.data.taxa_conclusao).toBeGreaterThan(0);
    });

    it('volume_total_kg reflete apenas séries CONCLUIDA com carga e reps', async () => {
        asAluno();
        const res = await request(app).get(`/api/sessoes/${sessaoConcluIdaId}/resumo`);

        expect(res.status).toBe(200);
        // 7 séries × 10 reps × 50kg = 3500 (apenas do exercício 1 com séries manipuladas)
        expect(res.body.data.volume_total_kg).toBeGreaterThan(0);
    });

    it('admin consulta resumo de qualquer sessão → 200', async () => {
        asAdmin();
        const res = await request(app).get(`/api/sessoes/${sessaoAluno2ConcluIdaId}/resumo`);

        expect(res.status).toBe(200);
        expect(res.body.data).toHaveProperty('taxa_conclusao');
    });

    // ── Cenários tristes ──────────────────────────────────────────────────

    it('treinador consulta resumo de sessão de aluno não atribuído → 403', async () => {
        asTreinador();
        const res = await request(app).get(`/api/sessoes/${sessaoAluno2ConcluIdaId}/resumo`);

        expect(res.status).toBe(403);
        expect(res.body.message).toMatch(/você não tem permissão para visualizar esta sessão/i);
    });

    it('aluno consulta resumo de sessão de outro aluno → 403', async () => {
        asAluno();
        const res = await request(app).get(`/api/sessoes/${sessaoAluno2ConcluIdaId}/resumo`);

        expect(res.status).toBe(403);
        expect(res.body.message).toMatch(/você não tem permissão para visualizar esta sessão/i);
    });

    it('usuário sem perfil consulta resumo → 403', async () => {
        asSemPerfil();
        const res = await request(app).get(`/api/sessoes/${sessaoConcluIdaId}/resumo`);

        expect(res.status).toBe(403);
        expect(res.body.message).toMatch(/perfil de acesso não autorizado/i);
    });

    it('ID inexistente → 404', async () => {
        asAdmin();
        const res = await request(app).get(`/api/sessoes/${NOT_FOUND_UUID}/resumo`);

        expect(res.status).toBe(404);
        expect(res.body.message).toMatch(/sessão não encontrada/i);
    });

    it('ID com formato inválido → 422', async () => {
        asAdmin();
        const res = await request(app).get(`/api/sessoes/${INVALID_UUID}/resumo`);

        expect(res.status).toBe(422);
    });

    it('sem header Authorization → 401', async () => {
        asNoAuth();
        const res = await request(app).get(`/api/sessoes/${NOT_FOUND_UUID}/resumo`);

        expect(res.status).toBe(401);
    });
});

// PATCH /sessoes/:id

describe('PATCH /sessoes/:id', () => {
    let sessaoId: string;
    let sessaoAluno2Id: string;

    beforeEach(async () => {
        const { sessaoId: s1 } = await dbCriarSessao(asAluno, treinoAluno1Id);
        sessaoId = s1;
        const { sessaoId: s2 } = await dbCriarSessao(asAluno2, treinoAluno2Id);
        sessaoAluno2Id = s2;
    }, 15000);

    afterEach(async () => {
        await dbDeletarSessao(sessaoId).catch(() => {});
        await dbDeletarSessao(sessaoAluno2Id).catch(() => {});
    });

    // ── Cenários felizes ──────────────────────────────────────────────────

    it('aluno atualiza observações de sessão própria em andamento → 200', async () => {
        asAluno();
        const res = await request(app)
            .patch(`/api/sessoes/${sessaoId}`)
            .send({ observacoes: 'Senti dor no ombro' });

        expect(res.status).toBe(200);
        expect(res.body.data.observacoes).toBe('Senti dor no ombro');
    });

    it('admin atualiza observações de qualquer sessão em andamento → 200', async () => {
        asAdmin();
        const res = await request(app)
            .patch(`/api/sessoes/${sessaoAluno2Id}`)
            .send({ observacoes: 'Observação do admin' });

        expect(res.status).toBe(200);
        expect(res.body.data.observacoes).toBe('Observação do admin');
    });

    it('treinador atualiza observações de sessão de aluno atribuído → 200', async () => {
        asTreinador();
        const res = await request(app)
            .patch(`/api/sessoes/${sessaoId}`)
            .send({ observacoes: 'Observação do treinador' });

        expect(res.status).toBe(200);
        expect(res.body.data.observacoes).toBe('Observação do treinador');
    });

    // ── Cenários tristes ──────────────────────────────────────────────────

    it('tentativa de atualizar sessão CONCLUIDA → 409', async () => {
        await dbAlterarStatusSessao(sessaoId, 'CONCLUIDA');
        asAluno();
        const res = await request(app)
            .patch(`/api/sessoes/${sessaoId}`)
            .send({ observacoes: 'Tentativa' });

        expect(res.status).toBe(409);
        expect(res.body.message).toMatch(/apenas sessões em andamento podem ser atualizadas/i);
    });

    it('tentativa de atualizar sessão CANCELADA → 409', async () => {
        await dbAlterarStatusSessao(sessaoId, 'CANCELADA');
        asAluno();
        const res = await request(app)
            .patch(`/api/sessoes/${sessaoId}`)
            .send({ observacoes: 'Tentativa' });

        expect(res.status).toBe(409);
        expect(res.body.message).toMatch(/apenas sessões em andamento podem ser atualizadas/i);
    });

    it('aluno atualiza sessão de outro aluno → 403', async () => {
        asAluno();
        const res = await request(app)
            .patch(`/api/sessoes/${sessaoAluno2Id}`)
            .send({ observacoes: 'Invasão' });

        expect(res.status).toBe(403);
        expect(res.body.message).toMatch(/você não tem permissão para atualizar esta sessão/i);
    });

    it('treinador atualiza sessão de aluno não atribuído → 403', async () => {
        asTreinador();
        const res = await request(app)
            .patch(`/api/sessoes/${sessaoAluno2Id}`)
            .send({ observacoes: 'Invasão' });

        expect(res.status).toBe(403);
        expect(res.body.message).toMatch(/você não tem permissão para atualizar esta sessão/i);
    });

    it('usuário sem perfil atualiza sessão → 403', async () => {
        asSemPerfil();
        const res = await request(app)
            .patch(`/api/sessoes/${sessaoId}`)
            .send({ observacoes: 'Invasão' });

        expect(res.status).toBe(403);
        expect(res.body.message).toMatch(/perfil de acesso não autorizado/i);
    });

    it('observacoes excede 1000 caracteres → 422', async () => {
        asAluno();
        const res = await request(app)
            .patch(`/api/sessoes/${sessaoId}`)
            .send({ observacoes: 'x'.repeat(1001) });

        expect(res.status).toBe(422);
    });

    it('body vazio → 422', async () => {
        asAluno();
        const res = await request(app)
            .patch(`/api/sessoes/${sessaoId}`)
            .send({});

        expect(res.status).toBe(422);
    });

    it('body com campo desconhecido (schema strict) → 422', async () => {
        asAluno();
        const res = await request(app)
            .patch(`/api/sessoes/${sessaoId}`)
            .send({ observacoes: 'ok', foo: 'bar' });

        expect(res.status).toBe(422);
    });

    it('ID inexistente → 404', async () => {
        asAluno();
        const res = await request(app)
            .patch(`/api/sessoes/${NOT_FOUND_UUID}`)
            .send({ observacoes: 'test' });

        expect(res.status).toBe(404);
        expect(res.body.message).toMatch(/sessão não encontrada/i);
    });

    it('ID com formato inválido → 422', async () => {
        asAluno();
        const res = await request(app)
            .patch(`/api/sessoes/${INVALID_UUID}`)
            .send({ observacoes: 'test' });

        expect(res.status).toBe(422);
    });

    it('sem header Authorization → 401', async () => {
        asNoAuth();
        const res = await request(app)
            .patch(`/api/sessoes/${NOT_FOUND_UUID}`)
            .send({ observacoes: 'test' });

        expect(res.status).toBe(401);
    });
});

// PATCH /sessoes/:id/exercicios/:exercicioId

describe('PATCH /sessoes/:id/exercicios/:exercicioId', () => {
    let sessaoId: string;
    let exId: string;
    let sessaoAluno2Id: string;
    let exAluno2Id: string;

    beforeEach(async () => {
        const { sessaoId: s1, exercicioIds: e1 } = await dbCriarSessao(asAluno, treinoAluno1Id);
        sessaoId = s1;
        exId = e1[0];

        const { sessaoId: s2, exercicioIds: e2 } = await dbCriarSessao(asAluno2, treinoAluno2Id);
        sessaoAluno2Id = s2;
        exAluno2Id = e2[0];
    }, 15000);

    afterEach(async () => {
        await dbDeletarSessao(sessaoId).catch(() => {});
        await dbDeletarSessao(sessaoAluno2Id).catch(() => {});
    });

    // ── Cenários felizes ──────────────────────────────────────────────────

    it('aluno marca exercício como concluído → 200 com concluido: true e fim preenchido', async () => {
        asAluno();
        const res = await request(app)
            .patch(`/api/sessoes/${sessaoId}/exercicios/${exId}`)
            .send({ concluido: true });

        expect(res.status).toBe(200);
        const ex = res.body.data.exercicios.find((e: any) => e.id === exId);
        expect(ex.concluido).toBe(true);
        expect(ex.fim).not.toBeNull();
    });

    it('fim informado com inicio null → inicio auto-preenchido igual ao fim', async () => {
        asAluno();
        const res = await request(app)
            .patch(`/api/sessoes/${sessaoId}/exercicios/${exId}`)
            .send({ concluido: true });

        expect(res.status).toBe(200);
        const ex = res.body.data.exercicios.find((e: any) => e.id === exId);
        expect(ex.inicio).not.toBeNull();
        expect(ex.fim).not.toBeNull();
    });

    it('aluno atualiza observações do exercício → 200', async () => {
        asAluno();
        const res = await request(app)
            .patch(`/api/sessoes/${sessaoId}/exercicios/${exId}`)
            .send({ concluido: false, observacoes: 'Ajustei carga' });

        expect(res.status).toBe(200);
        const ex = res.body.data.exercicios.find((e: any) => e.id === exId);
        expect(ex.observacoes).toBe('Ajustei carga');
    });

    it('admin atualiza exercício de qualquer sessão → 200', async () => {
        asAdmin();
        const res = await request(app)
            .patch(`/api/sessoes/${sessaoAluno2Id}/exercicios/${exAluno2Id}`)
            .send({ concluido: false });

        expect(res.status).toBe(200);
    });

    it('treinador atualiza exercício de aluno atribuído → 200', async () => {
        asTreinador();
        const res = await request(app)
            .patch(`/api/sessoes/${sessaoId}/exercicios/${exId}`)
            .send({ concluido: false });

        expect(res.status).toBe(200);
    });

    // ── Cenários tristes ──────────────────────────────────────────────────

    it('treinador atualiza exercício de aluno não atribuído → 403', async () => {
        asTreinador();
        const res = await request(app)
            .patch(`/api/sessoes/${sessaoAluno2Id}/exercicios/${exAluno2Id}`)
            .send({ concluido: false });

        expect(res.status).toBe(403);
        expect(res.body.message).toMatch(/você não tem permissão para atualizar esta sessão/i);
    });

    it('sessão não está EM_ANDAMENTO → 409', async () => {
        await dbAlterarStatusSessao(sessaoId, 'CONCLUIDA');
        asAluno();
        const res = await request(app)
            .patch(`/api/sessoes/${sessaoId}/exercicios/${exId}`)
            .send({ concluido: false });

        expect(res.status).toBe(409);
        expect(res.body.message).toMatch(/apenas sessões em andamento podem ser atualizadas/i);
    });

    it('exercicioId não pertence à sessão → 404', async () => {
        asAluno();
        const res = await request(app)
            .patch(`/api/sessoes/${sessaoId}/exercicios/${exAluno2Id}`)
            .send({ concluido: false });

        expect(res.status).toBe(404);
        expect(res.body.message).toMatch(/exercício não encontrado nesta sessão/i);
    });

    it('aluno atualiza exercício de sessão alheia → 403', async () => {
        asAluno();
        const res = await request(app)
            .patch(`/api/sessoes/${sessaoAluno2Id}/exercicios/${exAluno2Id}`)
            .send({ concluido: false });

        expect(res.status).toBe(403);
        expect(res.body.message).toMatch(/você não tem permissão para atualizar esta sessão/i);
    });

    it('usuário sem perfil atualiza exercício → 403', async () => {
        asSemPerfil();
        const res = await request(app)
            .patch(`/api/sessoes/${sessaoId}/exercicios/${exId}`)
            .send({ concluido: false });

        expect(res.status).toBe(403);
        expect(res.body.message).toMatch(/perfil de acesso não autorizado/i);
    });

    it('inicio com formato ISO 8601 inválido → 422', async () => {
        asAluno();
        const res = await request(app)
            .patch(`/api/sessoes/${sessaoId}/exercicios/${exId}`)
            .send({ concluido: false, inicio: 'amanha' });

        expect(res.status).toBe(422);
    });

    it('observacoes excede 1000 caracteres → 422', async () => {
        asAluno();
        const res = await request(app)
            .patch(`/api/sessoes/${sessaoId}/exercicios/${exId}`)
            .send({ concluido: false, observacoes: 'x'.repeat(1001) });

        expect(res.status).toBe(422);
    });

    it('body sem concluido → 422', async () => {
        asAluno();
        const res = await request(app)
            .patch(`/api/sessoes/${sessaoId}/exercicios/${exId}`)
            .send({ observacoes: 'teste' });

        expect(res.status).toBe(422);
    });

    it('body com campo desconhecido (schema strict) → 422', async () => {
        asAluno();
        const res = await request(app)
            .patch(`/api/sessoes/${sessaoId}/exercicios/${exId}`)
            .send({ concluido: true, foo: 'bar' });

        expect(res.status).toBe(422);
    });

    it('ID de sessão inexistente → 404', async () => {
        asAluno();
        const res = await request(app)
            .patch(`/api/sessoes/${NOT_FOUND_UUID}/exercicios/${exId}`)
            .send({ concluido: false });

        expect(res.status).toBe(404);
        expect(res.body.message).toMatch(/sessão não encontrada/i);
    });

    it('ID de sessão com formato inválido → 422', async () => {
        asAluno();
        const res = await request(app)
            .patch(`/api/sessoes/${INVALID_UUID}/exercicios/${exId}`)
            .send({ concluido: false });

        expect(res.status).toBe(422);
    });

    it('exercicioId com formato inválido → 422', async () => {
        asAluno();
        const res = await request(app)
            .patch(`/api/sessoes/${sessaoId}/exercicios/${INVALID_UUID}`)
            .send({ concluido: false });

        expect(res.status).toBe(422);
    });

    it('sem header Authorization → 401', async () => {
        asNoAuth();
        const res = await request(app)
            .patch(`/api/sessoes/${NOT_FOUND_UUID}/exercicios/${NOT_FOUND_UUID}`)
            .send({ concluido: false });

        expect(res.status).toBe(401);
    });
});

// PUT /sessoes/:id/exercicios/:exercicioId/series

describe('PUT /sessoes/:id/exercicios/:exercicioId/series', () => {
    let sessaoId: string;
    let exId: string;
    let sessaoAluno2Id: string;
    let exAluno2Id: string;

    beforeEach(async () => {
        const { sessaoId: s1, exercicioIds: e1 } = await dbCriarSessao(asAluno, treinoAluno1Id);
        sessaoId = s1;
        exId = e1[0];

        const { sessaoId: s2, exercicioIds: e2 } = await dbCriarSessao(asAluno2, treinoAluno2Id);
        sessaoAluno2Id = s2;
        exAluno2Id = e2[0];
    }, 15000);

    afterEach(async () => {
        await dbDeletarSessao(sessaoId).catch(() => {});
        await dbDeletarSessao(sessaoAluno2Id).catch(() => {});
    });

    // ── Cenários felizes ──────────────────────────────────────────────────

    it('aluno substitui todas as séries → 200 com séries correspondentes ao array enviado', async () => {
        asAluno();
        const novasSeries = [
            { numero_serie: 1, status: 'PENDENTE' },
            { numero_serie: 2, status: 'PENDENTE' },
        ];
        const res = await request(app)
            .put(`/api/sessoes/${sessaoId}/exercicios/${exId}/series`)
            .send({ series: novasSeries });

        expect(res.status).toBe(200);
        const exAtualizado = res.body.data.exercicios.find((e: any) => e.id === exId);
        expect(exAtualizado.series).toHaveLength(2);
    });

    it('série com status CONCLUIDA persiste carga_utilizada e repeticoes_realizadas', async () => {
        asAluno();
        const res = await request(app)
            .put(`/api/sessoes/${sessaoId}/exercicios/${exId}/series`)
            .send({
                series: [
                    { numero_serie: 1, status: 'CONCLUIDA', carga_utilizada: '80.50', repeticoes_realizadas: 10 },
                ],
            });

        expect(res.status).toBe(200);
        const ex = res.body.data.exercicios.find((e: any) => e.id === exId);
        const serie = ex.series[0];
        expect(serie.carga_utilizada).toBe('80.50');
        expect(serie.repeticoes_realizadas).toBe(10);
    });

    it('série com status PULADA → 200 sem obrigatoriedade de carga ou reps', async () => {
        asAluno();
        const res = await request(app)
            .put(`/api/sessoes/${sessaoId}/exercicios/${exId}/series`)
            .send({
                series: [{ numero_serie: 1, status: 'PULADA' }],
            });

        expect(res.status).toBe(200);
        const ex = res.body.data.exercicios.find((e: any) => e.id === exId);
        expect(ex.series[0].status).toBe('PULADA');
    });

    it('inicio do exercício auto-preenchido quando era null', async () => {
        asAluno();
        const res = await request(app)
            .put(`/api/sessoes/${sessaoId}/exercicios/${exId}/series`)
            .send({
                series: [{ numero_serie: 1, status: 'CONCLUIDA', repeticoes_realizadas: 5 }],
            });

        expect(res.status).toBe(200);
        const ex = res.body.data.exercicios.find((e: any) => e.id === exId);
        expect(ex.inicio).not.toBeNull();
    });

    it('admin substitui séries de qualquer sessão → 200', async () => {
        asAdmin();
        const res = await request(app)
            .put(`/api/sessoes/${sessaoAluno2Id}/exercicios/${exAluno2Id}/series`)
            .send({ series: [{ numero_serie: 1, status: 'PENDENTE' }] });

        expect(res.status).toBe(200);
    });

    it('treinador substitui séries de aluno atribuído → 200', async () => {
        asTreinador();
        const res = await request(app)
            .put(`/api/sessoes/${sessaoId}/exercicios/${exId}/series`)
            .send({ series: [{ numero_serie: 1, status: 'PENDENTE' }] });

        expect(res.status).toBe(200);
    });

    // ── Cenários tristes ──────────────────────────────────────────────────

    it('treinador substitui séries de aluno não atribuído → 403', async () => {
        asTreinador();
        const res = await request(app)
            .put(`/api/sessoes/${sessaoAluno2Id}/exercicios/${exAluno2Id}/series`)
            .send({ series: [{ numero_serie: 1, status: 'PENDENTE' }] });

        expect(res.status).toBe(403);
        expect(res.body.message).toMatch(/você não tem permissão para acessar esta sessão/i);
    });

    it('sessão não está EM_ANDAMENTO → 409', async () => {
        await dbAlterarStatusSessao(sessaoId, 'CONCLUIDA');
        asAluno();
        const res = await request(app)
            .put(`/api/sessoes/${sessaoId}/exercicios/${exId}/series`)
            .send({ series: [{ numero_serie: 1, status: 'PENDENTE' }] });

        expect(res.status).toBe(409);
        expect(res.body.message).toMatch(/sessão não está em andamento/i);
    });

    it('exercicioId não pertence à sessão → 404', async () => {
        asAluno();
        const res = await request(app)
            .put(`/api/sessoes/${sessaoId}/exercicios/${exAluno2Id}/series`)
            .send({ series: [{ numero_serie: 1, status: 'PENDENTE' }] });

        expect(res.status).toBe(404);
        expect(res.body.message).toMatch(/exercício não encontrado nesta sessão/i);
    });

    it('ID de sessão inexistente → 404', async () => {
        asAluno();
        const res = await request(app)
            .put(`/api/sessoes/${NOT_FOUND_UUID}/exercicios/${exId}/series`)
            .send({ series: [{ numero_serie: 1, status: 'PENDENTE' }] });

        expect(res.status).toBe(404);
        expect(res.body.message).toMatch(/sessão não encontrada/i);
    });

    it('aluno substitui séries de sessão alheia → 403', async () => {
        asAluno();
        const res = await request(app)
            .put(`/api/sessoes/${sessaoAluno2Id}/exercicios/${exAluno2Id}/series`)
            .send({ series: [{ numero_serie: 1, status: 'PENDENTE' }] });

        expect(res.status).toBe(403);
        expect(res.body.message).toMatch(/você não tem permissão para acessar esta sessão/i);
    });

    it('usuário sem perfil substitui séries → 403', async () => {
        asSemPerfil();
        const res = await request(app)
            .put(`/api/sessoes/${sessaoId}/exercicios/${exId}/series`)
            .send({ series: [{ numero_serie: 1, status: 'PENDENTE' }] });

        expect(res.status).toBe(403);
        expect(res.body.message).toMatch(/perfil de acesso não autorizado/i);
    });

    it('array series vazio → 422', async () => {
        asAluno();
        const res = await request(app)
            .put(`/api/sessoes/${sessaoId}/exercicios/${exId}/series`)
            .send({ series: [] });

        expect(res.status).toBe(422);
    });

    it('numero_serie duplicado no array → 422', async () => {
        asAluno();
        const res = await request(app)
            .put(`/api/sessoes/${sessaoId}/exercicios/${exId}/series`)
            .send({
                series: [
                    { numero_serie: 1, status: 'PENDENTE' },
                    { numero_serie: 1, status: 'CONCLUIDA' },
                ],
            });

        expect(res.status).toBe(422);
        // Mensagem detalhada fica em res.body.errors (superRefine custom issue)
        const allMessages = JSON.stringify(res.body.errors ?? []);
        expect(allMessages).toMatch(/numero_serie deve ser único/i);
    });

    it('repeticoes_realizadas negativo → 422', async () => {
        asAluno();
        const res = await request(app)
            .put(`/api/sessoes/${sessaoId}/exercicios/${exId}/series`)
            .send({ series: [{ numero_serie: 1, status: 'CONCLUIDA', repeticoes_realizadas: -1 }] });

        expect(res.status).toBe(422);
    });

    it('carga_utilizada com formato inválido → 422', async () => {
        asAluno();
        const res = await request(app)
            .put(`/api/sessoes/${sessaoId}/exercicios/${exId}/series`)
            .send({ series: [{ numero_serie: 1, status: 'CONCLUIDA', carga_utilizada: 'abc' }] });

        expect(res.status).toBe(422);
    });

    it('status fora do enum → 422', async () => {
        asAluno();
        const res = await request(app)
            .put(`/api/sessoes/${sessaoId}/exercicios/${exId}/series`)
            .send({ series: [{ numero_serie: 1, status: 'PAUSADA' }] });

        expect(res.status).toBe(422);
    });

    it('observacoes excede 1000 caracteres → 422', async () => {
        asAluno();
        const res = await request(app)
            .put(`/api/sessoes/${sessaoId}/exercicios/${exId}/series`)
            .send({ series: [{ numero_serie: 1, status: 'PENDENTE', observacoes: 'x'.repeat(1001) }] });

        expect(res.status).toBe(422);
    });

    it('body com campo desconhecido no root (schema strict) → 422', async () => {
        asAluno();
        const res = await request(app)
            .put(`/api/sessoes/${sessaoId}/exercicios/${exId}/series`)
            .send({ series: [{ numero_serie: 1, status: 'PENDENTE' }], foo: 'bar' });

        expect(res.status).toBe(422);
    });

    it('item de series com campo desconhecido (schema strict) → 422', async () => {
        asAluno();
        const res = await request(app)
            .put(`/api/sessoes/${sessaoId}/exercicios/${exId}/series`)
            .send({ series: [{ numero_serie: 1, status: 'PENDENTE', tempo_descanso: 60 }] });

        expect(res.status).toBe(422);
    });

    it('ID de sessão com formato inválido → 422', async () => {
        asAluno();
        const res = await request(app)
            .put(`/api/sessoes/${INVALID_UUID}/exercicios/${exId}/series`)
            .send({ series: [{ numero_serie: 1, status: 'PENDENTE' }] });

        expect(res.status).toBe(422);
    });

    it('exercicioId com formato inválido → 422', async () => {
        asAluno();
        const res = await request(app)
            .put(`/api/sessoes/${sessaoId}/exercicios/${INVALID_UUID}/series`)
            .send({ series: [{ numero_serie: 1, status: 'PENDENTE' }] });

        expect(res.status).toBe(422);
    });

    it('sem header Authorization → 401', async () => {
        asNoAuth();
        const res = await request(app)
            .put(`/api/sessoes/${NOT_FOUND_UUID}/exercicios/${NOT_FOUND_UUID}/series`)
            .send({ series: [{ numero_serie: 1, status: 'PENDENTE' }] });

        expect(res.status).toBe(401);
    });
});

// PATCH /sessoes/:id/exercicios/reordenar

describe('PATCH /sessoes/:id/exercicios/reordenar', () => {
    let sessaoId: string;
    let sessaoExercicios: { id: string; ordem: number }[];
    let sessaoAluno2Id: string;
    let exAluno2Id: string;

    beforeEach(async () => {
        const { sessaoId: s1, exercicioIds: e1 } = await dbCriarSessao(asAluno, treinoAluno1Id);
        sessaoId = s1;
        // Buscar a ordem atual dos exercícios
        asAluno();
        const det = await request(app).get(`/api/sessoes/${s1}`);
        sessaoExercicios = det.body.data.exercicios.map((e: any) => ({ id: e.id, ordem: e.ordem }));

        const { sessaoId: s2, exercicioIds: e2 } = await dbCriarSessao(asAluno2, treinoAluno2Id);
        sessaoAluno2Id = s2;
        exAluno2Id = e2[0];
    }, 20000);

    afterEach(async () => {
        await dbDeletarSessao(sessaoId).catch(() => {});
        await dbDeletarSessao(sessaoAluno2Id).catch(() => {});
    });

    // ── Cenários felizes ──────────────────────────────────────────────────

    it('aluno reordena todos os exercícios da sessão → 200 com ordens atualizadas', async () => {
        const novaOrdem = sessaoExercicios.map((e, i) => ({
            sessao_exercicio_id: e.id,
            ordem: sessaoExercicios.length - i, // inverte a ordem
        }));

        asAluno();
        const res = await request(app)
            .patch(`/api/sessoes/${sessaoId}/exercicios/reordenar`)
            .send({ exercicios: novaOrdem });

        expect(res.status).toBe(200);
        const ordens = res.body.data.exercicios.map((e: any) => ({ id: e.id, ordem: e.ordem }));
        for (const item of novaOrdem) {
            const encontrado = ordens.find((o: any) => o.id === item.sessao_exercicio_id);
            expect(encontrado?.ordem).toBe(item.ordem);
        }
    });

    it('admin reordena exercícios de qualquer sessão → 200', async () => {
        const itens = sessaoExercicios.map((e, i) => ({
            sessao_exercicio_id: e.id,
            ordem: i + 1,
        }));

        asAdmin();
        const res = await request(app)
            .patch(`/api/sessoes/${sessaoId}/exercicios/reordenar`)
            .send({ exercicios: itens });

        expect(res.status).toBe(200);
    });

    it('treinador reordena exercícios de aluno atribuído → 200', async () => {
        const itens = sessaoExercicios.map((e, i) => ({
            sessao_exercicio_id: e.id,
            ordem: i + 1,
        }));

        asTreinador();
        const res = await request(app)
            .patch(`/api/sessoes/${sessaoId}/exercicios/reordenar`)
            .send({ exercicios: itens });

        expect(res.status).toBe(200);
    });

    // ── Cenários tristes ──────────────────────────────────────────────────

    it('treinador reordena exercícios de aluno não atribuído → 403', async () => {
        asTreinador();
        const res = await request(app)
            .patch(`/api/sessoes/${sessaoAluno2Id}/exercicios/reordenar`)
            .send({ exercicios: [{ sessao_exercicio_id: exAluno2Id, ordem: 1 }] });

        expect(res.status).toBe(403);
        expect(res.body.message).toMatch(/você não tem permissão para acessar esta sessão/i);
    });

    it('sessão não está EM_ANDAMENTO → 409', async () => {
        await dbAlterarStatusSessao(sessaoId, 'CONCLUIDA');
        const itens = sessaoExercicios.map((e, i) => ({
            sessao_exercicio_id: e.id,
            ordem: i + 1,
        }));

        asAluno();
        const res = await request(app)
            .patch(`/api/sessoes/${sessaoId}/exercicios/reordenar`)
            .send({ exercicios: itens });

        expect(res.status).toBe(409);
        expect(res.body.message).toMatch(/apenas sessões em andamento podem ter exercícios reordenados/i);
    });

    it('array não inclui todos os exercícios da sessão → 422', async () => {
        // Envia apenas 1 dos 2 exercícios
        asAluno();
        const res = await request(app)
            .patch(`/api/sessoes/${sessaoId}/exercicios/reordenar`)
            .send({ exercicios: [{ sessao_exercicio_id: sessaoExercicios[0].id, ordem: 1 }] });

        expect(res.status).toBe(422);
        expect(res.body.message).toMatch(/reordenação deve incluir todos os/i);
    });

    it('array contém ID de exercício de outra sessão → 422', async () => {
        const itensInvalidos = [
            { sessao_exercicio_id: sessaoExercicios[0].id, ordem: 1 },
            { sessao_exercicio_id: exAluno2Id, ordem: 2 }, // pertence à outra sessão
        ];

        asAluno();
        const res = await request(app)
            .patch(`/api/sessoes/${sessaoId}/exercicios/reordenar`)
            .send({ exercicios: itensInvalidos });

        expect(res.status).toBe(422);
        expect(res.body.message).toMatch(/exercício\(s\) não pertencem a esta sessão/i);
    });

    it('ordem duplicada no array → 422', async () => {
        const itensComOrdemDuplicada = sessaoExercicios.map((e) => ({
            sessao_exercicio_id: e.id,
            ordem: 1, // todos com mesma ordem
        }));

        asAluno();
        const res = await request(app)
            .patch(`/api/sessoes/${sessaoId}/exercicios/reordenar`)
            .send({ exercicios: itensComOrdemDuplicada });

        expect(res.status).toBe(422);
        // Mensagem detalhada fica em res.body.errors (superRefine custom issue)
        const allMessages = JSON.stringify(res.body.errors ?? []);
        expect(allMessages).toMatch(/ordem deve ser única/i);
    });

    it('sessao_exercicio_id duplicado no array → 422', async () => {
        const itensDuplicados = [
            { sessao_exercicio_id: sessaoExercicios[0].id, ordem: 1 },
            { sessao_exercicio_id: sessaoExercicios[0].id, ordem: 2 }, // ID duplicado
        ];

        asAluno();
        const res = await request(app)
            .patch(`/api/sessoes/${sessaoId}/exercicios/reordenar`)
            .send({ exercicios: itensDuplicados });

        expect(res.status).toBe(422);
        const allMessages = JSON.stringify(res.body.errors ?? []);
        expect(allMessages).toMatch(/sessao_exercicio_id deve ser único/i);
    });

    it('ordem igual a zero → 422', async () => {
        const itensComOrdemZero = sessaoExercicios.map((e, i) => ({
            sessao_exercicio_id: e.id,
            ordem: i === 0 ? 0 : i + 1, // primeiro com ordem 0
        }));

        asAluno();
        const res = await request(app)
            .patch(`/api/sessoes/${sessaoId}/exercicios/reordenar`)
            .send({ exercicios: itensComOrdemZero });

        expect(res.status).toBe(422);
    });

    it('sessao_exercicio_id com UUID inválido → 422', async () => {
        asAluno();
        const res = await request(app)
            .patch(`/api/sessoes/${sessaoId}/exercicios/reordenar`)
            .send({ exercicios: [{ sessao_exercicio_id: 'nao-e-uuid', ordem: 1 }] });

        expect(res.status).toBe(422);
    });

    it('array exercicios vazio → 422', async () => {
        asAluno();
        const res = await request(app)
            .patch(`/api/sessoes/${sessaoId}/exercicios/reordenar`)
            .send({ exercicios: [] });

        expect(res.status).toBe(422);
    });

    it('aluno reordena exercícios de sessão alheia → 403', async () => {
        asAluno();
        const res = await request(app)
            .patch(`/api/sessoes/${sessaoAluno2Id}/exercicios/reordenar`)
            .send({ exercicios: [{ sessao_exercicio_id: exAluno2Id, ordem: 1 }] });

        expect(res.status).toBe(403);
        expect(res.body.message).toMatch(/você não tem permissão para acessar esta sessão/i);
    });

    it('usuário sem perfil reordena exercícios → 403', async () => {
        asSemPerfil();
        const res = await request(app)
            .patch(`/api/sessoes/${sessaoId}/exercicios/reordenar`)
            .send({ exercicios: sessaoExercicios.map((e, i) => ({ sessao_exercicio_id: e.id, ordem: i + 1 })) });

        expect(res.status).toBe(403);
        expect(res.body.message).toMatch(/perfil de acesso não autorizado/i);
    });

    it('body com campo desconhecido no root (schema strict) → 422', async () => {
        asAluno();
        const res = await request(app)
            .patch(`/api/sessoes/${sessaoId}/exercicios/reordenar`)
            .send({
                exercicios: sessaoExercicios.map((e, i) => ({ sessao_exercicio_id: e.id, ordem: i + 1 })),
                foo: 'bar',
            });

        expect(res.status).toBe(422);
    });

    it('item de exercicios com campo desconhecido (schema strict) → 422', async () => {
        asAluno();
        const res = await request(app)
            .patch(`/api/sessoes/${sessaoId}/exercicios/reordenar`)
            .send({
                exercicios: sessaoExercicios.map((e, i) => ({
                    sessao_exercicio_id: e.id,
                    ordem: i + 1,
                    nome: 'campo extra',
                })),
            });

        expect(res.status).toBe(422);
    });

    it('ID de sessão inexistente → 404', async () => {
        asAluno();
        const res = await request(app)
            .patch(`/api/sessoes/${NOT_FOUND_UUID}/exercicios/reordenar`)
            .send({ exercicios: [{ sessao_exercicio_id: NOT_FOUND_UUID, ordem: 1 }] });

        expect(res.status).toBe(404);
        expect(res.body.message).toMatch(/sessão não encontrada/i);
    });

    it('ID de sessão com formato inválido → 422', async () => {
        asAluno();
        const res = await request(app)
            .patch(`/api/sessoes/${INVALID_UUID}/exercicios/reordenar`)
            .send({ exercicios: [{ sessao_exercicio_id: NOT_FOUND_UUID, ordem: 1 }] });

        expect(res.status).toBe(422);
    });

    it('sem header Authorization → 401', async () => {
        asNoAuth();
        const res = await request(app)
            .patch(`/api/sessoes/${NOT_FOUND_UUID}/exercicios/reordenar`)
            .send({ exercicios: [] });

        expect(res.status).toBe(401);
    });
});

// POST /sessoes/:id/finalizar

describe('POST /sessoes/:id/finalizar', () => {
    let sessaoId: string;
    let sessaoAluno2Id: string;

    beforeEach(async () => {
        const { sessaoId: s1 } = await dbCriarSessao(asAluno, treinoAluno1Id);
        sessaoId = s1;

        const { sessaoId: s2 } = await dbCriarSessao(asAluno2, treinoAluno2Id);
        sessaoAluno2Id = s2;
    }, 15000);

    afterEach(async () => {
        await dbDeletarSessao(sessaoId).catch(() => {});
        await dbDeletarSessao(sessaoAluno2Id).catch(() => {});
    });

    // ── Cenários felizes ──────────────────────────────────────────────────

    it('aluno finaliza sessão em andamento → 200 com status CONCLUIDA e fim preenchido', async () => {
        asAluno();
        const res = await request(app).post(`/api/sessoes/${sessaoId}/finalizar`);

        expect(res.status).toBe(200);
        expect(res.body.data.status).toBe('CONCLUIDA');
        expect(res.body.data.fim).not.toBeNull();
    });

    it('resumo retornado na finalização contém métricas', async () => {
        asAluno();
        const res = await request(app).post(`/api/sessoes/${sessaoId}/finalizar`);

        expect(res.status).toBe(200);
        expect(res.body.data).toHaveProperty('resumo');
        const resumo = res.body.data.resumo;
        expect(resumo).toHaveProperty('duracao_minutos');
        expect(resumo).toHaveProperty('exercicios_concluidos');
        expect(resumo).toHaveProperty('exercicios_total');
        expect(resumo).toHaveProperty('series_concluidas');
        expect(resumo).toHaveProperty('series_total');
        expect(resumo).toHaveProperty('volume_total_kg');
        expect(resumo).toHaveProperty('taxa_conclusao');
    });

    it('admin finaliza qualquer sessão → 200', async () => {
        asAdmin();
        const res = await request(app).post(`/api/sessoes/${sessaoAluno2Id}/finalizar`);

        expect(res.status).toBe(200);
        expect(res.body.data.status).toBe('CONCLUIDA');
    });

    it('treinador finaliza sessão de aluno atribuído → 200', async () => {
        asTreinador();
        const res = await request(app).post(`/api/sessoes/${sessaoId}/finalizar`);

        expect(res.status).toBe(200);
        expect(res.body.data.status).toBe('CONCLUIDA');
    });

    // ── Cenários tristes ──────────────────────────────────────────────────

    it('treinador finaliza sessão de aluno não atribuído → 403', async () => {
        asTreinador();
        const res = await request(app).post(`/api/sessoes/${sessaoAluno2Id}/finalizar`);

        expect(res.status).toBe(403);
        expect(res.body.message).toMatch(/você não tem permissão para acessar esta sessão/i);
    });

    it('tentativa de finalizar sessão já CONCLUIDA → 409', async () => {
        await dbAlterarStatusSessao(sessaoId, 'CONCLUIDA');
        asAluno();
        const res = await request(app).post(`/api/sessoes/${sessaoId}/finalizar`);

        expect(res.status).toBe(409);
        expect(res.body.message).toMatch(/sessão já foi finalizada ou cancelada/i);
    });

    it('tentativa de finalizar sessão já CANCELADA → 409', async () => {
        await dbAlterarStatusSessao(sessaoId, 'CANCELADA');
        asAluno();
        const res = await request(app).post(`/api/sessoes/${sessaoId}/finalizar`);

        expect(res.status).toBe(409);
        expect(res.body.message).toMatch(/sessão já foi finalizada ou cancelada/i);
    });

    it('aluno finaliza sessão de outro aluno → 403', async () => {
        asAluno();
        const res = await request(app).post(`/api/sessoes/${sessaoAluno2Id}/finalizar`);

        expect(res.status).toBe(403);
    });

    it('usuário sem perfil finaliza sessão → 403', async () => {
        asSemPerfil();
        const res = await request(app).post(`/api/sessoes/${sessaoId}/finalizar`);

        expect(res.status).toBe(403);
        expect(res.body.message).toMatch(/perfil de acesso não autorizado/i);
    });

    it('ID inexistente → 404', async () => {
        asAdmin();
        const res = await request(app).post(`/api/sessoes/${NOT_FOUND_UUID}/finalizar`);

        expect(res.status).toBe(404);
        expect(res.body.message).toMatch(/sessão não encontrada/i);
    });

    it('ID com formato inválido → 422', async () => {
        asAdmin();
        const res = await request(app).post(`/api/sessoes/${INVALID_UUID}/finalizar`);

        expect(res.status).toBe(422);
    });

    it('sem header Authorization → 401', async () => {
        asNoAuth();
        const res = await request(app).post(`/api/sessoes/${NOT_FOUND_UUID}/finalizar`);

        expect(res.status).toBe(401);
    });
});

// POST /sessoes/:id/cancelar

describe('POST /sessoes/:id/cancelar', () => {
    let sessaoId: string;
    let sessaoAluno2Id: string;

    beforeEach(async () => {
        const { sessaoId: s1 } = await dbCriarSessao(asAluno, treinoAluno1Id);
        sessaoId = s1;

        const { sessaoId: s2 } = await dbCriarSessao(asAluno2, treinoAluno2Id);
        sessaoAluno2Id = s2;
    }, 15000);

    afterEach(async () => {
        await dbDeletarSessao(sessaoId).catch(() => {});
        await dbDeletarSessao(sessaoAluno2Id).catch(() => {});
    });

    // ── Cenários felizes ──────────────────────────────────────────────────

    it('aluno cancela sessão em andamento → 200 com status CANCELADA e fim preenchido', async () => {
        asAluno();
        const res = await request(app).post(`/api/sessoes/${sessaoId}/cancelar`);

        expect(res.status).toBe(200);
        expect(res.body.data.status).toBe('CANCELADA');
        expect(res.body.data.fim).not.toBeNull();
    });

    it('admin cancela qualquer sessão → 200', async () => {
        asAdmin();
        const res = await request(app).post(`/api/sessoes/${sessaoAluno2Id}/cancelar`);

        expect(res.status).toBe(200);
        expect(res.body.data.status).toBe('CANCELADA');
    });

    it('treinador cancela sessão de aluno atribuído → 200', async () => {
        asTreinador();
        const res = await request(app).post(`/api/sessoes/${sessaoId}/cancelar`);

        expect(res.status).toBe(200);
        expect(res.body.data.status).toBe('CANCELADA');
    });

    it('aluno pode iniciar nova sessão após cancelar a anterior → 201', async () => {
        asAluno();
        await request(app).post(`/api/sessoes/${sessaoId}/cancelar`);

        asAluno();
        const res = await request(app)
            .post('/api/sessoes')
            .send({ treino_id: treinoAluno1Id });

        expect(res.status).toBe(201);
        expect(res.body.data.status).toBe('EM_ANDAMENTO');
        // Limpar a nova sessão criada
        if (res.body.data?.id && res.body.data.id !== sessaoId) {
            await dbDeletarSessao(res.body.data.id).catch(() => {});
        }
    });

    // ── Cenários tristes ──────────────────────────────────────────────────

    it('treinador cancela sessão de aluno não atribuído → 403', async () => {
        asTreinador();
        const res = await request(app).post(`/api/sessoes/${sessaoAluno2Id}/cancelar`);

        expect(res.status).toBe(403);
        expect(res.body.message).toMatch(/você não tem permissão para acessar esta sessão/i);
    });

    it('tentativa de cancelar sessão já CONCLUIDA → 409', async () => {
        await dbAlterarStatusSessao(sessaoId, 'CONCLUIDA');
        asAluno();
        const res = await request(app).post(`/api/sessoes/${sessaoId}/cancelar`);

        expect(res.status).toBe(409);
        expect(res.body.message).toMatch(/sessão já foi finalizada ou cancelada/i);
    });

    it('tentativa de cancelar sessão já CANCELADA → 409', async () => {
        await dbAlterarStatusSessao(sessaoId, 'CANCELADA');
        asAluno();
        const res = await request(app).post(`/api/sessoes/${sessaoId}/cancelar`);

        expect(res.status).toBe(409);
        expect(res.body.message).toMatch(/sessão já foi finalizada ou cancelada/i);
    });

    it('aluno cancela sessão de outro aluno → 403', async () => {
        asAluno();
        const res = await request(app).post(`/api/sessoes/${sessaoAluno2Id}/cancelar`);

        expect(res.status).toBe(403);
    });

    it('usuário sem perfil cancela sessão → 403', async () => {
        asSemPerfil();
        const res = await request(app).post(`/api/sessoes/${sessaoId}/cancelar`);

        expect(res.status).toBe(403);
        expect(res.body.message).toMatch(/perfil de acesso não autorizado/i);
    });

    it('ID inexistente → 404', async () => {
        asAdmin();
        const res = await request(app).post(`/api/sessoes/${NOT_FOUND_UUID}/cancelar`);

        expect(res.status).toBe(404);
        expect(res.body.message).toMatch(/sessão não encontrada/i);
    });

    it('ID com formato inválido → 422', async () => {
        asAdmin();
        const res = await request(app).post(`/api/sessoes/${INVALID_UUID}/cancelar`);

        expect(res.status).toBe(422);
    });

    it('sem header Authorization → 401', async () => {
        asNoAuth();
        const res = await request(app).post(`/api/sessoes/${NOT_FOUND_UUID}/cancelar`);

        expect(res.status).toBe(401);
    });
});
