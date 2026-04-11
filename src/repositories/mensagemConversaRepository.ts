import { DataBase } from '../config/DbConnect';
import { mensagem_conversa } from '../config/db/schema';
import { and, asc, eq, isNull, ne, sql } from 'drizzle-orm';
import { type_mensagem_conversa } from '../types/dbSchemas';
import { parseDatabaseError } from '../utils/errors/DatabaseError';

class MensagemConversaRepository {
  private db: typeof DataBase;

  constructor() {
    this.db = DataBase;
  }

  async create(novaMensagem: type_mensagem_conversa): Promise<type_mensagem_conversa> {
    try {
      const resultado = await this.db.insert(mensagem_conversa).values(novaMensagem).returning();
      return resultado[0] as unknown as type_mensagem_conversa;
    } catch (error) {
      throw parseDatabaseError(error, 'MensagemConversaRepository.create');
    }
  }

  async listByConversa(conversaId: string, page: number, limite: number) {
    try {
      const offset = (page - 1) * limite;
      const [dados, countResult] = await Promise.all([
        this.db
          .select()
          .from(mensagem_conversa)
          .where(and(eq(mensagem_conversa.conversa_id, conversaId), eq(mensagem_conversa.ativa, true)))
          .orderBy(asc(mensagem_conversa.enviada_em))
          .limit(limite)
          .offset(offset),
        this.db
          .select({ count: sql<number>`count(*)` })
          .from(mensagem_conversa)
          .where(and(eq(mensagem_conversa.conversa_id, conversaId), eq(mensagem_conversa.ativa, true))),
      ]);

      const total = Number(countResult[0].count);
      return {
        dados: dados as unknown as type_mensagem_conversa[],
        total,
        page,
        limite,
        totalPages: Math.ceil(total / limite),
      };
    } catch (error) {
      throw parseDatabaseError(error, 'MensagemConversaRepository.listByConversa');
    }
  }

  async marcarComoLidas(conversaId: string, leitorUserId: string): Promise<number> {
    try {
      const resultado = await this.db
        .update(mensagem_conversa)
        .set({ lida_em: new Date(), lida_por_user_id: leitorUserId })
        .where(
          and(
            eq(mensagem_conversa.conversa_id, conversaId),
            eq(mensagem_conversa.ativa, true),
            ne(mensagem_conversa.remetente_user_id, leitorUserId),
            isNull(mensagem_conversa.lida_por_user_id),
          ),
        )
        .returning({ id: mensagem_conversa.id });

      return resultado.length;
    } catch (error) {
      throw parseDatabaseError(error, 'MensagemConversaRepository.marcarComoLidas');
    }
  }
}

export default MensagemConversaRepository;
