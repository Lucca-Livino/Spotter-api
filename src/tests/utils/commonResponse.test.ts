import { describe, it, expect, jest } from '@jest/globals';
import CommonResponse from '../../utils/helpers/commonResponse';

const makeRes = () => ({
    status: jest.fn().mockReturnThis() as any,
    json: jest.fn() as any,
});

describe('CommonResponse constructor and toJSON', () => {
    it('cria instância com valores padrão', () => {
        const cr = new CommonResponse('mensagem', { x: 1 });
        expect(cr.message).toBe('mensagem');
        expect(cr.data).toEqual({ x: 1 });
        expect(cr.errors).toEqual([]);
        expect(cr.error).toBe(false);
        expect(cr.code).toBeNull();
    });

    it('cria instância com todos os parâmetros explícitos', () => {
        const cr = new CommonResponse('err', null, [{ msg: 'e' }], true, 422);
        expect(cr.message).toBe('err');
        expect(cr.data).toBeNull();
        expect(cr.errors).toEqual([{ msg: 'e' }]);
        expect(cr.error).toBe(true);
        expect(cr.code).toBe(422);
    });

    it('toJSON retorna a estrutura correta', () => {
        const cr = new CommonResponse('ok', { id: 1 }, [], false, 200);
        const json = cr.toJSON();

        expect(json).toEqual({
            error: false,
            code: 200,
            message: 'ok',
            data: { id: 1 },
            errors: [],
        });
    });

    it('toJSON com erro e errors array', () => {
        const errors = [{ field: 'nome', message: 'obrigatório' }];
        const cr = new CommonResponse('Validação falhou', null, errors, true, 422);
        const json = cr.toJSON();

        expect(json.error).toBe(true);
        expect(json.errors).toEqual(errors);
        expect(json.code).toBe(422);
    });
});

describe('CommonResponse.success', () => {
    it('retorna status 200 e json com data', () => {
        const res = makeRes();
        CommonResponse.success(res, { id: 42 });

        expect(res.status).toHaveBeenCalledWith(200);
        const call = (res.json as any).mock.calls[0][0];
        expect(call.data).toEqual({ id: 42 });
        expect(call.error).toBe(false);
        expect(call.code).toBe(200);
    });

    it('aceita código personalizado', () => {
        const res = makeRes();
        CommonResponse.success(res, 'ok', 201);

        expect(res.status).toHaveBeenCalledWith(201);
        const call = (res.json as any).mock.calls[0][0];
        expect(call.code).toBe(201);
    });

    it('aceita mensagem personalizada', () => {
        const res = makeRes();
        CommonResponse.success(res, null, 200, 'Operação concluída');

        const call = (res.json as any).mock.calls[0][0];
        expect(call.message).toBe('Operação concluída');
    });
});

describe('CommonResponse.error', () => {
    it('retorna status de erro e json com error=true', () => {
        const res = makeRes();
        CommonResponse.error(res, 400, null, null, [], 'Requisição inválida');

        expect(res.status).toHaveBeenCalledWith(400);
        const call = (res.json as any).mock.calls[0][0];
        expect(call.error).toBe(true);
        expect(call.code).toBe(400);
        expect(call.message).toBe('Requisição inválida');
        expect(call.data).toBeNull();
    });

    it('inclui errors quando fornecido', () => {
        const res = makeRes();
        const errors = [{ path: ['nome'], message: 'obrigatório' }];
        CommonResponse.error(res, 422, null, null, errors, 'Validação falhou');

        const call = (res.json as any).mock.calls[0][0];
        expect(call.errors).toEqual(errors);
    });

    it('funciona com field e errorType fornecidos', () => {
        const res = makeRes();
        CommonResponse.error(res, 404, 'NotFound', 'id', [], 'Não encontrado');

        expect(res.status).toHaveBeenCalledWith(404);
    });
});

describe('CommonResponse.created', () => {
    it('retorna status 201 e data', () => {
        const res = makeRes();
        CommonResponse.created(res, { id: 'novo' });

        expect(res.status).toHaveBeenCalledWith(201);
        const call = (res.json as any).mock.calls[0][0];
        expect(call.code).toBe(201);
        expect(call.data).toEqual({ id: 'novo' });
        expect(call.error).toBe(false);
    });

    it('aceita mensagem personalizada', () => {
        const res = makeRes();
        CommonResponse.created(res, null, 'Criado com sucesso');

        const call = (res.json as any).mock.calls[0][0];
        expect(call.message).toBe('Criado com sucesso');
    });
});

describe('CommonResponse.serverError', () => {
    it('retorna status 500 e error=true', () => {
        const res = makeRes();
        CommonResponse.serverError(res, { message: 'boom' });

        expect(res.status).toHaveBeenCalledWith(500);
        const call = (res.json as any).mock.calls[0][0];
        expect(call.error).toBe(true);
        expect(call.code).toBe(500);
        expect(call.errors).toEqual([{ message: 'boom' }]);
    });

    it('aceita mensagem personalizada', () => {
        const res = makeRes();
        CommonResponse.serverError(res, new Error('db'), 'Erro interno do servidor');

        const call = (res.json as any).mock.calls[0][0];
        expect(call.message).toBe('Erro interno do servidor');
    });

    it('errors contém o erro passado', () => {
        const res = makeRes();
        const erro = { detail: 'falha na query' };
        CommonResponse.serverError(res, erro);

        const call = (res.json as any).mock.calls[0][0];
        expect(call.errors[0]).toBe(erro);
    });
});

describe('CommonResponse.error - parâmetros com default', () => {
    it('chama error sem parâmetros opcionais usa valores padrão', () => {
        const res = makeRes();
        // Chamando com apenas os 2 obrigatórios — field, errors e customMessage usam defaults
        (CommonResponse.error as any)(res, 400, null);

        expect(res.status).toHaveBeenCalledWith(400);
        const call = (res.json as any).mock.calls[0][0];
        expect(call.error).toBe(true);
        expect(call.errors).toEqual([]);
        expect(call.message).toBeNull();
    });

    it('chama error com field mas sem customMessage', () => {
        const res = makeRes();
        (CommonResponse.error as any)(res, 400, null, 'campo');

        expect(res.status).toHaveBeenCalledWith(400);
    });

    it('chama error com field e errors mas sem customMessage', () => {
        const res = makeRes();
        (CommonResponse.error as any)(res, 422, null, 'field', [{ msg: 'e' }]);

        const call = (res.json as any).mock.calls[0][0];
        expect(call.errors).toEqual([{ msg: 'e' }]);
        expect(call.message).toBeNull();
    });
});

