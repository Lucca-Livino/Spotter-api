import AlunosRepository from "../repositories/alunoRepository";
import { type_aluno } from "../types/dbSchemas";
import { type_physical_data } from "../types/userSchemas";
import { alunoSchema, alunoUpdateSchema, alunoIdSchema, alunoQuerySchema } from "../utils/validations/alunoValidation";
import { ZodError } from "zod";

class AlunoService {
  private repository: AlunosRepository;

  constructor() {
    this.repository = new AlunosRepository();
  }

  async getAlunoById(id: string): Promise<type_aluno> {
    console.log(
      `[AlunoService] [getAlunoById] Buscando aluno com ID: ${id}`,
    );

    alunoIdSchema.parse(id);
    
    const Aluno = await this.repository.findById(id);

    if (!Aluno) {
      throw new Error(`Aluno com ID ${id} não encontrado`);
    }

    console.log(
      `[AlunoService] [getAlunoById] Aluno encontrado com sucesso`,
    );

    return Aluno;
  }

  async getAllAlunos(query: any) {
    console.log("[AlunoService] [getAllAlunos] Buscando todos os alunos");
    const { page, limite } = alunoQuerySchema.parse(query);
    const resultado = await this.repository.getAllAlunos(page, limite);
    console.log(`[AlunoService] [getAllAlunos] ${resultado.total} aluno(s) encontrado(s)`);
    return resultado;
  }

  async getAlunoByUserId(userId: string): Promise<any> {
    const Aluno = await this.repository.findFullByUserId(userId);
    if (!Aluno) {
      throw new Error(`Perfil de aluno não encontrado para o usuário ${userId}`);
    }
    return Aluno;
  }

  async createAluno(novoAluno: type_aluno): Promise<type_aluno> {
    console.log(
      "[AlunoService] [createAluno] Dados recebidos do controller:",
      JSON.stringify(novoAluno, null, 2),
    );
    try {
      console.log(
        "[AlunoService] [createAluno] Iniciando validação com Zod...",
      );
      alunoSchema.parse(novoAluno);
      console.log(
        "[AlunoService] [createAluno] Validação Zod concluída com sucesso",
      );

      const AlunoSanitizado = {
        ...novoAluno,
        status_conta: novoAluno.status_conta ?? true,
      };
      console.log(
        "[AlunoService] [createAluno] Dados sanitizados:",
        JSON.stringify(AlunoSanitizado, null, 2),
      );

      console.log(
        "[AlunoService] [createAluno] Chamando repository.create...",
      );
      const resposta = await this.repository.create(AlunoSanitizado);
      console.log(
        "[AlunoService] [createAluno] Aluno persistido com sucesso:",
        JSON.stringify(resposta, null, 2),
      );

      return resposta;
    } catch (error) {
      if (error instanceof ZodError) {
        console.warn(
          "[AlunoService] [createAluno] Falha na validação Zod:",
          error.issues,
        );
        throw error;
      }
      console.warn(
        "[AlunoService] [createAluno] Erro recebido do repository, propagando...",
      );
      throw error;
    }
  }

  async findByEmail(email: string): Promise<type_aluno> {
    console.log(
      `[AlunoService] [findByEmail] Buscando aluno com email: ${email}`,
    );
    try {
      const resposta = await this.repository.findByEmail(email);
      console.log(
        `[AlunoService] [findByEmail] Aluno encontrado com sucesso: ${resposta.nome}`,
      );
      return resposta;
    } catch (error) {
      console.warn(
        "[AlunoService] [findByEmail] Erro recebido do repository, propagando...",
      );
      throw error;
    }
  }

  async deleteAluno(id: string): Promise<type_aluno> {
    console.log(
      `[AlunoService] [deleteAluno] Deletando aluno com ID: ${id}`,
    );

    alunoIdSchema.parse(id);

    const alunoDeletado = await this.repository.delete(id);

    if (!alunoDeletado) {
      throw new Error(`Aluno com ID ${id} não encontrado`);
    }

    console.log(
      `[AlunoService] [deleteAluno] Aluno deletado com sucesso`,
    );

    return alunoDeletado;
  }

  async updateAluno(id: string, alunoEditado: Partial<type_aluno>): Promise<type_aluno> {
    console.log(
      `[AlunoService] [updateAluno] Atualizando aluno com ID: ${id}`,
    );

    alunoIdSchema.parse(id);

    if (Object.keys(alunoEditado).length === 0) {
      throw new Error("Corpo da requisição é obrigatório");
    }

    alunoUpdateSchema.parse(alunoEditado);

    const alunoAtualizado = await this.repository.update(id, alunoEditado);

    if (!alunoAtualizado) {
      throw new Error(`Aluno com ID ${id} não encontrado`);
    }

    console.log(
      "[AlunoService] [updateAluno] Aluno atualizado com sucesso",
    );

    return alunoAtualizado;
  }
}

export default AlunoService;
