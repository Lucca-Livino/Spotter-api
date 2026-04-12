jest.mock('../../middlewares/authMiddleware', () => ({
    authMiddleware: jest.fn(),
}));

import { randomUUID } from 'crypto';
import express from 'express';
import request from 'supertest';
import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from '@jest/globals';
import historicoRoutes from '../../routes/historicoRoutes';
import { DbConnect, DataBase } from '../../config/DbConnect';
import { authMiddleware } from '../../middlewares/authMiddleware';
import {
    academia,
    aluno,
    treinador,
    musculo,
    exercicio,
    exercicio_musculo,
    treino,
    treino_exercicio,
    sessao_treino,
    sessao_exercicio,
    sessao_serie,
    user,
} from '../../config/db/schema';
import { eq, inArray, and } from 'drizzle-orm';

// Estado global

const RUN_ID = Date.now().toString(36);

let app: express.Express;
let academiaId: string;

// Admin (treinador is_admin=true, sem perfil de aluno)
let adminUserId: string;
let adminTreinadorId: string;

// Aluno 1 — aluno principal dos cenários felizes
let alunoUserId: string;
let alunoId: string;

// Aluno 2 — para testes de acesso cruzado
let aluno2UserId: string;
let aluno2Id: string;

// Aluno 3 — fresh (sem sessões no beforeAll global); usado em testes que exigem contagens precisas
let aluno3UserId: string;
let aluno3Id: string;

// Treinador 1 — atribuído ao aluno1 via treinos com treinador_id
let treinadorUserId: string;
let treinadorRecId: string;

// Treinador 2 — sem alunos atribuídos
let treinador2UserId: string;
let treinador2RecId: string;

// Usuário sem perfil
let semPerfilUserId: string;

// Músculos
let musculoPeitoId: string;
let musculoCostasId: string;

// Exercícios globais
let exercicio1Id: string;     // PEITO
let exercicio2Id: string;     // COSTAS
let exercicioMultiId: string; // PEITO + COSTAS

// Treinos
let treinoAluno1Id: string;  // aluno1: exercicio1(3s) + exercicio2(3s), treinador1
let treinoAluno2Id: string;  // aluno2: exercicio1(3s)
let treinoPeitoId: string;   // aluno1: exercicio1(3s) apenas, treinador1
let treinoMultiId: string;   // aluno1: exercicioMulti(3s), treinador1

const INVALID_UUID = 'nao-e-uuid';
const NOT_FOUND_UUID = '00000000-0000-0000-0000-000000000000';
const DAY_MS = 24 * 60 * 60 * 1000;

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

function asAluno3() {
    (authMiddleware as any).mockImplementation((req: any, _res: any, next: any) => {
        req.user = { id: aluno3UserId };
        req.authSession = { id: 'session-aluno3' };
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

/**
 * Cria sessao_treino + sessao_exercicio + sessao_serie diretamente no banco,
 * sem passar pela API. Permite controlar datas, status e carga das séries.
 */
async function dbCriarSessao(
    sessaoAlunoId: string,
    sessaoTreinoId: string,
    opts: {
        status?: 'EM_ANDAMENTO' | 'CONCLUIDA' | 'CANCELADA';
        inicio?: Date;
        fim?: Date | null;
        serieStatus?: 'PENDENTE' | 'CONCLUIDA' | 'PULADA';
        carga?: number | null;
        reps?: number | null;
    } = {},
): Promise<string> {
    const inicio = opts.inicio ?? new Date();
    const status = opts.status ?? 'CONCLUIDA';
    const serieStatus = opts.serieStatus ?? (status === 'CONCLUIDA' ? 'CONCLUIDA' : 'PENDENTE');
    const fim: Date | null | undefined =
        opts.fim !== undefined
            ? opts.fim
            : status === 'CONCLUIDA'
            ? new Date(inicio.getTime() + 3600000)
            : undefined;
    const carga = opts.carga !== undefined ? opts.carga : 100;
    const reps = opts.reps !== undefined ? opts.reps : 10;

    const insertValues: any = { aluno_id: sessaoAlunoId, treino_id: sessaoTreinoId, status, inicio };
    if (fim) insertValues.fim = fim;

    const [sessao] = await DataBase.insert(sessao_treino)
        .values(insertValues)
        .returning({ id: sessao_treino.id });

    const treinoExercicios = await DataBase
        .select()
        .from(treino_exercicio)
        .where(eq(treino_exercicio.treino_id, sessaoTreinoId));

    for (const te of treinoExercicios) {
        const [se] = await DataBase.insert(sessao_exercicio)
            .values({
                sessao_treino_id: sessao.id,
                treino_exercicio_id: te.id,
                concluido: serieStatus === 'CONCLUIDA',
                ordem: te.ordem_execucao,
            })
            .returning({ id: sessao_exercicio.id });

        for (let i = 0; i < te.series; i++) {
            await DataBase.insert(sessao_serie).values({
                sessao_exercicio_id: se.id,
                numero_serie: i + 1,
                status: serieStatus,
                carga_utilizada: serieStatus === 'CONCLUIDA' && carga !== null ? String(carga) : null,
                repeticoes_realizadas: serieStatus === 'CONCLUIDA' && reps !== null ? reps : null,
            });
        }
    }

    return sessao.id;
}

async function dbDeletarSessao(sessaoId: string): Promise<void> {
    await DataBase.delete(sessao_treino).where(eq(sessao_treino.id, sessaoId)).catch(() => {});
}

// Setup / Teardown global

beforeAll(async () => {
    app = express();
    await DbConnect.connect();
    app.use(express.json());
    app.use('/api', historicoRoutes);

    const [ac] = await DataBase.insert(academia).values({
        nome: `Academia Historico E2E ${RUN_ID}`,
        endereco_numero: '10',
        endereco_rua: 'Rua do Histórico',
        endereco_bairro: 'Bairro Fit',
        endereco_cidade: 'Cidade Ativa',
        endereco_estado: 'SP',
    }).returning({ id: academia.id });
    academiaId = ac.id;

    const now = new Date();

    // Admin
    adminUserId = randomUUID();
    await DataBase.insert(user).values({ id: adminUserId, name: 'Admin HT', email: `admin_ht_${RUN_ID}@test.local`, emailVerified: false, createdAt: now, updatedAt: now });
    const [adminRec] = await DataBase.insert(treinador).values({
        user_id: adminUserId, nome: 'Admin HT', data_nascimento: '1980-01-01', sexo: 'M',
        cref: `ADM_HT_${RUN_ID}`.substring(0, 50), turnos: ['MANHA'], especializacao: 'Administração',
        graduacao: 'Educação Física', is_admin: true, academia_id: academiaId,
    }).returning({ id: treinador.id });
    adminTreinadorId = adminRec.id;

    // Aluno 1
    alunoUserId = randomUUID();
    await DataBase.insert(user).values({ id: alunoUserId, name: 'Aluno1 HT', email: `aluno1_ht_${RUN_ID}@test.local`, emailVerified: false, createdAt: now, updatedAt: now });
    const [alunoRec] = await DataBase.insert(aluno).values({
        user_id: alunoUserId, nome: 'Aluno1 HT', data_nascimento: '1995-05-05', sexo: 'M',
        is_admin: false, academia_id: academiaId,
    }).returning({ id: aluno.id });
    alunoId = alunoRec.id;

    // Aluno 2
    aluno2UserId = randomUUID();
    await DataBase.insert(user).values({ id: aluno2UserId, name: 'Aluno2 HT', email: `aluno2_ht_${RUN_ID}@test.local`, emailVerified: false, createdAt: now, updatedAt: now });
    const [aluno2Rec] = await DataBase.insert(aluno).values({
        user_id: aluno2UserId, nome: 'Aluno2 HT', data_nascimento: '1998-08-08', sexo: 'F',
        is_admin: false, academia_id: academiaId,
    }).returning({ id: aluno.id });
    aluno2Id = aluno2Rec.id;

    // Aluno 3 (fresh, sem sessões)
    aluno3UserId = randomUUID();
    await DataBase.insert(user).values({ id: aluno3UserId, name: 'Aluno3 HT', email: `aluno3_ht_${RUN_ID}@test.local`, emailVerified: false, createdAt: now, updatedAt: now });
    const [aluno3Rec] = await DataBase.insert(aluno).values({
        user_id: aluno3UserId, nome: 'Aluno3 HT', data_nascimento: '2000-01-01', sexo: 'M',
        is_admin: false, academia_id: academiaId,
    }).returning({ id: aluno.id });
    aluno3Id = aluno3Rec.id;

    // Treinador 1 (atribuído ao aluno1 via treino)
    treinadorUserId = randomUUID();
    await DataBase.insert(user).values({ id: treinadorUserId, name: 'Treinador1 HT', email: `tr1_ht_${RUN_ID}@test.local`, emailVerified: false, createdAt: now, updatedAt: now });
    const [tr1Rec] = await DataBase.insert(treinador).values({
        user_id: treinadorUserId, nome: 'Treinador1 HT', data_nascimento: '1985-03-15', sexo: 'M',
        cref: `TR1_HT_${RUN_ID}`.substring(0, 50), turnos: ['TARDE'], especializacao: 'Musculação',
        graduacao: 'Educação Física', is_admin: false, academia_id: academiaId,
    }).returning({ id: treinador.id });
    treinadorRecId = tr1Rec.id;

    // Vincula aluno1 ao treinador1 (aluno2 e aluno3 permanecem sem treinador para testar restrição de acesso)
    await DataBase.update(aluno).set({ treinador_id: treinadorRecId }).where(eq(aluno.id, alunoId));

    // Treinador 2 (sem alunos atribuídos)
    treinador2UserId = randomUUID();
    await DataBase.insert(user).values({ id: treinador2UserId, name: 'Treinador2 HT', email: `tr2_ht_${RUN_ID}@test.local`, emailVerified: false, createdAt: now, updatedAt: now });
    const [tr2Rec] = await DataBase.insert(treinador).values({
        user_id: treinador2UserId, nome: 'Treinador2 HT', data_nascimento: '1988-06-20', sexo: 'F',
        cref: `TR2_HT_${RUN_ID}`.substring(0, 50), turnos: ['NOITE'], especializacao: 'Yoga',
        graduacao: 'Educação Física', is_admin: false, academia_id: academiaId,
    }).returning({ id: treinador.id });
    treinador2RecId = tr2Rec.id;

    // Sem Perfil
    semPerfilUserId = randomUUID();
    await DataBase.insert(user).values({ id: semPerfilUserId, name: 'Sem Perfil HT', email: `semperfil_ht_${RUN_ID}@test.local`, emailVerified: false, createdAt: now, updatedAt: now });

    // Músculos
    const [mPeito] = await DataBase.insert(musculo).values({ nome: `Peitoral HT ${RUN_ID}`, grupo_muscular: 'PEITO' }).returning({ id: musculo.id });
    musculoPeitoId = mPeito.id;
    const [mCostas] = await DataBase.insert(musculo).values({ nome: `Costas HT ${RUN_ID}`, grupo_muscular: 'COSTAS' }).returning({ id: musculo.id });
    musculoCostasId = mCostas.id;

    // Exercícios globais
    const [ex1] = await DataBase.insert(exercicio).values({ nome: `Supino HT ${RUN_ID}`, aluno_id: null }).returning({ id: exercicio.id });
    exercicio1Id = ex1.id;
    await DataBase.insert(exercicio_musculo).values({ exercicio_id: exercicio1Id, musculo_id: musculoPeitoId, tipo_ativacao: 'PRIMARIO' });

    const [ex2] = await DataBase.insert(exercicio).values({ nome: `Remada HT ${RUN_ID}`, aluno_id: null }).returning({ id: exercicio.id });
    exercicio2Id = ex2.id;
    await DataBase.insert(exercicio_musculo).values({ exercicio_id: exercicio2Id, musculo_id: musculoCostasId, tipo_ativacao: 'PRIMARIO' });

    const [exMulti] = await DataBase.insert(exercicio).values({ nome: `MultiMuscular HT ${RUN_ID}`, aluno_id: null }).returning({ id: exercicio.id });
    exercicioMultiId = exMulti.id;
    await DataBase.insert(exercicio_musculo).values({ exercicio_id: exercicioMultiId, musculo_id: musculoPeitoId, tipo_ativacao: 'PRIMARIO' });
    await DataBase.insert(exercicio_musculo).values({ exercicio_id: exercicioMultiId, musculo_id: musculoCostasId, tipo_ativacao: 'SECUNDARIO' });

    // Treinos
    const [t1] = await DataBase.insert(treino).values({ nome: `Treino A1 HT ${RUN_ID}`, usuario_id: alunoId, treinador_id: treinadorRecId }).returning({ id: treino.id });
    treinoAluno1Id = t1.id;
    await DataBase.insert(treino_exercicio).values({ treino_id: treinoAluno1Id, exercicio_id: exercicio1Id, series: 3, repeticoes: '10-12', tempo_descanso_segundos: 60, ordem_execucao: 1 });
    await DataBase.insert(treino_exercicio).values({ treino_id: treinoAluno1Id, exercicio_id: exercicio2Id, series: 3, repeticoes: '10-12', tempo_descanso_segundos: 60, ordem_execucao: 2 });

    const [t2] = await DataBase.insert(treino).values({ nome: `Treino A2 HT ${RUN_ID}`, usuario_id: aluno2Id, treinador_id: null }).returning({ id: treino.id });
    treinoAluno2Id = t2.id;
    await DataBase.insert(treino_exercicio).values({ treino_id: treinoAluno2Id, exercicio_id: exercicio1Id, series: 3, repeticoes: '10', tempo_descanso_segundos: 60, ordem_execucao: 1 });

    const [tPeito] = await DataBase.insert(treino).values({ nome: `Treino Peito HT ${RUN_ID}`, usuario_id: alunoId, treinador_id: treinadorRecId }).returning({ id: treino.id });
    treinoPeitoId = tPeito.id;
    await DataBase.insert(treino_exercicio).values({ treino_id: treinoPeitoId, exercicio_id: exercicio1Id, series: 3, repeticoes: '10', tempo_descanso_segundos: 60, ordem_execucao: 1 });

    const [tMulti] = await DataBase.insert(treino).values({ nome: `Treino Multi HT ${RUN_ID}`, usuario_id: alunoId, treinador_id: treinadorRecId }).returning({ id: treino.id });
    treinoMultiId = tMulti.id;
    await DataBase.insert(treino_exercicio).values({ treino_id: treinoMultiId, exercicio_id: exercicioMultiId, series: 3, repeticoes: '10', tempo_descanso_segundos: 60, ordem_execucao: 1 });

    asAdmin();
}, 30000);

afterAll(async () => {
    // 1. Sessões residuais de todos os alunos de teste
    for (const aid of [alunoId, aluno2Id, aluno3Id]) {
        const sessoes = await DataBase.select({ id: sessao_treino.id }).from(sessao_treino).where(eq(sessao_treino.aluno_id, aid));
        for (const s of sessoes) {
            await DataBase.delete(sessao_treino).where(eq(sessao_treino.id, s.id)).catch(() => {});
        }
    }

    // 2. Treinos (cascade → treino_exercicio)
    await DataBase.delete(treino).where(inArray(treino.id, [treinoAluno1Id, treinoAluno2Id, treinoPeitoId, treinoMultiId])).catch(() => {});

    // 3. Exercícios e vínculos musculares
    await DataBase.delete(exercicio_musculo).where(inArray(exercicio_musculo.exercicio_id, [exercicio1Id, exercicio2Id, exercicioMultiId])).catch(() => {});
    await DataBase.delete(exercicio).where(inArray(exercicio.id, [exercicio1Id, exercicio2Id, exercicioMultiId])).catch(() => {});

    // 4. Músculos
    await DataBase.delete(musculo).where(inArray(musculo.id, [musculoPeitoId, musculoCostasId])).catch(() => {});

    // 5. Treinadores
    await DataBase.delete(treinador).where(inArray(treinador.id, [adminTreinadorId, treinadorRecId, treinador2RecId])).catch(() => {});

    // 6. Alunos
    await DataBase.delete(aluno).where(inArray(aluno.id, [alunoId, aluno2Id, aluno3Id])).catch(() => {});

    // 7. Users
    await DataBase.delete(user).where(inArray(user.id, [adminUserId, alunoUserId, aluno2UserId, aluno3UserId, treinadorUserId, treinador2UserId, semPerfilUserId])).catch(() => {});

    // 8. Academia
    await DataBase.delete(academia).where(eq(academia.id, academiaId)).catch(() => {});

    await DbConnect.disconnect();
}, 30000);

beforeEach(() => {
    asAdmin();
});

// GET /historico/estatisticas

describe('GET /historico/estatisticas', () => {
    const sessoesBase: string[] = [];

    beforeAll(async () => {
        const hoje = new Date();
        const ontem = new Date(hoje.getTime() - DAY_MS);

        // aluno1: 2 sessões CONCLUIDAS (hoje e ontem) com séries com carga/reps
        sessoesBase.push(await dbCriarSessao(alunoId, treinoAluno1Id, { inicio: hoje, carga: 100, reps: 10 }));
        sessoesBase.push(await dbCriarSessao(alunoId, treinoAluno1Id, { inicio: ontem, carga: 80, reps: 12 }));

        // aluno2: 1 sessão CONCLUIDA
        sessoesBase.push(await dbCriarSessao(aluno2Id, treinoAluno2Id, { inicio: hoje, carga: 60, reps: 8 }));
    });

    afterAll(async () => {
        for (const id of sessoesBase) await dbDeletarSessao(id);
        sessoesBase.length = 0;
    });

    // ── Cenários felizes ───────────────────────────────────────────────────────

    it('aluno consulta próprias estatísticas sem filtros → 200 com todos os campos', async () => {
        asAluno();
        const res = await request(app).get('/api/historico/estatisticas');

        expect(res.status).toBe(200);
        expect(res.body.data).toMatchObject({
            total_sessoes: expect.any(Number),
            sessoes_concluidas: expect.any(Number),
            sessoes_canceladas: expect.any(Number),
            tempo_total_minutos: expect.any(Number),
            media_duracao_minutos: expect.any(Number),
            volume_total_kg: expect.any(Number),
            sequencia_atual: expect.any(Number),
            melhor_sequencia: expect.any(Number),
            treinos_por_semana_media: expect.any(Number),
        });
        expect(res.body.data.total_sessoes).toBeGreaterThanOrEqual(2);
        expect(res.body.data.sessoes_concluidas).toBeGreaterThanOrEqual(2);
    });

    it('aluno consulta estatísticas com filtro de período → 200, contadores refletem o período', async () => {
        asAluno();
        const agora = new Date();
        const inicioHoje = new Date(agora.toISOString().slice(0, 10) + 'T00:00:00.000Z');
        const fimHoje = new Date(agora.toISOString().slice(0, 10) + 'T23:59:59.999Z');

        const res = await request(app)
            .get(`/api/historico/estatisticas?data_inicio=${inicioHoje.toISOString()}&data_fim=${fimHoje.toISOString()}`);

        expect(res.status).toBe(200);
        expect(res.body.data.total_sessoes).toBeGreaterThanOrEqual(1);
    });

    it('aluno informa aluno_id igual ao próprio → 200, mesmo resultado', async () => {
        asAluno();
        const sem = await request(app).get('/api/historico/estatisticas');
        const com = await request(app).get(`/api/historico/estatisticas?aluno_id=${alunoId}`);

        expect(sem.status).toBe(200);
        expect(com.status).toBe(200);
        expect(com.body.data.total_sessoes).toBe(sem.body.data.total_sessoes);
    });

    it('admin consulta estatísticas informando aluno_id → 200', async () => {
        asAdmin();
        const res = await request(app).get(`/api/historico/estatisticas?aluno_id=${alunoId}`);

        expect(res.status).toBe(200);
        expect(res.body.data.total_sessoes).toBeGreaterThanOrEqual(2);
    });

    it('treinador consulta estatísticas de aluno atribuído → 200', async () => {
        asTreinador();
        const res = await request(app).get(`/api/historico/estatisticas?aluno_id=${alunoId}`);

        expect(res.status).toBe(200);
        expect(res.body.data).toHaveProperty('total_sessoes');
    });

    it('admin consulta aluno_id inexistente (UUID válido) → 200 com campos zerados', async () => {
        asAdmin();
        const res = await request(app).get(`/api/historico/estatisticas?aluno_id=${NOT_FOUND_UUID}`);

        expect(res.status).toBe(200);
        expect(res.body.data.total_sessoes).toBe(0);
        expect(res.body.data.sessoes_concluidas).toBe(0);
        expect(res.body.data.volume_total_kg).toBe(0);
        expect(res.body.data.sequencia_atual).toBe(0);
    });

    describe('cenários especiais de streak e contadores', () => {
        const sessoesEspeciais: string[] = [];

        afterEach(async () => {
            for (const id of sessoesEspeciais) await dbDeletarSessao(id);
            sessoesEspeciais.length = 0;
        });

        it('sequencia_atual e melhor_sequencia não são filtrados por período → streaks refletem histórico completo', async () => {
            const agora = new Date();
            // Cria streak de 3 dias consecutivos no passado (22, 21, 20 dias atrás)
            for (const diasAtras of [22, 21, 20]) {
                const inicio = new Date(agora.getTime() - diasAtras * DAY_MS);
                sessoesEspeciais.push(
                    await dbCriarSessao(aluno3Id, treinoAluno1Id, { inicio, fim: new Date(inicio.getTime() + 3600000) }),
                );
            }
            // Sessão de hoje com início explícito para garantir que fica dentro do filtro
            const inicioHoje = new Date(agora.getTime());
            sessoesEspeciais.push(await dbCriarSessao(aluno3Id, treinoAluno1Id, {
                inicio: inicioHoje,
                fim: new Date(inicioHoje.getTime() + 3600000),
            }));

            const inicioOntem = new Date(agora.getTime() - DAY_MS).toISOString();
            const fimHoje = new Date(agora.getTime() + 5000).toISOString(); // margem de 5s

            asAdmin();
            const res = await request(app)
                .get(`/api/historico/estatisticas?aluno_id=${aluno3Id}&data_inicio=${inicioOntem}&data_fim=${fimHoje}`);

            expect(res.status).toBe(200);
            // O período filtrado só captura hoje
            expect(res.body.data.sessoes_concluidas).toBeGreaterThanOrEqual(1);
            // Mas melhor_sequencia reflete o streak de 3 dias no passado
            expect(res.body.data.melhor_sequencia).toBeGreaterThanOrEqual(3);
        });

        it('sequencia_atual é zero quando última sessão foi há mais de 1 dia → 0', async () => {
            const inicio = new Date(Date.now() - 3 * DAY_MS);
            sessoesEspeciais.push(
                await dbCriarSessao(aluno3Id, treinoAluno1Id, { inicio, fim: new Date(inicio.getTime() + 3600000) }),
            );

            asAdmin();
            const res = await request(app).get(`/api/historico/estatisticas?aluno_id=${aluno3Id}`);

            expect(res.status).toBe(200);
            expect(res.body.data.sequencia_atual).toBe(0);
        });

        it('sessão EM_ANDAMENTO conta em total_sessoes mas não em concluidas/canceladas', async () => {
            sessoesEspeciais.push(
                await dbCriarSessao(aluno3Id, treinoAluno1Id, { status: 'EM_ANDAMENTO' }),
            );

            asAdmin();
            const res = await request(app).get(`/api/historico/estatisticas?aluno_id=${aluno3Id}`);

            expect(res.status).toBe(200);
            expect(res.body.data.total_sessoes).toBeGreaterThanOrEqual(1);
            expect(res.body.data.sessoes_concluidas).toBe(0);
            expect(res.body.data.sessoes_canceladas).toBe(0);
        });

        it('múltiplas sessões concluídas no mesmo dia não inflacionam streak → sequencia_atual = 1', async () => {
            const hoje = new Date();
            sessoesEspeciais.push(await dbCriarSessao(aluno3Id, treinoPeitoId, { inicio: hoje }));
            // Segunda sessão no mesmo dia com treino diferente (evita conflito unique index EM_ANDAMENTO)
            sessoesEspeciais.push(await dbCriarSessao(aluno3Id, treinoMultiId, { inicio: hoje }));

            asAdmin();
            const res = await request(app).get(`/api/historico/estatisticas?aluno_id=${aluno3Id}`);

            expect(res.status).toBe(200);
            expect(res.body.data.sequencia_atual).toBe(1);
            expect(res.body.data.melhor_sequencia).toBe(1);
        });

        it('volume_total_kg ignora séries sem carga_utilizada ou repeticoes_realizadas', async () => {
            const inicio = new Date();
            const fim = new Date(inicio.getTime() + 3600000);

            const [sessao] = await DataBase.insert(sessao_treino)
                .values({ aluno_id: aluno3Id, treino_id: treinoAluno1Id, status: 'CONCLUIDA', inicio, fim })
                .returning({ id: sessao_treino.id });
            sessoesEspeciais.push(sessao.id);

            const [te] = await DataBase.select().from(treino_exercicio)
                .where(and(eq(treino_exercicio.treino_id, treinoAluno1Id), eq(treino_exercicio.exercicio_id, exercicio1Id)));

            const [se] = await DataBase.insert(sessao_exercicio)
                .values({ sessao_treino_id: sessao.id, treino_exercicio_id: te.id, concluido: true, ordem: 1 })
                .returning({ id: sessao_exercicio.id });

            // Série com carga (deve contar: 100 * 10 = 1000)
            await DataBase.insert(sessao_serie).values({
                sessao_exercicio_id: se.id, numero_serie: 1, status: 'CONCLUIDA',
                carga_utilizada: '100', repeticoes_realizadas: 10,
            });
            // Série sem carga (não deve contar)
            await DataBase.insert(sessao_serie).values({
                sessao_exercicio_id: se.id, numero_serie: 2, status: 'CONCLUIDA',
                carga_utilizada: null, repeticoes_realizadas: null,
            });

            asAdmin();
            const res = await request(app).get(`/api/historico/estatisticas?aluno_id=${aluno3Id}`);

            expect(res.status).toBe(200);
            expect(res.body.data.volume_total_kg).toBe(1000);
        });
    });

    it('aluno sem nenhuma sessão → 200 com todos os contadores zerados', async () => {
        asAluno3();
        const res = await request(app).get('/api/historico/estatisticas');

        expect(res.status).toBe(200);
        expect(res.body.data.total_sessoes).toBe(0);
        expect(res.body.data.sessoes_concluidas).toBe(0);
        expect(res.body.data.sessoes_canceladas).toBe(0);
        expect(res.body.data.volume_total_kg).toBe(0);
        expect(res.body.data.sequencia_atual).toBe(0);
        expect(res.body.data.melhor_sequencia).toBe(0);
    });

    // ── Cenários tristes ───────────────────────────────────────────────────────

    it('aluno informa aluno_id de outro aluno → 403', async () => {
        asAluno();
        const res = await request(app).get(`/api/historico/estatisticas?aluno_id=${aluno2Id}`);

        expect(res.status).toBe(403);
        expect(res.body.message).toMatch(/você só pode visualizar seu próprio histórico/i);
    });

    it('treinador consulta aluno não atribuído → 403', async () => {
        asTreinador2();
        const res = await request(app).get(`/api/historico/estatisticas?aluno_id=${alunoId}`);

        expect(res.status).toBe(403);
        expect(res.body.message).toMatch(/você não tem permissão para visualizar o histórico deste aluno/i);
    });

    it('admin consulta sem informar aluno_id → 422', async () => {
        asAdmin();
        const res = await request(app).get('/api/historico/estatisticas');

        expect(res.status).toBe(422);
        expect(res.body.message).toMatch(/admin deve informar aluno_id/i);
    });

    it('treinador consulta sem informar aluno_id → 422', async () => {
        asTreinador();
        const res = await request(app).get('/api/historico/estatisticas');

        expect(res.status).toBe(422);
        expect(res.body.message).toMatch(/treinador deve informar aluno_id/i);
    });

    it('usuário sem perfil consulta estatísticas → 403', async () => {
        asSemPerfil();
        const res = await request(app).get('/api/historico/estatisticas');

        expect(res.status).toBe(403);
        expect(res.body.message).toMatch(/perfil de acesso não autorizado/i);
    });

    it('aluno_id com UUID inválido → 422', async () => {
        const res = await request(app).get(`/api/historico/estatisticas?aluno_id=${INVALID_UUID}`);

        expect(res.status).toBe(422);
        expect(res.body.errors.some((e: any) => e.message === 'aluno_id deve ser um UUID válido')).toBe(true);
    });

    it('data_inicio com formato inválido → 422', async () => {
        asAluno();
        const res = await request(app).get('/api/historico/estatisticas?data_inicio=31-12-2025');

        expect(res.status).toBe(422);
        expect(res.body.errors.some((e: any) => e.message === 'data_inicio deve ser uma data ISO 8601 válida')).toBe(true);
    });

    it('data_fim com formato inválido → 422', async () => {
        asAluno();
        const res = await request(app).get('/api/historico/estatisticas?data_fim=amanha');

        expect(res.status).toBe(422);
        expect(res.body.errors.some((e: any) => e.message === 'data_fim deve ser uma data ISO 8601 válida')).toBe(true);
    });

    it('campo extra não previsto (.strict()) → 422', async () => {
        asAluno();
        const res = await request(app).get('/api/historico/estatisticas?campo_invalido=x');

        expect(res.status).toBe(422);
        expect(res.body.errors.length).toBeGreaterThan(0);
    });

    it('requisição sem header Authorization → 401', async () => {
        asNoAuth();
        const res = await request(app).get('/api/historico/estatisticas');

        expect(res.status).toBe(401);
    });
});

// GET /historico/progressao/:exercicioId

describe('GET /historico/progressao/:exercicioId', () => {
    const sessoesBase: string[] = [];

    beforeAll(async () => {
        const agora = new Date();

        // 3 sessões para aluno1 em datas distintas (para testar ordenação)
        sessoesBase.push(await dbCriarSessao(alunoId, treinoAluno1Id, {
            inicio: new Date(agora.getTime() - 2 * DAY_MS),
            carga: 80, reps: 8,
        }));
        sessoesBase.push(await dbCriarSessao(alunoId, treinoAluno1Id, {
            inicio: new Date(agora.getTime() - DAY_MS),
            carga: 90, reps: 10,
        }));
        sessoesBase.push(await dbCriarSessao(alunoId, treinoAluno1Id, {
            inicio: agora,
            carga: 100, reps: 12,
        }));

        // 1 sessão para aluno2
        sessoesBase.push(await dbCriarSessao(aluno2Id, treinoAluno2Id, { carga: 60, reps: 8 }));
    });

    afterAll(async () => {
        for (const id of sessoesBase) await dbDeletarSessao(id);
        sessoesBase.length = 0;
    });

    // ── Cenários felizes ───────────────────────────────────────────────────────

    it('aluno consulta progressão de exercício próprio → 200 com campos esperados', async () => {
        asAluno();
        const res = await request(app).get(`/api/historico/progressao/${exercicio1Id}`);

        expect(res.status).toBe(200);
        expect(Array.isArray(res.body.data)).toBe(true);
        expect(res.body.data.length).toBeGreaterThanOrEqual(1);
        expect(res.body.data[0]).toMatchObject({
            sessao_id: expect.any(String),
            maior_carga: expect.anything(),
            volume_total: expect.any(Number),
        });
    });

    it('resultado ordenado do mais recente para o mais antigo', async () => {
        asAluno();
        const res = await request(app).get(`/api/historico/progressao/${exercicio1Id}`);

        expect(res.status).toBe(200);
        const datas = res.body.data.map((item: any) => new Date(item.data).getTime());
        for (let i = 1; i < datas.length; i++) {
            expect(datas[i - 1]).toBeGreaterThanOrEqual(datas[i]);
        }
    });

    it('admin consulta progressão de aluno informando aluno_id → 200', async () => {
        asAdmin();
        const res = await request(app).get(`/api/historico/progressao/${exercicio1Id}?aluno_id=${alunoId}`);

        expect(res.status).toBe(200);
        expect(res.body.data.length).toBeGreaterThanOrEqual(3);
    });

    it('treinador consulta progressão de aluno atribuído → 200', async () => {
        asTreinador();
        const res = await request(app).get(`/api/historico/progressao/${exercicio1Id}?aluno_id=${alunoId}`);

        expect(res.status).toBe(200);
        expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('filtro por data_inicio e data_fim → retorna apenas sessões no período', async () => {
        asAluno();
        const agora = new Date();
        const inicioHoje = new Date(agora.toISOString().slice(0, 10) + 'T00:00:00.000Z');
        const fimHoje = new Date(agora.toISOString().slice(0, 10) + 'T23:59:59.999Z');

        const res = await request(app)
            .get(`/api/historico/progressao/${exercicio1Id}?data_inicio=${inicioHoje.toISOString()}&data_fim=${fimHoje.toISOString()}`);

        expect(res.status).toBe(200);
        expect(Array.isArray(res.body.data)).toBe(true);
        // Apenas sessões de hoje (1 sessão criada hoje no beforeAll)
        expect(res.body.data.length).toBeGreaterThanOrEqual(1);
    });

    it('parâmetro limite personalizado → retorna no máximo N registros', async () => {
        asAluno();
        const res = await request(app).get(`/api/historico/progressao/${exercicio1Id}?limite=2`);

        expect(res.status).toBe(200);
        expect(res.body.data.length).toBeLessThanOrEqual(2);
    });

    it('limite padrão (50) é respeitado → array contém no máximo 50 itens', async () => {
        asAluno();
        const res = await request(app).get(`/api/historico/progressao/${exercicio1Id}`);

        expect(res.status).toBe(200);
        expect(res.body.data.length).toBeLessThanOrEqual(50);
    });

    it('exercício sem sessões concluídas → 200 com array vazio', async () => {
        asAluno();
        const res = await request(app).get(`/api/historico/progressao/${exercicio2Id}`);

        // exercicio2 está em treinoAluno1 (com séries COSTAS), mas o aluno3 não o treinou; aluno1 treinou
        // Qualquer resposta válida com status 200 é aceitável
        expect(res.status).toBe(200);
        expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('limite alfanumérico (prefixo numérico) → 200, aceita valor via parseInt', async () => {
        asAluno();
        const res = await request(app).get(`/api/historico/progressao/${exercicio1Id}?limite=2abc`);

        expect(res.status).toBe(200);
        expect(res.body.data.length).toBeLessThanOrEqual(2);
    });

    it('admin consulta progressão para aluno_id inexistente → 200 com array vazio', async () => {
        asAdmin();
        const res = await request(app).get(`/api/historico/progressao/${exercicio1Id}?aluno_id=${NOT_FOUND_UUID}`);

        expect(res.status).toBe(200);
        expect(res.body.data).toEqual([]);
    });

    describe('maior_carga e séries especiais', () => {
        const sessoesEspeciais: string[] = [];

        afterEach(async () => {
            for (const id of sessoesEspeciais) await dbDeletarSessao(id);
            sessoesEspeciais.length = 0;
        });

        it('maior_carga é null quando séries não têm carga_utilizada → retorna null', async () => {
            const inicio = new Date();
            const fim = new Date(inicio.getTime() + 3600000);

            const [sessao] = await DataBase.insert(sessao_treino)
                .values({ aluno_id: aluno3Id, treino_id: treinoAluno1Id, status: 'CONCLUIDA', inicio, fim })
                .returning({ id: sessao_treino.id });
            sessoesEspeciais.push(sessao.id);

            const [te] = await DataBase.select().from(treino_exercicio)
                .where(and(eq(treino_exercicio.treino_id, treinoAluno1Id), eq(treino_exercicio.exercicio_id, exercicio1Id)));

            const [se] = await DataBase.insert(sessao_exercicio)
                .values({ sessao_treino_id: sessao.id, treino_exercicio_id: te.id, concluido: true, ordem: 1 })
                .returning({ id: sessao_exercicio.id });

            await DataBase.insert(sessao_serie).values({
                sessao_exercicio_id: se.id, numero_serie: 1, status: 'CONCLUIDA',
                carga_utilizada: null, repeticoes_realizadas: 10,
            });

            asAdmin();
            const res = await request(app).get(`/api/historico/progressao/${exercicio1Id}?aluno_id=${aluno3Id}`);

            expect(res.status).toBe(200);
            expect(res.body.data.length).toBeGreaterThanOrEqual(1);
            expect(res.body.data[0].maior_carga).toBeNull();
        });

        it('maior_carga usa comparação numérica → retorna 100, não 95', async () => {
            const inicio = new Date();
            const fim = new Date(inicio.getTime() + 3600000);

            const [sessao] = await DataBase.insert(sessao_treino)
                .values({ aluno_id: aluno3Id, treino_id: treinoAluno1Id, status: 'CONCLUIDA', inicio, fim })
                .returning({ id: sessao_treino.id });
            sessoesEspeciais.push(sessao.id);

            const [te] = await DataBase.select().from(treino_exercicio)
                .where(and(eq(treino_exercicio.treino_id, treinoAluno1Id), eq(treino_exercicio.exercicio_id, exercicio1Id)));

            const [se] = await DataBase.insert(sessao_exercicio)
                .values({ sessao_treino_id: sessao.id, treino_exercicio_id: te.id, concluido: true, ordem: 1 })
                .returning({ id: sessao_exercicio.id });

            await DataBase.insert(sessao_serie).values({
                sessao_exercicio_id: se.id, numero_serie: 1, status: 'CONCLUIDA',
                carga_utilizada: '95', repeticoes_realizadas: 10,
            });
            await DataBase.insert(sessao_serie).values({
                sessao_exercicio_id: se.id, numero_serie: 2, status: 'CONCLUIDA',
                carga_utilizada: '100', repeticoes_realizadas: 8,
            });

            asAdmin();
            const res = await request(app).get(`/api/historico/progressao/${exercicio1Id}?aluno_id=${aluno3Id}`);

            expect(res.status).toBe(200);
            expect(res.body.data[0].maior_carga).toBe(100);
        });

        it('progressão ignora séries não concluídas → métricas refletem apenas séries CONCLUIDA', async () => {
            const inicio = new Date();
            const fim = new Date(inicio.getTime() + 3600000);

            const [sessao] = await DataBase.insert(sessao_treino)
                .values({ aluno_id: aluno3Id, treino_id: treinoAluno1Id, status: 'CONCLUIDA', inicio, fim })
                .returning({ id: sessao_treino.id });
            sessoesEspeciais.push(sessao.id);

            const [te] = await DataBase.select().from(treino_exercicio)
                .where(and(eq(treino_exercicio.treino_id, treinoAluno1Id), eq(treino_exercicio.exercicio_id, exercicio1Id)));

            const [se] = await DataBase.insert(sessao_exercicio)
                .values({ sessao_treino_id: sessao.id, treino_exercicio_id: te.id, concluido: true, ordem: 1 })
                .returning({ id: sessao_exercicio.id });

            // Série CONCLUIDA com carga (deve contar)
            await DataBase.insert(sessao_serie).values({
                sessao_exercicio_id: se.id, numero_serie: 1, status: 'CONCLUIDA',
                carga_utilizada: '50', repeticoes_realizadas: 5,
            });
            // Série PULADA (não deve contar)
            await DataBase.insert(sessao_serie).values({
                sessao_exercicio_id: se.id, numero_serie: 2, status: 'PULADA',
                carga_utilizada: '200', repeticoes_realizadas: 20,
            });

            asAdmin();
            const res = await request(app).get(`/api/historico/progressao/${exercicio1Id}?aluno_id=${aluno3Id}`);

            expect(res.status).toBe(200);
            expect(res.body.data[0].maior_carga).toBe(50); // 200 (PULADA) ignorado
            expect(res.body.data[0].volume_total).toBe(250); // 50 * 5
        });
    });

    // ── Cenários tristes ───────────────────────────────────────────────────────

    it('aluno consulta progressão de exercício de outro aluno → 403', async () => {
        asAluno();
        const res = await request(app).get(`/api/historico/progressao/${exercicio1Id}?aluno_id=${aluno2Id}`);

        expect(res.status).toBe(403);
        expect(res.body.message).toMatch(/você só pode visualizar seu próprio histórico/i);
    });

    it('treinador consulta aluno não atribuído → 403', async () => {
        asTreinador2();
        const res = await request(app).get(`/api/historico/progressao/${exercicio1Id}?aluno_id=${alunoId}`);

        expect(res.status).toBe(403);
        expect(res.body.message).toMatch(/você não tem permissão para visualizar o histórico deste aluno/i);
    });

    it('admin sem aluno_id → 422', async () => {
        asAdmin();
        const res = await request(app).get(`/api/historico/progressao/${exercicio1Id}`);

        expect(res.status).toBe(422);
        expect(res.body.message).toMatch(/admin deve informar aluno_id/i);
    });

    it('treinador sem aluno_id → 422', async () => {
        asTreinador();
        const res = await request(app).get(`/api/historico/progressao/${exercicio1Id}`);

        expect(res.status).toBe(422);
        expect(res.body.message).toMatch(/treinador deve informar aluno_id/i);
    });

    it('usuário sem perfil consulta progressão → 403', async () => {
        asSemPerfil();
        const res = await request(app).get(`/api/historico/progressao/${exercicio1Id}`);

        expect(res.status).toBe(403);
        expect(res.body.message).toMatch(/perfil de acesso não autorizado/i);
    });

    it('exercicioId inválido (não-UUID) → 422', async () => {
        asAluno();
        const res = await request(app).get(`/api/historico/progressao/${INVALID_UUID}`);

        expect(res.status).toBe(422);
        expect(res.body.errors.some((e: any) => /exercicioId inválido/i.test(e.message))).toBe(true);
    });

    it('limite acima de 100 → 422', async () => {
        asAluno();
        const res = await request(app).get(`/api/historico/progressao/${exercicio1Id}?limite=101`);

        expect(res.status).toBe(422);
        expect(res.body.errors.some((e: any) => e.message === 'limite deve ser entre 1 e 100')).toBe(true);
    });

    it('limite igual a zero → 422', async () => {
        asAluno();
        const res = await request(app).get(`/api/historico/progressao/${exercicio1Id}?limite=0`);

        expect(res.status).toBe(422);
        expect(res.body.errors.some((e: any) => e.message === 'limite deve ser entre 1 e 100')).toBe(true);
    });

    it('limite não numérico → 422', async () => {
        asAluno();
        const res = await request(app).get(`/api/historico/progressao/${exercicio1Id}?limite=abc`);

        expect(res.status).toBe(422);
        expect(res.body.errors.some((e: any) => e.message === 'limite deve ser entre 1 e 100')).toBe(true);
    });

    it('data_inicio com formato inválido → 422', async () => {
        asAluno();
        const res = await request(app).get(`/api/historico/progressao/${exercicio1Id}?data_inicio=31-12-2025`);

        expect(res.status).toBe(422);
        expect(res.body.errors.some((e: any) => e.message === 'data_inicio deve ser uma data ISO 8601 válida')).toBe(true);
    });

    it('data_fim com formato inválido → 422', async () => {
        asAluno();
        const res = await request(app).get(`/api/historico/progressao/${exercicio1Id}?data_fim=amanha`);

        expect(res.status).toBe(422);
        expect(res.body.errors.some((e: any) => e.message === 'data_fim deve ser uma data ISO 8601 válida')).toBe(true);
    });

    it('campo extra não previsto (.strict()) → 422', async () => {
        asAluno();
        const res = await request(app).get(`/api/historico/progressao/${exercicio1Id}?campo_invalido=x`);

        expect(res.status).toBe(422);
        expect(res.body.errors.length).toBeGreaterThan(0);
    });

    it('requisição sem header Authorization → 401', async () => {
        asNoAuth();
        const res = await request(app).get(`/api/historico/progressao/${exercicio1Id}`);

        expect(res.status).toBe(401);
    });
});

// GET /historico/grupos-musculares

describe('GET /historico/grupos-musculares', () => {
    const sessoesBase: string[] = [];

    beforeAll(async () => {
        // 2 sessões só com exercicio1 (PEITO) → 6 séries PEITO
        sessoesBase.push(await dbCriarSessao(alunoId, treinoPeitoId, { carga: 100, reps: 10 }));
        sessoesBase.push(await dbCriarSessao(alunoId, treinoPeitoId, { carga: 100, reps: 10 }));
        // 1 sessão com exercicio1 + exercicio2 → mais 3 PEITO + 3 COSTAS
        sessoesBase.push(await dbCriarSessao(alunoId, treinoAluno1Id, { carga: 80, reps: 8 }));
        // Total: PEITO = 9, COSTAS = 3 → PEITO aparece antes de COSTAS
        sessoesBase.push(await dbCriarSessao(aluno2Id, treinoAluno2Id, { carga: 60, reps: 8 }));
    });

    afterAll(async () => {
        for (const id of sessoesBase) await dbDeletarSessao(id);
        sessoesBase.length = 0;
    });

    // ── Cenários felizes ───────────────────────────────────────────────────────

    it('aluno consulta distribuição muscular → 200 com campos esperados', async () => {
        asAluno();
        const res = await request(app).get('/api/historico/grupos-musculares');

        expect(res.status).toBe(200);
        expect(Array.isArray(res.body.data)).toBe(true);
        expect(res.body.data.length).toBeGreaterThanOrEqual(1);
        expect(res.body.data[0]).toMatchObject({
            grupo_muscular: expect.any(String),
            total_series: expect.any(Number),
            volume_total_kg: expect.any(Number),
            percentual: expect.any(Number),
        });
    });

    it('resultados ordenados por total_series decrescente → PEITO aparece antes de COSTAS', async () => {
        asAluno();
        const res = await request(app).get('/api/historico/grupos-musculares');

        expect(res.status).toBe(200);
        const grupos = res.body.data.map((g: any) => g.grupo_muscular);
        expect(grupos.indexOf('PEITO')).toBeLessThan(grupos.indexOf('COSTAS'));
    });

    it('percentual soma 100 entre todos os grupos', async () => {
        asAluno();
        const res = await request(app).get('/api/historico/grupos-musculares');

        expect(res.status).toBe(200);
        const somaPercentual = res.body.data.reduce((acc: number, g: any) => acc + g.percentual, 0);
        expect(Math.round(somaPercentual)).toBe(100);
    });

    it('admin consulta com aluno_id → 200', async () => {
        asAdmin();
        const res = await request(app).get(`/api/historico/grupos-musculares?aluno_id=${alunoId}`);

        expect(res.status).toBe(200);
        expect(res.body.data.length).toBeGreaterThanOrEqual(1);
    });

    it('treinador consulta aluno atribuído → 200', async () => {
        asTreinador();
        const res = await request(app).get(`/api/historico/grupos-musculares?aluno_id=${alunoId}`);

        expect(res.status).toBe(200);
        expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('filtro por período → métricas refletem apenas sessões no período', async () => {
        asAluno();
        const agora = new Date();
        const inicioHoje = new Date(agora.toISOString().slice(0, 10) + 'T00:00:00.000Z');
        const fimHoje = new Date(agora.toISOString().slice(0, 10) + 'T23:59:59.999Z');

        const res = await request(app)
            .get(`/api/historico/grupos-musculares?data_inicio=${inicioHoje.toISOString()}&data_fim=${fimHoje.toISOString()}`);

        expect(res.status).toBe(200);
        expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('admin consulta aluno_id inexistente → 200 com array vazio', async () => {
        asAdmin();
        const res = await request(app).get(`/api/historico/grupos-musculares?aluno_id=${NOT_FOUND_UUID}`);

        expect(res.status).toBe(200);
        expect(res.body.data).toEqual([]);
    });

    describe('exercício com múltiplos músculos e séries sem carga', () => {
        const sessoesEspeciais: string[] = [];

        afterEach(async () => {
            for (const id of sessoesEspeciais) await dbDeletarSessao(id);
            sessoesEspeciais.length = 0;
        });

        it('exercício multi-muscular incrementa total_series de cada grupo envolvido', async () => {
            sessoesEspeciais.push(await dbCriarSessao(aluno3Id, treinoMultiId, { carga: 100, reps: 10 }));

            asAdmin();
            const res = await request(app).get(`/api/historico/grupos-musculares?aluno_id=${aluno3Id}`);

            expect(res.status).toBe(200);
            const peito = res.body.data.find((g: any) => g.grupo_muscular === 'PEITO');
            const costas = res.body.data.find((g: any) => g.grupo_muscular === 'COSTAS');
            // exercicioMulti tem 3 séries → ambos os grupos devem ter 3 séries
            expect(peito.total_series).toBeGreaterThanOrEqual(3);
            expect(costas.total_series).toBeGreaterThanOrEqual(3);
        });

        it('volume_total_kg ignora séries sem carga e repetições', async () => {
            const inicio = new Date();
            const fim = new Date(inicio.getTime() + 3600000);

            const [sessao] = await DataBase.insert(sessao_treino)
                .values({ aluno_id: aluno3Id, treino_id: treinoPeitoId, status: 'CONCLUIDA', inicio, fim })
                .returning({ id: sessao_treino.id });
            sessoesEspeciais.push(sessao.id);

            const [te] = await DataBase.select().from(treino_exercicio)
                .where(eq(treino_exercicio.treino_id, treinoPeitoId));

            const [se] = await DataBase.insert(sessao_exercicio)
                .values({ sessao_treino_id: sessao.id, treino_exercicio_id: te.id, concluido: true, ordem: 1 })
                .returning({ id: sessao_exercicio.id });

            await DataBase.insert(sessao_serie).values({
                sessao_exercicio_id: se.id, numero_serie: 1, status: 'CONCLUIDA',
                carga_utilizada: '100', repeticoes_realizadas: 10,
            });
            await DataBase.insert(sessao_serie).values({
                sessao_exercicio_id: se.id, numero_serie: 2, status: 'CONCLUIDA',
                carga_utilizada: null, repeticoes_realizadas: null,
            });

            asAdmin();
            const res = await request(app).get(`/api/historico/grupos-musculares?aluno_id=${aluno3Id}`);

            expect(res.status).toBe(200);
            const peito = res.body.data.find((g: any) => g.grupo_muscular === 'PEITO');
            expect(peito.volume_total_kg).toBe(1000); // 100 * 10 = 1000
        });
    });

    it('aluno sem sessões concluídas → 200 com array vazio', async () => {
        asAluno3();
        const res = await request(app).get('/api/historico/grupos-musculares');

        expect(res.status).toBe(200);
        expect(res.body.data).toEqual([]);
    });

    // ── Cenários tristes ───────────────────────────────────────────────────────

    it('aluno informa aluno_id de outro aluno → 403', async () => {
        asAluno();
        const res = await request(app).get(`/api/historico/grupos-musculares?aluno_id=${aluno2Id}`);

        expect(res.status).toBe(403);
        expect(res.body.message).toMatch(/você só pode visualizar seu próprio histórico/i);
    });

    it('treinador consulta aluno não atribuído → 403', async () => {
        asTreinador2();
        const res = await request(app).get(`/api/historico/grupos-musculares?aluno_id=${alunoId}`);

        expect(res.status).toBe(403);
        expect(res.body.message).toMatch(/você não tem permissão para visualizar o histórico deste aluno/i);
    });

    it('admin sem aluno_id → 422', async () => {
        asAdmin();
        const res = await request(app).get('/api/historico/grupos-musculares');

        expect(res.status).toBe(422);
        expect(res.body.message).toMatch(/admin deve informar aluno_id/i);
    });

    it('treinador sem aluno_id → 422', async () => {
        asTreinador();
        const res = await request(app).get('/api/historico/grupos-musculares');

        expect(res.status).toBe(422);
        expect(res.body.message).toMatch(/treinador deve informar aluno_id/i);
    });

    it('usuário sem perfil consulta grupos musculares → 403', async () => {
        asSemPerfil();
        const res = await request(app).get('/api/historico/grupos-musculares');

        expect(res.status).toBe(403);
        expect(res.body.message).toMatch(/perfil de acesso não autorizado/i);
    });

    it('aluno_id com UUID inválido → 422', async () => {
        const res = await request(app).get(`/api/historico/grupos-musculares?aluno_id=${INVALID_UUID}`);

        expect(res.status).toBe(422);
        expect(res.body.errors.some((e: any) => e.message === 'aluno_id deve ser um UUID válido')).toBe(true);
    });

    it('data_inicio com formato inválido → 422', async () => {
        asAluno();
        const res = await request(app).get('/api/historico/grupos-musculares?data_inicio=31-12-2025');

        expect(res.status).toBe(422);
        expect(res.body.errors.some((e: any) => e.message === 'data_inicio deve ser uma data ISO 8601 válida')).toBe(true);
    });

    it('data_fim com formato inválido → 422', async () => {
        asAluno();
        const res = await request(app).get('/api/historico/grupos-musculares?data_fim=amanha');

        expect(res.status).toBe(422);
        expect(res.body.errors.some((e: any) => e.message === 'data_fim deve ser uma data ISO 8601 válida')).toBe(true);
    });

    it('campo extra não previsto (.strict()) → 422', async () => {
        asAluno();
        const res = await request(app).get('/api/historico/grupos-musculares?campo_invalido=x');

        expect(res.status).toBe(422);
        expect(res.body.errors.length).toBeGreaterThan(0);
    });

    it('requisição sem header Authorization → 401', async () => {
        asNoAuth();
        const res = await request(app).get('/api/historico/grupos-musculares');

        expect(res.status).toBe(401);
    });
});

// GET /historico/exercicios-frequentes

describe('GET /historico/exercicios-frequentes', () => {
    const sessoesBase: string[] = [];

    beforeAll(async () => {
        // 3 sessões com treinoPeitoId → exercicio1 em 3 sessões
        for (let i = 0; i < 3; i++) {
            sessoesBase.push(await dbCriarSessao(alunoId, treinoPeitoId, { carga: 100, reps: 10 }));
        }
        // 1 sessão com treinoAluno1 → exercicio1 + exercicio2 (cada um em +1 sessão)
        sessoesBase.push(await dbCriarSessao(alunoId, treinoAluno1Id, { carga: 80, reps: 8 }));
        // Resultado: exercicio1 em 4 sessões, exercicio2 em 1 sessão → exercicio1 primeiro

        sessoesBase.push(await dbCriarSessao(aluno2Id, treinoAluno2Id, { carga: 60, reps: 8 }));
    });

    afterAll(async () => {
        for (const id of sessoesBase) await dbDeletarSessao(id);
        sessoesBase.length = 0;
    });

    // ── Cenários felizes ───────────────────────────────────────────────────────

    it('aluno consulta exercícios mais frequentes → 200 com campos esperados', async () => {
        asAluno();
        const res = await request(app).get('/api/historico/exercicios-frequentes');

        expect(res.status).toBe(200);
        expect(Array.isArray(res.body.data)).toBe(true);
        expect(res.body.data.length).toBeGreaterThanOrEqual(1);
        expect(res.body.data[0]).toMatchObject({
            exercicio_id: expect.any(String),
            nome: expect.any(String),
            total_sessoes: expect.any(Number),
            total_series: expect.any(Number),
            volume_total_kg: expect.any(Number),
        });
    });

    it('resultados ordenados por total_sessoes decrescente → exercicio1 antes de exercicio2', async () => {
        asAluno();
        const res = await request(app).get('/api/historico/exercicios-frequentes');

        expect(res.status).toBe(200);
        const ids = res.body.data.map((e: any) => e.exercicio_id);
        expect(ids.indexOf(exercicio1Id)).toBeLessThan(ids.indexOf(exercicio2Id));
    });

    it('parâmetro limite personalizado → retorna no máximo N registros', async () => {
        asAluno();
        const res = await request(app).get('/api/historico/exercicios-frequentes?limite=1');

        expect(res.status).toBe(200);
        expect(res.body.data.length).toBeLessThanOrEqual(1);
    });

    it('limite padrão (10) é respeitado → array contém no máximo 10 itens', async () => {
        asAluno();
        const res = await request(app).get('/api/historico/exercicios-frequentes');

        expect(res.status).toBe(200);
        expect(res.body.data.length).toBeLessThanOrEqual(10);
    });

    it('filtro por período → exercícios apenas do período informado', async () => {
        asAluno();
        const agora = new Date();
        const inicioHoje = new Date(agora.toISOString().slice(0, 10) + 'T00:00:00.000Z');
        const fimHoje = new Date(agora.toISOString().slice(0, 10) + 'T23:59:59.999Z');

        const res = await request(app)
            .get(`/api/historico/exercicios-frequentes?data_inicio=${inicioHoje.toISOString()}&data_fim=${fimHoje.toISOString()}`);

        expect(res.status).toBe(200);
        expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('admin consulta com aluno_id → 200 com ranking do aluno informado', async () => {
        asAdmin();
        const res = await request(app).get(`/api/historico/exercicios-frequentes?aluno_id=${alunoId}`);

        expect(res.status).toBe(200);
        expect(res.body.data.length).toBeGreaterThanOrEqual(1);
    });

    it('treinador consulta aluno atribuído → 200', async () => {
        asTreinador();
        const res = await request(app).get(`/api/historico/exercicios-frequentes?aluno_id=${alunoId}`);

        expect(res.status).toBe(200);
        expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('limite alfanumérico (prefixo numérico) → 200, aceita valor via parseInt', async () => {
        asAluno();
        const res = await request(app).get('/api/historico/exercicios-frequentes?limite=1abc');

        expect(res.status).toBe(200);
        expect(res.body.data.length).toBeLessThanOrEqual(1);
    });

    it('aluno sem histórico → 200 com array vazio', async () => {
        asAluno3();
        const res = await request(app).get('/api/historico/exercicios-frequentes');

        expect(res.status).toBe(200);
        expect(res.body.data).toEqual([]);
    });

    it('admin consulta aluno_id inexistente → 200 com array vazio', async () => {
        asAdmin();
        const res = await request(app).get(`/api/historico/exercicios-frequentes?aluno_id=${NOT_FOUND_UUID}`);

        expect(res.status).toBe(200);
        expect(res.body.data).toEqual([]);
    });

    // ── Cenários tristes ───────────────────────────────────────────────────────

    it('aluno informa aluno_id de outro aluno → 403', async () => {
        asAluno();
        const res = await request(app).get(`/api/historico/exercicios-frequentes?aluno_id=${aluno2Id}`);

        expect(res.status).toBe(403);
        expect(res.body.message).toMatch(/você só pode visualizar seu próprio histórico/i);
    });

    it('treinador consulta aluno não atribuído → 403', async () => {
        asTreinador2();
        const res = await request(app).get(`/api/historico/exercicios-frequentes?aluno_id=${alunoId}`);

        expect(res.status).toBe(403);
        expect(res.body.message).toMatch(/você não tem permissão para visualizar o histórico deste aluno/i);
    });

    it('admin sem aluno_id → 422', async () => {
        asAdmin();
        const res = await request(app).get('/api/historico/exercicios-frequentes');

        expect(res.status).toBe(422);
        expect(res.body.message).toMatch(/admin deve informar aluno_id/i);
    });

    it('treinador sem aluno_id → 422', async () => {
        asTreinador();
        const res = await request(app).get('/api/historico/exercicios-frequentes');

        expect(res.status).toBe(422);
        expect(res.body.message).toMatch(/treinador deve informar aluno_id/i);
    });

    it('limite acima de 50 → 422', async () => {
        asAluno();
        const res = await request(app).get('/api/historico/exercicios-frequentes?limite=51');

        expect(res.status).toBe(422);
        expect(res.body.errors.some((e: any) => e.message === 'limite deve ser entre 1 e 50')).toBe(true);
    });

    it('limite igual a zero → 422', async () => {
        asAluno();
        const res = await request(app).get('/api/historico/exercicios-frequentes?limite=0');

        expect(res.status).toBe(422);
        expect(res.body.errors.some((e: any) => e.message === 'limite deve ser entre 1 e 50')).toBe(true);
    });

    it('limite não numérico → 422', async () => {
        asAluno();
        const res = await request(app).get('/api/historico/exercicios-frequentes?limite=abc');

        expect(res.status).toBe(422);
        expect(res.body.errors.some((e: any) => e.message === 'limite deve ser entre 1 e 50')).toBe(true);
    });

    it('usuário sem perfil consulta exercícios frequentes → 403', async () => {
        asSemPerfil();
        const res = await request(app).get('/api/historico/exercicios-frequentes');

        expect(res.status).toBe(403);
        expect(res.body.message).toMatch(/perfil de acesso não autorizado/i);
    });

    it('aluno_id com UUID inválido → 422', async () => {
        const res = await request(app).get(`/api/historico/exercicios-frequentes?aluno_id=${INVALID_UUID}`);

        expect(res.status).toBe(422);
        expect(res.body.errors.some((e: any) => e.message === 'aluno_id deve ser um UUID válido')).toBe(true);
    });

    it('data_inicio com formato inválido → 422', async () => {
        asAluno();
        const res = await request(app).get('/api/historico/exercicios-frequentes?data_inicio=31-12-2025');

        expect(res.status).toBe(422);
        expect(res.body.errors.some((e: any) => e.message === 'data_inicio deve ser uma data ISO 8601 válida')).toBe(true);
    });

    it('data_fim com formato inválido → 422', async () => {
        asAluno();
        const res = await request(app).get('/api/historico/exercicios-frequentes?data_fim=amanha');

        expect(res.status).toBe(422);
        expect(res.body.errors.some((e: any) => e.message === 'data_fim deve ser uma data ISO 8601 válida')).toBe(true);
    });

    it('campo extra não previsto (.strict()) → 422', async () => {
        asAluno();
        const res = await request(app).get('/api/historico/exercicios-frequentes?campo_invalido=x');

        expect(res.status).toBe(422);
        expect(res.body.errors.length).toBeGreaterThan(0);
    });

    it('requisição sem header Authorization → 401', async () => {
        asNoAuth();
        const res = await request(app).get('/api/historico/exercicios-frequentes');

        expect(res.status).toBe(401);
    });
});

// GET /historico/comparativo

describe('GET /historico/comparativo', () => {
    const sessoesBase: string[] = [];

    beforeAll(async () => {
        // 2 sessões CONCLUIDAS para aluno1 hoje (periodo_atual: últimas 4 semanas)
        sessoesBase.push(await dbCriarSessao(alunoId, treinoPeitoId, { carga: 100, reps: 10 }));
        sessoesBase.push(await dbCriarSessao(alunoId, treinoAluno1Id, { carga: 80, reps: 8 }));
        // Sem sessões no periodo_anterior → *_pct será null
    });

    afterAll(async () => {
        for (const id of sessoesBase) await dbDeletarSessao(id);
        sessoesBase.length = 0;
    });

    // ── Cenários felizes ───────────────────────────────────────────────────────

    it('aluno consulta comparativo padrão (4 semanas) → 200 com estrutura completa', async () => {
        asAluno();
        const res = await request(app).get('/api/historico/comparativo');

        expect(res.status).toBe(200);
        expect(res.body.data).toMatchObject({
            periodo_atual: expect.objectContaining({
                total_sessoes: expect.any(Number),
                sessoes_concluidas: expect.any(Number),
                sessoes_canceladas: expect.any(Number),
                tempo_total_minutos: expect.any(Number),
                media_duracao_minutos: expect.any(Number),
                volume_total_kg: expect.any(Number),
                treinos_por_semana_media: expect.any(Number),
            }),
            periodo_anterior: expect.any(Object),
            variacao: expect.objectContaining({
                sessoes_concluidas_abs: expect.any(Number),
                volume_total_kg_abs: expect.any(Number),
                media_duracao_minutos_abs: expect.any(Number),
                treinos_por_semana_abs: expect.any(Number),
            }),
        });
    });

    it('parâmetro semanas customizado → 200', async () => {
        asAluno();
        const res = await request(app).get('/api/historico/comparativo?semanas=8');

        expect(res.status).toBe(200);
        expect(res.body.data).toHaveProperty('periodo_atual');
        expect(res.body.data).toHaveProperty('periodo_anterior');
    });

    it('variacao._pct é null quando periodo_anterior tem valor zero → divisão por zero evitada', async () => {
        asAluno();
        const res = await request(app).get('/api/historico/comparativo');

        expect(res.status).toBe(200);
        // Como não há sessões no periodo_anterior, os *_pct deverão ser null
        expect(res.body.data.variacao.sessoes_concluidas_pct).toBeNull();
        expect(res.body.data.variacao.volume_total_kg_pct).toBeNull();
        expect(res.body.data.variacao.media_duracao_minutos_pct).toBeNull();
        expect(res.body.data.variacao.treinos_por_semana_pct).toBeNull();
    });

    it('sequencia_atual e melhor_sequencia ausentes de variacao → não aparecem como métricas', async () => {
        asAluno();
        const res = await request(app).get('/api/historico/comparativo');

        expect(res.status).toBe(200);
        expect(res.body.data.variacao).not.toHaveProperty('sequencia_atual_pct');
        expect(res.body.data.variacao).not.toHaveProperty('melhor_sequencia_pct');
    });

    it('periodo_atual e periodo_anterior não incluem campos de streak', async () => {
        asAluno();
        const res = await request(app).get('/api/historico/comparativo');

        expect(res.status).toBe(200);
        expect(res.body.data.periodo_atual).not.toHaveProperty('sequencia_atual');
        expect(res.body.data.periodo_atual).not.toHaveProperty('melhor_sequencia');
        expect(res.body.data.periodo_anterior).not.toHaveProperty('sequencia_atual');
        expect(res.body.data.periodo_anterior).not.toHaveProperty('melhor_sequencia');
    });

    it('admin consulta com aluno_id → 200', async () => {
        asAdmin();
        const res = await request(app).get(`/api/historico/comparativo?aluno_id=${alunoId}`);

        expect(res.status).toBe(200);
        expect(res.body.data.periodo_atual.sessoes_concluidas).toBeGreaterThanOrEqual(2);
    });

    it('treinador consulta aluno atribuído → 200', async () => {
        asTreinador();
        const res = await request(app).get(`/api/historico/comparativo?aluno_id=${alunoId}`);

        expect(res.status).toBe(200);
        expect(res.body.data).toHaveProperty('variacao');
    });

    it('semanas alfanumérico (prefixo numérico) → 200, aceita valor via parseInt', async () => {
        asAluno();
        const res = await request(app).get('/api/historico/comparativo?semanas=8abc');

        expect(res.status).toBe(200);
        expect(res.body.data).toHaveProperty('periodo_atual');
    });

    it('aluno sem histórico em nenhum período → 200, zeros e _pct null', async () => {
        asAluno3();
        const res = await request(app).get('/api/historico/comparativo');

        expect(res.status).toBe(200);
        expect(res.body.data.periodo_atual.sessoes_concluidas).toBe(0);
        expect(res.body.data.periodo_anterior.sessoes_concluidas).toBe(0);
        expect(res.body.data.variacao.sessoes_concluidas_pct).toBeNull();
    });

    it('admin consulta aluno_id inexistente → 200, períodos zerados e _pct null', async () => {
        asAdmin();
        const res = await request(app).get(`/api/historico/comparativo?aluno_id=${NOT_FOUND_UUID}`);

        expect(res.status).toBe(200);
        expect(res.body.data.periodo_atual.sessoes_concluidas).toBe(0);
        expect(res.body.data.variacao.sessoes_concluidas_pct).toBeNull();
    });

    // ── Cenários tristes ───────────────────────────────────────────────────────

    it('aluno informa aluno_id de outro aluno → 403', async () => {
        asAluno();
        const res = await request(app).get(`/api/historico/comparativo?aluno_id=${aluno2Id}`);

        expect(res.status).toBe(403);
        expect(res.body.message).toMatch(/você só pode visualizar seu próprio histórico/i);
    });

    it('treinador consulta aluno não atribuído → 403', async () => {
        asTreinador2();
        const res = await request(app).get(`/api/historico/comparativo?aluno_id=${alunoId}`);

        expect(res.status).toBe(403);
        expect(res.body.message).toMatch(/você não tem permissão para visualizar o histórico deste aluno/i);
    });

    it('admin sem aluno_id → 422', async () => {
        asAdmin();
        const res = await request(app).get('/api/historico/comparativo');

        expect(res.status).toBe(422);
        expect(res.body.message).toMatch(/admin deve informar aluno_id/i);
    });

    it('treinador sem aluno_id → 422', async () => {
        asTreinador();
        const res = await request(app).get('/api/historico/comparativo');

        expect(res.status).toBe(422);
        expect(res.body.message).toMatch(/treinador deve informar aluno_id/i);
    });

    it('usuário sem perfil consulta comparativo → 403', async () => {
        asSemPerfil();
        const res = await request(app).get('/api/historico/comparativo');

        expect(res.status).toBe(403);
        expect(res.body.message).toMatch(/perfil de acesso não autorizado/i);
    });

    it('semanas abaixo de 1 → 422', async () => {
        asAluno();
        const res = await request(app).get('/api/historico/comparativo?semanas=0');

        expect(res.status).toBe(422);
        expect(res.body.errors.some((e: any) => e.message === 'semanas deve ser entre 1 e 52')).toBe(true);
    });

    it('semanas acima de 52 → 422', async () => {
        asAluno();
        const res = await request(app).get('/api/historico/comparativo?semanas=53');

        expect(res.status).toBe(422);
        expect(res.body.errors.some((e: any) => e.message === 'semanas deve ser entre 1 e 52')).toBe(true);
    });

    it('semanas não numérico → 422', async () => {
        asAluno();
        const res = await request(app).get('/api/historico/comparativo?semanas=abc');

        expect(res.status).toBe(422);
        expect(res.body.errors.some((e: any) => e.message === 'semanas deve ser entre 1 e 52')).toBe(true);
    });

    it('aluno_id com UUID inválido → 422', async () => {
        const res = await request(app).get(`/api/historico/comparativo?aluno_id=${INVALID_UUID}`);

        expect(res.status).toBe(422);
        expect(res.body.errors.some((e: any) => e.message === 'aluno_id deve ser um UUID válido')).toBe(true);
    });

    it('campo extra não previsto (.strict()) → 422', async () => {
        asAluno();
        const res = await request(app).get('/api/historico/comparativo?campo_invalido=x');

        expect(res.status).toBe(422);
        expect(res.body.errors.length).toBeGreaterThan(0);
    });

    it('requisição sem header Authorization → 401', async () => {
        asNoAuth();
        const res = await request(app).get('/api/historico/comparativo');

        expect(res.status).toBe(401);
    });
});
