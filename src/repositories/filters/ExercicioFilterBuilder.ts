import { and, or, isNull, eq, ilike, inArray, SQL } from 'drizzle-orm';
import { DataBase } from '../../config/DbConnect';
import { exercicio, exercicio_musculo, musculo } from '../../config/db/schema';

type GrupoMuscular = 'PEITO' | 'COSTAS' | 'PERNAS' | 'BRAÇOS' | 'OMBROS' | 'ABDOMEN';
type TipoAtivacao = 'PRIMARIO' | 'SECUNDARIO';

class ExercicioFilterBuilder {
    private condicoes: SQL[] = [];
    private db: typeof DataBase;

    constructor() {
        this.db = DataBase;
        this.condicoes = [isNull(exercicio.deletado_em)];
    }

    comNome(nome?: string) {
        if (nome?.trim()) {
            this.condicoes.push(ilike(exercicio.nome, `%${nome.trim()}%`));
        }
        return this;
    }

    comAluno(aluno_id?: string) {
        if (aluno_id?.trim()) {
            this.condicoes.push(
                or(
                    isNull(exercicio.aluno_id),
                    eq(exercicio.aluno_id, aluno_id.trim()),
                )!,
            );
        } else {
            this.condicoes.push(isNull(exercicio.aluno_id));
        }
        return this;
    }

    comGrupoMuscular(grupo_muscular?: string) {
        if (grupo_muscular?.trim()) {
            const subquery = this.db
                .selectDistinct({ id: exercicio_musculo.exercicio_id })
                .from(exercicio_musculo)
                .innerJoin(musculo, eq(exercicio_musculo.musculo_id, musculo.id))
                .where(eq(musculo.grupo_muscular, grupo_muscular.trim() as GrupoMuscular));

            this.condicoes.push(inArray(exercicio.id, subquery));
        }
        return this;
    }

    comTipoAtivacao(tipo_ativacao?: string) {
        if (tipo_ativacao?.trim()) {
            const subquery = this.db
                .selectDistinct({ id: exercicio_musculo.exercicio_id })
                .from(exercicio_musculo)
                .where(
                    eq(exercicio_musculo.tipo_ativacao, tipo_ativacao.trim() as TipoAtivacao),
                );

            this.condicoes.push(inArray(exercicio.id, subquery));
        }
        return this;
    }

    build() {
        return and(...this.condicoes);
    }
}

export default ExercicioFilterBuilder;
