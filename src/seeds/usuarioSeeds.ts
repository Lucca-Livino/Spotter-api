import { DataBase } from "../config/DbConnect";
import { aluno, aluno_academia, avaliacao_fisica } from "../config/db/schema";
import { user } from "../config/db/schema";
import { eq } from "drizzle-orm";
import { auth } from "../utils/auth";

function diasAtras(dias: number): string {
    const d = new Date();
    d.setDate(d.getDate() - dias);
    return d.toISOString().slice(0, 10);
}

const alunosSeed = [
    {
        name: "Carlos Eduardo Silva",
        email: "carlos.silva@gmail.com",
        password: "Aluno@2026!",
        perfil: {
            nome: "Carlos Eduardo Silva",
            data_nascimento: "1995-03-12",
            sexo: "M" as const,
            is_admin: true,
            peso_atual_kg: "85.50",
            altura_cm: 180,
        },
        academiaIndex: 0,
        historicoAvaliacao: [
            { diasAtrasNum: 90, peso_kg: "88.00", altura_cm: 180 },
            { diasAtrasNum: 63, peso_kg: "87.00", altura_cm: 180 },
            { diasAtrasNum: 49, peso_kg: "86.50", altura_cm: 180 },
            { diasAtrasNum: 35, peso_kg: "86.00", altura_cm: 180 },
            { diasAtrasNum: 14, peso_kg: "85.50", altura_cm: 180 },
        ],
    },
    {
        name: "Ana Beatriz Oliveira",
        email: "ana.oliveira@hotmail.com",
        password: "Aluno@2026!",
        perfil: {
            nome: "Ana Beatriz Oliveira",
            data_nascimento: "2001-08-25",
            sexo: "F" as const,
            is_admin: false,
            peso_atual_kg: "62.00",
            altura_cm: 165,
        },
        academiaIndex: 0,
        treinadorNome: "Marcos Antônio Rocha",
        historicoAvaliacao: [
            { diasAtrasNum: 60, peso_kg: "63.50", altura_cm: 165 },
            { diasAtrasNum: 30, peso_kg: "62.80", altura_cm: 165 },
            { diasAtrasNum: 7,  peso_kg: "62.00", altura_cm: 165 },
        ],
    },
    {
        name: "Rafael Mendes Costa",
        email: "rafael.costa@gmail.com",
        password: "Aluno@2026!",
        perfil: {
            nome: "Rafael Mendes Costa",
            data_nascimento: "1998-11-07",
            sexo: "M" as const,
            is_admin: false,
            peso_atual_kg: "78.20",
            altura_cm: 175,
        },
        academiaIndex: 1,
        treinadorNome: "Marcos Antônio Rocha",
        historicoAvaliacao: [
            { diasAtrasNum: 30, peso_kg: "79.50", altura_cm: 175 },
            { diasAtrasNum: 14, peso_kg: "78.80", altura_cm: 175 },
            { diasAtrasNum: 3,  peso_kg: "78.20", altura_cm: 175 },
        ],
    },
    {
        name: "Juliana Ferreira Lima",
        email: "juliana.lima@outlook.com",
        password: "Aluno@2026!",
        perfil: {
            nome: "Juliana Ferreira Lima",
            data_nascimento: "2000-06-18",
            sexo: "F" as const,
            is_admin: false,
            peso_atual_kg: "58.00",
            altura_cm: 160,
        },
        academiaIndex: 2,
        treinadorNome: "Fernanda Souza Almeida",
        historicoAvaliacao: [
            { diasAtrasNum: 28, peso_kg: "59.00", altura_cm: 160 },
            { diasAtrasNum: 14, peso_kg: "58.50", altura_cm: 160 },
            { diasAtrasNum: 2,  peso_kg: "58.00", altura_cm: 160 },
        ],
    },
    {
        name: "José Lucas Brandão Montes",
        email: "lucas.montes@ifro.edu.br",
        password: "Senha@123",
        perfil: {
            nome: "José Lucas Brandão Montes",
            data_nascimento: "1998-05-15",
            sexo: "M" as const,
            is_admin: false,
            status_conta: true,
            peso_atual_kg: "90.00",
            altura_cm: 185,
        },
        academiaIndex: 0,
        historicoAvaliacao: [
            { diasAtrasNum: 40, peso_kg: "92.00", altura_cm: 185 },
            { diasAtrasNum: 20, peso_kg: "91.00", altura_cm: 185 },
            { diasAtrasNum: 4,  peso_kg: "90.00", altura_cm: 185 },
        ],
    },
    {
        name: "Mariana Silva",
        email: "mariana.silva@email.com",
        password: "Senha@123",
        perfil: {
            nome: "Mariana Silva",
            data_nascimento: "2000-10-22",
            sexo: "F" as const,
            is_admin: false,
            peso_atual_kg: "65.00",
            altura_cm: 168,
        },
        academiaIndex: 1,
        historicoAvaliacao: [
            { diasAtrasNum: 45, peso_kg: "67.00", altura_cm: 168 },
            { diasAtrasNum: 21, peso_kg: "66.00", altura_cm: 168 },
            { diasAtrasNum: 7,  peso_kg: "65.50", altura_cm: 168 },
            { diasAtrasNum: 2,  peso_kg: "65.00", altura_cm: 168 },
        ],
    },
];

type TreinadorSeedRef = {
    id: string;
    nome: string;
};

export async function seedUsuarios(academiasIds: string[], treinadores: TreinadorSeedRef[]): Promise<string[]> {
    if (academiasIds.length === 0) throw new Error("Nenhuma academia encontrada para vincular usuários.");
    if (treinadores.length === 0) throw new Error("Nenhum treinador encontrado para vincular alunos.");

    // Criar alunos via BetterAuth 
    const alunosValues = [];
    for (const seed of alunosSeed) {
        const authUser = await auth.api.signUpEmail({
            body: { 
                name: seed.name, 
                email: seed.email, 
                password: seed.password,
                tipo: "aluno" 
            } as any,
        });
        const treinadorId = seed.treinadorNome
            ? treinadores.find((treinador) => treinador.nome === seed.treinadorNome)?.id
            : null;

        if (seed.treinadorNome && !treinadorId) {
            throw new Error(`Treinador não encontrado para o aluno ${seed.name}: ${seed.treinadorNome}`);
        }

        await DataBase.update(user).set({ emailVerified: true }).where(eq(user.id, authUser.user.id));

        alunosValues.push({
            user_id: authUser.user.id,
            academia_id: academiasIds[seed.academiaIndex],
            treinador_id: treinadorId,
            ...seed.perfil,
        });
    }
    const alunosCriados = await DataBase.insert(aluno).values(alunosValues).returning({ id: aluno.id, academia_id: aluno.academia_id });

    // Criar vínculos na tabela N:N aluno_academia
    const alunoAcademiaValues = alunosCriados.map(a => ({
        aluno_id: a.id,
        academia_id: a.academia_id
    }));

    if (alunoAcademiaValues.length > 0) {
        await DataBase.insert(aluno_academia).values(alunoAcademiaValues);
    }

    // Semear histórico de avaliação física (peso) para popular o gráfico de progressão
    const avaliacaoValues: {
        aluno_id: string;
        data_avaliacao: string;
        peso_kg: string;
        altura_cm: number | null;
    }[] = [];

    for (let i = 0; i < alunosSeed.length; i++) {
        const seed = alunosSeed[i];
        const alunoId = alunosCriados[i].id;
        for (const entrada of seed.historicoAvaliacao) {
            avaliacaoValues.push({
                aluno_id: alunoId,
                data_avaliacao: diasAtras(entrada.diasAtrasNum),
                peso_kg: entrada.peso_kg,
                altura_cm: entrada.altura_cm,
            });
        }
    }

    if (avaliacaoValues.length > 0) {
        await DataBase.insert(avaliacao_fisica).values(avaliacaoValues);
    }

    return alunosCriados.map((a) => a.id);
}
