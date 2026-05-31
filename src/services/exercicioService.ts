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

    private async treinadorPossuiAcessoAoAluno(perfil: Awaited<ReturnType<UsuarioRepository['buscarPerfilAcesso']>>, alunoId: string): Promise<boolean> {
        if (!perfil.isTreinador || !perfil.treinadorId) {
            return false;
        }

        return this.usuarioRepository.alunoVinculadoAoTreinador(alunoId, perfil.treinadorId);
    }

    async createExercicio(body: any, userId: string): Promise<ExercicioComMusculos> {
        try {
            const dadosValidados = exercicioSchema.parse(body);

            const perfil = await this.usuarioRepository.buscarPerfilAcesso(userId);

            const alunoId = dadosValidados.aluno_id ?? (perfil.alunoId || undefined);
            const treinadorId = (perfil.isTreinador && !dadosValidados.aluno_id) ? perfil.treinadorId : undefined;

            if (!alunoId && !treinadorId && !perfil.isAdmin) {
                throw new Error('FORBIDDEN: apenas administradores podem criar exercícios globais');
            }

            if (alunoId) {
                const alunoExiste = await this.repository.verificarAlunoExiste(alunoId);
                if (!alunoExiste) {
                    throw new Error('Aluno não encontrado');
                }

                // Aluno só pode criar exercícios para si mesmo; treinador e admin podem criar para qualquer aluno
                if (!perfil.isAdmin && !perfil.isTreinador && perfil.alunoId !== alunoId) {
                    throw new Error('FORBIDDEN: você não pode criar exercícios para outro aluno');
                }

                if (!perfil.isAdmin && perfil.isTreinador) {
                    const possuiAcesso = await this.treinadorPossuiAcessoAoAluno(perfil, alunoId);
                    if (!possuiAcesso) {
                        throw new Error('FORBIDDEN: treinador só pode criar exercícios para alunos vinculados ao seu perfil');
                    }
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

            if (dadosValidados.aparelhos && dadosValidados.aparelhos.length > 0) {
                const verificacaoAparelhos = await this.repository.verificarAparelhosExistem(
                    dadosValidados.aparelhos.map((a) => a.aparelho_id),
                );
                if (!verificacaoAparelhos.validos) {
                    throw new Error(
                        `Aparelho(s) não encontrado(s): ${verificacaoAparelhos.inexistentes.join(', ')}`,
                    );
                }
            }

            const exercicioExistente = await this.repository.findByNome(
                dadosValidados.nome,
                alunoId,
                treinadorId ?? null,
            );

            if (exercicioExistente) {
                throw new Error('Já existe um exercício com este nome');
            }

            const novoExercicio: type_exercicio = {
                nome: dadosValidados.nome,
                descricao: dadosValidados.descricao ?? null,
                animacao_url: dadosValidados.animacao_url ?? null,
                aluno_id: alunoId ?? null,
                treinador_id: treinadorId ?? null,
                tipo_exercicio: dadosValidados.tipo_exercicio ?? 'REPETICAO',
            };

            const exercicioCriado = await this.repository.createExercicio(
                novoExercicio,
                dadosValidados.musculos,
                dadosValidados.aparelhos,
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
                tipo_exercicio,
                aluno_id,
                treinador_id,
                escopo,
                em_uso,
                ordem_nome,
                incluir_musculos,
                incluir_aparelhos,
                incluir_inativos,
            } = exercicioQuerySchema.parse(query);

            const perfil = await this.usuarioRepository.buscarPerfilAcesso(userId);

            let alunoContexto = aluno_id;
            let treinadorContexto = treinador_id;
            let escopoFinal = escopo;

            if (!escopoFinal) {
                escopoFinal = (perfil.alunoId || perfil.treinadorId) ? 'TODOS' : 'GLOBAL';
            }

            if (aluno_id) {
                if (!perfil.isAdmin && perfil.isAluno && perfil.alunoId !== aluno_id) {
                    throw new Error('FORBIDDEN: você não pode listar exercícios de outro aluno');
                }

                if (!perfil.isAdmin && perfil.isTreinador) {
                    const possuiAcesso = await this.treinadorPossuiAcessoAoAluno(perfil, aluno_id);
                    if (!possuiAcesso) {
                        throw new Error('FORBIDDEN: treinador só pode listar exercícios de alunos vinculados ao seu perfil');
                    }
                }
            }

            if (treinador_id) {
                if (!perfil.isAdmin && perfil.isTreinador && perfil.treinadorId !== treinador_id) {
                    throw new Error('FORBIDDEN: você não pode listar exercícios de outro treinador');
                }
                if (perfil.isAluno) {
                    // Aluno pode listar exercícios do seu treinador?
                    // Por enquanto vamos permitir apenas se for o treinador dele
                    const alunoPerfil = await this.usuarioRepository.buscarPerfilAcesso(userId);
                    if (alunoPerfil.treinadorId !== treinador_id) {
                        throw new Error('FORBIDDEN: você não pode listar exercícios de um treinador que não seja o seu');
                    }
                }
            }

            if (escopoFinal === 'PESSOAL' || escopoFinal === 'TODOS') {
                if (!alunoContexto && perfil.alunoId) {
                    alunoContexto = perfil.alunoId;
                }
                
                // Aluno também vê exercícios do seu treinador por padrão nestes escopos
                if (!treinadorContexto && perfil.treinadorId) {
                    treinadorContexto = perfil.treinadorId;
                }

                if (!alunoContexto && !treinadorContexto) {
                    throw new Error('VALIDATION: aluno_id ou treinador_id é obrigatório para escopo PESSOAL ou TODOS sem contexto de usuário autenticado');
                }
            }

            if (incluir_inativos && !perfil.isAdmin) {
                throw new Error('FORBIDDEN: apenas administradores podem listar exercícios inativos');
            }

            const filtros: FiltrosExercicio = {};
            if (nome) filtros.nome = nome;
            if (grupo_muscular) filtros.grupo_muscular = grupo_muscular;
            if (tipo_ativacao) filtros.tipo_ativacao = tipo_ativacao;
            if (tipo_exercicio) filtros.tipo_exercicio = tipo_exercicio;
            if (alunoContexto) filtros.aluno_id = alunoContexto;
            if (treinadorContexto) filtros.treinador_id = treinadorContexto;
            if (escopoFinal) filtros.escopo = escopoFinal;
            if (typeof em_uso === 'boolean') filtros.em_uso = em_uso;
            if (ordem_nome) filtros.ordem_nome = ordem_nome;
            if (incluir_inativos) filtros.incluir_inativos = true;

            return await this.repository.getAllExercicios(filtros, page, limite, incluir_musculos, incluir_aparelhos);
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

        // Exercício pessoal de aluno: apenas o dono, qualquer treinador ou admin pode visualizar
        if (exercicioEncontrado.aluno_id) {
            const perfil = await this.usuarioRepository.buscarPerfilAcesso(userId);
            const treinadorComAcesso = !perfil.isAdmin && perfil.isTreinador
                ? await this.treinadorPossuiAcessoAoAluno(perfil, exercicioEncontrado.aluno_id)
                : false;

            if (!perfil.isAdmin && !treinadorComAcesso && perfil.alunoId !== exercicioEncontrado.aluno_id) {
                throw new Error('FORBIDDEN: você não tem permissão para visualizar este exercício');
            }
        }

        // Exercício pessoal de treinador: dono, aluno vinculado ou admin pode visualizar
        if (exercicioEncontrado.treinador_id) {
            const perfil = await this.usuarioRepository.buscarPerfilAcesso(userId);
            if (!perfil.isAdmin && perfil.treinadorId !== exercicioEncontrado.treinador_id) {
                if (perfil.isAluno) {
                    if (perfil.alunoTreinadorId !== exercicioEncontrado.treinador_id) {
                        throw new Error('FORBIDDEN: você não tem permissão para visualizar este exercício');
                    }
                } else {
                    throw new Error('FORBIDDEN: você não tem permissão para visualizar este exercício');
                }
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
            if (!exercicioExistente.aluno_id && !exercicioExistente.treinador_id && !perfil.isAdmin) {
                throw new Error('FORBIDDEN: apenas administradores podem editar exercícios globais');
            }

            // Exercício pessoal de aluno: dono, admin ou treinador vinculado ao aluno
            if (exercicioExistente.aluno_id && !perfil.isAdmin) {
                const ehDono = perfil.alunoId === exercicioExistente.aluno_id;
                const treinadorComAcesso = perfil.isTreinador
                    ? await this.treinadorPossuiAcessoAoAluno(perfil, exercicioExistente.aluno_id)
                    : false;

                if (!ehDono && !treinadorComAcesso) {
                    throw new Error('FORBIDDEN: você não tem permissão para editar este exercício');
                }
            }

            // Exercício pessoal de treinador: dono ou admin
            if (exercicioExistente.treinador_id && !perfil.isAdmin) {
                if (perfil.treinadorId !== exercicioExistente.treinador_id) {
                    throw new Error('FORBIDDEN: você não tem permissão para editar este exercício');
                }
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

            if (dadosValidados.aparelhos && dadosValidados.aparelhos.length > 0) {
                const verificacaoAparelhos = await this.repository.verificarAparelhosExistem(
                    dadosValidados.aparelhos.map((a) => a.aparelho_id),
                );
                if (!verificacaoAparelhos.validos) {
                    throw new Error(
                        `Aparelho(s) não encontrado(s): ${verificacaoAparelhos.inexistentes.join(', ')}`,
                    );
                }
            }

            if (dadosValidados.nome && dadosValidados.nome !== exercicioExistente.nome) {
                const duplicado = await this.repository.findByNome(
                    dadosValidados.nome,
                    exercicioExistente.aluno_id,
                    exercicioExistente.treinador_id,
                );

                if (duplicado) {
                    throw new Error('Já existe um exercício com este nome');
                }
            }

            if (
                dadosValidados.tipo_exercicio !== undefined &&
                dadosValidados.tipo_exercicio !== exercicioExistente.tipo_exercicio
            ) {
                const referencias = await this.repository.contarReferenciasEmRotina(id);
                if (referencias > 0) {
                    throw new Error(
                        `CONFLICT: não é possível alterar tipo_exercicio — exercício está vinculado a ${referencias} treino(s). Remova-o dos treinos antes ou crie um novo exercício com o tipo desejado.`,
                    );
                }
            }

            const { musculos, aparelhos, ...camposExercicio } = dadosValidados;
            const dadosParaAtualizar: Partial<type_exercicio> = {};
            if (camposExercicio.nome !== undefined) dadosParaAtualizar.nome = camposExercicio.nome;
            if (camposExercicio.descricao !== undefined) dadosParaAtualizar.descricao = camposExercicio.descricao;
            if (camposExercicio.animacao_url !== undefined) dadosParaAtualizar.animacao_url = camposExercicio.animacao_url;
            if (camposExercicio.tipo_exercicio !== undefined) dadosParaAtualizar.tipo_exercicio = camposExercicio.tipo_exercicio;

            await this.repository.updateExercicio(id, dadosParaAtualizar, musculos, aparelhos);

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
        if (!exercicioExistente.aluno_id && !exercicioExistente.treinador_id && !perfil.isAdmin) {
            throw new Error('FORBIDDEN: apenas administradores podem excluir exercícios globais');
        }

        // Exercício pessoal de aluno: dono, admin ou treinador vinculado ao aluno
        if (exercicioExistente.aluno_id && !perfil.isAdmin) {
            const ehDono = perfil.alunoId === exercicioExistente.aluno_id;
            const treinadorComAcesso = perfil.isTreinador
                ? await this.treinadorPossuiAcessoAoAluno(perfil, exercicioExistente.aluno_id)
                : false;

            if (!ehDono && !treinadorComAcesso) {
                throw new Error('FORBIDDEN: você não tem permissão para excluir este exercício');
            }
        }

        // Exercício pessoal de treinador: dono ou admin
        if (exercicioExistente.treinador_id && !perfil.isAdmin) {
            if (perfil.treinadorId !== exercicioExistente.treinador_id) {
                throw new Error('FORBIDDEN: você não tem permissão para excluir este exercício');
            }
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
