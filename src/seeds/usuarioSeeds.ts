import { DataBase } from "../config/DbConnect";
import { aluno, treinador } from "../config/db/schema";
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
];

const treinadoresSeed = [
    {
        name: "Marcos Antônio Rocha",
        email: "marcos.rocha@personalfit.com",
        password: "Treinador@2026!",
        perfil: {
            nome: "Marcos Antônio Rocha",
            data_nascimento: "1985-01-20",
            sexo: "M" as const,
            cref: "012345-G/RO",
            turnos: ["MANHA", "TARDE"] as ("MANHA" | "TARDE" | "NOITE")[],
            especializacao: "Hipertrofia e Força",
            graduacao: "Educação Física - Bacharel",
            is_admin: true,
        },
        academiaIndex: 0,
    },
    {
        name: "Fernanda Souza Almeida",
        email: "fernanda.almeida@personalfit.com",
        password: "Treinador@2026!",
        perfil: {
            nome: "Fernanda Souza Almeida",
            data_nascimento: "1990-09-14",
            sexo: "F" as const,
            cref: "067890-G/RO",
            turnos: ["TARDE", "NOITE"] as ("MANHA" | "TARDE" | "NOITE")[],
            especializacao: "Emagrecimento e Condicionamento",
            graduacao: "Educação Física - Licenciatura",
            is_admin: false,
        },
        academiaIndex: 1,
    },
];

export async function seedUsuarios(academiasIds: string[]): Promise<string[]> {
    if (academiasIds.length === 0) throw new Error("Nenhuma academia encontrada para vincular usuários.");

    // Criando usuários de auth e perfis de alunos
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

    // Criando usuários de auth e perfis de treinadores
    const treinadoresValues = [];
    for (const seed of treinadoresSeed) {
        const authUser = await auth.api.signUpEmail({
            body: { name: seed.name, email: seed.email, password: seed.password },
        });
        treinadoresValues.push({
            user_id: authUser.user.id,
            academia_id: academiasIds[seed.academiaIndex],
            ...seed.perfil,
        });
    }

    await DataBase.insert(treinador).values(treinadoresValues);

    return alunosCriados.map(a => a.id);
}