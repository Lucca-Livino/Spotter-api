import { randomUUID } from 'crypto';
import { spawn, ChildProcessWithoutNullStreams } from 'child_process';
import request from 'supertest';
import { inArray } from 'drizzle-orm';
import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import { DbConnect, DataBase } from '../../config/DbConnect';
import { user } from '../../config/db/schema';

const RUN_ID = Date.now().toString(36);
const ORIGIN = 'http://localhost:3000';
const TEST_PORT = 1450;
const BASE_URL = `http://localhost:${TEST_PORT}`;

let serverProcess: ChildProcessWithoutNullStreams | null = null;
const createdEmails = new Set<string>();

type AuthUserPayload = {
    name: string;
    email: string;
    password: string;
};

type AuthSession = {
    token?: string;
    cookie?: string;
    userId?: string;
    email?: string;
};

function buildUserPayload(prefix = 'auth'): AuthUserPayload {
    return {
        name: `Teste ${prefix} ${RUN_ID}`,
        email: `${prefix}_${RUN_ID}_${randomUUID()}@test.local`,
        password: 'SenhaForte123!',
    };
}

function buildHeaders(session: AuthSession, useBearer = true, useCookie = true): Record<string, string> {
    const headers: Record<string, string> = {};

    if (useBearer && session.token) {
        headers.Authorization = `Bearer ${session.token}`;
    }

    if (useCookie && session.cookie) {
        headers.Cookie = session.cookie;
    }

    return headers;
}

async function signUpUser(prefix = 'signup'): Promise<AuthSession & AuthUserPayload> {
    const payload = buildUserPayload(prefix);
    createdEmails.add(payload.email);

    const res = await request(BASE_URL)
        .post('/api/auth/sign-up/email')
        .send(payload);

    if (res.status !== 200) {
        throw new Error(`Falha ao cadastrar usuário de teste (${res.status}): ${JSON.stringify(res.body)}`);
    }

    return {
        ...payload,
        token: res.body?.token,
        cookie: res.headers['set-cookie']?.[0],
        userId: res.body?.user?.id,
        email: res.body?.user?.email,
    };
}

async function signInUser(email: string, password: string): Promise<AuthSession> {
    const res = await request(BASE_URL)
        .post('/api/auth/sign-in/email')
        .send({ email, password });

    if (res.status !== 200) {
        throw new Error(`Falha ao logar usuário de teste (${res.status}): ${JSON.stringify(res.body)}`);
    }

    return {
        token: res.body?.token,
        cookie: res.headers['set-cookie']?.[0],
        userId: res.body?.user?.id,
        email: res.body?.user?.email,
    };
}

async function waitForServerReady(timeoutMs = 30000): Promise<void> {
    const startedAt = Date.now();

    while (Date.now() - startedAt < timeoutMs) {
        if (serverProcess && serverProcess.exitCode !== null) {
            throw new Error('Servidor finalizou antes de aceitar conexões.');
        }

        try {
            const res = await request(BASE_URL).get('/api');
            if (res.status >= 200 && res.status < 500) {
                return;
            }
        } catch {
            // Aguarda o processo terminar o bootstrap.
        }

        await new Promise((resolve) => setTimeout(resolve, 500));
    }

    throw new Error(`Servidor não iniciou em ${timeoutMs}ms.`);
}

async function stopServer(): Promise<void> {
    if (!serverProcess) return;
    if (serverProcess.exitCode !== null) return;

    await new Promise<void>((resolve) => {
        const proc = serverProcess;
        const timeout = setTimeout(() => {
            if (proc.exitCode === null) {
                proc.kill('SIGKILL');
            }
            resolve();
        }, 5000);

        proc.once('exit', () => {
            clearTimeout(timeout);
            resolve();
        });

        proc.kill('SIGTERM');
    });
}

beforeAll(async () => {
    await DbConnect.connect();

    const databaseUrl = process.env.DATABASE_URL_TEST || process.env.DATABASE_URL;
    if (!databaseUrl) {
        throw new Error('DATABASE_URL_TEST ou DATABASE_URL deve estar definido para os testes e2e de auth.');
    }

    serverProcess = spawn('npx', ['tsx', 'src/server.ts'], {
        cwd: process.cwd(),
        env: {
            ...process.env,
            NODE_ENV: 'development',
            PORT: `${TEST_PORT}`,
            DATABASE_URL: databaseUrl,
            BETTER_AUTH_URL: BASE_URL,
        },
        stdio: 'ignore',
    });

    await waitForServerReady();
}, 30000);

afterAll(async () => {
    if (createdEmails.size > 0) {
        await DataBase.delete(user)
            .where(inArray(user.email, [...createdEmails]))
            .catch(() => {});
    }

    await stopServer();
    await DbConnect.disconnect();
}, 30000);

describe('POST /api/auth/sign-up/email', () => {
    it('cadastro com payload válido retorna 200 com token, user e cookie de sessão', async () => {
        const payload = buildUserPayload('signup_ok');
        createdEmails.add(payload.email);

        const res = await request(BASE_URL)
            .post('/api/auth/sign-up/email')
            .send(payload);

        expect(res.status).toBe(200);
        expect(typeof res.body?.token).toBe('string');
        expect(res.body?.user).toMatchObject({
            name: payload.name,
            email: payload.email,
        });
        expect(res.headers['set-cookie']?.[0]).toMatch(/better-auth\.session_token=/i);
    });

    it('cadastro duplicado para mesmo email retorna 422', async () => {
        const payload = buildUserPayload('signup_dup');
        createdEmails.add(payload.email);

        const first = await request(BASE_URL)
            .post('/api/auth/sign-up/email')
            .send(payload);
        expect(first.status).toBe(200);

        const second = await request(BASE_URL)
            .post('/api/auth/sign-up/email')
            .send(payload);

        expect(second.status).toBe(422);
        expect(second.body?.code).toBe('USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL');
    });

    it('cadastro sem email retorna 400 com erro de validação', async () => {
        const res = await request(BASE_URL)
            .post('/api/auth/sign-up/email')
            .send({ name: 'Sem Email', password: 'SenhaForte123!' });

        expect(res.status).toBe(400);
        expect(res.body?.code).toBe('VALIDATION_ERROR');
    });

    it('cadastro sem nome retorna 400 com erro de validação', async () => {
        const email = `signup_sem_nome_${RUN_ID}_${randomUUID()}@test.local`;
        const res = await request(BASE_URL)
            .post('/api/auth/sign-up/email')
            .send({ email, password: 'SenhaForte123!' });

        expect(res.status).toBe(400);
        expect(res.body?.code).toBe('VALIDATION_ERROR');
    });

    it('cadastro com email inválido retorna 400', async () => {
        const res = await request(BASE_URL)
            .post('/api/auth/sign-up/email')
            .send({ name: 'Email Inválido', email: 'nao-e-email', password: 'SenhaForte123!' });

        expect(res.status).toBe(400);
        expect(res.body?.code).toBe('VALIDATION_ERROR');
    });

    it('cadastro com senha curta retorna 400', async () => {
        const email = `signup_senha_curta_${RUN_ID}_${randomUUID()}@test.local`;
        const res = await request(BASE_URL)
            .post('/api/auth/sign-up/email')
            .send({ name: 'Senha Curta', email, password: '123' });

        expect(res.status).toBe(400);
        expect(res.body?.code).toBe('PASSWORD_TOO_SHORT');
    });
});

describe('POST /api/auth/sign-in/email', () => {
    it('login com credenciais válidas retorna 200 com token, user e cookie', async () => {
        const userData = await signUpUser('signin_ok');

        const res = await request(BASE_URL)
            .post('/api/auth/sign-in/email')
            .send({ email: userData.email, password: userData.password });

        expect(res.status).toBe(200);
        expect(res.body).toMatchObject({
            redirect: false,
            user: {
                email: userData.email,
            },
        });
        expect(typeof res.body?.token).toBe('string');
        expect(res.headers['set-cookie']?.[0]).toMatch(/better-auth\.session_token=/i);
    });

    it('login com senha inválida retorna 401', async () => {
        const userData = await signUpUser('signin_senha_invalida');

        const res = await request(BASE_URL)
            .post('/api/auth/sign-in/email')
            .send({ email: userData.email, password: 'SenhaErrada999!' });

        expect(res.status).toBe(401);
        expect(res.body?.code).toBe('INVALID_EMAIL_OR_PASSWORD');
    });

    it('login para usuário inexistente retorna 401', async () => {
        const res = await request(BASE_URL)
            .post('/api/auth/sign-in/email')
            .send({
                email: `inexistente_${RUN_ID}_${randomUUID()}@test.local`,
                password: 'SenhaForte123!',
            });

        expect(res.status).toBe(401);
        expect(res.body?.code).toBe('INVALID_EMAIL_OR_PASSWORD');
    });

    it('login sem email retorna 400', async () => {
        const res = await request(BASE_URL)
            .post('/api/auth/sign-in/email')
            .send({ password: 'SenhaForte123!' });

        expect(res.status).toBe(400);
        expect(res.body?.code).toBe('VALIDATION_ERROR');
    });

    it('login sem password retorna 400', async () => {
        const res = await request(BASE_URL)
            .post('/api/auth/sign-in/email')
            .send({ email: `sem_senha_${RUN_ID}_${randomUUID()}@test.local` });

        expect(res.status).toBe(400);
        expect(res.body?.code).toBe('VALIDATION_ERROR');
    });

    it('login com email inválido retorna 400', async () => {
        const res = await request(BASE_URL)
            .post('/api/auth/sign-in/email')
            .send({ email: 'email-invalido', password: 'SenhaForte123!' });

        expect(res.status).toBe(400);
        expect(res.body?.code).toBe('INVALID_EMAIL');
    });
});

describe('GET /api/auth/get-session', () => {
    it('retorna sessão ativa com token bearer válido', async () => {
        const userData = await signUpUser('session_bearer');
        const login = await signInUser(userData.email, userData.password);

        const res = await request(BASE_URL)
            .get('/api/auth/get-session')
            .set(buildHeaders(login, true, false));

        expect(res.status).toBe(200);
        expect(res.body).toMatchObject({
            user: {
                email: userData.email,
            },
            session: {
                userId: login.userId,
            },
        });
    });

    it('retorna sessão ativa com cookie válido', async () => {
        const userData = await signUpUser('session_cookie');
        const login = await signInUser(userData.email, userData.password);

        const res = await request(BASE_URL)
            .get('/api/auth/get-session')
            .set(buildHeaders(login, false, true));

        expect(res.status).toBe(200);
        expect(res.body).toMatchObject({
            user: {
                email: userData.email,
            },
            session: {
                userId: login.userId,
            },
        });
    });

    it('sem autenticação retorna 200 com body null', async () => {
        const res = await request(BASE_URL).get('/api/auth/get-session');

        expect(res.status).toBe(200);
        expect(res.body).toBeNull();
    });

    it('token inválido retorna 200 com body null', async () => {
        const res = await request(BASE_URL)
            .get('/api/auth/get-session')
            .set('Authorization', 'Bearer token-invalido');

        expect(res.status).toBe(200);
        expect(res.body).toBeNull();
    });
});

describe('GET /api/me', () => {
    it('com token bearer válido retorna dados do usuário autenticado', async () => {
        const userData = await signUpUser('me_bearer');
        const login = await signInUser(userData.email, userData.password);

        const res = await request(BASE_URL)
            .get('/api/me')
            .set(buildHeaders(login, true, false));

        expect(res.status).toBe(200);
        expect(res.body).toMatchObject({
            success: true,
            data: {
                id: login.userId,
                email: userData.email,
                name: userData.name,
            },
        });
    });

    it('com cookie de sessão válido também retorna dados do usuário', async () => {
        const userData = await signUpUser('me_cookie');
        const login = await signInUser(userData.email, userData.password);

        const res = await request(BASE_URL)
            .get('/api/me')
            .set(buildHeaders(login, false, true));

        expect(res.status).toBe(200);
        expect(res.body?.success).toBe(true);
        expect(res.body?.data?.email).toBe(userData.email);
    });

    it('sem autenticação retorna 401', async () => {
        const res = await request(BASE_URL).get('/api/me');

        expect(res.status).toBe(401);
        expect(res.body?.code).toBe(401);
    });

    it('com token inválido retorna 401', async () => {
        const res = await request(BASE_URL)
            .get('/api/me')
            .set('Authorization', 'Bearer token-invalido');

        expect(res.status).toBe(401);
        expect(res.body?.code).toBe(401);
    });
});

describe('POST /api/auth/sign-out', () => {
    it('sem header Origin retorna 403 (proteção CSRF do BetterAuth)', async () => {
        const userData = await signUpUser('logout_sem_origin');
        const login = await signInUser(userData.email, userData.password);

        const res = await request(BASE_URL)
            .post('/api/auth/sign-out')
            .set(buildHeaders(login, false, true));

        expect(res.status).toBe(403);
        expect(res.body?.code).toBe('MISSING_OR_NULL_ORIGIN');
    });

    it('com Origin e bearer válido retorna 200 e invalida sessão', async () => {
        const userData = await signUpUser('logout_bearer');
        const login = await signInUser(userData.email, userData.password);

        const logout = await request(BASE_URL)
            .post('/api/auth/sign-out')
            .set('Origin', ORIGIN)
            .set(buildHeaders(login, true, false));

        expect(logout.status).toBe(200);
        expect(logout.body).toMatchObject({ success: true });

        const sessionAfter = await request(BASE_URL)
            .get('/api/auth/get-session')
            .set(buildHeaders(login, true, false));

        expect(sessionAfter.status).toBe(200);
        expect(sessionAfter.body).toBeNull();
    });

    it('com Origin e cookie válido retorna 200 e invalida sessão', async () => {
        const userData = await signUpUser('logout_cookie');
        const login = await signInUser(userData.email, userData.password);

        const logout = await request(BASE_URL)
            .post('/api/auth/sign-out')
            .set('Origin', ORIGIN)
            .set(buildHeaders(login, false, true));

        expect(logout.status).toBe(200);
        expect(logout.body).toMatchObject({ success: true });

        const sessionAfter = await request(BASE_URL)
            .get('/api/auth/get-session')
            .set(buildHeaders(login, false, true));

        expect(sessionAfter.status).toBe(200);
        expect(sessionAfter.body).toBeNull();
    });

    it('com Origin e sem autenticação ainda retorna 200 (idempotente)', async () => {
        const res = await request(BASE_URL)
            .post('/api/auth/sign-out')
            .set('Origin', ORIGIN);

        expect(res.status).toBe(200);
        expect(res.body).toMatchObject({ success: true });
    });
});

describe('Fluxo E2E completo de auth', () => {
    it('cadastro -> login -> session -> me -> logout -> sessão inválida', async () => {
        const userData = await signUpUser('flow_completo');

        const login = await signInUser(userData.email, userData.password);
        expect(login.token).toBeDefined();

        const sessionBefore = await request(BASE_URL)
            .get('/api/auth/get-session')
            .set(buildHeaders(login, true, false));
        expect(sessionBefore.status).toBe(200);
        expect(sessionBefore.body?.user?.email).toBe(userData.email);

        const meBefore = await request(BASE_URL)
            .get('/api/me')
            .set(buildHeaders(login, true, false));
        expect(meBefore.status).toBe(200);
        expect(meBefore.body?.data?.email).toBe(userData.email);

        const logout = await request(BASE_URL)
            .post('/api/auth/sign-out')
            .set('Origin', ORIGIN)
            .set(buildHeaders(login, true, false));
        expect(logout.status).toBe(200);

        const sessionAfter = await request(BASE_URL)
            .get('/api/auth/get-session')
            .set(buildHeaders(login, true, false));
        expect(sessionAfter.status).toBe(200);
        expect(sessionAfter.body).toBeNull();

        const meAfter = await request(BASE_URL)
            .get('/api/me')
            .set(buildHeaders(login, true, false));
        expect(meAfter.status).toBe(401);
    });
});