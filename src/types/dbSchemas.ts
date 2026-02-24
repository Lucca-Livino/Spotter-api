import { enum_sexo, enum_turnos } from "./enum";

export type type_academia = {
    id?: number;
    nome: string;
    endereco_numero: string;
    endereco_rua: string;
    endereco_bairro: string;
    endereco_cidade: string;
    endereco_estado: string;
    created_at: Date;
}

export type type_aluno = {
    id?: number;
    url_foto?: string | null;
    nome: string;
    email: string;
    senha: string;
    data_nascimento: string;
    sexo: enum_sexo;
    status_conta: boolean;
    created_at?: Date;
    academia_id: number;
}

export type type_avaliacao_fisica = {
    id?: number;
    data_avaliacao: Date;
    peso_kg: number;
    altura_m: number;
    aluno_id: number;
}

export type type_treinador = {
    id?: number;
    url_foto: string;
    nome: string;
    email: string;
    senha: string;
    data_nascimento: string;
    sexo: enum_sexo;
    cref: string;
    turno: enum_turnos;
    especializacao: string;
    graduacao: string;
    status_conta: boolean;
    created_at: Date;
    academia_id: number;
}

export type type_grupo_muscular = 'PEITO' | 'COSTAS' | 'PERNAS' | 'BRAÇOS' | 'OMBROS' | 'ABDOMEN';

export type type_musculo = {
    id?: number;
    nome: string;
    grupo_muscular: type_grupo_muscular;
}

export type type_aparelho = {
    id?: number;
    nome: string;
    descricao: string;
}

export type type_exercicio = {
    id?: number;
    nome: string;
    descricao: string;
}

export type type_tipo_ativacao = 'PRIMARIO' | 'SECUNDARIO';

export type type_exercicio_musculo = {
    exercicio_id: number;
    musculo_id: number;
    tipo_ativacao: type_tipo_ativacao;
}

export type type_exercicio_aparelho = {
    exercicio_id: number;
    aparelho_id: number;
}

export type type_rotina_treino = {
    id?: number;
    nome: string;
    data_criacao: Date;
    usuario_id: number;
    treinador_id: number | null;
}

export type type_item_rotina = {
    id?: number;
    series: number;
    repeticoes: number;
    carga_sugerida: number;
    tempo_descanso_segundos: number;
    ordem_execucao: number;
    rotina_id: number;
    exercicio_id: number;
}