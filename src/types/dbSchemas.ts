import { enum_dia_semana, enum_remetente_tipo, enum_sexo, enum_status_serie, enum_status_sessao, enum_tipo_exercicio, enum_turnos } from "./enum";

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
    treinador_id?: string | null;
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

export type type_conversa = {
    id?: string;
    treinador_id: string;
    aluno_id: string;
    ativa?: boolean;
    ultima_mensagem_em?: Date | null;
    created_at?: Date;
}

export type type_mensagem_conversa = {
    id?: string;
    conversa_id: string;
    remetente_tipo: enum_remetente_tipo;
    remetente_user_id: string;
    conteudo: string;
    enviada_em?: Date;
    lida_em?: Date | null;
    lida_por_user_id?: string | null;
    ativa?: boolean;
}

export type type_grupo_muscular = 'PEITO' | 'COSTAS' | 'PERNAS' | 'BRAÇOS' | 'OMBROS' | 'ABDOMEN' | 'PESCOÇO' | 'CARDIO';

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
    animacao_url?: string | null;
    aluno_id?: string | null;
    treinador_id?: string | null;
    tipo_exercicio?: enum_tipo_exercicio;
    deletado_em?: Date | null;
    created_at?: Date;
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

export type type_treino = {
    id?: string;
    nome: string;
    descricao?: string | null;
    data_criacao?: Date;
    deletado_em?: Date | null;
    usuario_id: string | null;
    treinador_id: string | null;
    dias_semana?: enum_dia_semana[] | null;
    ordem?: number | null;
}

export type type_treino_exercicio = {
    id?: string;
    series: number;
    repeticoes?: string | null;
    carga_sugerida?: number | null;
    duracao_sugerida_segundos?: number | null;
    distancia_sugerida_metros?: number | null;
    tempo_descanso_segundos: number;
    ordem_execucao: number;
    treino_id: string;
    exercicio_id: string;
}

export type type_sessao_treino = {
    id?: string;
    aluno_id: string;
    treino_id: string;
    status?: enum_status_sessao;
    inicio?: Date;
    fim?: Date | null;
    observacoes?: string | null;
}

export type type_sessao_exercicio = {
    id?: string;
    sessao_treino_id: string;
    treino_exercicio_id: string;
    concluido?: boolean;
    observacoes?: string | null;
    ordem?: number;
    inicio?: Date | null;
    fim?: Date | null;
}

export type type_sessao_serie = {
    id?: string;
    sessao_exercicio_id: string;
    numero_serie: number;
    repeticoes_realizadas?: number | null;
    carga_utilizada?: string | null;
    tempo_realizado_segundos?: number | null;
    distancia_realizada_metros?: number | null;
    status?: enum_status_serie;
    observacoes?: string | null;
}

// Tipo do usuário autenticado
export type type_usuario_autenticado = {
    id: string;
    nome: string;
    email: string;
    tipo: 'aluno' | 'treinador';
    is_admin: boolean;
}