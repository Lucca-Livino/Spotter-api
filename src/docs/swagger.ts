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
    ],
});
