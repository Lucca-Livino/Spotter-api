import { DataBase } from "../config/DbConnect";
import { asc, desc, eq, sql } from "drizzle-orm";
import { aluno, user, avaliacao_fisica, aluno_academia, academia } from "../config/db/schema";
import { type_aluno } from "../types/dbSchemas";
import { parseDatabaseError } from "../utils/errors/DatabaseError";

export interface HistoricoPesoEntrada {
    id: string;
    data_avaliacao: string;
    peso_kg: number;
    altura_cm: number | null;
    imc: number | null;
}

export interface HistoricoPesoResponse {
    entradas: HistoricoPesoEntrada[];
    metricas: {
        peso_atual_kg: number | null;
        peso_minimo_kg: number | null;
        peso_maximo_kg: number | null;
        variacao_total_kg: number | null;
        variacao_ultima_semana_kg: number | null;
        tendencia: 'SUBINDO' | 'DESCENDO' | 'ESTAVEL' | null;
        total_registros: number;
    };
}

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
          peso_atual_kg: aluno.peso_atual_kg,
          altura_cm: aluno.altura_cm,
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
          altura_cm: restStudent.altura_cm ?? null,
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
        altura_cm: alunoEditado.altura_cm ?? undefined,
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

  async registrarPeso(alunoId: string, pesoKg: number, alturaCm?: number | null): Promise<void> {
    try {
      await this.db.insert(avaliacao_fisica).values({
        aluno_id: alunoId,
        peso_kg: pesoKg.toString(),
        altura_cm: alturaCm ?? null,
      });
    } catch (error) {
      throw parseDatabaseError(error, "AlunoRepository.registrarPeso");
    }
  }

  async getHistoricoPeso(alunoId: string): Promise<HistoricoPesoResponse> {
    try {
      const rows = await this.db
        .select({
          id: avaliacao_fisica.id,
          data_avaliacao: avaliacao_fisica.data_avaliacao,
          peso_kg: avaliacao_fisica.peso_kg,
          altura_cm: avaliacao_fisica.altura_cm,
        })
        .from(avaliacao_fisica)
        .where(eq(avaliacao_fisica.aluno_id, alunoId))
        .orderBy(asc(avaliacao_fisica.data_avaliacao));

      const entradas: HistoricoPesoEntrada[] = rows.map((r) => {
        const peso = parseFloat(r.peso_kg);
        const imc = r.altura_cm && r.altura_cm > 0
          ? Math.round((peso / Math.pow(r.altura_cm / 100, 2)) * 10) / 10
          : null;
        return {
          id: r.id,
          data_avaliacao: typeof r.data_avaliacao === 'string' ? r.data_avaliacao : (r.data_avaliacao as Date).toISOString().slice(0, 10),
          peso_kg: Math.round(peso * 100) / 100,
          altura_cm: r.altura_cm,
          imc,
        };
      });

      const pesos = entradas.map((e) => e.peso_kg);
      const peso_atual_kg = pesos.length > 0 ? pesos[pesos.length - 1] : null;
      const peso_minimo_kg = pesos.length > 0 ? Math.min(...pesos) : null;
      const peso_maximo_kg = pesos.length > 0 ? Math.max(...pesos) : null;
      const variacao_total_kg = pesos.length >= 2
        ? Math.round((pesos[pesos.length - 1] - pesos[0]) * 100) / 100
        : null;

      // Variação última semana: diferença entre peso atual e registro mais próximo de 7 dias atrás
      let variacao_ultima_semana_kg: number | null = null;
      if (pesos.length >= 2) {
        const umaSemanaAtras = new Date();
        umaSemanaAtras.setDate(umaSemanaAtras.getDate() - 7);
        const anteriores = entradas.filter((e) => new Date(e.data_avaliacao) <= umaSemanaAtras);
        const semanaPast = anteriores[anteriores.length - 1];
        if (semanaPast && peso_atual_kg !== null) {
          variacao_ultima_semana_kg = Math.round((peso_atual_kg - semanaPast.peso_kg) * 100) / 100;
        }
      }

      // Tendência: baseada nos últimos 3 registros
      let tendencia: 'SUBINDO' | 'DESCENDO' | 'ESTAVEL' | null = null;
      if (pesos.length >= 2) {
        const ultimos = pesos.slice(-3);
        const diff = ultimos[ultimos.length - 1] - ultimos[0];
        if (diff > 0.5) tendencia = 'SUBINDO';
        else if (diff < -0.5) tendencia = 'DESCENDO';
        else tendencia = 'ESTAVEL';
      }

      return {
        entradas,
        metricas: {
          peso_atual_kg,
          peso_minimo_kg,
          peso_maximo_kg,
          variacao_total_kg,
          variacao_ultima_semana_kg,
          tendencia,
          total_registros: entradas.length,
        },
      };
    } catch (error) {
      throw parseDatabaseError(error, "AlunoRepository.getHistoricoPeso");
    }
  }
}

export default AlunoRepository;
