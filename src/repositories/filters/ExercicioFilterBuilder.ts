import { and, or, isNull, eq, ilike, inArray, notInArray, SQL, sql } from 'drizzle-orm';
import { DataBase } from '../../config/DbConnect';
import { exercicio, exercicio_musculo, musculo, treino_exercicio } from '../../config/db/schema';

type GrupoMuscular = 'PEITO' | 'COSTAS' | 'PERNAS' | 'BRAÇOS' | 'OMBROS' | 'ABDOMEN';
type TipoAtivacao = 'PRIMARIO' | 'SECUNDARIO';

class ExercicioFilterBuilder {
    private condicoes: SQL[] = [];
    private db: typeof DataBase;

    constructor() {
        this.db = DataBase;
        this.condicoes = [];
    }

    apenasAtivos() {
        this.condicoes.push(isNull(exercicio.deletado_em));
        return this;
    }

    comNome(nome?: string) {
        if (nome?.trim()) {
            this.condicoes.push(ilike(exercicio.nome, `%${nome.trim()}%`));
        }
        return this;
    }

    comEscopo(escopo?: 'GLOBAL' | 'PESSOAL' | 'TODOS', aluno_id?: string) {
        const alunoId = aluno_id?.trim();

        if (escopo === 'PESSOAL') {
            if (alunoId) {
                this.condicoes.push(eq(exercicio.aluno_id, alunoId));
            } else {
                this.condicoes.push(sql`1 = 0`);
            }
            return this;
        }

        if (escopo === 'TODOS') {
            if (alunoId) {
                this.condicoes.push(
                    or(
                        isNull(exercicio.aluno_id),
                        eq(exercicio.aluno_id, alunoId),
                    )!,
                );
            } else {
                this.condicoes.push(isNull(exercicio.aluno_id));
            }
            return this;
        }

        // GLOBAL (default)
        this.condicoes.push(isNull(exercicio.aluno_id));
        return this;
    }

    comEmUso(emUso?: boolean) {
        if (typeof emUso !== 'boolean') {
            return this;
        }

        const subquery = this.db
            .selectDistinct({ id: treino_exercicio.exercicio_id })
            .from(treino_exercicio);

        if (emUso) {
            this.condicoes.push(inArray(exercicio.id, subquery));
        } else {
            this.condicoes.push(notInArray(exercicio.id, subquery));
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
