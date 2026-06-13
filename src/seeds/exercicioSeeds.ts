import { DataBase } from "../config/DbConnect";
import { musculo, exercicio, exercicio_musculo, aparelho, exercicio_aparelho } from "../config/db/schema";
import { seedAparelhos } from "./aparelhoSeeds";
import type { type_grupo_muscular } from "../types/dbSchemas";
import type { enum_tipo_exercicio } from "../types/enum";

// Definição dos músculos

const MUSCULOS: { nome: string; grupo: type_grupo_muscular }[] = [
    // PEITO
    { nome: "Peitoral Maior",        grupo: "PEITO" },
    { nome: "Peitoral Menor",        grupo: "PEITO" },
    // COSTAS
    { nome: "Latíssimo do Dorso",    grupo: "COSTAS" },
    { nome: "Trapézio",              grupo: "COSTAS" },
    { nome: "Rombóide",              grupo: "COSTAS" },
    { nome: "Eretores da Coluna",    grupo: "COSTAS" },
    // PERNAS
    { nome: "Quadríceps",            grupo: "PERNAS" },
    { nome: "Isquiotibiais",         grupo: "PERNAS" },
    { nome: "Glúteos",               grupo: "PERNAS" },
    { nome: "Panturrilha",           grupo: "PERNAS" },
    { nome: "Adutores",              grupo: "PERNAS" },
    { nome: "Flexores do Quadril",  grupo: "PERNAS" },
    // BRAÇOS
    { nome: "Bíceps",                grupo: "BRAÇOS" },
    { nome: "Tríceps",               grupo: "BRAÇOS" },
    { nome: "Antebraço",             grupo: "BRAÇOS" },
    { nome: "Braquial",              grupo: "BRAÇOS" },
    // OMBROS
    { nome: "Deltóide Anterior",     grupo: "OMBROS" },
    { nome: "Deltóide Lateral",      grupo: "OMBROS" },
    { nome: "Deltóide Posterior",    grupo: "OMBROS" },
    // ABDOMEN
    { nome: "Abdominais",            grupo: "ABDOMEN" },
    { nome: "Oblíquos",              grupo: "ABDOMEN" },
    // PESCOÇO
    { nome: "Esternocleidomastóideo", grupo: "PESCOÇO" },
    { nome: "Escalenos",             grupo: "PESCOÇO" },
    // CARDIO
    { nome: "Sistema Cardiovascular", grupo: "CARDIO" },
];

interface ExercicioSeed {
    nome: string;
    descricao: string;
    primario: string;
    secundarios?: string[];
    aparelhos: string[];
    tipo?: enum_tipo_exercicio;
    exdbNome?: string;
}

// Mapa de exercícios locais → nome EN para busca na ExerciseDB.
// Usado por syncMidiaExerciciosLocais no ExerciseDbService.
export const EXERCICIO_EXDB_NOME: Record<string, string> = {
    // PEITO
    "Supino com Barra":                              "barbell bench press",
    "Supino Inclinado com Halter":                   "dumbbell incline bench press",
    "Supino Declinado com Barra":                    "barbell decline bench press",
    "Crucifixo com Halter":                          "dumbbell fly",
    "Crossover na Polia":                            "cable standing up straight crossovers",
    "Flexão de Braço":                               "push-up",
    "Supino na Máquina Smith":                       "smith bench press",
    // COSTAS
    "Puxada Frontal na Polia":                       "cable lat pulldown",
    "Remada Curvada com Barra":                      "barbell bent over row",
    "Remada Unilateral com Halter":                  "dumbbell bent over row",
    "Remada Sentada na Polia":                       "cable seated row",
    "Levantamento Terra com Barra":                  "barbell deadlift",
    "Pullover com Halter":                           "dumbbell pullover",
    "Encolhimento de Ombros com Barra":              "barbell shrug",
    "Barra Fixa":                                    "pull-up",
    // PERNAS
    "Agachamento com Barra":                         "barbell squat",
    "Leg Press":                                     "leg press",
    "Extensão de Pernas":                            "leg extension",
    "Flexão de Pernas":                              "leg curl",
    "Levantamento Terra com Perna Estendida com Barra": "barbell stiff leg deadlift",
    "Afundo com Halter":                             "dumbbell lunge",
    "Elevação de Panturrilha em Pé":                 "standing calf raise",
    "Agachamento Sumô com Halter":                   "smith sumo squat",
    "Elevação de Quadril com Barra":                 "barbell hip thrust",
    // BRAÇOS
    "Rosca Direta com Barra":                        "barbell biceps curl",
    "Rosca Martelo com Halter":                      "dumbbell hammer curl",
    "Rosca Concentrada com Halter":                  "dumbbell concentration curl",
    "Rosca Scott com Barra EZ":                      "barbell preacher curl",
    "Extensão de Tríceps na Polia":                  "cable triceps pushdown",
    "Tríceps Testa com Barra EZ":                    "barbell lying triceps extension skull crusher",
    "Mergulho de Tríceps":                           "body weight triceps dip",
    "Rosca com Barra EZ na Polia":                   "cable curl",
    // OMBROS
    "Desenvolvimento Militar com Barra":             "barbell military press",
    "Desenvolvimento de Ombros com Halter":          "dumbbell shoulder press",
    "Elevação Lateral com Halter":                   "dumbbell lateral raise",
    "Elevação Frontal com Halter":                   "dumbbell front raise",
    "Face Pull na Polia":                            "cable kneeling rear delt row (with rope) (male)",
    "Crucifixo Invertido com Halter":                "dumbbell reverse fly",
    "Encolhimento de Ombros com Halter":             "dumbbell shrug",
    "Elevação Lateral na Polia":                     "cable lateral raise",
    // ABDOMEN
    "Prancha":                                       "plank",
    "Abdominal Crunch":                              "crunch",
    "Elevação de Pernas Pendurado":                  "hanging leg raise",
    "Roda Abdominal":                                "standing wheel rollerout",
    "Abdominal na Polia":                            "cable kneeling crunch",
    "Prancha Lateral":                               "side plank",
    "Torção Russa com Bola Medicinal":               "assisted motion russian twist",
    "Abdominal no Banco Declinado":                  "decline crunch",
    // PESCOÇO
    "Extensão de Pescoço com Halter":                "weighted seated neck extension (with head harness)",
    "Flexão de Pescoço com Elástico":                "weighted lying neck flexion (with head harness)",
    "Inclinação Lateral de Pescoço":                 "neck side stretch",
    // PEITO (adicional)
    "Supino com Halter":                             "dumbbell bench press",
    // COSTAS (adicional)
    "Remada Alta com Barra":                         "barbell upright row",
    "Hiperextensão Lombar":                          "hyperextension",
    // PERNAS (adicional)
    "Afundo Búlgaro com Halter":                     "dumbbell bulgarian split squat",
    "Elevação de Panturrilha Sentado":               "seated calf raise",
    "Agachamento Goblet com Halter":                 "dumbbell goblet squat",
    // BRAÇOS (adicional)
    "Rosca Alternada com Halter":                    "dumbbell alternate bicep curl",
    "Extensão de Tríceps com Halter":                "dumbbell one arm tricep extension",
    "Kickback de Tríceps com Halter":                "dumbbell kickback",
    "Rosca Inversa com Barra":                       "barbell reverse biceps curl",
    // OMBROS (adicional)
    "Arnold Press com Halter":                       "dumbbell arnold press",
    "Remada Alta com Halter":                        "dumbbell upright row",
    // ABDOMEN (adicional)
    "Abdominal Bicicleta":                           "bicycle crunch",
    "Abdominal Oblíquo":                             "oblique crunch",
    "Elevação de Pernas no Chão":                    "leg raises",
    // CARDIO
    "Corrida na Esteira":                            "walking on incline treadmill",
    "Pedalar na Bicicleta Ergométrica":              "stationary bike walk",
    "Elíptico":                                      "walk elliptical cross trainer",
    "Pulo com Corda":                                "jump rope",
    "Burpee":                                        "burpee",
    "Polichinelo":                                   "jack burpee",
    "Escalador":                                     "mountain climber",
    // CARDIO (adicional)
    "Agachamento com Salto":                         "squat jump",
    "Step Up com Halter":                            "dumbbell step-up",
};

const EXERCICIOS_POR_GRUPO: Record<string, ExercicioSeed[]> = {

    // PEITO
    PEITO: [
        {
            nome: "Supino com Barra",
            descricao: "Deitado no banco reto, empurre a barra verticalmente a partir do nível do peito até os braços estendidos. Exercício composto de alta ativação de peitoral maior, com recrutamento de tríceps e deltóide anterior.",
            primario: "Peitoral Maior",
            secundarios: ["Tríceps", "Deltóide Anterior"],
            aparelhos: ["Barra Reta", "Banco Reto"],
        },
        {
            nome: "Supino Inclinado com Halter",
            descricao: "Com o banco em 30–45° de inclinação, pressione os halteres do lado do peito até a extensão total dos braços. Foca na porção superior do peitoral maior.",
            primario: "Peitoral Maior",
            secundarios: ["Tríceps", "Deltóide Anterior"],
            aparelhos: ["Halter", "Banco Inclinado"],
        },
        {
            nome: "Supino Declinado com Barra",
            descricao: "No banco declinado, pressione a barra da região inferior do peito até a extensão dos braços. Enfatiza a porção esternal do peitoral maior.",
            primario: "Peitoral Maior",
            secundarios: ["Tríceps"],
            aparelhos: ["Barra Reta", "Banco Declinado"],
        },
        {
            nome: "Crucifixo com Halter",
            descricao: "Deitado no banco reto, abra os braços em arco com leve flexão de cotovelo e eleve os halteres até a linha do peito. Movimento de isolamento para peitoral maior.",
            primario: "Peitoral Maior",
            secundarios: ["Deltóide Anterior"],
            aparelhos: ["Halter", "Banco Reto"],
        },
        {
            nome: "Crossover na Polia",
            descricao: "Em pé entre as polias altas, puxe os cabos em direção ao centro do corpo cruzando os braços à frente. Excelente isolamento com tensão contínua no peitoral.",
            primario: "Peitoral Maior",
            secundarios: ["Peitoral Menor"],
            aparelhos: ["Polia / Cabo"],
        },
        {
            nome: "Flexão de Braço",
            descricao: "Em posição de prancha com mãos no chão na largura dos ombros, desça o corpo até o peito quase tocar o chão e empurre de volta. Exercício de peso corporal para peitoral e tríceps.",
            primario: "Peitoral Maior",
            secundarios: ["Tríceps", "Deltóide Anterior"],
            aparelhos: ["Peso Corporal"],
        },
        {
            nome: "Supino na Máquina Smith",
            descricao: "Utiliza a barra guiada da Smith Machine para maior controle do movimento no supino reto. Indicado para iniciantes ou como alternativa ao supino livre.",
            primario: "Peitoral Maior",
            secundarios: ["Tríceps"],
            aparelhos: ["Máquina Smith", "Banco Reto"],
        },
        {
            nome: "Supino com Halter",
            descricao: "Deitado no banco reto, pressione os halteres do nível do peito até a extensão dos braços. Maior amplitude de movimento e ativação bilateral independente comparado ao supino com barra.",
            primario: "Peitoral Maior",
            secundarios: ["Tríceps", "Deltóide Anterior"],
            aparelhos: ["Halter", "Banco Reto"],
        },
    ],

    // COSTAS
    COSTAS: [
        {
            nome: "Puxada Frontal na Polia",
            descricao: "Sentado na máquina, puxe a barra longa em direção à clavícula com pegada larga. Exercício composto de alta ativação do latíssimo do dorso com recrutamento de bíceps.",
            primario: "Latíssimo do Dorso",
            secundarios: ["Bíceps", "Rombóide"],
            aparelhos: ["Polia / Cabo"],
        },
        {
            nome: "Remada Curvada com Barra",
            descricao: "Em posição inclinada com joelhos semiflexionados, puxe a barra em direção ao abdômen mantendo as costas retas. Exercício composto que recruta toda a musculatura das costas.",
            primario: "Latíssimo do Dorso",
            secundarios: ["Trapézio", "Rombóide", "Bíceps"],
            aparelhos: ["Barra Reta"],
        },
        {
            nome: "Remada Unilateral com Halter",
            descricao: "Apoiando um joelho e a mão no banco, puxe o halter em direção ao quadril mantendo o cotovelo próximo ao corpo. Exercício unilateral que corrige desequilíbrios entre os lados.",
            primario: "Latíssimo do Dorso",
            secundarios: ["Rombóide", "Bíceps"],
            aparelhos: ["Halter", "Banco Reto"],
        },
        {
            nome: "Remada Sentada na Polia",
            descricao: "Sentado na máquina de cabo, puxe o triângulo em direção ao abdômen mantendo os cotovelos próximos ao corpo e o tronco ereto.",
            primario: "Latíssimo do Dorso",
            secundarios: ["Rombóide", "Eretores da Coluna"],
            aparelhos: ["Polia / Cabo"],
        },
        {
            nome: "Levantamento Terra com Barra",
            descricao: "Com a barra sobre o chão, segure com as mãos na largura dos ombros e levante o peso até a posição ereta ativando cadeia posterior completa. Um dos exercícios mais completos para força funcional.",
            primario: "Eretores da Coluna",
            secundarios: ["Glúteos", "Isquiotibiais", "Trapézio"],
            aparelhos: ["Barra Reta"],
        },
        {
            nome: "Pullover com Halter",
            descricao: "Deitado transversalmente no banco, segure o halter com ambas as mãos e execute um arco desde a frente do corpo até atrás da cabeça, mantendo leve flexão de cotovelo.",
            primario: "Latíssimo do Dorso",
            secundarios: ["Peitoral Maior", "Tríceps"],
            aparelhos: ["Halter", "Banco Reto"],
        },
        {
            nome: "Encolhimento de Ombros com Barra",
            descricao: "Em pé com a barra à frente, eleve os ombros em direção às orelhas sem dobrar os cotovelos. Exercício de isolamento para trapézio superior.",
            primario: "Trapézio",
            secundarios: [],
            aparelhos: ["Barra Reta"],
        },
        {
            nome: "Barra Fixa",
            descricao: "Suspenso em uma barra fixa com pegada pronada, puxe o corpo até que o queixo ultrapasse a barra. Exercício de alto recrutamento de latíssimo e bíceps com o próprio peso corporal.",
            primario: "Latíssimo do Dorso",
            secundarios: ["Bíceps", "Rombóide"],
            aparelhos: ["Peso Corporal"],
        },
        {
            nome: "Remada Alta com Barra",
            descricao: "Em pé com a barra na frente, puxe verticalmente até a linha do queixo com os cotovelos acima dos ombros. Ativa trapézio superior, deltóides laterais e bíceps.",
            primario: "Trapézio",
            secundarios: ["Deltóide Lateral", "Bíceps"],
            aparelhos: ["Barra Reta"],
        },
        {
            nome: "Hiperextensão Lombar",
            descricao: "Apoiado no banco romano com os quadris na borda, desça o tronco e retorne à posição horizontal contraindo os eretores da coluna e glúteos. Exercício essencial para lombar.",
            primario: "Eretores da Coluna",
            secundarios: ["Glúteos", "Isquiotibiais"],
            aparelhos: ["Máquina de Alavanca"],
        },
    ],

    // PERNAS
    PERNAS: [
        {
            nome: "Agachamento com Barra",
            descricao: "Com a barra apoiada no trapézio, desça até a linha das coxas ficar paralela ao chão e retorne à posição vertical. Principal exercício para membros inferiores com alta ativação de quadríceps, glúteos e isquiotibiais.",
            primario: "Quadríceps",
            secundarios: ["Glúteos", "Isquiotibiais", "Eretores da Coluna"],
            aparelhos: ["Barra Reta"],
        },
        {
            nome: "Leg Press",
            descricao: "Sentado na máquina inclinada, posicione os pés na plataforma na largura dos ombros e empurre até a extensão dos joelhos. Versão com menor carga na coluna em comparação ao agachamento livre.",
            primario: "Quadríceps",
            secundarios: ["Glúteos", "Isquiotibiais"],
            aparelhos: ["Leg Press"],
        },
        {
            nome: "Extensão de Pernas",
            descricao: "Sentado na máquina, estenda os joelhos elevando o peso com as pernas até a posição horizontal. Exercício de isolamento para quadríceps.",
            primario: "Quadríceps",
            secundarios: [],
            aparelhos: ["Cadeira Extensora"],
        },
        {
            nome: "Flexão de Pernas",
            descricao: "Deitado em posição prona na máquina, flexione os joelhos trazendo o rolo em direção aos glúteos. Exercício de isolamento para isquiotibiais.",
            primario: "Isquiotibiais",
            secundarios: [],
            aparelhos: ["Mesa Flexora"],
        },
        {
            nome: "Levantamento Terra com Perna Estendida com Barra",
            descricao: "Em pé com a barra na frente das coxas, desça o quadril para trás mantendo as costas retas e os joelhos levemente flexionados, sentindo o alongamento nos isquiotibiais. Retorne à posição vertical ativando a cadeia posterior.",
            primario: "Isquiotibiais",
            secundarios: ["Glúteos", "Eretores da Coluna"],
            aparelhos: ["Barra Reta"],
        },
        {
            nome: "Afundo com Halter",
            descricao: "Em pé com um halter em cada mão, dê um passo à frente e desça o joelho traseiro em direção ao chão. Alterna as pernas a cada repetição. Ativa glúteos, quadríceps e trabalha equilíbrio.",
            primario: "Glúteos",
            secundarios: ["Quadríceps", "Isquiotibiais"],
            aparelhos: ["Halter"],
        },
        {
            nome: "Elevação de Panturrilha em Pé",
            descricao: "Em pé na borda de um degrau (ou na máquina específica), eleve os calcanhares o máximo possível e retorne controladamente abaixo do nível da plataforma para elongar o sóleo.",
            primario: "Panturrilha",
            secundarios: [],
            aparelhos: ["Máquina de Panturrilha"],
        },
        {
            nome: "Agachamento Sumô com Halter",
            descricao: "Com os pés em posição sumo (afastados e apontados para fora), segure um halter com ambas as mãos entre as pernas e agache até as coxas ficarem paralelas ao chão. Ativa adutores e glúteos de forma diferenciada.",
            primario: "Adutores",
            secundarios: ["Glúteos", "Quadríceps"],
            aparelhos: ["Halter"],
        },
        {
            nome: "Elevação de Quadril com Barra",
            descricao: "Apoiando a parte superior das costas em um banco, posicione a barra sobre o quadril e empurre os quadris para cima até o corpo ficar alinhado. Principal exercício para ativação máxima de glúteos.",
            primario: "Glúteos",
            secundarios: ["Isquiotibiais"],
            aparelhos: ["Barra Reta", "Banco Reto"],
        },
        {
            nome: "Afundo Búlgaro com Halter",
            descricao: "Com o pé traseiro apoiado em um banco, desça o joelho da perna dianteira até próximo ao chão e retorne. Exercício unilateral de alta ativação de quadríceps e glúteos com grande demanda de equilíbrio.",
            primario: "Quadríceps",
            secundarios: ["Glúteos", "Isquiotibiais"],
            aparelhos: ["Halter", "Banco Reto"],
        },
        {
            nome: "Elevação de Panturrilha Sentado",
            descricao: "Sentado na máquina com a almofada sobre os joelhos, eleve os calcanhares o máximo possível e desça controladamente. Exercício de isolamento com ênfase no músculo sóleo.",
            primario: "Panturrilha",
            secundarios: [],
            aparelhos: ["Máquina de Panturrilha"],
        },
        {
            nome: "Agachamento Goblet com Halter",
            descricao: "Segure um halter na vertical com ambas as mãos na frente do peito e agache profundamente mantendo o tronco ereto. Excelente para iniciantes e mobilidade de quadril.",
            primario: "Quadríceps",
            secundarios: ["Glúteos", "Adutores"],
            aparelhos: ["Halter"],
        },
    ],

    // BRAÇOS
    BRAÇOS: [
        {
            nome: "Rosca Direta com Barra",
            descricao: "Em pé com pegada supinada na barra, flexione os cotovelos elevando a barra até os ombros. Principal exercício de isolamento para bíceps.",
            primario: "Bíceps",
            secundarios: ["Braquial", "Antebraço"],
            aparelhos: ["Barra Reta"],
        },
        {
            nome: "Rosca Martelo com Halter",
            descricao: "Com os halteres em pegada neutra (polegar apontado para cima), flexione os cotovelos alternadamente. Enfatiza o braquial e a porção lateral do bíceps.",
            primario: "Braquial",
            secundarios: ["Bíceps", "Antebraço"],
            aparelhos: ["Halter"],
        },
        {
            nome: "Rosca Concentrada com Halter",
            descricao: "Sentado, apoie o cotovelo na face interna da coxa e flexione o antebraço em direção ao ombro com o halter. Exercício de alto isolamento para o pico do bíceps.",
            primario: "Bíceps",
            secundarios: [],
            aparelhos: ["Halter"],
        },
        {
            nome: "Rosca Scott com Barra EZ",
            descricao: "Com os braços apoiados no banco Scott, flexione os cotovelos trazendo a barra EZ até os ombros. Elimina o balanço do corpo e isola o bíceps.",
            primario: "Bíceps",
            secundarios: ["Braquial"],
            aparelhos: ["Barra EZ", "Banco Scott"],
        },
        {
            nome: "Extensão de Tríceps na Polia",
            descricao: "Em pé em frente à polia alta, segure a corda ou barra e estenda os cotovelos empurrando o peso para baixo. Exercício de isolamento para as três cabeças do tríceps.",
            primario: "Tríceps",
            secundarios: [],
            aparelhos: ["Polia / Cabo"],
        },
        {
            nome: "Tríceps Testa com Barra EZ",
            descricao: "Deitado no banco, segure a barra EZ com pegada fechada acima do rosto e flexione os cotovelos abaixando a barra em direção à testa. Excelente exercício de isolamento para tríceps.",
            primario: "Tríceps",
            secundarios: [],
            aparelhos: ["Barra EZ", "Banco Reto"],
        },
        {
            nome: "Mergulho de Tríceps",
            descricao: "Sentado na borda do banco com as mãos ao lado dos quadris, afaste o corpo e desça flexionando os cotovelos a 90°. Exercício de peso corporal para tríceps com o apoio das mãos no banco.",
            primario: "Tríceps",
            secundarios: ["Peitoral Menor", "Deltóide Anterior"],
            aparelhos: ["Peso Corporal", "Banco Reto"],
        },
        {
            nome: "Rosca com Barra EZ na Polia",
            descricao: "Em pé em frente à polia baixa, segure a barra EZ e flexione os cotovelos mantendo tensão constante no bíceps durante todo o movimento. A polia garante tensão mesmo na posição contraída.",
            primario: "Bíceps",
            secundarios: ["Antebraço"],
            aparelhos: ["Barra EZ", "Polia / Cabo"],
        },
        {
            nome: "Rosca Alternada com Halter",
            descricao: "Em pé ou sentado, flexione um braço de cada vez elevando o halter até o ombro em pegada supinada. Permite maior concentração em cada lado e maior amplitude de rotação do antebraço.",
            primario: "Bíceps",
            secundarios: ["Braquial", "Antebraço"],
            aparelhos: ["Halter"],
        },
        {
            nome: "Extensão de Tríceps com Halter",
            descricao: "Sentado ou em pé, segure o halter com ambas as mãos atrás da cabeça e estenda os cotovelos elevando o halter. Exercício de longa tensão para a cabeça longa do tríceps.",
            primario: "Tríceps",
            secundarios: [],
            aparelhos: ["Halter"],
        },
        {
            nome: "Kickback de Tríceps com Halter",
            descricao: "Inclinado para frente com cotovelo fixo na linha do tronco, estenda o antebraço para trás até a extensão total. Exercício de isolamento com máxima contração do tríceps.",
            primario: "Tríceps",
            secundarios: [],
            aparelhos: ["Halter"],
        },
        {
            nome: "Rosca Inversa com Barra",
            descricao: "Em pé com a barra em pegada pronada (palmas para baixo), flexione os cotovelos elevando a barra. Ativa fortemente os extensores do antebraço e a porção braquiorradial.",
            primario: "Antebraço",
            secundarios: ["Bíceps", "Braquial"],
            aparelhos: ["Barra Reta"],
        },
    ],

    // OMBROS
    OMBROS: [
        {
            nome: "Desenvolvimento Militar com Barra",
            descricao: "Em pé ou sentado, pressione a barra do nível dos ombros até a extensão total dos braços acima da cabeça. Exercício composto de alta ativação de deltóides e tríceps.",
            primario: "Deltóide Anterior",
            secundarios: ["Deltóide Lateral", "Tríceps"],
            aparelhos: ["Barra Reta"],
        },
        {
            nome: "Desenvolvimento de Ombros com Halter",
            descricao: "Sentado ou em pé, pressione alternadamente ou simultaneamente os halteres de altura dos ombros até a extensão dos braços. Maior amplitude que com barra.",
            primario: "Deltóide Anterior",
            secundarios: ["Deltóide Lateral", "Tríceps"],
            aparelhos: ["Halter"],
        },
        {
            nome: "Elevação Lateral com Halter",
            descricao: "Em pé com os braços ao longo do corpo, eleve os halteres lateralmente até a altura dos ombros com leve flexão de cotovelo. Principal isolamento de deltóide lateral.",
            primario: "Deltóide Lateral",
            secundarios: [],
            aparelhos: ["Halter"],
        },
        {
            nome: "Elevação Frontal com Halter",
            descricao: "Em pé, eleve alternadamente cada halter à frente até a linha dos ombros com o braço praticamente estendido. Isolamento de deltóide anterior.",
            primario: "Deltóide Anterior",
            secundarios: [],
            aparelhos: ["Halter"],
        },
        {
            nome: "Face Pull na Polia",
            descricao: "Puxe a corda da polia alta em direção ao rosto, mantendo os cotovelos altos e abrindo as mãos ao final do movimento. Exercício essencial para saúde do manguito rotador e deltóide posterior.",
            primario: "Deltóide Posterior",
            secundarios: ["Trapézio", "Rombóide"],
            aparelhos: ["Polia / Cabo"],
        },
        {
            nome: "Crucifixo Invertido com Halter",
            descricao: "Inclinado para frente (ou deitado em decúbito ventral), eleve os halteres lateralmente abrindo os cotovelos até a linha dos ombros. Ativa deltóide posterior e rombóides.",
            primario: "Deltóide Posterior",
            secundarios: ["Rombóide", "Trapézio"],
            aparelhos: ["Halter", "Banco Inclinado"],
        },
        {
            nome: "Encolhimento de Ombros com Halter",
            descricao: "Com um halter em cada mão ao lado do corpo, encolha os ombros verticalmente sem rodar o pescoço. Exercício de isolamento para trapézio superior.",
            primario: "Trapézio",
            secundarios: [],
            aparelhos: ["Halter"],
        },
        {
            nome: "Elevação Lateral na Polia",
            descricao: "Com a polia baixa do lado oposto ao braço de trabalho, eleve o cabo lateralmente até a altura do ombro. A polia mantém tensão constante ao longo de todo o arco.",
            primario: "Deltóide Lateral",
            secundarios: [],
            aparelhos: ["Polia / Cabo"],
        },
        {
            nome: "Arnold Press com Halter",
            descricao: "Inicie com os halteres na frente do rosto com palmas para dentro, e ao pressionar para cima gire os pulsos de modo que as palmas fiquem para fora no topo. Exercício criado por Arnold Schwarzenegger que ativa os três feixes do deltóide.",
            primario: "Deltóide Anterior",
            secundarios: ["Deltóide Lateral", "Tríceps"],
            aparelhos: ["Halter"],
        },
        {
            nome: "Remada Alta com Halter",
            descricao: "Em pé com os halteres à frente, puxe verticalmente até a linha do queixo elevando os cotovelos acima dos ombros. Alternativa unilateral à remada alta com barra com maior liberdade de movimento.",
            primario: "Trapézio",
            secundarios: ["Deltóide Lateral", "Bíceps"],
            aparelhos: ["Halter"],
        },
    ],

    // ABDOMEN
    ABDOMEN: [
        {
            nome: "Prancha",
            descricao: "Apoiado nos antebraços e pontas dos pés, mantenha o corpo rígido em posição horizontal. Exercício isométrico de core com alta ativação de abdominais, glúteos e estabilizadores.",
            primario: "Abdominais",
            secundarios: ["Glúteos", "Eretores da Coluna"],
            aparelhos: ["Peso Corporal"],
            tipo: "TEMPO",
        },
        {
            nome: "Abdominal Crunch",
            descricao: "Deitado com joelhos flexionados e pés no chão, contraia o abdômen elevando a parte superior das costas. Exercício clássico de isolamento para abdominais.",
            primario: "Abdominais",
            secundarios: [],
            aparelhos: ["Peso Corporal"],
        },
        {
            nome: "Elevação de Pernas Pendurado",
            descricao: "Suspenso em uma barra ou suporte de cotovelo, eleve as pernas esticadas (ou joelhos dobrados) até a linha dos quadris ou acima. Alto nível de ativação do reto abdominal inferior.",
            primario: "Abdominais",
            secundarios: ["Flexores do Quadril"],
            aparelhos: ["Peso Corporal"],
        },
        {
            nome: "Roda Abdominal",
            descricao: "Ajoelhado com a roda no chão, estenda o corpo para frente rolando a roda até o limite do controle, e retorne contraindo o core. Exercício avançado de alta intensidade para toda a musculatura do core.",
            primario: "Abdominais",
            secundarios: ["Eretores da Coluna", "Latíssimo do Dorso"],
            aparelhos: ["Roda Abdominal"],
        },
        {
            nome: "Abdominal na Polia",
            descricao: "Ajoelhado de costas para a polia alta, segure a corda atrás da cabeça e curve o tronco para baixo contraindo o abdômen. Permite adicionar carga progressiva ao movimento.",
            primario: "Abdominais",
            secundarios: [],
            aparelhos: ["Polia / Cabo"],
        },
        {
            nome: "Prancha Lateral",
            descricao: "Apoiado em um antebraço e a borda lateral do pé, mantenha o corpo alinhado lateralmente. Exercício isométrico para oblíquos e estabilizadores laterais.",
            primario: "Oblíquos",
            secundarios: ["Abdominais"],
            aparelhos: ["Peso Corporal"],
            tipo: "TEMPO",
        },
        {
            nome: "Torção Russa com Bola Medicinal",
            descricao: "Sentado com joelhos semiflexionados e tronco inclinado, segure a bola medicinal e gire o tronco alternando os lados. Trabalha oblíquos com resistência.",
            primario: "Oblíquos",
            secundarios: ["Abdominais"],
            aparelhos: ["Bola Medicinal"],
        },
        {
            nome: "Abdominal no Banco Declinado",
            descricao: "Deitado no banco declinado com os pés presos, eleve o tronco em direção aos joelhos com amplitude completa de movimento. Maior amplitude que o crunch no chão.",
            primario: "Abdominais",
            secundarios: ["Oblíquos"],
            aparelhos: ["Banco Declinado"],
        },
        {
            nome: "Abdominal Bicicleta",
            descricao: "Deitado com mãos atrás da cabeça, alterne levar cada cotovelo ao joelho oposto enquanto estende a perna contrária. Um dos exercícios mais eficazes para ativação de abdominais e oblíquos simultaneamente.",
            primario: "Abdominais",
            secundarios: ["Oblíquos", "Flexores do Quadril"],
            aparelhos: ["Peso Corporal"],
        },
        {
            nome: "Abdominal Oblíquo",
            descricao: "Deitado com joelhos dobrados e os dois lados do quadril rotacionados para um lado, execute o crunch em direção ao joelho superior. Isolamento direto do oblíquo.",
            primario: "Oblíquos",
            secundarios: ["Abdominais"],
            aparelhos: ["Peso Corporal"],
        },
        {
            nome: "Elevação de Pernas no Chão",
            descricao: "Deitado com as costas no chão e as mãos sob o lombar, eleve as pernas estendidas até 90° e desça controladamente sem tocar o chão. Trabalha reto abdominal inferior e flexores do quadril.",
            primario: "Abdominais",
            secundarios: ["Flexores do Quadril"],
            aparelhos: ["Peso Corporal"],
        },
    ],

    // PESCOÇO
    PESCOÇO: [
        {
            nome: "Extensão de Pescoço com Elástico",
            descricao: "Com o elástico preso à testa, empurre a cabeça para trás contra a resistência e retorne controladamente. Fortalece os extensores do pescoço.",
            primario: "Esternocleidomastóideo",
            secundarios: ["Escalenos"],
            aparelhos: ["Elástico / Faixa"],
        },
        {
            nome: "Flexão de Pescoço com Elástico",
            descricao: "Com o elástico preso atrás da cabeça, dobre o pescoço trazendo o queixo em direção ao peito contra a resistência. Fortalece os flexores cervicais.",
            primario: "Esternocleidomastóideo",
            secundarios: [],
            aparelhos: ["Elástico / Faixa"],
        },
        {
            nome: "Inclinação Lateral de Pescoço",
            descricao: "Com o elástico na lateral da cabeça, incline o pescoço em direção ao ombro contra a resistência. Fortalece os escalenos e o esternocleidomastóideo lateralmente.",
            primario: "Escalenos",
            secundarios: ["Esternocleidomastóideo"],
            aparelhos: ["Elástico / Faixa"],
        },
        {
            nome: "Extensão de Pescoço com Halter",
            descricao: "Deitado em posição prona ou sentado inclinado, segure o halter na parte posterior da cabeça e estenda o pescoço. Exercício com carga para extensores cervicais.",
            primario: "Esternocleidomastóideo",
            secundarios: ["Trapézio"],
            aparelhos: ["Halter"],
        },
        {
            nome: "Rotação Isométrica de Pescoço",
            descricao: "Com a mão apoiada na lateral da cabeça, crie resistência manual ao tentar girar o pescoço sem deixá-lo se mover. Exercício isométrico para estabilização cervical.",
            primario: "Esternocleidomastóideo",
            secundarios: ["Escalenos"],
            aparelhos: ["Peso Corporal"],
        },
    ],

    // CARDIO
    CARDIO: [
        {
            nome: "Corrida na Esteira",
            descricao: "Corrida em velocidade e inclinação programáveis. Exercício aeróbico de alta eficácia para saúde cardiovascular, queima calórica e resistência.",
            primario: "Sistema Cardiovascular",
            secundarios: [],
            aparelhos: ["Esteira"],
            tipo: "DISTANCIA",
        },
        {
            nome: "Pedalar na Bicicleta Ergométrica",
            descricao: "Pedalada contínua em bicicleta estacionária. Exercício aeróbico de baixo impacto ideal para iniciantes, indivíduos com problemas articulares e recuperação ativa.",
            primario: "Sistema Cardiovascular",
            secundarios: ["Quadríceps", "Isquiotibiais"],
            aparelhos: ["Bicicleta Ergométrica"],
            tipo: "DISTANCIA",
        },
        {
            nome: "Elíptico",
            descricao: "Movimento elíptico que simula corrida sem impacto nos joelhos e tornozelos. Combina trabalho de membros superiores e inferiores de forma suave.",
            primario: "Sistema Cardiovascular",
            secundarios: [],
            aparelhos: ["Elíptico"],
            tipo: "DISTANCIA",
        },
        {
            nome: "Pulo com Corda",
            descricao: "Saltos contínuos sobre a corda girada pelos próprios braços. Exercício aeróbico de alta intensidade que melhora coordenação, equilíbrio e capacidade cardiorrespiratória.",
            primario: "Sistema Cardiovascular",
            secundarios: ["Panturrilha"],
            aparelhos: ["Corda de Pular"],
            tipo: "TEMPO",
        },
        {
            nome: "Burpee",
            descricao: "Sequência: flexão → posição de prancha → salto com os pés até os braços → salto vertical com palmas acima da cabeça. Exercício de alta intensidade que combina força e cardio.",
            primario: "Sistema Cardiovascular",
            secundarios: ["Quadríceps", "Peitoral Maior", "Tríceps"],
            aparelhos: ["Peso Corporal"],
        },
        {
            nome: "Polichinelo",
            descricao: "Salte abrindo as pernas e levando os braços acima da cabeça simultaneamente, depois retorne à posição inicial. Exercício aeróbico de aquecimento e condicionamento.",
            primario: "Sistema Cardiovascular",
            secundarios: [],
            aparelhos: ["Peso Corporal"],
        },
        {
            nome: "Escalador",
            descricao: "Em posição de prancha alta, alterne rapidamente os joelhos em direção ao peito simulando uma corrida no chão. Combina trabalho de core, quadríceps e sistema cardiovascular.",
            primario: "Sistema Cardiovascular",
            secundarios: ["Abdominais", "Quadríceps"],
            aparelhos: ["Peso Corporal"],
            tipo: "TEMPO",
        },
        {
            nome: "Agachamento com Salto",
            descricao: "Execute um agachamento completo e ao subir realize um salto explosivo, aterrissando suavemente voltando ao agachamento. Exercício pliométrico que combina força de quadríceps com potência cardiovascular.",
            primario: "Sistema Cardiovascular",
            secundarios: ["Quadríceps", "Glúteos"],
            aparelhos: ["Peso Corporal"],
        },
        {
            nome: "Step Up com Halter",
            descricao: "Segurando halteres, suba alternando os pés em um banco ou caixa de altura moderada. Exercício funcional que melhora força unilateral de pernas e capacidade aeróbica.",
            primario: "Sistema Cardiovascular",
            secundarios: ["Quadríceps", "Glúteos"],
            aparelhos: ["Halter", "Banco Reto"],
        },
    ],
};

// Funções auxiliares

function buildMusculoMap(ids: { id: string; nome: string }[]): Map<string, string> {
    return new Map(ids.map((m) => [m.nome, m.id]));
}

// Seeds principais

export async function seedExercicios(): Promise<string[]> {
    // 1. Inserir músculos
    const musculosCriados = await DataBase
        .insert(musculo)
        .values(MUSCULOS.map((m) => ({ nome: m.nome, grupo_muscular: m.grupo })))
        .returning({ id: musculo.id, nome: musculo.nome });

    const musculoMap = buildMusculoMap(musculosCriados);

    // 2. Inserir aparelhos (retorna mapa nome→id)
    const aparelhoMap = await seedAparelhos();

    // 3. Inserir exercícios grupo a grupo
    const exercicioIdsTodos: string[] = [];

    for (const exerciciosDefs of Object.values(EXERCICIOS_POR_GRUPO)) {
        const nomes = exerciciosDefs.map((e) => ({
            nome: e.nome,
            descricao: e.descricao,
            aluno_id: null,
            tipo_exercicio: e.tipo ?? "REPETICAO",
        }));

        const criados = await DataBase
            .insert(exercicio)
            .values(nomes)
            .returning({ id: exercicio.id, nome: exercicio.nome });

        const idPorNome = new Map(criados.map((c) => [c.nome, c.id]));

        // 4. Vincular músculos
        const vinculosMusculo: {
            exercicio_id: string;
            musculo_id: string;
            tipo_ativacao: "PRIMARIO" | "SECUNDARIO";
        }[] = [];

        for (const def of exerciciosDefs) {
            const exId = idPorNome.get(def.nome);
            if (!exId) continue;

            const primId = musculoMap.get(def.primario);
            if (primId) vinculosMusculo.push({ exercicio_id: exId, musculo_id: primId, tipo_ativacao: "PRIMARIO" });

            for (const sec of def.secundarios ?? []) {
                const secId = musculoMap.get(sec);
                if (secId) vinculosMusculo.push({ exercicio_id: exId, musculo_id: secId, tipo_ativacao: "SECUNDARIO" });
            }
        }

        if (vinculosMusculo.length > 0) {
            await DataBase.insert(exercicio_musculo).values(vinculosMusculo);
        }

        // 5. Vincular aparelhos
        const vinculosAparelho: { exercicio_id: string; aparelho_id: string }[] = [];

        for (const def of exerciciosDefs) {
            const exId = idPorNome.get(def.nome);
            if (!exId) continue;

            for (const apNome of def.aparelhos) {
                const apId = aparelhoMap[apNome];
                if (apId) vinculosAparelho.push({ exercicio_id: exId, aparelho_id: apId });
            }
        }

        if (vinculosAparelho.length > 0) {
            await DataBase.insert(exercicio_aparelho).values(vinculosAparelho);
        }

        exercicioIdsTodos.push(...criados.map((c) => c.id));
    }

    return exercicioIdsTodos;
}

// Exercícios pessoais — requer IDs de alunos já inseridos.
export async function seedExerciciosPessoais(alunoIds: string[]): Promise<void> {
    if (alunoIds.length === 0) return;

    await DataBase.insert(exercicio).values([
        {
            nome: "Supino Inclinado Personalizado",
            descricao: "Variação pessoal do supino inclinado com pegada mais fechada para maior ênfase na porção superior do peitoral.",
            aluno_id: alunoIds[0],
        },
        {
            nome: "Agachamento Búlgaro Adaptado",
            descricao: "Versão adaptada do agachamento búlgaro com apoio no banco ajustado para compensar limitação de mobilidade de tornozelo.",
            aluno_id: alunoIds[0],
        },
    ]);
}
