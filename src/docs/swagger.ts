import { OpenAPIRegistry, OpenApiGeneratorV3 } from "@asteasolutions/zod-to-openapi";
import { academiaRegistry } from "./academiaDoc";
import { alunoRegistry } from "./alunoDoc";
import { treinadorRegistry } from "./treinadorDoc";
import { exercicioRegistry } from "./exercicioDoc";
import { authRegistry } from "./authDoc";
import { treinoRegistry } from "./treinoDoc";
import { sessaoRegistry } from "./sessaoDoc";
import { historicoRegistry } from "./historicoDoc";
import { musculoRegistry } from "./musculoDoc";
import { aparelhoRegistry } from "./aparelhoDoc";
<<<<<<< HEAD
import { uploadRegistry } from "./uploadDoc";
=======
import { conversaRegistry } from "./conversaDoc";
>>>>>>> 1cd4000b9f8bdbd5afa09c6922c372009eedff80

const registry = new OpenAPIRegistry([
    academiaRegistry,
    alunoRegistry,
    treinadorRegistry,
    exercicioRegistry,
    authRegistry,
    treinoRegistry,
    sessaoRegistry,
    historicoRegistry,
    musculoRegistry,
    aparelhoRegistry,
<<<<<<< HEAD
    uploadRegistry,
=======
    conversaRegistry,
>>>>>>> 1cd4000b9f8bdbd5afa09c6922c372009eedff80
]);

registry.registerComponent("securitySchemes", "BearerAuth", {
    type: "http",
    scheme: "bearer",
    bearerFormat: "JWT",
    description: "Token de sessão do BetterAuth. Envie no header: Authorization: Bearer <token>",
});

const generator = new OpenApiGeneratorV3(registry.definitions);

export const openApiDocument = generator.generateDocument({
    openapi: "3.0.0",
    info: {
        title: "Fabrica4 API — Controle de Atividades Físicas",
        version: "1.0.0",
        description: "API para controle de atividades físicas, academias, alunos e exercícios.",
    },
    servers: [
        { url: "/api", description: "Servidor atual (relativo)" },
    ],
    tags: [
        { name: "Auth", description: "Autenticação e gerenciamento de sessão" },
        { name: "Academia", description: "CRUD de academias" },
        { name: "Aluno", description: "CRUD de alunos" },
        { name: "Treinador", description: "Endpoints de treinadores" },
        { name: "Exercicio", description: "CRUD de exercícios" },
        { name: "Treino", description: "CRUD de treinos" },
        { name: "Sessao", description: "Sessões de treino" },
        { name: "Historico", description: "Histórico e estatísticas de treinos" },
        { name: "Musculo", description: "Listagem de músculos" },
        { name: "Aparelho", description: "Listagem de aparelhos de academia" },
<<<<<<< HEAD
        { name: "Upload", description: "Upload de arquivos para o bucket S3 (GarageHQ)" },
=======
        { name: "Conversa", description: "Conversas e mensagens entre aluno e treinador" },
>>>>>>> 1cd4000b9f8bdbd5afa09c6922c372009eedff80
    ],
});
