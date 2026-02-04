import api from "@/lib/api";

export interface Document {
  id: number;
  surgery_request_id: number;
  key: string;
  name: string;
  uri: string;
  created_at: string;
  created_by: number;
}

export interface CreateDocumentData {
  surgery_request_id: number;
  key: string;
  name: string;
  file: File;
}

export const documentService = {
  async upload(data: CreateDocumentData): Promise<Document> {
    const formData = new FormData();
    formData.append("surgery_request_id", data.surgery_request_id.toString());
    formData.append("key", data.key);
    formData.append("name", data.name);
    formData.append("document", data.file);

    const response = await api.post("/surgery-requests/documents", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });

    return response.data;
  },

  async delete(data: {
    id: number;
    key: string;
    surgery_request_id: number;
  }): Promise<void> {
    await api.delete("/surgery-requests/documents", {
      data,
    });
  },
};
