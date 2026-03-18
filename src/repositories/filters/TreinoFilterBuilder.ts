import { and, eq, ilike, inArray, isNull, SQL } from 'drizzle-orm';
import { DataBase } from '../../config/DbConnect';
import { treino, treino_exercicio, exercicio, exercicio_musculo, musculo } from '../../config/db/schema';

type GrupoMuscular = 'PEITO' | 'COSTAS' | 'PERNAS' | 'BRAÇOS' | 'OMBROS' | 'ABDOMEN';
type TipoAtivacao = 'PRIMARIO' | 'SECUNDARIO';

class TreinoFilterBuilder {
    private treinoCondicoes: SQL[] = [];
    private treinoExercicioCondicoes: SQL[] = [];
    private db: typeof DataBase;

    constructor() {
        this.db = DataBase;
    }

    comTreinoId(treinoId: string) {
        this.treinoCondicoes.push(eq(treino.id, treinoId));
        return this;
    }

    comNomeTreino(nome?: string) {
        if (nome?.trim()) {
            this.treinoCondicoes.push(ilike(treino.nome, `%${nome.trim()}%`));
        }
        return this;
    }

    comUsuarioId(usuarioId?: string) {
        if (usuarioId?.trim()) {
            this.treinoCondicoes.push(eq(treino.usuario_id, usuarioId.trim()));
        }
        return this;
    }

    comTreinadorId(treinadorId?: string) {
        if (treinadorId?.trim()) {
            this.treinoCondicoes.push(eq(treino.treinador_id, treinadorId.trim()));
        }
        return this;
    }

    apenasTreinosAtivos() {
        this.treinoCondicoes.push(isNull(treino.deletado_em));
        return this;
    }

    comTreinoExercicioTreinoId(treinoId: string) {
        this.treinoExercicioCondicoes.push(eq(treino_exercicio.treino_id, treinoId));
        return this;
    }

    comNomeExercicio(nome?: string) {
        if (nome?.trim()) {
            this.treinoExercicioCondicoes.push(ilike(exercicio.nome, `%${nome.trim()}%`));
        }
        return this;
    }

    comGrupoMuscular(grupoMuscular?: string) {
        if (grupoMuscular?.trim()) {
            const subquery = this.db
                .selectDistinct({ id: exercicio_musculo.exercicio_id })
                .from(exercicio_musculo)
                .innerJoin(musculo, eq(exercicio_musculo.musculo_id, musculo.id))
                .where(eq(musculo.grupo_muscular, grupoMuscular.trim() as GrupoMuscular));

            this.treinoExercicioCondicoes.push(inArray(exercicio.id, subquery));
        }
        return this;
    }

    comTipoAtivacao(tipoAtivacao?: string) {
        if (tipoAtivacao?.trim()) {
            const subquery = this.db
                .selectDistinct({ id: exercicio_musculo.exercicio_id })
                .from(exercicio_musculo)
                .where(eq(exercicio_musculo.tipo_ativacao, tipoAtivacao.trim() as TipoAtivacao));

            this.treinoExercicioCondicoes.push(inArray(exercicio.id, subquery));
        }
        return this;
    }

    comApenasExerciciosAtivos(apenasAtivos: boolean) {
        if (apenasAtivos) {
            this.treinoExercicioCondicoes.push(isNull(exercicio.deletado_em));
        }
        return this;
    }

    buildTreino() {
        return and(...this.treinoCondicoes);
    }

    buildTreinoExercicio() {
        return and(...this.treinoExercicioCondicoes);
    }
}

export default TreinoFilterBuilder;