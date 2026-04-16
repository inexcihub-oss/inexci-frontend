import api from "@/lib/api";

export interface UploadResponse {
  message: string;
  data: {
    url: string;
    path: string;
    originalName?: string;
  };
}

export interface MultipleUploadResponse {
  message: string;
  data: Array<{
    url: string;
    path: string;
    originalName: string;
  }>;
}

class UploadService {
  /**
   * Gera URL assinada para um arquivo já armazenado
   * @param path - Caminho do arquivo no bucket (ex: avatars/uuid.png)
   */
  async getSignedUrl(path: string): Promise<string> {
    const response = await api.get<{ data: { url: string } }>(
      `/upload/signed-url?path=${encodeURIComponent(path)}`,
    );
    return response.data.data.url;
  }

  /**
   * Faz upload de um único arquivo
   * @param file - Arquivo a ser enviado
   * @param folder - Pasta de destino no bucket (opcional)
   * @returns Dados do arquivo enviado
   */
  async uploadSingle(
    file: File,
    folder: string = "documents",
  ): Promise<UploadResponse> {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("folder", folder);

    const response = await api.post<UploadResponse>(
      "/upload/single",
      formData,
      {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      },
    );

    return response.data;
  }

  /**
   * Faz upload de múltiplos arquivos
   * @param files - Array de arquivos a serem enviados
   * @param folder - Pasta de destino no bucket (opcional)
   * @returns Dados dos arquivos enviados
   */
  async uploadMultiple(
    files: File[],
    folder: string = "documents",
  ): Promise<MultipleUploadResponse> {
    const formData = new FormData();

    files.forEach((file) => {
      formData.append("files", file);
    });

    formData.append("folder", folder);

    const response = await api.post<MultipleUploadResponse>(
      "/upload/multiple",
      formData,
      {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      },
    );

    return response.data;
  }
}

export const uploadService = new UploadService();
