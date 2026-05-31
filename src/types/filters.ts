import { type_exercicio } from './dbSchemas';

export interface FiltrosMusculo {
    nome?: string;
    grupo_muscular?: string;
    ordem?: 'nome_asc' | 'nome_desc' | 'popularidade_desc';
    incluir_contagem_grupo?: boolean;
    page?: number;
    limite?: number;
}

export interface ResultadoPaginadoMusculo {
    dados: { id: string; nome: string; grupo_muscular: string }[];
    total: number;
    page: number;
    limite: number;
    totalPages: number;
    contagem_por_grupo?: Record<string, number>;
}

export interface FiltrosAparelho {
    nome?: string;
    ordem?: 'nome_asc' | 'nome_desc' | 'popularidade_desc';
    page?: number;
    limite?: number;
}

export interface ResultadoPaginadoAparelho {
    dados: { id: string; nome: string; descricao: string }[];
    total: number;
    page: number;
    limite: number;
    totalPages: number;
}

export interface FiltrosExercicio {
    nome?: string;
    grupo_muscular?: string;
    tipo_ativacao?: string;
    tipo_exercicio?: 'REPETICAO' | 'TEMPO' | 'DISTANCIA';
    aluno_id?: string;
    treinador_id?: string;
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

export interface AparelhoResumo {
    aparelho_id: string;
    nome: string;
    descricao: string;
}

export type ExercicioComMusculos = type_exercicio & {
    musculos: MusculoResumo[];
    aparelhos: AparelhoResumo[];
};

export interface ResultadoPaginadoExercicio {
    dados: ExercicioComMusculos[];
    total: number;
    page: number;
    limite: number;
    totalPages: number;
}
