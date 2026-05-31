import { and, asc, eq } from 'drizzle-orm';
import { DataBase } from '../config/DbConnect';
import {
    aluno,
    treino,
    treino_exercicio,
    exercicio,
    sessao_treino,
    sessao_exercicio,
    sessao_serie,
} from '../config/db/schema';

// ─── Helpers de data ────────────────────────────────────────────────────────

function diasAtras(dias: number, horaInicio = 7): Date {
    const d = new Date();
    d.setDate(d.getDate() - dias);
    d.setHours(horaInicio, 0, 0, 0);
    return d;
}

function addMinutos(data: Date, min: number): Date {
    return new Date(data.getTime() + min * 60_000);
}

// ─── Tipos internos ──────────────────────────────────────────────────────────

type SerieSeed = {
    repeticoes_realizadas?: number;
    carga_utilizada?: string;
    tempo_realizado_segundos?: number;
    status: 'CONCLUIDA' | 'PULADA';
};

type ExercicioSessaoSeed = {
    exercicioNome: string;
    concluido: boolean;
    series: SerieSeed[];
};

type SessaoSeedItem = {
    alunoNome: string;
    treinoNome: string;
    inicio: Date;
    duracaoMinutos: number;
    status: 'CONCLUIDA' | 'CANCELADA';
    exercicios: ExercicioSessaoSeed[];
};

// ─── Dados de sessões ────────────────────────────────────────────────────────
//
// Critérios:
//   • Carlos  – Treino E/F alternados, 12 sessões, 7 dias consecutivos → streak 7
//   • Ana     – Treino A/B alternados,  8 sessões, 5 dias consecutivos → streak 5
//   • José    – Treino G,               5 sessões, 4 dias consecutivos → streak 4
//   • Mariana – Treino H,               6 sessões, 5 dias consecutivos → streak 5
//   • Rafael  – Treino C,               4 sessões, 3 dias consecutivos → streak 3
//   • Juliana – Treino D,               4 sessões, dias não consecutivos

const SESSOES: SessaoSeedItem[] = [

    // ── Carlos: histórico antigo (base para progressão no gráfico) ───────────

    {
        alunoNome: 'Carlos Eduardo Silva',
        treinoNome: 'Treino E - Peito e Costas',
        inicio: diasAtras(84, 7),
        duracaoMinutos: 65,
        status: 'CONCLUIDA',
        exercicios: [
            {
                exercicioNome: 'Supino com Barra',
                concluido: true,
                series: [
                    { repeticoes_realizadas: 8, carga_utilizada: '55.00', status: 'CONCLUIDA' },
                    { repeticoes_realizadas: 8, carga_utilizada: '55.00', status: 'CONCLUIDA' },
                    { repeticoes_realizadas: 7, carga_utilizada: '55.00', status: 'CONCLUIDA' },
                    { repeticoes_realizadas: 7, carga_utilizada: '55.00', status: 'CONCLUIDA' },
                ],
            },
            {
                exercicioNome: 'Puxada Frontal na Polia',
                concluido: true,
                series: [
                    { repeticoes_realizadas: 10, carga_utilizada: '50.00', status: 'CONCLUIDA' },
                    { repeticoes_realizadas: 10, carga_utilizada: '50.00', status: 'CONCLUIDA' },
                    { repeticoes_realizadas: 10, carga_utilizada: '50.00', status: 'CONCLUIDA' },
                    { repeticoes_realizadas: 9,  carga_utilizada: '50.00', status: 'CONCLUIDA' },
                ],
            },
            {
                exercicioNome: 'Crucifixo com Halter',
                concluido: true,
                series: [
                    { repeticoes_realizadas: 12, carga_utilizada: '14.00', status: 'CONCLUIDA' },
                    { repeticoes_realizadas: 12, carga_utilizada: '14.00', status: 'CONCLUIDA' },
                    { repeticoes_realizadas: 11, carga_utilizada: '14.00', status: 'CONCLUIDA' },
                ],
            },
        ],
    },
    {
        alunoNome: 'Carlos Eduardo Silva',
        treinoNome: 'Treino F - Pernas e Glúteos',
        inicio: diasAtras(77, 7),
        duracaoMinutos: 70,
        status: 'CONCLUIDA',
        exercicios: [
            {
                exercicioNome: 'Agachamento com Barra',
                concluido: true,
                series: [
                    { repeticoes_realizadas: 8, carga_utilizada: '70.00', status: 'CONCLUIDA' },
                    { repeticoes_realizadas: 8, carga_utilizada: '70.00', status: 'CONCLUIDA' },
                    { repeticoes_realizadas: 8, carga_utilizada: '70.00', status: 'CONCLUIDA' },
                    { repeticoes_realizadas: 7, carga_utilizada: '70.00', status: 'CONCLUIDA' },
                ],
            },
            {
                exercicioNome: 'Leg Press',
                concluido: true,
                series: [
                    { repeticoes_realizadas: 12, carga_utilizada: '110.00', status: 'CONCLUIDA' },
                    { repeticoes_realizadas: 12, carga_utilizada: '110.00', status: 'CONCLUIDA' },
                    { repeticoes_realizadas: 11, carga_utilizada: '110.00', status: 'CONCLUIDA' },
                ],
            },
            {
                exercicioNome: 'Elevação de Quadril com Barra',
                concluido: true,
                series: [
                    { repeticoes_realizadas: 12, carga_utilizada: '55.00', status: 'CONCLUIDA' },
                    { repeticoes_realizadas: 12, carga_utilizada: '55.00', status: 'CONCLUIDA' },
                    { repeticoes_realizadas: 12, carga_utilizada: '55.00', status: 'CONCLUIDA' },
                ],
            },
        ],
    },
    {
        alunoNome: 'Carlos Eduardo Silva',
        treinoNome: 'Treino E - Peito e Costas',
        inicio: diasAtras(63, 7),
        duracaoMinutos: 65,
        status: 'CONCLUIDA',
        exercicios: [
            {
                exercicioNome: 'Supino com Barra',
                concluido: true,
                series: [
                    { repeticoes_realizadas: 8, carga_utilizada: '57.50', status: 'CONCLUIDA' },
                    { repeticoes_realizadas: 8, carga_utilizada: '57.50', status: 'CONCLUIDA' },
                    { repeticoes_realizadas: 8, carga_utilizada: '57.50', status: 'CONCLUIDA' },
                    { repeticoes_realizadas: 7, carga_utilizada: '57.50', status: 'CONCLUIDA' },
                ],
            },
            {
                exercicioNome: 'Puxada Frontal na Polia',
                concluido: true,
                series: [
                    { repeticoes_realizadas: 10, carga_utilizada: '52.50', status: 'CONCLUIDA' },
                    { repeticoes_realizadas: 10, carga_utilizada: '52.50', status: 'CONCLUIDA' },
                    { repeticoes_realizadas: 10, carga_utilizada: '52.50', status: 'CONCLUIDA' },
                    { repeticoes_realizadas: 10, carga_utilizada: '52.50', status: 'CONCLUIDA' },
                ],
            },
            {
                exercicioNome: 'Crucifixo com Halter',
                concluido: true,
                series: [
                    { repeticoes_realizadas: 12, carga_utilizada: '14.00', status: 'CONCLUIDA' },
                    { repeticoes_realizadas: 12, carga_utilizada: '14.00', status: 'CONCLUIDA' },
                    { repeticoes_realizadas: 12, carga_utilizada: '14.00', status: 'CONCLUIDA' },
                ],
            },
        ],
    },
    {
        alunoNome: 'Carlos Eduardo Silva',
        treinoNome: 'Treino F - Pernas e Glúteos',
        inicio: diasAtras(49, 7),
        duracaoMinutos: 72,
        status: 'CONCLUIDA',
        exercicios: [
            {
                exercicioNome: 'Agachamento com Barra',
                concluido: true,
                series: [
                    { repeticoes_realizadas: 8, carga_utilizada: '75.00', status: 'CONCLUIDA' },
                    { repeticoes_realizadas: 8, carga_utilizada: '75.00', status: 'CONCLUIDA' },
                    { repeticoes_realizadas: 8, carga_utilizada: '75.00', status: 'CONCLUIDA' },
                    { repeticoes_realizadas: 8, carga_utilizada: '75.00', status: 'CONCLUIDA' },
                ],
            },
            {
                exercicioNome: 'Leg Press',
                concluido: true,
                series: [
                    { repeticoes_realizadas: 12, carga_utilizada: '115.00', status: 'CONCLUIDA' },
                    { repeticoes_realizadas: 12, carga_utilizada: '115.00', status: 'CONCLUIDA' },
                    { repeticoes_realizadas: 12, carga_utilizada: '115.00', status: 'CONCLUIDA' },
                ],
            },
            {
                exercicioNome: 'Elevação de Quadril com Barra',
                concluido: true,
                series: [
                    { repeticoes_realizadas: 12, carga_utilizada: '57.50', status: 'CONCLUIDA' },
                    { repeticoes_realizadas: 12, carga_utilizada: '57.50', status: 'CONCLUIDA' },
                    { repeticoes_realizadas: 12, carga_utilizada: '57.50', status: 'CONCLUIDA' },
                ],
            },
        ],
    },
    {
        alunoNome: 'Carlos Eduardo Silva',
        treinoNome: 'Treino E - Peito e Costas',
        inicio: diasAtras(35, 7),
        duracaoMinutos: 68,
        status: 'CONCLUIDA',
        exercicios: [
            {
                exercicioNome: 'Supino com Barra',
                concluido: true,
                series: [
                    { repeticoes_realizadas: 8, carga_utilizada: '60.00', status: 'CONCLUIDA' },
                    { repeticoes_realizadas: 8, carga_utilizada: '60.00', status: 'CONCLUIDA' },
                    { repeticoes_realizadas: 8, carga_utilizada: '60.00', status: 'CONCLUIDA' },
                    { repeticoes_realizadas: 8, carga_utilizada: '60.00', status: 'CONCLUIDA' },
                ],
            },
            {
                exercicioNome: 'Puxada Frontal na Polia',
                concluido: true,
                series: [
                    { repeticoes_realizadas: 10, carga_utilizada: '55.00', status: 'CONCLUIDA' },
                    { repeticoes_realizadas: 10, carga_utilizada: '55.00', status: 'CONCLUIDA' },
                    { repeticoes_realizadas: 10, carga_utilizada: '55.00', status: 'CONCLUIDA' },
                    { repeticoes_realizadas: 10, carga_utilizada: '55.00', status: 'CONCLUIDA' },
                ],
            },
            {
                exercicioNome: 'Crucifixo com Halter',
                concluido: true,
                series: [
                    { repeticoes_realizadas: 12, carga_utilizada: '16.00', status: 'CONCLUIDA' },
                    { repeticoes_realizadas: 12, carga_utilizada: '16.00', status: 'CONCLUIDA' },
                    { repeticoes_realizadas: 12, carga_utilizada: '16.00', status: 'CONCLUIDA' },
                ],
            },
        ],
    },

    // ── Carlos: 7 dias consecutivos para streak ──────────────────────────────

    {
        alunoNome: 'Carlos Eduardo Silva',
        treinoNome: 'Treino F - Pernas e Glúteos',
        inicio: diasAtras(7, 7),
        duracaoMinutos: 75,
        status: 'CONCLUIDA',
        exercicios: [
            {
                exercicioNome: 'Agachamento com Barra',
                concluido: true,
                series: [
                    { repeticoes_realizadas: 8, carga_utilizada: '80.00', status: 'CONCLUIDA' },
                    { repeticoes_realizadas: 8, carga_utilizada: '80.00', status: 'CONCLUIDA' },
                    { repeticoes_realizadas: 8, carga_utilizada: '80.00', status: 'CONCLUIDA' },
                    { repeticoes_realizadas: 7, carga_utilizada: '80.00', status: 'CONCLUIDA' },
                ],
            },
            {
                exercicioNome: 'Leg Press',
                concluido: true,
                series: [
                    { repeticoes_realizadas: 12, carga_utilizada: '120.00', status: 'CONCLUIDA' },
                    { repeticoes_realizadas: 12, carga_utilizada: '120.00', status: 'CONCLUIDA' },
                    { repeticoes_realizadas: 12, carga_utilizada: '120.00', status: 'CONCLUIDA' },
                ],
            },
            {
                exercicioNome: 'Elevação de Quadril com Barra',
                concluido: true,
                series: [
                    { repeticoes_realizadas: 12, carga_utilizada: '60.00', status: 'CONCLUIDA' },
                    { repeticoes_realizadas: 12, carga_utilizada: '60.00', status: 'CONCLUIDA' },
                    { repeticoes_realizadas: 12, carga_utilizada: '60.00', status: 'CONCLUIDA' },
                ],
            },
        ],
    },
    {
        alunoNome: 'Carlos Eduardo Silva',
        treinoNome: 'Treino E - Peito e Costas',
        inicio: diasAtras(6, 7),
        duracaoMinutos: 70,
        status: 'CONCLUIDA',
        exercicios: [
            {
                exercicioNome: 'Supino com Barra',
                concluido: true,
                series: [
                    { repeticoes_realizadas: 10, carga_utilizada: '62.50', status: 'CONCLUIDA' },
                    { repeticoes_realizadas: 10, carga_utilizada: '62.50', status: 'CONCLUIDA' },
                    { repeticoes_realizadas: 9,  carga_utilizada: '62.50', status: 'CONCLUIDA' },
                    { repeticoes_realizadas: 8,  carga_utilizada: '62.50', status: 'CONCLUIDA' },
                ],
            },
            {
                exercicioNome: 'Puxada Frontal na Polia',
                concluido: true,
                series: [
                    { repeticoes_realizadas: 12, carga_utilizada: '57.50', status: 'CONCLUIDA' },
                    { repeticoes_realizadas: 12, carga_utilizada: '57.50', status: 'CONCLUIDA' },
                    { repeticoes_realizadas: 11, carga_utilizada: '57.50', status: 'CONCLUIDA' },
                    { repeticoes_realizadas: 10, carga_utilizada: '57.50', status: 'CONCLUIDA' },
                ],
            },
            {
                exercicioNome: 'Crucifixo com Halter',
                concluido: true,
                series: [
                    { repeticoes_realizadas: 14, carga_utilizada: '16.00', status: 'CONCLUIDA' },
                    { repeticoes_realizadas: 14, carga_utilizada: '16.00', status: 'CONCLUIDA' },
                    { repeticoes_realizadas: 12, carga_utilizada: '16.00', status: 'CONCLUIDA' },
                ],
            },
        ],
    },
    {
        alunoNome: 'Carlos Eduardo Silva',
        treinoNome: 'Treino F - Pernas e Glúteos',
        inicio: diasAtras(5, 7),
        duracaoMinutos: 78,
        status: 'CONCLUIDA',
        exercicios: [
            {
                exercicioNome: 'Agachamento com Barra',
                concluido: true,
                series: [
                    { repeticoes_realizadas: 8, carga_utilizada: '82.50', status: 'CONCLUIDA' },
                    { repeticoes_realizadas: 8, carga_utilizada: '82.50', status: 'CONCLUIDA' },
                    { repeticoes_realizadas: 8, carga_utilizada: '82.50', status: 'CONCLUIDA' },
                    { repeticoes_realizadas: 8, carga_utilizada: '82.50', status: 'CONCLUIDA' },
                ],
            },
            {
                exercicioNome: 'Leg Press',
                concluido: true,
                series: [
                    { repeticoes_realizadas: 15, carga_utilizada: '120.00', status: 'CONCLUIDA' },
                    { repeticoes_realizadas: 15, carga_utilizada: '120.00', status: 'CONCLUIDA' },
                    { repeticoes_realizadas: 14, carga_utilizada: '120.00', status: 'CONCLUIDA' },
                ],
            },
            {
                exercicioNome: 'Elevação de Quadril com Barra',
                concluido: true,
                series: [
                    { repeticoes_realizadas: 15, carga_utilizada: '60.00', status: 'CONCLUIDA' },
                    { repeticoes_realizadas: 15, carga_utilizada: '60.00', status: 'CONCLUIDA' },
                    { repeticoes_realizadas: 15, carga_utilizada: '60.00', status: 'CONCLUIDA' },
                ],
            },
        ],
    },
    {
        alunoNome: 'Carlos Eduardo Silva',
        treinoNome: 'Treino E - Peito e Costas',
        inicio: diasAtras(4, 7),
        duracaoMinutos: 70,
        status: 'CONCLUIDA',
        exercicios: [
            {
                exercicioNome: 'Supino com Barra',
                concluido: true,
                series: [
                    { repeticoes_realizadas: 8,  carga_utilizada: '65.00', status: 'CONCLUIDA' },
                    { repeticoes_realizadas: 8,  carga_utilizada: '65.00', status: 'CONCLUIDA' },
                    { repeticoes_realizadas: 8,  carga_utilizada: '65.00', status: 'CONCLUIDA' },
                    { repeticoes_realizadas: 7,  carga_utilizada: '65.00', status: 'CONCLUIDA' },
                ],
            },
            {
                exercicioNome: 'Puxada Frontal na Polia',
                concluido: true,
                series: [
                    { repeticoes_realizadas: 10, carga_utilizada: '60.00', status: 'CONCLUIDA' },
                    { repeticoes_realizadas: 10, carga_utilizada: '60.00', status: 'CONCLUIDA' },
                    { repeticoes_realizadas: 10, carga_utilizada: '60.00', status: 'CONCLUIDA' },
                    { repeticoes_realizadas: 10, carga_utilizada: '60.00', status: 'CONCLUIDA' },
                ],
            },
            {
                exercicioNome: 'Crucifixo com Halter',
                concluido: true,
                series: [
                    { repeticoes_realizadas: 14, carga_utilizada: '18.00', status: 'CONCLUIDA' },
                    { repeticoes_realizadas: 14, carga_utilizada: '18.00', status: 'CONCLUIDA' },
                    { repeticoes_realizadas: 12, carga_utilizada: '18.00', status: 'CONCLUIDA' },
                ],
            },
        ],
    },
    {
        alunoNome: 'Carlos Eduardo Silva',
        treinoNome: 'Treino F - Pernas e Glúteos',
        inicio: diasAtras(3, 7),
        duracaoMinutos: 75,
        status: 'CONCLUIDA',
        exercicios: [
            {
                exercicioNome: 'Agachamento com Barra',
                concluido: true,
                series: [
                    { repeticoes_realizadas: 10, carga_utilizada: '82.50', status: 'CONCLUIDA' },
                    { repeticoes_realizadas: 10, carga_utilizada: '82.50', status: 'CONCLUIDA' },
                    { repeticoes_realizadas: 9,  carga_utilizada: '82.50', status: 'CONCLUIDA' },
                    { repeticoes_realizadas: 9,  carga_utilizada: '82.50', status: 'CONCLUIDA' },
                ],
            },
            {
                exercicioNome: 'Leg Press',
                concluido: true,
                series: [
                    { repeticoes_realizadas: 15, carga_utilizada: '125.00', status: 'CONCLUIDA' },
                    { repeticoes_realizadas: 15, carga_utilizada: '125.00', status: 'CONCLUIDA' },
                    { repeticoes_realizadas: 14, carga_utilizada: '125.00', status: 'CONCLUIDA' },
                ],
            },
            {
                exercicioNome: 'Elevação de Quadril com Barra',
                concluido: false,
                series: [
                    { repeticoes_realizadas: 12, carga_utilizada: '62.50', status: 'CONCLUIDA' },
                    { repeticoes_realizadas: 12, carga_utilizada: '62.50', status: 'CONCLUIDA' },
                    { status: 'PULADA' },
                ],
            },
        ],
    },
    {
        alunoNome: 'Carlos Eduardo Silva',
        treinoNome: 'Treino E - Peito e Costas',
        inicio: diasAtras(2, 7),
        duracaoMinutos: 72,
        status: 'CONCLUIDA',
        exercicios: [
            {
                exercicioNome: 'Supino com Barra',
                concluido: true,
                series: [
                    { repeticoes_realizadas: 10, carga_utilizada: '65.00', status: 'CONCLUIDA' },
                    { repeticoes_realizadas: 10, carga_utilizada: '65.00', status: 'CONCLUIDA' },
                    { repeticoes_realizadas: 9,  carga_utilizada: '65.00', status: 'CONCLUIDA' },
                    { repeticoes_realizadas: 8,  carga_utilizada: '65.00', status: 'CONCLUIDA' },
                ],
            },
            {
                exercicioNome: 'Puxada Frontal na Polia',
                concluido: true,
                series: [
                    { repeticoes_realizadas: 12, carga_utilizada: '62.50', status: 'CONCLUIDA' },
                    { repeticoes_realizadas: 12, carga_utilizada: '62.50', status: 'CONCLUIDA' },
                    { repeticoes_realizadas: 12, carga_utilizada: '62.50', status: 'CONCLUIDA' },
                    { repeticoes_realizadas: 11, carga_utilizada: '62.50', status: 'CONCLUIDA' },
                ],
            },
            {
                exercicioNome: 'Crucifixo com Halter',
                concluido: true,
                series: [
                    { repeticoes_realizadas: 15, carga_utilizada: '18.00', status: 'CONCLUIDA' },
                    { repeticoes_realizadas: 15, carga_utilizada: '18.00', status: 'CONCLUIDA' },
                    { repeticoes_realizadas: 14, carga_utilizada: '18.00', status: 'CONCLUIDA' },
                ],
            },
        ],
    },
    {
        alunoNome: 'Carlos Eduardo Silva',
        treinoNome: 'Treino F - Pernas e Glúteos',
        inicio: diasAtras(1, 7),
        duracaoMinutos: 80,
        status: 'CONCLUIDA',
        exercicios: [
            {
                exercicioNome: 'Agachamento com Barra',
                concluido: true,
                series: [
                    { repeticoes_realizadas: 8, carga_utilizada: '85.00', status: 'CONCLUIDA' },
                    { repeticoes_realizadas: 8, carga_utilizada: '85.00', status: 'CONCLUIDA' },
                    { repeticoes_realizadas: 8, carga_utilizada: '85.00', status: 'CONCLUIDA' },
                    { repeticoes_realizadas: 8, carga_utilizada: '85.00', status: 'CONCLUIDA' },
                ],
            },
            {
                exercicioNome: 'Leg Press',
                concluido: true,
                series: [
                    { repeticoes_realizadas: 15, carga_utilizada: '125.00', status: 'CONCLUIDA' },
                    { repeticoes_realizadas: 15, carga_utilizada: '125.00', status: 'CONCLUIDA' },
                    { repeticoes_realizadas: 15, carga_utilizada: '125.00', status: 'CONCLUIDA' },
                ],
            },
            {
                exercicioNome: 'Elevação de Quadril com Barra',
                concluido: true,
                series: [
                    { repeticoes_realizadas: 15, carga_utilizada: '62.50', status: 'CONCLUIDA' },
                    { repeticoes_realizadas: 15, carga_utilizada: '62.50', status: 'CONCLUIDA' },
                    { repeticoes_realizadas: 15, carga_utilizada: '62.50', status: 'CONCLUIDA' },
                ],
            },
        ],
    },

    // ── Ana Beatriz: histórico + 5 dias consecutivos ─────────────────────────

    {
        alunoNome: 'Ana Beatriz Oliveira',
        treinoNome: 'Treino A - Peito e Triceps',
        inicio: diasAtras(60, 8),
        duracaoMinutos: 55,
        status: 'CONCLUIDA',
        exercicios: [
            {
                exercicioNome: 'Supino com Barra',
                concluido: true,
                series: [
                    { repeticoes_realizadas: 10, carga_utilizada: '22.50', status: 'CONCLUIDA' },
                    { repeticoes_realizadas: 10, carga_utilizada: '22.50', status: 'CONCLUIDA' },
                    { repeticoes_realizadas: 9,  carga_utilizada: '22.50', status: 'CONCLUIDA' },
                    { repeticoes_realizadas: 8,  carga_utilizada: '22.50', status: 'CONCLUIDA' },
                ],
            },
            {
                exercicioNome: 'Tríceps Testa com Barra EZ',
                concluido: true,
                series: [
                    { repeticoes_realizadas: 12, carga_utilizada: '12.50', status: 'CONCLUIDA' },
                    { repeticoes_realizadas: 12, carga_utilizada: '12.50', status: 'CONCLUIDA' },
                    { repeticoes_realizadas: 10, carga_utilizada: '12.50', status: 'CONCLUIDA' },
                ],
            },
        ],
    },
    {
        alunoNome: 'Ana Beatriz Oliveira',
        treinoNome: 'Treino B - Pernas',
        inicio: diasAtras(45, 8),
        duracaoMinutos: 50,
        status: 'CONCLUIDA',
        exercicios: [
            {
                exercicioNome: 'Agachamento com Barra',
                concluido: true,
                series: [
                    { repeticoes_realizadas: 12, carga_utilizada: '30.00', status: 'CONCLUIDA' },
                    { repeticoes_realizadas: 12, carga_utilizada: '30.00', status: 'CONCLUIDA' },
                    { repeticoes_realizadas: 10, carga_utilizada: '30.00', status: 'CONCLUIDA' },
                    { repeticoes_realizadas: 10, carga_utilizada: '30.00', status: 'CONCLUIDA' },
                ],
            },
        ],
    },
    {
        alunoNome: 'Ana Beatriz Oliveira',
        treinoNome: 'Treino A - Peito e Triceps',
        inicio: diasAtras(30, 8),
        duracaoMinutos: 58,
        status: 'CONCLUIDA',
        exercicios: [
            {
                exercicioNome: 'Supino com Barra',
                concluido: true,
                series: [
                    { repeticoes_realizadas: 10, carga_utilizada: '25.00', status: 'CONCLUIDA' },
                    { repeticoes_realizadas: 10, carga_utilizada: '25.00', status: 'CONCLUIDA' },
                    { repeticoes_realizadas: 10, carga_utilizada: '25.00', status: 'CONCLUIDA' },
                    { repeticoes_realizadas: 9,  carga_utilizada: '25.00', status: 'CONCLUIDA' },
                ],
            },
            {
                exercicioNome: 'Tríceps Testa com Barra EZ',
                concluido: true,
                series: [
                    { repeticoes_realizadas: 12, carga_utilizada: '14.00', status: 'CONCLUIDA' },
                    { repeticoes_realizadas: 12, carga_utilizada: '14.00', status: 'CONCLUIDA' },
                    { repeticoes_realizadas: 12, carga_utilizada: '14.00', status: 'CONCLUIDA' },
                ],
            },
        ],
    },
    // 5 dias consecutivos
    {
        alunoNome: 'Ana Beatriz Oliveira',
        treinoNome: 'Treino B - Pernas',
        inicio: diasAtras(5, 8),
        duracaoMinutos: 52,
        status: 'CONCLUIDA',
        exercicios: [
            {
                exercicioNome: 'Agachamento com Barra',
                concluido: true,
                series: [
                    { repeticoes_realizadas: 12, carga_utilizada: '35.00', status: 'CONCLUIDA' },
                    { repeticoes_realizadas: 12, carga_utilizada: '35.00', status: 'CONCLUIDA' },
                    { repeticoes_realizadas: 12, carga_utilizada: '35.00', status: 'CONCLUIDA' },
                    { repeticoes_realizadas: 10, carga_utilizada: '35.00', status: 'CONCLUIDA' },
                ],
            },
        ],
    },
    {
        alunoNome: 'Ana Beatriz Oliveira',
        treinoNome: 'Treino A - Peito e Triceps',
        inicio: diasAtras(4, 8),
        duracaoMinutos: 60,
        status: 'CONCLUIDA',
        exercicios: [
            {
                exercicioNome: 'Supino com Barra',
                concluido: true,
                series: [
                    { repeticoes_realizadas: 12, carga_utilizada: '27.50', status: 'CONCLUIDA' },
                    { repeticoes_realizadas: 12, carga_utilizada: '27.50', status: 'CONCLUIDA' },
                    { repeticoes_realizadas: 10, carga_utilizada: '27.50', status: 'CONCLUIDA' },
                    { repeticoes_realizadas: 10, carga_utilizada: '27.50', status: 'CONCLUIDA' },
                ],
            },
            {
                exercicioNome: 'Tríceps Testa com Barra EZ',
                concluido: true,
                series: [
                    { repeticoes_realizadas: 12, carga_utilizada: '15.00', status: 'CONCLUIDA' },
                    { repeticoes_realizadas: 12, carga_utilizada: '15.00', status: 'CONCLUIDA' },
                    { repeticoes_realizadas: 11, carga_utilizada: '15.00', status: 'CONCLUIDA' },
                ],
            },
        ],
    },
    {
        alunoNome: 'Ana Beatriz Oliveira',
        treinoNome: 'Treino B - Pernas',
        inicio: diasAtras(3, 8),
        duracaoMinutos: 55,
        status: 'CONCLUIDA',
        exercicios: [
            {
                exercicioNome: 'Agachamento com Barra',
                concluido: true,
                series: [
                    { repeticoes_realizadas: 12, carga_utilizada: '37.50', status: 'CONCLUIDA' },
                    { repeticoes_realizadas: 12, carga_utilizada: '37.50', status: 'CONCLUIDA' },
                    { repeticoes_realizadas: 12, carga_utilizada: '37.50', status: 'CONCLUIDA' },
                    { repeticoes_realizadas: 12, carga_utilizada: '37.50', status: 'CONCLUIDA' },
                ],
            },
        ],
    },
    {
        alunoNome: 'Ana Beatriz Oliveira',
        treinoNome: 'Treino A - Peito e Triceps',
        inicio: diasAtras(2, 8),
        duracaoMinutos: 62,
        status: 'CONCLUIDA',
        exercicios: [
            {
                exercicioNome: 'Supino com Barra',
                concluido: true,
                series: [
                    { repeticoes_realizadas: 12, carga_utilizada: '30.00', status: 'CONCLUIDA' },
                    { repeticoes_realizadas: 12, carga_utilizada: '30.00', status: 'CONCLUIDA' },
                    { repeticoes_realizadas: 12, carga_utilizada: '30.00', status: 'CONCLUIDA' },
                    { repeticoes_realizadas: 10, carga_utilizada: '30.00', status: 'CONCLUIDA' },
                ],
            },
            {
                exercicioNome: 'Tríceps Testa com Barra EZ',
                concluido: true,
                series: [
                    { repeticoes_realizadas: 12, carga_utilizada: '15.00', status: 'CONCLUIDA' },
                    { repeticoes_realizadas: 12, carga_utilizada: '15.00', status: 'CONCLUIDA' },
                    { repeticoes_realizadas: 12, carga_utilizada: '15.00', status: 'CONCLUIDA' },
                ],
            },
        ],
    },
    {
        alunoNome: 'Ana Beatriz Oliveira',
        treinoNome: 'Treino B - Pernas',
        inicio: diasAtras(1, 8),
        duracaoMinutos: 53,
        status: 'CONCLUIDA',
        exercicios: [
            {
                exercicioNome: 'Agachamento com Barra',
                concluido: true,
                series: [
                    { repeticoes_realizadas: 15, carga_utilizada: '37.50', status: 'CONCLUIDA' },
                    { repeticoes_realizadas: 15, carga_utilizada: '37.50', status: 'CONCLUIDA' },
                    { repeticoes_realizadas: 14, carga_utilizada: '37.50', status: 'CONCLUIDA' },
                    { repeticoes_realizadas: 12, carga_utilizada: '37.50', status: 'CONCLUIDA' },
                ],
            },
        ],
    },

    // ── Mariana: 5 dias consecutivos ─────────────────────────────────────────

    {
        alunoNome: 'Mariana Silva',
        treinoNome: 'Treino H - Glúteos e Pernas',
        inicio: diasAtras(40, 9),
        duracaoMinutos: 60,
        status: 'CONCLUIDA',
        exercicios: [
            {
                exercicioNome: 'Elevação de Quadril com Barra',
                concluido: true,
                series: [
                    { repeticoes_realizadas: 12, carga_utilizada: '35.00', status: 'CONCLUIDA' },
                    { repeticoes_realizadas: 12, carga_utilizada: '35.00', status: 'CONCLUIDA' },
                    { repeticoes_realizadas: 12, carga_utilizada: '35.00', status: 'CONCLUIDA' },
                    { repeticoes_realizadas: 12, carga_utilizada: '35.00', status: 'CONCLUIDA' },
                ],
            },
            {
                exercicioNome: 'Agachamento Sumô com Halter',
                concluido: true,
                series: [
                    { repeticoes_realizadas: 15, carga_utilizada: '18.00', status: 'CONCLUIDA' },
                    { repeticoes_realizadas: 15, carga_utilizada: '18.00', status: 'CONCLUIDA' },
                    { repeticoes_realizadas: 15, carga_utilizada: '18.00', status: 'CONCLUIDA' },
                ],
            },
            {
                exercicioNome: 'Flexão de Pernas',
                concluido: true,
                series: [
                    { repeticoes_realizadas: 12, carga_utilizada: '22.00', status: 'CONCLUIDA' },
                    { repeticoes_realizadas: 12, carga_utilizada: '22.00', status: 'CONCLUIDA' },
                    { repeticoes_realizadas: 12, carga_utilizada: '22.00', status: 'CONCLUIDA' },
                ],
            },
            {
                exercicioNome: 'Afundo com Halter',
                concluido: true,
                series: [
                    { repeticoes_realizadas: 12, carga_utilizada: '10.00', status: 'CONCLUIDA' },
                    { repeticoes_realizadas: 12, carga_utilizada: '10.00', status: 'CONCLUIDA' },
                    { repeticoes_realizadas: 12, carga_utilizada: '10.00', status: 'CONCLUIDA' },
                ],
            },
        ],
    },
    {
        alunoNome: 'Mariana Silva',
        treinoNome: 'Treino H - Glúteos e Pernas',
        inicio: diasAtras(5, 9),
        duracaoMinutos: 62,
        status: 'CONCLUIDA',
        exercicios: [
            {
                exercicioNome: 'Elevação de Quadril com Barra',
                concluido: true,
                series: [
                    { repeticoes_realizadas: 12, carga_utilizada: '40.00', status: 'CONCLUIDA' },
                    { repeticoes_realizadas: 12, carga_utilizada: '40.00', status: 'CONCLUIDA' },
                    { repeticoes_realizadas: 12, carga_utilizada: '40.00', status: 'CONCLUIDA' },
                    { repeticoes_realizadas: 12, carga_utilizada: '40.00', status: 'CONCLUIDA' },
                ],
            },
            {
                exercicioNome: 'Agachamento Sumô com Halter',
                concluido: true,
                series: [
                    { repeticoes_realizadas: 20, carga_utilizada: '20.00', status: 'CONCLUIDA' },
                    { repeticoes_realizadas: 20, carga_utilizada: '20.00', status: 'CONCLUIDA' },
                    { repeticoes_realizadas: 18, carga_utilizada: '20.00', status: 'CONCLUIDA' },
                ],
            },
            {
                exercicioNome: 'Flexão de Pernas',
                concluido: true,
                series: [
                    { repeticoes_realizadas: 12, carga_utilizada: '24.00', status: 'CONCLUIDA' },
                    { repeticoes_realizadas: 12, carga_utilizada: '24.00', status: 'CONCLUIDA' },
                    { repeticoes_realizadas: 12, carga_utilizada: '24.00', status: 'CONCLUIDA' },
                ],
            },
            {
                exercicioNome: 'Afundo com Halter',
                concluido: true,
                series: [
                    { repeticoes_realizadas: 15, carga_utilizada: '12.00', status: 'CONCLUIDA' },
                    { repeticoes_realizadas: 15, carga_utilizada: '12.00', status: 'CONCLUIDA' },
                    { repeticoes_realizadas: 12, carga_utilizada: '12.00', status: 'CONCLUIDA' },
                ],
            },
        ],
    },
    {
        alunoNome: 'Mariana Silva',
        treinoNome: 'Treino H - Glúteos e Pernas',
        inicio: diasAtras(4, 9),
        duracaoMinutos: 65,
        status: 'CONCLUIDA',
        exercicios: [
            {
                exercicioNome: 'Elevação de Quadril com Barra',
                concluido: true,
                series: [
                    { repeticoes_realizadas: 14, carga_utilizada: '40.00', status: 'CONCLUIDA' },
                    { repeticoes_realizadas: 14, carga_utilizada: '40.00', status: 'CONCLUIDA' },
                    { repeticoes_realizadas: 13, carga_utilizada: '40.00', status: 'CONCLUIDA' },
                    { repeticoes_realizadas: 12, carga_utilizada: '40.00', status: 'CONCLUIDA' },
                ],
            },
            {
                exercicioNome: 'Agachamento Sumô com Halter',
                concluido: true,
                series: [
                    { repeticoes_realizadas: 20, carga_utilizada: '22.00', status: 'CONCLUIDA' },
                    { repeticoes_realizadas: 20, carga_utilizada: '22.00', status: 'CONCLUIDA' },
                    { repeticoes_realizadas: 20, carga_utilizada: '22.00', status: 'CONCLUIDA' },
                ],
            },
            {
                exercicioNome: 'Flexão de Pernas',
                concluido: false,
                series: [
                    { repeticoes_realizadas: 12, carga_utilizada: '24.00', status: 'CONCLUIDA' },
                    { repeticoes_realizadas: 10, carga_utilizada: '24.00', status: 'CONCLUIDA' },
                    { status: 'PULADA' },
                ],
            },
            {
                exercicioNome: 'Afundo com Halter',
                concluido: true,
                series: [
                    { repeticoes_realizadas: 15, carga_utilizada: '12.00', status: 'CONCLUIDA' },
                    { repeticoes_realizadas: 15, carga_utilizada: '12.00', status: 'CONCLUIDA' },
                    { repeticoes_realizadas: 15, carga_utilizada: '12.00', status: 'CONCLUIDA' },
                ],
            },
        ],
    },
    {
        alunoNome: 'Mariana Silva',
        treinoNome: 'Treino H - Glúteos e Pernas',
        inicio: diasAtras(3, 9),
        duracaoMinutos: 67,
        status: 'CONCLUIDA',
        exercicios: [
            {
                exercicioNome: 'Elevação de Quadril com Barra',
                concluido: true,
                series: [
                    { repeticoes_realizadas: 15, carga_utilizada: '42.50', status: 'CONCLUIDA' },
                    { repeticoes_realizadas: 15, carga_utilizada: '42.50', status: 'CONCLUIDA' },
                    { repeticoes_realizadas: 14, carga_utilizada: '42.50', status: 'CONCLUIDA' },
                    { repeticoes_realizadas: 12, carga_utilizada: '42.50', status: 'CONCLUIDA' },
                ],
            },
            {
                exercicioNome: 'Agachamento Sumô com Halter',
                concluido: true,
                series: [
                    { repeticoes_realizadas: 20, carga_utilizada: '22.00', status: 'CONCLUIDA' },
                    { repeticoes_realizadas: 20, carga_utilizada: '22.00', status: 'CONCLUIDA' },
                    { repeticoes_realizadas: 20, carga_utilizada: '22.00', status: 'CONCLUIDA' },
                ],
            },
            {
                exercicioNome: 'Flexão de Pernas',
                concluido: true,
                series: [
                    { repeticoes_realizadas: 14, carga_utilizada: '25.00', status: 'CONCLUIDA' },
                    { repeticoes_realizadas: 14, carga_utilizada: '25.00', status: 'CONCLUIDA' },
                    { repeticoes_realizadas: 12, carga_utilizada: '25.00', status: 'CONCLUIDA' },
                ],
            },
            {
                exercicioNome: 'Afundo com Halter',
                concluido: true,
                series: [
                    { repeticoes_realizadas: 15, carga_utilizada: '14.00', status: 'CONCLUIDA' },
                    { repeticoes_realizadas: 15, carga_utilizada: '14.00', status: 'CONCLUIDA' },
                    { repeticoes_realizadas: 15, carga_utilizada: '14.00', status: 'CONCLUIDA' },
                ],
            },
        ],
    },
    {
        alunoNome: 'Mariana Silva',
        treinoNome: 'Treino H - Glúteos e Pernas',
        inicio: diasAtras(2, 9),
        duracaoMinutos: 70,
        status: 'CONCLUIDA',
        exercicios: [
            {
                exercicioNome: 'Elevação de Quadril com Barra',
                concluido: true,
                series: [
                    { repeticoes_realizadas: 15, carga_utilizada: '42.50', status: 'CONCLUIDA' },
                    { repeticoes_realizadas: 15, carga_utilizada: '42.50', status: 'CONCLUIDA' },
                    { repeticoes_realizadas: 15, carga_utilizada: '42.50', status: 'CONCLUIDA' },
                    { repeticoes_realizadas: 14, carga_utilizada: '42.50', status: 'CONCLUIDA' },
                ],
            },
            {
                exercicioNome: 'Agachamento Sumô com Halter',
                concluido: true,
                series: [
                    { repeticoes_realizadas: 20, carga_utilizada: '24.00', status: 'CONCLUIDA' },
                    { repeticoes_realizadas: 20, carga_utilizada: '24.00', status: 'CONCLUIDA' },
                    { repeticoes_realizadas: 20, carga_utilizada: '24.00', status: 'CONCLUIDA' },
                ],
            },
            {
                exercicioNome: 'Flexão de Pernas',
                concluido: true,
                series: [
                    { repeticoes_realizadas: 15, carga_utilizada: '25.00', status: 'CONCLUIDA' },
                    { repeticoes_realizadas: 15, carga_utilizada: '25.00', status: 'CONCLUIDA' },
                    { repeticoes_realizadas: 14, carga_utilizada: '25.00', status: 'CONCLUIDA' },
                ],
            },
            {
                exercicioNome: 'Afundo com Halter',
                concluido: true,
                series: [
                    { repeticoes_realizadas: 15, carga_utilizada: '14.00', status: 'CONCLUIDA' },
                    { repeticoes_realizadas: 15, carga_utilizada: '14.00', status: 'CONCLUIDA' },
                    { repeticoes_realizadas: 15, carga_utilizada: '14.00', status: 'CONCLUIDA' },
                ],
            },
        ],
    },
    {
        alunoNome: 'Mariana Silva',
        treinoNome: 'Treino H - Glúteos e Pernas',
        inicio: diasAtras(1, 9),
        duracaoMinutos: 68,
        status: 'CONCLUIDA',
        exercicios: [
            {
                exercicioNome: 'Elevação de Quadril com Barra',
                concluido: true,
                series: [
                    { repeticoes_realizadas: 15, carga_utilizada: '45.00', status: 'CONCLUIDA' },
                    { repeticoes_realizadas: 15, carga_utilizada: '45.00', status: 'CONCLUIDA' },
                    { repeticoes_realizadas: 14, carga_utilizada: '45.00', status: 'CONCLUIDA' },
                    { repeticoes_realizadas: 12, carga_utilizada: '45.00', status: 'CONCLUIDA' },
                ],
            },
            {
                exercicioNome: 'Agachamento Sumô com Halter',
                concluido: true,
                series: [
                    { repeticoes_realizadas: 20, carga_utilizada: '24.00', status: 'CONCLUIDA' },
                    { repeticoes_realizadas: 20, carga_utilizada: '24.00', status: 'CONCLUIDA' },
                    { repeticoes_realizadas: 18, carga_utilizada: '24.00', status: 'CONCLUIDA' },
                ],
            },
            {
                exercicioNome: 'Flexão de Pernas',
                concluido: true,
                series: [
                    { repeticoes_realizadas: 15, carga_utilizada: '26.00', status: 'CONCLUIDA' },
                    { repeticoes_realizadas: 15, carga_utilizada: '26.00', status: 'CONCLUIDA' },
                    { repeticoes_realizadas: 15, carga_utilizada: '26.00', status: 'CONCLUIDA' },
                ],
            },
            {
                exercicioNome: 'Afundo com Halter',
                concluido: true,
                series: [
                    { repeticoes_realizadas: 15, carga_utilizada: '14.00', status: 'CONCLUIDA' },
                    { repeticoes_realizadas: 15, carga_utilizada: '14.00', status: 'CONCLUIDA' },
                    { repeticoes_realizadas: 15, carga_utilizada: '14.00', status: 'CONCLUIDA' },
                ],
            },
        ],
    },

    // ── José Lucas: 4 dias consecutivos ─────────────────────────────────────

    {
        alunoNome: 'José Lucas Brandão Montes',
        treinoNome: 'Treino G - Full Body',
        inicio: diasAtras(30, 10),
        duracaoMinutos: 80,
        status: 'CONCLUIDA',
        exercicios: [
            {
                exercicioNome: 'Agachamento com Barra',
                concluido: true,
                series: [
                    { repeticoes_realizadas: 10, carga_utilizada: '60.00', status: 'CONCLUIDA' },
                    { repeticoes_realizadas: 10, carga_utilizada: '60.00', status: 'CONCLUIDA' },
                    { repeticoes_realizadas: 10, carga_utilizada: '60.00', status: 'CONCLUIDA' },
                ],
            },
            {
                exercicioNome: 'Supino com Barra',
                concluido: true,
                series: [
                    { repeticoes_realizadas: 10, carga_utilizada: '45.00', status: 'CONCLUIDA' },
                    { repeticoes_realizadas: 10, carga_utilizada: '45.00', status: 'CONCLUIDA' },
                    { repeticoes_realizadas: 10, carga_utilizada: '45.00', status: 'CONCLUIDA' },
                ],
            },
            {
                exercicioNome: 'Remada Curvada com Barra',
                concluido: true,
                series: [
                    { repeticoes_realizadas: 10, carga_utilizada: '40.00', status: 'CONCLUIDA' },
                    { repeticoes_realizadas: 10, carga_utilizada: '40.00', status: 'CONCLUIDA' },
                    { repeticoes_realizadas: 10, carga_utilizada: '40.00', status: 'CONCLUIDA' },
                ],
            },
        ],
    },
    {
        alunoNome: 'José Lucas Brandão Montes',
        treinoNome: 'Treino G - Full Body',
        inicio: diasAtras(4, 10),
        duracaoMinutos: 82,
        status: 'CONCLUIDA',
        exercicios: [
            {
                exercicioNome: 'Agachamento com Barra',
                concluido: true,
                series: [
                    { repeticoes_realizadas: 10, carga_utilizada: '65.00', status: 'CONCLUIDA' },
                    { repeticoes_realizadas: 10, carga_utilizada: '65.00', status: 'CONCLUIDA' },
                    { repeticoes_realizadas: 9,  carga_utilizada: '65.00', status: 'CONCLUIDA' },
                ],
            },
            {
                exercicioNome: 'Supino com Barra',
                concluido: true,
                series: [
                    { repeticoes_realizadas: 10, carga_utilizada: '47.50', status: 'CONCLUIDA' },
                    { repeticoes_realizadas: 10, carga_utilizada: '47.50', status: 'CONCLUIDA' },
                    { repeticoes_realizadas: 10, carga_utilizada: '47.50', status: 'CONCLUIDA' },
                ],
            },
            {
                exercicioNome: 'Remada Curvada com Barra',
                concluido: true,
                series: [
                    { repeticoes_realizadas: 10, carga_utilizada: '42.50', status: 'CONCLUIDA' },
                    { repeticoes_realizadas: 10, carga_utilizada: '42.50', status: 'CONCLUIDA' },
                    { repeticoes_realizadas: 10, carga_utilizada: '42.50', status: 'CONCLUIDA' },
                ],
            },
        ],
    },
    {
        alunoNome: 'José Lucas Brandão Montes',
        treinoNome: 'Treino G - Full Body',
        inicio: diasAtras(3, 10),
        duracaoMinutos: 85,
        status: 'CONCLUIDA',
        exercicios: [
            {
                exercicioNome: 'Agachamento com Barra',
                concluido: true,
                series: [
                    { repeticoes_realizadas: 12, carga_utilizada: '65.00', status: 'CONCLUIDA' },
                    { repeticoes_realizadas: 12, carga_utilizada: '65.00', status: 'CONCLUIDA' },
                    { repeticoes_realizadas: 10, carga_utilizada: '65.00', status: 'CONCLUIDA' },
                ],
            },
            {
                exercicioNome: 'Supino com Barra',
                concluido: true,
                series: [
                    { repeticoes_realizadas: 12, carga_utilizada: '50.00', status: 'CONCLUIDA' },
                    { repeticoes_realizadas: 12, carga_utilizada: '50.00', status: 'CONCLUIDA' },
                    { repeticoes_realizadas: 10, carga_utilizada: '50.00', status: 'CONCLUIDA' },
                ],
            },
            {
                exercicioNome: 'Remada Curvada com Barra',
                concluido: true,
                series: [
                    { repeticoes_realizadas: 12, carga_utilizada: '45.00', status: 'CONCLUIDA' },
                    { repeticoes_realizadas: 12, carga_utilizada: '45.00', status: 'CONCLUIDA' },
                    { repeticoes_realizadas: 11, carga_utilizada: '45.00', status: 'CONCLUIDA' },
                ],
            },
        ],
    },
    {
        alunoNome: 'José Lucas Brandão Montes',
        treinoNome: 'Treino G - Full Body',
        inicio: diasAtras(2, 10),
        duracaoMinutos: 88,
        status: 'CONCLUIDA',
        exercicios: [
            {
                exercicioNome: 'Agachamento com Barra',
                concluido: true,
                series: [
                    { repeticoes_realizadas: 12, carga_utilizada: '67.50', status: 'CONCLUIDA' },
                    { repeticoes_realizadas: 12, carga_utilizada: '67.50', status: 'CONCLUIDA' },
                    { repeticoes_realizadas: 12, carga_utilizada: '67.50', status: 'CONCLUIDA' },
                ],
            },
            {
                exercicioNome: 'Supino com Barra',
                concluido: true,
                series: [
                    { repeticoes_realizadas: 12, carga_utilizada: '50.00', status: 'CONCLUIDA' },
                    { repeticoes_realizadas: 12, carga_utilizada: '50.00', status: 'CONCLUIDA' },
                    { repeticoes_realizadas: 12, carga_utilizada: '50.00', status: 'CONCLUIDA' },
                ],
            },
            {
                exercicioNome: 'Remada Curvada com Barra',
                concluido: true,
                series: [
                    { repeticoes_realizadas: 12, carga_utilizada: '45.00', status: 'CONCLUIDA' },
                    { repeticoes_realizadas: 12, carga_utilizada: '45.00', status: 'CONCLUIDA' },
                    { repeticoes_realizadas: 12, carga_utilizada: '45.00', status: 'CONCLUIDA' },
                ],
            },
        ],
    },
    {
        alunoNome: 'José Lucas Brandão Montes',
        treinoNome: 'Treino G - Full Body',
        inicio: diasAtras(1, 10),
        duracaoMinutos: 90,
        status: 'CONCLUIDA',
        exercicios: [
            {
                exercicioNome: 'Agachamento com Barra',
                concluido: true,
                series: [
                    { repeticoes_realizadas: 12, carga_utilizada: '70.00', status: 'CONCLUIDA' },
                    { repeticoes_realizadas: 12, carga_utilizada: '70.00', status: 'CONCLUIDA' },
                    { repeticoes_realizadas: 12, carga_utilizada: '70.00', status: 'CONCLUIDA' },
                ],
            },
            {
                exercicioNome: 'Supino com Barra',
                concluido: true,
                series: [
                    { repeticoes_realizadas: 12, carga_utilizada: '52.50', status: 'CONCLUIDA' },
                    { repeticoes_realizadas: 12, carga_utilizada: '52.50', status: 'CONCLUIDA' },
                    { repeticoes_realizadas: 12, carga_utilizada: '52.50', status: 'CONCLUIDA' },
                ],
            },
            {
                exercicioNome: 'Remada Curvada com Barra',
                concluido: true,
                series: [
                    { repeticoes_realizadas: 12, carga_utilizada: '47.50', status: 'CONCLUIDA' },
                    { repeticoes_realizadas: 12, carga_utilizada: '47.50', status: 'CONCLUIDA' },
                    { repeticoes_realizadas: 12, carga_utilizada: '47.50', status: 'CONCLUIDA' },
                ],
            },
        ],
    },

    // ── Rafael: 3 dias consecutivos ─────────────────────────────────────────

    {
        alunoNome: 'Rafael Mendes Costa',
        treinoNome: 'Treino C - Ombros',
        inicio: diasAtras(21, 18),
        duracaoMinutos: 45,
        status: 'CONCLUIDA',
        exercicios: [
            {
                exercicioNome: 'Desenvolvimento de Ombros com Halter',
                concluido: true,
                series: [
                    { repeticoes_realizadas: 10, carga_utilizada: '16.00', status: 'CONCLUIDA' },
                    { repeticoes_realizadas: 10, carga_utilizada: '16.00', status: 'CONCLUIDA' },
                    { repeticoes_realizadas: 10, carga_utilizada: '16.00', status: 'CONCLUIDA' },
                    { repeticoes_realizadas: 9,  carga_utilizada: '16.00', status: 'CONCLUIDA' },
                ],
            },
        ],
    },
    {
        alunoNome: 'Rafael Mendes Costa',
        treinoNome: 'Treino C - Ombros',
        inicio: diasAtras(3, 18),
        duracaoMinutos: 48,
        status: 'CONCLUIDA',
        exercicios: [
            {
                exercicioNome: 'Desenvolvimento de Ombros com Halter',
                concluido: true,
                series: [
                    { repeticoes_realizadas: 12, carga_utilizada: '18.00', status: 'CONCLUIDA' },
                    { repeticoes_realizadas: 12, carga_utilizada: '18.00', status: 'CONCLUIDA' },
                    { repeticoes_realizadas: 10, carga_utilizada: '18.00', status: 'CONCLUIDA' },
                    { repeticoes_realizadas: 10, carga_utilizada: '18.00', status: 'CONCLUIDA' },
                ],
            },
        ],
    },
    {
        alunoNome: 'Rafael Mendes Costa',
        treinoNome: 'Treino C - Ombros',
        inicio: diasAtras(2, 18),
        duracaoMinutos: 50,
        status: 'CONCLUIDA',
        exercicios: [
            {
                exercicioNome: 'Desenvolvimento de Ombros com Halter',
                concluido: true,
                series: [
                    { repeticoes_realizadas: 12, carga_utilizada: '18.00', status: 'CONCLUIDA' },
                    { repeticoes_realizadas: 12, carga_utilizada: '18.00', status: 'CONCLUIDA' },
                    { repeticoes_realizadas: 12, carga_utilizada: '18.00', status: 'CONCLUIDA' },
                    { repeticoes_realizadas: 11, carga_utilizada: '18.00', status: 'CONCLUIDA' },
                ],
            },
        ],
    },
    {
        alunoNome: 'Rafael Mendes Costa',
        treinoNome: 'Treino C - Ombros',
        inicio: diasAtras(1, 18),
        duracaoMinutos: 52,
        status: 'CONCLUIDA',
        exercicios: [
            {
                exercicioNome: 'Desenvolvimento de Ombros com Halter',
                concluido: true,
                series: [
                    { repeticoes_realizadas: 12, carga_utilizada: '20.00', status: 'CONCLUIDA' },
                    { repeticoes_realizadas: 12, carga_utilizada: '20.00', status: 'CONCLUIDA' },
                    { repeticoes_realizadas: 12, carga_utilizada: '20.00', status: 'CONCLUIDA' },
                    { repeticoes_realizadas: 10, carga_utilizada: '20.00', status: 'CONCLUIDA' },
                ],
            },
        ],
    },

    // ── Juliana: sessões distribuídas (sem streak consecutivo) ──────────────

    {
        alunoNome: 'Juliana Ferreira Lima',
        treinoNome: 'Treino D - Base Geral',
        inicio: diasAtras(28, 17),
        duracaoMinutos: 55,
        status: 'CONCLUIDA',
        exercicios: [
            {
                exercicioNome: 'Agachamento com Barra',
                concluido: true,
                series: [
                    { repeticoes_realizadas: 12, carga_utilizada: '22.50', status: 'CONCLUIDA' },
                    { repeticoes_realizadas: 12, carga_utilizada: '22.50', status: 'CONCLUIDA' },
                    { repeticoes_realizadas: 12, carga_utilizada: '22.50', status: 'CONCLUIDA' },
                ],
            },
            {
                exercicioNome: 'Supino com Barra',
                concluido: true,
                series: [
                    { repeticoes_realizadas: 10, carga_utilizada: '18.00', status: 'CONCLUIDA' },
                    { repeticoes_realizadas: 10, carga_utilizada: '18.00', status: 'CONCLUIDA' },
                    { repeticoes_realizadas: 10, carga_utilizada: '18.00', status: 'CONCLUIDA' },
                ],
            },
        ],
    },
    {
        alunoNome: 'Juliana Ferreira Lima',
        treinoNome: 'Treino D - Base Geral',
        inicio: diasAtras(14, 17),
        duracaoMinutos: 58,
        status: 'CONCLUIDA',
        exercicios: [
            {
                exercicioNome: 'Agachamento com Barra',
                concluido: true,
                series: [
                    { repeticoes_realizadas: 15, carga_utilizada: '25.00', status: 'CONCLUIDA' },
                    { repeticoes_realizadas: 15, carga_utilizada: '25.00', status: 'CONCLUIDA' },
                    { repeticoes_realizadas: 14, carga_utilizada: '25.00', status: 'CONCLUIDA' },
                ],
            },
            {
                exercicioNome: 'Supino com Barra',
                concluido: true,
                series: [
                    { repeticoes_realizadas: 12, carga_utilizada: '20.00', status: 'CONCLUIDA' },
                    { repeticoes_realizadas: 12, carga_utilizada: '20.00', status: 'CONCLUIDA' },
                    { repeticoes_realizadas: 10, carga_utilizada: '20.00', status: 'CONCLUIDA' },
                ],
            },
        ],
    },
    {
        alunoNome: 'Juliana Ferreira Lima',
        treinoNome: 'Treino D - Base Geral',
        inicio: diasAtras(7, 17),
        duracaoMinutos: 45,
        status: 'CANCELADA',
        exercicios: [
            {
                exercicioNome: 'Agachamento com Barra',
                concluido: false,
                series: [
                    { repeticoes_realizadas: 12, carga_utilizada: '25.00', status: 'CONCLUIDA' },
                    { status: 'PULADA' },
                    { status: 'PULADA' },
                ],
            },
            {
                exercicioNome: 'Supino com Barra',
                concluido: false,
                series: [
                    { status: 'PULADA' },
                    { status: 'PULADA' },
                    { status: 'PULADA' },
                ],
            },
        ],
    },
    {
        alunoNome: 'Juliana Ferreira Lima',
        treinoNome: 'Treino D - Base Geral',
        inicio: diasAtras(2, 17),
        duracaoMinutos: 60,
        status: 'CONCLUIDA',
        exercicios: [
            {
                exercicioNome: 'Agachamento com Barra',
                concluido: true,
                series: [
                    { repeticoes_realizadas: 15, carga_utilizada: '27.50', status: 'CONCLUIDA' },
                    { repeticoes_realizadas: 15, carga_utilizada: '27.50', status: 'CONCLUIDA' },
                    { repeticoes_realizadas: 15, carga_utilizada: '27.50', status: 'CONCLUIDA' },
                ],
            },
            {
                exercicioNome: 'Supino com Barra',
                concluido: true,
                series: [
                    { repeticoes_realizadas: 12, carga_utilizada: '22.50', status: 'CONCLUIDA' },
                    { repeticoes_realizadas: 12, carga_utilizada: '22.50', status: 'CONCLUIDA' },
                    { repeticoes_realizadas: 12, carga_utilizada: '22.50', status: 'CONCLUIDA' },
                ],
            },
        ],
    },
];

// ─── Funções auxiliares de lookup ────────────────────────────────────────────

async function buscarAlunoIdPorNome(nome: string): Promise<string> {
    const [resultado] = await DataBase
        .select({ id: aluno.id })
        .from(aluno)
        .where(eq(aluno.nome, nome))
        .limit(1);
    if (!resultado) throw new Error(`[sessaoSeeds] Aluno não encontrado: ${nome}`);
    return resultado.id;
}

async function buscarTreinoIdPorNomeEAluno(treinoNome: string, alunoId: string): Promise<string> {
    const [resultado] = await DataBase
        .select({ id: treino.id })
        .from(treino)
        .where(and(eq(treino.nome, treinoNome), eq(treino.usuario_id, alunoId)))
        .limit(1);
    if (!resultado) throw new Error(`[sessaoSeeds] Treino "${treinoNome}" não encontrado para aluno ${alunoId}`);
    return resultado.id;
}

async function buscarTreinoExercicios(treinoId: string): Promise<Array<{ id: string; exercicioNome: string; series: number }>> {
    const itens = await DataBase
        .select({
            id: treino_exercicio.id,
            exercicioNome: exercicio.nome,
            series: treino_exercicio.series,
        })
        .from(treino_exercicio)
        .innerJoin(exercicio, eq(treino_exercicio.exercicio_id, exercicio.id))
        .where(eq(treino_exercicio.treino_id, treinoId))
        .orderBy(asc(treino_exercicio.ordem_execucao));
    return itens;
}

// ─── Seed principal ──────────────────────────────────────────────────────────

export async function seedSessoes(): Promise<void> {
    const alunoIdCache = new Map<string, string>();
    const treinoIdCache = new Map<string, string>();
    const treinoExercicioCache = new Map<string, Array<{ id: string; exercicioNome: string; series: number }>>();

    for (const sessaoSeed of SESSOES) {
        // 1. Resolver aluno
        if (!alunoIdCache.has(sessaoSeed.alunoNome)) {
            alunoIdCache.set(sessaoSeed.alunoNome, await buscarAlunoIdPorNome(sessaoSeed.alunoNome));
        }
        const alunoId = alunoIdCache.get(sessaoSeed.alunoNome)!;

        // 2. Resolver treino
        const treinoKey = `${alunoId}::${sessaoSeed.treinoNome}`;
        if (!treinoIdCache.has(treinoKey)) {
            treinoIdCache.set(treinoKey, await buscarTreinoIdPorNomeEAluno(sessaoSeed.treinoNome, alunoId));
        }
        const treinoId = treinoIdCache.get(treinoKey)!;

        // 3. Resolver treino_exercicios
        if (!treinoExercicioCache.has(treinoId)) {
            treinoExercicioCache.set(treinoId, await buscarTreinoExercicios(treinoId));
        }
        const treinoExercicios = treinoExercicioCache.get(treinoId)!;

        const fim = addMinutos(sessaoSeed.inicio, sessaoSeed.duracaoMinutos);

        // 4. Criar sessao_treino
        const [sessaoCriada] = await DataBase
            .insert(sessao_treino)
            .values({
                aluno_id: alunoId,
                treino_id: treinoId,
                status: sessaoSeed.status,
                inicio: sessaoSeed.inicio,
                fim,
            })
            .returning({ id: sessao_treino.id });

        // 5. Criar sessao_exercicio + sessao_serie
        for (let ordemIdx = 0; ordemIdx < sessaoSeed.exercicios.length; ordemIdx++) {
            const exSeed = sessaoSeed.exercicios[ordemIdx];

            const teItem = treinoExercicios.find(te => te.exercicioNome === exSeed.exercicioNome);
            if (!teItem) {
                throw new Error(
                    `[sessaoSeeds] Exercício "${exSeed.exercicioNome}" não encontrado no treino "${sessaoSeed.treinoNome}"`,
                );
            }

            const [sessaoEx] = await DataBase
                .insert(sessao_exercicio)
                .values({
                    sessao_treino_id: sessaoCriada.id,
                    treino_exercicio_id: teItem.id,
                    concluido: exSeed.concluido,
                    ordem: ordemIdx,
                    inicio: sessaoSeed.inicio,
                    fim: exSeed.concluido ? addMinutos(sessaoSeed.inicio, (ordemIdx + 1) * 12) : undefined,
                })
                .returning({ id: sessao_exercicio.id });

            const seriesToInsert = exSeed.series.map((s, idx) => ({
                sessao_exercicio_id: sessaoEx.id,
                numero_serie: idx + 1,
                repeticoes_realizadas: s.repeticoes_realizadas ?? null,
                carga_utilizada: s.carga_utilizada ?? null,
                tempo_realizado_segundos: s.tempo_realizado_segundos ?? null,
                status: s.status,
            }));

            if (seriesToInsert.length > 0) {
                await DataBase.insert(sessao_serie).values(seriesToInsert);
            }
        }
    }
}
