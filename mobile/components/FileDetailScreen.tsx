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
  getFileAuditLogs,
  type AuditLog,
} from "../services/fileDetails";

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

type FileDetailScreenProps = {
  token: string;
  file: MobileFile;
  onBack: () => void;
  onSessionExpired: () => void;
};

type ErrorKind = "connection" | "access" | "server" | "generic";

function formatBytes(bytes?: number) {
  if (!Number.isFinite(bytes) || !bytes || bytes <= 0) {
    return "Boyut bilinmiyor";
  }

  const units = ["B", "KB", "MB", "GB"];
  const index = Math.min(
    Math.floor(Math.log(bytes) / Math.log(1024)),
    units.length - 1
  );

  return `${(bytes / 1024 ** index).toFixed(index === 0 ? 0 : 1)} ${units[index]}`;
}

function formatDate(value?: string) {
  if (!value) return "Tarih bilinmiyor";

  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "Tarih bilinmiyor"
    : date.toLocaleString("tr-TR");
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
  file,
  onBack,
  onSessionExpired,
}: FileDetailScreenProps) {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDownloading, setIsDownloading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [errorKind, setErrorKind] = useState<ErrorKind>("generic");
  const [downloadMessage, setDownloadMessage] = useState("");

  const loadAuditLogs = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage("");
    setErrorKind("generic");

    try {
      const response = await getFileAuditLogs(token, file.id);
      setLogs(Array.isArray(response.logs) ? response.logs : []);
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        onSessionExpired();
        return;
      }

      if (error instanceof ApiError && [403, 404].includes(error.status)) {
        setErrorKind("access");
      } else if (error instanceof ApiError && error.status >= 500) {
        setErrorKind("server");
      } else if (!(error instanceof ApiError)) {
        setErrorKind("connection");
      }

      setErrorMessage(
        error instanceof Error
          ? error.message
          : "İşlem geçmişi yüklenemedi."
      );
    } finally {
      setIsLoading(false);
    }
  }, [file.id, onSessionExpired, token]);

  useEffect(() => {
    loadAuditLogs();
  }, [loadAuditLogs]);

  async function handleDownload() {
    if (!file.can_download) return;

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
          <ActivityIndicator size="large" color="#5d9cff" />
          <Text style={styles.mutedText}>İşlem geçmişi yükleniyor...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (errorMessage) {
    const title =
      errorKind === "access"
        ? "Erişim reddedildi"
        : errorKind === "connection"
          ? "Bağlantı kurulamadı"
          : errorKind === "server"
            ? "Sunucu hatası"
            : "İşlem başarısız";

    return (
      <SafeAreaView style={styles.page}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorIcon}>
            {errorKind === "access" ? "🔒" : "⚠️"}
          </Text>
          <Text style={styles.errorTitle}>{title}</Text>
          <Text style={styles.errorText}>{errorMessage}</Text>

          {errorKind === "access" ? (
            <TouchableOpacity style={styles.secondaryButton} onPress={onBack}>
              <Text style={styles.secondaryButtonText}>Dosyalara dön</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.errorActions}>
              <TouchableOpacity
                style={styles.secondaryButton}
                onPress={loadAuditLogs}
              >
                <Text style={styles.secondaryButtonText}>Tekrar dene</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.linkButton} onPress={onBack}>
                <Text style={styles.linkButtonText}>Dosyalara dön</Text>
              </TouchableOpacity>
            </View>
          )}
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
            <Text style={styles.fileName}>{file.original_name}</Text>
            <Text style={styles.fileMeta}>
              {formatBytes(file.size_bytes)} · {formatDate(file.created_at)}
            </Text>
          </View>
        </View>

        <View style={styles.badge}>
          <Text style={styles.badgeText}>
            GÜVENLİ DOSYA
          </Text>
        </View>

        <View style={styles.card}>
          <View style={styles.cardHeading}>
            <View>
              <Text style={styles.cardEyebrow}>SECURESHARE</Text>
              <Text style={styles.cardTitle}>İşlem geçmişi</Text>
            </View>
            <TouchableOpacity onPress={loadAuditLogs}>
              <Text style={styles.refreshText}>Yenile</Text>
            </TouchableOpacity>
          </View>

          {logs.length === 0 ? (
            <View style={styles.emptyHistory}>
              <Text style={styles.emptyHistoryIcon}>◌</Text>
              <Text style={styles.emptyHistoryTitle}>Henüz işlem yok</Text>
              <Text style={styles.emptyHistoryText}>
                Bu dosya için görüntülenecek bir audit kaydı bulunmuyor.
              </Text>
            </View>
          ) : (
            <View style={styles.logList}>
              {logs.map((log) => (
                <View style={styles.logItem} key={String(log.id)}>
                  <View style={styles.logDot} />
                  <View style={styles.logBody}>
                    <View style={styles.logTitleRow}>
                      <Text style={styles.logAction}>{log.action}</Text>
                      <Text style={styles.logResult}>{log.result}</Text>
                    </View>
                    <Text style={styles.logMeta}>
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
                Dosyayı görüntüleyebilirsiniz ancak indirme izniniz bulunmuyor.
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
  page: { flex: 1, backgroundColor: "#070d1e" },
  content: { padding: 20, gap: 16, paddingBottom: 48 },
  centerContent: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 12,
  },
  mutedText: { color: "#a8badb", fontSize: 15 },
  backButton: { alignSelf: "flex-start", paddingVertical: 8 },
  backButtonText: { color: "#75a9ff", fontSize: 16, fontWeight: "700" },
  fileHeader: { flexDirection: "row", alignItems: "center", gap: 14 },
  fileTypeBox: {
    width: 58,
    height: 58,
    borderRadius: 16,
    backgroundColor: "#1e3e83",
    alignItems: "center",
    justifyContent: "center",
  },
  fileTypeText: { color: "#72adff", fontWeight: "800", fontSize: 14 },
  fileTitleArea: { flex: 1 },
  fileName: { color: "#ffffff", fontWeight: "800", fontSize: 21 },
  fileMeta: { color: "#9fb7df", fontSize: 14, marginTop: 5 },
  badge: {
    alignSelf: "flex-start",
    borderWidth: 1,
    borderColor: "#286b62",
    backgroundColor: "#103a38",
    borderRadius: 100,
    paddingVertical: 7,
    paddingHorizontal: 12,
  },
  badgeText: { color: "#7cf1c0", fontSize: 12, fontWeight: "800" },
  card: {
    backgroundColor: "#111d38",
    borderWidth: 1,
    borderColor: "#26477d",
    borderRadius: 18,
    padding: 18,
    gap: 14,
  },
  cardHeading: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  cardEyebrow: { color: "#72adff", fontSize: 11, fontWeight: "800" },
  cardTitle: { color: "#ffffff", fontSize: 19, fontWeight: "800" },
  refreshText: { color: "#75a9ff", fontWeight: "800", padding: 4 },
  emptyHistory: { alignItems: "center", paddingVertical: 22, gap: 8 },
  emptyHistoryIcon: { color: "#75a9ff", fontSize: 32 },
  emptyHistoryTitle: { color: "#ffffff", fontSize: 17, fontWeight: "800" },
  emptyHistoryText: {
    color: "#a8badb",
    fontSize: 14,
    lineHeight: 20,
    textAlign: "center",
  },
  logList: { gap: 14 },
  logItem: { flexDirection: "row", gap: 10 },
  logDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#5d9cff",
    marginTop: 5,
  },
  logBody: { flex: 1, gap: 4 },
  logTitleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 10,
  },
  logAction: { color: "#ffffff", fontWeight: "800", flex: 1 },
  logResult: { color: "#70e3ab", fontSize: 12, fontWeight: "700" },
  logMeta: { color: "#a8badb", fontSize: 12 },
  hashText: { color: "#7189b3", fontSize: 11 },
  permissionText: { color: "#b6c8e8", fontSize: 14, lineHeight: 20 },
  downloadButton: {
    minHeight: 50,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#2f69e8",
  },
  downloadButtonDisabled: { opacity: 0.65 },
  downloadButtonText: { color: "#ffffff", fontWeight: "800", fontSize: 16 },
  noPermissionBox: {
    backgroundColor: "#172541",
    borderRadius: 12,
    padding: 14,
    gap: 5,
  },
  noPermissionTitle: { color: "#d7e4ff", fontWeight: "800", fontSize: 15 },
  noPermissionText: { color: "#a7badb", fontSize: 14, lineHeight: 20 },
  successText: { color: "#70e3ab", fontSize: 14, fontWeight: "700" },
  errorContainer: {
    flex: 1,
    margin: 20,
    justifyContent: "center",
    alignItems: "center",
    gap: 14,
  },
  errorIcon: { fontSize: 30 },
  errorTitle: { color: "#ffffff", fontSize: 22, fontWeight: "800" },
  errorText: {
    color: "#ff8585",
    fontSize: 14,
    lineHeight: 21,
    textAlign: "center",
  },
  errorActions: { alignItems: "center", gap: 10 },
  secondaryButton: {
    borderWidth: 1,
    borderColor: "#4069aa",
    borderRadius: 12,
    paddingHorizontal: 18,
    paddingVertical: 12,
    marginTop: 8,
  },
  secondaryButtonText: { color: "#b9ceff", fontSize: 15, fontWeight: "800" },
  linkButton: { padding: 8 },
  linkButtonText: { color: "#75a9ff", fontWeight: "700" },
});
