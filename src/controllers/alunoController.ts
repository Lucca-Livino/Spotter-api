import { Request, Response } from "express";
import StudentsService from "../services/alunoService";
import CommonResponse from "../utils/helpers/commonResponse";
import HttpStatusCode from "../utils/helpers/httpStatusCode";
import { ZodError } from "zod";
import { DatabaseError } from "../utils/errors/DatabaseError";

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
