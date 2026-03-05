import { Request, Response } from "express";
import StudentsService from "../services/alunoService";
import CommonResponse from "../utils/helpers/commonResponse";
import HttpStatusCode from "../utils/helpers/httpStatusCode";
import { ZodError } from "zod";
import { DatabaseError } from "../utils/errors/DatabaseError";
import { type_aluno } from "../types/dbSchemas";

class AlunoController {
    private service: StudentsService;

    constructor() {
        this.service = new StudentsService();
    }

    getAllStudents = async (req: Request, res: Response) => {
        console.log('[AlunoController] [getAllStudents] Requisição recebida');

        try {
            const students = await this.service.getAllStudents();
            return CommonResponse.success(
                res,
                {
                    total: students.length,
                    alunos: students
                },
                HttpStatusCode.OK.code,
                `${students.length} aluno(s) encontrado(s)`
            );
        } catch (error) {
            return this.handleError(res, error, 'getAllStudents');
        }
    };

    getStudentById = async (req: Request, res: Response) => {
        console.log('[AlunoController] [getStudentById] Requisição recebida');
        const { id } = req.params;

        try {
            const student = await this.service.getStudentById(Number(id));
            return CommonResponse.success(res, student, HttpStatusCode.OK.code, 'Aluno encontrado com sucesso');
        } catch (error) {
            return this.handleError(res, error, 'getStudentById');
        }
    };

    createStudent = async (req: Request, res: Response) => {
        console.log('[StudentsController] [createStudent] Requisição recebida');
        console.log('[StudentsController] [createStudent] Body:', JSON.stringify(req.body, null, 2));

        const novoStudent: type_aluno = {
            nome: req.body.nome,
            email: req.body.email,
            senha: req.body.senha,
            data_nascimento: req.body.data_nascimento,
            sexo: req.body.sexo,
            url_foto: req.body.url_foto || null,
            status_conta: req.body.status_conta ?? true,
            academia_id: req.body.academia_id,
        };

        console.log('[StudentsController] [createStudent] Objeto montado:', JSON.stringify(novoStudent, null, 2));

        if (!novoStudent.nome || !novoStudent.email || !novoStudent.senha) {
            console.warn('[StudentsController] [createStudent] Dados obrigatórios ausentes, retornando BAD_REQUEST');
            return CommonResponse.error(res, HttpStatusCode.BAD_REQUEST.code, null, '', [], 'Dados do aluno são obrigatórios (nome, email, senha)');
        }

        try {
            console.log('[StudentsController] [createStudent] Chamando service.createStudent...');
            const resposta = await this.service.createStudent(novoStudent);
            console.log('[StudentsController] [createStudent] Aluno criado com sucesso. Resposta:', JSON.stringify(resposta, null, 2));
            return CommonResponse.created(res, resposta, HttpStatusCode.CREATED.message);
        } catch (error) {
            return this.handleError(res, error, 'createStudent');
        }
    };

    private handleError(res: Response, error: unknown, context: string) {
        if (error instanceof ZodError) {
            console.warn(`[AlunoController] [${context}] Erro de validação Zod:`, error.issues);
            return CommonResponse.error(
                res,
                HttpStatusCode.UNPROCESSABLE_ENTITY.code,
                null,
                null,
                error.issues,
                HttpStatusCode.UNPROCESSABLE_ENTITY.message
            );
        }

        if (error instanceof DatabaseError) {
            console.warn(`[AlunoController] [${context}] DatabaseError:`, error.message);
            return CommonResponse.error(
                res,
                error.statusCode,
                null,
                null,
                [error.toJSON()],
                error.message
            );
        }

        const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';

        if (errorMessage.includes('não encontrado')) {
            console.warn(`[AlunoController] [${context}] Recurso não encontrado:`, errorMessage);
            return CommonResponse.error(
                res,
                HttpStatusCode.NOT_FOUND.code,
                null,
                null,
                [],
                errorMessage
            );
        }

        console.error(`[AlunoController] [${context}] Erro interno:`, errorMessage);
        return CommonResponse.serverError(res, { message: errorMessage }, HttpStatusCode.INTERNAL_SERVER_ERROR.message);
    }
}

export default AlunoController;
