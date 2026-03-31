import { DataBase } from "../config/DbConnect";
import { eq, sql } from "drizzle-orm";
import { treinador } from "../config/db/schema";
import { type_treinador } from "../types/dbSchemas";
import { parseDatabaseError } from "../utils/errors/DatabaseError";

class TreinadorRepository {
	private db: typeof DataBase;

	constructor() {
		this.db = DataBase;
	}

	async create(novoTreinador: type_treinador): Promise<type_treinador> {
		try {
			const { academia_id, ...restTreinador } = novoTreinador;
			const resultado = await this.db
				.insert(treinador)
				.values({ ...restTreinador, academia_id })
				.returning();

			return resultado[0] as unknown as type_treinador;
		} catch (error) {
			throw parseDatabaseError(error, "TreinadorRepository.create");
		}
	}

	async getAllTreinadores(page: number, limite: number): Promise<{ dados: type_treinador[]; total: number; page: number; limite: number; totalPages: number }> {
		try {
			const offset = (page - 1) * limite;
			const [dados, countResult] = await Promise.all([
				this.db.select().from(treinador).limit(limite).offset(offset),
				this.db.select({ count: sql<number>`count(*)` }).from(treinador),
			]);
			const total = Number(countResult[0].count);
			return { dados: dados as unknown as type_treinador[], total, page, limite, totalPages: Math.ceil(total / limite) };
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
}

export default TreinadorRepository;
