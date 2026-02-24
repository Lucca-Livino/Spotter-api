import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import chalk from 'chalk';
import { DbConnect } from './config/DbConnect';

// importação das rotas
import academiaRoutes from './routes/academiaRoutes';
import alunoRoutes from './routes/alunoRoutes';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 1350;

app.use(cors());
app.use(express.json());

// Rota Health Check
app.get('/api', (req, res) => {
  res.send(`API de Controle de Atividades Físicas está funcionando! \nTempo de Uptime: ${process.uptime().toFixed(2)} segundos`);
});

// rotas
app.use('/api', academiaRoutes);
app.use('/api', alunoRoutes);

//função para iniciar o servidor
async function startServer() {
  try {
    console.log(chalk.blueBright('CONECTANDO AO BANCO DE DADOS...'));
    await DbConnect.connect();
    app.listen(PORT, () => {
      console.log(chalk.cyanBright(`SERVIDOR RODANDO EM: \n${chalk.greenBright(`http://localhost:${PORT}/`)}`));
    });
  } catch (error) {
    console.error(chalk.redBright('ERRO AO INICIAR O SERVIDOR:'), error);
    process.exit(1);
  }
};

startServer();