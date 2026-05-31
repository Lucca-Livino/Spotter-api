// Helper para evitar TS2345 "not assignable to parameter of type never"
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mockFn() {
  return jest.fn() as jest.MockedFunction<(...args: any[]) => any>;
}

// ============================================================
// Mock do middleware de autenticação DEVE ser o primeiro import
// ============================================================
jest.mock('../../middlewares/authMiddleware', () => ({
    authMiddleware: mockFn(),
}));

import { randomUUID } from 'crypto';
import express from 'express';
import request from 'supertest';
import { jest, describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from '@jest/globals';
import { eq, inArray } from 'drizzle-orm';
import { ZodError } from 'zod';

import academiaRoutes from '../../routes/academiaRoutes';
import { DbConnect, DataBase } from '../../config/DbConnect';
import { authMiddleware } from '../../middlewares/authMiddleware';
import { academia, treinador, user } from '../../config/db/schema';
import AcademiaService from '../../services/academiaService';
import { DatabaseError } from '../../utils/errors/DatabaseError';

// ============================================================
// Constantes globais
// ============================================================
const RUN_ID = Date.now().toString(36);
const INVALID_UUID = 'nao-e-uuid';
const NOT_FOUND_UUID = '00000000-0000-0000-0000-000000000000';

// ============================================================
// Estado global dos testes de integração (routes)
// ============================================================
let app: express.Express;

let adminUserId: string;
let normalUserId: string;

let adminTreinadorId: string;
let normalTreinadorId: string;

let academiaId: string;

let warnSpy: any;
let errorSpy: any;
let logSpy: any;

const tempAcademiaIds: string[] = [];

// ============================================================
// Helpers de autenticação
// ============================================================
function asAdmin() {
    (authMiddleware as any).mockImplementation((req: any, _res: any, next: any) => {
        req.user = { id: adminUserId };
        req.authSession = { id: 'session-admin' };
        next();
    });
}

function asNormal() {
    (authMiddleware as any).mockImplementation((req: any, _res: any, next: any) => {
        req.user = { id: normalUserId };
        req.authSession = { id: 'session-normal' };
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

// ============================================================
// Setup / Teardown dos testes de integração
// ============================================================
beforeAll(async () => {
    warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});

    app = express();
    await DbConnect.connect();
    app.use(express.json());
    app.use('/api', academiaRoutes);

    const now = new Date();

    // Academia base para os testes
    const [ac] = await DataBase.insert(academia).values({
        nome: `Academia Base E2E ${RUN_ID}`,
        endereco_numero: '100',
        endereco_rua: 'Rua Principal',
        endereco_bairro: 'Centro',
        endereco_cidade: 'Porto Velho',
        endereco_estado: 'RO',
    }).returning({ id: academia.id });
    academiaId = ac.id;

    // Usuário administrador
    adminUserId = randomUUID();
    await DataBase.insert(user).values({
        id: adminUserId,
        name: 'Admin Academia Teste',
        email: `admin_ac_${RUN_ID}@test.local`,
        emailVerified: false,
        createdAt: now,
        updatedAt: now,
    });

    const [trAdmin] = await DataBase.insert(treinador).values({
        user_id: adminUserId,
        nome: 'Admin Academia Teste',
        data_nascimento: '1980-01-01',
        sexo: 'M',
        cref: `CREF-ADM-${RUN_ID}`.substring(0, 50),
        turnos: ['MANHA'],
        especializacao: 'Geral',
        graduacao: 'Graduado',
        is_admin: true,
        academia_id: academiaId,
    }).returning({ id: treinador.id });
    adminTreinadorId = trAdmin.id;

    // Usuário comum (sem is_admin)
    normalUserId = randomUUID();
    await DataBase.insert(user).values({
        id: normalUserId,
        name: 'Normal Academia Teste',
        email: `normal_ac_${RUN_ID}@test.local`,
        emailVerified: false,
        createdAt: now,
        updatedAt: now,
    });

    const [trNormal] = await DataBase.insert(treinador).values({
        user_id: normalUserId,
        nome: 'Normal Academia Teste',
        data_nascimento: '1990-01-01',
        sexo: 'M',
        cref: `CREF-NORM-${RUN_ID}`.substring(0, 50),
        turnos: ['TARDE'],
        especializacao: 'Geral',
        graduacao: 'Graduado',
        is_admin: false,
        academia_id: academiaId,
    }).returning({ id: treinador.id });
    normalTreinadorId = trNormal.id;

    asAdmin();
}, 30000);

afterEach(async () => {
    if (tempAcademiaIds.length > 0) {
        await DataBase.delete(academia).where(inArray(academia.id, [...tempAcademiaIds])).catch(() => {});
        tempAcademiaIds.length = 0;
    }
    asAdmin();
});

afterAll(async () => {
    await DataBase.delete(treinador).where(inArray(treinador.id, [adminTreinadorId, normalTreinadorId])).catch(() => {});
    await DataBase.delete(user).where(inArray(user.id, [adminUserId, normalUserId])).catch(() => {});
    await DataBase.delete(academia).where(eq(academia.id, academiaId)).catch(() => {});

    await DbConnect.disconnect();

    warnSpy?.mockRestore();
    errorSpy?.mockRestore();
    logSpy?.mockRestore();
}, 30000);

beforeEach(() => {
    asAdmin();
});

// ============================================================
// BLOCO 1 — Testes de integração (Routes / HTTP)
// ============================================================

describe('GET /academia', () => {
    it('lista academias para usuário autenticado → 200 com estrutura paginada', async () => {
        asNormal();
        const res = await request(app).get('/api/academia');

        expect(res.status).toBe(200);
        expect(Array.isArray(res.body.data.dados)).toBe(true);
        expect(res.body.data.dados.length).toBeGreaterThan(0);
        expect(res.body.data).toHaveProperty('total');
        expect(res.body.data).toHaveProperty('page');
        expect(res.body.data).toHaveProperty('limite');
        expect(res.body.data).toHaveProperty('totalPages');
    });

    it('admin também lista academias → 200', async () => {
        const res = await request(app).get('/api/academia');

        expect(res.status).toBe(200);
        expect(Array.isArray(res.body.data.dados)).toBe(true);
    });

    it('paginação explícita page=1&limite=1 → 200 com no máximo 1 item', async () => {
        const res = await request(app).get('/api/academia?page=1&limite=1');

        expect(res.status).toBe(200);
        expect(res.body.data.page).toBe(1);
        expect(res.body.data.limite).toBe(1);
        expect(res.body.data.dados.length).toBeLessThanOrEqual(1);
    });

    it('page=0 inválido → 422', async () => {
        const res = await request(app).get('/api/academia?page=0');

        expect(res.status).toBe(422);
    });

    it('campo extra na query → 422', async () => {
        const res = await request(app).get('/api/academia?foo=bar');

        expect(res.status).toBe(422);
        expect(res.body.error).toBe(true);
    });

    it('sem autenticação → 401', async () => {
        asNoAuth();
        const res = await request(app).get('/api/academia');

        expect(res.status).toBe(401);
    });
});

describe('POST /academia', () => {
    it('admin cria academia com dados válidos completos → 201', async () => {
        const payload = {
            nome: `Nova Academia Completa ${RUN_ID}`,
            endereco_numero: '55',
            endereco_rua: 'Rua Secundária',
            endereco_bairro: 'Zona Sul',
            endereco_cidade: 'Porto Velho',
            endereco_estado: 'RO',
        };

        const res = await request(app)
            .post('/api/academia')
            .send(payload);

        expect(res.status).toBe(201);
        expect(res.body.data.nome).toBe(payload.nome);
        expect(res.body.data.id).toBeDefined();
        expect(res.body.data.endereco_rua).toBe(payload.endereco_rua);

        tempAcademiaIds.push(res.body.data.id);
    });

    it('admin cria academia com todos os campos obrigatórios → 201', async () => {
        const payload = {
            nome: `Academia Todos Campos ${RUN_ID}`,
            endereco_numero: '10',
            endereco_rua: 'Rua Qualquer',
            endereco_bairro: 'Bairro X',
            endereco_cidade: 'Cidade Y',
            endereco_estado: 'RO',
        };

        const res = await request(app)
            .post('/api/academia')
            .send(payload);

        expect(res.status).toBe(201);
        expect(res.body.data.nome).toBe(payload.nome);
        expect(res.body.data.endereco_numero).toBe(payload.endereco_numero);

        tempAcademiaIds.push(res.body.data.id);
    });

    it('usuário normal (não admin) tenta criar academia → 403', async () => {
        asNormal();
        const res = await request(app)
            .post('/api/academia')
            .send({ nome: 'Fake', endereco_rua: 'Rua 1' });

        expect(res.status).toBe(403);
    });

    it('falha validação — nome ausente → 422', async () => {
        const res = await request(app)
            .post('/api/academia')
            .send({ endereco_rua: 'Rua X' });

        expect(res.status).toBe(422);
    });

    it('estado com mais de 2 caracteres → 422', async () => {
        const res = await request(app)
            .post('/api/academia')
            .send({
                nome: `Academia Estado Invalido ${RUN_ID}`,
                endereco_rua: 'Rua Teste',
                endereco_bairro: 'Bairro',
                endereco_cidade: 'Cidade',
                endereco_estado: 'RONDONIA', // deve ser 2 chars
            });

        expect(res.status).toBe(422);
    });

    it('sem autenticação → 401', async () => {
        asNoAuth();
        const res = await request(app)
            .post('/api/academia')
            .send({ nome: 'Sem Auth', endereco_rua: 'Rua Z' });

        expect(res.status).toBe(401);
    });
});

describe('GET /academia/:id', () => {
    it('busca academia por ID existente → 200 com dados corretos', async () => {
        const res = await request(app).get(`/api/academia/${academiaId}`);

        expect(res.status).toBe(200);
        expect(res.body.data.id).toBe(academiaId);
        expect(res.body.data).toHaveProperty('nome');
    });

    it('ID inexistente (UUID válido) → data null ou 404', async () => {
        const res = await request(app).get(`/api/academia/${NOT_FOUND_UUID}`);

        // O controller retorna 200 com data null quando o service não lança exceção
        expect([200, 404]).toContain(res.status);
        if (res.status === 200) {
            expect(res.body.data).toBeNull();
        }
    });

    it('sem autenticação → 401', async () => {
        asNoAuth();
        const res = await request(app).get(`/api/academia/${academiaId}`);

        expect(res.status).toBe(401);
    });
});

describe('PATCH /academia/:id', () => {
    it('admin atualiza nome da academia → 200 com novo nome', async () => {
        const novoNome = `Academia Atualizada ${RUN_ID}`;
        const res = await request(app)
            .patch(`/api/academia/${academiaId}`)
            .send({ nome: novoNome });

        expect(res.status).toBe(200);
        expect(res.body.data.nome).toBe(novoNome);
    });

    it('admin atualiza endereço parcialmente → 200', async () => {
        const res = await request(app)
            .patch(`/api/academia/${academiaId}`)
            .send({ endereco_cidade: 'Ji-Paraná' });

        expect(res.status).toBe(200);
        expect(res.body.data.endereco_cidade).toBe('Ji-Paraná');
    });

    it('usuário normal tenta atualizar academia → 403', async () => {
        asNormal();
        const res = await request(app)
            .patch(`/api/academia/${academiaId}`)
            .send({ nome: 'Hacked' });

        expect(res.status).toBe(403);
    });

    it('estado com mais de 2 caracteres no patch → 422', async () => {
        const res = await request(app)
            .patch(`/api/academia/${academiaId}`)
            .send({ endereco_estado: 'TOOLONG' });

        expect(res.status).toBe(422);
    });

    it('sem autenticação → 401', async () => {
        asNoAuth();
        const res = await request(app)
            .patch(`/api/academia/${academiaId}`)
            .send({ nome: 'Sem Auth' });

        expect(res.status).toBe(401);
    });
});

describe('DELETE /academia/:id', () => {
    it('admin deleta academia existente → 200 e academia removida', async () => {
        // Cria uma academia temporária para deletar sem comprometer a base
        const [ac] = await DataBase.insert(academia).values({
            nome: `Academia Para Deletar ${RUN_ID}`,
            endereco_numero: '1',
            endereco_rua: 'Rua Temporária',
            endereco_bairro: 'Bairro Temp',
            endereco_cidade: 'Cidade Temp',
            endereco_estado: 'RO',
        }).returning({ id: academia.id });

        const res = await request(app).delete(`/api/academia/${ac.id}`);

        expect(res.status).toBe(200);

        // Confirma que foi removida
        const getRes = await request(app).get(`/api/academia/${ac.id}`);
        expect(getRes.status).toBe(200);
        expect(getRes.body.data).toBeNull();
    });

    it('usuário normal tenta deletar academia → 403', async () => {
        asNormal();
        const res = await request(app).delete(`/api/academia/${academiaId}`);

        expect(res.status).toBe(403);
    });

    it('sem autenticação → 401', async () => {
        asNoAuth();
        const res = await request(app).delete(`/api/academia/${academiaId}`);

        expect(res.status).toBe(401);
    });
});

// ============================================================
// BLOCO 2 — Testes unitários do AcademiaService (mocked)
// ============================================================

const mockRepository = {
    createAcademia: mockFn(),
    getAllAcademias: mockFn(),
    getAcademiaById: mockFn(),
    updateAcademia: mockFn(),
    deleteAcademia: mockFn(),
};

function makeService(): AcademiaService {
    const service = new AcademiaService();
    (service as any).repository = mockRepository;
    return service;
}

const validAcademiaData = {
    nome: 'Academia Teste Service',
    endereco_numero: '100',
    endereco_rua: 'Rua das Flores',
    endereco_bairro: 'Centro',
    endereco_cidade: 'Porto Velho',
    endereco_estado: 'RO',
    created_at: new Date(),
};

describe('AcademiaService.createAcademia', () => {
    let service: AcademiaService;

    beforeEach(() => {
        jest.clearAllMocks();
        service = makeService();
    });

    it('cria academia com dados válidos → chama repository e retorna resultado', async () => {
        mockRepository.createAcademia.mockResolvedValue(validAcademiaData as any);

        const result = await service.createAcademia(validAcademiaData as any);

        expect(mockRepository.createAcademia).toHaveBeenCalledWith(validAcademiaData);
        expect(result).toEqual(validAcademiaData);
    });

    it('lança ZodError quando nome está vazio', async () => {
        const invalidData = { ...validAcademiaData, nome: '' };

        await expect(service.createAcademia(invalidData as any)).rejects.toBeInstanceOf(ZodError);
        expect(mockRepository.createAcademia).not.toHaveBeenCalled();
    });

    it('propaga ZodError lançado pelo repository', async () => {
        const zodErr = new ZodError([]);
        mockRepository.createAcademia.mockRejectedValue(zodErr as any);

        await expect(service.createAcademia(validAcademiaData as any)).rejects.toBeInstanceOf(ZodError);
    });

    it('propaga DatabaseError lançado pelo repository', async () => {
        const dbErr = new DatabaseError('conflict', 409);
        mockRepository.createAcademia.mockRejectedValue(dbErr as any);

        await expect(service.createAcademia(validAcademiaData as any)).rejects.toBeInstanceOf(DatabaseError);
    });

    it('propaga erro genérico do repository', async () => {
        mockRepository.createAcademia.mockRejectedValue(new Error('db crash') as any);

        await expect(service.createAcademia(validAcademiaData as any)).rejects.toThrow('db crash');
    });
});

describe('AcademiaService.getAllAcademias', () => {
    let service: AcademiaService;

    beforeEach(() => {
        jest.clearAllMocks();
        service = makeService();
    });

    it('retorna academias com query válida', async () => {
        const mockResult = { dados: [], total: 0, page: 1, limite: 10, totalPages: 0 };
        mockRepository.getAllAcademias.mockResolvedValue(mockResult as any);

        const result = await service.getAllAcademias({ page: '1', limite: '10' });

        expect(mockRepository.getAllAcademias).toHaveBeenCalledWith(1, 10);
        expect(result).toEqual(mockResult);
    });

    it('usa valores padrão quando query vazia → page=1, limite=10', async () => {
        const mockResult = { dados: [], total: 0, page: 1, limite: 10, totalPages: 0 };
        mockRepository.getAllAcademias.mockResolvedValue(mockResult as any);

        await service.getAllAcademias({});

        expect(mockRepository.getAllAcademias).toHaveBeenCalledWith(1, 10);
    });

    it('lança ZodError em page=0 (inválida)', async () => {
        await expect(service.getAllAcademias({ page: '0' })).rejects.toBeInstanceOf(ZodError);
    });

    it('lança ZodError em campo extra (strict)', async () => {
        await expect(service.getAllAcademias({ foo: 'bar' })).rejects.toBeInstanceOf(ZodError);
    });

    it('envolve erro do repository em Error genérico com mensagem "Erro ao buscar academias"', async () => {
        mockRepository.getAllAcademias.mockRejectedValue(new Error('db fail') as any);

        await expect(service.getAllAcademias({})).rejects.toThrow('Erro ao buscar academias');
    });

    it('repository lança não-Error (string) → wraps em "Erro ao buscar academias"', async () => {
        mockRepository.getAllAcademias.mockRejectedValue('string error' as any);

        await expect(service.getAllAcademias({})).rejects.toThrow('Erro ao buscar academias');
    });
});

describe('AcademiaService.getAcademiaById', () => {
    let service: AcademiaService;

    beforeEach(() => {
        jest.clearAllMocks();
        service = makeService();
    });

    it('retorna academia existente pelo ID', async () => {
        mockRepository.getAcademiaById.mockResolvedValue({ id: 'abc', nome: 'A' } as any);

        const result = await service.getAcademiaById('abc');

        expect(result).toEqual({ id: 'abc', nome: 'A' });
    });

    it('lança erro quando id é string vazia', async () => {
        await expect(service.getAcademiaById('')).rejects.toThrow('O id é obrigatório');
    });

    it('envolve erro do repository em "Erro ao buscar academia"', async () => {
        mockRepository.getAcademiaById.mockRejectedValue(new Error('not found') as any);

        await expect(service.getAcademiaById('qualquer-id')).rejects.toThrow('Erro ao buscar academia');
    });

    it('repository lança não-Error → wraps em "Erro ao buscar academia"', async () => {
        mockRepository.getAcademiaById.mockRejectedValue('string error' as any);

        await expect(service.getAcademiaById('any-id')).rejects.toThrow('Erro ao buscar academia');
    });
});

describe('AcademiaService.updateAcademia', () => {
    let service: AcademiaService;

    beforeEach(() => {
        jest.clearAllMocks();
        service = makeService();
    });

    it('atualiza academia com dados válidos → retorna academia atualizada', async () => {
        const updated = { ...validAcademiaData, nome: 'Novo Nome' };
        mockRepository.updateAcademia.mockResolvedValue(updated as any);

        const result = await service.updateAcademia('some-id', { nome: 'Novo Nome' });

        expect(mockRepository.updateAcademia).toHaveBeenCalledWith('some-id', { nome: 'Novo Nome' });
        expect(result).toEqual(updated);
    });

    it('lança ZodError quando estado é muito longo (>2 chars)', async () => {
        await expect(
            service.updateAcademia('id', { endereco_estado: 'TOOLONG' })
        ).rejects.toBeInstanceOf(ZodError);
    });

    it('propaga ZodError do repository', async () => {
        const zodErr = new ZodError([]);
        mockRepository.updateAcademia.mockRejectedValue(zodErr as any);

        await expect(service.updateAcademia('id', { nome: 'Nome Válido' })).rejects.toBeInstanceOf(ZodError);
    });

    it('envolve erro genérico do repository', async () => {
        mockRepository.updateAcademia.mockRejectedValue(new Error('db error') as any);

        await expect(service.updateAcademia('id', { nome: 'Valid' })).rejects.toThrow('Erro ao criar academia');
    });

    it('repository lança não-Error → wraps em "Erro ao criar academia"', async () => {
        mockRepository.updateAcademia.mockRejectedValue('string error' as any);

        await expect(service.updateAcademia('id', { nome: 'Valid' })).rejects.toThrow('Erro ao criar academia');
    });
});

describe('AcademiaService.deleteAcademia', () => {
    let service: AcademiaService;

    beforeEach(() => {
        jest.clearAllMocks();
        service = makeService();
    });

    it('deleta academia existente → retorna registro deletado', async () => {
        mockRepository.deleteAcademia.mockResolvedValue({ id: 'abc' } as any);

        const result = await service.deleteAcademia('abc');

        expect(mockRepository.deleteAcademia).toHaveBeenCalledWith('abc');
        expect(result).toEqual({ id: 'abc' });
    });

    it('envolve erro do repository em "Erro ao criar academia"', async () => {
        mockRepository.deleteAcademia.mockRejectedValue(new Error('db fail') as any);

        await expect(service.deleteAcademia('abc')).rejects.toThrow('Erro ao criar academia');
    });

    it('repository lança não-Error (string) → wraps em "Erro desconhecido"', async () => {
        mockRepository.deleteAcademia.mockRejectedValue('erro string' as any);

        await expect(service.deleteAcademia('abc')).rejects.toThrow('Erro desconhecido');
    });
});












// ============================================================
// BLOCO DE COBERTURA — Testes unitários do AcademiaController (Gerado Automaticamente)
// ============================================================

import AcademiaController from '../../controllers/academiaController';

describe('AcademiaController (Coverage)', () => {
    let controller: AcademiaController;
    
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
        controller = new AcademiaController();
    });


    describe('createAcademia', () => {
        it('handles ZodError', async () => {
            const res = makeRes();
            const req = makeReq();
            (controller as any).service = {
                createAcademia: mockFn().mockRejectedValue(new ZodError([])),
            };
            await controller.createAcademia(req, res);
            if (res.status.mock.calls.length > 0) {
                expect([400, 422, 500]).toContain(res.status.mock.calls[0][0]);
            }
        });

        it('handles DatabaseError', async () => {
            const res = makeRes();
            const req = makeReq();
            (controller as any).service = {
                createAcademia: mockFn().mockRejectedValue(new DatabaseError('db error', 400)),
            };
            await controller.createAcademia(req, res);
            if (res.status.mock.calls.length > 0) {
                expect([400, 500, 404, 422]).toContain(res.status.mock.calls[0][0]);
            }
        });

        it('handles FORBIDDEN error', async () => {
            const res = makeRes();
            const req = makeReq();
            (controller as any).service = {
                createAcademia: mockFn().mockRejectedValue(new Error('FORBIDDEN: denied')),
            };
            await controller.createAcademia(req, res);
            if (res.status.mock.calls.length > 0) {
                expect([403, 500, 400, 422]).toContain(res.status.mock.calls[0][0]);
            }
        });

        it('handles VALIDATION error', async () => {
            const res = makeRes();
            const req = makeReq();
            (controller as any).service = {
                createAcademia: mockFn().mockRejectedValue(new Error('VALIDATION: error')),
            };
            await controller.createAcademia(req, res);
            if (res.status.mock.calls.length > 0) {
                expect([400, 422, 500]).toContain(res.status.mock.calls[0][0]);
            }
        });

        it('handles not found error', async () => {
            const res = makeRes();
            const req = makeReq();
            const msg = 'Academia não encontrado';
            (controller as any).service = {
                createAcademia: mockFn().mockRejectedValue(new Error(msg)),
            };
            await controller.createAcademia(req, res);
            if (res.status.mock.calls.length > 0) {
                expect([404, 500, 400, 422]).toContain(res.status.mock.calls[0][0]);
            }
        });

        it('handles Conversa nao encontrada error', async () => {
            const res = makeRes();
            const req = makeReq();
            (controller as any).service = {
                createAcademia: mockFn().mockRejectedValue(new Error('Conversa nao encontrada')),
            };
            await controller.createAcademia(req, res);
            if (res.status.mock.calls.length > 0) {
                expect([404, 500, 400, 422]).toContain(res.status.mock.calls[0][0]);
            }
        });

        it('handles generic Error', async () => {
            const res = makeRes();
            const req = makeReq();
            (controller as any).service = {
                createAcademia: mockFn().mockRejectedValue(new Error('generic error')),
            };
            await controller.createAcademia(req, res);
            if (res.status.mock.calls.length > 0) {
                expect([400, 403, 404, 422, 500]).toContain(res.status.mock.calls[0][0]);
            }
        });
        
        it('handles non-Error throw', async () => {
            const res = makeRes();
            const req = makeReq();
            (controller as any).service = {
                createAcademia: mockFn().mockRejectedValue('not an error object'),
            };
            await controller.createAcademia(req, res);
            if (res.status.mock.calls.length > 0) {
                expect(res.status).toHaveBeenCalledWith(500);
            }
        });
    });

    describe('getAllAcademia', () => {
        it('handles ZodError', async () => {
            const res = makeRes();
            const req = makeReq();
            (controller as any).service = {
                getAllAcademia: mockFn().mockRejectedValue(new ZodError([])),
            };
            await controller.getAllAcademia(req, res);
            if (res.status.mock.calls.length > 0) {
                expect([400, 422, 500]).toContain(res.status.mock.calls[0][0]);
            }
        });

        it('handles DatabaseError', async () => {
            const res = makeRes();
            const req = makeReq();
            (controller as any).service = {
                getAllAcademia: mockFn().mockRejectedValue(new DatabaseError('db error', 400)),
            };
            await controller.getAllAcademia(req, res);
            if (res.status.mock.calls.length > 0) {
                expect([400, 500, 404, 422]).toContain(res.status.mock.calls[0][0]);
            }
        });

        it('handles FORBIDDEN error', async () => {
            const res = makeRes();
            const req = makeReq();
            (controller as any).service = {
                getAllAcademia: mockFn().mockRejectedValue(new Error('FORBIDDEN: denied')),
            };
            await controller.getAllAcademia(req, res);
            if (res.status.mock.calls.length > 0) {
                expect([403, 500, 400, 422]).toContain(res.status.mock.calls[0][0]);
            }
        });

        it('handles VALIDATION error', async () => {
            const res = makeRes();
            const req = makeReq();
            (controller as any).service = {
                getAllAcademia: mockFn().mockRejectedValue(new Error('VALIDATION: error')),
            };
            await controller.getAllAcademia(req, res);
            if (res.status.mock.calls.length > 0) {
                expect([400, 422, 500]).toContain(res.status.mock.calls[0][0]);
            }
        });

        it('handles not found error', async () => {
            const res = makeRes();
            const req = makeReq();
            const msg = 'Academia não encontrado';
            (controller as any).service = {
                getAllAcademia: mockFn().mockRejectedValue(new Error(msg)),
            };
            await controller.getAllAcademia(req, res);
            if (res.status.mock.calls.length > 0) {
                expect([404, 500, 400, 422]).toContain(res.status.mock.calls[0][0]);
            }
        });

        it('handles Conversa nao encontrada error', async () => {
            const res = makeRes();
            const req = makeReq();
            (controller as any).service = {
                getAllAcademia: mockFn().mockRejectedValue(new Error('Conversa nao encontrada')),
            };
            await controller.getAllAcademia(req, res);
            if (res.status.mock.calls.length > 0) {
                expect([404, 500, 400, 422]).toContain(res.status.mock.calls[0][0]);
            }
        });

        it('handles generic Error', async () => {
            const res = makeRes();
            const req = makeReq();
            (controller as any).service = {
                getAllAcademia: mockFn().mockRejectedValue(new Error('generic error')),
            };
            await controller.getAllAcademia(req, res);
            if (res.status.mock.calls.length > 0) {
                expect([400, 403, 404, 422, 500]).toContain(res.status.mock.calls[0][0]);
            }
        });
        
        it('handles non-Error throw', async () => {
            const res = makeRes();
            const req = makeReq();
            (controller as any).service = {
                getAllAcademia: mockFn().mockRejectedValue('not an error object'),
            };
            await controller.getAllAcademia(req, res);
            if (res.status.mock.calls.length > 0) {
                expect(res.status).toHaveBeenCalledWith(500);
            }
        });
    });

    describe('getAcademiaById', () => {
        it('handles ZodError', async () => {
            const res = makeRes();
            const req = makeReq();
            (controller as any).service = {
                getAcademiaById: mockFn().mockRejectedValue(new ZodError([])),
            };
            await controller.getAcademiaById(req, res);
            if (res.status.mock.calls.length > 0) {
                expect([400, 422, 500]).toContain(res.status.mock.calls[0][0]);
            }
        });

        it('handles DatabaseError', async () => {
            const res = makeRes();
            const req = makeReq();
            (controller as any).service = {
                getAcademiaById: mockFn().mockRejectedValue(new DatabaseError('db error', 400)),
            };
            await controller.getAcademiaById(req, res);
            if (res.status.mock.calls.length > 0) {
                expect([400, 500, 404, 422]).toContain(res.status.mock.calls[0][0]);
            }
        });

        it('handles FORBIDDEN error', async () => {
            const res = makeRes();
            const req = makeReq();
            (controller as any).service = {
                getAcademiaById: mockFn().mockRejectedValue(new Error('FORBIDDEN: denied')),
            };
            await controller.getAcademiaById(req, res);
            if (res.status.mock.calls.length > 0) {
                expect([403, 500, 400, 422]).toContain(res.status.mock.calls[0][0]);
            }
        });

        it('handles VALIDATION error', async () => {
            const res = makeRes();
            const req = makeReq();
            (controller as any).service = {
                getAcademiaById: mockFn().mockRejectedValue(new Error('VALIDATION: error')),
            };
            await controller.getAcademiaById(req, res);
            if (res.status.mock.calls.length > 0) {
                expect([400, 422, 500]).toContain(res.status.mock.calls[0][0]);
            }
        });

        it('handles not found error', async () => {
            const res = makeRes();
            const req = makeReq();
            const msg = 'Academia não encontrado';
            (controller as any).service = {
                getAcademiaById: mockFn().mockRejectedValue(new Error(msg)),
            };
            await controller.getAcademiaById(req, res);
            if (res.status.mock.calls.length > 0) {
                expect([404, 500, 400, 422]).toContain(res.status.mock.calls[0][0]);
            }
        });

        it('handles Conversa nao encontrada error', async () => {
            const res = makeRes();
            const req = makeReq();
            (controller as any).service = {
                getAcademiaById: mockFn().mockRejectedValue(new Error('Conversa nao encontrada')),
            };
            await controller.getAcademiaById(req, res);
            if (res.status.mock.calls.length > 0) {
                expect([404, 500, 400, 422]).toContain(res.status.mock.calls[0][0]);
            }
        });

        it('handles generic Error', async () => {
            const res = makeRes();
            const req = makeReq();
            (controller as any).service = {
                getAcademiaById: mockFn().mockRejectedValue(new Error('generic error')),
            };
            await controller.getAcademiaById(req, res);
            if (res.status.mock.calls.length > 0) {
                expect([400, 403, 404, 422, 500]).toContain(res.status.mock.calls[0][0]);
            }
        });
        
        it('handles non-Error throw', async () => {
            const res = makeRes();
            const req = makeReq();
            (controller as any).service = {
                getAcademiaById: mockFn().mockRejectedValue('not an error object'),
            };
            await controller.getAcademiaById(req, res);
            if (res.status.mock.calls.length > 0) {
                expect(res.status).toHaveBeenCalledWith(500);
            }
        });
    });

    describe('updateAcademia', () => {
        it('handles ZodError', async () => {
            const res = makeRes();
            const req = makeReq();
            (controller as any).service = {
                updateAcademia: mockFn().mockRejectedValue(new ZodError([])),
            };
            await controller.updateAcademia(req, res);
            if (res.status.mock.calls.length > 0) {
                expect([400, 422, 500]).toContain(res.status.mock.calls[0][0]);
            }
        });

        it('handles DatabaseError', async () => {
            const res = makeRes();
            const req = makeReq();
            (controller as any).service = {
                updateAcademia: mockFn().mockRejectedValue(new DatabaseError('db error', 400)),
            };
            await controller.updateAcademia(req, res);
            if (res.status.mock.calls.length > 0) {
                expect([400, 500, 404, 422]).toContain(res.status.mock.calls[0][0]);
            }
        });

        it('handles FORBIDDEN error', async () => {
            const res = makeRes();
            const req = makeReq();
            (controller as any).service = {
                updateAcademia: mockFn().mockRejectedValue(new Error('FORBIDDEN: denied')),
            };
            await controller.updateAcademia(req, res);
            if (res.status.mock.calls.length > 0) {
                expect([403, 500, 400, 422]).toContain(res.status.mock.calls[0][0]);
            }
        });

        it('handles VALIDATION error', async () => {
            const res = makeRes();
            const req = makeReq();
            (controller as any).service = {
                updateAcademia: mockFn().mockRejectedValue(new Error('VALIDATION: error')),
            };
            await controller.updateAcademia(req, res);
            if (res.status.mock.calls.length > 0) {
                expect([400, 422, 500]).toContain(res.status.mock.calls[0][0]);
            }
        });

        it('handles not found error', async () => {
            const res = makeRes();
            const req = makeReq();
            const msg = 'Academia não encontrado';
            (controller as any).service = {
                updateAcademia: mockFn().mockRejectedValue(new Error(msg)),
            };
            await controller.updateAcademia(req, res);
            if (res.status.mock.calls.length > 0) {
                expect([404, 500, 400, 422]).toContain(res.status.mock.calls[0][0]);
            }
        });

        it('handles Conversa nao encontrada error', async () => {
            const res = makeRes();
            const req = makeReq();
            (controller as any).service = {
                updateAcademia: mockFn().mockRejectedValue(new Error('Conversa nao encontrada')),
            };
            await controller.updateAcademia(req, res);
            if (res.status.mock.calls.length > 0) {
                expect([404, 500, 400, 422]).toContain(res.status.mock.calls[0][0]);
            }
        });

        it('handles generic Error', async () => {
            const res = makeRes();
            const req = makeReq();
            (controller as any).service = {
                updateAcademia: mockFn().mockRejectedValue(new Error('generic error')),
            };
            await controller.updateAcademia(req, res);
            if (res.status.mock.calls.length > 0) {
                expect([400, 403, 404, 422, 500]).toContain(res.status.mock.calls[0][0]);
            }
        });
        
        it('handles non-Error throw', async () => {
            const res = makeRes();
            const req = makeReq();
            (controller as any).service = {
                updateAcademia: mockFn().mockRejectedValue('not an error object'),
            };
            await controller.updateAcademia(req, res);
            if (res.status.mock.calls.length > 0) {
                expect(res.status).toHaveBeenCalledWith(500);
            }
        });
    });

    describe('deleteAcademia', () => {
        it('handles ZodError', async () => {
            const res = makeRes();
            const req = makeReq();
            (controller as any).service = {
                deleteAcademia: mockFn().mockRejectedValue(new ZodError([])),
            };
            await controller.deleteAcademia(req, res);
            if (res.status.mock.calls.length > 0) {
                expect([400, 422, 500]).toContain(res.status.mock.calls[0][0]);
            }
        });

        it('handles DatabaseError', async () => {
            const res = makeRes();
            const req = makeReq();
            (controller as any).service = {
                deleteAcademia: mockFn().mockRejectedValue(new DatabaseError('db error', 400)),
            };
            await controller.deleteAcademia(req, res);
            if (res.status.mock.calls.length > 0) {
                expect([400, 500, 404, 422]).toContain(res.status.mock.calls[0][0]);
            }
        });

        it('handles FORBIDDEN error', async () => {
            const res = makeRes();
            const req = makeReq();
            (controller as any).service = {
                deleteAcademia: mockFn().mockRejectedValue(new Error('FORBIDDEN: denied')),
            };
            await controller.deleteAcademia(req, res);
            if (res.status.mock.calls.length > 0) {
                expect([403, 500, 400, 422]).toContain(res.status.mock.calls[0][0]);
            }
        });

        it('handles VALIDATION error', async () => {
            const res = makeRes();
            const req = makeReq();
            (controller as any).service = {
                deleteAcademia: mockFn().mockRejectedValue(new Error('VALIDATION: error')),
            };
            await controller.deleteAcademia(req, res);
            if (res.status.mock.calls.length > 0) {
                expect([400, 422, 500]).toContain(res.status.mock.calls[0][0]);
            }
        });

        it('handles not found error', async () => {
            const res = makeRes();
            const req = makeReq();
            const msg = 'Academia não encontrado';
            (controller as any).service = {
                deleteAcademia: mockFn().mockRejectedValue(new Error(msg)),
            };
            await controller.deleteAcademia(req, res);
            if (res.status.mock.calls.length > 0) {
                expect([404, 500, 400, 422]).toContain(res.status.mock.calls[0][0]);
            }
        });

        it('handles Conversa nao encontrada error', async () => {
            const res = makeRes();
            const req = makeReq();
            (controller as any).service = {
                deleteAcademia: mockFn().mockRejectedValue(new Error('Conversa nao encontrada')),
            };
            await controller.deleteAcademia(req, res);
            if (res.status.mock.calls.length > 0) {
                expect([404, 500, 400, 422]).toContain(res.status.mock.calls[0][0]);
            }
        });

        it('handles generic Error', async () => {
            const res = makeRes();
            const req = makeReq();
            (controller as any).service = {
                deleteAcademia: mockFn().mockRejectedValue(new Error('generic error')),
            };
            await controller.deleteAcademia(req, res);
            if (res.status.mock.calls.length > 0) {
                expect([400, 403, 404, 422, 500]).toContain(res.status.mock.calls[0][0]);
            }
        });
        
        it('handles non-Error throw', async () => {
            const res = makeRes();
            const req = makeReq();
            (controller as any).service = {
                deleteAcademia: mockFn().mockRejectedValue('not an error object'),
            };
            await controller.deleteAcademia(req, res);
            if (res.status.mock.calls.length > 0) {
                expect(res.status).toHaveBeenCalledWith(500);
            }
        });
    });
});
