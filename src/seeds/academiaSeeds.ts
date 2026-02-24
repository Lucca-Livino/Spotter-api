import { DataBase } from "../config/DbConnect";
import { academia } from "../config/db/schema";

export async function seedAcademias(): Promise<number[]> {
    const novasAcademias = [
        {
            nome: "Engenharia do Corpo",
            endereco_numero: "222",
            endereco_rua: "R. Getúlio Vargas",
            endereco_bairro: "Centro",
            endereco_cidade: "Vilhena",
            endereco_estado: "RO"
        },
        {
            nome: "Bem Estar",
            endereco_numero: "949",
            endereco_rua: "Av. Brigadeiro Eduardo Gomes",
            endereco_bairro: "Jardim Eldorado",
            endereco_cidade: "Vilhena",
            endereco_estado: "RO"
        },
        {
            nome: "W FIT",
            endereco_numero: "4321",
            endereco_rua: "Av. Arquiteto Elis Arruda",
            endereco_bairro: "Cidade Verde IIII",
            endereco_cidade: "Vilhena",
            endereco_estado: "RO",
        },
        {
            nome: "Saúde do Corpo",
            endereco_numero: "3886",
            endereco_rua: "Av. Curitiba",
            endereco_bairro: "Jardim das Oliveiras",
            endereco_cidade: "Vilhena",
            endereco_estado: "RO",
        },
        {
            nome: "Olympia",
            endereco_numero: "3822",
            endereco_rua: "Av. Campos Elísio",
            endereco_bairro: "Cidade Verde III",
            endereco_cidade: "Vilhena",
            endereco_estado: "RO",
        },
        {
            nome: "MovFit",
            endereco_numero: "4661 - 2º Andar",
            endereco_rua: "Av. Major Amarante",
            endereco_bairro: "Centro",
            endereco_cidade: "Vilhena",
            endereco_estado: "RO",
        },
        {
            nome: "Sky Fit",
            endereco_numero: "1529",
            endereco_rua: "Av. Presidente Nasser",
            endereco_bairro: "Jardim das Oliveiras",
            endereco_cidade: "Vilhena",
            endereco_estado: "RO",
        },
        {
            nome: "Superação",
            endereco_numero: "1312",
            endereco_rua: "Av. Jô Sato",
            endereco_bairro: "Bela Vista",
            endereco_cidade: "Vilhena",
            endereco_estado: "RO",
        },
        {
            nome: "Atmus",
            endereco_numero: "405",
            endereco_rua: "R. Júlio Kzyzanoski",
            endereco_bairro: "Jardim Eldorado",
            endereco_cidade: "Vilhena",
            endereco_estado: "RO",
        },
        {
            nome: "Power Zona sul",
            endereco_numero: "4661 - 2º Andar",
            endereco_rua: "Av. Major Amarante",
            endereco_bairro: "Centro",
            endereco_cidade: "Vilhena",
            endereco_estado: "RO",
        },
        {
            nome: "W Fit Cristo Rei",
            endereco_numero: "992",
            endereco_rua: "Av. Melvin Jones",
            endereco_bairro: "Green Ville",
            endereco_cidade: "Vilhena",
            endereco_estado: "RO",
        }
    ];

    // Fazemos a inserção e retornamos os registros criados
    const academiasCriadas = await DataBase.insert(academia)
        .values(novasAcademias)
        .returning({ id: academia.id });

    // Retorna um array apenas com os IDs [1, 2] para usarmos nos alunos
    return academiasCriadas.map(a => a.id);
}