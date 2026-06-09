import { DataBase } from "../config/DbConnect";
import { desc, eq, sql } from "drizzle-orm";
import { aluno, user, avaliacao_fisica, aluno_academia, academia } from "../config/db/schema";
import { type_aluno } from "../types/dbSchemas";
import { parseDatabaseError } from "../utils/errors/DatabaseError";

class AlunoRepository {
  private db: typeof DataBase;
  constructor() {
    this.db = DataBase;
  }

  async findFullByUserId(userId: string): Promise<any | null> {
    try {
      const rows = await this.db
        .select({
          id: aluno.id,
          nome: aluno.nome,
          email: user.email,
          data_nascimento: aluno.data_nascimento,
          sexo: aluno.sexo,
          url_foto: aluno.url_foto,
          academia_id: aluno.academia_id,
          treinador_id: aluno.treinador_id,
          peso_atual_kg: aluno.peso_atual_kg,
          altura_m: aluno.altura_m,
          fcm_token: aluno.fcm_token,
          academia_nome: academia.nome,
        })
        .from(aluno)
        .innerJoin(user, eq(aluno.user_id, user.id))
        .leftJoin(academia, eq(aluno.academia_id, academia.id))
        .where(eq(aluno.user_id, userId))
        .limit(1);

      const alunoEncontrado = rows[0];
      if (!alunoEncontrado) return null;

      // Buscar todos os vínculos de academias
      const vinculos = await this.db
        .select({
          id: academia.id,
          nome: academia.nome,
          endereco_cidade: academia.endereco_cidade,
        })
        .from(aluno_academia)
        .innerJoin(academia, eq(aluno_academia.academia_id, academia.id))
        .where(eq(aluno_academia.aluno_id, alunoEncontrado.id));

      return {
        ...alunoEncontrado,
        academias: vinculos,
      };
    } catch (error) {
      throw parseDatabaseError(error, "AlunoRepository.findFullByUserId");
    }
  }

  async create(novoStudent: type_aluno): Promise<type_aluno> {
    console.log(
      "[StudentsRepository] [create] Iniciando inserção no banco de dados...",
    );
    try {
      const { academia_id, ...restStudent } = novoStudent;
      
      const resultado = await this.db.transaction(async (tx) => {
        // 1. Tentar buscar foto do usuário se não enviada
        let urlFotoFinal = restStudent.url_foto;
        if (!urlFotoFinal) {
          const userData = await tx
            .select({ image: user.image })
            .from(user)
            .where(eq(user.id, restStudent.user_id))
            .limit(1);
          urlFotoFinal = userData[0]?.image ?? null;
        }

        const insertData = {
          ...restStudent,
          url_foto: urlFotoFinal,
          academia_id,
          peso_atual_kg: restStudent.peso_atual_kg?.toString() ?? null,
          altura_m: restStudent.altura_m?.toString() ?? null,
        } as any;

        // 2. Inserir Aluno
        const [alunoCriado] = await tx
          .insert(aluno)
          .values(insertData)
          .returning();

        // 3. Vincular Aluno à Academia na tabela de relacionamento
        await tx
          .insert(aluno_academia)
          .values({
            aluno_id: alunoCriado.id,
            academia_id: academia_id,
          });

        return alunoCriado;
      });

      console.log(
        "[StudentsRepository] [create] Inserção e vínculo concluídos.",
      );
      return resultado as unknown as type_aluno;
    } catch (error) {
      throw parseDatabaseError(error, "StudentsRepository.create");
    }
  }

  async getAllAlunos(page: number, limite: number): Promise<{ dados: type_aluno[]; total: number; page: number; limite: number; totalPages: number }> {
    try {
      const offset = (page - 1) * limite;
      const [dados, countResult] = await Promise.all([
        this.db.select().from(aluno).limit(limite).offset(offset),
        this.db.select({ count: sql<number>`count(*)` }).from(aluno),
      ]);
      const total = Number(countResult[0].count);
      return { dados: dados as unknown as type_aluno[], total, page, limite, totalPages: Math.ceil(total / limite) };
    } catch (error) {
      throw parseDatabaseError(error, "AlunoRepository.getAllAlunos");
    }
  }

  async getAlunosByTreinadorId(
    treinadorId: string,
    page: number,
    limite: number
  ): Promise<{ dados: type_aluno[]; total: number; page: number; limite: number; totalPages: number }> {
    try {
      const offset = (page - 1) * limite;
      const [dados, countResult] = await Promise.all([
        this.db
          .select()
          .from(aluno)
          .where(eq(aluno.treinador_id, treinadorId))
          .limit(limite)
          .offset(offset),
        this.db
          .select({ count: sql<number>`count(*)` })
          .from(aluno)
          .where(eq(aluno.treinador_id, treinadorId)),
      ]);
      const total = Number(countResult[0].count);
      return { dados: dados as unknown as type_aluno[], total, page, limite, totalPages: Math.ceil(total / limite) };
    } catch (error) {
      throw parseDatabaseError(error, "AlunoRepository.getAlunosByTreinadorId");
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

  async update(id: string, alunoEditado: Partial<type_aluno>, academias_ids?: string[]): Promise<type_aluno | null> {
    try {
      const updateData = {
        ...alunoEditado,
        peso_atual_kg: alunoEditado.peso_atual_kg?.toString(),
        altura_m: alunoEditado.altura_m?.toString(),
      } as any;
        
      const resultado = await this.db.transaction(async (tx) => {
        // 1. Atualizar tabela aluno
        const [alunoAtualizado] = await tx
          .update(aluno)
          .set(updateData)
          .where(eq(aluno.id, id))
          .returning();

        if (!alunoAtualizado) return null;

        // 2. Se informadas novas academias, sincronizar
        if (academias_ids) {
          // Remover vínculos antigos
          await tx
            .delete(aluno_academia)
            .where(eq(aluno_academia.aluno_id, id));

          // Inserir novos vínculos
          if (academias_ids.length > 0) {
            await tx
              .insert(aluno_academia)
              .values(academias_ids.map(acId => ({
                aluno_id: id,
                academia_id: acId
              })));
          }
        }

        return alunoAtualizado;
      });

      return resultado as unknown as type_aluno;
    } catch (error) {
      throw parseDatabaseError(error, "AlunoRepository.update");
    }
  }
}

export default AlunoRepository;
