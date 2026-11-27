import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { ApiError } from "../services/api";
import { downloadSecureFile } from "../services/downloadFile";
import {
  getFileAuditHistory,
  getFileDetails,
  type AuditLog,
  type FileDetails,
} from "../services/fileDetails";

type FileDetailScreenProps = {
  token: string;
  fileId: string;
  onBack: () => void;
  onSessionExpired: () => void;
};

export type MobileFile = {
  id: string;
  original_name: string;
  mime_type?: string | null;
  size_bytes?: number;
  created_at?: string;
  owner_id?: string;
  can_read?: boolean;
  can_download?: boolean;
};

function formatBytes(bytes: number) {
  if (!Number.isFinite(bytes) || bytes <= 0) {
    return "0 B";
  }

  const units = ["B", "KB", "MB", "GB"];
  const index = Math.min(
    Math.floor(Math.log(bytes) / Math.log(1024)),
    units.length - 1
  );
  const value = bytes / 1024 ** index;

  return `${value.toFixed(index === 0 ? 0 : 2)} ${units[index]}`;
}

function formatDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Bilinmiyor";
  }

  return date.toLocaleString("tr-TR");
}

function getFileExtension(fileName: string) {
  const parts = fileName.split(".");
  return parts.length > 1 ? parts[parts.length - 1].toUpperCase() : "DOSYA";
}

function shortenHash(hash: string | null) {
  if (!hash) return "İlk kayıt";
  return hash.length > 24 ? `${hash.slice(0, 24)}…` : hash;
}

function auditActor(log: AuditLog) {
  return log.actor_email || log.actor_user_id || "Sistem";
}

export default function FileDetailScreen({
  token,
  fileId,
  onBack,
  onSessionExpired,
}: FileDetailScreenProps) {
  const [file, setFile] = useState<FileDetails | null>(null);
  const [history, setHistory] = useState<AuditLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isHistoryLoading, setIsHistoryLoading] = useState(true);
  const [isDownloading, setIsDownloading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [historyMessage, setHistoryMessage] = useState("");
  const [downloadMessage, setDownloadMessage] = useState("");

  const loadFileDetails = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage("");
    setDownloadMessage("");

    try {
      const response = await getFileDetails(token, fileId);
      setFile(response.file);
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        onSessionExpired();
        return;
      }

      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Dosya bilgileri yüklenemedi."
      );
    } finally {
      setIsLoading(false);
    }
  }, [fileId, onSessionExpired, token]);

  useEffect(() => {
    loadFileDetails();
  }, [loadFileDetails]);

  const loadAuditHistory = useCallback(async () => {
    setIsHistoryLoading(true);
    setHistoryMessage("");

    try {
      const response = await getFileAuditHistory(token, fileId);
      setHistory(Array.isArray(response.history) ? response.history : []);
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        onSessionExpired();
        return;
      }

      setHistoryMessage(
        error instanceof Error
          ? error.message
          : "İşlem geçmişi yüklenemedi."
      );
    } finally {
      setIsHistoryLoading(false);
    }
  }, [fileId, onSessionExpired, token]);

  useEffect(() => {
    loadAuditHistory();
  }, [loadAuditHistory]);

  async function handleDownload() {
    if (!file || !file.can_download) {
      return;
    }

    setIsDownloading(true);
    setDownloadMessage("");

    try {
      await downloadSecureFile({
        token,
        fileId: file.id,
        fileName: file.original_name,
      });

      setDownloadMessage("Dosya başarıyla indirildi.");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Dosya indirilemedi.";

      if (message.includes("Oturumunuz sona erdi")) {
        onSessionExpired();
        return;
      }

      setDownloadMessage(message);
    } finally {
      setIsDownloading(false);
    }
  }

  if (isLoading) {
    return (
      <SafeAreaView style={styles.page}>
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color="#4a90ff" />
          <Text style={styles.mutedText}>Dosya bilgileri yükleniyor...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (errorMessage || !file) {
    return (
      <SafeAreaView style={styles.page}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorTitle}>Dosyaya erişilemedi</Text>
          <Text style={styles.errorText}>
            {errorMessage ||
              "Dosya bulunamadı, erişim izniniz kaldırılmış veya süresi dolmuş olabilir."}
          </Text>

          <TouchableOpacity style={styles.secondaryButton} onPress={onBack}>
            <Text style={styles.secondaryButtonText}>Dosyalara dön</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.page}>
      <ScrollView contentContainerStyle={styles.content}>
        <TouchableOpacity style={styles.backButton} onPress={onBack}>
          <Text style={styles.backButtonText}>‹ Dosyalara dön</Text>
        </TouchableOpacity>

        <View style={styles.fileHeader}>
          <View style={styles.fileTypeBox}>
            <Text style={styles.fileTypeText}>
              {getFileExtension(file.original_name)}
            </Text>
          </View>

          <View style={styles.fileTitleArea}>
            <Text
              style={styles.fileName}
              numberOfLines={2}
              ellipsizeMode="middle"
            >
              {file.original_name}
            </Text>
            <Text style={styles.fileMeta}>
              {formatBytes(file.size_bytes)} · {formatDate(file.created_at)}
            </Text>
          </View>
        </View>

        <View style={styles.badge}>
          <Text style={styles.badgeText}>
            {file.is_owner ? "SİZİN DOSYANIZ" : "SİZİNLE PAYLAŞILDI"}
          </Text>
        </View>

        <View style={styles.card}>
          <View style={styles.cardHeading}>
            <View>
              <Text style={styles.cardEyebrow}>SECURESHARE</Text>
              <Text style={styles.cardTitle}>İşlem geçmişi</Text>
            </View>
            <TouchableOpacity onPress={loadAuditHistory}>
              <Text style={styles.refreshText}>Yenile</Text>
            </TouchableOpacity>
          </View>

          {isHistoryLoading ? (
            <View style={styles.historyLoading}>
              <ActivityIndicator color="#5d9cff" />
              <Text style={styles.permissionText}>Geçmiş yükleniyor...</Text>
            </View>
          ) : historyMessage ? (
            <View style={styles.historyEmpty}>
              <Text style={styles.historyEmptyTitle}>Geçmiş görüntülenemedi</Text>
              <Text style={styles.historyEmptyText}>{historyMessage}</Text>
            </View>
          ) : history.length === 0 ? (
            <View style={styles.historyEmpty}>
              <Text style={styles.historyEmptyIcon}>◌</Text>
              <Text style={styles.historyEmptyTitle}>Henüz işlem yok</Text>
              <Text style={styles.historyEmptyText}>
                Bu dosya için görüntülenecek bir işlem kaydı bulunmuyor.
              </Text>
            </View>
          ) : (
            <View style={styles.historyList}>
              {history.map((log) => (
                <View style={styles.historyItem} key={String(log.id)}>
                  <View style={styles.historyDot} />
                  <View style={styles.historyBody}>
                    <View style={styles.historyTitleRow}>
                      <Text
                        style={styles.historyAction}
                        numberOfLines={2}
                        ellipsizeMode="tail"
                      >
                        {log.action}
                      </Text>
                      <Text style={styles.historyResult}>{log.result}</Text>
                    </View>
                    <Text style={styles.historyMeta}>
                      {auditActor(log)} · {formatDate(log.created_at)}
                    </Text>
                    <Text style={styles.hashText}>
                      Önceki: {shortenHash(log.previous_hash)}
                    </Text>
                    <Text style={styles.hashText}>
                      Kayıt: {shortenHash(log.entry_hash)}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Dosya bilgileri</Text>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Dosya türü</Text>
            <Text style={styles.infoValue}>
              {file.mime_type || "Bilinmiyor"}
            </Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Dosya boyutu</Text>
            <Text style={styles.infoValue}>{formatBytes(file.size_bytes)}</Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Dosya sahibi</Text>
            <Text style={styles.infoValue}>
              {file.is_owner
                ? "Siz"
                : file.owner_name || file.owner_email || "Bilinmiyor"}
            </Text>
          </View>

          {!file.is_owner && file.expires_at ? (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Erişim bitişi</Text>
              <Text style={styles.infoValue}>
                {formatDate(file.expires_at)}
              </Text>
            </View>
          ) : null}
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>İndirme</Text>

          {file.can_download ? (
            <>
              <Text style={styles.permissionText}>
                Bu dosyayı indirme yetkiniz bulunuyor.
              </Text>

              <TouchableOpacity
                style={[
                  styles.downloadButton,
                  isDownloading && styles.downloadButtonDisabled,
                ]}
                onPress={handleDownload}
                disabled={isDownloading}
              >
                {isDownloading ? (
                  <ActivityIndicator color="#ffffff" />
                ) : (
                  <Text style={styles.downloadButtonText}>Dosyayı indir</Text>
                )}
              </TouchableOpacity>
            </>
          ) : (
            <View style={styles.noPermissionBox}>
              <Text style={styles.noPermissionTitle}>İndirme izni yok</Text>
              <Text style={styles.noPermissionText}>
                Dosyayı görüntüleyebilirsiniz ancak sahibi indirme izni vermedi.
              </Text>
            </View>
          )}

          {downloadMessage ? (
            <Text
              style={
                downloadMessage === "Dosya başarıyla indirildi."
                  ? styles.successText
                  : styles.errorText
              }
            >
              {downloadMessage}
            </Text>
          ) : null}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: "#070d1e",
  },
  content: {
    padding: 16,
    gap: 16,
    paddingBottom: 40,
  },
  centerContent: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 12,
  },
  mutedText: {
    color: "#a8badb",
    fontSize: 15,
  },
  backButton: {
    alignSelf: "flex-start",
    paddingVertical: 8,
  },
  backButtonText: {
    color: "#75a9ff",
    fontSize: 16,
    fontWeight: "700",
  },
  fileHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  fileTypeBox: {
    width: 58,
    height: 58,
    borderRadius: 16,
    backgroundColor: "#1e3e83",
    alignItems: "center",
    justifyContent: "center",
  },
  fileTypeText: {
    color: "#72adff",
    fontWeight: "800",
    fontSize: 14,
  },
  fileTitleArea: {
    flex: 1,
    minWidth: 0,
  },
  fileName: {
    color: "#ffffff",
    fontWeight: "800",
    fontSize: 20,
    flexShrink: 1,
  },
  fileMeta: {
    color: "#9fb7df",
    fontSize: 14,
    marginTop: 5,
  },
  badge: {
    alignSelf: "flex-start",
    borderWidth: 1,
    borderColor: "#286b62",
    backgroundColor: "#103a38",
    borderRadius: 100,
    paddingVertical: 7,
    paddingHorizontal: 12,
  },
  badgeText: {
    color: "#7cf1c0",
    fontSize: 12,
    fontWeight: "800",
  },
  card: {
    backgroundColor: "#111d38",
    borderWidth: 1,
    borderColor: "#26477d",
    borderRadius: 18,
    padding: 18,
    gap: 14,
  },
  cardTitle: {
    color: "#ffffff",
    fontSize: 18,
    fontWeight: "800",
  },
  cardHeading: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  cardEyebrow: {
    color: "#72adff",
    fontSize: 11,
    fontWeight: "800",
    marginBottom: 2,
  },
  refreshText: {
    color: "#75a9ff",
    fontWeight: "800",
    padding: 4,
  },
  historyLoading: {
    alignItems: "center",
    gap: 10,
    paddingVertical: 16,
  },
  historyEmpty: {
    alignItems: "center",
    gap: 8,
    paddingVertical: 18,
  },
  historyEmptyIcon: {
    color: "#75a9ff",
    fontSize: 30,
  },
  historyEmptyTitle: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "800",
  },
  historyEmptyText: {
    color: "#a8badb",
    fontSize: 14,
    lineHeight: 20,
    textAlign: "center",
  },
  historyList: {
    gap: 14,
  },
  historyItem: {
    flexDirection: "row",
    gap: 10,
  },
  historyDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#5d9cff",
    marginTop: 5,
  },
  historyBody: {
    flex: 1,
    gap: 4,
  },
  historyTitleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 10,
    alignItems: "flex-start",
  },
  historyAction: {
    color: "#ffffff",
    fontWeight: "800",
    flex: 1,
    minWidth: 0,
  },
  historyResult: {
    color: "#70e3ab",
    fontSize: 12,
    fontWeight: "700",
  },
  historyMeta: {
    color: "#a8badb",
    fontSize: 12,
  },
  hashText: {
    color: "#7189b3",
    fontSize: 11,
  },
  infoRow: {
    gap: 4,
  },
  infoLabel: {
    color: "#91a9d1",
    fontSize: 13,
  },
  infoValue: {
    color: "#e8efff",
    fontSize: 15,
    fontWeight: "600",
  },
  permissionText: {
    color: "#b6c8e8",
    fontSize: 14,
    lineHeight: 20,
  },
  downloadButton: {
    minHeight: 50,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#2f69e8",
  },
  downloadButtonDisabled: {
    opacity: 0.65,
  },
  downloadButtonText: {
    color: "#ffffff",
    fontWeight: "800",
    fontSize: 16,
  },
  noPermissionBox: {
    backgroundColor: "#172541",
    borderRadius: 12,
    padding: 14,
    gap: 5,
  },
  noPermissionTitle: {
    color: "#d7e4ff",
    fontWeight: "800",
    fontSize: 15,
  },
  noPermissionText: {
    color: "#a7badb",
    fontSize: 14,
    lineHeight: 20,
  },
  successText: {
    color: "#70e3ab",
    fontSize: 14,
    fontWeight: "700",
  },
  errorContainer: {
    flex: 1,
    margin: 20,
    justifyContent: "center",
    alignItems: "center",
    gap: 14,
  },
  errorTitle: {
    color: "#ffffff",
    fontSize: 22,
    fontWeight: "800",
  },
  errorText: {
    color: "#ff8585",
    fontSize: 14,
    lineHeight: 21,
    textAlign: "center",
  },
  secondaryButton: {
    borderWidth: 1,
    borderColor: "#4069aa",
    borderRadius: 12,
    paddingHorizontal: 18,
    paddingVertical: 12,
    marginTop: 8,
  },
  secondaryButtonText: {
    color: "#b9ceff",
    fontSize: 15,
    fontWeight: "800",
  },
});
