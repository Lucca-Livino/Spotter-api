import { OpenAPIRegistry, OpenApiGeneratorV3 } from "@asteasolutions/zod-to-openapi";
import { academiaRegistry } from "./academiaDoc";
import { alunoRegistry } from "./alunoDoc";
import { exercicioRegistry } from "./exercicioDoc";
import { authRegistry } from "./authDoc";

const registry = new OpenAPIRegistry([
    academiaRegistry,
    alunoRegistry,
    exercicioRegistry,
    authRegistry,
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
    servers: [{ url: "/api", description: "Servidor local" }],
    tags: [
        { name: "Auth", description: "Autenticação e gerenciamento de sessão" },
        { name: "Academia", description: "CRUD de academias" },
        { name: "Aluno", description: "CRUD de alunos" },
        { name: "Exercicio", description: "CRUD de exercícios" },
    ],
});
