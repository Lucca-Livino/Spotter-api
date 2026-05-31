import { describe, it, expect } from '@jest/globals';
import {
    mapTreinoTemplateParaAluno,
    mapTreinoTemplateParaMultiplosAlunos,
} from '../../utils/treinoTemplateMapper';
import { TreinoComExercicios } from '../../repositories/treinoRepository';

// Helper para criar um template de treino com exercícios
function makeTemplate(overrides: Partial<TreinoComExercicios> = {}): TreinoComExercicios {
    return {
        id: 'treino-1',
        nome: 'Treino A',
        descricao: 'Descrição do treino',
        treinador_id: null,
        usuario_id: null,
        dias_semana: ['SEGUNDA', 'QUARTA'],
        ordem: 1,
        data_criacao: new Date('2024-01-01'),
        deletado_em: null,
        exercicios: [
            {
                id: 'te-1',
                series: 3,
                repeticoes: '10-12',
                carga_sugerida: '20',
                duracao_sugerida_segundos: null,
                distancia_sugerida_metros: null,
                tempo_descanso_segundos: 60,
                ordem_execucao: 1,
                exercicio: {
                    id: 'ex-1',
                    nome: 'Supino',
                    descricao: 'Exercício de peito',
                    tipo_exercicio: 'MUSCULACAO',
                },
            },
            {
                id: 'te-2',
                series: 4,
                repeticoes: null,
                carga_sugerida: null,
                duracao_sugerida_segundos: 30,
                distancia_sugerida_metros: 100,
                tempo_descanso_segundos: 90,
                ordem_execucao: 2,
                exercicio: {
                    id: 'ex-2',
                    nome: 'Corrida',
                    descricao: null,
                    tipo_exercicio: 'CARDIO',
                },
            },
        ],
        ...overrides,
    } as unknown as TreinoComExercicios;
}

describe('mapTreinoTemplateParaAluno', () => {
    it('mapeia nome e aluno_id corretamente', () => {
        const template = makeTemplate();
        const result = mapTreinoTemplateParaAluno(template, 'aluno-123');

        expect(result.nome).toBe('Treino A');
        expect(result.aluno_id).toBe('aluno-123');
    });

    it('mapeia descricao quando presente', () => {
        const template = makeTemplate({ descricao: 'Minha descrição' });
        const result = mapTreinoTemplateParaAluno(template, 'aluno-123');

        expect(result.descricao).toBe('Minha descrição');
    });

    it('mapeia descricao como null quando ausente', () => {
        const template = makeTemplate({ descricao: undefined });
        const result = mapTreinoTemplateParaAluno(template, 'aluno-123');

        expect(result.descricao).toBeNull();
    });

    it('mapeia dias_semana quando presente', () => {
        const template = makeTemplate({ dias_semana: ['TERCA', 'QUINTA'] });
        const result = mapTreinoTemplateParaAluno(template, 'aluno-123');

        expect(result.dias_semana).toEqual(['TERCA', 'QUINTA']);
    });

    it('mapeia dias_semana como null quando ausente', () => {
        const template = makeTemplate({ dias_semana: undefined });
        const result = mapTreinoTemplateParaAluno(template, 'aluno-123');

        expect(result.dias_semana).toBeNull();
    });

    it('mapeia ordem quando presente', () => {
        const template = makeTemplate({ ordem: 5 });
        const result = mapTreinoTemplateParaAluno(template, 'aluno-123');

        expect(result.ordem).toBe(5);
    });

    it('mapeia ordem como null quando ausente', () => {
        const template = makeTemplate({ ordem: undefined });
        const result = mapTreinoTemplateParaAluno(template, 'aluno-123');

        expect(result.ordem).toBeNull();
    });

    it('mapeia exercícios com todos os campos', () => {
        const template = makeTemplate();
        const result = mapTreinoTemplateParaAluno(template, 'aluno-123');

        expect(result.exercicios).toHaveLength(2);

        const ex1 = result.exercicios![0];
        expect(ex1.exercicio_id).toBe('ex-1');
        expect(ex1.series).toBe(3);
        expect(ex1.repeticoes).toBe('10-12');
        expect(ex1.carga_sugerida).toBe(20); // string '20' convertida para number
        expect(ex1.duracao_sugerida_segundos).toBeNull();
        expect(ex1.distancia_sugerida_metros).toBeNull();
        expect(ex1.tempo_descanso_segundos).toBe(60);
        expect(ex1.ordem_execucao).toBe(1);
    });

    it('mapeia carga_sugerida null quando carga é null', () => {
        const template = makeTemplate();
        const result = mapTreinoTemplateParaAluno(template, 'aluno-123');

        const ex2 = result.exercicios![1];
        expect(ex2.carga_sugerida).toBeNull();
    });

    it('mapeia carga_sugerida null quando carga é string não numérica', () => {
        const template = makeTemplate({
            exercicios: [
                {
                    id: 'te-x',
                    series: 3,
                    repeticoes: '10',
                    carga_sugerida: 'abc', // string inválida
                    duracao_sugerida_segundos: null,
                    distancia_sugerida_metros: null,
                    tempo_descanso_segundos: 60,
                    ordem_execucao: 1,
                    exercicio: {
                        id: 'ex-x',
                        nome: 'Exercício X',
                        descricao: null,
                        tipo_exercicio: 'MUSCULACAO',
                    },
                },
            ] as any,
        });
        const result = mapTreinoTemplateParaAluno(template, 'aluno-123');

        expect(result.exercicios![0].carga_sugerida).toBeNull();
    });

    it('retorna array vazio de exercícios quando exercicios é undefined', () => {
        const template = makeTemplate({ exercicios: undefined as any });
        const result = mapTreinoTemplateParaAluno(template, 'aluno-123');

        expect(result.exercicios).toEqual([]);
    });

    it('mapeia duracao_sugerida_segundos e distancia_sugerida_metros corretamente', () => {
        const template = makeTemplate();
        const result = mapTreinoTemplateParaAluno(template, 'aluno-123');

        const ex2 = result.exercicios![1];
        expect(ex2.duracao_sugerida_segundos).toBe(30);
        expect(ex2.distancia_sugerida_metros).toBe(100);
    });

    it('mapeia repeticoes null quando campo é null', () => {
        const template = makeTemplate();
        const result = mapTreinoTemplateParaAluno(template, 'aluno-123');

        const ex2 = result.exercicios![1];
        expect(ex2.repeticoes).toBeNull();
    });
});

describe('mapTreinoTemplateParaMultiplosAlunos', () => {
    it('retorna array vazio quando alunoIds é vazio', () => {
        const template = makeTemplate();
        const result = mapTreinoTemplateParaMultiplosAlunos(template, []);

        expect(result).toEqual([]);
    });

    it('retorna um payload por aluno', () => {
        const template = makeTemplate();
        const result = mapTreinoTemplateParaMultiplosAlunos(template, ['aluno-1', 'aluno-2', 'aluno-3']);

        expect(result).toHaveLength(3);
        expect(result[0].aluno_id).toBe('aluno-1');
        expect(result[1].aluno_id).toBe('aluno-2');
        expect(result[2].aluno_id).toBe('aluno-3');
    });

    it('cada payload tem o mesmo nome do template', () => {
        const template = makeTemplate({ nome: 'Treino Compartilhado' });
        const result = mapTreinoTemplateParaMultiplosAlunos(template, ['a1', 'a2']);

        expect(result[0].nome).toBe('Treino Compartilhado');
        expect(result[1].nome).toBe('Treino Compartilhado');
    });

    it('cada payload é independente (não compartilha referência)', () => {
        const template = makeTemplate();
        const result = mapTreinoTemplateParaMultiplosAlunos(template, ['a1', 'a2']);

        expect(result[0]).not.toBe(result[1]);
    });
});
