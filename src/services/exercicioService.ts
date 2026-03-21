import ExercicioRepository from "../repositories/exercicioRepository";
import UsuarioRepository from "../repositories/usuarioRepository";
import { type_exercicio } from "../types/dbSchemas";
import { ZodError } from "zod";
import {
    exercicioSchema,
    exercicioUpdateSchema,
    exercicioQuerySchema,
    exercicioIdSchema,
} from "../utils/validations/exercicioValidation";
import { ExercicioComMusculos, FiltrosExercicio, ResultadoPaginadoExercicio } from "../types/filters";

class ExercicioService {
    private repository: ExercicioRepository;
    private usuarioRepository: UsuarioRepository;

    constructor() {
        this.repository = new ExercicioRepository();
        this.usuarioRepository = new UsuarioRepository();
    }

    async createExercicio(body: any, userId: string): Promise<ExercicioComMusculos> {
        try {
            const dadosValidados = exercicioSchema.parse(body);

            const perfil = await this.usuarioRepository.buscarPerfilAcesso(userId);

            if (!dadosValidados.aluno_id && !perfil.isAdmin) {
                throw new Error('FORBIDDEN: apenas administradores podem criar exercícios globais');
            }

            if (dadosValidados.aluno_id) {
                const alunoExiste = await this.repository.verificarAlunoExiste(dadosValidados.aluno_id);
                if (!alunoExiste) {
                    throw new Error('Aluno não encontrado');
                }

                // Aluno só pode criar exercícios para si mesmo; treinador e admin podem criar para qualquer aluno
                if (!perfil.isAdmin && !perfil.isTreinador && perfil.alunoId !== dadosValidados.aluno_id) {
                    throw new Error('FORBIDDEN: você não pode criar exercícios para outro aluno');
                }
            }

            const verificacaoMusculos = await this.repository.verificarMusculosExistem(
                dadosValidados.musculos.map((m) => m.musculo_id),
            );
            if (!verificacaoMusculos.validos) {
                throw new Error(
                    `Músculo(s) não encontrado(s): ${verificacaoMusculos.inexistentes.join(', ')}`,
                );
            }

            const exercicioExistente = await this.repository.findByNome(
                dadosValidados.nome,
                dadosValidados.aluno_id,
            );

            if (exercicioExistente) {
                throw new Error('Já existe um exercício com este nome');
            }

            const novoExercicio: type_exercicio = {
                nome: dadosValidados.nome,
                descricao: dadosValidados.descricao ?? null,
                aluno_id: dadosValidados.aluno_id ?? null,
            };

            const exercicioCriado = await this.repository.createExercicio(
                novoExercicio,
                dadosValidados.musculos,
            );

            return await this.repository.getByIdExercicio(exercicioCriado.id!) as ExercicioComMusculos;
        } catch (error) {
            if (error instanceof ZodError) {
                console.warn('[ExercicioService] [createExercicio] Falha na validação Zod:', error.issues);
            }
            throw error;
        }
    }

    async getAllExercicios(query: any, userId: string): Promise<ResultadoPaginadoExercicio> {
        try {
            const {
                page,
                limite,
                nome,
                grupo_muscular,
                tipo_ativacao,
                aluno_id,
                escopo,
                em_uso,
                ordem_nome,
                incluir_musculos,
                incluir_inativos,
            } = exercicioQuerySchema.parse(query);

            const perfil = await this.usuarioRepository.buscarPerfilAcesso(userId);

            let alunoContexto = aluno_id;
            let escopoFinal = escopo;

            if (!escopoFinal) {
                escopoFinal = perfil.alunoId ? 'TODOS' : 'GLOBAL';
            }

            if (aluno_id) {
                if (!perfil.isAdmin && !perfil.alunoId) {
                } else if (!perfil.isAdmin && perfil.alunoId !== aluno_id) {
                    throw new Error('FORBIDDEN: você não pode listar exercícios de outro aluno');
                }
            }

            if (escopoFinal === 'PESSOAL' || escopoFinal === 'TODOS') {
                if (!alunoContexto && perfil.alunoId) {
                    alunoContexto = perfil.alunoId;
                }

                if (!alunoContexto) {
                    throw new Error('VALIDATION: aluno_id é obrigatório para escopo PESSOAL ou TODOS sem contexto de aluno autenticado');
                }
            }

            if (incluir_inativos && !perfil.isAdmin) {
                throw new Error('FORBIDDEN: apenas administradores podem listar exercícios inativos');
            }

            const filtros: FiltrosExercicio = {};
            if (nome) filtros.nome = nome;
            if (grupo_muscular) filtros.grupo_muscular = grupo_muscular;
            if (tipo_ativacao) filtros.tipo_ativacao = tipo_ativacao;
            if (alunoContexto) filtros.aluno_id = alunoContexto;
            if (escopoFinal) filtros.escopo = escopoFinal;
            if (typeof em_uso === 'boolean') filtros.em_uso = em_uso;
            if (ordem_nome) filtros.ordem_nome = ordem_nome;
            if (incluir_inativos) filtros.incluir_inativos = true;

            return await this.repository.getAllExercicios(filtros, page, limite, incluir_musculos);
        } catch (error) {
            if (error instanceof ZodError) {
                console.warn('[ExercicioService] [getAllExercicios] Falha na validação Zod:', error.issues);
            }
            throw error;
        }
    }

    async getByIdExercicio(idParam: string, userId: string): Promise<ExercicioComMusculos> {
        const id = exercicioIdSchema.parse(idParam);

        const exercicioEncontrado = await this.repository.getByIdExercicio(id);

        if (!exercicioEncontrado) {
            throw new Error('Exercício não encontrado');
        }

        // Exercício pessoal: apenas o dono ou admin pode visualizar
        if (exercicioEncontrado.aluno_id) {
            const perfil = await this.usuarioRepository.buscarPerfilAcesso(userId);
            if (!perfil.isAdmin && perfil.alunoId !== exercicioEncontrado.aluno_id) {
                throw new Error('FORBIDDEN: você não tem permissão para visualizar este exercício');
            }
        }

        return exercicioEncontrado;
    }

    async updateExercicio(idParam: string, body: any, userId: string): Promise<ExercicioComMusculos> {
        try {
            const id = exercicioIdSchema.parse(idParam);
            const dadosValidados = exercicioUpdateSchema.parse(body);

            const exercicioExistente = await this.repository.getByIdExercicio(id);

            if (!exercicioExistente) {
                throw new Error('Exercício não encontrado');
            }

            const perfil = await this.usuarioRepository.buscarPerfilAcesso(userId);

            // Exercício global: apenas admin pode editar
            if (!exercicioExistente.aluno_id && !perfil.isAdmin) {
                throw new Error('FORBIDDEN: apenas administradores podem editar exercícios globais');
            }

            // Exercício pessoal: dono (aluno), qualquer treinador ou admin podem editar
            if (exercicioExistente.aluno_id && !perfil.isAdmin && !perfil.isTreinador && perfil.alunoId !== exercicioExistente.aluno_id) {
                throw new Error('FORBIDDEN: você não tem permissão para editar este exercício');
            }

            if (dadosValidados.musculos && dadosValidados.musculos.length > 0) {
                const verificacaoMusculos = await this.repository.verificarMusculosExistem(
                    dadosValidados.musculos.map((m) => m.musculo_id),
                );
                if (!verificacaoMusculos.validos) {
                    throw new Error(
                        `Músculo(s) não encontrado(s): ${verificacaoMusculos.inexistentes.join(', ')}`,
                    );
                }
            }

            if (dadosValidados.nome && dadosValidados.nome !== exercicioExistente.nome) {
                const duplicado = await this.repository.findByNome(
                    dadosValidados.nome,
                    exercicioExistente.aluno_id,
                );

                if (duplicado) {
                    throw new Error('Já existe um exercício com este nome');
                }
            }

            const { musculos, ...camposExercicio } = dadosValidados;
            const dadosParaAtualizar: Partial<type_exercicio> = {};
            if (camposExercicio.nome !== undefined) dadosParaAtualizar.nome = camposExercicio.nome;
            if (camposExercicio.descricao !== undefined) dadosParaAtualizar.descricao = camposExercicio.descricao;

            await this.repository.updateExercicio(id, dadosParaAtualizar, musculos);

            return await this.repository.getByIdExercicio(id) as ExercicioComMusculos;
        } catch (error) {
            if (error instanceof ZodError) {
                console.warn('[ExercicioService] [updateExercicio] Falha na validação Zod:', error.issues);
            }
            throw error;
        }
    }

    async deleteExercicio(
        idParam: string,
        options: { soft?: boolean; force?: boolean; userId: string },
    ): Promise<{ exercicio: type_exercicio; tipo_exclusao: 'soft' | 'hard' | 'cascade' }> {
        const id = exercicioIdSchema.parse(idParam);
        const { soft = false, force = false, userId } = options;

        const exercicioExistente = await this.repository.getByIdExercicio(id);
        if (!exercicioExistente) {
            throw new Error('Exercício não encontrado');
        }

        const perfil = await this.usuarioRepository.buscarPerfilAcesso(userId);

        // Exercício global: apenas admin pode deletar
        if (!exercicioExistente.aluno_id && !perfil.isAdmin) {
            throw new Error('FORBIDDEN: apenas administradores podem excluir exercícios globais');
        }

        // Exercício pessoal: dono (aluno), qualquer treinador ou admin podem deletar
        if (exercicioExistente.aluno_id && !perfil.isAdmin && !perfil.isTreinador && perfil.alunoId !== exercicioExistente.aluno_id) {
            throw new Error('FORBIDDEN: você não tem permissão para excluir este exercício');
        }

        const totalReferencias = await this.repository.contarReferenciasEmRotina(id);

        // Sem referências = hard delete direto
        if (totalReferencias === 0) {
            await this.repository.hardDeleteExercicio(id);
            return { exercicio: exercicioExistente, tipo_exclusao: 'hard' };
        }

        // Tem referências + ?soft=true = soft delete
        if (soft) {
            const exercicioDesativado = await this.repository.softDeleteExercicio(id);
            return { exercicio: exercicioDesativado, tipo_exclusao: 'soft' };
        }

        // Tem referências + ?force=true = hard delete em cascata, apenas admin
        if (force) {
            if (!perfil.isAdmin) {
                throw new Error('FORBIDDEN: apenas administradores podem forçar a exclusão de exercícios em uso');
            }
            await this.repository.hardDeleteCascade(id);
            return { exercicio: exercicioExistente, tipo_exclusao: 'cascade' };
        }

        // Tem referências, sem parâmetro = 409 orientando o cliente
        throw new Error(
            `Exercício está vinculado a ${totalReferencias} rotina(s) de treino. ` +
            `Use ?soft=true para desativá-lo sem remover as rotinas, ` +
            `ou ?force=true (requer admin) para excluir permanentemente junto com as rotinas.`,
        );
    }
}

export default ExercicioService;
