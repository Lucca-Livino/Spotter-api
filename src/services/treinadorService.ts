import TreinadorRepository from "../repositories/treinadorRepository";
import { type_treinador } from "../types/dbSchemas";
import { treinadorIdSchema } from "../utils/validations/treinadorValidation";

class TreinadorService {
	private repository: TreinadorRepository;

	constructor() {
		this.repository = new TreinadorRepository();
	}

	async getAllTreinadores(): Promise<type_treinador[]> {
		console.log(
			"[TreinadorService] [getAllTreinadores] Buscando todos os treinadores",
		);

		const treinadores = await this.repository.getAllTreinadores();

		console.log(
			`[TreinadorService] [getAllTreinadores] ${treinadores.length} treinador(es) encontrado(s)`,
		);

		return treinadores;
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
