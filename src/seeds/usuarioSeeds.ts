import { DataBase } from "../config/DbConnect";
import { aluno, treinador } from "../config/db/schema";

export async function seedUsuarios(academiasIds: string[]): Promise<string[]> {
    if (academiasIds.length === 0) throw new Error("Nenhuma academia encontrada para vincular usuários.");

    // Criando Alunos vinculados às academias
    const alunosCriados = await DataBase.insert(aluno).values([
        {
            nome: "José Lucas Brandão Montes",
            email: "lucas.montes@ifro.edu.br",
            senha: "senha_hasheada_123", // TODO: Configurar hashing de senhas
            data_nascimento: "1998-05-15",
            sexo: "M",
            academia_id: academiasIds[0],
            status_conta: true
        },
        {
            nome: "Mariana Silva",
            email: "mariana.silva@email.com",
            senha: "senha_hasheada_123",
            data_nascimento: "2000-10-22",
            sexo: "F",
            academia_id: academiasIds[1]
        }
    ]).returning({ id: aluno.id });

    // Criando um Treinador
    await DataBase.insert(treinador).values([
        {
            nome: "Paulo Muzy",
            email: "paulo.muzy@ironberg.com",
            senha: "senha_hasheada_123",
            data_nascimento: "1979-07-16",
            sexo: "M",
            cref: "123456-G/SP",
            turnos: ["MANHA", "TARDE"],
            especializacao: "Hipertrofia e Emagrecimento",
            graduacao: "Educação Física - Bacharel",
            academia_id: academiasIds[1]
        }
    ]);

    return alunosCriados.map(a => a.id);
}