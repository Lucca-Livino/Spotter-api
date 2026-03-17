import { DataBase } from "../config/DbConnect";
import { eq } from "drizzle-orm";
import { aluno, user } from "../config/db/schema";
import { type_aluno } from "../types/dbSchemas";
import { parseDatabaseError } from "../utils/errors/DatabaseError";

class AlunoRepository {
  private db: typeof DataBase;
  constructor() {
    this.db = DataBase;
  }

  async create(novoStudent: type_aluno): Promise<type_aluno> {
    console.log(
      "[StudentsRepository] [create] Iniciando inserção no banco de dados...",
    );
    console.log(
      "[StudentsRepository] [create] Dados a inserir:",
      JSON.stringify(novoStudent, null, 2),
    );
    try {
      const { academia_id, ...restStudent } = novoStudent;
      const resultado = await this.db
        .insert(aluno)
        .values({ ...restStudent, academia_id })
        .returning();
      console.log(
        "[StudentsRepository] [create] Inserção concluída. Registro retornado:",
        JSON.stringify(resultado[0], null, 2),
      );
      return resultado[0] as unknown as type_aluno;
    } catch (error) {
      throw parseDatabaseError(error, "StudentsRepository.create");
    }
  }

  async getAllAlunos(): Promise<type_aluno[]> {
    try {
      const resultado = await this.db.select().from(aluno);

      return resultado as unknown as type_aluno[];
    } catch (error) {
      throw parseDatabaseError(error, "AlunoRepository.getAllAlunos");
    }
  }

  async findById(id: string): Promise<type_aluno | null> {
    try {
      const resultado = await this.db
        .select()
        .from(aluno)
        .where(eq(aluno.id, id))
        .limit(1);

      if (resultado.length === 0) {
        return null;
      }

      return resultado[0] as unknown as type_aluno;
    } catch (error) {
      throw parseDatabaseError(error, "AlunoRepository.findById");
    }
  }

  // Busca aluno pelo email do user (tabela BetterAuth)
  async findByEmail(email: string): Promise<type_aluno> {
    try {
      const resultado = await this.db
        .select({ aluno: aluno })
        .from(aluno)
        .innerJoin(user, eq(aluno.user_id, user.id))
        .where(eq(user.email, email))
        .limit(1);

      if (resultado.length === 0) {
        throw new Error("Aluno não encontrado");
      }

      return resultado[0].aluno as unknown as type_aluno;
    } catch (error) {
      throw parseDatabaseError(error, "AlunoRepository.findByEmail");
    }
  }

  async findByUserId(userId: string): Promise<type_aluno | null> {
    try {
      const resultado = await this.db
        .select()
        .from(aluno)
        .where(eq(aluno.user_id, userId))
        .limit(1);

      if (resultado.length === 0) {
        return null;
      }

      return resultado[0] as unknown as type_aluno;
    } catch (error) {
      throw parseDatabaseError(error, "AlunoRepository.findByUserId");
    }
  }

  async delete(id: string): Promise<type_aluno | null> {
    try {
      const resultado = await this.db
        .delete(aluno)
        .where(eq(aluno.id, id))
        .returning();

      if (resultado.length === 0) {
        return null;
      }

      return resultado[0] as unknown as type_aluno;
    } catch (error) {
      throw parseDatabaseError(error, "AlunoRepository.delete");
    }
  }

  async update(id: string, alunoEditado: Partial<type_aluno>): Promise<type_aluno | null> {
    try {
      const resultado = await this.db
        .update(aluno)
        .set(alunoEditado)
        .where(eq(aluno.id, id))
        .returning();

      if (resultado.length === 0) {
        return null;
      }

      return resultado[0] as unknown as type_aluno;
    } catch (error) {
      throw parseDatabaseError(error, "AlunoRepository.update");
    }
  }
}

export default AlunoRepository;
