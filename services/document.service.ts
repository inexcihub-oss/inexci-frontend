import api from "@/lib/api";

export interface Document {
  id: string;
  surgery_request_id: string;
  key: string;
  name: string;
  /** Caminho raw no bucket (ex: documents/uuid.pdf ou post-surgical/uuid.pdf) */
  path: string;
  uri: string;
  created_at: string;
  created_by: string;
}

export const DOCUMENT_FOLDERS = {
  PRE_SURGERY: "documents",
  POST_SURGERY: "post-surgical",
  REPORT: "report",
} as const;

export type DocumentFolder =
  (typeof DOCUMENT_FOLDERS)[keyof typeof DOCUMENT_FOLDERS];

export interface CreateDocumentData {
  surgery_request_id: string;
  key: string;
  name: string;
  file: File;
  folder?: DocumentFolder;
  onUploadProgress?: (pct: number) => void;
}

export const documentService = {
  async upload(data: CreateDocumentData): Promise<Document> {
    const formData = new FormData();
    formData.append("surgery_request_id", data.surgery_request_id.toString());
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
    surgery_request_id: string;
  }): Promise<void> {
    await api.delete("/surgery-requests/documents", {
      data,
    });
  },
};
