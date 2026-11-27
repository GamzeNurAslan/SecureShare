import { apiRequest } from "./api";

export type AuditLog = {
  id: number;
  actor_user_id: string | null;
  actor_email?: string | null;
  action: string;
  result: string;
  details: Record<string, unknown> | null;
  previous_hash: string | null;
  entry_hash: string | null;
  created_at: string;
};

export function getFileAuditLogs(token: string, fileId: string) {
  return apiRequest<{ fileId: string; logs: AuditLog[] }>(
    `/api/files/${fileId}/audit-logs`,
    {},
    token
  );
}
