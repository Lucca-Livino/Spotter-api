import { DataBase } from '../config/DbConnect';
import { aluno, treinador } from '../config/db/schema';
import { eq } from 'drizzle-orm';
import { parseDatabaseError } from '../utils/errors/DatabaseError';

export interface PerfilAcesso {
    alunoId: string | null;
    treinadorId: string | null;
    isAluno: boolean;
    isTreinador: boolean;
    isAdmin: boolean;
}

class UsuarioRepository {
    private db: typeof DataBase;

    constructor() {
        this.db = DataBase;
    }

    async buscarPerfilAcesso(userId: string): Promise<PerfilAcesso> {
        try {
            const [treinadorResult, alunoResult] = await Promise.all([
                this.db
                    .select({ id: treinador.id, is_admin: treinador.is_admin })
                    .from(treinador)
                    .where(eq(treinador.user_id, userId))
                    .limit(1),
                this.db
                    .select({ id: aluno.id, is_admin: aluno.is_admin })
                    .from(aluno)
                    .where(eq(aluno.user_id, userId))
                    .limit(1),
            ]);

            const isAluno = Boolean(alunoResult[0]);
            const isTreinador = Boolean(treinadorResult[0]);
            const isAdmin =
                treinadorResult[0]?.is_admin === true ||
                alunoResult[0]?.is_admin === true;

            return {
                alunoId: alunoResult[0]?.id ?? null,
                treinadorId: treinadorResult[0]?.id ?? null,
                isAluno,
                isTreinador,
                isAdmin,
            };
        } catch (error) {
            throw parseDatabaseError(error, 'UsuarioRepository.buscarPerfilAcesso');
        }
    }
}

export default UsuarioRepository;
