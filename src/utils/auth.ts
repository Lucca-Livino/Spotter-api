import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { DataBase } from "../config/DbConnect";
import { bearer } from "better-auth/plugins";

export const auth = betterAuth({
  secret: process.env.BETTER_AUTH_SECRET!,
  baseURL: process.env.BETTER_AUTH_URL,
  basePath: "/api/auth",

  database: drizzleAdapter(DataBase, {
    provider: "pg",
  }),

  user: {
    additionalFields: {
      tipo: {
        type: "string",
        required: true,
        defaultValue: "aluno",
      },
    },
  },

  plugins: [
    bearer()
  ],

  emailAndPassword: {
    enabled: true,
    autoSignIn: process.env.NODE_ENV !== "production",
  },

  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 dias
    updateAge: 60 * 60 * 24,     // Atualiza a sessão a cada 1 dia
  },

  trustedOrigins: [
    "*",
    "http://localhost:1350",
    "http://localhost:3000",
    "https://atividadesfisicas-api-qa.yuriprojects.dpdns.org",
    "https://atividadesfisicas-api.yuriprojects.dpdns.org",
  ],
});
