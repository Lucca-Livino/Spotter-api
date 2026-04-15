jest.mock('../../middlewares/authMiddleware', () => ({
    authMiddleware: jest.fn(),
}));

import { randomUUID } from 'crypto';
import express from 'express';
import request from 'supertest';
import { jest, describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from '@jest/globals';
import { eq, inArray } from 'drizzle-orm';
import alunoRoutes from '../../routes/alunoRoutes';
import AlunoRepository from '../../repositories/alunoRepository';
import { DbConnect, DataBase } from '../../config/DbConnect';
import { authMiddleware } from '../../middlewares/authMiddleware';
import { academia, aluno, treinador, treino, treino_exercicio, user } from '../../config/db/schema';

const RUN_ID = Date.now().toString(36);

let app: express.Express;
let academiaId: string;

// Usuários usados no mock de autenticação
let adminUserId: string;
let alunoAuthUserId: string;
let treinadorAuthUserId: string;

// Registros base de domínio
let baseAlunoId: string;
let baseAlunoUserId: string;
let baseAlunoEmail: string;
let segundoAlunoId: string;
let segundoAlunoUserId: string;
let treinadorId: string;

let warnSpy: any;
let errorSpy: any;
let logSpy: any;

const INVALID_UUID = 'nao-e-uuid';
const NOT_FOUND_UUID = '00000000-0000-0000-0000-000000000000';

const tempAlunoIds: string[] = [];
const tempUserIds: string[] = [];

function asAdmin() {
    (authMiddleware as any).mockImplementation((req: any, _res: any, next: any) => {
        req.user = { id: adminUserId };
        req.authSession = { id: 'session-admin' };
        next();
    });
}

function asAluno() {
    (authMiddleware as any).mockImplementation((req: any, _res: any, next: any) => {
        req.user = { id: alunoAuthUserId };
        req.authSession = { id: 'session-aluno' };
        next();
    });
}

function asTreinador() {
    (authMiddleware as any).mockImplementation((req: any, _res: any, next: any) => {
        req.user = { id: treinadorAuthUserId };
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

function payloadAluno(userId: string, extra: Record<string, unknown> = {}) {
    return {
        user_id: userId,
        nome: `Aluno E2E ${RUN_ID}`,
        data_nascimento: '2000-01-15',
        sexo: 'M',
        academia_id: academiaId,
        ...extra,
    };
}

beforeAll(async () => {
    warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});

    app = express();
    await DbConnect.connect();
    app.use(express.json());
    app.use('/api', alunoRoutes);

    const [ac] = await DataBase.insert(academia).values({
        nome: `Academia Aluno E2E ${RUN_ID}`,
        endereco_numero: '10',
        endereco_rua: 'Rua dos Alunos',
        endereco_bairro: 'Centro',
        endereco_cidade: 'Porto Velho',
        endereco_estado: 'RO',
    }).returning({ id: academia.id });
    academiaId = ac.id;

    const now = new Date();

    adminUserId = randomUUID();
    await DataBase.insert(user).values({
        id: adminUserId,
        name: 'Admin Aluno Teste',
        email: `admin_al_${RUN_ID}@test.local`,
        emailVerified: false,
        createdAt: now,
        updatedAt: now,
    });

    treinadorAuthUserId = randomUUID();
    await DataBase.insert(user).values({
        id: treinadorAuthUserId,
        name: 'Treinador Aluno Teste',
        email: `treinador_al_${RUN_ID}@test.local`,
        emailVerified: false,
        createdAt: now,
        updatedAt: now,
    });

    const [treinadorRec] = await DataBase.insert(treinador).values({
        user_id: treinadorAuthUserId,
        nome: 'Treinador Aluno Teste',
        data_nascimento: '1988-02-02',
        sexo: 'M',
        cref: `CREF-AL-${RUN_ID}`.substring(0, 50),
        turnos: ['MANHA'],
        especializacao: 'Hipertrofia',
        graduacao: 'Educação Física',
        is_admin: false,
        academia_id: academiaId,
    }).returning({ id: treinador.id });
    treinadorId = treinadorRec.id;

    alunoAuthUserId = randomUUID();
    await DataBase.insert(user).values({
        id: alunoAuthUserId,
        name: 'Usuario Auth Aluno Teste',
        email: `aluno_auth_al_${RUN_ID}@test.local`,
        emailVerified: false,
        createdAt: now,
        updatedAt: now,
    });

    baseAlunoUserId = randomUUID();
    baseAlunoEmail = `aluno_base_${RUN_ID}@test.local`;
    await DataBase.insert(user).values({
        id: baseAlunoUserId,
        name: 'Aluno Base Teste',
        email: baseAlunoEmail,
        emailVerified: false,
        createdAt: now,
        updatedAt: now,
    });

    const [baseAlunoRec] = await DataBase.insert(aluno).values({
        user_id: baseAlunoUserId,
        nome: 'Aluno Base Teste',
        data_nascimento: '1999-01-10',
        sexo: 'M',
        academia_id: academiaId,
        treinador_id: treinadorId,
    }).returning({ id: aluno.id });
    baseAlunoId = baseAlunoRec.id;

    segundoAlunoUserId = randomUUID();
    await DataBase.insert(user).values({
        id: segundoAlunoUserId,
        name: 'Aluno Secundario Teste',
        email: `aluno_segundo_${RUN_ID}@test.local`,
        emailVerified: false,
        createdAt: now,
        updatedAt: now,
    });

    const [segundoAlunoRec] = await DataBase.insert(aluno).values({
        user_id: segundoAlunoUserId,
        nome: 'Aluno Secundario Teste',
        data_nascimento: '2001-05-21',
        sexo: 'F',
        academia_id: academiaId,
        treinador_id: null,
    }).returning({ id: aluno.id });
    segundoAlunoId = segundoAlunoRec.id;

    asAdmin();
}, 30000);

afterEach(async () => {
    if (tempAlunoIds.length > 0) {
        await DataBase.delete(aluno).where(inArray(aluno.id, [...tempAlunoIds])).catch(() => {});
        tempAlunoIds.length = 0;
    }

    if (tempUserIds.length > 0) {
        await DataBase.delete(user).where(inArray(user.id, [...tempUserIds])).catch(() => {});
        tempUserIds.length = 0;
    }

    asAdmin();
});

afterAll(async () => {
    const todosAlunos = [baseAlunoId, segundoAlunoId, ...tempAlunoIds];
    const alunosUnicos = [...new Set(todosAlunos.filter(Boolean))];

    if (alunosUnicos.length > 0) {
        const treinosDosAlunos = await DataBase.select({ id: treino.id })
            .from(treino)
            .where(inArray(treino.usuario_id, alunosUnicos));

        if (treinosDosAlunos.length > 0) {
            const treinoIds = treinosDosAlunos.map((t) => t.id);
            await DataBase.delete(treino_exercicio).where(inArray(treino_exercicio.treino_id, treinoIds)).catch(() => {});
            await DataBase.delete(treino).where(inArray(treino.id, treinoIds)).catch(() => {});
        }

        await DataBase.delete(aluno).where(inArray(aluno.id, alunosUnicos)).catch(() => {});
    }

    await DataBase.delete(treinador).where(eq(treinador.id, treinadorId)).catch(() => {});

    const usersParaRemover = [
        adminUserId,
        alunoAuthUserId,
        treinadorAuthUserId,
        baseAlunoUserId,
        segundoAlunoUserId,
        ...tempUserIds,
    ];
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

beforeEach(() => {
    asAdmin();
});

describe('GET /alunos', () => {
    it('usuário autenticado lista alunos com estrutura paginada → 200', async () => {
        asAluno();
        const res = await request(app).get('/api/alunos');

        expect(res.status).toBe(200);
        expect(Array.isArray(res.body.data.dados)).toBe(true);
        expect(res.body.data).toHaveProperty('total');
        expect(res.body.data).toHaveProperty('page');
        expect(res.body.data).toHaveProperty('limite');
        expect(res.body.data).toHaveProperty('totalPages');
    });

    it('query vazia usa valores padrão page=1 e limite=10 → 200', async () => {
        const res = await request(app).get('/api/alunos');

        expect(res.status).toBe(200);
        expect(res.body.data.page).toBe(1);
        expect(res.body.data.limite).toBe(10);
    });

    it('paginação explícita page=1&limite=1 respeita metadados → 200', async () => {
        const res = await request(app).get('/api/alunos?page=1&limite=1');

        expect(res.status).toBe(200);
        expect(res.body.data.page).toBe(1);
        expect(res.body.data.limite).toBe(1);
        expect(res.body.data.dados.length).toBeLessThanOrEqual(1);
    });

    it('page inválido (0) → 422', async () => {
        const res = await request(app).get('/api/alunos?page=0');

        expect(res.status).toBe(422);
        const messages = (res.body.errors ?? []).map((e: any) => e.message).join(' ');
        expect(messages).toMatch(/page deve ser maior que 0/i);
    });

    it('limite inválido (>100) → 422', async () => {
        const res = await request(app).get('/api/alunos?limite=101');

        expect(res.status).toBe(422);
        const messages = (res.body.errors ?? []).map((e: any) => e.message).join(' ');
        expect(messages).toMatch(/limite deve ser entre 1 e 100/i);
    });

    it('limite não numérico → 422', async () => {
        const res = await request(app).get('/api/alunos?limite=abc');

        expect(res.status).toBe(422);
        const messages = (res.body.errors ?? []).map((e: any) => e.message).join(' ');
        expect(messages).toMatch(/limite deve ser entre 1 e 100/i);
    });

    it('campo extra na query (.strict()) → 422', async () => {
        const res = await request(app).get('/api/alunos?foo=bar');

        expect(res.status).toBe(422);
        expect(res.body.error).toBe(true);
    });

    it('sem autenticação → 401', async () => {
        asNoAuth();
        const res = await request(app).get('/api/alunos');

        expect(res.status).toBe(401);
    });
});

describe('GET /alunos/:id', () => {
    it('busca aluno existente por ID → 200', async () => {
        asTreinador();
        const res = await request(app).get(`/api/alunos/${baseAlunoId}`);

        expect(res.status).toBe(200);
        expect(res.body.data).toHaveProperty('id', baseAlunoId);
        expect(res.body.data).toHaveProperty('user_id', baseAlunoUserId);
    });

    it('ID inexistente (UUID válido) → 404', async () => {
        const res = await request(app).get(`/api/alunos/${NOT_FOUND_UUID}`);

        expect(res.status).toBe(404);
        expect(res.body.message).toMatch(/não encontrado/i);
    });

    it('ID inválido (não UUID) → 422', async () => {
        const res = await request(app).get(`/api/alunos/${INVALID_UUID}`);

        expect(res.status).toBe(422);
        const messages = (res.body.errors ?? []).map((e: any) => e.message).join(' ');
        expect(messages).toMatch(/uuid válido/i);
    });

    it('sem autenticação → 401', async () => {
        asNoAuth();
        const res = await request(app).get(`/api/alunos/${baseAlunoId}`);

        expect(res.status).toBe(401);
    });
});

describe('POST /alunos', () => {
    it('cria aluno com payload válido mínimo → 201', async () => {
        const novoUserId = await criarUsuario('aluno_post_minimo');

        const res = await request(app)
            .post('/api/alunos')
            .send(payloadAluno(novoUserId));

        expect(res.status).toBe(201);
        expect(res.body.data.user_id).toBe(novoUserId);
        expect(res.body.data.academia_id).toBe(academiaId);
        expect(res.body.data.status_conta).toBe(true);

        tempAlunoIds.push(res.body.data.id);
    });

    it('cria aluno com campos opcionais (url_foto, status_conta, treinador_id) → 201', async () => {
        const novoUserId = await criarUsuario('aluno_post_opcional');

        const res = await request(app)
            .post('/api/alunos')
            .send(payloadAluno(novoUserId, {
                sexo: 'F',
                url_foto: 'https://cdn.test.local/foto.png',
                status_conta: false,
                treinador_id: treinadorId,
            }));

        expect(res.status).toBe(201);
        expect(res.body.data.user_id).toBe(novoUserId);
        expect(res.body.data.url_foto).toBe('https://cdn.test.local/foto.png');
        expect(res.body.data.status_conta).toBe(false);
        expect(res.body.data.treinador_id).toBe(treinadorId);

        tempAlunoIds.push(res.body.data.id);
    });

    it('user_id ausente → 400', async () => {
        const res = await request(app)
            .post('/api/alunos')
            .send({
                nome: 'Sem User',
                data_nascimento: '2000-01-15',
                sexo: 'M',
                academia_id: academiaId,
            });

        expect(res.status).toBe(400);
        expect(res.body.message).toMatch(/dados do aluno são obrigatórios/i);
    });

    it('nome ausente → 400', async () => {
        const novoUserId = await criarUsuario('aluno_post_sem_nome');

        const res = await request(app)
            .post('/api/alunos')
            .send({
                user_id: novoUserId,
                data_nascimento: '2000-01-15',
                sexo: 'M',
                academia_id: academiaId,
            });

        expect(res.status).toBe(400);
        expect(res.body.message).toMatch(/dados do aluno são obrigatórios/i);
    });

    it('academia_id inválido → 422', async () => {
        const novoUserId = await criarUsuario('aluno_post_academia_invalida');

        const res = await request(app)
            .post('/api/alunos')
            .send(payloadAluno(novoUserId, { academia_id: INVALID_UUID }));

        expect(res.status).toBe(422);
        const messages = (res.body.errors ?? []).map((e: any) => e.message).join(' ');
        expect(messages).toMatch(/UUID válido/i);
    });

    it('data_nascimento em formato inválido → 422', async () => {
        const novoUserId = await criarUsuario('aluno_post_data_formato');

        const res = await request(app)
            .post('/api/alunos')
            .send(payloadAluno(novoUserId, { data_nascimento: '15-01-2000' }));

        expect(res.status).toBe(422);
        const messages = (res.body.errors ?? []).map((e: any) => e.message).join(' ');
        expect(messages).toMatch(/formato YYYY-MM-DD/i);
    });

    it('data_nascimento impossível → 422', async () => {
        const novoUserId = await criarUsuario('aluno_post_data_impossivel');

        const res = await request(app)
            .post('/api/alunos')
            .send(payloadAluno(novoUserId, { data_nascimento: '2025-02-30' }));

        expect(res.status).toBe(422);
        const messages = (res.body.errors ?? []).map((e: any) => e.message).join(' ');
        expect(messages).toMatch(/data de nascimento inválida/i);
    });

    it('sexo fora do enum → 422', async () => {
        const novoUserId = await criarUsuario('aluno_post_sexo');

        const res = await request(app)
            .post('/api/alunos')
            .send(payloadAluno(novoUserId, { sexo: 'X' }));

        expect(res.status).toBe(422);
    });

    it('treinador_id inválido → 422', async () => {
        const novoUserId = await criarUsuario('aluno_post_treinador_invalido');

        const res = await request(app)
            .post('/api/alunos')
            .send(payloadAluno(novoUserId, { treinador_id: INVALID_UUID }));

        expect(res.status).toBe(422);
        const messages = (res.body.errors ?? []).map((e: any) => e.message).join(' ');
        expect(messages).toMatch(/ID do treinador deve ser um UUID válido/i);
    });

    it('user_id inexistente na tabela user → 422', async () => {
        const res = await request(app)
            .post('/api/alunos')
            .send(payloadAluno(randomUUID()));

        expect(res.status).toBe(422);
        expect(res.body.message).toMatch(/referência inválida/i);
    });

    it('user_id já vinculado a aluno existente → 409', async () => {
        const res = await request(app)
            .post('/api/alunos')
            .send(payloadAluno(baseAlunoUserId));

        expect(res.status).toBe(409);
        expect(res.body.message).toMatch(/já existe um registro com esse valor/i);
    });

    it('sem autenticação → 401', async () => {
        const novoUserId = await criarUsuario('aluno_post_sem_auth');
        asNoAuth();

        const res = await request(app)
            .post('/api/alunos')
            .send(payloadAluno(novoUserId));

        expect(res.status).toBe(401);
    });
});

describe('PATCH /alunos/:id', () => {
    it('atualiza parcialmente aluno existente → 200', async () => {
        const novoNome = `Aluno Atualizado ${RUN_ID}`;

        const res = await request(app)
            .patch(`/api/alunos/${baseAlunoId}`)
            .send({
                nome: novoNome,
                status_conta: false,
            });

        expect(res.status).toBe(200);
        expect(res.body.data.nome).toBe(novoNome);
        expect(res.body.data.status_conta).toBe(false);
    });

    it('atualiza treinador_id para null (desvincular) → 200', async () => {
        const vincula = await request(app)
            .patch(`/api/alunos/${baseAlunoId}`)
            .send({ treinador_id: treinadorId });

        expect(vincula.status).toBe(200);
        expect(vincula.body.data.treinador_id).toBe(treinadorId);

        const desvincula = await request(app)
            .patch(`/api/alunos/${baseAlunoId}`)
            .send({ treinador_id: null });

        expect(desvincula.status).toBe(200);
        expect(desvincula.body.data.treinador_id).toBeNull();
    });

    it('body vazio → 400', async () => {
        const res = await request(app)
            .patch(`/api/alunos/${baseAlunoId}`)
            .send({});

        expect(res.status).toBe(400);
        expect(res.body.message).toMatch(/corpo da requisição é obrigatório/i);
    });

    it('ID inválido (não UUID) → 422', async () => {
        const res = await request(app)
            .patch(`/api/alunos/${INVALID_UUID}`)
            .send({ nome: 'Invalido' });

        expect(res.status).toBe(422);
    });

    it('aluno inexistente → 404', async () => {
        const res = await request(app)
            .patch(`/api/alunos/${NOT_FOUND_UUID}`)
            .send({ nome: 'Nao Existe' });

        expect(res.status).toBe(404);
        expect(res.body.message).toMatch(/não encontrado/i);
    });

    it('sexo fora do enum → 422', async () => {
        const res = await request(app)
            .patch(`/api/alunos/${baseAlunoId}`)
            .send({ sexo: 'X' });

        expect(res.status).toBe(422);
    });

    it('treinador_id inválido → 422', async () => {
        const res = await request(app)
            .patch(`/api/alunos/${baseAlunoId}`)
            .send({ treinador_id: INVALID_UUID });

        expect(res.status).toBe(422);
    });

    it('sem autenticação → 401', async () => {
        asNoAuth();

        const res = await request(app)
            .patch(`/api/alunos/${baseAlunoId}`)
            .send({ nome: 'Sem Auth' });

        expect(res.status).toBe(401);
    });
});

describe('DELETE /alunos/:id', () => {
    it('deleta aluno existente → 200', async () => {
        const userId = await criarUsuario('aluno_delete_ok');
        const [rec] = await DataBase.insert(aluno).values({
            user_id: userId,
            nome: `Aluno Delete ${RUN_ID}`,
            data_nascimento: '2002-09-12',
            sexo: 'M',
            academia_id: academiaId,
            treinador_id: null,
        }).returning({ id: aluno.id });

        const res = await request(app).delete(`/api/alunos/${rec.id}`);

        expect(res.status).toBe(200);
        expect(res.body.message).toMatch(/aluno deletado com sucesso/i);

        const check = await request(app).get(`/api/alunos/${rec.id}`);
        expect(check.status).toBe(404);
    });

    it('ID inválido (não UUID) → 422', async () => {
        const res = await request(app).delete(`/api/alunos/${INVALID_UUID}`);

        expect(res.status).toBe(422);
    });

    it('ID inexistente (UUID válido) → 404', async () => {
        const res = await request(app).delete(`/api/alunos/${NOT_FOUND_UUID}`);

        expect(res.status).toBe(404);
        expect(res.body.message).toMatch(/não encontrado/i);
    });

    it('sem autenticação → 401', async () => {
        asNoAuth();
        const res = await request(app).delete(`/api/alunos/${baseAlunoId}`);

        expect(res.status).toBe(401);
    });
});

describe('Cobertura extra de repository no arquivo de routes', () => {
    it('findByEmail retorna aluno existente', async () => {
        const repo = new AlunoRepository();
        const alunoEncontrado = await repo.findByEmail(baseAlunoEmail);

        expect(alunoEncontrado).not.toBeNull();
        expect(alunoEncontrado.id).toBe(baseAlunoId);
        expect(alunoEncontrado.user_id).toBe(baseAlunoUserId);
    });

    it('findByUserId retorna aluno quando user_id existe', async () => {
        const repo = new AlunoRepository();
        const alunoEncontrado = await repo.findByUserId(baseAlunoUserId);

        expect(alunoEncontrado).not.toBeNull();
        expect(alunoEncontrado?.id).toBe(baseAlunoId);
    });

    it('findByUserId retorna null quando user_id não existe', async () => {
        const repo = new AlunoRepository();
        const alunoEncontrado = await repo.findByUserId(randomUUID());

        expect(alunoEncontrado).toBeNull();
    });
});
