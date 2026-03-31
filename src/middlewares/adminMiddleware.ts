import { Request, Response, NextFunction } from "express";
import { DataBase } from "../config/DbConnect";
import { aluno, treinador } from "../config/db/schema";
import { eq } from "drizzle-orm";
import CommonResponse from "../utils/helpers/commonResponse";

// Deve ser usado APÓS o authMiddleware, que já popula req.user
export async function adminMiddleware(req: Request, res: Response, next: NextFunction) {
    try {
        const userId = (req as any).user?.id;

        if (!userId) {
            CommonResponse.error(res, 401, null, null, [], "Não autorizado. Faça login para continuar.");
            return;
        }

        // Busca o perfil do usuário como aluno ou treinador
        const [perfilAluno] = await DataBase
            .select({ is_admin: aluno.is_admin })
            .from(aluno)
            .where(eq(aluno.user_id, userId));

        if (perfilAluno?.is_admin) {
            next();
            return;
        }

        const [perfilTreinador] = await DataBase
            .select({ is_admin: treinador.is_admin })
            .from(treinador)
            .where(eq(treinador.user_id, userId));

        if (perfilTreinador?.is_admin) {
            next();
            return;
        }

        CommonResponse.error(res, 403, null, null, [], "Acesso negado. Permissão de administrador necessária.");
    } catch (error) {
        CommonResponse.serverError(res, error, "Erro interno ao verificar permissões.");
    }
}