import api from "@/lib/api";

export interface Document {
  id: string;
  surgeryRequestId: string;
  key: string;
  name: string;
  /** Caminho raw no bucket (ex: documents/uuid.pdf ou post-surgical/uuid.pdf) */
  path: string;
  uri: string;
  size?: number;
  createdAt: string;
  createdBy: string;
}

export const DOCUMENT_FOLDERS = {
  PRE_SURGERY: "documents",
  POST_SURGERY: "post-surgical",
  REPORT: "report",
} as const;

export type DocumentFolder =
  (typeof DOCUMENT_FOLDERS)[keyof typeof DOCUMENT_FOLDERS];

export interface CreateDocumentData {
  surgeryRequestId: string | number;
  key: string;
  name: string;
  file: File;
  folder?: DocumentFolder;
  onUploadProgress?: (pct: number) => void;
}

export const documentService = {
  async upload(data: CreateDocumentData): Promise<Document> {
    const formData = new FormData();
    formData.append("surgeryRequestId", data.surgeryRequestId.toString());
    formData.append("key", data.key);
    formData.append("name", data.name);
    formData.append("document", data.file);
    if (data.folder) formData.append("folder", data.folder);

    const response = await api.post("/surgery-requests/documents", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
      onUploadProgress: (progressEvent) => {
        if (data.onUploadProgress && progressEvent.total) {
          const pct = Math.round(
            (progressEvent.loaded / progressEvent.total) * 100,
          );
          data.onUploadProgress(pct);
        }
      },
    });

    return response.data;
  },

  async delete(data: {
    id: string;
    key: string;
    surgeryRequestId: string | number;
  }): Promise<void> {
    await api.delete("/surgery-requests/documents", {
      data,
    });
  },
};
