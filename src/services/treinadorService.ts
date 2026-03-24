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
}

export default TreinadorService;
