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
            peso_atual_kg: "85.50",
            altura_m: "1.80",
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
            peso_atual_kg: "62.00",
            altura_m: "1.65",
        },
        academiaIndex: 0,
        treinadorNome: "Marcos Antônio Rocha",
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
            altura_m: "1.75",
        },
        academiaIndex: 1,
        treinadorNome: "Marcos Antônio Rocha",
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
            altura_m: "1.60",
        },
        academiaIndex: 2,
        treinadorNome: "Fernanda Souza Almeida",
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
            altura_m: "1.85",
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
            peso_atual_kg: "65.00",
            altura_m: "1.68",
        },
        academiaIndex: 1,
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

        alunosValues.push({
            user_id: authUser.user.id,
            academia_id: academiasIds[seed.academiaIndex],
            treinador_id: treinadorId,
            ...seed.perfil,
        });
    }
    const alunosCriados = await DataBase.insert(aluno).values(alunosValues).returning({ id: aluno.id });

    return alunosCriados.map((a) => a.id);
}
