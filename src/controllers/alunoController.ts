import AlunoService from "../services/alunoService";
import { Request, Response } from "express";
import { type_aluno } from "../types/dbSchemas";
import CommonResponse from "../utils/helpers/commonResponse";
import { boolean, ZodError } from "zod";
import HttpStatusCode from "../utils/helpers/httpStatusCode";
import { DatabaseError } from "../utils/errors/DatabaseError";

class AlunoController {
    private service: AlunoService
    constructor() {
        this.service = new AlunoService()
    }

    createAluno = async (req: Request, res: Response) => {
        console.log('[AlunoController] [createAluno] Requisição recebida');
        console.log('[AlunoController] [createAluno] Body:', JSON.stringify(req.body, null, 2));

        const novoAluno: type_aluno = {
            nome: req.body.nome,
            email: req.body.email,
            senha: req.body.senha,
            data_nascimento: req.body.data_nascimento,
            sexo: req.body.sexo,
            url_foto: req.body.url_foto || null,
            created_at: new Date(),
            status_conta: req.body.status_conta,
            academia_id: req.body.academia_id,
        }

        console.log('[AlunoController] [createAluno] Objeto montado:', JSON.stringify(novoAluno, null, 2));

        if (!novoAluno) {
            console.warn('[AlunoController] [createAluno] Dados do aluno ausentes, retornando BAD_REQUEST');
            return CommonResponse.error(res, HttpStatusCode.BAD_REQUEST.code, null, '', [], 'Dados do aluno é obrigatório');
        }

        try {
            console.log('[AlunoController] [createAluno] Chamando service.createAluno...');
            const resposta = await this.service.createAluno(novoAluno)
            console.log('[AlunoController] [createAluno] Aluno criado com sucesso. Resposta:', JSON.stringify(resposta, null, 2));
            return CommonResponse.created(res, resposta, HttpStatusCode.CREATED.message);
        } catch (error) {
            if (error instanceof ZodError) {
                console.warn('[AlunoController] [createAluno] Erro de validação Zod:', error.issues);
                return CommonResponse.error(res, HttpStatusCode.UNPROCESSABLE_ENTITY.code, null, null, error.issues, HttpStatusCode.UNPROCESSABLE_ENTITY.message);
            }
            if (error instanceof DatabaseError) {
                console.warn('[AlunoController] [createAluno] DatabaseError:', error.message);
                return CommonResponse.error(res, error.statusCode, null, null, [error.toJSON()], error.message);
            }
            const msg = error instanceof Error ? error.message : 'Erro desconhecido';
            console.error('[AlunoController] [createAluno] Erro interno:', msg);
            return CommonResponse.serverError(res, { message: msg }, HttpStatusCode.INTERNAL_SERVER_ERROR.message);
        }
    }
}

export default AlunoController