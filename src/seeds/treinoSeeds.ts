import { eq } from 'drizzle-orm';
import { DataBase } from '../config/DbConnect';
import { aluno, treinador, exercicio, treino, treino_exercicio } from '../config/db/schema';

type TreinoSeedInput = {
    nome: string;
    descricao: string;
    alunoNome: string;
    treinadorNome: string | null;
    exercicios: Array<{
        nome: string;
        series: number;
        repeticoes: string;
        carga_sugerida: string | null;
        tempo_descanso_segundos: number;
        ordem_execucao: number;
    }>;
};

const treinosSeed: TreinoSeedInput[] = [
    {
        nome: 'Treino A - Peito e Triceps',
        descricao: 'Foco em peitoral e tríceps para hipertrofia. Progressão de exercícios compostos para isolamento.',
        alunoNome: 'Ana Beatriz Oliveira',
        treinadorNome: 'Marcos Antônio Rocha',
        exercicios: [
            {
                nome: 'Supino com Barra',
                series: 4,
                repeticoes: '8-12',
                carga_sugerida: '30.00',
                tempo_descanso_segundos: 90,
                ordem_execucao: 1,
            },
            {
                nome: 'Supino Inclinado com Halter',
                series: 3,
                repeticoes: '10-12',
                carga_sugerida: '14.00',
                tempo_descanso_segundos: 75,
                ordem_execucao: 2,
            },
            {
                nome: 'Crossover na Polia',
                series: 3,
                repeticoes: '12-15',
                carga_sugerida: null,
                tempo_descanso_segundos: 60,
                ordem_execucao: 3,
            },
            {
                nome: 'Extensão de Tríceps na Polia',
                series: 3,
                repeticoes: '12-15',
                carga_sugerida: null,
                tempo_descanso_segundos: 60,
                ordem_execucao: 4,
            },
            {
                nome: 'Tríceps Testa com Barra EZ',
                series: 3,
                repeticoes: '10-12',
                carga_sugerida: '15.00',
                tempo_descanso_segundos: 75,
                ordem_execucao: 5,
            },
        ],
    },
    {
        nome: 'Treino B - Pernas',
        descricao: 'Treino de membros inferiores com ênfase em quadríceps, isquiotibiais e panturrilha.',
        alunoNome: 'Ana Beatriz Oliveira',
        treinadorNome: 'Marcos Antônio Rocha',
        exercicios: [
            {
                nome: 'Agachamento com Barra',
                series: 4,
                repeticoes: '8-10',
                carga_sugerida: '40.00',
                tempo_descanso_segundos: 120,
                ordem_execucao: 1,
            },
            {
                nome: 'Leg Press',
                series: 3,
                repeticoes: '12-15',
                carga_sugerida: '80.00',
                tempo_descanso_segundos: 90,
                ordem_execucao: 2,
            },
            {
                nome: 'Extensão de Pernas',
                series: 3,
                repeticoes: '12-15',
                carga_sugerida: null,
                tempo_descanso_segundos: 75,
                ordem_execucao: 3,
            },
            {
                nome: 'Flexão de Pernas',
                series: 3,
                repeticoes: '12-15',
                carga_sugerida: null,
                tempo_descanso_segundos: 75,
                ordem_execucao: 4,
            },
            {
                nome: 'Elevação de Panturrilha em Pé',
                series: 3,
                repeticoes: '15-20',
                carga_sugerida: null,
                tempo_descanso_segundos: 60,
                ordem_execucao: 5,
            },
        ],
    },
    {
        nome: 'Treino C - Ombros',
        descricao: 'Treino para deltóides e trapézio com foco em volume e definição muscular.',
        alunoNome: 'Rafael Mendes Costa',
        treinadorNome: 'Marcos Antônio Rocha',
        exercicios: [
            {
                nome: 'Desenvolvimento Militar com Barra',
                series: 4,
                repeticoes: '8-10',
                carga_sugerida: '30.00',
                tempo_descanso_segundos: 90,
                ordem_execucao: 1,
            },
            {
                nome: 'Desenvolvimento de Ombros com Halter',
                series: 3,
                repeticoes: '10-12',
                carga_sugerida: '18.00',
                tempo_descanso_segundos: 75,
                ordem_execucao: 2,
            },
            {
                nome: 'Elevação Lateral com Halter',
                series: 3,
                repeticoes: '12-15',
                carga_sugerida: '8.00',
                tempo_descanso_segundos: 60,
                ordem_execucao: 3,
            },
            {
                nome: 'Elevação Frontal com Halter',
                series: 3,
                repeticoes: '12-15',
                carga_sugerida: '8.00',
                tempo_descanso_segundos: 60,
                ordem_execucao: 4,
            },
            {
                nome: 'Face Pull na Polia',
                series: 3,
                repeticoes: '15-20',
                carga_sugerida: null,
                tempo_descanso_segundos: 60,
                ordem_execucao: 5,
            },
        ],
    },
    {
        nome: 'Treino D - Base Geral',
        descricao: 'Treino geral para condicionamento inicial cobrindo principais grupos musculares.',
        alunoNome: 'Juliana Ferreira Lima',
        treinadorNome: 'Fernanda Souza Almeida',
        exercicios: [
            {
                nome: 'Agachamento com Barra',
                series: 3,
                repeticoes: '12-15',
                carga_sugerida: '25.00',
                tempo_descanso_segundos: 90,
                ordem_execucao: 1,
            },
            {
                nome: 'Supino com Barra',
                series: 3,
                repeticoes: '10-12',
                carga_sugerida: '20.00',
                tempo_descanso_segundos: 90,
                ordem_execucao: 2,
            },
            {
                nome: 'Remada Sentada na Polia',
                series: 3,
                repeticoes: '12-15',
                carga_sugerida: null,
                tempo_descanso_segundos: 75,
                ordem_execucao: 3,
            },
            {
                nome: 'Desenvolvimento de Ombros com Halter',
                series: 3,
                repeticoes: '12-15',
                carga_sugerida: '10.00',
                tempo_descanso_segundos: 75,
                ordem_execucao: 4,
            },
            {
                nome: 'Abdominal Crunch',
                series: 3,
                repeticoes: '15-20',
                carga_sugerida: null,
                tempo_descanso_segundos: 60,
                ordem_execucao: 5,
            },
        ],
    },
    {
        nome: 'Treino E - Peito e Costas',
        descricao: 'Treino completo de empurrar e puxar para hipertrofia balanceada do tronco.',
        alunoNome: 'Carlos Eduardo Silva',
        treinadorNome: null,
        exercicios: [
            {
                nome: 'Supino com Barra',
                series: 4,
                repeticoes: '8-12',
                carga_sugerida: '60.00',
                tempo_descanso_segundos: 90,
                ordem_execucao: 1,
            },
            {
                nome: 'Puxada Frontal na Polia',
                series: 4,
                repeticoes: '10-12',
                carga_sugerida: '55.00',
                tempo_descanso_segundos: 90,
                ordem_execucao: 2,
            },
            {
                nome: 'Supino Inclinado com Halter',
                series: 3,
                repeticoes: '10-12',
                carga_sugerida: '26.00',
                tempo_descanso_segundos: 75,
                ordem_execucao: 3,
            },
            {
                nome: 'Remada Curvada com Barra',
                series: 3,
                repeticoes: '10-12',
                carga_sugerida: '50.00',
                tempo_descanso_segundos: 90,
                ordem_execucao: 4,
            },
            {
                nome: 'Crucifixo com Halter',
                series: 3,
                repeticoes: '12-15',
                carga_sugerida: '16.00',
                tempo_descanso_segundos: 75,
                ordem_execucao: 5,
            },
            {
                nome: 'Pullover com Halter',
                series: 3,
                repeticoes: '12-15',
                carga_sugerida: '20.00',
                tempo_descanso_segundos: 75,
                ordem_execucao: 6,
            },
        ],
    },
    {
        nome: 'Treino F - Pernas e Glúteos',
        descricao: 'Treino de membros inferiores com foco em glúteos e quadríceps para hipertrofia.',
        alunoNome: 'Carlos Eduardo Silva',
        treinadorNome: null,
        exercicios: [
            {
                nome: 'Agachamento com Barra',
                series: 4,
                repeticoes: '8-10',
                carga_sugerida: '80.00',
                tempo_descanso_segundos: 120,
                ordem_execucao: 1,
            },
            {
                nome: 'Leg Press',
                series: 3,
                repeticoes: '12-15',
                carga_sugerida: '120.00',
                tempo_descanso_segundos: 90,
                ordem_execucao: 2,
            },
            {
                nome: 'Elevação de Quadril com Barra',
                series: 4,
                repeticoes: '12-15',
                carga_sugerida: '60.00',
                tempo_descanso_segundos: 90,
                ordem_execucao: 3,
            },
            {
                nome: 'Extensão de Pernas',
                series: 3,
                repeticoes: '12-15',
                carga_sugerida: null,
                tempo_descanso_segundos: 75,
                ordem_execucao: 4,
            },
            {
                nome: 'Flexão de Pernas',
                series: 3,
                repeticoes: '10-12',
                carga_sugerida: null,
                tempo_descanso_segundos: 75,
                ordem_execucao: 5,
            },
        ],
    },
    {
        nome: 'Treino G - Full Body',
        descricao: 'Treino de corpo inteiro para condicionamento geral com exercícios compostos de alta demanda.',
        alunoNome: 'José Lucas Brandão Montes',
        treinadorNome: null,
        exercicios: [
            {
                nome: 'Levantamento Terra com Barra',
                series: 4,
                repeticoes: '5-8',
                carga_sugerida: '100.00',
                tempo_descanso_segundos: 180,
                ordem_execucao: 1,
            },
            {
                nome: 'Agachamento com Barra',
                series: 3,
                repeticoes: '10-12',
                carga_sugerida: '70.00',
                tempo_descanso_segundos: 120,
                ordem_execucao: 2,
            },
            {
                nome: 'Supino com Barra',
                series: 3,
                repeticoes: '10-12',
                carga_sugerida: '50.00',
                tempo_descanso_segundos: 90,
                ordem_execucao: 3,
            },
            {
                nome: 'Remada Curvada com Barra',
                series: 3,
                repeticoes: '10-12',
                carga_sugerida: '45.00',
                tempo_descanso_segundos: 90,
                ordem_execucao: 4,
            },
            {
                nome: 'Desenvolvimento Militar com Barra',
                series: 3,
                repeticoes: '10-12',
                carga_sugerida: '30.00',
                tempo_descanso_segundos: 90,
                ordem_execucao: 5,
            },
            {
                nome: 'Prancha',
                series: 3,
                repeticoes: '45',
                carga_sugerida: null,
                tempo_descanso_segundos: 60,
                ordem_execucao: 6,
            },
        ],
    },
    {
        nome: 'Treino H - Glúteos e Pernas',
        descricao: 'Treino feminino focado em glúteos, isquiotibiais e quadríceps com volume moderado.',
        alunoNome: 'Mariana Silva',
        treinadorNome: null,
        exercicios: [
            {
                nome: 'Elevação de Quadril com Barra',
                series: 4,
                repeticoes: '12-15',
                carga_sugerida: '40.00',
                tempo_descanso_segundos: 90,
                ordem_execucao: 1,
            },
            {
                nome: 'Agachamento Sumô com Halter',
                series: 3,
                repeticoes: '15-20',
                carga_sugerida: '20.00',
                tempo_descanso_segundos: 75,
                ordem_execucao: 2,
            },
            {
                nome: 'Flexão de Pernas',
                series: 3,
                repeticoes: '12-15',
                carga_sugerida: '25.00',
                tempo_descanso_segundos: 75,
                ordem_execucao: 3,
            },
            {
                nome: 'Afundo com Halter',
                series: 3,
                repeticoes: '12-15',
                carga_sugerida: '12.00',
                tempo_descanso_segundos: 75,
                ordem_execucao: 4,
            },
            {
                nome: 'Extensão de Pernas',
                series: 3,
                repeticoes: '12-15',
                carga_sugerida: null,
                tempo_descanso_segundos: 60,
                ordem_execucao: 5,
            },
            {
                nome: 'Elevação de Panturrilha em Pé',
                series: 3,
                repeticoes: '15-20',
                carga_sugerida: null,
                tempo_descanso_segundos: 60,
                ordem_execucao: 6,
            },
        ],
    },
    {
        nome: 'Treino I - Braços',
        descricao: 'Treino dedicado a bíceps e tríceps para máximo volume e definição dos braços.',
        alunoNome: 'Rafael Mendes Costa',
        treinadorNome: 'Marcos Antônio Rocha',
        exercicios: [
            {
                nome: 'Rosca Direta com Barra',
                series: 4,
                repeticoes: '10-12',
                carga_sugerida: '25.00',
                tempo_descanso_segundos: 75,
                ordem_execucao: 1,
            },
            {
                nome: 'Extensão de Tríceps na Polia',
                series: 4,
                repeticoes: '12-15',
                carga_sugerida: null,
                tempo_descanso_segundos: 60,
                ordem_execucao: 2,
            },
            {
                nome: 'Rosca Martelo com Halter',
                series: 3,
                repeticoes: '10-12',
                carga_sugerida: '14.00',
                tempo_descanso_segundos: 60,
                ordem_execucao: 3,
            },
            {
                nome: 'Tríceps Testa com Barra EZ',
                series: 3,
                repeticoes: '10-12',
                carga_sugerida: '20.00',
                tempo_descanso_segundos: 75,
                ordem_execucao: 4,
            },
            {
                nome: 'Rosca Concentrada com Halter',
                series: 3,
                repeticoes: '12-15',
                carga_sugerida: '10.00',
                tempo_descanso_segundos: 60,
                ordem_execucao: 5,
            },
            {
                nome: 'Mergulho de Tríceps',
                series: 3,
                repeticoes: '10-15',
                carga_sugerida: null,
                tempo_descanso_segundos: 75,
                ordem_execucao: 6,
            },
        ],
    },
    {
        nome: 'Treino J - Costas e Bíceps',
        descricao: 'Treino de costas completo com isolamento de bíceps ao final para máxima ativação.',
        alunoNome: 'José Lucas Brandão Montes',
        treinadorNome: null,
        exercicios: [
            {
                nome: 'Barra Fixa',
                series: 4,
                repeticoes: '6-10',
                carga_sugerida: null,
                tempo_descanso_segundos: 120,
                ordem_execucao: 1,
            },
            {
                nome: 'Remada Curvada com Barra',
                series: 4,
                repeticoes: '8-12',
                carga_sugerida: '60.00',
                tempo_descanso_segundos: 90,
                ordem_execucao: 2,
            },
            {
                nome: 'Puxada Frontal na Polia',
                series: 3,
                repeticoes: '10-12',
                carga_sugerida: '65.00',
                tempo_descanso_segundos: 90,
                ordem_execucao: 3,
            },
            {
                nome: 'Remada Unilateral com Halter',
                series: 3,
                repeticoes: '10-12',
                carga_sugerida: '28.00',
                tempo_descanso_segundos: 75,
                ordem_execucao: 4,
            },
            {
                nome: 'Rosca Scott com Barra EZ',
                series: 3,
                repeticoes: '10-12',
                carga_sugerida: '20.00',
                tempo_descanso_segundos: 75,
                ordem_execucao: 5,
            },
        ],
    },
];

export async function seedTreinos(): Promise<void> {
    for (const treinoSeed of treinosSeed) {
        const [alunoEncontrado] = await DataBase
            .select({ id: aluno.id })
            .from(aluno)
            .where(eq(aluno.nome, treinoSeed.alunoNome))
            .limit(1);

        if (!alunoEncontrado) {
            throw new Error(`[seedTreinos] Aluno não encontrado: ${treinoSeed.alunoNome}`);
        }

        let treinadorId: string | null = null;
        if (treinoSeed.treinadorNome) {
            const [treinadorEncontrado] = await DataBase
                .select({ id: treinador.id })
                .from(treinador)
                .where(eq(treinador.nome, treinoSeed.treinadorNome))
                .limit(1);

            if (!treinadorEncontrado) {
                throw new Error(`[seedTreinos] Treinador não encontrado: ${treinoSeed.treinadorNome}`);
            }

            treinadorId = treinadorEncontrado.id;
        }

        const [treinoCriado] = await DataBase
            .insert(treino)
            .values({
                nome: treinoSeed.nome,
                descricao: treinoSeed.descricao,
                usuario_id: alunoEncontrado.id,
                treinador_id: treinadorId,
            })
            .returning({ id: treino.id });

        for (const item of treinoSeed.exercicios) {
            const [exercicioEncontrado] = await DataBase
                .select({ id: exercicio.id })
                .from(exercicio)
                .where(eq(exercicio.nome, item.nome))
                .limit(1);

            if (!exercicioEncontrado) {
                throw new Error(`[seedTreinos] Exercício não encontrado: ${item.nome}`);
            }

            await DataBase.insert(treino_exercicio).values({
                treino_id: treinoCriado.id,
                exercicio_id: exercicioEncontrado.id,
                series: item.series,
                repeticoes: item.repeticoes,
                carga_sugerida: item.carga_sugerida,
                tempo_descanso_segundos: item.tempo_descanso_segundos,
                ordem_execucao: item.ordem_execucao,
            });
        }
    }
}
