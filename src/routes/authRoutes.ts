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
import { aluno, treinador, user } from "../config/db/schema";
import { eq } from "drizzle-orm";

const router = express.Router();

// Deletar a conta do usuário logado (Hard Delete em cascata)
router.delete("/me", authMiddleware, async (req, res) => {
  try {
    const usuarioLogado = (req as any).user;
    
    if (!usuarioLogado || !usuarioLogado.id) {
      res.status(401).json({ success: false, message: "Não autorizado" });
      return;
    }

    // A deleção na tabela 'user' deve disparar exclusões em cascata 
    // nas tabelas 'aluno', 'treinador', 'session' e 'account' (BetterAuth).
    await DataBase.delete(user).where(eq(user.id, usuarioLogado.id));

    console.log(`[authRoutes] [DELETE /me] Usuário ${usuarioLogado.id} apagado com sucesso.`);
    
    res.json({ success: true, message: "Sua conta foi excluída com sucesso." });
  } catch (error) {
    console.error("[authRoutes] [DELETE /me] Erro ao excluir conta:", error);
    res.status(500).json({ success: false, message: "Erro ao excluir conta. Tente novamente mais tarde." });
  }
});

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
    
    console.log(`\n[FCM Token] Recebida solicitação para atualizar token do usuário ${user.id}. Token: ${fcm_token || 'VAZIO'}`);

    if (fcm_token === undefined) {
      console.warn(`[FCM Token] Falha: fcm_token não foi fornecido na requisição.`);
      res.status(400).json({ success: false, message: "fcm_token é obrigatório" });
      return;
    }

    const usuarioRepository = new UsuarioRepository();
    const perfilAcesso = await usuarioRepository.buscarPerfilAcesso(user.id);

    if (perfilAcesso.isTreinador) {
      await DataBase.update(treinador)
        .set({ fcm_token })
        .where(eq(treinador.user_id, user.id));
      console.log(`[FCM Token] Atualizado com sucesso para o Treinador (User ID: ${user.id}).`);
    } else if (perfilAcesso.isAluno) {
      await DataBase.update(aluno)
        .set({ fcm_token })
        .where(eq(aluno.user_id, user.id));
      console.log(`[FCM Token] Atualizado com sucesso para o Aluno (User ID: ${user.id}).`);
    } else {
      console.warn(`[FCM Token] Usuário ${user.id} não possui perfil de Aluno nem Treinador. Token não salvo.`);
    }

    res.json({ success: true, message: "Token FCM atualizado" });
  } catch (error) {
    console.error("[authRoutes] Erro ao atualizar token FCM:", error);
    res.status(500).json({ success: false, message: "Erro ao atualizar token FCM" });
  }
});

// Redirecionamento Web -> App (Solução para emails clicáveis localmente)
router.get("/redirect-app", (req, res) => {
  const token = req.query.token;
  if (!token) {
    res.status(400).send("Token não fornecido");
    return;
  }
  
  // HTML com fallback JavaScript: 
  // Tenta redirecionar para academia://reset-password?token=XYZ
  // E pede ao usuário para clicar se o navegador bloquear o redirecionamento automático
  const deepLink = `academia://reset-password?token=${token}`;
  
  const html = `
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Redirecionando para o App...</title>
      <script>
        // Tenta o redirecionamento imediato via JavaScript
        window.onload = function() {
          window.location.href = "${deepLink}";
        };
      </script>
      <style>
        body { font-family: sans-serif; text-align: center; padding: 50px 20px; background: #121212; color: #fff; }
        a { display: inline-block; margin-top: 20px; padding: 10px 20px; background: #007bff; color: #fff; text-decoration: none; border-radius: 5px; font-weight: bold; }
      </style>
    </head>
    <body>
      <h2>Redirecionando para o aplicativo Spotter...</h2>
      <p>Se o aplicativo não abrir automaticamente em alguns segundos, clique no botão abaixo:</p>
      <a href="${deepLink}">Abrir no Aplicativo</a>
    </body>
    </html>
  `;
  
  res.send(html);
});

export default router;
