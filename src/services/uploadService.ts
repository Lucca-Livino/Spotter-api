import crypto from "crypto";
import path from "path";
import { minioClient, minioConfig, getPublicObjectUrl, prepareMinioUpload } from "../config/garageHqConnect";

type UploadedFile = {
  originalname: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
};

type UploadedObjectResult = {
  bucket: string;
  objectKey: string;
  originalName: string;
  mimetype: string;
  size: number;
  url: string;
};

class UploadService {
  async uploadFiles(category: string, files: UploadedFile[]): Promise<UploadedObjectResult[]> {
    await prepareMinioUpload();
    const uploads = files.map((file) => this.uploadSingleFile(category, file));
    return Promise.all(uploads);
  }

  async deleteFile(category: string, fileName: string): Promise<{ bucket: string; objectKey: string }> {
    await prepareMinioUpload();

    const bucket = minioConfig.bucket;
    if (!bucket) {
      throw new Error("Bucket nao configurado. Defina MINIO_BUCKET_FOTOS");
    }

    const sanitizedCategory = category.replace(/[^a-z0-9-_]/gi, "").toLowerCase();
    const objectKey = `${sanitizedCategory}/${fileName}`;

    try {
      await minioClient.statObject(bucket, objectKey);
    } catch {
      throw new Error(`Arquivo nao encontrado: ${objectKey}`);
    }

    await minioClient.removeObject(bucket, objectKey);

    return { bucket, objectKey };
  }

  private async uploadSingleFile(category: string, file: UploadedFile): Promise<UploadedObjectResult> {
    const bucket = minioConfig.bucket;
    if (!bucket) {
      throw new Error("Bucket nao configurado. Defina MINIO_BUCKET_FOTOS");
    }

    const objectKey = this.buildObjectKey(category, file.originalname);

    await minioClient.putObject(
      bucket,
      objectKey,
      file.buffer,
      file.size,
      { "Content-Type": file.mimetype },
    );

    return {
      bucket,
      objectKey,
      originalName: file.originalname,
      mimetype: file.mimetype,
      size: file.size,
      url: getPublicObjectUrl(objectKey),
    };
  }

  private buildObjectKey(category: string, originalName: string): string {
    const ext = path.extname(originalName || "").toLowerCase();
    const sanitizedCategory = category.replace(/[^a-z0-9-_]/gi, "").toLowerCase();
    const safeExt = ext.length > 0 ? ext : "";
    const random = crypto.randomUUID();
    const timestamp = Date.now();
    return `${sanitizedCategory}/${timestamp}-${random}${safeExt}`;
  }
}

export default UploadService;
