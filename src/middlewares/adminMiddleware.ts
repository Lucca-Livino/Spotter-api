import { Request, Response, NextFunction } from "express";
import { DataBase } from "../config/DbConnect";
import { aluno, treinador } from "../config/db/schema";
import { eq } from "drizzle-orm";

// Deve ser usado APÓS o authMiddleware, que já popula req.user
export async function adminMiddleware(req: Request, res: Response, next: NextFunction) {
    try {
        const userId = (req as any).user?.id;

        if (!userId) {
            res.status(401).json({
                success: false,
                message: "Não autorizado. Faça login para continuar.",
            });
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

        res.status(403).json({
            success: false,
            message: "Acesso negado. Permissão de administrador necessária.",
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Erro interno ao verificar permissões.",
        });
    }
}