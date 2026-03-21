import { type_exercicio } from './dbSchemas';

export interface FiltrosExercicio {
    nome?: string;
    grupo_muscular?: string;
    tipo_ativacao?: string;
    aluno_id?: string;
    escopo?: 'GLOBAL' | 'PESSOAL' | 'TODOS';
    em_uso?: boolean;
    ordem_nome?: 'asc' | 'desc';
    incluir_inativos?: boolean;
}

export interface MusculoResumo {
    musculo_id: string;
    tipo_ativacao: 'PRIMARIO' | 'SECUNDARIO';
    nome: string;
    grupo_muscular: string;
}

export type ExercicioComMusculos = type_exercicio & { musculos: MusculoResumo[] };

export interface ResultadoPaginadoExercicio {
    dados: ExercicioComMusculos[];
    total: number;
    page: number;
    limite: number;
    totalPages: number;
}
