import { integer, pgTable, varchar, date, pgEnum, boolean, primaryKey, timestamp, decimal, text, uuid } from 'drizzle-orm/pg-core';
import { sql, relations } from 'drizzle-orm';

export const sexoEnum = pgEnum('sexo', ['M', 'F']);
export const tipoAtivacaoEnum = pgEnum('tipo_ativacao', ['PRIMARIO', 'SECUNDARIO']);
export const turnoEnum = pgEnum('turno', ['MANHA', 'TARDE', 'NOITE']);
export const grupoMuscularEnum = pgEnum('grupo_muscular', ['PEITO', 'COSTAS', 'PERNAS', 'BRAÇOS', 'OMBROS', 'ABDOMEN']);

export const academia = pgTable('academia', {
    id: uuid('id').defaultRandom().primaryKey(),
    nome: varchar('nome', { length: 255 }).notNull(),
    endereco_numero: varchar('endereco_numero', { length: 20 }).notNull(),
    endereco_rua: varchar('endereco_rua', { length: 255 }).notNull(),
    endereco_bairro: varchar('endereco_bairro', { length: 255 }).notNull(),
    endereco_cidade: varchar('endereco_cidade', { length: 255 }).notNull(),
    endereco_estado: varchar('endereco_estado', { length: 2 }).notNull(),
    created_at: timestamp('created_at').defaultNow().notNull(),
});

export const aluno = pgTable('aluno', {
    id: uuid('id').defaultRandom().primaryKey(),
    url_foto: varchar('url_foto', { length: 255 }),
    nome: varchar('nome', { length: 255 }).notNull(),
    email: varchar('email', { length: 255 }).notNull().unique(),
    senha: varchar('senha', { length: 255 }).notNull(),
    data_nascimento: date('data_nascimento').notNull(),
    sexo: sexoEnum('sexo').notNull(),
    is_admin: boolean('is_admin').notNull().default(false),
    status_conta: boolean('status_conta').notNull().default(true),
    created_at: timestamp('created_at').defaultNow().notNull(),
    academia_id: uuid('academia_id').notNull().references(() => academia.id),
});

export const aluno_academia = pgTable('aluno_academia', {
    aluno_id: uuid('aluno_id').notNull().references(() => aluno.id),
    academia_id: uuid('academia_id').notNull().references(() => academia.id),
}, (table) => [
    primaryKey({ columns: [table.aluno_id, table.academia_id] })
]);

export const avaliacao_fisica = pgTable('avaliacao_fisica', {
    id: uuid('id').defaultRandom().primaryKey(),
    data_avaliacao: date('data_avaliacao').notNull().default(sql`CURRENT_DATE`),
    peso_kg: decimal('peso_kg', { precision: 5, scale: 2 }).notNull(), // Ex: 85.50
    altura_m: decimal('altura_m', { precision: 3, scale: 2 }).notNull(), // Ex: 1.75
    aluno_id: uuid('aluno_id').notNull().references(() => aluno.id),
});

export const treinador = pgTable('treinador', {
    id: uuid('id').defaultRandom().primaryKey(),
    url_foto: varchar('url_foto', { length: 255 }),
    nome: varchar('nome', { length: 255 }).notNull(),
    email: varchar('email', { length: 255 }).notNull().unique(),
    senha: varchar('senha', { length: 255 }).notNull(),
    data_nascimento: date('data_nascimento').notNull(),
    sexo: sexoEnum('sexo').notNull(),
    cref: varchar('cref', { length: 50 }).notNull().unique(),
    turnos: turnoEnum('turnos').array().notNull(),
    especializacao: varchar('especializacao', { length: 255 }).notNull(),
    graduacao: varchar('graduacao', { length: 255 }).notNull(),
    is_admin: boolean('is_admin').notNull().default(false),
    status_conta: boolean('status_conta').notNull().default(true),
    created_at: timestamp('created_at').defaultNow().notNull(),
    academia_id: uuid('academia_id').notNull().references(() => academia.id),
});

export const treinador_academia = pgTable('treinador_academia', {
    treinador_id: uuid('treinador_id').notNull().references(() => treinador.id),
    academia_id: uuid('academia_id').notNull().references(() => academia.id),
}, (table) => [
    primaryKey({ columns: [table.treinador_id, table.academia_id] })
]);

export const musculo = pgTable('musculo', {
    id: uuid('id').defaultRandom().primaryKey(),
    nome: varchar('nome', { length: 255 }).notNull(),
    grupo_muscular: grupoMuscularEnum('grupo_muscular').notNull(),
});

export const aparelho = pgTable('aparelho', {
    id: uuid('id').defaultRandom().primaryKey(),
    nome: varchar('nome', { length: 255 }).notNull(),
    descricao: varchar('descricao', { length: 255 }).notNull(),
});

export const exercicio = pgTable('exercicio', {
    id: uuid('id').defaultRandom().primaryKey(),
    nome: varchar('nome', { length: 255 }).notNull(),
    descricao: text('descricao'),
    aluno_id: uuid('aluno_id').references(() => aluno.id),
    deletado_em: timestamp('deletado_em'),
    created_at: timestamp('created_at').defaultNow().notNull(),
});

export const exercicio_musculo = pgTable('exercicio_musculo', {
    tipo_ativacao: tipoAtivacaoEnum('tipo_ativacao').notNull(),
    exercicio_id: uuid('exercicio_id').notNull().references(() => exercicio.id),
    musculo_id: uuid('musculo_id').notNull().references(() => musculo.id),
}, (table) => [
    primaryKey({ columns: [table.exercicio_id, table.musculo_id] })
]);

export const exercicio_aparelho = pgTable('exercicio_aparelho', {
    exercicio_id: uuid('exercicio_id').notNull().references(() => exercicio.id),
    aparelho_id: uuid('aparelho_id').notNull().references(() => aparelho.id),
}, (table) => [
    primaryKey({ columns: [table.exercicio_id, table.aparelho_id] })
]);

export const rotina_treino = pgTable('rotina_treino', {
    id: uuid('id').defaultRandom().primaryKey(),
    nome: varchar('nome', { length: 255 }).notNull(),
    data_criacao: timestamp('data_criacao').defaultNow().notNull(),
    usuario_id: uuid('usuario_id').notNull().references(() => aluno.id),
    treinador_id: uuid('treinador_id').references(() => treinador.id),
});

export const item_rotina = pgTable('item_rotina', {
    id: uuid('id').defaultRandom().primaryKey(),
    series: integer('series').notNull(),
    repeticoes: varchar('repeticoes', { length: 50 }).notNull(),
    carga_sugerida: decimal('carga_sugerida', { precision: 5, scale: 2 }),
    tempo_descanso_segundos: integer('tempo_descanso_segundos').notNull(),
    ordem_execucao: integer('ordem_execucao').notNull(),
    rotina_id: uuid('rotina_id').notNull().references(() => rotina_treino.id, { onDelete: 'cascade' }),
    exercicio_id: uuid('exercicio_id').notNull().references(() => exercicio.id),
});

// #########################################################################################################
// RELAÇÕES

// 1. Relações da Academia
export const academiaRelations = relations(academia, ({ many }) => ({
    alunoAcademias: many(aluno_academia),
    treinadorAcademias: many(treinador_academia),
}));

// 2. Relações do Aluno
export const alunoRelations = relations(aluno, ({ one, many }) => ({
    academiaPrincipal: one(academia, {
        fields: [aluno.academia_id],
        references: [academia.id],
    }),
    alunoAcademias: many(aluno_academia),
    avaliacoesFisicas: many(avaliacao_fisica),
    rotinasTreino: many(rotina_treino),
    exerciciosCriados: many(exercicio),
}));

// 2.1 Relações da Tabela Associativa: Aluno <-> Academia
export const alunoAcademiaRelations = relations(aluno_academia, ({ one }) => ({
    aluno: one(aluno, {
        fields: [aluno_academia.aluno_id],
        references: [aluno.id],
    }),
    academia: one(academia, {
        fields: [aluno_academia.academia_id],
        references: [academia.id],
    }),
}));

// 3. Relações da Avaliação Física
export const avaliacaoFisicaRelations = relations(avaliacao_fisica, ({ one }) => ({
    aluno: one(aluno, {
        fields: [avaliacao_fisica.aluno_id],
        references: [aluno.id],
    }),
}));

// 4. Relações do Treinador
export const treinadorRelations = relations(treinador, ({ one, many }) => ({
    academiaPrincipal: one(academia, {
        fields: [treinador.academia_id],
        references: [academia.id],
    }),
    treinadorAcademias: many(treinador_academia),
    rotinasCriadas: many(rotina_treino),
}));

// 4.1 Relações da Tabela Associativa: Treinador <-> Academia
export const treinadorAcademiaRelations = relations(treinador_academia, ({ one }) => ({
    treinador: one(treinador, {
        fields: [treinador_academia.treinador_id],
        references: [treinador.id],
    }),
    academia: one(academia, {
        fields: [treinador_academia.academia_id],
        references: [academia.id],
    }),
}));

// 5. Relações do Exercício (A peça central)
export const exercicioRelations = relations(exercicio, ({ one, many }) => ({
    aluno: one(aluno, {
        fields: [exercicio.aluno_id],
        references: [aluno.id],
    }),
    itensRotina: many(item_rotina),
    // Para N:M, apontamos para a tabela associativa primeiro
    exercicioMusculos: many(exercicio_musculo),
    exercicioAparelhos: many(exercicio_aparelho),
}));

// 6. Relações do Músculo
export const musculoRelations = relations(musculo, ({ many }) => ({
    exercicioMusculos: many(exercicio_musculo),
}));

// 7. Relações do Aparelho
export const aparelhoRelations = relations(aparelho, ({ many }) => ({
    exercicioAparelhos: many(exercicio_aparelho),
}));

// 8. Relações da Tabela Associativa: Exercicio <-> Musculo
export const exercicioMusculoRelations = relations(exercicio_musculo, ({ one }) => ({
    exercicio: one(exercicio, {
        fields: [exercicio_musculo.exercicio_id],
        references: [exercicio.id],
    }),
    musculo: one(musculo, {
        fields: [exercicio_musculo.musculo_id],
        references: [musculo.id],
    }),
}));

// 9. Relações da Tabela Associativa: Exercicio <-> Aparelho
export const exercicioAparelhoRelations = relations(exercicio_aparelho, ({ one }) => ({
    exercicio: one(exercicio, {
        fields: [exercicio_aparelho.exercicio_id],
        references: [exercicio.id],
    }),
    aparelho: one(aparelho, {
        fields: [exercicio_aparelho.aparelho_id],
        references: [aparelho.id],
    }),
}));

// 10. Relações da Rotina de Treino
export const rotinaTreinoRelations = relations(rotina_treino, ({ one, many }) => ({
    aluno: one(aluno, {
        fields: [rotina_treino.usuario_id],
        references: [aluno.id],
    }),
    treinador: one(treinador, {
        fields: [rotina_treino.treinador_id],
        references: [treinador.id],
    }),
    itens: many(item_rotina),
}));

// 11. Relações do Item da Rotina
export const itemRotinaRelations = relations(item_rotina, ({ one }) => ({
    rotina: one(rotina_treino, {
        fields: [item_rotina.rotina_id],
        references: [rotina_treino.id],
    }),
    exercicio: one(exercicio, {
        fields: [item_rotina.exercicio_id],
        references: [exercicio.id],
    }),
}));