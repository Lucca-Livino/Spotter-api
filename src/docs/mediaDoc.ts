import { OpenAPIRegistry } from "@asteasolutions/zod-to-openapi";
import { z } from "zod";

export const mediaRegistry = new OpenAPIRegistry();

const mediaParams = z.object({
    categoria: z.enum(["animacoes", "fotos", "musculos", "aparelhos"]).openapi({
        description: "Categoria do objeto no bucket.",
        example: "animacoes",
    }),
    arquivo: z.string().openapi({
        description: "Nome do arquivo (sem o prefixo da categoria). Não pode conter barras nem `..`.",
        example: "1776540973864-a21487a6-3e5f-46ea-b429-03fe8406e3eb.webm",
    }),
});

mediaRegistry.registerPath({
    method: "get",
    path: "/media/{categoria}/{arquivo}",
    summary: "Proxy público de mídia (streaming com Range e cache condicional)",
    description: `Endpoint público que faz stream de objetos do bucket S3/Garage autenticado pelas credenciais da API. \
Pode ser usado diretamente em tags \`<img>\` e \`<video>\` do frontend.

**Recursos:**
- \`206 Partial Content\` via header \`Range\` — necessário para seeking de vídeo.
- \`ETag\` + \`If-None-Match\` — retorna \`304 Not Modified\` quando o cliente já tem o objeto.
- \`Cache-Control: public, max-age=31536000, immutable\` — objetos têm hash no nome, então são permanentes.
- CORS liberado (\`Access-Control-Allow-Origin: *\`).

**Categorias válidas:** \`animacoes\`, \`fotos\`, \`musculos\`, \`aparelhos\`.`,
    tags: ["Media"],
    request: {
        params: mediaParams,
        headers: z.object({
            Range: z
                .string()
                .optional()
                .openapi({
                    description: "Intervalo de bytes (ex: `bytes=0-1023`). Se ausente, o arquivo completo é retornado.",
                    example: "bytes=0-1023",
                }),
            "If-None-Match": z
                .string()
                .optional()
                .openapi({
                    description: "ETag previamente recebido. Se bater, a resposta é `304 Not Modified`.",
                    example: '"5afaea5a5f1e8647a2684d8e1f24f70b"',
                }),
        }),
    },
    responses: {
        200: {
            description: "Mídia retornada completa (binário).",
            content: {
                "video/webm": { schema: { type: "string", format: "binary" } as unknown as z.ZodTypeAny },
                "image/*": { schema: { type: "string", format: "binary" } as unknown as z.ZodTypeAny },
            },
        },
        206: {
            description: "Intervalo parcial retornado em resposta a um header `Range` válido.",
        },
        304: {
            description: "ETag correspondeu ao `If-None-Match` — corpo vazio.",
        },
        400: { description: "Categoria ou nome de arquivo inválido." },
        404: { description: "Mídia não encontrada no bucket." },
        416: { description: "Range solicitado está fora do tamanho do arquivo." },
        500: { description: "Falha ao transmitir a mídia." },
    },
});

mediaRegistry.registerPath({
    method: "head",
    path: "/media/{categoria}/{arquivo}",
    summary: "Metadados da mídia (sem corpo)",
    description: "Igual ao GET, mas retorna apenas cabeçalhos — útil para descobrir `Content-Length`, `ETag` e `Last-Modified` sem baixar o objeto.",
    tags: ["Media"],
    request: { params: mediaParams },
    responses: {
        200: { description: "Cabeçalhos retornados com sucesso." },
        404: { description: "Mídia não encontrada." },
    },
});
