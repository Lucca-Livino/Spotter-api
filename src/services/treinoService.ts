import { ZodError } from 'zod';
import TreinoRepository, { ResultadoPaginadoTreino, TreinoComExercicios } from '../repositories/treinoRepository';
import {
    treinoSchema,
    treinoIdSchema,
    treinoDetalheQuerySchema,
    treinoListQuerySchema,
} from '../utils/validations/treinoValidation';
import { type_treino } from '../types/dbSchemas';

class TreinoService {
    private repository: TreinoRepository;

    constructor() {
        this.repository = new TreinoRepository();
    }

    async createTreino(body: unknown, userId: string): Promise<type_treino> {
        try {
            const dadosValidados = treinoSchema.parse(body);
            const perfil = await this.repository.buscarPerfilAcesso(userId);
            const usuarioPodeCriar = perfil.isAluno || perfil.isTreinador || perfil.isAdmin;
            let alunoIdDestino = dadosValidados.aluno_id;

            if (!usuarioPodeCriar) {
                throw new Error('FORBIDDEN: usuário sem perfil para criar treinos');
            }

            // Aluno cria apenas treino próprio e não pode criar para outro aluno.
            if (perfil.isAluno && !perfil.isTreinador && !perfil.isAdmin) {
                if (alunoIdDestino && alunoIdDestino !== perfil.alunoId) {
                    throw new Error('FORBIDDEN: aluno só pode criar treino para si mesmo');
                }
                alunoIdDestino = perfil.alunoId ?? undefined;
            }

            // Treinador/admin precisam informar o aluno de destino, exceto quando também tiverem perfil de aluno.
            if (!alunoIdDestino) {
                if (perfil.alunoId) {
                    alunoIdDestino = perfil.alunoId;
                } else {
                    throw new Error('VALIDATION: aluno_id é obrigatório para este perfil');
                }
            }

            const alunoExiste = await this.repository.verificarAlunoExiste(alunoIdDestino);
            if (!alunoExiste) {
                throw new Error('Aluno não encontrado');
            }

            const novoTreino: type_treino = {
                nome: dadosValidados.nome,
                descricao: dadosValidados.descricao ?? null,
                usuario_id: alunoIdDestino,
                treinador_id: perfil.treinadorId,
            };

            return await this.repository.create(novoTreino);
        } catch (error) {
            if (error instanceof ZodError) {
                console.warn('[TreinoService] [createTreino] Falha na validação Zod:', error.issues);
            }
            throw error;
        }
    }

    async getTreinoById(idParam: string, userId: string, query: unknown): Promise<TreinoComExercicios> {
        const id = treinoIdSchema.parse(idParam);
        const filtros = treinoDetalheQuerySchema.parse(query);
        const perfil = await this.repository.buscarPerfilAcesso(userId);

        if (!perfil.isAluno && !perfil.isTreinador && !perfil.isAdmin) {
            throw new Error('FORBIDDEN: usuário sem perfil para acessar treinos');
        }

        const treinoEncontrado = await this.repository.findById(id, filtros);

        if (!treinoEncontrado) {
            throw new Error('Treino não encontrado');
        }

        const podeVisualizar =
            perfil.isAdmin ||
            perfil.alunoId === treinoEncontrado.usuario_id ||
            (perfil.treinadorId !== null && perfil.treinadorId === treinoEncontrado.treinador_id);

        if (!podeVisualizar) {
            throw new Error('FORBIDDEN: você não tem permissão para visualizar este treino');
        }

        return treinoEncontrado;
    }

    async getAllTreinos(query: unknown, userId: string): Promise<ResultadoPaginadoTreino> {
        const filtrosLista = treinoListQuerySchema.parse(query);
        const perfil = await this.repository.buscarPerfilAcesso(userId);
        const possuiFiltroDeExercicio = Boolean(
            filtrosLista.nome_exercicio ||
            filtrosLista.grupo_muscular ||
            filtrosLista.tipo_ativacao,
        );

        if (!perfil.isAluno && !perfil.isTreinador && !perfil.isAdmin) {
            throw new Error('FORBIDDEN: usuário sem perfil para acessar treinos');
        }

        if (!perfil.isAdmin) {
            if (perfil.isTreinador) {
                if (filtrosLista.treinador_id && filtrosLista.treinador_id !== perfil.treinadorId) {
                    throw new Error('FORBIDDEN: treinador só pode listar os próprios treinos');
                }
                filtrosLista.treinador_id = perfil.treinadorId ?? undefined;
            } else if (perfil.isAluno) {
                if (filtrosLista.usuario_id && filtrosLista.usuario_id !== perfil.alunoId) {
                    throw new Error('FORBIDDEN: aluno só pode listar os próprios treinos');
                }
                filtrosLista.usuario_id = perfil.alunoId ?? undefined;
            }
        }

        if (possuiFiltroDeExercicio) {
            filtrosLista.somente_com_exercicios = true;
            filtrosLista.incluir_exercicios = true;
        }

        const filtrosDetalhe = treinoDetalheQuerySchema.parse({
            nome_exercicio: filtrosLista.nome_exercicio,
            grupo_muscular: filtrosLista.grupo_muscular,
            tipo_ativacao: filtrosLista.tipo_ativacao,
            ordem_execucao: filtrosLista.ordem_execucao,
            apenas_ativos: filtrosLista.apenas_ativos,
            incluir_musculos: filtrosLista.incluir_musculos,
            incluir_aparelhos: filtrosLista.incluir_aparelhos,
        });

        return this.repository.findAll(filtrosLista, filtrosDetalhe);
    }
}

export default TreinoService;
