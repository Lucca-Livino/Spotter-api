import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import chalk from 'chalk';
import { DbConnect } from './config/DbConnect';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 1350;

app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
  res.send('Hello, World!');
});

//função para iniciar o servidor
async function startServer() {
  try {
    console.log(chalk.yellowBright('Conectando ao banco de dados...'));
    await DbConnect.connect();
    app.listen(PORT, () => {
      console.log(chalk.greenBright(`Servidor rodando em ${chalk.blueBright(`http://localhost:${PORT}/`)}`));
    });
  } catch (error) {
    console.error(chalk.redBright('Erro ao iniciar o servidor:'), error);
    process.exit(1);
  }
};

startServer();