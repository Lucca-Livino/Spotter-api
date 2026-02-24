class HttpStatusCode {
    static OK = { code: 200, message: 'Requisição bem-sucedida' };
    static CREATED = { code: 201, message: 'Recurso criado com sucesso' };
    static ACCEPTED = { code: 202, message: 'Requisição aceita para processamento' };
    static NO_CONTENT = { code: 204, message: 'Sem conteúdo para retornar' };
    static RESET_CONTENT = { code: 205, message: 'Mais dados necessários para processamento' };
    static PARTIAL_CONTENT = { code: 206, message: 'Conteúdo parcial retornado' };
    static MULTI_STATUS = { code: 207, message: 'Múltiplos recursos associados à resposta' };
    static ALREADY_REPORTED = { code: 208, message: 'Conteúdo já relatado' };

    static MULTIPLE_CHOICES = { code: 300, message: 'Múltiplas respostas disponíveis, cliente deve escolher uma' };
    static MOVED_PERMANENTLY = { code: 301, message: 'Recurso movido permanentemente para um novo endereço' };
    static FOUND = { code: 302, message: 'Recurso encontrado, mas movido temporariamente para um novo endereço' };
    static SEE_OTHER = { code: 303, message: 'Veja outra referência para o recurso' };
    static NOT_MODIFIED = { code: 304, message: 'Cliente possui a versão mais recente do recurso' };
    static USE_PROXY = { code: 305, message: 'Recurso disponível apenas através de um proxy' };
    static TEMPORARY_REDIRECT = { code: 307, message: 'Recurso temporariamente movido para um novo endereço' };
    static PERMANENT_REDIRECT = { code: 308, message: 'Recurso movido permanentemente para um novo endereço' };

    static BAD_REQUEST = { code: 400, message: 'Requisição com sintaxe incorreta' };
    static UNAUTHORIZED = { code: 401, message: 'Não autorizado' };
    static FORBIDDEN = { code: 403, message: 'Proibido' };
    static NOT_FOUND = { code: 404, message: 'Recurso não encontrado' };
    static METHOD_NOT_ALLOWED = { code: 405, message: 'Método HTTP não permitido para o recurso solicitado' };
    static REQUEST_TIMEOUT = { code: 408, message: 'Tempo de requisição esgotado' };
    static CONFLICT = { code: 409, message: 'Conflito com o estado atual do servidor' };
    static GONE = { code: 410, message: 'Recurso não está mais disponível' };
    static PAYLOAD_TOO_LARGE = { code: 413, message: 'O corpo da requisição é muito grande' };
    static IM_A_TEAPOT = { code: 418, message: 'Eu sou um bule de chá' };
    static UNPROCESSABLE_ENTITY = { code: 422, message: 'Falha na validação' };
    static LOCKED = { code: 423, message: 'Recurso bloqueado' };
    static REQUEST_HEADER_FIELDS_TOO_LARGE = { code: 431, message: 'Cabeçalhos da requisição são muito grandes' };
    static UNAVAILABLE_FOR_LEGAL_REASONS = { code: 451, message: 'Acesso negado por motivos legais' };
    static INVALID_TOKEN = { code: 498, message: 'O token JWT está expirado!' };

    static INTERNAL_SERVER_ERROR = { code: 500, message: 'Erro interno do servidor' };
    static NOT_IMPLEMENTED = { code: 501, message: 'Funcionalidade não suportada' };
    static BAD_GATEWAY = { code: 502, message: 'Resposta inválida recebida do servidor upstream' };
    static SERVICE_UNAVAILABLE = { code: 503, message: 'Serviço temporariamente indisponível' };
}

export default HttpStatusCode;