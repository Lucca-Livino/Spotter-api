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
}

export default StudentsService;
