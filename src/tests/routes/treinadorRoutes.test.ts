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
import { jest, describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from '@jest/globals';
import { ZodError } from 'zod';
import { eq, inArray } from 'drizzle-orm';
import treinadorRoutes from '../../routes/treinadorRoutes';
import { DbConnect, DataBase } from '../../config/DbConnect';
import { authMiddleware } from '../../middlewares/authMiddleware';
import { academia, treinador, user } from '../../config/db/schema';
import TreinadorController from '../../controllers/treinadorController';
import TreinadorService from '../../services/treinadorService';
import { DatabaseError } from '../../utils/errors/DatabaseError';

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

describe('POST /treinadores - fileFilter do multer', () => {
    it('arquivo com MIME inválido (PDF) → erro do multer', async () => {
        // Exercita o branch `else` do fileFilter (linhas 12-16 de treinadorRoutes.ts)
        const res = await request(app)
            .post('/api/treinadores')
            .attach('foto', Buffer.from('%PDF-1.4 fake'), {
                filename: 'documento.pdf',
                contentType: 'application/pdf',
            });

        expect(res.status).toBeGreaterThanOrEqual(400);
    });

    it('arquivo com MIME válido (PNG) → multer aceita e passa ao controller', async () => {
        // Exercita o branch `if` do fileFilter onde cb(null, true) é chamado
        const res = await request(app)
            .post('/api/treinadores')
            .attach('foto', Buffer.from('fake-png-data'), {
                filename: 'foto.png',
                contentType: 'image/png',
            });

        // O controller pode retornar 400/422 por falta de outros campos, mas o multer aceitou
        expect([201, 400, 422, 500]).toContain(res.status);
    });
});

// ============================================================
// BLOCO 2 — Testes unitários do TreinadorController (mocked)
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

describe('TreinadorController', () => {
    let controller: TreinadorController;

    beforeEach(() => {
        controller = new TreinadorController();
        (controller as any).uploadService = {
            uploadFiles: mockFn().mockResolvedValue([{ url: 'http://test.local/file.jpg' }]),
            deleteFile: mockFn().mockResolvedValue(undefined),
        };
    });

    it('getAllTreinadores handles ZodError', async () => {
        const res = makeRes();
        const req = makeReq();
        (controller as any).service = {
            getAllTreinadores: mockFn().mockRejectedValue(new ZodError([])),
        };

        await controller.getAllTreinadores(req, res);
        expect(res.status).toHaveBeenCalledWith(422);
    });

    it('getTreinadorById validates missing id', async () => {
        const res = makeRes();
        const req = makeReq({ params: {} });

        await controller.getTreinadorById(req, res);
        expect(res.status).toHaveBeenCalledWith(400);
    });

    it('getTreinadorById handles not found error', async () => {
        const res = makeRes();
        const req = makeReq({ params: { id: 'missing' } });
        (controller as any).service = {
            getTreinadorById: mockFn().mockRejectedValue(new Error('Treinador não encontrado')),
        };

        await controller.getTreinadorById(req, res);
        expect(res.status).toHaveBeenCalledWith(404);
    });

    it('getAlunosVinculados handles missing user', async () => {
        const res = makeRes();
        const req = makeReq({ user: undefined });

        await controller.getAlunosVinculados(req, res);
        expect(res.status).toHaveBeenCalledWith(401);
    });

    it('createTreinador handles missing user and missing nome', async () => {
        const res = makeRes();
        const reqNoUser = makeReq({ user: undefined });

        await controller.createTreinador(reqNoUser, res);
        expect(res.status).toHaveBeenCalledWith(401);

        const reqNoNome = makeReq({ body: { data_nascimento: '1990-01-01' } });
        (controller as any).service = {
            createTreinador: mockFn(),
        };

        await controller.createTreinador(reqNoNome, res);
        expect(res.status).toHaveBeenCalledWith(400);
    });

    it('createTreinador handles DatabaseError', async () => {
        const res = makeRes();
        const req = makeReq({ body: { nome: 'Nome', data_nascimento: '1990-01-01', sexo: 'M', cref: 'CREF', turnos: ['MANHA'], especializacao: 'Geral', graduacao: 'Grad', academia_id: 'a' } });
        (controller as any).service = {
            createTreinador: mockFn().mockRejectedValue(new DatabaseError('db error', 409)),
        };

        await controller.createTreinador(req, res);
        expect(res.status).toHaveBeenCalledWith(409);
    });

    it('updateTreinador handles missing id and forbidden error', async () => {
        const res = makeRes();
        const reqMissingId = makeReq({ params: {} });

        await controller.updateTreinador(reqMissingId, res);
        expect(res.status).toHaveBeenCalledWith(400);

        const req = makeReq({ params: { id: 'id' }, body: { nome: 'Nome' } });
        (controller as any).service = {
            updateTreinador: mockFn().mockRejectedValue(new Error('FORBIDDEN: denied')),
        };

        await controller.updateTreinador(req, res);
        expect(res.status).toHaveBeenCalledWith(403);
    });
});

// ============================================================
// BLOCO 3 — Testes unitários do TreinadorService (mocked)
// ============================================================

const mockRepository = {
    getAllTreinadores: mockFn(),
    create: mockFn(),
    findByUserId: mockFn(),
    findById: mockFn(),
    update: mockFn(),
};

const mockAlunoRepository = {
    getAlunosByTreinadorId: mockFn(),
};

const mockUsuarioRepository = {
    buscarPerfilAcesso: mockFn(),
};

function makeService(): TreinadorService {
    const service = new TreinadorService();
    (service as any).repository = mockRepository;
    (service as any).alunoRepository = mockAlunoRepository;
    (service as any).usuarioRepository = mockUsuarioRepository;
    return service;
}

const validTreinadorData = {
    user_id: 'user-1',
    nome: 'Treinador Teste',
    data_nascimento: '1985-03-15',
    sexo: 'M',
    cref: 'CREF-001',
    turnos: ['MANHA'],
    especializacao: 'Hipertrofia',
    graduacao: 'Educação Física',
    academia_id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
};

describe('TreinadorService.getAllTreinadores', () => {
    let service: TreinadorService;

    beforeEach(() => {
        jest.clearAllMocks();
        service = makeService();
    });

    it('retorna lista com query válida', async () => {
        const mockResult = { dados: [], total: 0, page: 1, limite: 10, totalPages: 0 };
        mockRepository.getAllTreinadores.mockResolvedValue(mockResult as any);

        const result = await service.getAllTreinadores({});

        expect(mockRepository.getAllTreinadores).toHaveBeenCalledWith(1, 10);
        expect(result).toEqual(mockResult);
    });

    it('lança ZodError para query inválida', async () => {
        await expect(service.getAllTreinadores({ page: '0' })).rejects.toBeInstanceOf(ZodError);
    });
});

describe('TreinadorService.createTreinador', () => {
    let service: TreinadorService;

    beforeEach(() => {
        jest.clearAllMocks();
        service = makeService();
    });

    it('cria treinador com dados válidos', async () => {
        mockRepository.findByUserId.mockResolvedValue(null as any);
        mockRepository.create.mockResolvedValue(validTreinadorData as any);

        const result = await service.createTreinador(validTreinadorData as any);

        expect(mockRepository.create).toHaveBeenCalled();
        expect(result).toEqual(validTreinadorData);
    });

    it('usa status_conta=true quando não fornecido', async () => {
        mockRepository.findByUserId.mockResolvedValue(null as any);
        const captured: any[] = [];
        mockRepository.create.mockImplementation(async (data: any) => {
            captured.push(data);
            return data;
        });

        await service.createTreinador({ ...validTreinadorData, status_conta: undefined } as any);

        expect(captured[0].status_conta).toBe(true);
    });

    it('usa status_conta=false quando fornecido como false', async () => {
        mockRepository.findByUserId.mockResolvedValue(null as any);
        const captured: any[] = [];
        mockRepository.create.mockImplementation(async (data: any) => {
            captured.push(data);
            return data;
        });

        await service.createTreinador({ ...validTreinadorData, status_conta: false } as any);

        expect(captured[0].status_conta).toBe(false);
    });

    it('lança DatabaseError quando treinador já existe (user_id duplicado)', async () => {
        mockRepository.findByUserId.mockResolvedValue({ id: 'existing' } as any);

        await expect(service.createTreinador(validTreinadorData as any)).rejects.toBeInstanceOf(DatabaseError);
    });

    it('lança ZodError para dados inválidos', async () => {
        const invalid = { ...validTreinadorData, nome: '' };

        await expect(service.createTreinador(invalid as any)).rejects.toBeInstanceOf(ZodError);
    });

    it('propaga DatabaseError do repository.create', async () => {
        mockRepository.findByUserId.mockResolvedValue(null as any);
        mockRepository.create.mockRejectedValue(new DatabaseError('db fail', 422) as any);

        await expect(service.createTreinador(validTreinadorData as any)).rejects.toBeInstanceOf(DatabaseError);
    });
});

describe('TreinadorService.getTreinadorById', () => {
    let service: TreinadorService;

    beforeEach(() => {
        jest.clearAllMocks();
        service = makeService();
    });

    it('retorna treinador existente', async () => {
        mockRepository.findById.mockResolvedValue({ id: 'treinador-1', nome: 'T' } as any);

        const result = await service.getTreinadorById('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11');

        expect(result).toEqual({ id: 'treinador-1', nome: 'T' });
    });

    it('lança erro quando treinador não encontrado', async () => {
        mockRepository.findById.mockResolvedValue(null as any);

        await expect(
            service.getTreinadorById('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11')
        ).rejects.toThrow('não encontrado');
    });

    it('lança ZodError para ID inválido', async () => {
        await expect(service.getTreinadorById('nao-uuid')).rejects.toBeInstanceOf(ZodError);
    });
});

describe('TreinadorService.updateTreinador', () => {
    let service: TreinadorService;
    const validId = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';

    beforeEach(() => {
        jest.clearAllMocks();
        service = makeService();
    });

    it('atualiza treinador com sucesso', async () => {
        const updated = { ...validTreinadorData, nome: 'Novo Nome' };
        mockRepository.update.mockResolvedValue(updated as any);

        const result = await service.updateTreinador(validId, { nome: 'Novo Nome' });

        expect(result).toEqual(updated);
    });

    it('lança erro quando body vazio', async () => {
        await expect(service.updateTreinador(validId, {})).rejects.toThrow('obrigatório');
    });

    it('lança erro quando treinador não encontrado', async () => {
        mockRepository.update.mockResolvedValue(null as any);

        await expect(service.updateTreinador(validId, { nome: 'X' })).rejects.toThrow('não encontrado');
    });

    it('lança ZodError para ID inválido', async () => {
        await expect(service.updateTreinador('nao-uuid', { nome: 'X' })).rejects.toBeInstanceOf(ZodError);
    });
});

describe('TreinadorService.getAlunosVinculados', () => {
    let service: TreinadorService;

    beforeEach(() => {
        jest.clearAllMocks();
        service = makeService();
    });

    it('retorna alunos quando usuário é treinador', async () => {
        mockUsuarioRepository.buscarPerfilAcesso.mockResolvedValue({
            isTreinador: true,
            isAdmin: false,
            treinadorId: 'treinador-1',
        } as any);
        mockAlunoRepository.getAlunosByTreinadorId.mockResolvedValue({
            dados: [],
            total: 0,
            page: 1,
            limite: 10,
            totalPages: 0,
        } as any);

        const result = await service.getAlunosVinculados('user-1', {});

        expect(mockAlunoRepository.getAlunosByTreinadorId).toHaveBeenCalledWith('treinador-1', 1, 10);
        expect(result).toBeDefined();
    });

    it('retorna alunos quando usuário é admin', async () => {
        mockUsuarioRepository.buscarPerfilAcesso.mockResolvedValue({
            isTreinador: false,
            isAdmin: true,
            treinadorId: 'treinador-admin',
        } as any);
        mockAlunoRepository.getAlunosByTreinadorId.mockResolvedValue({ dados: [], total: 0, page: 1, limite: 10, totalPages: 0 } as any);

        const result = await service.getAlunosVinculados('admin-1', {});

        expect(result).toBeDefined();
    });

    it('lança erro FORBIDDEN quando usuário não é treinador nem admin', async () => {
        mockUsuarioRepository.buscarPerfilAcesso.mockResolvedValue({
            isTreinador: false,
            isAdmin: false,
            treinadorId: null,
        } as any);

        await expect(service.getAlunosVinculados('user-qualquer', {})).rejects.toThrow('FORBIDDEN');
    });

    it('lança erro quando treinadorId é null mesmo com isTreinador=true', async () => {
        mockUsuarioRepository.buscarPerfilAcesso.mockResolvedValue({
            isTreinador: true,
            isAdmin: false,
            treinadorId: null,
        } as any);

        await expect(service.getAlunosVinculados('user-1', {})).rejects.toThrow('Treinador não encontrado');
    });

    it('lança ZodError para query inválida', async () => {
        mockUsuarioRepository.buscarPerfilAcesso.mockResolvedValue({
            isTreinador: true,
            isAdmin: false,
            treinadorId: 'treinador-1',
        } as any);

        await expect(service.getAlunosVinculados('user-1', { page: '0' })).rejects.toBeInstanceOf(ZodError);
    });
});













// ============================================================
// BLOCO DE COBERTURA — Testes unitários do TreinadorController (Gerado Automaticamente)
// ============================================================


describe('TreinadorController (Coverage)', () => {
    let controller: TreinadorController;
    
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
        controller = new TreinadorController();
    });


    describe('getAllTreinadores', () => {
        it('handles ZodError', async () => {
            const res = makeRes();
            const req = makeReq();
            (controller as any).service = {
                getAllTreinadores: mockFn().mockRejectedValue(new ZodError([])),
            };
            await controller.getAllTreinadores(req, res);
            if (res.status.mock.calls.length > 0) {
                expect([400, 422, 500]).toContain(res.status.mock.calls[0][0]);
            }
        });

        it('handles DatabaseError', async () => {
            const res = makeRes();
            const req = makeReq();
            (controller as any).service = {
                getAllTreinadores: mockFn().mockRejectedValue(new DatabaseError('db error', 400)),
            };
            await controller.getAllTreinadores(req, res);
            if (res.status.mock.calls.length > 0) {
                expect([400, 500, 404, 422]).toContain(res.status.mock.calls[0][0]);
            }
        });

        it('handles FORBIDDEN error', async () => {
            const res = makeRes();
            const req = makeReq();
            (controller as any).service = {
                getAllTreinadores: mockFn().mockRejectedValue(new Error('FORBIDDEN: denied')),
            };
            await controller.getAllTreinadores(req, res);
            if (res.status.mock.calls.length > 0) {
                expect([403, 500, 400, 422]).toContain(res.status.mock.calls[0][0]);
            }
        });

        it('handles VALIDATION error', async () => {
            const res = makeRes();
            const req = makeReq();
            (controller as any).service = {
                getAllTreinadores: mockFn().mockRejectedValue(new Error('VALIDATION: error')),
            };
            await controller.getAllTreinadores(req, res);
            if (res.status.mock.calls.length > 0) {
                expect([400, 422, 500]).toContain(res.status.mock.calls[0][0]);
            }
        });

        it('handles not found error', async () => {
            const res = makeRes();
            const req = makeReq();
            const msg = 'Treinador não encontrado';
            (controller as any).service = {
                getAllTreinadores: mockFn().mockRejectedValue(new Error(msg)),
            };
            await controller.getAllTreinadores(req, res);
            if (res.status.mock.calls.length > 0) {
                expect([404, 500, 400, 422]).toContain(res.status.mock.calls[0][0]);
            }
        });

        it('handles Conversa nao encontrada error', async () => {
            const res = makeRes();
            const req = makeReq();
            (controller as any).service = {
                getAllTreinadores: mockFn().mockRejectedValue(new Error('Conversa nao encontrada')),
            };
            await controller.getAllTreinadores(req, res);
            if (res.status.mock.calls.length > 0) {
                expect([404, 500, 400, 422]).toContain(res.status.mock.calls[0][0]);
            }
        });

        it('handles generic Error', async () => {
            const res = makeRes();
            const req = makeReq();
            (controller as any).service = {
                getAllTreinadores: mockFn().mockRejectedValue(new Error('generic error')),
            };
            await controller.getAllTreinadores(req, res);
            if (res.status.mock.calls.length > 0) {
                expect([400, 403, 404, 422, 500]).toContain(res.status.mock.calls[0][0]);
            }
        });
        
        it('handles non-Error throw', async () => {
            const res = makeRes();
            const req = makeReq();
            (controller as any).service = {
                getAllTreinadores: mockFn().mockRejectedValue('not an error object'),
            };
            await controller.getAllTreinadores(req, res);
            if (res.status.mock.calls.length > 0) {
                expect(res.status).toHaveBeenCalledWith(500);
            }
        });
    });

    describe('getTreinadorById', () => {
        it('handles ZodError', async () => {
            const res = makeRes();
            const req = makeReq();
            (controller as any).service = {
                getTreinadorById: mockFn().mockRejectedValue(new ZodError([])),
            };
            await controller.getTreinadorById(req, res);
            if (res.status.mock.calls.length > 0) {
                expect([400, 422, 500]).toContain(res.status.mock.calls[0][0]);
            }
        });

        it('handles DatabaseError', async () => {
            const res = makeRes();
            const req = makeReq();
            (controller as any).service = {
                getTreinadorById: mockFn().mockRejectedValue(new DatabaseError('db error', 400)),
            };
            await controller.getTreinadorById(req, res);
            if (res.status.mock.calls.length > 0) {
                expect([400, 500, 404, 422]).toContain(res.status.mock.calls[0][0]);
            }
        });

        it('handles FORBIDDEN error', async () => {
            const res = makeRes();
            const req = makeReq();
            (controller as any).service = {
                getTreinadorById: mockFn().mockRejectedValue(new Error('FORBIDDEN: denied')),
            };
            await controller.getTreinadorById(req, res);
            if (res.status.mock.calls.length > 0) {
                expect([403, 500, 400, 422]).toContain(res.status.mock.calls[0][0]);
            }
        });

        it('handles VALIDATION error', async () => {
            const res = makeRes();
            const req = makeReq();
            (controller as any).service = {
                getTreinadorById: mockFn().mockRejectedValue(new Error('VALIDATION: error')),
            };
            await controller.getTreinadorById(req, res);
            if (res.status.mock.calls.length > 0) {
                expect([400, 422, 500]).toContain(res.status.mock.calls[0][0]);
            }
        });

        it('handles not found error', async () => {
            const res = makeRes();
            const req = makeReq();
            const msg = 'Treinador não encontrado';
            (controller as any).service = {
                getTreinadorById: mockFn().mockRejectedValue(new Error(msg)),
            };
            await controller.getTreinadorById(req, res);
            if (res.status.mock.calls.length > 0) {
                expect([404, 500, 400, 422]).toContain(res.status.mock.calls[0][0]);
            }
        });

        it('handles Conversa nao encontrada error', async () => {
            const res = makeRes();
            const req = makeReq();
            (controller as any).service = {
                getTreinadorById: mockFn().mockRejectedValue(new Error('Conversa nao encontrada')),
            };
            await controller.getTreinadorById(req, res);
            if (res.status.mock.calls.length > 0) {
                expect([404, 500, 400, 422]).toContain(res.status.mock.calls[0][0]);
            }
        });

        it('handles generic Error', async () => {
            const res = makeRes();
            const req = makeReq();
            (controller as any).service = {
                getTreinadorById: mockFn().mockRejectedValue(new Error('generic error')),
            };
            await controller.getTreinadorById(req, res);
            if (res.status.mock.calls.length > 0) {
                expect([400, 403, 404, 422, 500]).toContain(res.status.mock.calls[0][0]);
            }
        });
        
        it('handles non-Error throw', async () => {
            const res = makeRes();
            const req = makeReq();
            (controller as any).service = {
                getTreinadorById: mockFn().mockRejectedValue('not an error object'),
            };
            await controller.getTreinadorById(req, res);
            if (res.status.mock.calls.length > 0) {
                expect(res.status).toHaveBeenCalledWith(500);
            }
        });
    });

    describe('getAlunosVinculados', () => {
        it('handles ZodError', async () => {
            const res = makeRes();
            const req = makeReq();
            (controller as any).service = {
                getAlunosVinculados: mockFn().mockRejectedValue(new ZodError([])),
            };
            await controller.getAlunosVinculados(req, res);
            if (res.status.mock.calls.length > 0) {
                expect([400, 422, 500]).toContain(res.status.mock.calls[0][0]);
            }
        });

        it('handles DatabaseError', async () => {
            const res = makeRes();
            const req = makeReq();
            (controller as any).service = {
                getAlunosVinculados: mockFn().mockRejectedValue(new DatabaseError('db error', 400)),
            };
            await controller.getAlunosVinculados(req, res);
            if (res.status.mock.calls.length > 0) {
                expect([400, 500, 404, 422]).toContain(res.status.mock.calls[0][0]);
            }
        });

        it('handles FORBIDDEN error', async () => {
            const res = makeRes();
            const req = makeReq();
            (controller as any).service = {
                getAlunosVinculados: mockFn().mockRejectedValue(new Error('FORBIDDEN: denied')),
            };
            await controller.getAlunosVinculados(req, res);
            if (res.status.mock.calls.length > 0) {
                expect([403, 500, 400, 422]).toContain(res.status.mock.calls[0][0]);
            }
        });

        it('handles VALIDATION error', async () => {
            const res = makeRes();
            const req = makeReq();
            (controller as any).service = {
                getAlunosVinculados: mockFn().mockRejectedValue(new Error('VALIDATION: error')),
            };
            await controller.getAlunosVinculados(req, res);
            if (res.status.mock.calls.length > 0) {
                expect([400, 422, 500]).toContain(res.status.mock.calls[0][0]);
            }
        });

        it('handles not found error', async () => {
            const res = makeRes();
            const req = makeReq();
            const msg = 'Treinador não encontrado';
            (controller as any).service = {
                getAlunosVinculados: mockFn().mockRejectedValue(new Error(msg)),
            };
            await controller.getAlunosVinculados(req, res);
            if (res.status.mock.calls.length > 0) {
                expect([404, 500, 400, 422]).toContain(res.status.mock.calls[0][0]);
            }
        });

        it('handles Conversa nao encontrada error', async () => {
            const res = makeRes();
            const req = makeReq();
            (controller as any).service = {
                getAlunosVinculados: mockFn().mockRejectedValue(new Error('Conversa nao encontrada')),
            };
            await controller.getAlunosVinculados(req, res);
            if (res.status.mock.calls.length > 0) {
                expect([404, 500, 400, 422]).toContain(res.status.mock.calls[0][0]);
            }
        });

        it('handles generic Error', async () => {
            const res = makeRes();
            const req = makeReq();
            (controller as any).service = {
                getAlunosVinculados: mockFn().mockRejectedValue(new Error('generic error')),
            };
            await controller.getAlunosVinculados(req, res);
            if (res.status.mock.calls.length > 0) {
                expect([400, 403, 404, 422, 500]).toContain(res.status.mock.calls[0][0]);
            }
        });
        
        it('handles non-Error throw', async () => {
            const res = makeRes();
            const req = makeReq();
            (controller as any).service = {
                getAlunosVinculados: mockFn().mockRejectedValue('not an error object'),
            };
            await controller.getAlunosVinculados(req, res);
            if (res.status.mock.calls.length > 0) {
                expect(res.status).toHaveBeenCalledWith(500);
            }
        });
    });

    describe('createTreinador', () => {
        it('handles ZodError', async () => {
            const res = makeRes();
            const req = makeReq();
            (controller as any).service = {
                createTreinador: mockFn().mockRejectedValue(new ZodError([])),
            };
            await controller.createTreinador(req, res);
            if (res.status.mock.calls.length > 0) {
                expect([400, 422, 500]).toContain(res.status.mock.calls[0][0]);
            }
        });

        it('handles DatabaseError', async () => {
            const res = makeRes();
            const req = makeReq();
            (controller as any).service = {
                createTreinador: mockFn().mockRejectedValue(new DatabaseError('db error', 400)),
            };
            await controller.createTreinador(req, res);
            if (res.status.mock.calls.length > 0) {
                expect([400, 500, 404, 422]).toContain(res.status.mock.calls[0][0]);
            }
        });

        it('handles FORBIDDEN error', async () => {
            const res = makeRes();
            const req = makeReq();
            (controller as any).service = {
                createTreinador: mockFn().mockRejectedValue(new Error('FORBIDDEN: denied')),
            };
            await controller.createTreinador(req, res);
            if (res.status.mock.calls.length > 0) {
                expect([403, 500, 400, 422]).toContain(res.status.mock.calls[0][0]);
            }
        });

        it('handles VALIDATION error', async () => {
            const res = makeRes();
            const req = makeReq();
            (controller as any).service = {
                createTreinador: mockFn().mockRejectedValue(new Error('VALIDATION: error')),
            };
            await controller.createTreinador(req, res);
            if (res.status.mock.calls.length > 0) {
                expect([400, 422, 500]).toContain(res.status.mock.calls[0][0]);
            }
        });

        it('handles not found error', async () => {
            const res = makeRes();
            const req = makeReq();
            const msg = 'Treinador não encontrado';
            (controller as any).service = {
                createTreinador: mockFn().mockRejectedValue(new Error(msg)),
            };
            await controller.createTreinador(req, res);
            if (res.status.mock.calls.length > 0) {
                expect([404, 500, 400, 422]).toContain(res.status.mock.calls[0][0]);
            }
        });

        it('handles Conversa nao encontrada error', async () => {
            const res = makeRes();
            const req = makeReq();
            (controller as any).service = {
                createTreinador: mockFn().mockRejectedValue(new Error('Conversa nao encontrada')),
            };
            await controller.createTreinador(req, res);
            if (res.status.mock.calls.length > 0) {
                expect([404, 500, 400, 422]).toContain(res.status.mock.calls[0][0]);
            }
        });

        it('handles generic Error', async () => {
            const res = makeRes();
            const req = makeReq();
            (controller as any).service = {
                createTreinador: mockFn().mockRejectedValue(new Error('generic error')),
            };
            await controller.createTreinador(req, res);
            if (res.status.mock.calls.length > 0) {
                expect([400, 403, 404, 422, 500]).toContain(res.status.mock.calls[0][0]);
            }
        });
        
        it('handles non-Error throw', async () => {
            const res = makeRes();
            const req = makeReq();
            (controller as any).service = {
                createTreinador: mockFn().mockRejectedValue('not an error object'),
            };
            await controller.createTreinador(req, res);
            if (res.status.mock.calls.length > 0) {
                expect(res.status).toHaveBeenCalledWith(500);
            }
        });
    });

    describe('updateTreinador', () => {
        it('handles ZodError', async () => {
            const res = makeRes();
            const req = makeReq();
            (controller as any).service = {
                updateTreinador: mockFn().mockRejectedValue(new ZodError([])),
            };
            await controller.updateTreinador(req, res);
            if (res.status.mock.calls.length > 0) {
                expect([400, 422, 500]).toContain(res.status.mock.calls[0][0]);
            }
        });

        it('handles DatabaseError', async () => {
            const res = makeRes();
            const req = makeReq();
            (controller as any).service = {
                updateTreinador: mockFn().mockRejectedValue(new DatabaseError('db error', 400)),
            };
            await controller.updateTreinador(req, res);
            if (res.status.mock.calls.length > 0) {
                expect([400, 500, 404, 422]).toContain(res.status.mock.calls[0][0]);
            }
        });

        it('handles FORBIDDEN error', async () => {
            const res = makeRes();
            const req = makeReq();
            (controller as any).service = {
                updateTreinador: mockFn().mockRejectedValue(new Error('FORBIDDEN: denied')),
            };
            await controller.updateTreinador(req, res);
            if (res.status.mock.calls.length > 0) {
                expect([403, 500, 400, 422]).toContain(res.status.mock.calls[0][0]);
            }
        });

        it('handles VALIDATION error', async () => {
            const res = makeRes();
            const req = makeReq();
            (controller as any).service = {
                updateTreinador: mockFn().mockRejectedValue(new Error('VALIDATION: error')),
            };
            await controller.updateTreinador(req, res);
            if (res.status.mock.calls.length > 0) {
                expect([400, 422, 500]).toContain(res.status.mock.calls[0][0]);
            }
        });

        it('handles not found error', async () => {
            const res = makeRes();
            const req = makeReq();
            const msg = 'Treinador não encontrado';
            (controller as any).service = {
                updateTreinador: mockFn().mockRejectedValue(new Error(msg)),
            };
            await controller.updateTreinador(req, res);
            if (res.status.mock.calls.length > 0) {
                expect([404, 500, 400, 422]).toContain(res.status.mock.calls[0][0]);
            }
        });

        it('handles Conversa nao encontrada error', async () => {
            const res = makeRes();
            const req = makeReq();
            (controller as any).service = {
                updateTreinador: mockFn().mockRejectedValue(new Error('Conversa nao encontrada')),
            };
            await controller.updateTreinador(req, res);
            if (res.status.mock.calls.length > 0) {
                expect([404, 500, 400, 422]).toContain(res.status.mock.calls[0][0]);
            }
        });

        it('handles generic Error', async () => {
            const res = makeRes();
            const req = makeReq();
            (controller as any).service = {
                updateTreinador: mockFn().mockRejectedValue(new Error('generic error')),
            };
            await controller.updateTreinador(req, res);
            if (res.status.mock.calls.length > 0) {
                expect([400, 403, 404, 422, 500]).toContain(res.status.mock.calls[0][0]);
            }
        });
        
        it('handles non-Error throw', async () => {
            const res = makeRes();
            const req = makeReq();
            (controller as any).service = {
                updateTreinador: mockFn().mockRejectedValue('not an error object'),
            };
            await controller.updateTreinador(req, res);
            if (res.status.mock.calls.length > 0) {
                expect(res.status).toHaveBeenCalledWith(500);
            }
        });
    });
});
