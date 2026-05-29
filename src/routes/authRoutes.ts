// As rotas de autenticação do BetterAuth são gerenciadas automaticamente
// pelo handler montado em server.ts: app.all("/api/auth/*splat", toNodeHandler(auth))
//
// Endpoints disponíveis do BetterAuth (prefixo /api/auth):
//
//   POST /api/auth/sign-up/email    -> Cadastro com email/senha
//   POST /api/auth/sign-in/email    -> Login com email/senha
//   POST /api/auth/sign-out         -> Logout (invalida sessão)
//   GET  /api/auth/get-session      -> Retorna sessão atual do usuário
//
// No app Android, após o login, enviar o token nas requisições:
//   Authorization: Bearer <token_da_sessao>
//
// Este arquivo pode ser usado para rotas personalizadas de auth,
// como buscar perfil completo do aluno/treinador autenticado.

import express from "express";
import { authMiddleware } from "../middlewares/authMiddleware";
import UsuarioRepository from "../repositories/usuarioRepository";
import AlunoRepository from "../repositories/alunoRepository";
import TreinadorRepository from "../repositories/treinadorRepository";
import { DataBase } from "../config/DbConnect";
import { aluno, treinador } from "../config/db/schema";
import { eq } from "drizzle-orm";

const router = express.Router();

// Rota inteligente para obter o perfil completo do usuário logado
router.get("/me", authMiddleware, async (req, res) => {
  try {
    const user = (req as any).user;
    const usuarioRepository = new UsuarioRepository();
    const perfilAcesso = await usuarioRepository.buscarPerfilAcesso(user.id);

    let dadosCompletos: any = null;

    if (perfilAcesso.isTreinador && user.id) {
        const treinadorRepo = new TreinadorRepository();
        dadosCompletos = await treinadorRepo.findFullByUserId(user.id);
    } else if (perfilAcesso.isAluno && user.id) {
        const alunoRepo = new AlunoRepository();
        dadosCompletos = await alunoRepo.findFullByUserId(user.id);
    }

    res.json({
        success: true,
        data: {
            ...user,
            tipo: perfilAcesso.isTreinador ? "treinador" : "aluno",
            isAdmin: perfilAcesso.isAdmin,
            perfil: dadosCompletos
        },
    });

  } catch (error) {
    console.error("[authRoutes] Erro na rota /me:", error);
    res
      .status(500)
      .json({ success: false, message: "Erro ao carregar perfil" });
  }
});

// Atualizar FCM token do usuário autenticado
router.patch("/me/fcm-token", authMiddleware, async (req, res) => {
  try {
    const user = (req as any).user;
    const { fcm_token } = req.body as { fcm_token?: string };

    if (fcm_token === undefined) {
      res.status(400).json({ success: false, message: "fcm_token é obrigatório" });
      return;
    }

    const usuarioRepository = new UsuarioRepository();
    const perfilAcesso = await usuarioRepository.buscarPerfilAcesso(user.id);

    if (perfilAcesso.isTreinador) {
      await DataBase.update(treinador)
        .set({ fcm_token })
        .where(eq(treinador.user_id, user.id));
    } else if (perfilAcesso.isAluno) {
      await DataBase.update(aluno)
        .set({ fcm_token })
        .where(eq(aluno.user_id, user.id));
    }

    res.json({ success: true, message: "Token FCM atualizado" });
  } catch (error) {
    console.error("[authRoutes] Erro ao atualizar token FCM:", error);
    res.status(500).json({ success: false, message: "Erro ao atualizar token FCM" });
  }
});

export default router;
