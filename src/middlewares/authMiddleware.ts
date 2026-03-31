import type { Request, Response, NextFunction } from "express";
import { auth } from "../utils/auth";
import { fromNodeHeaders } from "better-auth/node";
import CommonResponse from "../utils/helpers/commonResponse";

// Middleware de autenticação via BetterAuth.
// Verifica a sessão do usuário através do header Authorization: Bearer <token>
// Em caso de sucesso, anexa req.user e req.authSession à requisição.
export async function authMiddleware(
    req: Request,
    res: Response,
    next: NextFunction,
) {
    try {
        const session = await auth.api.getSession({
            headers: fromNodeHeaders(req.headers),
        });

        if (!session) {
            CommonResponse.error(res, 401, null, null, [], "Não autorizado. Faça login para continuar.");
            return;
        }

        // Anexa dados do usuário e sessão à requisição
        (req as any).user = session.user;
        (req as any).authSession = session.session;

        next();
    } catch (error) {
        CommonResponse.error(res, 401, null, null, [], "Token inválido ou sessão expirada.");
        return;
    }
}
