import { DataBase } from "../config/DbConnect";
import { eq } from "drizzle-orm";
import { treinador } from "../config/db/schema";
import { type_treinador } from "../types/dbSchemas";
import { parseDatabaseError } from "../utils/errors/DatabaseError";

class TreinadorRepository {
	private db: typeof DataBase;

	constructor() {
		this.db = DataBase;
	}

	async getAllTreinadores(): Promise<type_treinador[]> {
		try {
			const resultado = await this.db.select().from(treinador);

			return resultado as unknown as type_treinador[];
		} catch (error) {
			throw parseDatabaseError(error, "TreinadorRepository.getAllTreinadores");
		}
	}


}

export default TreinadorRepository;
