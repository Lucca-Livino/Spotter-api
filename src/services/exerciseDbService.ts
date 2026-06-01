import { DataBase } from "../config/DbConnect";
import { aparelho, exercicio, exercicio_aparelho, exercicio_musculo, musculo, exercicio_midia_cache } from "../config/db/schema";
import { and, eq, isNull, sql } from "drizzle-orm";
import { EXERCICIO_EXDB_NOME } from "../seeds/exercicioSeeds";
import UploadService from "./uploadService";
import type { type_grupo_muscular } from "../types/dbSchemas";
import { spawn } from "child_process";
import { promises as fs } from "fs";
import path from "path";
import os from "os";
import crypto from "crypto";
import { translateExerciseName } from "../utils/translateExerciseName";

// Tipos

export interface ExerciseDbItem {
    id: string;
    name: string;
    bodyPart: string;
    target: string;
    equipment: string;
    secondaryMuscles?: string[];
    instructions?: string[];
    gifUrl?: string;
}

export interface SyncMusculosResult {
    criados: number;
    existentes: number;
    grupos_criados: string[];
}

export interface SyncAparelhosResult {
    criados: number;
    existentes: number;
}

export interface SyncExerciciosResult {
    sincronizados: number;
    ja_existiam: number;
    erros: { nome: string; motivo: string }[];
    proximo_offset: number | null;
    total_processado: number;
}

export interface SyncCompletoResult {
    musculos: SyncMusculosResult;
    aparelhos: SyncAparelhosResult;
    exercicios: SyncExerciciosResult;
    requests_api_utilizadas: number;
}

export interface SyncMidiaLocaisResult {
    sincronizados: number;
    ja_possuiam_midia: number;
    sem_match_exdb: number;
    erros: { nome_pt: string; motivo: string }[];
    requests_api_utilizadas: number;
}

// Mapas de tradução

// Palavras-chave que sinalizam exercício isométrico (medido por TEMPO)
const TEMPO_KEYWORDS = [
    'plank', 'prancha', 'hold', 'isometric', 'isometric',
    'wall sit', 'wall-sit', 'l-sit', 'l sit', 'dead hang', 'dead-hang',
    'hollow hold', 'flag hold', 'static', 'sustentação', 'isometria',
];

function inferirTipoExercicio(item: ExerciseDbItem): 'REPETICAO' | 'TEMPO' | 'DISTANCIA' {
    const nomeLower = item.name.toLowerCase();
    const bodyPartLower = item.bodyPart.toLowerCase().trim();
    const targetLower = item.target.toLowerCase().trim();

    if (bodyPartLower === 'cardio' || targetLower === 'cardiovascular system') {
        return 'DISTANCIA';
    }

    if (TEMPO_KEYWORDS.some((kw) => nomeLower.includes(kw))) {
        return 'TEMPO';
    }

    return 'REPETICAO';
}

// bodyPart da ExerciseDB → nosso enum grupo_muscular
const BODY_PART_TO_GRUPO: Record<string, type_grupo_muscular> = {
    'chest': 'PEITO',
    'back': 'COSTAS',
    'upper legs': 'PERNAS',
    'lower legs': 'PERNAS',
    'upper arms': 'BRAÇOS',
    'lower arms': 'BRAÇOS',
    'shoulders': 'OMBROS',
    'waist': 'ABDOMEN',
    'neck': 'PESCOÇO',
    'cardio': 'CARDIO',
};

// target → grupo_muscular (usado no fallback quando bodyPart não bate)
const TARGET_TO_GRUPO: Record<string, type_grupo_muscular> = {
    'pectorals': 'PEITO',
    'lats': 'COSTAS',
    'traps': 'COSTAS',
    'upper back': 'COSTAS',
    'spine': 'COSTAS',
    'levator scapulae': 'COSTAS',
    'quads': 'PERNAS',
    'hamstrings': 'PERNAS',
    'glutes': 'PERNAS',
    'calves': 'PERNAS',
    'adductors': 'PERNAS',
    'abductors': 'PERNAS',
    'biceps': 'BRAÇOS',
    'triceps': 'BRAÇOS',
    'forearms': 'BRAÇOS',
    'delts': 'OMBROS',
    'serratus anterior': 'OMBROS',
    'abs': 'ABDOMEN',
    'sternocleidomastoid': 'PESCOÇO',
    'cardiovascular system': 'CARDIO',
};

// Traduz nome do músculo (target/secondary) para PT-BR (mantém capitalização natural)
const MUSCULO_NOME_PT: Record<string, string> = {
    'pectorals': 'Peitoral',
    'lats': 'Latíssimo do Dorso',
    'traps': 'Trapézio',
    'upper back': 'Dorsais Superiores',
    'spine': 'Eretores da Coluna',
    'levator scapulae': 'Levantador da Escápula',
    'quads': 'Quadríceps',
    'hamstrings': 'Isquiotibiais',
    'glutes': 'Glúteos',
    'calves': 'Panturrilha',
    'adductors': 'Adutores',
    'abductors': 'Abdutores',
    'biceps': 'Bíceps',
    'triceps': 'Tríceps',
    'forearms': 'Antebraço',
    'delts': 'Deltóide',
    'serratus anterior': 'Serrátil Anterior',
    'abs': 'Abdominais',
    'sternocleidomastoid': 'Esternocleidomastóideo',
    'cardiovascular system': 'Sistema Cardiovascular',
    'hip flexors': 'Flexores do Quadril',
    'lower back': 'Lombar',
    'obliques': 'Oblíquos',
    'brachialis': 'Braquial',
};

// equipment (EN) → { nome PT-BR, descricao }
const EQUIPMENT_MAP: Record<string, { nome: string; descricao: string }> = {
    'barbell': { nome: 'Barra Reta', descricao: 'Barra longa usada em exercícios compostos' },
    'dumbbell': { nome: 'Halter', descricao: 'Peso livre em formato de barra curta' },
    'cable': { nome: 'Polia / Cabo', descricao: 'Sistema de cabos e polias' },
    'body weight': { nome: 'Peso Corporal', descricao: 'Exercícios sem equipamento externo' },
    'leverage machine': { nome: 'Máquina de Alavanca', descricao: 'Máquina com sistema de alavanca' },
    'smith machine': { nome: 'Máquina Smith', descricao: 'Barra guiada em trilhos verticais' },
    'band': { nome: 'Elástico / Faixa', descricao: 'Faixa elástica de resistência variável' },
    'kettlebell': { nome: 'Kettlebell', descricao: 'Peso em formato de bola com alça' },
    'ez barbell': { nome: 'Barra EZ', descricao: 'Barra com curvaturas para reduzir tensão nos pulsos' },
    'medicine ball': { nome: 'Bola Medicinal', descricao: 'Bola pesada para treinos funcionais' },
    'stability ball': { nome: 'Bola de Estabilidade', descricao: 'Bola grande para equilíbrio e core' },
    'roller': { nome: 'Rolo / Foam Roller', descricao: 'Rolo para exercícios de mobilidade' },
    'rope': { nome: 'Corda', descricao: 'Corda para pular ou exercícios de cabo' },
    'assisted': { nome: 'Assistido', descricao: 'Máquina com contrabalanceamento' },
    'weighted': { nome: 'Com Carga', descricao: 'Exercício com peso adicional' },
    'bosu ball': { nome: 'Bosu Ball', descricao: 'Meia bola de equilíbrio' },
    'elliptical machine': { nome: 'Elíptico', descricao: 'Máquina cardiovascular de movimento elíptico' },
    'skierg machine': { nome: 'SkiErg', descricao: 'Máquina que simula esqui cross-country' },
    'stationary bike': { nome: 'Bicicleta Ergométrica', descricao: 'Bicicleta fixa de academia' },
    'stepmill machine': { nome: 'Escada Ergométrica', descricao: 'Máquina de escada rolante vertical' },
    'tire': { nome: 'Pneu', descricao: 'Pneu de caminhão para treino funcional' },
    'trap bar': { nome: 'Barra Hexagonal', descricao: 'Barra em formato hexagonal para levantamento terra' },
    'wheel roller': { nome: 'Roda Abdominal', descricao: 'Roda para fortalecimento do core' },
    'hammer': { nome: 'Marreta', descricao: 'Marreta para treinos funcionais de impacto' },
};

// Classe

class ExerciseDbService {
    private apiKey: string;
    private apiHost: string;
    private baseUrl: string;
    private uploadService: UploadService;
    private requestsRealizadas: number = 0;
    private ffmpegDisponivel: boolean | null = null;

    constructor() {
        this.apiKey = process.env.EXERCISEDB_API_KEY || '';
        this.apiHost = process.env.EXERCISEDB_API_HOST || 'exercisedb.p.rapidapi.com';
        this.baseUrl = process.env.EXERCISEDB_BASE_URL || 'https://exercisedb.p.rapidapi.com';
        this.uploadService = new UploadService();
    }

    private validarCredenciais() {
        if (!this.apiKey) {
            throw new Error('CONFIG: EXERCISEDB_API_KEY não configurada no .env');
        }
    }

    private async request<T>(path: string): Promise<T> {
        this.validarCredenciais();
        const url = `${this.baseUrl}${path}`;
        const resp = await fetch(url, {
            headers: {
                'x-rapidapi-key': this.apiKey,
                'x-rapidapi-host': this.apiHost,
            },
        });
        this.requestsRealizadas += 1;

        if (!resp.ok) {
            const texto = await resp.text().catch(() => '');
            if (resp.status === 429) {
                throw new Error(`RATE_LIMIT: Limite de requests da ExerciseDB atingido (429).`);
            }
            if (resp.status === 401 || resp.status === 403) {
                throw new Error(`AUTH: Chave RapidAPI inválida ou sem acesso (${resp.status}).`);
            }
            throw new Error(`UPSTREAM: Falha na ExerciseDB ${resp.status} - ${texto.slice(0, 200)}`);
        }

        return await resp.json() as T;
    }

    getRequestsRealizadas(): number {
        return this.requestsRealizadas;
    }

    resetRequests() {
        this.requestsRealizadas = 0;
    }

    // Consultas

    async getBodyPartList(): Promise<string[]> {
        return this.request<string[]>('/exercises/bodyPartList');
    }

    async getTargetList(): Promise<string[]> {
        return this.request<string[]>('/exercises/targetList');
    }

    async getEquipmentList(): Promise<string[]> {
        return this.request<string[]>('/exercises/equipmentList');
    }

    async searchByName(name: string, limit = 10, offset = 0): Promise<ExerciseDbItem[]> {
        const encoded = encodeURIComponent(name.toLowerCase().trim());
        return this.request<ExerciseDbItem[]>(`/exercises/name/${encoded}?limit=${limit}&offset=${offset}`);
    }

    async getByBodyPart(bodyPart: string, limit = 10, offset = 0): Promise<ExerciseDbItem[]> {
        const encoded = encodeURIComponent(bodyPart.toLowerCase().trim());
        return this.request<ExerciseDbItem[]>(`/exercises/bodyPart/${encoded}?limit=${limit}&offset=${offset}`);
    }

    async getByTarget(target: string, limit = 10, offset = 0): Promise<ExerciseDbItem[]> {
        const encoded = encodeURIComponent(target.toLowerCase().trim());
        return this.request<ExerciseDbItem[]>(`/exercises/target/${encoded}?limit=${limit}&offset=${offset}`);
    }

    async getByEquipment(equipment: string, limit = 10, offset = 0): Promise<ExerciseDbItem[]> {
        const encoded = encodeURIComponent(equipment.toLowerCase().trim());
        return this.request<ExerciseDbItem[]>(`/exercises/equipment/${encoded}?limit=${limit}&offset=${offset}`);
    }

    async listExercicios(limit = 50, offset = 0): Promise<ExerciseDbItem[]> {
        return this.request<ExerciseDbItem[]>(`/exercises?limit=${limit}&offset=${offset}`);
    }

    // Cache de mídia (GIF → WebM ou GIF puro)

    private async detectarFfmpeg(): Promise<boolean> {
        if (this.ffmpegDisponivel !== null) return this.ffmpegDisponivel;
        try {
            await new Promise<void>((resolve, reject) => {
                const proc = spawn('ffmpeg', ['-version'], { stdio: 'ignore' });
                proc.on('error', reject);
                proc.on('exit', (code) => (code === 0 ? resolve() : reject(new Error(`exit ${code}`))));
            });
            this.ffmpegDisponivel = true;
        } catch {
            this.ffmpegDisponivel = false;
        }
        return this.ffmpegDisponivel;
    }

    // Converte GIF buffer → WebM buffer usando ffmpeg CLI. Retorna null em falha.
    private async converterGifParaWebm(gifBuffer: Buffer): Promise<Buffer | null> {
        const temOk = await this.detectarFfmpeg();
        if (!temOk) return null;

        const tmpDir = os.tmpdir();
        const idAleatorio = crypto.randomUUID();
        const inFile = path.join(tmpDir, `exdb-${idAleatorio}.gif`);
        const outFile = path.join(tmpDir, `exdb-${idAleatorio}.webm`);

        try {
            await fs.writeFile(inFile, gifBuffer);

            await new Promise<void>((resolve, reject) => {
                const proc = spawn('ffmpeg', [
                    '-y',
                    '-i', inFile,
                    '-c:v', 'libvpx-vp9',
                    '-b:v', '0',
                    '-crf', '34',
                    '-pix_fmt', 'yuv420p',
                    '-deadline', 'good',
                    '-cpu-used', '2',
                    '-an',
                    outFile,
                ], { stdio: 'ignore' });
                proc.on('error', reject);
                proc.on('exit', (code) => (code === 0 ? resolve() : reject(new Error(`ffmpeg exit ${code}`))));
            });

            return await fs.readFile(outFile);
        } catch (error) {
            console.warn('[ExerciseDbService] Conversão GIF→WebM falhou, mantendo GIF original.', error);
            return null;
        } finally {
            await fs.unlink(inFile).catch(() => {});
            await fs.unlink(outFile).catch(() => {});
        }
    }

    // Baixa o GIF do endpoint /image?exerciseId={id}&resolution={r} (RapidAPI).
    // Consome 1 request adicional da quota.
    async fetchImageBuffer(exerciseId: string, resolution: '180' | '360' | '720' | '1080' = '360'): Promise<Buffer | null> {
        this.validarCredenciais();
        const url = `${this.baseUrl}/image?exerciseId=${encodeURIComponent(exerciseId)}&resolution=${resolution}`;
        try {
            const resp = await fetch(url, {
                headers: {
                    'x-rapidapi-key': this.apiKey,
                    'x-rapidapi-host': this.apiHost,
                },
            });
            this.requestsRealizadas += 1;

            if (!resp.ok) {
                if (resp.status === 429) {
                    throw new Error(`RATE_LIMIT: Limite de requests da ExerciseDB atingido (429).`);
                }
                console.warn(`[ExerciseDbService] Falha ao baixar imagem do exercício ${exerciseId}: HTTP ${resp.status}`);
                return null;
            }

            const ab = await resp.arrayBuffer();
            return Buffer.from(ab);
        } catch (err) {
            if (err instanceof Error && err.message.startsWith('RATE_LIMIT:')) throw err;
            console.warn(`[ExerciseDbService] Erro ao baixar imagem de ${exerciseId}:`, err);
            return null;
        }
    }

    // Recebe buffer GIF, converte para WebM se possível, e faz upload para o S3.
    async cacheGifBufferToS3(gifBuffer: Buffer, nomeBase: string): Promise<string> {
        const webm = await this.converterGifParaWebm(gifBuffer);

        const usarWebm = !!webm;
        const buffer = webm ?? gifBuffer;
        const mimetype = usarWebm ? 'video/webm' : 'image/gif';
        const extensao = usarWebm ? '.webm' : '.gif';

        const nomeSanitizado = this.sanitizarNomeArquivo(nomeBase);
        const originalname = `${nomeSanitizado}${extensao}`;

        const uploaded = await this.uploadService.uploadFiles('animacoes', [{
            originalname,
            mimetype,
            size: buffer.length,
            buffer,
        }]);

        return uploaded[0].url;
    }

    private sanitizarNomeArquivo(nome: string): string {
        return nome
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/[^a-zA-Z0-9]+/g, '-')
            .replace(/^-+|-+$/g, '')
            .toLowerCase()
            .slice(0, 50) || 'exercicio';
    }

    // Persiste URL no cache permanente para sobreviver re-execu\u00e7\u00f5es de seed.
    private async salvarNoCache(nomePt: string, animacaoUrl: string, exercisedbId?: string): Promise<void> {
        await DataBase
            .insert(exercicio_midia_cache)
            .values({ nome_pt: nomePt, animacao_url: animacaoUrl, exercisedb_id: exercisedbId ?? null })
            .onConflictDoUpdate({
                target: exercicio_midia_cache.nome_pt,
                set: { animacao_url: animacaoUrl, exercisedb_id: exercisedbId ?? null, updated_at: new Date() },
            });
    }

    // Sincronização

    async syncMusculos(): Promise<SyncMusculosResult> {
        const [bodyParts, targets] = await Promise.all([
            this.getBodyPartList(),
            this.getTargetList(),
        ]);

        const gruposUsados = new Set<string>();
        for (const bp of bodyParts) {
            const grupo = BODY_PART_TO_GRUPO[bp.toLowerCase()];
            if (grupo) gruposUsados.add(grupo);
        }

        let criados = 0;
        let existentes = 0;

        // Cada target vira um músculo. Resolve grupo via TARGET_TO_GRUPO.
        for (const target of targets) {
            const targetKey = target.toLowerCase().trim();
            const grupo = TARGET_TO_GRUPO[targetKey];

            if (!grupo) {
                // Sem mapeamento definido: pula (evita grupo inválido no enum)
                continue;
            }

            const nomePt = MUSCULO_NOME_PT[targetKey] ?? this.capitalizar(target);

            const [existente] = await DataBase
                .select({ id: musculo.id })
                .from(musculo)
                .where(eq(musculo.nome, nomePt));

            if (existente) {
                existentes += 1;
                continue;
            }

            await DataBase
                .insert(musculo)
                .values({ nome: nomePt, grupo_muscular: grupo });
            criados += 1;
        }

        return {
            criados,
            existentes,
            grupos_criados: Array.from(gruposUsados),
        };
    }

    async syncAparelhos(): Promise<SyncAparelhosResult> {
        const equipments = await this.getEquipmentList();

        let criados = 0;
        let existentes = 0;

        for (const equip of equipments) {
            const chave = equip.toLowerCase().trim();
            const mapped = EQUIPMENT_MAP[chave] ?? {
                nome: this.capitalizar(equip),
                descricao: `Equipamento ${this.capitalizar(equip)}`,
            };

            const [existe] = await DataBase
                .select({ id: aparelho.id })
                .from(aparelho)
                .where(eq(aparelho.nome, mapped.nome));

            if (existe) {
                existentes += 1;
                continue;
            }

            await DataBase
                .insert(aparelho)
                .values({ nome: mapped.nome, descricao: mapped.descricao });
            criados += 1;
        }

        return { criados, existentes };
    }

    async syncExercicios(limit = 50, offset = 0, opcoes: { cachearMidia?: boolean } = {}): Promise<SyncExerciciosResult> {
        const cachearMidia = opcoes.cachearMidia !== false;
        const itens = await this.listExercicios(limit, offset);

        // Pré-carrega catálogos locais em memória para reduzir round-trips ao DB
        const musculosDb = await DataBase.select({ id: musculo.id, nome: musculo.nome }).from(musculo);
        const aparelhosDb = await DataBase.select({ id: aparelho.id, nome: aparelho.nome }).from(aparelho);

        const musculosPorNome = new Map(musculosDb.map((m) => [m.nome, m.id]));
        const aparelhosPorNome = new Map(aparelhosDb.map((a) => [a.nome, a.id]));

        let sincronizados = 0;
        let jaExistiam = 0;
        const erros: { nome: string; motivo: string }[] = [];

        for (const item of itens) {
            try {
                const nomeExercicio = translateExerciseName(item.name);

                // Idempotência: checa se exercício global com mesmo nome já existe
                const [existente] = await DataBase
                    .select({ id: exercicio.id, animacao_url: exercicio.animacao_url })
                    .from(exercicio)
                    .where(and(eq(exercicio.nome, nomeExercicio), isNull(exercicio.aluno_id)));

                if (existente) {
                    // Enriquece exercício existente se ainda não tem mídia
                    if (!existente.animacao_url && cachearMidia && item.id) {
                        try {
                            const gifBuffer = await this.fetchImageBuffer(item.id, '360');
                            if (gifBuffer) {
                                const animacaoUrl = await this.cacheGifBufferToS3(gifBuffer, `${item.id}-${item.name}`);
                                await DataBase
                                    .update(exercicio)
                                    .set({ animacao_url: animacaoUrl })
                                    .where(eq(exercicio.id, existente.id));
                                await this.salvarNoCache(nomeExercicio, animacaoUrl, item.id);
                                sincronizados += 1;
                                continue;
                            }
                        } catch (err) {
                            if (err instanceof Error && err.message.startsWith('RATE_LIMIT:')) throw err;
                        }
                    }
                    jaExistiam += 1;
                    continue;
                }

                // Resolve músculo primário
                const targetKey = item.target.toLowerCase().trim();
                const nomePrimarioPt = MUSCULO_NOME_PT[targetKey] ?? this.capitalizar(item.target);
                const musculoPrimarioId = musculosPorNome.get(nomePrimarioPt);

                if (!musculoPrimarioId) {
                    erros.push({ nome: item.name, motivo: `Músculo primário "${item.target}" não localizado no banco. Rode POST /exercisedb/sync/musculos.` });
                    continue;
                }

                // Resolve aparelho
                const equipKey = item.equipment.toLowerCase().trim();
                const aparelhoNome = (EQUIPMENT_MAP[equipKey]?.nome) ?? this.capitalizar(item.equipment);
                const aparelhoId = aparelhosPorNome.get(aparelhoNome);

                // Cache de mídia (WebM preferencial; fallback GIF).
                // A API v2 não retorna mais gifUrl — buscamos via GET /image?exerciseId=X.
                let animacaoUrl: string | null = null;
                if (cachearMidia && item.id) {
                    try {
                        const gifBuffer = await this.fetchImageBuffer(item.id, '360');
                        if (gifBuffer) {
                            animacaoUrl = await this.cacheGifBufferToS3(gifBuffer, `${item.id}-${item.name}`);
                        }
                    } catch (err) {
                        if (err instanceof Error && err.message.startsWith('RATE_LIMIT:')) throw err;
                        console.warn(`[ExerciseDbService] Falha no cache da mídia de "${item.name}":`, err);
                    }
                }

                const descricao = (item.instructions ?? []).join('\n').slice(0, 1000) || null;

                // Monta músculos secundários (os que existem no banco)
                const secundariosIds: string[] = [];
                for (const sec of item.secondaryMuscles ?? []) {
                    const secKey = sec.toLowerCase().trim();
                    const secNome = MUSCULO_NOME_PT[secKey] ?? this.capitalizar(sec);
                    const id = musculosPorNome.get(secNome);
                    if (id && id !== musculoPrimarioId && !secundariosIds.includes(id)) {
                        secundariosIds.push(id);
                    }
                }

                const tipoInferido = inferirTipoExercicio(item);

                await DataBase.transaction(async (tx) => {
                    const [exercicioCriado] = await tx
                        .insert(exercicio)
                        .values({
                            nome: nomeExercicio,
                            descricao,
                            animacao_url: animacaoUrl,
                            aluno_id: null,
                            tipo_exercicio: tipoInferido,
                        })
                        .returning();

                    if (animacaoUrl) {
                        await this.salvarNoCache(nomeExercicio, animacaoUrl, item.id);
                    }

                    await tx.insert(exercicio_musculo).values({
                        exercicio_id: exercicioCriado.id!,
                        musculo_id: musculoPrimarioId,
                        tipo_ativacao: 'PRIMARIO',
                    });

                    if (secundariosIds.length > 0) {
                        await tx.insert(exercicio_musculo).values(
                            secundariosIds.map((id) => ({
                                exercicio_id: exercicioCriado.id!,
                                musculo_id: id,
                                tipo_ativacao: 'SECUNDARIO' as const,
                            })),
                        );
                    }

                    if (aparelhoId) {
                        await tx.insert(exercicio_aparelho).values({
                            exercicio_id: exercicioCriado.id!,
                            aparelho_id: aparelhoId,
                        });
                    }
                });

                sincronizados += 1;
            } catch (err) {
                const msg = err instanceof Error ? err.message : 'erro desconhecido';
                erros.push({ nome: item.name, motivo: msg });
            }
        }

        const proximoOffset = itens.length < limit ? null : offset + itens.length;

        return {
            sincronizados,
            ja_existiam: jaExistiam,
            erros,
            proximo_offset: proximoOffset,
            total_processado: itens.length,
        };
    }

    async syncCompleto(opcoes: { max_exercicios?: number; cachearMidia?: boolean } = {}): Promise<SyncCompletoResult> {
        this.resetRequests();
        const limitPorBatch = 50;
        const maxExercicios = opcoes.max_exercicios ?? 1500;
        const cachearMidia = opcoes.cachearMidia !== false;

        const musculosResult = await this.syncMusculos();
        const aparelhosResult = await this.syncAparelhos();

        let sincronizadosTotal = 0;
        let jaExistiamTotal = 0;
        const errosTotal: { nome: string; motivo: string }[] = [];
        let offsetAtual = 0;
        let totalProcessado = 0;

        while (totalProcessado < maxExercicios) {
            const restante = maxExercicios - totalProcessado;
            const limit = Math.min(limitPorBatch, restante);
            const batch = await this.syncExercicios(limit, offsetAtual, { cachearMidia });

            sincronizadosTotal += batch.sincronizados;
            jaExistiamTotal += batch.ja_existiam;
            errosTotal.push(...batch.erros);
            totalProcessado += batch.total_processado;

            if (batch.proximo_offset === null) break;
            offsetAtual = batch.proximo_offset;
        }

        return {
            musculos: musculosResult,
            aparelhos: aparelhosResult,
            exercicios: {
                sincronizados: sincronizadosTotal,
                ja_existiam: jaExistiamTotal,
                erros: errosTotal,
                proximo_offset: offsetAtual,
                total_processado: totalProcessado,
            },
            requests_api_utilizadas: this.getRequestsRealizadas(),
        };
    }

    // Re-sincroniza a mídia de um exercício específico pelo nome em inglês (ExerciseDB).
    // Força o download mesmo que animacao_url já exista — útil para re-processar após
    // correção no pipeline de encoding.
    async syncMidiaExercicio(nomeEn: string): Promise<{ animacao_url: string; nome_pt: string; exercicio_id: string }> {
        const nomePt = translateExerciseName(nomeEn);

        const [existente] = await DataBase
            .select({ id: exercicio.id })
            .from(exercicio)
            .where(and(eq(exercicio.nome, nomePt), isNull(exercicio.aluno_id)));

        if (!existente) {
            throw new Error(`Exercício "${nomePt}" não encontrado no banco local. Execute o sync completo primeiro.`);
        }

        const resultados = await this.searchByName(nomeEn, 1, 0);
        if (!resultados.length) {
            throw new Error(`UPSTREAM: Exercício "${nomeEn}" não encontrado na ExerciseDB.`);
        }

        const item = resultados[0];
        const gifBuffer = await this.fetchImageBuffer(item.id, '360');
        if (!gifBuffer) {
            throw new Error(`UPSTREAM: Imagem não disponível na ExerciseDB para "${nomeEn}".`);
        }

        const animacaoUrl = await this.cacheGifBufferToS3(gifBuffer, `${item.id}-${item.name}`);

        await DataBase
            .update(exercicio)
            .set({ animacao_url: animacaoUrl })
            .where(eq(exercicio.id, existente.id));

        await this.salvarNoCache(nomePt, animacaoUrl, item.id);

        return { animacao_url: animacaoUrl, nome_pt: nomePt, exercicio_id: existente.id };
    }

    // Sincroniza mídia de todos os exercícios locais (seeds) que têm mapeamento na ExerciseDB.
    // Útil após seed inicial: baixa GIFs para exercícios que ainda não têm animacao_url.
    async syncMidiaExerciciosLocais(opcoes: { forcar?: boolean } = {}): Promise<SyncMidiaLocaisResult> {
        this.resetRequests();
        const forcar = opcoes.forcar === true;

        const exerciciosLocais = await DataBase
            .select({ id: exercicio.id, nome: exercicio.nome, animacao_url: exercicio.animacao_url })
            .from(exercicio)
            .where(isNull(exercicio.aluno_id));

        let sincronizados = 0;
        let jaPossuiamMidia = 0;
        let semMatchExdb = 0;
        const erros: { nome_pt: string; motivo: string }[] = [];

        for (const ex of exerciciosLocais) {
            const nomeEn = EXERCICIO_EXDB_NOME[ex.nome];

            if (!nomeEn) {
                semMatchExdb += 1;
                continue;
            }

            if (ex.animacao_url && !forcar) {
                jaPossuiamMidia += 1;
                continue;
            }

            try {
                const resultados = await this.searchByName(nomeEn, 1, 0);
                if (!resultados.length) {
                    erros.push({ nome_pt: ex.nome, motivo: `Não encontrado na ExerciseDB: "${nomeEn}"` });
                    continue;
                }

                const item = resultados[0];
                const gifBuffer = await this.fetchImageBuffer(item.id, '360');
                if (!gifBuffer) {
                    erros.push({ nome_pt: ex.nome, motivo: 'Imagem não disponível na ExerciseDB' });
                    continue;
                }

                const animacaoUrl = await this.cacheGifBufferToS3(gifBuffer, `${item.id}-${item.name}`);

                await DataBase
                    .update(exercicio)
                    .set({ animacao_url: animacaoUrl })
                    .where(eq(exercicio.id, ex.id));

                await this.salvarNoCache(ex.nome, animacaoUrl, item.id);

                sincronizados += 1;
            } catch (err) {
                if (err instanceof Error && err.message.startsWith('RATE_LIMIT:')) throw err;
                const motivo = err instanceof Error ? err.message : 'erro desconhecido';
                erros.push({ nome_pt: ex.nome, motivo });
            }
        }

        return {
            sincronizados,
            ja_possuiam_midia: jaPossuiamMidia,
            sem_match_exdb: semMatchExdb,
            erros,
            requests_api_utilizadas: this.getRequestsRealizadas(),
        };
    }

    private capitalizar(s: string): string {
        return s
            .split(/\s+/)
            .filter(Boolean)
            .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
            .join(' ');
    }
}

export default ExerciseDbService;
