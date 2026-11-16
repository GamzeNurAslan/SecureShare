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
  getFileDetails,
  type FileDetails,
} from "../services/fileDetails";

type FileDetailScreenProps = {
  token: string;
  fileId: string;
  onBack: () => void;
  onSessionExpired: () => void;
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

export default function FileDetailScreen({
  token,
  fileId,
  onBack,
  onSessionExpired,
}: FileDetailScreenProps) {
  const [file, setFile] = useState<FileDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDownloading, setIsDownloading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
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
            <Text style={styles.fileName}>{file.original_name}</Text>
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
    padding: 20,
    gap: 16,
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
  },
  fileName: {
    color: "#ffffff",
    fontWeight: "800",
    fontSize: 21,
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