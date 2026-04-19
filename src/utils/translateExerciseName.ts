// Tradução EN→PT-BR para nomes de exercícios da ExerciseDB v2.
//
// Estratégia em duas camadas:
// 1. Dicionário de frases exatas (lookup O(1), resultado garantido).
// 2. Tradução por tokens: extrai equipamento do início do nome, aplica
//    substituições ordenadas pelo mais longo ao mais curto, e reposiciona
//    o equipamento no final (padrão PT-BR).

// ─── 1. Dicionário de frases exatas ─────────────────────────────────────────

const FRASES_EXATAS: Record<string, string> = {
    "3/4 sit-up": "Abdominal 3/4",
    "45° side bend": "Flexão Lateral a 45°",
    "air bike": "Bicicleta no Ar",
    "alternate heel touchers": "Toque Alternado nos Calcanhares",
    "alternate lateral pulldown": "Puxada Lateral Alternada",
    "assisted chest dip (kneeling)": "Mergulho no Peitoral Assistido (ajoelhado)",
    "assisted hanging knee raise": "Elevação de Joelhos Pendurado Assistida",
    "assisted hanging knee raise with throw down": "Elevação de Joelhos Pendurado Assistida com Descida",
    "assisted lying leg raise with lateral throw down": "Elevação de Pernas Deitado Assistida com Descida Lateral",
    "assisted lying leg raise with throw down": "Elevação de Pernas Deitado Assistida com Descida",
    "assisted motion russian twist": "Torção Russa com Movimento Assistido",
    "assisted parallel close grip pull-up": "Barra Fixa Assistida com Pegada Fechada Paralela",
    "assisted prone hamstring": "Flexão de Posterior de Coxa Assistida (em Prono)",
    "assisted pull-up": "Barra Fixa Assistida",
    "assisted standing triceps extension (with towel)": "Extensão de Tríceps em Pé Assistida (com Toalha)",
    "assisted triceps dip (kneeling)": "Mergulho de Tríceps Assistido (ajoelhado)",
    "balance board": "Prancha de Equilíbrio",
    "push-up": "Flexão de Braço",
    "push up": "Flexão de Braço",
    "pull-up": "Barra Fixa",
    "pull up": "Barra Fixa",
    "chin-up": "Barra Supinada",
    "chin up": "Barra Supinada",
    "dip": "Mergulho",
    "plank": "Prancha",
    "crunch": "Abdominal Crunch",
    "sit-up": "Abdominal",
    "sit up": "Abdominal",
    "burpee": "Burpee",
    "jumping jack": "Polichinelo",
    "mountain climber": "Escalador",
    "russian twist": "Torção Russa",
    "hip thrust": "Elevação de Quadril",
    "glute bridge": "Ponte de Glúteo",
    "dead bug": "Inseto Morto",
    "bird dog": "Bird Dog",
    "superman": "Super-Homem",
    "good morning": "Bom Dia",
    "barbell bench front squat": "Agachamento no Banco Frontal com Barra",
    "barbell clean-grip front squat": "Agachamento Frontal com Pegada Olímpica com Barra",
    "barbell pullover to press": "Pullover para Pressão com Barra",
};

// ─── 2. Prefixos de equipamento (início do nome → sufixo PT-BR) ──────────────
// Ordenados do mais longo para o mais curto para evitar match parcial.

const EQUIPAMENTO_PREFIXO: [RegExp, string][] = [
    [/^ez barbell\s+/i,       "com Barra EZ"],
    [/^ez-bar\s+/i,           "com Barra EZ"],
    [/^smith machine\s+/i,    "na Máquina Smith"],
    [/^resistance band\s+/i,  "com Elástico"],
    [/^medicine ball\s+/i,    "com Bola Medicinal"],
    [/^stability ball\s+/i,   "na Bola de Estabilidade"],
    [/^bosu ball\s+/i,        "no Bosu Ball"],
    [/^trap bar\s+/i,         "com Barra Hexagonal"],
    [/^wheel roller\s+/i,     "com Roda Abdominal"],
    [/^kettlebell\s+/i,       "com Kettlebell"],
    [/^dumbbell\s+/i,         "com Halter"],
    [/^barbell\s+/i,          "com Barra"],
    [/^cable\s+/i,            "na Polia"],
    [/^band\s+/i,             "com Elástico"],
    [/^body weight\s+/i,      ""],
    [/^bodyweight\s+/i,       ""],
    [/^weighted\s+/i,         "com Carga"],
    [/^roller\s+/i,           "com Rolo"],
    [/^rope\s+/i,             "com Corda"],
];

// ─── 3. Substituições ordenadas (mais longa primeiro) ───────────────────────

const SUBSTITUICOES: [RegExp, string][] = [
    // Movimentos multi-palavra
    [/romanian deadlift/gi,            "Levantamento Terra Romeno"],
    [/sumo deadlift/gi,                "Levantamento Terra Sumô"],
    [/stiff.?leg deadlift/gi,          "Levantamento Terra com Perna Estendida"],
    [/incline bench press/gi,           "Supino Inclinado"],
    [/decline bench press/gi,          "Supino Declinado"],
    [/overhead press/gi,               "Desenvolvimento Acima da Cabeça"],
    [/shoulder press/gi,               "Desenvolvimento de Ombros"],
    [/military press/gi,               "Desenvolvimento Militar"],
    [/arnold press/gi,                 "Desenvolvimento Arnold"],
    [/bench press/gi,                  "Supino"],
    [/bench squat/gi,                  "Agachamento no Banco"],
    [/front squat/gi,                  "Agachamento Frontal"],
    [/goblet squat/gi,                 "Agachamento Goblet"],
    [/sumo squat/gi,                   "Agachamento Sumô"],
    [/hack squat/gi,                   "Agachamento Hack"],
    [/chest press/gi,                  "Supino"],
    [/clean.?and.?jerk/gi,             "Arranco e Arremesso"],
    [/clean.?grip/gi,                  "Pegada Olímpica"],
    [/bent.?over/gi,                   "Curvado"],
    [/bent.?arm/gi,                    "Braços Dobrados"],
    [/chest fly|chest flies/gi,        "Crucifixo de Peito"],
    [/chest dip/gi,                    "Mergulho de Peito"],
    [/incline press/gi,                "Supino Inclinado"],
    [/decline press/gi,                "Supino Declinado"],
    [/leg press/gi,                    "Leg Press"],
    [/leg curl/gi,                     "Flexão de Pernas"],
    [/leg extension/gi,                "Extensão de Pernas"],
    [/leg raise/gi,                    "Elevação de Pernas"],
    [/lat pulldown/gi,                 "Puxada Frontal"],
    [/pull.?down/gi,                   "Puxada"],
    [/pull.?over/gi,                   "Pullover"],
    [/pull.?up/gi,                     "Barra Fixa"],
    [/push.?up/gi,                     "Flexão de Braço"],
    [/lateral raise/gi,                "Elevação Lateral"],
    [/front raise/gi,                  "Elevação Frontal"],
    [/rear delt raise/gi,              "Elevação de Deltóide Posterior"],
    [/calf raise/gi,                   "Elevação de Panturrilha"],
    [/heel raise/gi,                   "Elevação de Calcanhar"],
    [/hip thrust/gi,                   "Elevação de Quadril"],
    [/hip raise/gi,                    "Elevação de Quadril"],
    [/hip hinge/gi,                    "Dobradiça de Quadril"],
    [/hip abduction/gi,                "Abdução de Quadril"],
    [/hip adduction/gi,                "Adução de Quadril"],
    [/hip flexion/gi,                  "Flexão de Quadril"],
    [/hip extension/gi,                "Extensão de Quadril"],
    [/glute bridge/gi,                 "Ponte de Glúteo"],
    [/bicep curl|biceps curl/gi,       "Rosca Direta"],
    [/hammer curl/gi,                  "Rosca Martelo"],
    [/concentration curl/gi,           "Rosca Concentrada"],
    [/preacher curl/gi,                "Rosca Scott"],
    [/reverse curl/gi,                 "Rosca Inversa"],
    [/zottman curl/gi,                 "Rosca Zottman"],
    [/spider curl/gi,                  "Rosca Spider"],
    [/seated row/gi,                   "Remada Sentada"],
    [/bent.?over row/gi,               "Remada Curvada"],
    [/chest.?supported row/gi,         "Remada com Apoio no Peito"],
    [/upright row/gi,                  "Remada Alta"],
    [/face pull/gi,                    "Face Pull"],
    [/triceps? pushdown/gi,             "Extensão de Tríceps"],
    [/triceps? dip/gi,                 "Mergulho de Tríceps"],
    [/\bpushdown\b/gi,                 "Extensão"],
    [/skull crusher/gi,                "Tríceps Testa"],
    [/lying triceps? extension/gi,     "Extensão de Tríceps Deitado"],
    [/overhead triceps? extension/gi,  "Extensão de Tríceps Acima da Cabeça"],
    [/triceps? extension/gi,           "Extensão de Tríceps"],
    [/triceps? kickback/gi,            "Tríceps Coice"],
    [/russian twist/gi,                "Torção Russa"],
    [/wood chop/gi,                    "Corte de Madeira"],
    [/mountain climber/gi,             "Escalador"],
    [/jumping jack/gi,                 "Polichinelo"],
    [/high knees/gi,                   "Corrida com Elevação de Joelhos"],
    [/butt kicks/gi,                   "Chute no Glúteo"],
    [/box jump/gi,                     "Salto em Caixa"],
    [/broad jump/gi,                   "Salto em Distância"],
    [/step.?up/gi,                     "Subida em Degrau"],
    [/step.?down/gi,                   "Descida em Degrau"],
    [/sit.?up/gi,                      "Abdominal Completo"],
    [/side bend/gi,                    "Flexão Lateral"],
    [/side plank/gi,                   "Prancha Lateral"],
    [/dead bug/gi,                     "Inseto Morto"],
    [/bird dog/gi,                     "Bird Dog"],
    [/good morning/gi,                 "Bom Dia"],
    [/back extension/gi,               "Extensão de Lombar"],
    [/hyperextension/gi,               "Hiperextensão de Lombar"],
    [/reverse fly/gi,                  "Crucifixo Invertido"],
    [/deadlift/gi,                     "Levantamento Terra"],
    [/squat/gi,                        "Agachamento"],
    [/lunge/gi,                        "Afundo"],
    [/shrug/gi,                        "Encolhimento de Ombros"],
    [/crunch/gi,                       "Abdominal Crunch"],
    [/plank/gi,                        "Prancha"],
    [/superman/gi,                     "Super-Homem"],
    // Movimentos simples
    [/\bcurl\b/gi,                     "Rosca"],
    [/\brow\b/gi,                      "Remada"],
    [/\bpress\b/gi,                    "Pressão"],
    [/\bfly\b/gi,                      "Crucifixo"],
    [/\bdip\b/gi,                      "Mergulho"],
    [/\btwist\b/gi,                    "Torção"],
    [/\bextension\b/gi,                "Extensão"],
    [/\bflexion\b/gi,                  "Flexão"],
    [/\braise\b/gi,                    "Elevação"],
    [/\bswing\b/gi,                    "Balanço"],
    [/\bsnatch\b/gi,                   "Arranco"],
    [/\bclean\b/gi,                    "Arremesso"],
    [/\bwalk\b/gi,                     "Caminhada"],
    [/\bjump\b/gi,                     "Salto"],
    [/\bkick\b/gi,                     "Chute"],
    // Modificadores
    [/\bassisted\b/gi,                 "Assistido"],
    [/\binclined?\b/gi,                "Inclinado"],
    [/\bdeclined?\b/gi,                "Declinado"],
    [/\bseated\b/gi,                   "Sentado"],
    [/\bstanding\b/gi,                 "em Pé"],
    [/\blying\b/gi,                    "Deitado"],
    [/\bprone\b/gi,                    "em Prono"],
    [/\bhanging\b/gi,                  "Pendurado"],
    [/\bkneeling\b/gi,                 "Ajoelhado"],
    [/\bparallel\b/gi,                 "Paralelo"],
    [/\bflat\b/gi,                     "Reto"],
    [/\breverse\b/gi,                  "Invertido"],
    [/\balternate[d]?\b/gi,            "Alternado"],
    [/\bunilateral\b/gi,               "Unilateral"],
    [/\bbilateral\b/gi,                "Bilateral"],
    [/\bsingle.?arm\b/gi,              "Um Braço"],
    [/\bone.?arm\b/gi,                 "Um Braço"],
    [/\bsingle.?leg\b/gi,              "Uma Perna"],
    [/\boverhead\b/gi,                 "Acima da Cabeça"],
    [/\bcrossover\b/gi,                "Crossover"],
    [/\bclose.?grip\b/gi,              "Pegada Fechada"],
    [/\bwide.?grip\b/gi,               "Pegada Aberta"],
    [/\boverhand\b/gi,                 "Pegada Pronada"],
    [/\bunderhand\b/gi,                "Pegada Supinada"],
    [/\bfront\b/gi,                    "Frontal"],
    [/\bbench\b/gi,                    "no Banco"],
    [/\bgrip\b/gi,                     "Pegada"],
    [/\bbent\b/gi,                     "Curvado"],
    [/\blifting\b/gi,                  "Levantamento"],
    [/\bfull\b/gi,                     "Completo"],
    [/narrow\s+stance/gi,              "Posição Fechada"],
    [/wide\s+stance/gi,                "Posição Aberta"],
    [/\bstance\b/gi,                   "Posição"],
    [/\bnarrow\b/gi,                   "Fechado"],
    [/\bfloor\b/gi,                    "no Chão"],
    [/\bto skull\b/gi,                 "Tríceps Testa"],
    [/\binverted[- ]grip\b/gi,         "Pegada Invertida"],
    [/\binverted\b/gi,                 "Invertido"],
    [/\bwith\b/gi,                     "com"],
    [/\bwithout\b/gi,                  "sem"],
    [/\bon\b/gi,                       "no"],
    [/\bthe\b/gi,                      ""],
    [/\band\b/gi,                      "e"],
    // Partes do corpo
    [/\bchest\b/gi,                    "Peitoral"],
    [/\bshoulder[s]?\b/gi,             "Ombros"],
    [/\bbicep[s]?\b/gi,                "Bíceps"],
    [/\btricep[s]?\b/gi,               "Tríceps"],
    [/\bhamstring[s]?\b/gi,            "Isquiotibiais"],
    [/\bquad[s]?\b/gi,                 "Quadríceps"],
    [/\bglute[s]?\b/gi,                "Glúteos"],
    [/\bcalf|calves\b/gi,              "Panturrilha"],
    [/\bforearm[s]?\b/gi,              "Antebraço"],
    [/\bwrist[s]?\b/gi,                "Pulso"],
    [/\bneck\b/gi,                     "Pescoço"],
    [/\bcore\b/gi,                     "Core"],
    [/\blat[s]?\b/gi,                  "Dorsal"],
    [/\btrap[s]?\b/gi,                 "Trapézio"],
    [/\bhip[s]?\b/gi,                  "Quadril"],
    [/\bleg[s]?\b/gi,                  "Pernas"],
    [/\barm[s]?\b/gi,                  "Braços"],
    [/\bknee[s]?\b/gi,                 "Joelho"],
    [/\belbow[s]?\b/gi,                "Cotovelo"],
    [/\bankle[s]?\b/gi,                "Tornozelo"],
    [/\bheel[s]?\b/gi,                 "Calcanhar"],
    [/\bspine\b/gi,                    "Coluna"],
    [/\bdelt[s]?\b/gi,                 "Deltóide"],
    [/\bback\b/gi,                     "Costas"],
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

const capitalizar = (s: string): string =>
    s
        .split(/\s+/)
        .filter(Boolean)
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
        .join(" ");

const primeiraMaiuscula = (s: string): string =>
    s.trim() ? s.trim().charAt(0).toUpperCase() + s.trim().slice(1) : s;

// ─── Tradução por tokens ─────────────────────────────────────────────────────

function traduzirPorTokens(nome: string): string {
    // 1. Extrai equipamento do início (ex: "Barbell " → sufixo "com Barra")
    let sufixoEquipamento = "";
    let restante = nome.trim();

    for (const [pattern, sufixo] of EQUIPAMENTO_PREFIXO) {
        if (pattern.test(restante)) {
            restante = restante.replace(pattern, "").trim();
            sufixoEquipamento = sufixo;
            break;
        }
    }

    // 2. Aplica substituições ordenadas do mais longo ao mais curto
    let traduzido = restante;
    for (const [rx, rep] of SUBSTITUICOES) {
        traduzido = traduzido.replace(rx, rep);
    }

    // 3. Reposiciona equipamento no final (padrão PT-BR) e limpa espaços
    const resultado = sufixoEquipamento
        ? `${traduzido.trim()} ${sufixoEquipamento}`.trim()
        : traduzido.trim();

    return primeiraMaiuscula(resultado.replace(/\s{2,}/g, ' ').trim());
}

// ─── Função pública ───────────────────────────────────────────────────────────

export const translateExerciseName = (nome: string): string => {
    if (!nome) return nome;

    // Camada 1: frase exata
    const chave = nome.toLowerCase().trim();
    if (FRASES_EXATAS[chave]) return FRASES_EXATAS[chave];

    // Camada 2: tradução por tokens
    return traduzirPorTokens(nome) || capitalizar(nome);
};
