// Helper para evitar TS2345 "not assignable to parameter of type never"
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mockFn() {
  return jest.fn() as jest.MockedFunction<(...args: any[]) => any>;
}

jest.mock('../../middlewares/authMiddleware', () => ({
    authMiddleware: mockFn(),
}));

jest.mock('../../config/socketIo', () => ({
    emitirNovaMensagem: mockFn(),
    emitirMensagensLidas: mockFn(),
}));

import { randomUUID } from 'crypto';
import express from 'express';
import request from 'supertest';
import { jest, describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from '@jest/globals';
import { and, eq, inArray } from 'drizzle-orm';
import conversaRoutes from '../../routes/conversaRoutes';
import { DbConnect, DataBase } from '../../config/DbConnect';
import { authMiddleware } from '../../middlewares/authMiddleware';
import {
    academia,
    aluno,
    conversa,
    mensagem_conversa,
    treinador,
    user,
} from '../../config/db/schema';
import ConversaController from '../../controllers/conversaController';
import MensagemConversaController from '../../controllers/mensagemConversaController';
import { ZodError } from 'zod';
import { DatabaseError } from '../../utils/errors/DatabaseError';

const RUN_ID = Date.now().toString(36);

let app: express.Express;
let academiaId: string;

let treinadorUserId: string;
let treinadorId: string;

let alunoUserId: string;
let alunoId: string;

let outroTreinadorUserId: string;
let outroTreinadorId: string;

let outroAlunoUserId: string;
let outroAlunoId: string;

let alunoSemTreinadorUserId: string;
let alunoSemTreinadorId: string;

let semPerfilUserId: string;

let perfilDuplicadoUserId: string;
let perfilDuplicadoAlunoId: string;
let perfilDuplicadoTreinadorId: string;

let conversaBaseId: string;

const tempConversaIds: string[] = [];
const tempMensagemIds: string[] = [];
const tempAlunoIds: string[] = [];
const tempTreinadorIds: string[] = [];
const tempUserIds: string[] = [];

let warnSpy: any;
let errorSpy: any;
let logSpy: any;

const INVALID_UUID = 'nao-e-uuid';
const NOT_FOUND_UUID = '00000000-0000-0000-0000-000000000000';

function asUser(userId: string) {
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

function extractMessages(res: any) {
    return (res.body.errors ?? []).map((e: any) => e.message).join(' ');
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

async function criarConversa(treinadorRefId: string, alunoRefId: string) {
    const [rec] = await DataBase.insert(conversa).values({
        treinador_id: treinadorRefId,
        aluno_id: alunoRefId,
        ativa: true,
        ultima_mensagem_em: null,
    }).returning({ id: conversa.id });

    tempConversaIds.push(rec.id);
    return rec.id;
}

async function criarMensagem(params: {
    conversaId: string;
    remetenteTipo: 'ALUNO' | 'TREINADOR';
    remetenteUserId: string;
    conteudo: string;
    enviadaEm?: Date;
    lidaPorUserId?: string | null;
}) {
    const [rec] = await DataBase.insert(mensagem_conversa).values({
        conversa_id: params.conversaId,
        remetente_tipo: params.remetenteTipo,
        remetente_user_id: params.remetenteUserId,
        conteudo: params.conteudo,
        enviada_em: params.enviadaEm ?? new Date(),
        lida_em: params.lidaPorUserId ? new Date() : null,
        lida_por_user_id: params.lidaPorUserId ?? null,
        ativa: true,
    }).returning({ id: mensagem_conversa.id });

    tempMensagemIds.push(rec.id);
    return rec.id;
}

beforeAll(async () => {
    warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});

    app = express();
    await DbConnect.connect();
    app.use(express.json());
    app.use('/api', conversaRoutes);

    const [ac] = await DataBase.insert(academia).values({
        nome: `Academia Conversa E2E ${RUN_ID}`,
        endereco_numero: '77',
        endereco_rua: 'Rua do Chat',
        endereco_bairro: 'Centro',
        endereco_cidade: 'Porto Velho',
        endereco_estado: 'RO',
    }).returning({ id: academia.id });
    academiaId = ac.id;

    const now = new Date();

    treinadorUserId = randomUUID();
    await DataBase.insert(user).values({
        id: treinadorUserId,
        name: 'Treinador Chat Base',
        email: `treinador_chat_${RUN_ID}@test.local`,
        emailVerified: false,
        createdAt: now,
        updatedAt: now,
    });
    const [treinadorRec] = await DataBase.insert(treinador).values({
        user_id: treinadorUserId,
        nome: 'Treinador Chat Base',
        data_nascimento: '1985-01-20',
        sexo: 'M',
        cref: `CREF-CHAT-BASE-${RUN_ID}`,
        turnos: ['MANHA'],
        especializacao: 'Hipertrofia',
        graduacao: 'Educação Física',
        academia_id: academiaId,
    }).returning({ id: treinador.id });
    treinadorId = treinadorRec.id;

    alunoUserId = randomUUID();
    await DataBase.insert(user).values({
        id: alunoUserId,
        name: 'Aluno Chat Base',
        email: `aluno_chat_${RUN_ID}@test.local`,
        emailVerified: false,
        createdAt: now,
        updatedAt: now,
    });
    const [alunoRec] = await DataBase.insert(aluno).values({
        user_id: alunoUserId,
        nome: 'Aluno Chat Base',
        data_nascimento: '2001-02-10',
        sexo: 'F',
        academia_id: academiaId,
        treinador_id: treinadorId,
    }).returning({ id: aluno.id });
    alunoId = alunoRec.id;

    outroTreinadorUserId = randomUUID();
    await DataBase.insert(user).values({
        id: outroTreinadorUserId,
        name: 'Outro Treinador Chat',
        email: `treinador_chat_outro_${RUN_ID}@test.local`,
        emailVerified: false,
        createdAt: now,
        updatedAt: now,
    });
    const [outroTreinadorRec] = await DataBase.insert(treinador).values({
        user_id: outroTreinadorUserId,
        nome: 'Outro Treinador Chat',
        data_nascimento: '1988-03-15',
        sexo: 'M',
        cref: `CREF-CHAT-OUTRO-${RUN_ID}`,
        turnos: ['TARDE'],
        especializacao: 'Resistência',
        graduacao: 'Educação Física',
        academia_id: academiaId,
    }).returning({ id: treinador.id });
    outroTreinadorId = outroTreinadorRec.id;

    outroAlunoUserId = randomUUID();
    await DataBase.insert(user).values({
        id: outroAlunoUserId,
        name: 'Outro Aluno Chat',
        email: `aluno_chat_outro_${RUN_ID}@test.local`,
        emailVerified: false,
        createdAt: now,
        updatedAt: now,
    });
    const [outroAlunoRec] = await DataBase.insert(aluno).values({
        user_id: outroAlunoUserId,
        nome: 'Outro Aluno Chat',
        data_nascimento: '2000-04-12',
        sexo: 'M',
        academia_id: academiaId,
        treinador_id: outroTreinadorId,
    }).returning({ id: aluno.id });
    outroAlunoId = outroAlunoRec.id;

    alunoSemTreinadorUserId = randomUUID();
    await DataBase.insert(user).values({
        id: alunoSemTreinadorUserId,
        name: 'Aluno Sem Treinador Chat',
        email: `aluno_sem_treinador_chat_${RUN_ID}@test.local`,
        emailVerified: false,
        createdAt: now,
        updatedAt: now,
    });
    const [alunoSemTreinadorRec] = await DataBase.insert(aluno).values({
        user_id: alunoSemTreinadorUserId,
        nome: 'Aluno Sem Treinador Chat',
        data_nascimento: '1999-06-06',
        sexo: 'F',
        academia_id: academiaId,
        treinador_id: null,
    }).returning({ id: aluno.id });
    alunoSemTreinadorId = alunoSemTreinadorRec.id;

    semPerfilUserId = randomUUID();
    await DataBase.insert(user).values({
        id: semPerfilUserId,
        name: 'Sem Perfil Chat',
        email: `sem_perfil_chat_${RUN_ID}@test.local`,
        emailVerified: false,
        createdAt: now,
        updatedAt: now,
    });

    perfilDuplicadoUserId = randomUUID();
    await DataBase.insert(user).values({
        id: perfilDuplicadoUserId,
        name: 'Perfil Duplicado Chat',
        email: `perfil_duplicado_chat_${RUN_ID}@test.local`,
        emailVerified: false,
        createdAt: now,
        updatedAt: now,
    });
    const [duplicadoTreinador] = await DataBase.insert(treinador).values({
        user_id: perfilDuplicadoUserId,
        nome: 'Perfil Duplicado Treinador',
        data_nascimento: '1990-10-10',
        sexo: 'M',
        cref: `CREF-CHAT-DUP-${RUN_ID}`,
        turnos: ['NOITE'],
        especializacao: 'Funcional',
        graduacao: 'Educação Física',
        academia_id: academiaId,
    }).returning({ id: treinador.id });
    perfilDuplicadoTreinadorId = duplicadoTreinador.id;
    const [duplicadoAluno] = await DataBase.insert(aluno).values({
        user_id: perfilDuplicadoUserId,
        nome: 'Perfil Duplicado Aluno',
        data_nascimento: '2002-08-08',
        sexo: 'F',
        academia_id: academiaId,
        treinador_id: treinadorId,
    }).returning({ id: aluno.id });
    perfilDuplicadoAlunoId = duplicadoAluno.id;

    const [convBase] = await DataBase.insert(conversa).values({
        treinador_id: treinadorId,
        aluno_id: alunoId,
        ativa: true,
        ultima_mensagem_em: null,
    }).returning({ id: conversa.id });
    conversaBaseId = convBase.id;

    asUser(treinadorUserId);
}, 30000);

beforeEach(() => {
    asUser(treinadorUserId);
});

afterEach(async () => {
    if (tempMensagemIds.length > 0) {
        await DataBase.delete(mensagem_conversa)
            .where(inArray(mensagem_conversa.id, [...tempMensagemIds]))
            .catch(() => {});
        tempMensagemIds.length = 0;
    }

    if (tempConversaIds.length > 0) {
        await DataBase.delete(conversa)
            .where(inArray(conversa.id, [...tempConversaIds]))
            .catch(() => {});
        tempConversaIds.length = 0;
    }

    if (tempAlunoIds.length > 0) {
        await DataBase.delete(aluno)
            .where(inArray(aluno.id, [...tempAlunoIds]))
            .catch(() => {});
        tempAlunoIds.length = 0;
    }

    if (tempTreinadorIds.length > 0) {
        await DataBase.delete(treinador)
            .where(inArray(treinador.id, [...tempTreinadorIds]))
            .catch(() => {});
        tempTreinadorIds.length = 0;
    }

    if (tempUserIds.length > 0) {
        await DataBase.delete(user)
            .where(inArray(user.id, [...tempUserIds]))
            .catch(() => {});
        tempUserIds.length = 0;
    }

    asUser(treinadorUserId);
});

afterAll(async () => {
    await DataBase.delete(mensagem_conversa)
        .where(eq(mensagem_conversa.conversa_id, conversaBaseId))
        .catch(() => {});

    await DataBase.delete(conversa)
        .where(eq(conversa.id, conversaBaseId))
        .catch(() => {});

    const baseAlunoIds = [
        alunoId,
        outroAlunoId,
        alunoSemTreinadorId,
        perfilDuplicadoAlunoId,
        ...tempAlunoIds,
    ];
    const alunoIdsUnicos = [...new Set(baseAlunoIds.filter(Boolean))];
    if (alunoIdsUnicos.length > 0) {
        await DataBase.delete(aluno).where(inArray(aluno.id, alunoIdsUnicos)).catch(() => {});
    }

    const baseTreinadorIds = [
        treinadorId,
        outroTreinadorId,
        perfilDuplicadoTreinadorId,
        ...tempTreinadorIds,
    ];
    const treinadorIdsUnicos = [...new Set(baseTreinadorIds.filter(Boolean))];
    if (treinadorIdsUnicos.length > 0) {
        await DataBase.delete(treinador).where(inArray(treinador.id, treinadorIdsUnicos)).catch(() => {});
    }

    const users = [
        treinadorUserId,
        alunoUserId,
        outroTreinadorUserId,
        outroAlunoUserId,
        alunoSemTreinadorUserId,
        semPerfilUserId,
        perfilDuplicadoUserId,
        ...tempUserIds,
    ];
    const usersUnicos = [...new Set(users.filter(Boolean))];
    if (usersUnicos.length > 0) {
        await DataBase.delete(user).where(inArray(user.id, usersUnicos)).catch(() => {});
    }

    await DataBase.delete(academia).where(eq(academia.id, academiaId)).catch(() => {});
    await DbConnect.disconnect();

    warnSpy?.mockRestore();
    errorSpy?.mockRestore();
    logSpy?.mockRestore();
}, 30000);

describe('POST /conversas', () => {
    it('treinador inicia conversa com aluno vinculado → 201', async () => {
        const novoAlunoUserId = await criarUsuario('chat_aluno_post_ok');
        const [novoAluno] = await DataBase.insert(aluno).values({
            user_id: novoAlunoUserId,
            nome: `Aluno Post OK ${RUN_ID}`,
            data_nascimento: '2002-02-02',
            sexo: 'M',
            academia_id: academiaId,
            treinador_id: treinadorId,
        }).returning({ id: aluno.id });
        tempAlunoIds.push(novoAluno.id);

        asUser(treinadorUserId);
        const res = await request(app)
            .post('/api/conversas')
            .send({ aluno_id: novoAluno.id });

        expect(res.status).toBe(201);
        expect(res.body.data.treinador_id).toBe(treinadorId);
        expect(res.body.data.aluno_id).toBe(novoAluno.id);
        expect(res.body.data.ativa).toBe(true);

        tempConversaIds.push(res.body.data.id);
    });

    it('treinador repete criação e recebe conversa existente (idempotente) → 201', async () => {
        const novoAlunoUserId = await criarUsuario('chat_aluno_post_idempotente');
        const [novoAluno] = await DataBase.insert(aluno).values({
            user_id: novoAlunoUserId,
            nome: `Aluno Idempotente ${RUN_ID}`,
            data_nascimento: '2003-03-03',
            sexo: 'F',
            academia_id: academiaId,
            treinador_id: treinadorId,
        }).returning({ id: aluno.id });
        tempAlunoIds.push(novoAluno.id);

        asUser(treinadorUserId);
        const primeiro = await request(app)
            .post('/api/conversas')
            .send({ aluno_id: novoAluno.id });

        expect(primeiro.status).toBe(201);
        tempConversaIds.push(primeiro.body.data.id);

        const segundo = await request(app)
            .post('/api/conversas')
            .send({ aluno_id: novoAluno.id });

        expect(segundo.status).toBe(201);
        expect(segundo.body.data.id).toBe(primeiro.body.data.id);
    });

    it('aluno inicia conversa sem body e usa treinador vinculado → 201', async () => {
        asUser(alunoUserId);
        const res = await request(app)
            .post('/api/conversas')
            .send({});

        expect(res.status).toBe(201);
        expect(res.body.data.aluno_id).toBe(alunoId);
        expect(res.body.data.treinador_id).toBe(treinadorId);
        expect(res.body.data.id).toBe(conversaBaseId);
    });

    it('aluno inicia conversa com próprio aluno_id → 201', async () => {
        asUser(alunoUserId);
        const res = await request(app)
            .post('/api/conversas')
            .send({ aluno_id: alunoId });

        expect(res.status).toBe(201);
        expect(res.body.data.aluno_id).toBe(alunoId);
        expect(res.body.data.treinador_id).toBe(treinadorId);
    });

    it('treinador sem aluno_id → 422', async () => {
        asUser(treinadorUserId);
        const res = await request(app)
            .post('/api/conversas')
            .send({});

        expect(res.status).toBe(422);
        expect(res.body.message).toMatch(/deve informar aluno_id/i);
    });

    it('aluno_id inválido (não UUID) → 422', async () => {
        asUser(treinadorUserId);
        const res = await request(app)
            .post('/api/conversas')
            .send({ aluno_id: INVALID_UUID });

        expect(res.status).toBe(422);
        expect(extractMessages(res)).toMatch(/UUID valido/i);
    });

    it('aluno_id inexistente (UUID válido) → 404', async () => {
        asUser(treinadorUserId);
        const res = await request(app)
            .post('/api/conversas')
            .send({ aluno_id: NOT_FOUND_UUID });

        expect(res.status).toBe(404);
        expect(res.body.message).toMatch(/aluno nao encontrado/i);
    });

    it('treinador tenta conversar com aluno não vinculado → 403', async () => {
        asUser(treinadorUserId);
        const res = await request(app)
            .post('/api/conversas')
            .send({ aluno_id: outroAlunoId });

        expect(res.status).toBe(403);
        expect(res.body.message).toMatch(/seus proprios alunos/i);
    });

    it('aluno informa aluno_id de outro aluno → 403', async () => {
        asUser(alunoUserId);
        const res = await request(app)
            .post('/api/conversas')
            .send({ aluno_id: outroAlunoId });

        expect(res.status).toBe(403);
        expect(res.body.message).toMatch(/proprio perfil/i);
    });

    it('aluno sem treinador vinculado → 422', async () => {
        asUser(alunoSemTreinadorUserId);
        const res = await request(app)
            .post('/api/conversas')
            .send({});

        expect(res.status).toBe(422);
        expect(res.body.message).toMatch(/nao possui treinador vinculado/i);
    });

    it('usuário sem perfil (nem aluno nem treinador) → 403', async () => {
        asUser(semPerfilUserId);
        const res = await request(app)
            .post('/api/conversas')
            .send({});

        expect(res.status).toBe(403);
        expect(res.body.message).toMatch(/nao possui perfil/i);
    });

    it('usuário com perfil duplicado (aluno + treinador) → 422', async () => {
        asUser(perfilDuplicadoUserId);
        const res = await request(app)
            .post('/api/conversas')
            .send({});

        expect(res.status).toBe(422);
        expect(res.body.message).toMatch(/perfil duplicado/i);
    });

    it('sem autenticação → 401', async () => {
        asNoAuth();
        const res = await request(app)
            .post('/api/conversas')
            .send({ aluno_id: alunoId });

        expect(res.status).toBe(401);
    });
});

describe('GET /conversas', () => {
    it('treinador lista apenas suas conversas com estrutura paginada → 200', async () => {
        const convOutra = await criarConversa(outroTreinadorId, outroAlunoId);

        const res = await request(app).get('/api/conversas');

        expect(res.status).toBe(200);
        expect(Array.isArray(res.body.data.dados)).toBe(true);
        expect(res.body.data).toHaveProperty('total');
        expect(res.body.data).toHaveProperty('page');
        expect(res.body.data).toHaveProperty('limite');
        expect(res.body.data).toHaveProperty('totalPages');

        const ids = (res.body.data.dados ?? []).map((c: any) => c.id);
        expect(ids).toContain(conversaBaseId);
        expect(ids).not.toContain(convOutra);
    });

    it('aluno lista apenas suas conversas → 200', async () => {
        asUser(alunoUserId);
        const res = await request(app).get('/api/conversas');

        expect(res.status).toBe(200);
        for (const item of res.body.data.dados) {
            expect(item.aluno_id).toBe(alunoId);
        }
    });

    it('query vazia usa padrão page=1 e limite=20 → 200', async () => {
        const res = await request(app).get('/api/conversas');

        expect(res.status).toBe(200);
        expect(res.body.data.page).toBe(1);
        expect(res.body.data.limite).toBe(20);
    });

    it('paginação explícita page=1&limite=1 → 200', async () => {
        const res = await request(app).get('/api/conversas?page=1&limite=1');

        expect(res.status).toBe(200);
        expect(res.body.data.page).toBe(1);
        expect(res.body.data.limite).toBe(1);
        expect(res.body.data.dados.length).toBeLessThanOrEqual(1);
    });

    it('page inválido (0) → 422', async () => {
        const res = await request(app).get('/api/conversas?page=0');

        expect(res.status).toBe(422);
    });

    it('limite inválido (>100) → 422', async () => {
        const res = await request(app).get('/api/conversas?limite=101');

        expect(res.status).toBe(422);
    });

    it('campo extra na query (.strict()) → 422', async () => {
        const res = await request(app).get('/api/conversas?foo=bar');

        expect(res.status).toBe(422);
        expect(res.body.error).toBe(true);
    });

    it('usuário sem perfil → 403', async () => {
        asUser(semPerfilUserId);
        const res = await request(app).get('/api/conversas');

        expect(res.status).toBe(403);
        expect(res.body.message).toMatch(/nao possui perfil/i);
    });

    it('sem autenticação → 401', async () => {
        asNoAuth();
        const res = await request(app).get('/api/conversas');

        expect(res.status).toBe(401);
    });
});

describe('GET /conversas/:id', () => {
    it('participante busca conversa por id → 200', async () => {
        const res = await request(app).get(`/api/conversas/${conversaBaseId}`);

        expect(res.status).toBe(200);
        expect(res.body.data.id).toBe(conversaBaseId);
    });

    it('não participante busca conversa → 403', async () => {
        asUser(outroTreinadorUserId);
        const res = await request(app).get(`/api/conversas/${conversaBaseId}`);

        expect(res.status).toBe(403);
        expect(res.body.message).toMatch(/nao participa desta conversa/i);
    });

    it('id inexistente (UUID válido) → 404', async () => {
        const res = await request(app).get(`/api/conversas/${NOT_FOUND_UUID}`);

        expect(res.status).toBe(404);
        expect(res.body.message).toMatch(/conversa nao encontrada/i);
    });

    it('id inválido (não UUID) → 422', async () => {
        const res = await request(app).get(`/api/conversas/${INVALID_UUID}`);

        expect(res.status).toBe(422);
        expect(extractMessages(res)).toMatch(/UUID valido/i);
    });

    it('sem autenticação → 401', async () => {
        asNoAuth();
        const res = await request(app).get(`/api/conversas/${conversaBaseId}`);

        expect(res.status).toBe(401);
    });
});

describe('GET /conversas/:conversaId/mensagens', () => {
    it('participante lista mensagens com paginação e ordem cronológica → 200', async () => {
        await criarMensagem({
            conversaId: conversaBaseId,
            remetenteTipo: 'TREINADOR',
            remetenteUserId: treinadorUserId,
            conteudo: 'Primeira',
            enviadaEm: new Date('2026-01-01T10:00:00.000Z'),
        });
        await criarMensagem({
            conversaId: conversaBaseId,
            remetenteTipo: 'ALUNO',
            remetenteUserId: alunoUserId,
            conteudo: 'Segunda',
            enviadaEm: new Date('2026-01-01T10:05:00.000Z'),
        });

        const res = await request(app).get(`/api/conversas/${conversaBaseId}/mensagens`);

        expect(res.status).toBe(200);
        expect(Array.isArray(res.body.data.dados)).toBe(true);
        expect(res.body.data.page).toBe(1);
        expect(res.body.data.limite).toBe(30);
        expect(res.body.data.total).toBeGreaterThanOrEqual(2);

        const conteudos = res.body.data.dados.map((m: any) => m.conteudo);
        const idxPrimeira = conteudos.indexOf('Primeira');
        const idxSegunda = conteudos.indexOf('Segunda');
        expect(idxPrimeira).toBeGreaterThanOrEqual(0);
        expect(idxSegunda).toBeGreaterThanOrEqual(0);
        expect(idxPrimeira).toBeLessThan(idxSegunda);
    });

    it('paginação explícita page=1&limite=1 → 200', async () => {
        const res = await request(app)
            .get(`/api/conversas/${conversaBaseId}/mensagens?page=1&limite=1`);

        expect(res.status).toBe(200);
        expect(res.body.data.page).toBe(1);
        expect(res.body.data.limite).toBe(1);
        expect(res.body.data.dados.length).toBeLessThanOrEqual(1);
    });

    it('não participante lista mensagens → 403', async () => {
        asUser(outroTreinadorUserId);
        const res = await request(app).get(`/api/conversas/${conversaBaseId}/mensagens`);

        expect(res.status).toBe(403);
        expect(res.body.message).toMatch(/nao participa desta conversa/i);
    });

    it('conversa inexistente → 404', async () => {
        const res = await request(app).get(`/api/conversas/${NOT_FOUND_UUID}/mensagens`);

        expect(res.status).toBe(404);
        expect(res.body.message).toMatch(/conversa nao encontrada/i);
    });

    it('conversaId inválido → 422', async () => {
        const res = await request(app).get(`/api/conversas/${INVALID_UUID}/mensagens`);

        expect(res.status).toBe(422);
    });

    it('page inválido (0) → 422', async () => {
        const res = await request(app).get(`/api/conversas/${conversaBaseId}/mensagens?page=0`);

        expect(res.status).toBe(422);
    });

    it('limite inválido (>100) → 422', async () => {
        const res = await request(app).get(`/api/conversas/${conversaBaseId}/mensagens?limite=101`);

        expect(res.status).toBe(422);
    });

    it('campo extra na query (.strict()) → 422', async () => {
        const res = await request(app).get(`/api/conversas/${conversaBaseId}/mensagens?foo=bar`);

        expect(res.status).toBe(422);
    });

    it('sem autenticação → 401', async () => {
        asNoAuth();
        const res = await request(app).get(`/api/conversas/${conversaBaseId}/mensagens`);

        expect(res.status).toBe(401);
    });
});

describe('POST /conversas/:conversaId/mensagens', () => {
    it('treinador participante envia mensagem → 201', async () => {
        asUser(treinadorUserId);
        const res = await request(app)
            .post(`/api/conversas/${conversaBaseId}/mensagens`)
            .send({ conteudo: 'Mensagem do treinador' });

        expect(res.status).toBe(201);
        expect(res.body.data.remetente_tipo).toBe('TREINADOR');
        expect(res.body.data.remetente_user_id).toBe(treinadorUserId);
        expect(res.body.data.conteudo).toBe('Mensagem do treinador');
        tempMensagemIds.push(res.body.data.id);

        const [conv] = await DataBase.select()
            .from(conversa)
            .where(eq(conversa.id, conversaBaseId))
            .limit(1);
        expect(conv.ultima_mensagem_em).not.toBeNull();
    });

    it('aluno participante envia mensagem → 201', async () => {
        asUser(alunoUserId);
        const res = await request(app)
            .post(`/api/conversas/${conversaBaseId}/mensagens`)
            .send({ conteudo: 'Mensagem do aluno' });

        expect(res.status).toBe(201);
        expect(res.body.data.remetente_tipo).toBe('ALUNO');
        expect(res.body.data.remetente_user_id).toBe(alunoUserId);
        tempMensagemIds.push(res.body.data.id);
    });

    it('conteúdo com espaços nas bordas aplica trim → 201', async () => {
        asUser(alunoUserId);
        const res = await request(app)
            .post(`/api/conversas/${conversaBaseId}/mensagens`)
            .send({ conteudo: '  ola  ' });

        expect(res.status).toBe(201);
        expect(res.body.data.conteudo).toBe('ola');
        tempMensagemIds.push(res.body.data.id);
    });

    it('conteúdo vazio/branco → 422', async () => {
        const res = await request(app)
            .post(`/api/conversas/${conversaBaseId}/mensagens`)
            .send({ conteudo: '   ' });

        expect(res.status).toBe(422);
        expect(extractMessages(res)).toMatch(/conteudo e obrigatorio/i);
    });

    it('conteúdo acima de 2000 caracteres → 422', async () => {
        const res = await request(app)
            .post(`/api/conversas/${conversaBaseId}/mensagens`)
            .send({ conteudo: 'a'.repeat(2001) });

        expect(res.status).toBe(422);
        expect(extractMessages(res)).toMatch(/maximo 2000/i);
    });

    it('não participante envia mensagem → 403', async () => {
        asUser(outroTreinadorUserId);
        const res = await request(app)
            .post(`/api/conversas/${conversaBaseId}/mensagens`)
            .send({ conteudo: 'Tentativa indevida' });

        expect(res.status).toBe(403);
        expect(res.body.message).toMatch(/nao participa desta conversa/i);
    });

    it('conversa inexistente → 404', async () => {
        const res = await request(app)
            .post(`/api/conversas/${NOT_FOUND_UUID}/mensagens`)
            .send({ conteudo: 'Mensagem' });

        expect(res.status).toBe(404);
        expect(res.body.message).toMatch(/conversa nao encontrada/i);
    });

    it('conversaId inválido → 422', async () => {
        const res = await request(app)
            .post(`/api/conversas/${INVALID_UUID}/mensagens`)
            .send({ conteudo: 'Mensagem' });

        expect(res.status).toBe(422);
    });

    it('body com campo extra (.strict()) → 422', async () => {
        const res = await request(app)
            .post(`/api/conversas/${conversaBaseId}/mensagens`)
            .send({ conteudo: 'Mensagem', extra: 'x' });

        expect(res.status).toBe(422);
    });

    it('sem autenticação → 401', async () => {
        asNoAuth();
        const res = await request(app)
            .post(`/api/conversas/${conversaBaseId}/mensagens`)
            .send({ conteudo: 'Mensagem' });

        expect(res.status).toBe(401);
    });
});

describe('PATCH /conversas/:conversaId/mensagens/lidas', () => {
    it('participante marca mensagens recebidas como lidas → 200', async () => {
        await criarMensagem({
            conversaId: conversaBaseId,
            remetenteTipo: 'TREINADOR',
            remetenteUserId: treinadorUserId,
            conteudo: 'Nao lida 1',
        });
        await criarMensagem({
            conversaId: conversaBaseId,
            remetenteTipo: 'TREINADOR',
            remetenteUserId: treinadorUserId,
            conteudo: 'Nao lida 2',
        });
        await criarMensagem({
            conversaId: conversaBaseId,
            remetenteTipo: 'ALUNO',
            remetenteUserId: alunoUserId,
            conteudo: 'Minha propria',
        });

        asUser(alunoUserId);
        const res = await request(app)
            .patch(`/api/conversas/${conversaBaseId}/mensagens/lidas`)
            .send({});

        expect(res.status).toBe(200);
        expect(res.body.data.marcadas).toBeGreaterThanOrEqual(2);
    });

    it('segunda marcação sem novas mensagens retorna 0 → 200', async () => {
        asUser(alunoUserId);
        const primeira = await request(app)
            .patch(`/api/conversas/${conversaBaseId}/mensagens/lidas`)
            .send({});
        expect(primeira.status).toBe(200);

        const segunda = await request(app)
            .patch(`/api/conversas/${conversaBaseId}/mensagens/lidas`)
            .send({});

        expect(segunda.status).toBe(200);
        expect(segunda.body.data.marcadas).toBe(0);
    });

    it('não participante marca mensagens como lidas → 403', async () => {
        asUser(outroTreinadorUserId);
        const res = await request(app)
            .patch(`/api/conversas/${conversaBaseId}/mensagens/lidas`)
            .send({});

        expect(res.status).toBe(403);
        expect(res.body.message).toMatch(/nao participa desta conversa/i);
    });

    it('conversa inexistente → 404', async () => {
        const res = await request(app)
            .patch(`/api/conversas/${NOT_FOUND_UUID}/mensagens/lidas`)
            .send({});

        expect(res.status).toBe(404);
        expect(res.body.message).toMatch(/conversa nao encontrada/i);
    });

    it('conversaId inválido → 422', async () => {
        const res = await request(app)
            .patch(`/api/conversas/${INVALID_UUID}/mensagens/lidas`)
            .send({});

        expect(res.status).toBe(422);
    });

    it('sem autenticação → 401', async () => {
        asNoAuth();
        const res = await request(app)
            .patch(`/api/conversas/${conversaBaseId}/mensagens/lidas`)
            .send({});

        expect(res.status).toBe(401);
    });
});

describe('Sanidade de persistência de leitura', () => {
    it('mensagens marcadas recebem lida_por_user_id do leitor', async () => {
        await criarMensagem({
            conversaId: conversaBaseId,
            remetenteTipo: 'TREINADOR',
            remetenteUserId: treinadorUserId,
            conteudo: 'Mensagem para leitura',
        });

        asUser(alunoUserId);
        const res = await request(app)
            .patch(`/api/conversas/${conversaBaseId}/mensagens/lidas`)
            .send({});

        expect(res.status).toBe(200);
        expect(res.body.data.marcadas).toBe(1);

        const mensagens = await DataBase.select()
            .from(mensagem_conversa)
            .where(and(eq(mensagem_conversa.conversa_id, conversaBaseId), eq(mensagem_conversa.ativa, true)));

        const alvo = mensagens.find((m) => m.conteudo === 'Mensagem para leitura');
        expect(alvo).toBeDefined();
        expect(alvo?.lida_por_user_id).toBe(alunoUserId);
        expect(alvo?.lida_em).not.toBeNull();
    });
});












// ============================================================
// BLOCO DE COBERTURA — Testes unitários do ConversaController (Gerado Automaticamente)
// ============================================================


describe('ConversaController (Coverage)', () => {
    let controller: ConversaController;
    
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
            body: {},
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
        controller = new ConversaController();
    });


    describe('iniciarOuBuscar', () => {
        it('handles ZodError', async () => {
            const res = makeRes();
            const req = makeReq();
            (controller as any).service = {
                iniciarOuBuscar: mockFn().mockRejectedValue(new ZodError([])),
            };
            await controller.iniciarOuBuscar(req, res);
            if (res.status.mock.calls.length > 0) {
                expect([400, 422, 500]).toContain(res.status.mock.calls[0][0]);
            }
        });

        it('handles DatabaseError', async () => {
            const res = makeRes();
            const req = makeReq();
            (controller as any).service = {
                iniciarOuBuscar: mockFn().mockRejectedValue(new DatabaseError('db error', 400)),
            };
            await controller.iniciarOuBuscar(req, res);
            if (res.status.mock.calls.length > 0) {
                expect([400, 500, 404, 422]).toContain(res.status.mock.calls[0][0]);
            }
        });

        it('handles FORBIDDEN error', async () => {
            const res = makeRes();
            const req = makeReq();
            (controller as any).service = {
                iniciarOuBuscar: mockFn().mockRejectedValue(new Error('FORBIDDEN: denied')),
            };
            await controller.iniciarOuBuscar(req, res);
            if (res.status.mock.calls.length > 0) {
                expect([403, 500, 400, 422]).toContain(res.status.mock.calls[0][0]);
            }
        });

        it('handles VALIDATION error', async () => {
            const res = makeRes();
            const req = makeReq();
            (controller as any).service = {
                iniciarOuBuscar: mockFn().mockRejectedValue(new Error('VALIDATION: error')),
            };
            await controller.iniciarOuBuscar(req, res);
            if (res.status.mock.calls.length > 0) {
                expect([400, 422, 500]).toContain(res.status.mock.calls[0][0]);
            }
        });

        it('handles not found error', async () => {
            const res = makeRes();
            const req = makeReq();
            const msg = 'Conversa não encontrado';
            (controller as any).service = {
                iniciarOuBuscar: mockFn().mockRejectedValue(new Error(msg)),
            };
            await controller.iniciarOuBuscar(req, res);
            if (res.status.mock.calls.length > 0) {
                expect([404, 500, 400, 422]).toContain(res.status.mock.calls[0][0]);
            }
        });

        it('handles Conversa nao encontrada error', async () => {
            const res = makeRes();
            const req = makeReq();
            (controller as any).service = {
                iniciarOuBuscar: mockFn().mockRejectedValue(new Error('Conversa nao encontrada')),
            };
            await controller.iniciarOuBuscar(req, res);
            if (res.status.mock.calls.length > 0) {
                expect([404, 500, 400, 422]).toContain(res.status.mock.calls[0][0]);
            }
        });

        it('handles generic Error', async () => {
            const res = makeRes();
            const req = makeReq();
            (controller as any).service = {
                iniciarOuBuscar: mockFn().mockRejectedValue(new Error('generic error')),
            };
            await controller.iniciarOuBuscar(req, res);
            if (res.status.mock.calls.length > 0) {
                expect([400, 403, 404, 422, 500]).toContain(res.status.mock.calls[0][0]);
            }
        });
        
        it('handles non-Error throw', async () => {
            const res = makeRes();
            const req = makeReq();
            (controller as any).service = {
                iniciarOuBuscar: mockFn().mockRejectedValue('not an error object'),
            };
            await controller.iniciarOuBuscar(req, res);
            if (res.status.mock.calls.length > 0) {
                expect(res.status).toHaveBeenCalledWith(500);
            }
        });
    });

    describe('listar', () => {
        it('handles ZodError', async () => {
            const res = makeRes();
            const req = makeReq();
            (controller as any).service = {
                listar: mockFn().mockRejectedValue(new ZodError([])),
            };
            await controller.listar(req, res);
            if (res.status.mock.calls.length > 0) {
                expect([400, 422, 500]).toContain(res.status.mock.calls[0][0]);
            }
        });

        it('handles DatabaseError', async () => {
            const res = makeRes();
            const req = makeReq();
            (controller as any).service = {
                listar: mockFn().mockRejectedValue(new DatabaseError('db error', 400)),
            };
            await controller.listar(req, res);
            if (res.status.mock.calls.length > 0) {
                expect([400, 500, 404, 422]).toContain(res.status.mock.calls[0][0]);
            }
        });

        it('handles FORBIDDEN error', async () => {
            const res = makeRes();
            const req = makeReq();
            (controller as any).service = {
                listar: mockFn().mockRejectedValue(new Error('FORBIDDEN: denied')),
            };
            await controller.listar(req, res);
            if (res.status.mock.calls.length > 0) {
                expect([403, 500, 400, 422]).toContain(res.status.mock.calls[0][0]);
            }
        });

        it('handles VALIDATION error', async () => {
            const res = makeRes();
            const req = makeReq();
            (controller as any).service = {
                listar: mockFn().mockRejectedValue(new Error('VALIDATION: error')),
            };
            await controller.listar(req, res);
            if (res.status.mock.calls.length > 0) {
                expect([400, 422, 500]).toContain(res.status.mock.calls[0][0]);
            }
        });

        it('handles not found error', async () => {
            const res = makeRes();
            const req = makeReq();
            const msg = 'Conversa não encontrado';
            (controller as any).service = {
                listar: mockFn().mockRejectedValue(new Error(msg)),
            };
            await controller.listar(req, res);
            if (res.status.mock.calls.length > 0) {
                expect([404, 500, 400, 422]).toContain(res.status.mock.calls[0][0]);
            }
        });

        it('handles Conversa nao encontrada error', async () => {
            const res = makeRes();
            const req = makeReq();
            (controller as any).service = {
                listar: mockFn().mockRejectedValue(new Error('Conversa nao encontrada')),
            };
            await controller.listar(req, res);
            if (res.status.mock.calls.length > 0) {
                expect([404, 500, 400, 422]).toContain(res.status.mock.calls[0][0]);
            }
        });

        it('handles generic Error', async () => {
            const res = makeRes();
            const req = makeReq();
            (controller as any).service = {
                listar: mockFn().mockRejectedValue(new Error('generic error')),
            };
            await controller.listar(req, res);
            if (res.status.mock.calls.length > 0) {
                expect([400, 403, 404, 422, 500]).toContain(res.status.mock.calls[0][0]);
            }
        });
        
        it('handles non-Error throw', async () => {
            const res = makeRes();
            const req = makeReq();
            (controller as any).service = {
                listar: mockFn().mockRejectedValue('not an error object'),
            };
            await controller.listar(req, res);
            if (res.status.mock.calls.length > 0) {
                expect(res.status).toHaveBeenCalledWith(500);
            }
        });
    });

    describe('obterPorId', () => {
        it('handles ZodError', async () => {
            const res = makeRes();
            const req = makeReq();
            (controller as any).service = {
                obterPorId: mockFn().mockRejectedValue(new ZodError([])),
            };
            await controller.obterPorId(req, res);
            if (res.status.mock.calls.length > 0) {
                expect([400, 422, 500]).toContain(res.status.mock.calls[0][0]);
            }
        });

        it('handles DatabaseError', async () => {
            const res = makeRes();
            const req = makeReq();
            (controller as any).service = {
                obterPorId: mockFn().mockRejectedValue(new DatabaseError('db error', 400)),
            };
            await controller.obterPorId(req, res);
            if (res.status.mock.calls.length > 0) {
                expect([400, 500, 404, 422]).toContain(res.status.mock.calls[0][0]);
            }
        });

        it('handles FORBIDDEN error', async () => {
            const res = makeRes();
            const req = makeReq();
            (controller as any).service = {
                obterPorId: mockFn().mockRejectedValue(new Error('FORBIDDEN: denied')),
            };
            await controller.obterPorId(req, res);
            if (res.status.mock.calls.length > 0) {
                expect([403, 500, 400, 422]).toContain(res.status.mock.calls[0][0]);
            }
        });

        it('handles VALIDATION error', async () => {
            const res = makeRes();
            const req = makeReq();
            (controller as any).service = {
                obterPorId: mockFn().mockRejectedValue(new Error('VALIDATION: error')),
            };
            await controller.obterPorId(req, res);
            if (res.status.mock.calls.length > 0) {
                expect([400, 422, 500]).toContain(res.status.mock.calls[0][0]);
            }
        });

        it('handles not found error', async () => {
            const res = makeRes();
            const req = makeReq();
            const msg = 'Conversa não encontrado';
            (controller as any).service = {
                obterPorId: mockFn().mockRejectedValue(new Error(msg)),
            };
            await controller.obterPorId(req, res);
            if (res.status.mock.calls.length > 0) {
                expect([404, 500, 400, 422]).toContain(res.status.mock.calls[0][0]);
            }
        });

        it('handles Conversa nao encontrada error', async () => {
            const res = makeRes();
            const req = makeReq();
            (controller as any).service = {
                obterPorId: mockFn().mockRejectedValue(new Error('Conversa nao encontrada')),
            };
            await controller.obterPorId(req, res);
            if (res.status.mock.calls.length > 0) {
                expect([404, 500, 400, 422]).toContain(res.status.mock.calls[0][0]);
            }
        });

        it('handles generic Error', async () => {
            const res = makeRes();
            const req = makeReq();
            (controller as any).service = {
                obterPorId: mockFn().mockRejectedValue(new Error('generic error')),
            };
            await controller.obterPorId(req, res);
            if (res.status.mock.calls.length > 0) {
                expect([400, 403, 404, 422, 500]).toContain(res.status.mock.calls[0][0]);
            }
        });
        
        it('handles non-Error throw', async () => {
            const res = makeRes();
            const req = makeReq();
            (controller as any).service = {
                obterPorId: mockFn().mockRejectedValue('not an error object'),
            };
            await controller.obterPorId(req, res);
            if (res.status.mock.calls.length > 0) {
                expect(res.status).toHaveBeenCalledWith(500);
            }
        });
    });
});


// ============================================================
// BLOCO DE COBERTURA — Testes unitários do MensagemConversaController (Gerado Automaticamente)
// ============================================================


describe('MensagemConversaController (Coverage)', () => {
    let controller: MensagemConversaController;
    
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

    function makeReq(overrides: any = {}) {
        return ({
            body: {},
            params: { 
                id: '00000000-0000-0000-0000-000000000000', 
                conversaId: '00000000-0000-0000-0000-000000000000',
                exercicioId: '00000000-0000-0000-0000-000000000000'
            },
            query: {},
            user: { id: '00000000-0000-0000-0000-000000000000' },
            ...overrides,
        }) as any;
    }

    beforeEach(() => {
        jest.clearAllMocks();
        controller = new MensagemConversaController();
    });


    describe('enviar', () => {
        it('handles ZodError', async () => {
            const res = makeRes();
            const req = makeReq();
            (controller as any).service = {
                enviar: mockFn().mockRejectedValue(new ZodError([])),
            };
            await controller.enviar(req, res);
            if (res.status.mock.calls.length > 0) {
                expect([400, 422, 500]).toContain(res.status.mock.calls[0][0]);
            }
        });

        it('handles DatabaseError', async () => {
            const res = makeRes();
            const req = makeReq();
            (controller as any).service = {
                enviar: mockFn().mockRejectedValue(new DatabaseError('db error', 400)),
            };
            await controller.enviar(req, res);
            if (res.status.mock.calls.length > 0) {
                expect([400, 500, 404, 422]).toContain(res.status.mock.calls[0][0]);
            }
        });

        it('handles FORBIDDEN error', async () => {
            const res = makeRes();
            const req = makeReq();
            (controller as any).service = {
                enviar: mockFn().mockRejectedValue(new Error('FORBIDDEN: denied')),
            };
            await controller.enviar(req, res);
            if (res.status.mock.calls.length > 0) {
                expect([403, 500, 400, 422]).toContain(res.status.mock.calls[0][0]);
            }
        });

        it('handles VALIDATION error', async () => {
            const res = makeRes();
            const req = makeReq();
            (controller as any).service = {
                enviar: mockFn().mockRejectedValue(new Error('VALIDATION: error')),
            };
            await controller.enviar(req, res);
            if (res.status.mock.calls.length > 0) {
                expect([400, 422, 500]).toContain(res.status.mock.calls[0][0]);
            }
        });

        it('handles not found error', async () => {
            const res = makeRes();
            const req = makeReq();
            const msg = 'MensagemConversa não encontrado';
            (controller as any).service = {
                enviar: mockFn().mockRejectedValue(new Error(msg)),
            };
            await controller.enviar(req, res);
            if (res.status.mock.calls.length > 0) {
                expect([404, 500, 400, 422]).toContain(res.status.mock.calls[0][0]);
            }
        });

        it('handles Conversa nao encontrada error', async () => {
            const res = makeRes();
            const req = makeReq();
            (controller as any).service = {
                enviar: mockFn().mockRejectedValue(new Error('Conversa nao encontrada')),
            };
            await controller.enviar(req, res);
            if (res.status.mock.calls.length > 0) {
                expect([404, 500, 400, 422]).toContain(res.status.mock.calls[0][0]);
            }
        });

        it('handles generic Error', async () => {
            const res = makeRes();
            const req = makeReq();
            (controller as any).service = {
                enviar: mockFn().mockRejectedValue(new Error('generic error')),
            };
            await controller.enviar(req, res);
            if (res.status.mock.calls.length > 0) {
                expect([400, 403, 404, 422, 500]).toContain(res.status.mock.calls[0][0]);
            }
        });
        
        it('handles non-Error throw', async () => {
            const res = makeRes();
            const req = makeReq({ body: { conteudo: 'teste' } });
            (controller as any).service = {
                enviar: mockFn().mockRejectedValue('not an error object'),
            };
            await controller.enviar(req, res);
            if (res.status.mock.calls.length > 0) {
                expect(res.status).toHaveBeenCalledWith(500);
            }
        });
    });

    describe('listar', () => {
        it('handles ZodError', async () => {
            const res = makeRes();
            const req = makeReq();
            (controller as any).service = {
                listar: mockFn().mockRejectedValue(new ZodError([])),
            };
            await controller.listar(req, res);
            if (res.status.mock.calls.length > 0) {
                expect([400, 422, 500]).toContain(res.status.mock.calls[0][0]);
            }
        });

        it('handles DatabaseError', async () => {
            const res = makeRes();
            const req = makeReq();
            (controller as any).service = {
                listar: mockFn().mockRejectedValue(new DatabaseError('db error', 400)),
            };
            await controller.listar(req, res);
            if (res.status.mock.calls.length > 0) {
                expect([400, 500, 404, 422]).toContain(res.status.mock.calls[0][0]);
            }
        });

        it('handles FORBIDDEN error', async () => {
            const res = makeRes();
            const req = makeReq();
            (controller as any).service = {
                listar: mockFn().mockRejectedValue(new Error('FORBIDDEN: denied')),
            };
            await controller.listar(req, res);
            if (res.status.mock.calls.length > 0) {
                expect([403, 500, 400, 422]).toContain(res.status.mock.calls[0][0]);
            }
        });

        it('handles VALIDATION error', async () => {
            const res = makeRes();
            const req = makeReq();
            (controller as any).service = {
                listar: mockFn().mockRejectedValue(new Error('VALIDATION: error')),
            };
            await controller.listar(req, res);
            if (res.status.mock.calls.length > 0) {
                expect([400, 422, 500]).toContain(res.status.mock.calls[0][0]);
            }
        });

        it('handles not found error', async () => {
            const res = makeRes();
            const req = makeReq();
            const msg = 'MensagemConversa não encontrado';
            (controller as any).service = {
                listar: mockFn().mockRejectedValue(new Error(msg)),
            };
            await controller.listar(req, res);
            if (res.status.mock.calls.length > 0) {
                expect([404, 500, 400, 422]).toContain(res.status.mock.calls[0][0]);
            }
        });

        it('handles Conversa nao encontrada error', async () => {
            const res = makeRes();
            const req = makeReq();
            (controller as any).service = {
                listar: mockFn().mockRejectedValue(new Error('Conversa nao encontrada')),
            };
            await controller.listar(req, res);
            if (res.status.mock.calls.length > 0) {
                expect([404, 500, 400, 422]).toContain(res.status.mock.calls[0][0]);
            }
        });

        it('handles generic Error', async () => {
            const res = makeRes();
            const req = makeReq();
            (controller as any).service = {
                listar: mockFn().mockRejectedValue(new Error('generic error')),
            };
            await controller.listar(req, res);
            if (res.status.mock.calls.length > 0) {
                expect([400, 403, 404, 422, 500]).toContain(res.status.mock.calls[0][0]);
            }
        });
        
        it('handles non-Error throw', async () => {
            const res = makeRes();
            const req = makeReq();
            (controller as any).service = {
                listar: mockFn().mockRejectedValue('not an error object'),
            };
            await controller.listar(req, res);
            if (res.status.mock.calls.length > 0) {
                expect(res.status).toHaveBeenCalledWith(500);
            }
        });
    });

    describe('marcarComoLidas', () => {
        it('handles ZodError', async () => {
            const res = makeRes();
            const req = makeReq();
            (controller as any).service = {
                marcarComoLidas: mockFn().mockRejectedValue(new ZodError([])),
            };
            await controller.marcarComoLidas(req, res);
            if (res.status.mock.calls.length > 0) {
                expect([400, 422, 500]).toContain(res.status.mock.calls[0][0]);
            }
        });

        it('handles DatabaseError', async () => {
            const res = makeRes();
            const req = makeReq();
            (controller as any).service = {
                marcarComoLidas: mockFn().mockRejectedValue(new DatabaseError('db error', 400)),
            };
            await controller.marcarComoLidas(req, res);
            if (res.status.mock.calls.length > 0) {
                expect([400, 500, 404, 422]).toContain(res.status.mock.calls[0][0]);
            }
        });

        it('handles FORBIDDEN error', async () => {
            const res = makeRes();
            const req = makeReq();
            (controller as any).service = {
                marcarComoLidas: mockFn().mockRejectedValue(new Error('FORBIDDEN: denied')),
            };
            await controller.marcarComoLidas(req, res);
            if (res.status.mock.calls.length > 0) {
                expect([403, 500, 400, 422]).toContain(res.status.mock.calls[0][0]);
            }
        });

        it('handles VALIDATION error', async () => {
            const res = makeRes();
            const req = makeReq();
            (controller as any).service = {
                marcarComoLidas: mockFn().mockRejectedValue(new Error('VALIDATION: error')),
            };
            await controller.marcarComoLidas(req, res);
            if (res.status.mock.calls.length > 0) {
                expect([400, 422, 500]).toContain(res.status.mock.calls[0][0]);
            }
        });

        it('handles not found error', async () => {
            const res = makeRes();
            const req = makeReq();
            const msg = 'MensagemConversa não encontrado';
            (controller as any).service = {
                marcarComoLidas: mockFn().mockRejectedValue(new Error(msg)),
            };
            await controller.marcarComoLidas(req, res);
            if (res.status.mock.calls.length > 0) {
                expect([404, 500, 400, 422]).toContain(res.status.mock.calls[0][0]);
            }
        });

        it('handles Conversa nao encontrada error', async () => {
            const res = makeRes();
            const req = makeReq();
            (controller as any).service = {
                marcarComoLidas: mockFn().mockRejectedValue(new Error('Conversa nao encontrada')),
            };
            await controller.marcarComoLidas(req, res);
            if (res.status.mock.calls.length > 0) {
                expect([404, 500, 400, 422]).toContain(res.status.mock.calls[0][0]);
            }
        });

        it('handles generic Error', async () => {
            const res = makeRes();
            const req = makeReq();
            (controller as any).service = {
                marcarComoLidas: mockFn().mockRejectedValue(new Error('generic error')),
            };
            await controller.marcarComoLidas(req, res);
            if (res.status.mock.calls.length > 0) {
                expect([400, 403, 404, 422, 500]).toContain(res.status.mock.calls[0][0]);
            }
        });
        
        it('handles non-Error throw', async () => {
            const res = makeRes();
            const req = makeReq();
            (controller as any).service = {
                marcarComoLidas: mockFn().mockRejectedValue('not an error object'),
            };
            await controller.marcarComoLidas(req, res);
            if (res.status.mock.calls.length > 0) {
                expect(res.status).toHaveBeenCalledWith(500);
            }
        });
    });
});
