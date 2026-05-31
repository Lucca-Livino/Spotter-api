import { auth } from './src/utils/auth';

async function testProfiles() {
    const creds = [
        { email: 'carlos.silva@gmail.com', pass: 'Aluno@2026!', label: 'ALUNO' },
        { email: 'marcos.rocha@personalfit.com', pass: 'Treinador@2026!', label: 'TREINADOR' }
    ];

    for (const user of creds) {
        try {
            console.log(`\n--- Testando login ${user.label}: ${user.email} ---`);
            const loginRes = await auth.api.signInEmail({
                body: { email: user.email, password: user.pass }
            });
            
            const token = loginRes.token;
            console.log(`CURL_COMMAND: curl -X GET http://localhost:1350/api/me -H "Authorization: Bearer ${token}"`);
        } catch (e: any) {
            console.error(`Erro no teste ${user.label}:`, e.message);
        }
    }
    process.exit(0);
}

testProfiles();
