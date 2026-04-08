import { DataBase } from '../config/DbConnect';
import { conversa } from '../config/db/schema';
import { and, desc, eq, sql } from 'drizzle-orm';
import { type_conversa } from '../types/dbSchemas';
import { parseDatabaseError } from '../utils/errors/DatabaseError';

class ConversaRepository {
  private db: typeof DataBase;

  constructor() {
    this.db = DataBase;
  }

  async create(novaConversa: type_conversa): Promise<type_conversa> {
    try {
      const resultado = await this.db.insert(conversa).values(novaConversa).returning();
      return resultado[0] as unknown as type_conversa;
    } catch (error) {
      throw parseDatabaseError(error, 'ConversaRepository.create');
    }
  }

  async findById(id: string): Promise<type_conversa | null> {
    try {
      const resultado = await this.db.select().from(conversa).where(eq(conversa.id, id)).limit(1);
      if (resultado.length === 0) return null;
      return resultado[0] as unknown as type_conversa;
    } catch (error) {
      throw parseDatabaseError(error, 'ConversaRepository.findById');
    }
  }

  async findByTreinadorEAluno(treinadorId: string, alunoId: string): Promise<type_conversa | null> {
    try {
      const resultado = await this.db
        .select()
        .from(conversa)
        .where(and(eq(conversa.treinador_id, treinadorId), eq(conversa.aluno_id, alunoId), eq(conversa.ativa, true)))
        .limit(1);

      if (resultado.length === 0) return null;
      return resultado[0] as unknown as type_conversa;
    } catch (error) {
      throw parseDatabaseError(error, 'ConversaRepository.findByTreinadorEAluno');
    }
  }

  async listByTreinadorId(treinadorId: string, page: number, limite: number) {
    try {
      const offset = (page - 1) * limite;
      const [dados, countResult] = await Promise.all([
        this.db
          .select()
          .from(conversa)
          .where(and(eq(conversa.treinador_id, treinadorId), eq(conversa.ativa, true)))
          .orderBy(desc(conversa.ultima_mensagem_em), desc(conversa.created_at))
          .limit(limite)
          .offset(offset),
        this.db
          .select({ count: sql<number>`count(*)` })
          .from(conversa)
          .where(and(eq(conversa.treinador_id, treinadorId), eq(conversa.ativa, true))),
      ]);

      const total = Number(countResult[0].count);
      return {
        dados: dados as unknown as type_conversa[],
        total,
        page,
        limite,
        totalPages: Math.ceil(total / limite),
      };
    } catch (error) {
      throw parseDatabaseError(error, 'ConversaRepository.listByTreinadorId');
    }
  }

  async listByAlunoId(alunoId: string, page: number, limite: number) {
    try {
      const offset = (page - 1) * limite;
      const [dados, countResult] = await Promise.all([
        this.db
          .select()
          .from(conversa)
          .where(and(eq(conversa.aluno_id, alunoId), eq(conversa.ativa, true)))
          .orderBy(desc(conversa.ultima_mensagem_em), desc(conversa.created_at))
          .limit(limite)
          .offset(offset),
        this.db
          .select({ count: sql<number>`count(*)` })
          .from(conversa)
          .where(and(eq(conversa.aluno_id, alunoId), eq(conversa.ativa, true))),
      ]);

      const total = Number(countResult[0].count);
      return {
        dados: dados as unknown as type_conversa[],
        total,
        page,
        limite,
        totalPages: Math.ceil(total / limite),
      };
    } catch (error) {
      throw parseDatabaseError(error, 'ConversaRepository.listByAlunoId');
    }
  }

  async updateUltimaMensagem(id: string, data: Date): Promise<void> {
    try {
      await this.db
        .update(conversa)
        .set({ ultima_mensagem_em: data })
        .where(eq(conversa.id, id));
    } catch (error) {
      throw parseDatabaseError(error, 'ConversaRepository.updateUltimaMensagem');
    }
  }
}

export default ConversaRepository;
