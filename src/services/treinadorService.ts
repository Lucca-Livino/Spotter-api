import TreinadorRepository from "../repositories/treinadorRepository";
import { type_treinador } from "../types/dbSchemas";
import { treinadorIdSchema, treinadorSchema, treinadorQuerySchema } from "../utils/validations/treinadorValidation";
import { ZodError } from "zod";
import { DatabaseError } from "../utils/errors/DatabaseError";
import HttpStatusCode from "../utils/helpers/httpStatusCode";

class TreinadorService {
	private repository: TreinadorRepository;

	constructor() {
		this.repository = new TreinadorRepository();
	}

	async getAllTreinadores(query: any) {
		console.log("[TreinadorService] [getAllTreinadores] Buscando todos os treinadores");
		const { page, limite } = treinadorQuerySchema.parse(query);
		const resultado = await this.repository.getAllTreinadores(page, limite);
		console.log(`[TreinadorService] [getAllTreinadores] ${resultado.total} treinador(es) encontrado(s)`);
		return resultado;
	}

	async createTreinador(novoTreinador: type_treinador): Promise<type_treinador> {
		try {
			treinadorSchema.parse(novoTreinador);

			const treinadorExistente = await this.repository.findByUserId(
				novoTreinador.user_id,
			);

			if (treinadorExistente) {
				throw new DatabaseError(
					"Usuário autenticado já possui perfil de treinador",
					HttpStatusCode.CONFLICT.code,
					`Key (user_id)=(${novoTreinador.user_id}) already exists.`,
					"treinador_user_id_unique",
					"23505",
				);
			}

			const treinadorSanitizado = {
				...novoTreinador,
				status_conta: novoTreinador.status_conta ?? true,
			};

			return await this.repository.create(treinadorSanitizado);
		} catch (error) {
			if (error instanceof ZodError) {
				throw error;
			}

			throw error;
		}
	}

	async getTreinadorById(id: string): Promise<type_treinador> {
		console.log(
			`[TreinadorService] [getTreinadorById] Buscando treinador com ID: ${id}`,
		);

		treinadorIdSchema.parse(id);

		const treinador = await this.repository.findById(id);

		if (!treinador) {
			throw new Error(`Treinador com ID ${id} não encontrado`);
		}

		console.log(
			"[TreinadorService] [getTreinadorById] Treinador encontrado com sucesso",
		);

		return treinador;
	}
}

export default TreinadorService;
