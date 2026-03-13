import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import chalk from "chalk";
import { toNodeHandler } from "better-auth/node";
import swaggerUi from "swagger-ui-express";
import { DbConnect } from "./config/DbConnect";
import { auth } from "./utils/auth";
import { openApiDocument } from "./docs/swagger";

// importação das rotas
import academiaRoutes from './routes/academiaRoutes';
import alunoRoutes from './routes/alunoRoutes';
import exercicioRoutes from './routes/exercicioRoutes';
import authRoutes from "./routes/authRoutes";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 1350;

app.use(cors());

// BetterAuth handler — DEVE ficar ANTES de express.json()
// pois o BetterAuth faz seu próprio parsing do body.
app.all("/api/auth/*splat", toNodeHandler(auth));

app.use(express.json());

// Swagger UI — documentação da API
app.get("/api/docs/openapi.json", (req, res) => {
  res.json(openApiDocument);
});
app.use("/api/docs", swaggerUi.serve, swaggerUi.setup(openApiDocument));

// Rota Health Check
app.get("/api", (req, res) => {
  res.send(
    `API de Controle de Atividades Físicas está funcionando! \nTempo de Uptime: ${process.uptime().toFixed(2)} segundos`,
  );
});
app.get("/", (req, res) => {
  res.redirect("/api");
});

// rotas
app.use('/api', academiaRoutes);
app.use('/api', alunoRoutes);
app.use('/api', exercicioRoutes);
app.use('/api', authRoutes);

//função para iniciar o servidor
async function startServer() {
  try {
    console.log(chalk.blueBright("CONECTANDO AO BANCO DE DADOS..."));
    await DbConnect.connect();
    app.listen(PORT, () => {
      console.log(
        chalk.cyanBright(
          `SERVIDOR RODANDO EM: \n${chalk.greenBright(`http://localhost:${PORT}/`)}`,
        ),
      );
    });
  } catch (error) {
    console.error(chalk.redBright("ERRO AO INICIAR O SERVIDOR:"), error);
    process.exit(1);
  }
}

startServer();