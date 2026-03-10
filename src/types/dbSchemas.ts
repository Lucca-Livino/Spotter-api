import { enum_sexo, enum_turnos } from "./enum";

export type type_academia = {
    id?: string;
    nome: string;
    endereco_numero: string;
    endereco_rua: string;
    endereco_bairro: string;
    endereco_cidade: string;
    endereco_estado: string;
    created_at?: Date;
}

export type type_aluno = {
    id?: string;
    user_id: string;
    url_foto?: string | null;
    nome: string;
    data_nascimento: string;
    sexo: enum_sexo;
    is_admin?: boolean;
    status_conta?: boolean;
    created_at?: Date;
    academia_id: string;
}

export type type_avaliacao_fisica = {
    id?: string;
    data_avaliacao: Date;
    peso_kg: number;
    altura_m: number;
    aluno_id: string;
}

export type type_treinador = {
    id?: string;
    user_id: string;
    url_foto?: string | null;
    nome: string;
    data_nascimento: string;
    sexo: enum_sexo;
    cref: string;
    turnos: enum_turnos[];
    especializacao: string;
    graduacao: string;
    is_admin?: boolean;
    status_conta?: boolean;
    created_at?: Date;
    academia_id: string;
}

export type type_grupo_muscular = 'PEITO' | 'COSTAS' | 'PERNAS' | 'BRAÇOS' | 'OMBROS' | 'ABDOMEN';

export type type_musculo = {
    id?: string;
    nome: string;
    grupo_muscular: type_grupo_muscular;
}

export type type_aparelho = {
    id?: string;
    nome: string;
    descricao: string;
}

export type type_exercicio = {
    id?: string;
    nome: string;
    descricao?: string | null;
    aluno_id?: string | null;
    deletado_em?: Date | null;
    created_at?: Date;
    musculos?: {
        exercicio_id?: string;
        musculo_id: string;
        tipo_ativacao: type_tipo_ativacao;
        nome: string;
        grupo_muscular: type_grupo_muscular;
    }[];
}

export type type_tipo_ativacao = 'PRIMARIO' | 'SECUNDARIO';

export type type_exercicio_musculo = {
    exercicio_id: string;
    musculo_id: string;
    tipo_ativacao: type_tipo_ativacao;
}

export type type_exercicio_aparelho = {
    exercicio_id: string;
    aparelho_id: string;
}

export type type_rotina_treino = {
    id?: string;
    nome: string;
    data_criacao: Date;
    usuario_id: string;
    treinador_id: string | null;
}

export type type_item_rotina = {
    id?: string;
    series: number;
    repeticoes: string;
    carga_sugerida: number;
    tempo_descanso_segundos: number;
    ordem_execucao: number;
    rotina_id: string;
    exercicio_id: string;
}

// Tipo do usuário autenticado
export type type_usuario_autenticado = {
    id: string;
    nome: string;
    email: string;
    tipo: 'aluno' | 'treinador';
    is_admin: boolean;
}