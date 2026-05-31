import { Request, Response } from "express";
import { minioClient, minioConfig, prepareMinioUpload } from "../config/garageHqConnect";
import CommonResponse from "../utils/helpers/commonResponse";
import HttpStatusCode from "../utils/helpers/httpStatusCode";

const CATEGORIAS_PERMITIDAS = new Set(["animacoes", "fotos", "fotos-perfil", "musculos", "aparelhos"]);

const MIME_POR_EXT: Record<string, string> = {
    ".webm": "video/webm",
    ".mp4": "video/mp4",
    ".gif": "image/gif",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".png": "image/png",
    ".webp": "image/webp",
    ".svg": "image/svg+xml",
};

// Retorna null quando o cabeçalho é ausente, malformado ou fora do tamanho.
const parseRange = (
    rangeHeader: string | undefined,
    size: number,
): { start: number; end: number } | null => {
    if (!rangeHeader || !rangeHeader.startsWith("bytes=")) return null;
    const spec = rangeHeader.slice(6).split(",")[0]?.trim();
    if (!spec) return null;

    const [startStr, endStr] = spec.split("-");
    let start: number;
    let end: number;

    if (startStr === "") {
        const suffix = Number(endStr);
        if (!Number.isFinite(suffix) || suffix <= 0) return null;
        start = Math.max(0, size - suffix);
        end = size - 1;
    } else {
        start = Number(startStr);
        end = endStr ? Number(endStr) : size - 1;
        if (!Number.isFinite(start) || !Number.isFinite(end)) return null;
    }

    if (start < 0 || end >= size || start > end) return null;
    return { start, end };
};

class MediaController {
    // GET /api/media/:categoria/:arquivo
    stream = async (req: Request, res: Response) => {
        try {
            const categoria = String(req.params.categoria || "").trim().toLowerCase();
            const arquivo = String(req.params.arquivo || "").trim();

            if (!CATEGORIAS_PERMITIDAS.has(categoria)) {
                return CommonResponse.error(
                    res,
                    HttpStatusCode.BAD_REQUEST.code,
                    null,
                    "categoria",
                    [],
                    `Categoria inválida. Permitidas: ${[...CATEGORIAS_PERMITIDAS].join(", ")}`,
                );
            }

            if (!arquivo || arquivo.includes("/") || arquivo.includes("..") || arquivo.includes("\\")) {
                return CommonResponse.error(
                    res,
                    HttpStatusCode.BAD_REQUEST.code,
                    null,
                    "arquivo",
                    [],
                    "Nome de arquivo inválido.",
                );
            }

            await prepareMinioUpload();
            const objectKey = `${categoria}/${arquivo}`;

            const stat = await minioClient.statObject(minioConfig.bucket, objectKey).catch(() => null);
            if (!stat) {
                return CommonResponse.error(res, HttpStatusCode.NOT_FOUND.code, null, null, [], "Mídia não encontrada.");
            }

            const extensao = arquivo.slice(arquivo.lastIndexOf(".")).toLowerCase();
            const contentType = stat.metaData?.["content-type"] || MIME_POR_EXT[extensao] || "application/octet-stream";
            const etag = stat.etag ? `"${stat.etag.replace(/"/g, "")}"` : undefined;
            const lastModified = stat.lastModified ? stat.lastModified.toUTCString() : undefined;

            res.setHeader("Content-Type", contentType);
            res.setHeader("Accept-Ranges", "bytes");
            res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
            res.setHeader("Access-Control-Allow-Origin", "*");
            res.setHeader("Access-Control-Allow-Methods", "GET, HEAD, OPTIONS");
            res.setHeader("Access-Control-Expose-Headers", "Content-Length, Content-Range, Accept-Ranges, ETag");
            if (etag) res.setHeader("ETag", etag);
            if (lastModified) res.setHeader("Last-Modified", lastModified);

            const ifNoneMatch = req.headers["if-none-match"];
            if (etag && ifNoneMatch && ifNoneMatch === etag) {
                res.status(304).end();
                return;
            }

            if (req.method === "HEAD") {
                res.setHeader("Content-Length", stat.size);
                res.status(200).end();
                return;
            }

            const range = parseRange(req.headers.range as string | undefined, stat.size);
            if (range) {
                const { start, end } = range;
                const chunkSize = end - start + 1;
                res.status(206);
                res.setHeader("Content-Range", `bytes ${start}-${end}/${stat.size}`);
                res.setHeader("Content-Length", chunkSize);

                const partial = await minioClient.getPartialObject(minioConfig.bucket, objectKey, start, chunkSize);
                partial.on("error", () => {
                    if (!res.headersSent) res.status(500).end();
                });
                partial.pipe(res);
                return;
            }

            if (req.headers.range) {
                res.setHeader("Content-Range", `bytes */${stat.size}`);
                res.status(416).end();
                return;
            }

            res.setHeader("Content-Length", stat.size);
            const full = await minioClient.getObject(minioConfig.bucket, objectKey);
            full.on("error", () => {
                if (!res.headersSent) res.status(500).end();
            });
            full.pipe(res);
        } catch (error) {
            const msg = error instanceof Error ? error.message : "Erro desconhecido";
            console.error("[MediaController] stream:", msg);
            if (!res.headersSent) {
                return CommonResponse.serverError(res, { message: msg }, HttpStatusCode.INTERNAL_SERVER_ERROR.message);
            }
        }
    };
}

export default MediaController;
