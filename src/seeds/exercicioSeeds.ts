import { DataBase } from "../config/DbConnect";
import { musculo, exercicio, exercicio_musculo } from "../config/db/schema";

export async function seedExercicios(): Promise<void> {
    // 1. Inserir Músculos
    const musculosCriados = await DataBase.insert(musculo).values([
        { nome: "Peitoral Maior", grupo_muscular: "PEITO" },
        { nome: "Tríceps Braquial", grupo_muscular: "BRAÇOS" }
    ]).returning({ id: musculo.id });

    // 2. Inserir Exercícios
    const exerciciosCriados = await DataBase.insert(exercicio).values([
        { nome: "Supino Reto com Barra", descricao: "Exercício clássico de peito com barra." },
        { nome: "Tríceps Testa", descricao: "Exercício isolador para tríceps." }
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
        }
    ]);
}