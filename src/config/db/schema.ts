import { integer, pgTable, varchar, date, pgEnum, boolean, primaryKey, timestamp, decimal, text, uuid, uniqueIndex } from 'drizzle-orm/pg-core';
import { sql, relations } from 'drizzle-orm';

// Enums
export const sexoEnum = pgEnum('sexo', ['M', 'F']);
export const tipoAtivacaoEnum = pgEnum('tipo_ativacao', ['PRIMARIO', 'SECUNDARIO']);
export const turnoEnum = pgEnum('turno', ['MANHA', 'TARDE', 'NOITE']);
export const grupoMuscularEnum = pgEnum('grupo_muscular', ['PEITO', 'COSTAS', 'PERNAS', 'BRAÇOS', 'OMBROS', 'ABDOMEN']);
export const diaSemanaEnum = pgEnum('dia_semana', ['SEGUNDA', 'TERCA', 'QUARTA', 'QUINTA', 'SEXTA', 'SABADO', 'DOMINGO']);

// Tabelas do BetterAuth (autenticação)
export const user = pgTable('user', {
    id: text('id').primaryKey(),
    name: text('name').notNull(),
    email: text('email').notNull().unique(),
    emailVerified: boolean('email_verified').notNull(),
    image: text('image'),
    createdAt: timestamp('created_at').notNull(),
    updatedAt: timestamp('updated_at').notNull(),
});

export const session = pgTable('session', {
    id: text('id').primaryKey(),
    expiresAt: timestamp('expires_at').notNull(),
    token: text('token').notNull().unique(),
    createdAt: timestamp('created_at').notNull(),
    updatedAt: timestamp('updated_at').notNull(),
    ipAddress: text('ip_address'),
    userAgent: text('user_agent'),
    userId: text('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
});

export const account = pgTable('account', {
    id: text('id').primaryKey(),
    accountId: text('account_id').notNull(),
    providerId: text('provider_id').notNull(),
    userId: text('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
    accessToken: text('access_token'),
    refreshToken: text('refresh_token'),
    idToken: text('id_token'),
    accessTokenExpiresAt: timestamp('access_token_expires_at'),
    refreshTokenExpiresAt: timestamp('refresh_token_expires_at'),
    scope: text('scope'),
    password: text('password'),
    createdAt: timestamp('created_at').notNull(),
    updatedAt: timestamp('updated_at').notNull(),
});

export const verification = pgTable('verification', {
    id: text('id').primaryKey(),
    identifier: text('identifier').notNull(),
    value: text('value').notNull(),
    expiresAt: timestamp('expires_at').notNull(),
    createdAt: timestamp('created_at'),
    updatedAt: timestamp('updated_at'),
});

// Relações do BetterAuth
export const userRelations = relations(user, ({ many }) => ({
    sessions: many(session),
    accounts: many(account),
    aluno: many(aluno),
    treinador: many(treinador),
}));

export const sessionRelations = relations(session, ({ one }) => ({
    user: one(user, {
        fields: [session.userId],
        references: [user.id],
    }),
}));

export const accountRelations = relations(account, ({ one }) => ({
    user: one(user, {
        fields: [account.userId],
        references: [user.id],
    }),
}));

// Tabelas do Domínio
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

// Perfil de aluno — autenticação fica na tabela 'user' do BetterAuth
export const aluno = pgTable('aluno', {
    id: uuid('id').defaultRandom().primaryKey(),
    user_id: text('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }).unique(),
    url_foto: varchar('url_foto', { length: 255 }),
    nome: varchar('nome', { length: 255 }).notNull(),
    data_nascimento: date('data_nascimento').notNull(),
    sexo: sexoEnum('sexo').notNull(),
    is_admin: boolean('is_admin').notNull().default(false),
    status_conta: boolean('status_conta').notNull().default(true),
    created_at: timestamp('created_at').defaultNow().notNull(),
    academia_id: uuid('academia_id').notNull().references(() => academia.id),
    treinador_id: uuid('treinador_id').references(() => treinador.id),
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

// Perfil de treinador — autenticação fica na tabela 'user' do BetterAuth
export const treinador = pgTable('treinador', {
    id: uuid('id').defaultRandom().primaryKey(),
    user_id: text('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }).unique(),
    url_foto: varchar('url_foto', { length: 255 }),
    nome: varchar('nome', { length: 255 }).notNull(),
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

export const treino = pgTable('treino', {
    id: uuid('id').defaultRandom().primaryKey(),
    nome: varchar('nome', { length: 255 }).notNull(),
    descricao: text('descricao'),
    data_criacao: timestamp('data_criacao').defaultNow().notNull(),
    deletado_em: timestamp('deletado_em'),
    usuario_id: uuid('usuario_id').notNull().references(() => aluno.id),
    treinador_id: uuid('treinador_id').references(() => treinador.id),
    dias_semana: diaSemanaEnum('dias_semana').array(),
    ordem: integer('ordem'),
});

export const treino_exercicio = pgTable('treino_exercicio', {
    id: uuid('id').defaultRandom().primaryKey(),
    series: integer('series').notNull(),
    repeticoes: varchar('repeticoes', { length: 50 }).notNull(),
    carga_sugerida: decimal('carga_sugerida', { precision: 5, scale: 2 }),
    tempo_descanso_segundos: integer('tempo_descanso_segundos').notNull(),
    ordem_execucao: integer('ordem_execucao').notNull(),
    treino_id: uuid('treino_id').notNull().references(() => treino.id, { onDelete: 'cascade' }),
    exercicio_id: uuid('exercicio_id').notNull().references(() => exercicio.id),
});

// Relações

// 1. Academia
export const academiaRelations = relations(academia, ({ many }) => ({
    alunoAcademias: many(aluno_academia),
    treinadorAcademias: many(treinador_academia),
}));

// 2. Aluno
export const alunoRelations = relations(aluno, ({ one, many }) => ({
    user: one(user, {
        fields: [aluno.user_id],
        references: [user.id],
    }),
    academiaPrincipal: one(academia, {
        fields: [aluno.academia_id],
        references: [academia.id],
    }),
    treinadorVinculado: one(treinador, {
        fields: [aluno.treinador_id],
        references: [treinador.id],
    }),
    alunoAcademias: many(aluno_academia),
    avaliacoesFisicas: many(avaliacao_fisica),
    treinos: many(treino),
    exerciciosCriados: many(exercicio),
}));

// 2.1. Aluno <-> Academia
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

// 3. Avaliação Física
export const avaliacaoFisicaRelations = relations(avaliacao_fisica, ({ one }) => ({
    aluno: one(aluno, {
        fields: [avaliacao_fisica.aluno_id],
        references: [aluno.id],
    }),
}));

// 4. Treinador
export const treinadorRelations = relations(treinador, ({ one, many }) => ({
    user: one(user, {
        fields: [treinador.user_id],
        references: [user.id],
    }),
    academiaPrincipal: one(academia, {
        fields: [treinador.academia_id],
        references: [academia.id],
    }),
    treinadorAcademias: many(treinador_academia),
    treinosCriados: many(treino),
    alunosVinculados: many(aluno),
}));

// 4.1. Treinador <-> Academia
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

// 5. Exercício
export const exercicioRelations = relations(exercicio, ({ one, many }) => ({
    aluno: one(aluno, {
        fields: [exercicio.aluno_id],
        references: [aluno.id],
    }),
    treinosExercicios: many(treino_exercicio),
    exercicioMusculos: many(exercicio_musculo),
    exercicioAparelhos: many(exercicio_aparelho),
}));

// 6. Músculo
export const musculoRelations = relations(musculo, ({ many }) => ({
    exercicioMusculos: many(exercicio_musculo),
}));

// 7. Aparelho
export const aparelhoRelations = relations(aparelho, ({ many }) => ({
    exercicioAparelhos: many(exercicio_aparelho),
}));

// 8. Exercicio <-> Musculo
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

// 9. Exercicio <-> Aparelho
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

// 10. Rotina de Treino
export const treinoRelations = relations(treino, ({ one, many }) => ({
    aluno: one(aluno, {
        fields: [treino.usuario_id],
        references: [aluno.id],
    }),
    treinador: one(treinador, {
        fields: [treino.treinador_id],
        references: [treinador.id],
    }),
    exercicios: many(treino_exercicio),
}));

// 11. Item do Treino
export const treinoExercicioRelations = relations(treino_exercicio, ({ one }) => ({
    treino: one(treino, {
        fields: [treino_exercicio.treino_id],
        references: [treino.id],
    }),
    exercicio: one(exercicio, {
        fields: [treino_exercicio.exercicio_id],
        references: [exercicio.id],
    }),
}));

// Enums de Sessão
export const statusSessaoEnum = pgEnum('status_sessao', ['EM_ANDAMENTO', 'CONCLUIDA', 'CANCELADA']);
export const statusSerieEnum = pgEnum('status_serie', ['PENDENTE', 'CONCLUIDA', 'PULADA']);

// Tabelas de Sessão
export const sessao_treino = pgTable('sessao_treino', {
    id: uuid('id').defaultRandom().primaryKey(),
    aluno_id: uuid('aluno_id').notNull().references(() => aluno.id),
    treino_id: uuid('treino_id').notNull().references(() => treino.id),
    status: statusSessaoEnum('status').notNull().default('EM_ANDAMENTO'),
    inicio: timestamp('inicio').defaultNow().notNull(),
    fim: timestamp('fim'),
    observacoes: text('observacoes'),
}, (table) => [
    uniqueIndex('sessao_treino_aluno_em_andamento_idx')
        .on(table.aluno_id)
        .where(sql`${table.status} = 'EM_ANDAMENTO'`),
]);

export const sessao_exercicio = pgTable('sessao_exercicio', {
    id: uuid('id').defaultRandom().primaryKey(),
    sessao_treino_id: uuid('sessao_treino_id').notNull().references(() => sessao_treino.id, { onDelete: 'cascade' }),
    treino_exercicio_id: uuid('treino_exercicio_id').notNull().references(() => treino_exercicio.id),
    concluido: boolean('concluido').notNull().default(false),
    observacoes: text('observacoes'),
    ordem: integer('ordem').notNull().default(0),
    inicio: timestamp('inicio'),
    fim: timestamp('fim'),
});

export const sessao_serie = pgTable('sessao_serie', {
    id: uuid('id').defaultRandom().primaryKey(),
    sessao_exercicio_id: uuid('sessao_exercicio_id').notNull().references(() => sessao_exercicio.id, { onDelete: 'cascade' }),
    numero_serie: integer('numero_serie').notNull(),
    repeticoes_realizadas: integer('repeticoes_realizadas'),
    carga_utilizada: decimal('carga_utilizada', { precision: 5, scale: 2 }),
    status: statusSerieEnum('status').notNull().default('PENDENTE'),
    observacoes: text('observacoes'),
});

// Relações de Sessão

// 12. Sessão de Treino
export const sessaoTreinoRelations = relations(sessao_treino, ({ one, many }) => ({
    aluno: one(aluno, {
        fields: [sessao_treino.aluno_id],
        references: [aluno.id],
    }),
    treino: one(treino, {
        fields: [sessao_treino.treino_id],
        references: [treino.id],
    }),
    exercicios: many(sessao_exercicio),
}));

// 13. Sessão Exercício
export const sessaoExercicioRelations = relations(sessao_exercicio, ({ one, many }) => ({
    sessaoTreino: one(sessao_treino, {
        fields: [sessao_exercicio.sessao_treino_id],
        references: [sessao_treino.id],
    }),
    treinoExercicio: one(treino_exercicio, {
        fields: [sessao_exercicio.treino_exercicio_id],
        references: [treino_exercicio.id],
    }),
    series: many(sessao_serie),
}));

// 14. Sessão Série
export const sessaoSerieRelations = relations(sessao_serie, ({ one }) => ({
    sessaoExercicio: one(sessao_exercicio, {
        fields: [sessao_serie.sessao_exercicio_id],
        references: [sessao_exercicio.id],
    }),
}));