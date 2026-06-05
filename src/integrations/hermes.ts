import axios from 'axios';

interface HermesEmailOptions {
    apiKey: string;
    to: string;
    subject: string;
    templateId?: string;
    variables?: Record<string, any>;
    body?: string;
}

/**
 * Cliente genérico para envio de e-mails via Hermes.
 */
export async function sendHermesEmail(options: HermesEmailOptions) {
    const apiUrl = process.env.HERMES_API_URL || 'https://api.hermes.qa.fslab.dev/api/emails';

    if (!options.apiKey) {
        console.warn('[Hermes] API_KEY não fornecida. O e-mail não será enviado.');
        return;
    }

    try {
        const client = axios.create({
            baseURL: apiUrl,
            headers: {
                'x-api-key': options.apiKey,
                'Content-Type': 'application/json'
            },
            timeout: 8000,
        });

        const payload: any = {
            recipient_to: options.to,
            subject: options.subject,
        };

        if (options.templateId) {
            payload.template_id = options.templateId;
            if (options.variables) {
                payload.variables = options.variables;
            }
        } else if (options.body) {
            payload.body = options.body;
        }

        const response = await client.post('', payload);
        console.log(`[Hermes] E-mail enviado com sucesso para ${options.to}. Status: ${response.status}`);
    } catch (error: any) {
        console.error('[Hermes] Erro ao enviar e-mail:', error?.response?.data || error.message);
    }
}