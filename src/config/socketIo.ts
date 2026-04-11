import { Server as HttpServer } from 'http';
import { Server, type Socket } from 'socket.io';
import { fromNodeHeaders } from 'better-auth/node';
import { auth } from '../utils/auth';
import ConversaService from '../services/conversaService';
import MensagemConversaService from '../services/mensagemConversaService';
import { conversaIdSchema } from '../utils/validations/conversaValidation';
import { envioMensagemConversaSchema } from '../utils/validations/mensagemConversaValidation';
import type { type_mensagem_conversa } from '../types/dbSchemas';

type SocketAutenticado = Socket & {
  data: {
    userId?: string;
  };
};

let ioInstance: Server | null = null;

export function initSocketIO(httpServer: HttpServer): Server {
  ioInstance = new Server(httpServer, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST', 'PATCH'],
    },
  });

  ioInstance.use(async (socket: SocketAutenticado, next: (err?: Error) => void) => {
    try {
      const authToken = socket.handshake.auth?.token as string | undefined;
      const headers = { ...socket.handshake.headers } as Record<string, string | string[] | undefined>;

      const rawAuthorization = headers.authorization;
      const authorization = Array.isArray(rawAuthorization) ? rawAuthorization[0] : rawAuthorization;
      const bearerToken = authorization?.toLowerCase().startsWith('bearer ')
        ? authorization.slice(7).trim()
        : undefined;

      const rawAccessToken = headers.access_token;
      const accessToken = Array.isArray(rawAccessToken) ? rawAccessToken[0] : rawAccessToken;

      const rawAcessToken = headers.acess_token;
      const acessToken = Array.isArray(rawAcessToken) ? rawAcessToken[0] : rawAcessToken;

      const token = authToken ?? bearerToken ?? accessToken ?? acessToken;

      if (token) {
        headers.authorization = `Bearer ${token}`;
      }

      const session = await auth.api.getSession({
        headers: fromNodeHeaders(headers),
      });

      if (!session?.user?.id) {
        return next(new Error('Nao autorizado.'));
      }

      socket.data.userId = session.user.id;
      return next();
    } catch (error) {
      return next(new Error('Falha ao autenticar socket.'));
    }
  });

  ioInstance.on('connection', (socket: SocketAutenticado) => {
    const userId = socket.data.userId as string;
    const conversaService = new ConversaService();
    const mensagemConversaService = new MensagemConversaService();

    socket.join(`usuario:${userId}`);

    socket.on('conversa:entrar', async (payload: { conversaId: string }, ack?: (response: unknown) => void) => {
      try {
        const conversaId = conversaIdSchema.parse(payload?.conversaId);
        await conversaService.obterConversaPorId(conversaId, userId);
        socket.join(`conversa:${conversaId}`);
        ack?.({ ok: true, conversaId });
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Erro ao entrar na conversa';
        ack?.({ ok: false, error: message });
      }
    });

    socket.on('conversa:sair', (payload: { conversaId: string }, ack?: (response: unknown) => void) => {
      try {
        const conversaId = conversaIdSchema.parse(payload?.conversaId);
        socket.leave(`conversa:${conversaId}`);
        ack?.({ ok: true, conversaId });
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Erro ao sair da conversa';
        ack?.({ ok: false, error: message });
      }
    });

    socket.on(
      'mensagem:enviar',
      async (
        payload: { conversaId: string; conteudo: string },
        ack?: (response: unknown) => void,
      ) => {
        try {
          const conversaId = conversaIdSchema.parse(payload?.conversaId);
          const { conteudo } = envioMensagemConversaSchema.parse({ conteudo: payload?.conteudo });

          const mensagem = await mensagemConversaService.enviarMensagem(conversaId, userId, conteudo);
          emitirNovaMensagem(conversaId, mensagem);

          ack?.({ ok: true, data: mensagem });
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Erro ao enviar mensagem';
          ack?.({ ok: false, error: message });
        }
      },
    );
  });

  return ioInstance;
}

export function getIO(): Server | null {
  return ioInstance;
}

export function emitirNovaMensagem(conversaId: string, mensagem: type_mensagem_conversa): void {
  if (!ioInstance) return;
  ioInstance.to(`conversa:${conversaId}`).emit('mensagem:nova', mensagem);
}

export function emitirMensagensLidas(conversaId: string, userId: string, marcadas: number): void {
  if (!ioInstance) return;
  ioInstance.to(`conversa:${conversaId}`).emit('mensagem:lidas', {
    conversa_id: conversaId,
    user_id: userId,
    marcadas,
  });
}
