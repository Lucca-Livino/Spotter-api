import { DataBase } from "../config/DbConnect";
import { musculo, exercicio, exercicio_musculo } from "../config/db/schema";

export async function seedExercicios(): Promise<string[]> {
    // 1. Inserir Músculos
    const musculosCriados = await DataBase.insert(musculo).values([
        { nome: "Peitoral Maior", grupo_muscular: "PEITO" },
        { nome: "Tríceps Braquial", grupo_muscular: "BRAÇOS" },
        { nome: "Quadríceps", grupo_muscular: "PERNAS" },
        { nome: "Deltóide Anterior", grupo_muscular: "OMBROS" },
    ]).returning({ id: musculo.id });

    // 2. Inserir Exercícios Globais (aluno_id = NULL — disponíveis para todos)
    const exerciciosCriados = await DataBase.insert(exercicio).values([
        { nome: "Supino Reto com Barra", descricao: "Exercício clássico de peito com barra." },
        { nome: "Tríceps Testa", descricao: "Exercício isolador para tríceps." },
        { nome: "Agachamento Livre", descricao: "Exercício composto para membros inferiores." },
        { nome: "Desenvolvimento com Halteres", descricao: "Exercício para deltóides com halteres." },
    ]).returning({ id: exercicio.id });

    // 3. Criar o vínculo N:M (Exercicio x Musculo)
    await DataBase.insert(exercicio_musculo).values([
        {
            exercicio_id: exerciciosCriados[0].id, // Supino Reto
            musculo_id: musculosCriados[0].id,     // Peitoral Maior
            tipo_ativacao: "PRIMARIO"
        },
        {
            exercicio_id: exerciciosCriados[0].id, // Supino Reto recruta Tríceps
            musculo_id: musculosCriados[1].id,     // Tríceps Braquial
            tipo_ativacao: "SECUNDARIO"
        },
        {
            exercicio_id: exerciciosCriados[2].id, // Agachamento
            musculo_id: musculosCriados[2].id,     // Quadríceps
            tipo_ativacao: "PRIMARIO"
        },
        {
            exercicio_id: exerciciosCriados[3].id, // Desenvolvimento
            musculo_id: musculosCriados[3].id,     // Deltóide Anterior
            tipo_ativacao: "PRIMARIO"
        },
    ]);

    return exerciciosCriados.map(e => e.id);
}

// Seed de exercícios pessoais (requer IDs de alunos já inseridos).
// Exercícios pessoais possuem aluno_id preenchido e são visíveis apenas para o dono.
export async function seedExerciciosPessoais(alunoIds: string[]): Promise<void> {
    if (alunoIds.length === 0) return;

    await DataBase.insert(exercicio).values([
        {
            nome: "Supino Inclinado Personalizado",
            descricao: "Variação pessoal do supino inclinado com pegada mais fechada.",
            aluno_id: alunoIds[0],
        },
        {
            nome: "Agachamento Búlgaro Adaptado",
            descricao: "Versão adaptada do agachamento búlgaro com apoio no banco.",
            aluno_id: alunoIds[0],
        },
    ]);
}