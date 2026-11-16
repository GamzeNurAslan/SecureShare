import { apiRequest } from "./api";

export type Folder = {
  id: string;
  name: string;
  parent_folder_id: string | null;
  created_at: string;
  updated_at: string;
};

export type SecureFile = {
  id: string;
  original_name: string;
  mime_type: string | null;
  size_bytes: number;
  folder_id: string | null;
  owner_id?: string;
  created_at: string;
};

type FolderContentsResponse = {
  parent_folder_id: string | null;
  folders: Folder[];
  files: SecureFile[];
};

type FilesResponse = {
  files: SecureFile[];
};

export function getFolderContents(
  token: string,
  parentFolderId?: string | null
) {
  const query = parentFolderId
    ? `?parentFolderId=${encodeURIComponent(parentFolderId)}`
    : "";

  return apiRequest<FolderContentsResponse>(
    `/api/folders${query}`,
    {},
    token
  );
}

export function createFolder(
  token: string,
  name: string,
  parentFolderId?: string | null
) {
  return apiRequest<{ message: string; folder: Folder }>(
    "/api/folders",
    {
      method: "POST",
      body: JSON.stringify({
        name,
        parentFolderId: parentFolderId || null,
      }),
    },
    token
  );
}

export function getAccessibleFiles(token: string) {
  return apiRequest<FilesResponse>("/api/files", {}, token);
}