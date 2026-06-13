import SolicitacaoTreinadorRepository from "../repositories/solicitacaoTreinadorRepository";
import TreinadorRepository from "../repositories/treinadorRepository";
import AlunoRepository from "../repositories/alunoRepository";
import ConversaRepository from "../repositories/conversaRepository";
import { solicitarTreinadorSchema, responderSolicitacaoSchema, solicitacaoIdSchema } from "../utils/validations/solicitacaoTreinadorValidation";

class SolicitacaoTreinadorService {
    private repository: SolicitacaoTreinadorRepository;
    private treinadorRepository: TreinadorRepository;
    private alunoRepository: AlunoRepository;
    private conversaRepository: ConversaRepository;

    constructor() {
        this.repository = new SolicitacaoTreinadorRepository();
        this.treinadorRepository = new TreinadorRepository();
        this.alunoRepository = new AlunoRepository();
        this.conversaRepository = new ConversaRepository();
    }

    async criar(userId: string, body: unknown) {
        const { treinador_id } = solicitarTreinadorSchema.parse(body);

        const alunoEncontrado = await this.alunoRepository.findByUserId(userId);
        if (!alunoEncontrado || !alunoEncontrado.id) {
            throw new Error("Perfil de aluno não encontrado para o usuário autenticado");
        }

        if (alunoEncontrado.treinador_id) {
            throw new Error("CONFLITO: Aluno já possui um treinador vinculado");
        }

        const treinadorEncontrado = await this.treinadorRepository.findById(treinador_id);
        if (!treinadorEncontrado) {
            throw new Error(`Treinador com ID ${treinador_id} não encontrado`);
        }

        const duplicada = await this.repository.findByAlunoAndTreinador(alunoEncontrado.id, treinador_id);
        if (duplicada) {
            throw new Error("CONFLITO: Você já enviou uma solicitação para este treinador");
        }

        return this.repository.create(alunoEncontrado.id, treinador_id);
    }

    async buscarSolicitacaoDoAluno(userId: string) {
        return this.repository.findAtivaPorUserId(userId);
    }

    async listarParaTreinador(userId: string, query: any) {
        const status = typeof query.status === 'string' ? query.status : undefined;
        return this.repository.listByTreinadorUserId(userId, status);
    }

    async responder(solicitacaoId: string, userId: string, body: unknown) {
        solicitacaoIdSchema.parse(solicitacaoId);
        const { status } = responderSolicitacaoSchema.parse(body);

        const solicitacao = await this.repository.findById(solicitacaoId);
        if (!solicitacao) {
            throw new Error(`Solicitação com ID ${solicitacaoId} não encontrada`);
        }
        if (solicitacao.status !== 'PENDENTE') {
            throw new Error("CONFLITO: Esta solicitação já foi respondida");
        }

        const treinadorEncontrado = await this.treinadorRepository.findByUserId(userId);
        if (!treinadorEncontrado || treinadorEncontrado.id !== solicitacao.treinador_id) {
            throw new Error("UNAUTHORIZED: Treinador não autorizado para esta solicitação");
        }

        const solicitacaoAtualizada = await this.repository.updateStatus(solicitacaoId, status);

        if (status === 'ACEITA' && treinadorEncontrado.id) {
            await this.alunoRepository.update(solicitacao.aluno_id, { treinador_id: treinadorEncontrado.id });

            const conversaExistente = await this.conversaRepository.findByTreinadorEAluno(
                treinadorEncontrado.id,
                solicitacao.aluno_id
            );
            if (!conversaExistente) {
                await this.conversaRepository.create({
                    treinador_id: treinadorEncontrado.id,
                    aluno_id: solicitacao.aluno_id,
                });
            }
        }

        return solicitacaoAtualizada;
    }
}

export default SolicitacaoTreinadorService;
