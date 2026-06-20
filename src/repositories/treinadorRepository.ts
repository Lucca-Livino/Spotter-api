import { DataBase } from "../config/DbConnect";
import { eq, sql, and } from "drizzle-orm";
import { treinador, user, treinador_academia, academia, solicitacao_treinador } from "../config/db/schema";
import { type_treinador } from "../types/dbSchemas";
import { parseDatabaseError } from "../utils/errors/DatabaseError";

class TreinadorRepository {
	private db: typeof DataBase;

	constructor() {
		this.db = DataBase;
	}

	async findFullByUserId(userId: string): Promise<any | null> {
		try {
			const rows = await this.db
				.select({
					id: treinador.id,
					nome: treinador.nome,
					email: user.email,
					data_nascimento: treinador.data_nascimento,
					sexo: treinador.sexo,
					cref: treinador.cref,
					especializacao: treinador.especializacao,
					graduacao: treinador.graduacao,
					turnos: treinador.turnos,
					url_foto: treinador.url_foto,
					academia_id: treinador.academia_id,
					fcm_token: treinador.fcm_token,
					academia_nome: academia.nome,
				})
				.from(treinador)
				.innerJoin(user, eq(treinador.user_id, user.id))
				.leftJoin(academia, eq(treinador.academia_id, academia.id))
				.where(eq(treinador.user_id, userId))
				.limit(1);

			const treinadorEncontrado = rows[0];
			if (!treinadorEncontrado) return null;

			// Buscar todos os vínculos de academias
			const vinculos = await this.db
				.select({
					id: academia.id,
					nome: academia.nome,
					endereco_cidade: academia.endereco_cidade,
				})
				.from(treinador_academia)
				.innerJoin(academia, eq(treinador_academia.academia_id, academia.id))
				.where(eq(treinador_academia.treinador_id, treinadorEncontrado.id));

			return {
				...treinadorEncontrado,
				academias: vinculos,
			};
		} catch (error) {
			throw parseDatabaseError(error, "TreinadorRepository.findFullByUserId");
		}
	}

	async create(novoTreinador: type_treinador): Promise<type_treinador> {
		try {
			const { academia_id, ...restTreinador } = novoTreinador;
			
			const resultado = await this.db.transaction(async (tx) => {
				// 1. Tentar buscar foto do usuário se não enviada
				let urlFotoFinal = restTreinador.url_foto;
				if (!urlFotoFinal) {
					const userData = await tx
						.select({ image: user.image })
						.from(user)
						.where(eq(user.id, restTreinador.user_id))
						.limit(1);
					urlFotoFinal = userData[0]?.image ?? null;
				}

				const insertData = {
					...restTreinador,
					url_foto: urlFotoFinal,
					academia_id,
				};

				// 2. Inserir Treinador
				const [treinadorCriado] = await tx
					.insert(treinador)
					.values(insertData)
					.returning();

				// 3. Vincular Treinador à Academia
				await tx
					.insert(treinador_academia)
					.values({
						treinador_id: treinadorCriado.id,
						academia_id: academia_id,
					});

				return treinadorCriado;
			});

			return resultado as unknown as type_treinador;
		} catch (error) {
			throw parseDatabaseError(error, "TreinadorRepository.create");
		}
	}

	async getAllTreinadores(page: number, limite: number, alunoId?: string): Promise<{ dados: any[]; total: number; page: number; limite: number; totalPages: number }> {
		try {
			const offset = (page - 1) * limite;
			const [rows, countResult] = await Promise.all([
				alunoId
					? this.db
						.select({
							id: treinador.id,
							nome: treinador.nome,
							cref: treinador.cref,
							especializacao: treinador.especializacao,
							graduacao: treinador.graduacao,
							turnos: treinador.turnos,
							url_foto: treinador.url_foto,
							academia_id: treinador.academia_id,
							status_conta: treinador.status_conta,
							user_id: treinador.user_id,
							solicitacao_status: solicitacao_treinador.status,
						})
						.from(treinador)
						.leftJoin(
							solicitacao_treinador,
							and(
								eq(solicitacao_treinador.treinador_id, treinador.id),
								eq(solicitacao_treinador.aluno_id, alunoId)
							)
						)
						.limit(limite)
						.offset(offset)
					: this.db.select().from(treinador).limit(limite).offset(offset),
				this.db.select({ count: sql<number>`count(*)` }).from(treinador),
			]);
			const total = Number(countResult[0].count);
			return { dados: rows as any[], total, page, limite, totalPages: Math.ceil(total / limite) };
		} catch (error) {
			throw parseDatabaseError(error, "TreinadorRepository.getAllTreinadores");
		}
	}

	async findById(id: string): Promise<type_treinador | null> {
		try {
			const resultado = await this.db
				.select()
				.from(treinador)
				.where(eq(treinador.id, id))
				.limit(1);

			if (resultado.length === 0) {
				return null;
			}

			return resultado[0] as unknown as type_treinador;
		} catch (error) {
			throw parseDatabaseError(error, "TreinadorRepository.findById");
		}
	}

	async findByUserId(userId: string): Promise<type_treinador | null> {
		try {
			const resultado = await this.db
				.select()
				.from(treinador)
				.where(eq(treinador.user_id, userId))
				.limit(1);

			if (resultado.length === 0) {
				return null;
			}

			return resultado[0] as unknown as type_treinador;
		} catch (error) {
			throw parseDatabaseError(error, "TreinadorRepository.findByUserId");
		}
	}

	async update(
		id: string,
		treinadorEditado: Partial<type_treinador>,
		academias_ids?: string[],
	): Promise<type_treinador | null> {
		try {
			const resultado = await this.db.transaction(async (tx) => {
				// 1. Atualizar tabela treinador
				const [treinadorAtualizado] = await tx
					.update(treinador)
					.set(treinadorEditado)
					.where(eq(treinador.id, id))
					.returning();

				if (!treinadorAtualizado) return null;

				// 2. Sincronizar academias se fornecidas
				if (academias_ids) {
					await tx
						.delete(treinador_academia)
						.where(eq(treinador_academia.treinador_id, id));

					if (academias_ids.length > 0) {
						await tx
							.insert(treinador_academia)
							.values(academias_ids.map(acId => ({
								treinador_id: id,
								academia_id: acId
							})));
					}
				}

				return treinadorAtualizado;
			});

			return resultado as unknown as type_treinador;
		} catch (error) {
			throw parseDatabaseError(error, "TreinadorRepository.update");
		}
	}
}

export default TreinadorRepository;
