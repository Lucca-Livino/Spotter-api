import { sql } from 'drizzle-orm';
import { DataBase, DbConnect } from '../config/DbConnect';
import chalk from 'chalk';

import { seedAcademias } from './academiaSeeds';
import { seedUsuarios } from './usuarioSeeds';
import { seedTreinadores } from './treinadorSeeds';
import { seedExercicios, seedExerciciosPessoais } from './exercicioSeeds';
import { seedTreinos } from './treinoSeeds';

async function runSeeds() {
    try {
        console.log(chalk.blueBright('⏳ Iniciando o processo de Seed...'));
        await DbConnect.connect();

        // 1. LIMPAR O BANCO DE DADOS (TRUNCATE CASCADE)
        // O CASCADE deleta todos os registros dependentes automaticamente sem violar as FKs.
        console.log(chalk.whiteBright('Limpando o banco de dados...'));
        await DataBase.execute(sql`
            TRUNCATE TABLE 
                treino_exercicio, treino, exercicio_aparelho, exercicio_musculo, 
                exercicio, aparelho, musculo, treinador_academia, treinador, 
                avaliacao_fisica, aluno_academia, aluno, academia,
                session, account, verification, "user"
            CASCADE;
        `);

        // 2. EXECUTAR OS SEEDS NA ORDEM CORRETA
        console.log(chalk.cyanBright('Executando Seeds:'))
        console.log(chalk.cyanBright(`※ ${chalk.cyan('Academias...')}`));
        const academiasIds = await seedAcademias();

        console.log(chalk.cyanBright(`※ ${chalk.cyan('Exercícios, Músculos e Aparelhos...')}`));
        await seedExercicios();

        console.log(chalk.cyanBright(`※ ${chalk.cyan('Alunos e Treinadores...')}`));
        const alunoIds = await seedUsuarios(academiasIds);
        await seedTreinadores(academiasIds);

        console.log(chalk.cyanBright(`※ ${chalk.cyan('Exercícios Pessoais...')}`));
        await seedExerciciosPessoais(alunoIds);

        console.log(chalk.cyanBright(`※ ${chalk.cyan('Treinos e Itens de Treino...')}`));
        await seedTreinos();

        console.log(chalk.greenBright('Seeds executados com sucesso!'));
        process.exit(0);
    } catch (error) {
        console.error(chalk.redBright('Erro ao rodar os seeds:'), error);
        process.exit(1);
    }
}

runSeeds();