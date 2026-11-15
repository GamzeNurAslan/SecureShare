import { apiRequest } from "./api";

export type FileDetails = {
  id: string;
  original_name: string;
  mime_type: string | null;
  size_bytes: number;
  created_at: string;
  owner_id: string;
  owner_name: string | null;
  owner_email: string;
  is_owner: boolean;
  can_read: boolean;
  can_download: boolean;
  expires_at: string | null;
};

export function getFileDetails(token: string, fileId: string) {
  return apiRequest<{ file: FileDetails }>(
    `/api/files/${fileId}/details`,
    {},
    token
  );
}