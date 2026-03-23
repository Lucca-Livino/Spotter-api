import { ZodError } from 'zod';
import TreinoRepository, {
    ResultadoPaginadoTreino,
    TreinoComExercicios,
    TreinoExercicioPatchInput,
    TreinoExercicioUpdateInput,
} from '../repositories/treinoRepository';
import UsuarioRepository from '../repositories/usuarioRepository';
import {
    treinoSchema,
    treinoUpdateSchema,
    treinoIdSchema,
    treinoDetalheQuerySchema,
    treinoListQuerySchema,
    treinoDeleteQuerySchema,
} from '../utils/validations/treinoValidation';
import { type_treino } from '../types/dbSchemas';

class TreinoService {
    private repository: TreinoRepository;
    private usuarioRepository: UsuarioRepository;

    constructor() {
        this.repository = new TreinoRepository();
        this.usuarioRepository = new UsuarioRepository();
    }

    private async validarExerciciosParaVinculo(
        itens: TreinoExercicioPatchInput[],
        perfil: Awaited<ReturnType<UsuarioRepository['buscarPerfilAcesso']>>,
        alunoIdDonoDoTreino: string,
    ): Promise<void> {
        if (itens.length === 0) {
            return;
        }

        const exercicioIdsUnicos = Array.from(new Set(itens.map((item) => item.exercicio_id)));
        const exerciciosEncontrados = await this.repository.findExerciciosByIds(exercicioIdsUnicos);

        if (exerciciosEncontrados.length !== exercicioIdsUnicos.length) {
            throw new Error('VALIDATION: um ou mais exercícios informados não existem');
        }

        const exerciciosInvalidos = exerciciosEncontrados.filter((item) => item.deletado_em !== null);
        if (exerciciosInvalidos.length > 0) {
            throw new Error('VALIDATION: não é permitido adicionar exercício inativo ao treino');
        }

        const exerciciosSemPermissao = exerciciosEncontrados.filter((item) => {
            if (item.aluno_id === null) {
                return false;
            }

            if (perfil.isAdmin) {
                return false;
            }

            if (perfil.alunoId && item.aluno_id === perfil.alunoId) {
                return false;
            }

            if (perfil.isTreinador && item.aluno_id === alunoIdDonoDoTreino) {
                return false;
            }

            return true;
        });

        if (exerciciosSemPermissao.length > 0) {
            throw new Error('FORBIDDEN: você não tem permissão para usar um ou mais exercícios informados');
        }
    }

    async createTreino(body: unknown, userId: string): Promise<TreinoComExercicios> {
        try {
            const dadosValidados = treinoSchema.parse(body);
            const perfil = await this.usuarioRepository.buscarPerfilAcesso(userId);
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
                dias_semana: dadosValidados.dias_semana ?? null,
                ordem: dadosValidados.ordem ?? null,
            };

            const exerciciosIniciais = (dadosValidados.exercicios ?? []) as TreinoExercicioPatchInput[];

            await this.validarExerciciosParaVinculo(exerciciosIniciais, perfil, alunoIdDestino);

            const treinoCriado = exerciciosIniciais.length > 0
                ? await this.repository.createComExercicios(novoTreino, exerciciosIniciais)
                : await this.repository.create(novoTreino);

            const treinoDetalhado = await this.repository.findById(
                treinoCriado.id as string,
                treinoDetalheQuerySchema.parse({}),
            );

            if (!treinoDetalhado) {
                throw new Error('Treino não encontrado');
            }

            return treinoDetalhado;
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
        const perfil = await this.usuarioRepository.buscarPerfilAcesso(userId);

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
        const perfil = await this.usuarioRepository.buscarPerfilAcesso(userId);
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

    async updateTreino(idParam: string, body: unknown, userId: string): Promise<TreinoComExercicios> {
        const id = treinoIdSchema.parse(idParam);
        const dadosValidados = treinoUpdateSchema.parse(body);
        const perfil = await this.usuarioRepository.buscarPerfilAcesso(userId);

        if (!perfil.isAluno && !perfil.isTreinador && !perfil.isAdmin) {
            throw new Error('FORBIDDEN: usuário sem perfil para atualizar treinos');
        }

        const treinoAtual = await this.repository.findBaseById(id);

        if (!treinoAtual) {
            throw new Error('Treino não encontrado');
        }

        const podeAtualizar =
            perfil.isAdmin ||
            perfil.alunoId === treinoAtual.usuario_id ||
            (perfil.treinadorId !== null && perfil.treinadorId === treinoAtual.treinador_id);

        if (!podeAtualizar) {
            throw new Error('FORBIDDEN: você não tem permissão para atualizar este treino');
        }

        const adicionarExercicios = (dadosValidados.adicionar_exercicios ?? []) as TreinoExercicioPatchInput[];
        const atualizarExercicios = (dadosValidados.atualizar_exercicios ?? []) as TreinoExercicioUpdateInput[];
        const removerExerciciosIds = dadosValidados.remover_exercicios_ids ?? [];
        let idsResolvidosParaRemocao: string[] = [];

        const precisaEstadoAtualTreino =
            removerExerciciosIds.length > 0 ||
            adicionarExercicios.length > 0 ||
            atualizarExercicios.length > 0;

        const treinoDetalhadoAtual = precisaEstadoAtualTreino
            ? await this.repository.findById(
                id,
                treinoDetalheQuerySchema.parse({ apenas_ativos: false }),
            )
            : null;

        if (precisaEstadoAtualTreino && !treinoDetalhadoAtual) {
            throw new Error('Treino não encontrado');
        }

        await this.validarExerciciosParaVinculo(adicionarExercicios, perfil, treinoAtual.usuario_id);

        if (removerExerciciosIds.length > 0) {
            const idsSolicitadosUnicos = Array.from(new Set(removerExerciciosIds));
            const idsItemDoTreino = new Set(treinoDetalhadoAtual!.exercicios.map((item) => item.id));

            const itensPorExercicioId = treinoDetalhadoAtual!.exercicios.reduce(
                (acc, item) => {
                    const lista = acc.get(item.exercicio.id) ?? [];
                    lista.push(item.id);
                    acc.set(item.exercicio.id, lista);
                    return acc;
                },
                new Map<string, string[]>(),
            );

            const idsRemocao = new Set<string>();

            for (const idSolicitado of idsSolicitadosUnicos) {
                if (idsItemDoTreino.has(idSolicitado)) {
                    idsRemocao.add(idSolicitado);
                    continue;
                }

                const itensDoExercicio = itensPorExercicioId.get(idSolicitado);
                if (itensDoExercicio && itensDoExercicio.length > 0) {
                    itensDoExercicio.forEach((idItem) => idsRemocao.add(idItem));
                    continue;
                }

                throw new Error('VALIDATION: um ou mais itens informados para remoção não pertencem a este treino');
            }

            idsResolvidosParaRemocao = Array.from(idsRemocao);
        }

        if (atualizarExercicios.length > 0) {
            const idsItemDoTreino = new Map(
                treinoDetalhadoAtual!.exercicios.map((item) => [item.id, item]),
            );
            const idsRemovidos = new Set(idsResolvidosParaRemocao);

            const idsInvalidos = atualizarExercicios.filter(
                (item) => !idsItemDoTreino.has(item.id) || idsRemovidos.has(item.id),
            );
            if (idsInvalidos.length > 0) {
                throw new Error(
                    'VALIDATION: um ou mais itens de atualizar_exercicios não pertencem a este treino ou estão sendo removidos',
                );
            }

            const idsAtualizando = new Set(atualizarExercicios.map((item) => item.id));
            const ordensMantidas = new Set(
                treinoDetalhadoAtual!.exercicios
                    .filter((item) => !idsRemovidos.has(item.id) && !idsAtualizando.has(item.id))
                    .map((item) => item.ordem_execucao),
            );
            const ordensAdicionando = new Set(adicionarExercicios.map((item) => item.ordem_execucao));

            for (const update of atualizarExercicios) {
                if (update.ordem_execucao !== undefined) {
                    if (ordensMantidas.has(update.ordem_execucao) || ordensAdicionando.has(update.ordem_execucao)) {
                        throw new Error('VALIDATION: ordem_execucao conflita com outro item do treino');
                    }
                }
            }
        }

        if (adicionarExercicios.length > 0) {
            const idsRemovidos = new Set(idsResolvidosParaRemocao);
            const idsAtualizando = new Set(atualizarExercicios.map((item) => item.id));

            const novasOrdensAtualizacao = new Set(
                atualizarExercicios
                    .filter((item) => item.ordem_execucao !== undefined)
                    .map((item) => item.ordem_execucao!),
            );

            const ordensMantidas = new Set(
                treinoDetalhadoAtual!.exercicios
                    .filter((item) => !idsRemovidos.has(item.id) && !idsAtualizando.has(item.id))
                    .map((item) => item.ordem_execucao),
            );

            const conflitoOrdem = adicionarExercicios.some(
                (item) => ordensMantidas.has(item.ordem_execucao) || novasOrdensAtualizacao.has(item.ordem_execucao),
            );
            if (conflitoOrdem) {
                throw new Error('VALIDATION: ordem_execucao já utilizada por outro item do treino');
            }
        }

        const payloadAtualizacao: Partial<Pick<type_treino, 'nome' | 'descricao' | 'treinador_id' | 'dias_semana' | 'ordem'>> = {};
        if (dadosValidados.nome !== undefined) payloadAtualizacao.nome = dadosValidados.nome;
        if (dadosValidados.descricao !== undefined) payloadAtualizacao.descricao = dadosValidados.descricao;
        if (dadosValidados.dias_semana !== undefined) payloadAtualizacao.dias_semana = dadosValidados.dias_semana;
        if (dadosValidados.ordem !== undefined) payloadAtualizacao.ordem = dadosValidados.ordem;

        if (dadosValidados.treinador_id !== undefined) {
            if (dadosValidados.treinador_id !== null) {
                const treinadorExiste = await this.repository.verificarTreinadorExiste(dadosValidados.treinador_id);
                if (!treinadorExiste) {
                    throw new Error('VALIDATION: treinador não encontrado');
                }
            }
            payloadAtualizacao.treinador_id = dadosValidados.treinador_id;
        }

        if (Object.keys(payloadAtualizacao).length > 0) {
            const treinoAtualizado = await this.repository.update(id, payloadAtualizacao);

            if (!treinoAtualizado) {
                throw new Error('Treino não encontrado');
            }
        }

        if (idsResolvidosParaRemocao.length > 0) {
            await this.repository.removeExerciciosDoTreino(id, idsResolvidosParaRemocao);
        }

        if (atualizarExercicios.length > 0) {
            await this.repository.updateExerciciosDoTreino(id, atualizarExercicios);
        }

        if (adicionarExercicios.length > 0) {
            await this.repository.addExerciciosAoTreino(id, adicionarExercicios);
        }

        const treinoAtualizadoComExercicios = await this.repository.findById(
            id,
            treinoDetalheQuerySchema.parse({}),
        );

        if (!treinoAtualizadoComExercicios) {
            throw new Error('Treino não encontrado');
        }

        return treinoAtualizadoComExercicios;
    }

    async deleteTreino(
        idParam: string,
        query: unknown,
        userId: string,
    ): Promise<{ treino: type_treino; tipo_exclusao: 'soft' | 'hard' }> {
        const id = treinoIdSchema.parse(idParam);
        const { force } = treinoDeleteQuerySchema.parse(query);
        const perfil = await this.usuarioRepository.buscarPerfilAcesso(userId);

        if (!perfil.isAluno && !perfil.isTreinador && !perfil.isAdmin) {
            throw new Error('FORBIDDEN: usuário sem perfil para excluir treinos');
        }

        const treinoExistente = await this.repository.findBaseById(id);

        if (!treinoExistente) {
            throw new Error('Treino não encontrado');
        }

        const podeDeletar =
            perfil.isAdmin ||
            perfil.alunoId === treinoExistente.usuario_id ||
            (perfil.treinadorId !== null && perfil.treinadorId === treinoExistente.treinador_id);

        if (!podeDeletar) {
            throw new Error('FORBIDDEN: você não tem permissão para excluir este treino');
        }

        if (force) {
            if (!perfil.isAdmin) {
                throw new Error('FORBIDDEN: apenas administradores podem forçar a exclusão permanente de treinos');
            }

            await this.repository.hardDelete(id);
            return { treino: treinoExistente, tipo_exclusao: 'hard' };
        }

        const treinoDeletado = await this.repository.softDelete(id);
        return { treino: treinoDeletado, tipo_exclusao: 'soft' };
    }
}

export default TreinoService;
