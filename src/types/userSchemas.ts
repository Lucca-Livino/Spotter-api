import { enum_sexo } from "./enum";

export type type_user = {
    id?: number;
    user_id: string;
    url_foto?: string | null;
    nome: string;
    data_nascimento: string;
    sexo: enum_sexo;
    status_conta: boolean;
    created_at?: Date;
}

export type type_user_update = Partial<Omit<type_user, 'id' | 'created_at'>>;

export type type_physical_data = {
    id?: number;
    data_avaliacao?: Date;
    peso_kg: number;
    altura_cm?: number | null;
    aluno_id: number;
}
