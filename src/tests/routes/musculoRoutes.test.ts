jest.mock('../../middlewares/authMiddleware', () => ({
    authMiddleware: jest.fn(),
}));

import { randomUUID } from 'crypto';
import express from 'express';
import request from 'supertest';
import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import musculoRoutes from '../../routes/musculoRoutes';
import { DbConnect, DataBase } from '../../config/DbConnect';
import { authMiddleware } from '../../middlewares/authMiddleware';
import {
    academia,
    aluno,
    treinador,
    exercicio,
    exercicio_musculo,
    musculo,
    user,
} from '../../config/db/schema';
import { eq, inArray } from 'drizzle-orm';

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

// Músculos seed
let musculoPeitoId: string;    // PEITO — 2 exercícios ativos (mais popular)
let musculoPeito2Id: string;   // PEITO — 1 ativo + 1 inativo
let musculoBracosId: string;   // BRAÇOS (Bíceps) — para filtro grupo_muscular
let musculoTricepsId: string;  // BRAÇOS (Tríceps) — para filtro nome "triceps"
let musculoCostasId: string;   // COSTAS
let musculoPernasId: string;   // PERNAS

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
    app.use('/api', musculoRoutes);

    const [ac] = await DataBase.insert(academia).values({
        nome: `Academia Musculo E2E ${RUN_ID}`,
        endereco_numero: '2',
        endereco_rua: 'Rua dos Músculos',
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
        name: 'Admin Musculo Teste',
        email: `admin_mu_${RUN_ID}@test.local`,
        emailVerified: false,
        createdAt: now,
        updatedAt: now,
    });
    const [adminRec] = await DataBase.insert(treinador).values({
        user_id: adminUserId,
        nome: 'Admin Musculo Teste',
        data_nascimento: '1980-01-01',
        sexo: 'M',
        cref: `ADM_MU_${RUN_ID}`.substring(0, 50),
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
        name: 'Aluno Musculo Teste',
        email: `aluno_mu_${RUN_ID}@test.local`,
        emailVerified: false,
        createdAt: now,
        updatedAt: now,
    });
    const [alunoRec] = await DataBase.insert(aluno).values({
        user_id: alunoUserId,
        nome: 'Aluno Musculo Teste',
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
        name: 'Treinador Musculo Teste',
        email: `treinador_mu_${RUN_ID}@test.local`,
        emailVerified: false,
        createdAt: now,
        updatedAt: now,
    });
    const [treinadorRec] = await DataBase.insert(treinador).values({
        user_id: treinadorUserId,
        nome: 'Treinador Musculo Teste',
        data_nascimento: '1985-03-15',
        sexo: 'M',
        cref: `TR_MU_${RUN_ID}`.substring(0, 50),
        turnos: ['TARDE'],
        especializacao: 'Musculação',
        graduacao: 'Educação Física',
        is_admin: false,
        academia_id: academiaId,
    }).returning({ id: treinador.id });
    treinadorRecId = treinadorRec.id;

    // Músculos seed (6 para garantir paginação com page=2&limite=2)
    const [mPeito] = await DataBase.insert(musculo).values({
        nome: `Peitoral MU ${RUN_ID}`,
        grupo_muscular: 'PEITO',
    }).returning({ id: musculo.id });
    musculoPeitoId = mPeito.id;

    const [mPeito2] = await DataBase.insert(musculo).values({
        nome: `Peitoral2 MU ${RUN_ID}`,
        grupo_muscular: 'PEITO',
    }).returning({ id: musculo.id });
    musculoPeito2Id = mPeito2.id;

    const [mBracos] = await DataBase.insert(musculo).values({
        nome: `Bíceps MU ${RUN_ID}`,
        grupo_muscular: 'BRAÇOS',
    }).returning({ id: musculo.id });
    musculoBracosId = mBracos.id;

    const [mTriceps] = await DataBase.insert(musculo).values({
        nome: `Tríceps MU ${RUN_ID}`,
        grupo_muscular: 'BRAÇOS',
    }).returning({ id: musculo.id });
    musculoTricepsId = mTriceps.id;

    const [mCostas] = await DataBase.insert(musculo).values({
        nome: `Costas MU ${RUN_ID}`,
        grupo_muscular: 'COSTAS',
    }).returning({ id: musculo.id });
    musculoCostasId = mCostas.id;

    const [mPernas] = await DataBase.insert(musculo).values({
        nome: `Pernas MU ${RUN_ID}`,
        grupo_muscular: 'PERNAS',
    }).returning({ id: musculo.id });
    musculoPernasId = mPernas.id;

    // Exercícios seed
    const [ex1] = await DataBase.insert(exercicio).values({
        nome: `Exercicio Ativo1 MU ${RUN_ID}`,
        aluno_id: null,
    }).returning({ id: exercicio.id });
    exAtivo1Id = ex1.id;

    const [ex2] = await DataBase.insert(exercicio).values({
        nome: `Exercicio Ativo2 MU ${RUN_ID}`,
        aluno_id: null,
    }).returning({ id: exercicio.id });
    exAtivo2Id = ex2.id;

    const [ex3] = await DataBase.insert(exercicio).values({
        nome: `Exercicio Ativo3 MU ${RUN_ID}`,
        aluno_id: null,
    }).returning({ id: exercicio.id });
    exAtivo3Id = ex3.id;

    const [exInativo] = await DataBase.insert(exercicio).values({
        nome: `Exercicio Inativo MU ${RUN_ID}`,
        aluno_id: null,
        deletado_em: new Date(),
    }).returning({ id: exercicio.id });
    exInativoId = exInativo.id;

    // Vínculos exercício-músculo:
    // musculoPeito ← exAtivo1 (PRIMARIO) + exAtivo2 (SECUNDARIO) → popularidade = 2
    await DataBase.insert(exercicio_musculo).values({
        exercicio_id: exAtivo1Id,
        musculo_id: musculoPeitoId,
        tipo_ativacao: 'PRIMARIO',
    });
    await DataBase.insert(exercicio_musculo).values({
        exercicio_id: exAtivo2Id,
        musculo_id: musculoPeitoId,
        tipo_ativacao: 'SECUNDARIO',
    });
    // musculoPeito2 ← exAtivo3 (PRIMARIO) + exInativo (PRIMARIO) → popularidade = 1
    await DataBase.insert(exercicio_musculo).values({
        exercicio_id: exAtivo3Id,
        musculo_id: musculoPeito2Id,
        tipo_ativacao: 'PRIMARIO',
    });
    await DataBase.insert(exercicio_musculo).values({
        exercicio_id: exInativoId,
        musculo_id: musculoPeito2Id,
        tipo_ativacao: 'PRIMARIO',
    });
    // musculoBracos, musculoTriceps, musculoCostas, musculoPernas: sem vínculos

    asAdmin();
}, 30000);

afterAll(async () => {
    await DataBase.delete(exercicio_musculo)
        .where(inArray(exercicio_musculo.exercicio_id, [exAtivo1Id, exAtivo2Id, exAtivo3Id, exInativoId]))
        .catch(() => {});

    await DataBase.delete(exercicio)
        .where(inArray(exercicio.id, [exAtivo1Id, exAtivo2Id, exAtivo3Id, exInativoId]))
        .catch(() => {});

    await DataBase.delete(musculo)
        .where(inArray(musculo.id, [musculoPeitoId, musculoPeito2Id, musculoBracosId, musculoTricepsId, musculoCostasId, musculoPernasId]))
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

// GET /musculos
describe('GET /musculos', () => {

    // ── Cenários felizes ──────────────────────────────────────────

    it('aluno autenticado lista músculos → 200 com estrutura paginada', async () => {
        asAluno();
        const res = await request(app).get('/api/musculos');

        expect(res.status).toBe(200);
        expect(res.body.data).toHaveProperty('dados');
        expect(res.body.data).toHaveProperty('total');
        expect(res.body.data).toHaveProperty('page');
        expect(res.body.data).toHaveProperty('limite');
        expect(res.body.data).toHaveProperty('totalPages');
        expect(Array.isArray(res.body.data.dados)).toBe(true);
    });

    it('treinador autenticado lista músculos → 200 com estrutura paginada', async () => {
        asTreinador();
        const res = await request(app).get('/api/musculos');

        expect(res.status).toBe(200);
        expect(res.body.data).toHaveProperty('dados');
        expect(Array.isArray(res.body.data.dados)).toBe(true);
    });

    it('parâmetros padrão quando query omitida → 200 com page=1 e limite=20', async () => {
        const res = await request(app).get('/api/musculos');

        expect(res.status).toBe(200);
        expect(res.body.data.page).toBe(1);
        expect(res.body.data.limite).toBe(20);
    });

    it('paginação explícita page=2&limite=2 → 200 com no máximo 2 itens e metadados coerentes', async () => {
        const res = await request(app).get('/api/musculos?page=2&limite=2');

        expect(res.status).toBe(200);
        expect(res.body.data.dados.length).toBeLessThanOrEqual(2);
        expect(res.body.data.page).toBe(2);
        expect(res.body.data.limite).toBe(2);
        expect(res.body.data).toHaveProperty('total');
        expect(res.body.data).toHaveProperty('totalPages');
    });

    it('filtro por nome accent-insensitive → 200 retorna músculo "Tríceps" ao buscar "triceps"', async () => {
        const res = await request(app).get('/api/musculos?nome=triceps');

        expect(res.status).toBe(200);
        const ids = res.body.data.dados.map((m: any) => m.id);
        expect(ids).toContain(musculoTricepsId);
    });

    it('filtro por grupo_muscular canônico → 200 com apenas músculos do grupo PEITO', async () => {
        const res = await request(app).get('/api/musculos?grupo_muscular=PEITO&limite=100');

        expect(res.status).toBe(200);
        const dados = res.body.data.dados;
        expect(dados.length).toBeGreaterThan(0);
        dados.forEach((m: any) => expect(m.grupo_muscular).toBe('PEITO'));
    });

    it('filtro grupo_muscular com normalização "bracos" → 200 com grupo_muscular=BRAÇOS', async () => {
        const res = await request(app).get('/api/musculos?grupo_muscular=bracos&limite=100');

        expect(res.status).toBe(200);
        const dados = res.body.data.dados;
        expect(dados.length).toBeGreaterThan(0);
        dados.forEach((m: any) => expect(m.grupo_muscular).toBe('BRAÇOS'));
    });

    it('filtro grupo_muscular com normalização "Braços" → 200 com grupo_muscular=BRAÇOS', async () => {
        const res = await request(app).get('/api/musculos?grupo_muscular=Bra%C3%A7os&limite=100');

        expect(res.status).toBe(200);
        const dados = res.body.data.dados;
        expect(dados.length).toBeGreaterThan(0);
        dados.forEach((m: any) => expect(m.grupo_muscular).toBe('BRAÇOS'));
    });

    it('ordenação nome_desc → 200 com nomes em ordem decrescente', async () => {
        // Filtra pela RUN_ID para evitar interferência de outros dados no banco
        const res = await request(app).get(`/api/musculos?ordem=nome_desc&nome=MU+${RUN_ID}&limite=100`);

        expect(res.status).toBe(200);
        const nomes = res.body.data.dados.map((m: any) => m.nome);
        expect(nomes.length).toBeGreaterThan(1);
        const sorted = [...nomes].sort((a, b) => b.localeCompare(a));
        expect(nomes).toEqual(sorted);
    });

    it('ordenação popularidade_desc → 200 com músculo mais popular (2 ativos) antes do menos popular (1 ativo)', async () => {
        const res = await request(app).get('/api/musculos?ordem=popularidade_desc&limite=100');

        expect(res.status).toBe(200);
        const ids = res.body.data.dados.map((m: any) => m.id);
        const posPeito = ids.indexOf(musculoPeitoId);
        const posPeito2 = ids.indexOf(musculoPeito2Id);
        expect(posPeito).toBeGreaterThanOrEqual(0);
        expect(posPeito2).toBeGreaterThanOrEqual(0);
        expect(posPeito).toBeLessThan(posPeito2);
    });

    it('popularidade_desc ignora exercícios inativos → musculoPeito (2 ativos) antes de musculoPeito2 (1 ativo + 1 inativo)', async () => {
        // musculoPeito2 tem exercicioInativo vinculado, mas este não deve contar na popularidade
        const res = await request(app).get('/api/musculos?ordem=popularidade_desc&limite=100');

        expect(res.status).toBe(200);
        const dados = res.body.data.dados;
        const posPeito = dados.findIndex((m: any) => m.id === musculoPeitoId);
        const posPeito2 = dados.findIndex((m: any) => m.id === musculoPeito2Id);
        expect(posPeito).toBeGreaterThanOrEqual(0);
        expect(posPeito2).toBeGreaterThanOrEqual(0);
        // musculoPeito tem 2 exercícios ativos, musculoPeito2 tem 1 (inativo não conta)
        expect(posPeito).toBeLessThan(posPeito2);
    });

    it('incluir_contagem_grupo=true → 200 com contagem_por_grupo contendo os 6 grupos', async () => {
        const res = await request(app).get('/api/musculos?incluir_contagem_grupo=true');

        expect(res.status).toBe(200);
        const contagem = res.body.data.contagem_por_grupo;
        expect(contagem).toBeDefined();
        const gruposEsperados = ['PEITO', 'COSTAS', 'PERNAS', 'BRAÇOS', 'OMBROS', 'ABDOMEN'];
        gruposEsperados.forEach((grupo) => {
            expect(contagem).toHaveProperty(grupo);
            expect(typeof contagem[grupo]).toBe('number');
        });
    });

    it('contagem_por_grupo independente do filtro de nome → totais globais mesmo com dados filtrados', async () => {
        const res = await request(app).get('/api/musculos?nome=Peitoral&incluir_contagem_grupo=true&limite=100');

        expect(res.status).toBe(200);
        // dados filtrado pelo nome
        const dados = res.body.data.dados;
        dados.forEach((m: any) => expect(m.nome.toLowerCase()).toMatch(/peitoral/i));
        // contagem_por_grupo deve refletir o total global de todos os músculos, não apenas os filtrados
        const contagem = res.body.data.contagem_por_grupo;
        expect(contagem).toBeDefined();
        // BRAÇOS deve ter contagem > 0 pois temos musculoBracos e musculoTriceps no banco
        expect(contagem['BRAÇOS']).toBeGreaterThan(0);
    });

    it('paginação alfanumérica page=2abc&limite=3xyz → 200 com page=2 e limite=3', async () => {
        const res = await request(app).get('/api/musculos?page=2abc&limite=3xyz');

        expect(res.status).toBe(200);
        expect(res.body.data.page).toBe(2);
        expect(res.body.data.limite).toBe(3);
    });

    it('filtro restritivo sem resultados → 200 com dados=[], total=0 e totalPages=0', async () => {
        const res = await request(app).get('/api/musculos?nome=musculo-que-nao-existe-xyz-abc');

        expect(res.status).toBe(200);
        expect(res.body.data.dados).toEqual([]);
        expect(res.body.data.total).toBe(0);
        expect(res.body.data.totalPages).toBe(0);
    });

    // ── Cenários tristes ──────────────────────────────────────────

    it('grupo_muscular fora do enum → 422', async () => {
        const res = await request(app).get('/api/musculos?grupo_muscular=PESCOCO');

        expect(res.status).toBe(422);
    });

    it('ordem fora do enum → 422', async () => {
        const res = await request(app).get('/api/musculos?ordem=asc');

        expect(res.status).toBe(422);
    });

    it('page=0 inválido → 422 com mensagem correta', async () => {
        const res = await request(app).get('/api/musculos?page=0');

        expect(res.status).toBe(422);
        const messages = res.body.errors.map((e: any) => e.message);
        expect(messages.join(' ')).toMatch(/page deve ser um número inteiro maior que 0/i);
    });

    it('limite=101 acima do máximo → 422 com mensagem correta', async () => {
        const res = await request(app).get('/api/musculos?limite=101');

        expect(res.status).toBe(422);
        const messages = res.body.errors.map((e: any) => e.message);
        expect(messages.join(' ')).toMatch(/limite deve ser entre 1 e 100/i);
    });

    it('limite=abc não numérico → 422 com mensagem correta', async () => {
        const res = await request(app).get('/api/musculos?limite=abc');

        expect(res.status).toBe(422);
        const messages = res.body.errors.map((e: any) => e.message);
        expect(messages.join(' ')).toMatch(/limite deve ser entre 1 e 100/i);
    });

    it('campo extra na query (.strict()) → 422', async () => {
        const res = await request(app).get('/api/musculos?foo=bar');

        expect(res.status).toBe(422);
    });

    it('requisição sem header Authorization → 401', async () => {
        asNoAuth();
        const res = await request(app).get('/api/musculos');

        expect(res.status).toBe(401);
    });
});

// GET /musculos/:id
describe('GET /musculos/:id', () => {

    // ── Cenários felizes ──────────────────────────────────────────

    it('usuário autenticado consulta músculo existente → 200 com id, nome, grupo_muscular e exercicios', async () => {
        asAluno();
        const res = await request(app).get(`/api/musculos/${musculoPeitoId}`);

        expect(res.status).toBe(200);
        expect(res.body.data).toHaveProperty('id', musculoPeitoId);
        expect(res.body.data).toHaveProperty('nome');
        expect(res.body.data).toHaveProperty('grupo_muscular');
        expect(Array.isArray(res.body.data.exercicios)).toBe(true);
    });

    it('exercícios vinculados incluem tipo_ativacao → cada item de exercicios contém tipo_ativacao', async () => {
        const res = await request(app).get(`/api/musculos/${musculoPeitoId}`);

        expect(res.status).toBe(200);
        const exercicios = res.body.data.exercicios;
        expect(exercicios.length).toBeGreaterThan(0);
        exercicios.forEach((e: any) => {
            expect(e).toHaveProperty('tipo_ativacao');
            expect(['PRIMARIO', 'SECUNDARIO']).toContain(e.tipo_ativacao);
        });
    });

    it('detalhe exclui exercícios inativos → musculoPeito2 retorna apenas exercício ativo (exAtivo3)', async () => {
        const res = await request(app).get(`/api/musculos/${musculoPeito2Id}`);

        expect(res.status).toBe(200);
        const exercicioIds = res.body.data.exercicios.map((e: any) => e.exercicio_id);
        expect(exercicioIds).toContain(exAtivo3Id);
        expect(exercicioIds).not.toContain(exInativoId);
    });

    it('músculo sem exercícios vinculados → 200 com exercicios=[]', async () => {
        const res = await request(app).get(`/api/musculos/${musculoCostasId}`);

        expect(res.status).toBe(200);
        expect(res.body.data.exercicios).toEqual([]);
    });

    // ── Cenários tristes ──────────────────────────────────────────

    it('ID inexistente (UUID válido) → 404 com mensagem "Músculo não encontrado"', async () => {
        const res = await request(app).get(`/api/musculos/${NOT_FOUND_UUID}`);

        expect(res.status).toBe(404);
        expect(res.body.message).toMatch(/músculo não encontrado/i);
    });

    it('ID com formato inválido → 422 com mensagem "ID inválido"', async () => {
        const res = await request(app).get(`/api/musculos/${INVALID_UUID}`);

        expect(res.status).toBe(422);
        expect(res.body.message).toMatch(/id inválido/i);
    });

    it('requisição sem header Authorization → 401', async () => {
        asNoAuth();
        const res = await request(app).get(`/api/musculos/${musculoPeitoId}`);

        expect(res.status).toBe(401);
    });
});
