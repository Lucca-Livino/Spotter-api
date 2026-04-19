import * as Minio from "minio";

const parseEndpoint = (
  endpoint: string | undefined,
): { endPoint: string; useSSLFromUrl?: boolean; portFromUrl?: number } => {
  if (!endpoint) {
    return { endPoint: "localhost" };
  }

  if (endpoint.startsWith("http://") || endpoint.startsWith("https://")) {
    const parsed = new URL(endpoint);
    const useSSLFromUrl = parsed.protocol === "https:";
    const portFromUrl = parsed.port ? Number(parsed.port) : useSSLFromUrl ? 443 : 80;
    return {
      endPoint: parsed.hostname,
      useSSLFromUrl,
      portFromUrl,
    };
  }

  return { endPoint: endpoint };
};

const toBoolean = (value: string | undefined, fallback = false): boolean => {
  if (value === undefined) return fallback;
  return value.toLowerCase() === "true";
};

const toNumber = (value: string | undefined, fallback: number): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

export const minioConfig = {
  endpoint: parseEndpoint(process.env.MINIO_ENDPOINT || process.env.AWS_ENDPOINT_URL).endPoint,
  port: toNumber(
    process.env.MINIO_PORT,
    parseEndpoint(process.env.MINIO_ENDPOINT || process.env.AWS_ENDPOINT_URL).portFromUrl ?? 9000,
  ),
  useSSL: parseEndpoint(process.env.MINIO_ENDPOINT || process.env.AWS_ENDPOINT_URL).useSSLFromUrl ??
    toBoolean(process.env.MINIO_USE_SSL, false),
  accessKey: process.env.MINIO_ACCESS_KEY || process.env.AWS_ACCESS_KEY_ID || "",
  secretKey: process.env.MINIO_SECRET_KEY || process.env.AWS_SECRET_ACCESS_KEY || "",
  bucket: process.env.MINIO_BUCKET_FOTOS || process.env.AWS_BUCKET_NAME || "",
  publicUrl: process.env.MINIO_PUBLIC_URL || process.env.AWS_PUBLIC_URL || "",
  region: process.env.MINIO_REGION || process.env.AWS_REGION || "garage",
  local: toBoolean(process.env.MINIO_LOCAL, false),
};

export const validateMinioEnv = (): void => {
  if (!minioConfig.accessKey) {
    throw new Error("Variavel obrigatoria ausente: MINIO_ACCESS_KEY ou AWS_ACCESS_KEY_ID");
  }

  if (!minioConfig.secretKey) {
    throw new Error("Variavel obrigatoria ausente: MINIO_SECRET_KEY ou AWS_SECRET_ACCESS_KEY");
  }

  if (!minioConfig.bucket) {
    throw new Error("Variavel obrigatoria ausente: MINIO_BUCKET_FOTOS ou AWS_BUCKET_NAME");
  }

  if (!minioConfig.endpoint && !minioConfig.local) {
    throw new Error("Variavel obrigatoria ausente: MINIO_ENDPOINT ou AWS_ENDPOINT_URL");
  }
};

export const minioClient = new Minio.Client({
  endPoint: minioConfig.endpoint,
  port: minioConfig.port,
  useSSL: minioConfig.useSSL,
  accessKey: minioConfig.accessKey,
  secretKey: minioConfig.secretKey,
  region: minioConfig.region,
  pathStyle: true,
});

export const ensureBucketIfLocal = async (): Promise<void> => {
  if (!minioConfig.local) return;

  const bucket = minioConfig.bucket;
  if (!bucket) {
    throw new Error("MINIO_BUCKET_FOTOS nao configurado");
  }

  const bucketExists = await minioClient.bucketExists(bucket);
  if (bucketExists) return;

  await minioClient.makeBucket(bucket, "us-east-1");

  const bucketPolicy = {
    Version: "2012-10-17",
    Statement: [
      {
        Effect: "Allow",
        Principal: "*",
        Action: ["s3:GetObject"],
        Resource: [`arn:aws:s3:::${bucket}/*`],
      },
    ],
  };

  await minioClient.setBucketPolicy(bucket, JSON.stringify(bucketPolicy));
};

let minioInitialized = false;

export const prepareMinioUpload = async (): Promise<void> => {
  if (minioInitialized) return;

  validateMinioEnv();
  await ensureBucketIfLocal();
  minioInitialized = true;
};

export const getPublicObjectUrl = (objectKey: string): string => {
  if (minioConfig.publicUrl) {
    return `${minioConfig.publicUrl.replace(/\/$/, "")}/${objectKey}`;
  }

  const apiBase = process.env.API_BASE_URL?.replace(/\/$/, "");
  if (apiBase) {
    return `${apiBase}/media/${objectKey}`;
  }

  const protocol = minioConfig.useSSL ? "https" : "http";
  return `${protocol}://${minioConfig.endpoint}:${minioConfig.port}/${minioConfig.bucket}/${objectKey}`;
};
