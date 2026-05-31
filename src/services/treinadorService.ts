import TreinadorRepository from "../repositories/treinadorRepository";
import AlunoRepository from "../repositories/alunoRepository";
import UsuarioRepository from "../repositories/usuarioRepository";
import { type_treinador } from "../types/dbSchemas";
import {
	treinadorIdSchema,
	treinadorSchema,
	treinadorQuerySchema,
	treinadorUpdateSchema,
} from "../utils/validations/treinadorValidation";
import { alunoQuerySchema } from "../utils/validations/alunoValidation";
import { ZodError } from "zod";
import { DatabaseError } from "../utils/errors/DatabaseError";
import HttpStatusCode from "../utils/helpers/httpStatusCode";

class TreinadorService {
	private repository: TreinadorRepository;
	private alunoRepository: AlunoRepository;
	private usuarioRepository: UsuarioRepository;

	constructor() {
		this.repository = new TreinadorRepository();
		this.alunoRepository = new AlunoRepository();
		this.usuarioRepository = new UsuarioRepository();
	}

	async getAllTreinadores(query: any) {
		console.log("[TreinadorService] [getAllTreinadores] Buscando todos os treinadores");
		const { page, limite } = treinadorQuerySchema.parse(query);
		const resultado = await this.repository.getAllTreinadores(page, limite);
		console.log(`[TreinadorService] [getAllTreinadores] ${resultado.total} treinador(es) encontrado(s)`);
		return resultado;
	}

	async getTreinadorByUserId(userId: string): Promise<any> {
		const Treinador = await this.repository.findFullByUserId(userId);
		if (!Treinador) {
			throw new Error(`Perfil de treinador não encontrado para o usuário ${userId}`);
		}
		return Treinador;
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

	async updateTreinador(
		id: string,
		treinadorEditado: Partial<type_treinador>,
	): Promise<type_treinador> {
		console.log(
			`[TreinadorService] [updateTreinador] Atualizando treinador com ID: ${id}`,
		);

		treinadorIdSchema.parse(id);

		if (Object.keys(treinadorEditado).length === 0) {
			throw new Error("Corpo da requisição é obrigatório");
		}

		treinadorUpdateSchema.parse(treinadorEditado);

		const treinadorAtualizado = await this.repository.update(id, treinadorEditado);

		if (!treinadorAtualizado) {
			throw new Error(`Treinador com ID ${id} não encontrado`);
		}

		console.log(
			"[TreinadorService] [updateTreinador] Treinador atualizado com sucesso",
		);

		return treinadorAtualizado;
	}

	async getAlunosVinculados(userId: string, query: any) {
		const { page, limite } = alunoQuerySchema.parse(query);
		const perfil = await this.usuarioRepository.buscarPerfilAcesso(userId);

		if (!perfil.isTreinador && !perfil.isAdmin) {
			throw new Error("FORBIDDEN: usuário sem perfil de treinador");
		}

		if (!perfil.treinadorId) {
			throw new Error("Treinador não encontrado");
		}

		return this.alunoRepository.getAlunosByTreinadorId(
			perfil.treinadorId,
			page,
			limite,
		);
	}
}

export default TreinadorService;
