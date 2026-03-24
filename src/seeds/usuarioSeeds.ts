import { DataBase } from "../config/DbConnect";
import { aluno } from "../config/db/schema";
import { auth } from "../utils/auth";

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
        },
        academiaIndex: 0,
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
        },
        academiaIndex: 0,
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
        },
        academiaIndex: 1,
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
        },
        academiaIndex: 2,
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
        },
        academiaIndex: 0,
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
        },
        academiaIndex: 1,
    },
];

export async function seedUsuarios(academiasIds: string[]): Promise<string[]> {
    if (academiasIds.length === 0) throw new Error("Nenhuma academia encontrada para vincular usuários.");

    // Criar alunos via BetterAuth 
    const alunosValues = [];
    for (const seed of alunosSeed) {
        const authUser = await auth.api.signUpEmail({
            body: { name: seed.name, email: seed.email, password: seed.password },
        });
        alunosValues.push({
            user_id: authUser.user.id,
            academia_id: academiasIds[seed.academiaIndex],
            ...seed.perfil,
        });
    }
    const alunosCriados = await DataBase.insert(aluno).values(alunosValues).returning({ id: aluno.id });

    return alunosCriados.map((a) => a.id);
}

