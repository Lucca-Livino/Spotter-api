import StudentsRepository from "../repositories/alunoRepository";
import { type_aluno } from "../types/dbSchemas";
import { type_physical_data } from "../types/userSchemas";
import { studentIdSchema, studentSchema, physicalDataSchema } from "../utils/validations/alunoValidation";
import { ZodError } from "zod";

class StudentsService {
    private repository: StudentsRepository;

    constructor() {
        this.repository = new StudentsRepository();
    }


    async getStudentById(id: number): Promise<type_aluno> {
        console.log(`[StudentsService] [getStudentById] Buscando aluno com ID: ${id}`);

        studentIdSchema.parse(id);

        const student = await this.repository.findById(id);

        if (!student) {
            throw new Error(`Aluno com ID ${id} não encontrado`);
        }

        const { senha, ...studentWithoutPassword } = student as any;
        console.log(`[StudentsService] [getStudentById] Aluno encontrado com sucesso`);

        return studentWithoutPassword as type_aluno;
    }

    async getAllStudents(): Promise<type_aluno[]> {
        console.log('[StudentsService] [getAllStudents] Buscando todos os alunos');

        const students = await this.repository.getAllStudents();

        const studentsWithoutPassword = students.map((s: any) => {
            const { senha, ...rest } = s;
            return rest as type_aluno;
        });

        console.log(`[StudentsService] [getAllStudents] ${studentsWithoutPassword.length} aluno(s) encontrado(s)`);
        return studentsWithoutPassword;
    }

    async createStudent(novoStudent: type_aluno): Promise<type_aluno> {
        console.log('[StudentsService] [createStudent] Dados recebidos do controller:', JSON.stringify(novoStudent, null, 2));
        try {
            console.log('[StudentsService] [createStudent] Iniciando validação com Zod...');
            studentSchema.parse(novoStudent);
            console.log('[StudentsService] [createStudent] Validação Zod concluída com sucesso');

            const studentSanitizado = {
                ...novoStudent,
                status_conta: novoStudent.status_conta ?? true,
                academia_id: Number(novoStudent.academia_id),
            };
            console.log('[StudentsService] [createStudent] Dados sanitizados:', JSON.stringify(studentSanitizado, null, 2));

            console.log('[StudentsService] [createStudent] Chamando repository.create...');
            const resposta = await this.repository.create(studentSanitizado);
            console.log('[StudentsService] [createStudent] Aluno persistido com sucesso:', JSON.stringify(resposta, null, 2));
            
            const { senha, ...studentWithoutPassword } = resposta as any;
            return studentWithoutPassword as type_aluno;
        } catch (error) {
            if (error instanceof ZodError) {
                console.warn('[StudentsService] [createStudent] Falha na validação Zod:', error.issues);
                throw error;
            }
            console.warn('[StudentsService] [createStudent] Erro recebido do repository, propagando...');
            throw error;
        }
    }
}

export default StudentsService;
