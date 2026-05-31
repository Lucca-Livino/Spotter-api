import { auth } from './src/utils/auth';

async function getToken() {
    try {
        const res = await auth.api.signInEmail({
            body: { email: 'test_aluno_1776458560301@test.com', password: 'Password123!' }
        });
        console.log("TOKEN_START:" + res.token + ":TOKEN_END");
    } catch (e) {
        console.error(e);
    }
    process.exit(0);
}

getToken();
