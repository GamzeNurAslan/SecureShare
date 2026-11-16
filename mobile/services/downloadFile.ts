import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import { API_URL } from "./api";

function safeFileName(fileName: string) {
  const cleaned = fileName
    .replace(/[<>:"/\\|?*\u0000-\u001F]/g, "_")
    .trim();

  return cleaned || "indirilen-dosya";
}

type DownloadSecureFileParams = {
  token: string;
  fileId: string;
  fileName: string;
};

export async function downloadSecureFile({
  token,
  fileId,
  fileName,
}: DownloadSecureFileParams) {
  if (!API_URL) {
    throw new Error("API adresi bulunamadı. mobile/.env dosyasını kontrol edin.");
  }

  if (!FileSystem.documentDirectory) {
    throw new Error("Cihazda dosya kaydetme alanı bulunamadı.");
  }

  const targetPath =
    FileSystem.documentDirectory +
    `${Date.now()}-${safeFileName(fileName)}`;

  const result = await FileSystem.downloadAsync(
    `${API_URL}/api/files/${fileId}`,
    targetPath,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  if (result.status < 200 || result.status >= 300) {
    await FileSystem.deleteAsync(result.uri, { idempotent: true });

    if (result.status === 401) {
      throw new Error("Oturumunuz sona erdi. Lütfen yeniden giriş yapın.");
    }

    if (result.status === 403 || result.status === 404) {
      throw new Error(
        "Bu dosyayı indirme izniniz yok, izniniz kaldırılmış veya süresi dolmuş."
      );
    }

    throw new Error("Dosya indirilemedi. Lütfen tekrar deneyin.");
  }

  const sharingAvailable = await Sharing.isAvailableAsync();

  if (sharingAvailable) {
    await Sharing.shareAsync(result.uri);
  }

  return result.uri;
}