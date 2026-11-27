import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import * as SecureStore from "expo-secure-store";
import * as DocumentPicker from "expo-document-picker";
import { API_URL } from "./services/api";
import FileDetailScreen, {
  type MobileFile,
} from "./components/FileDetailScreen";

const TOKEN_KEY = "secureshare-token";

type FileItem = MobileFile;

class RequestError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "RequestError";
    this.status = status;
    Object.setPrototypeOf(this, RequestError.prototype);
  }
}

async function saveToken(token: string) {
  if (Platform.OS === "web") {
    window.localStorage.setItem(TOKEN_KEY, token);
  } else {
    await SecureStore.setItemAsync(TOKEN_KEY, token);
  }
}

async function getToken() {
  if (Platform.OS === "web") {
    return window.localStorage.getItem(TOKEN_KEY);
  }

  return SecureStore.getItemAsync(TOKEN_KEY);
}

async function removeToken() {
  if (Platform.OS === "web") {
    window.localStorage.removeItem(TOKEN_KEY);
  } else {
    await SecureStore.deleteItemAsync(TOKEN_KEY);
  }
}

async function requestApi(path: string, options: RequestInit = {}) {
  let response: Response;

  try {
    response = await fetch(`${API_URL}${path}`, options);
  } catch {
    throw new RequestError(
      0,
      "Sunucuya bağlanılamadı. Backend'in çalıştığını ve API adresini kontrol edin."
    );
  }

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new RequestError(
      response.status,
      data.error ||
        data.message ||
        `İşlem başarısız oldu. Kod: ${response.status}`
    );
  }

  return data;
}

function formatSize(bytes?: number) {
  if (!bytes) return "Boyut bilinmiyor";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function App() {
  const [token, setToken] = useState<string | null>(null);
  const [files, setFiles] = useState<FileItem[]>([]);
  const [selectedFile, setSelectedFile] = useState<FileItem | null>(null);

  const [registerMode, setRegisterMode] = useState(false);
  const [darkMode, setDarkMode] = useState(true);

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const clearAuthState = useCallback(async () => {
    await removeToken();
    setToken(null);
    setSelectedFile(null);
    setFiles([]);
    setEmail("");
    setPassword("");
    setConfirmPassword("");
    setMessage("");
    setError("");
  }, []);

  const handleSessionExpired = useCallback(async () => {
    await clearAuthState();
    setError("Oturumunuz sona erdi. Lütfen yeniden giriş yapın.");
  }, [clearAuthState]);

  const colors = darkMode
    ? {
        background: "#070b1b",
        card: "#111a31",
        input: "#1a2948",
        border: "#31528b",
        text: "#f6f8ff",
        muted: "#9db0d3",
        primary: "#2f6df6",
      }
    : {
        background: "#eef4ff",
        card: "#ffffff",
        input: "#f5f8fd",
        border: "#c6d7f5",
        text: "#14213d",
        muted: "#617596",
        primary: "#2864e9",
      };

  useEffect(() => {
    getToken().then((savedToken) => {
      if (savedToken) {
        setToken(savedToken);
      }
    });
  }, []);

  useEffect(() => {
    if (token) {
      loadFiles();
    }
  }, [token]);

  async function loadFiles() {
    if (!token) return;

    try {
      const data = await requestApi("/api/files", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      setFiles(Array.isArray(data) ? data : data.files || []);
    } catch (err) {
      if (err instanceof RequestError && err.status === 401) {
        await handleSessionExpired();
        return;
      }

      setError(err instanceof Error ? err.message : "Dosyalar alınamadı.");
    }
  }

  async function handleAuth() {
    setError("");
    setMessage("");

    if (!email.trim() || !password) {
      setError("E-posta ve parola zorunludur.");
      return;
    }

    if (registerMode) {
      if (!fullName.trim()) {
        setError("Ad soyad zorunludur.");
        return;
      }

      if (password.length < 8) {
        setError("Parola en az 8 karakter olmalıdır.");
        return;
      }

      if (password !== confirmPassword) {
        setError("Parolalar eşleşmiyor.");
        return;
      }
    }

    try {
      setLoading(true);

      const body = registerMode
        ? {
            fullName: fullName.trim(),
            email: email.trim(),
            password,
          }
        : {
            email: email.trim(),
            password,
          };

      const data = await requestApi(
        registerMode ? "/api/auth/register" : "/api/auth/login",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(body),
        },
      );

      const receivedToken = data.token || data.accessToken;

      if (registerMode && !receivedToken) {
        setRegisterMode(false);
        setPassword("");
        setConfirmPassword("");
        setMessage("Hesabınız oluşturuldu. Şimdi giriş yapabilirsiniz.");
        return;
      }

      if (!receivedToken) {
        throw new Error("Sunucudan token alınamadı.");
      }

      await saveToken(receivedToken);
      setToken(receivedToken);
      setPassword("");
      setConfirmPassword("");
      setMessage("Giriş başarılı.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "İşlem başarısız oldu.");
    } finally {
      setLoading(false);
    }
  }

  async function handleLogout() {
    await clearAuthState();
  }

  async function handleUpload() {
    if (!token) return;

    try {
      setLoading(true);
      setError("");
      setMessage("");

      const result = await DocumentPicker.getDocumentAsync({
        copyToCacheDirectory: true,
        multiple: false,
      });

      if (result.canceled || !result.assets?.length) {
        return;
      }

      const selectedFile = result.assets[0];
      const formData = new FormData();

      if (Platform.OS === "web") {
        const fileResponse = await fetch(selectedFile.uri);
        const blob = await fileResponse.blob();

        (formData as any).append(
          "file",
          blob,
          selectedFile.name || "dosya",
        );
      } else {
        (formData as any).append("file", {
          uri: selectedFile.uri,
          name: selectedFile.name || "dosya",
          type: selectedFile.mimeType || "application/octet-stream",
        });
      }

      await requestApi("/api/files", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      setMessage("Dosya başarıyla yüklendi.");
      await loadFiles();
    } catch (err) {
      if (err instanceof RequestError && err.status === 401) {
        await handleSessionExpired();
        return;
      }

      setError(err instanceof Error ? err.message : "Dosya yüklenemedi.");
    } finally {
      setLoading(false);
    }
  }

  if (!token) {
    return (
      <SafeAreaView
        style={[
          styles.safeArea,
          { backgroundColor: colors.background },
        ]}
      >
        <ScrollView contentContainerStyle={styles.centerContent}>
          <View
            style={[
              styles.card,
              {
                backgroundColor: colors.card,
                borderColor: colors.border,
              },
            ]}
          >
            <View style={styles.header}>
              <Text style={styles.logo}>S🔒 SecureShare</Text>

              <TouchableOpacity
                style={[
                  styles.modeButton,
                  { borderColor: colors.border },
                ]}
                onPress={() => setDarkMode(!darkMode)}
              >
                <Text>{darkMode ? "☀️ Açık mod" : "🌙 Koyu mod"}</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.badge}>GÜVENLİ DOSYA PLATFORMU</Text>

            <Text style={[styles.title, { color: colors.text }]}>
              {registerMode
                ? "Güvenli hesabınızı oluşturun"
                : "Dosyalarınızın kontrolü sizde"}
            </Text>

            <Text style={[styles.subtitle, { color: colors.muted }]}>
              Dosyalarınızı güçlü şifreleme ile koruyun, yalnızca izin
              verdiğiniz kişilerle güvenle paylaşın.
            </Text>

            {registerMode && (
              <>
                <Text style={[styles.label, { color: colors.text }]}>
                  Ad Soyad
                </Text>

                <TextInput
                  style={[
                    styles.input,
                    {
                      color: colors.text,
                      backgroundColor: colors.input,
                      borderColor: colors.border,
                    },
                  ]}
                  placeholder="Adınızı ve soyadınızı girin"
                  placeholderTextColor={colors.muted}
                  value={fullName}
                  onChangeText={setFullName}
                  autoCapitalize="words"
                />
              </>
            )}

            <Text style={[styles.label, { color: colors.text }]}>
              E-posta
            </Text>

            <TextInput
              style={[
                styles.input,
                {
                  color: colors.text,
                  backgroundColor: colors.input,
                  borderColor: colors.border,
                },
              ]}
              placeholder="ornek@email.com"
              placeholderTextColor={colors.muted}
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
            />

            <Text style={[styles.label, { color: colors.text }]}>
              Parola
            </Text>

            <TextInput
              style={[
                styles.input,
                {
                  color: colors.text,
                  backgroundColor: colors.input,
                  borderColor: colors.border,
                },
              ]}
              placeholder="Parolanızı girin"
              placeholderTextColor={colors.muted}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />

            {registerMode && (
              <>
                <Text style={[styles.label, { color: colors.text }]}>
                  Parola Tekrar
                </Text>

                <TextInput
                  style={[
                    styles.input,
                    {
                      color: colors.text,
                      backgroundColor: colors.input,
                      borderColor: colors.border,
                    },
                  ]}
                  placeholder="Parolanızı tekrar girin"
                  placeholderTextColor={colors.muted}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  secureTextEntry
                />
              </>
            )}

            {!!error && <Text style={styles.error}>{error}</Text>}
            {!!message && <Text style={styles.success}>{message}</Text>}

            <TouchableOpacity
              style={[
                styles.primaryButton,
                { backgroundColor: colors.primary },
              ]}
              onPress={handleAuth}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <Text style={styles.buttonText}>
                  {registerMode ? "Hesap Oluştur" : "Giriş Yap"}
                </Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => {
                setRegisterMode(!registerMode);
                setError("");
                setMessage("");
              }}
            >
              <Text
                style={[
                  styles.switchText,
                  { color: colors.primary },
                ]}
              >
                {registerMode
                  ? "Zaten hesabınız var mı? Giriş yapın"
                  : "Hesabınız yok mu? Kayıt olun"}
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  if (selectedFile) {
    return (
      <FileDetailScreen
        token={token}
        fileId={selectedFile.id}
        onBack={() => setSelectedFile(null)}
        onSessionExpired={handleSessionExpired}
      />
    );
  }

  return (
    <SafeAreaView
      style={[
        styles.safeArea,
        { backgroundColor: colors.background },
      ]}
    >
      <ScrollView contentContainerStyle={styles.dashboard}>
        <View style={styles.header}>
          <Text style={styles.logo}>S🔒 SecureShare</Text>

          <View style={styles.actions}>
            <TouchableOpacity
              style={[
                styles.modeButton,
                { borderColor: colors.border },
              ]}
              onPress={() => setDarkMode(!darkMode)}
            >
              <Text>{darkMode ? "☀️ Açık mod" : "🌙 Koyu mod"}</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={handleLogout}>
              <Text style={styles.logout}>Çıkış Yap</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View
          style={[
            styles.hero,
            {
              backgroundColor: colors.card,
              borderColor: colors.border,
            },
          ]}
        >
          <Text style={styles.badge}>GÜVENLİ DOSYA YÖNETİMİ</Text>

          <Text style={[styles.heroTitle, { color: colors.text }]}>
            Dosyalarım
          </Text>

          <Text style={[styles.subtitle, { color: colors.muted }]}>
            Şifrelenmiş dosyalarınızı güvenle yönetin ve paylaşın.
          </Text>

          <TouchableOpacity
            style={[
              styles.primaryButton,
              { backgroundColor: colors.primary },
            ]}
            onPress={handleUpload}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <Text style={styles.buttonText}>＋ Dosya Yükle</Text>
            )}
          </TouchableOpacity>

          {!!error && <Text style={styles.error}>{error}</Text>}
          {!!message && <Text style={styles.success}>{message}</Text>}
        </View>

        <Text style={[styles.filesTitle, { color: colors.text }]}>
          Dosya kasanız
        </Text>

        {files.length === 0 ? (
          <View
            style={[
              styles.emptyState,
              {
                backgroundColor: colors.card,
                borderColor: colors.border,
              },
            ]}
          >
            <Text style={styles.emptyStateIcon}>⌁</Text>
            <Text style={[styles.emptyStateTitle, { color: colors.text }]}>
              Güvenli kasanız hazır
            </Text>
            <Text style={[styles.empty, { color: colors.muted }]}>
              İlk dosyanızı şifreleyerek kasanıza ekleyin.
            </Text>
            <TouchableOpacity
              style={[styles.secondaryAction, { borderColor: colors.border }]}
              onPress={handleUpload}
              disabled={loading}
            >
              <Text
                style={[styles.secondaryActionText, { color: colors.primary }]}
              >
                İlk dosyayı yükle
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          files.map((file) => (
            <TouchableOpacity
              key={file.id}
              style={[
                styles.file,
                {
                  backgroundColor: colors.card,
                  borderColor: colors.border,
                },
              ]}
              activeOpacity={0.82}
              onPress={() => setSelectedFile(file)}
            >
              <Text style={styles.fileIcon}>📄</Text>

              <View style={{ flex: 1 }}>
                <Text style={[styles.fileName, { color: colors.text }]}>
                  {file.original_name}
                </Text>

                <Text style={[styles.fileMeta, { color: colors.muted }]}>
                  {formatSize(file.size_bytes)}
                </Text>
                <Text style={[styles.detailsHint, { color: colors.primary }]}>
                  Detaylar ve işlem geçmişi ›
                </Text>
              </View>

              <Text style={styles.encrypted}>ŞİFRELİ</Text>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  centerContent: {
    flexGrow: 1,
    justifyContent: "center",
    padding: 24,
  },
  dashboard: {
    padding: 24,
    paddingBottom: 60,
  },
  card: {
    width: "100%",
    maxWidth: 840,
    alignSelf: "center",
    padding: 42,
    borderRadius: 28,
    borderWidth: 1,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
  },
  logo: {
    color: "#4d91ff",
    fontSize: 28,
    fontWeight: "900",
  },
  modeButton: {
    paddingVertical: 11,
    paddingHorizontal: 15,
    borderRadius: 22,
    borderWidth: 1,
  },
  badge: {
    alignSelf: "flex-start",
    marginTop: 32,
    color: "#a8d4ff",
    backgroundColor: "#1b356d",
    paddingVertical: 9,
    paddingHorizontal: 15,
    borderRadius: 18,
    fontSize: 12,
    fontWeight: "900",
  },
  title: {
    marginTop: 38,
    fontSize: 40,
    fontWeight: "900",
  },
  subtitle: {
    marginTop: 14,
    fontSize: 18,
    lineHeight: 28,
  },
  label: {
    marginTop: 24,
    marginBottom: 8,
    fontSize: 16,
    fontWeight: "800",
  },
  input: {
    minHeight: 58,
    borderRadius: 17,
    borderWidth: 1,
    paddingHorizontal: 18,
    fontSize: 17,
  },
  primaryButton: {
    minHeight: 60,
    marginTop: 28,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
  },
  buttonText: {
    color: "#ffffff",
    fontSize: 19,
    fontWeight: "900",
  },
  switchText: {
    alignSelf: "center",
    marginTop: 24,
    fontWeight: "800",
  },
  error: {
    marginTop: 12,
    color: "#ff7c8e",
    fontWeight: "700",
  },
  success: {
    marginTop: 12,
    color: "#55d89a",
    fontWeight: "700",
  },
  actions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  logout: {
    color: "#ff9cad",
    fontWeight: "800",
  },
  hero: {
    width: "100%",
    maxWidth: 1040,
    alignSelf: "center",
    padding: 32,
    borderRadius: 26,
    borderWidth: 1,
  },
  heroTitle: {
    marginTop: 14,
    fontSize: 44,
    fontWeight: "900",
  },
  filesTitle: {
    maxWidth: 1040,
    width: "100%",
    alignSelf: "center",
    marginTop: 34,
    marginBottom: 14,
    fontSize: 28,
    fontWeight: "900",
  },
  empty: {
    alignSelf: "center",
    marginTop: 18,
  },
  emptyState: {
    width: "100%",
    maxWidth: 1040,
    alignSelf: "center",
    alignItems: "center",
    padding: 28,
    borderRadius: 20,
    borderWidth: 1,
  },
  emptyStateIcon: {
    color: "#72adff",
    fontSize: 42,
    fontWeight: "800",
  },
  emptyStateTitle: {
    marginTop: 8,
    fontSize: 20,
    fontWeight: "900",
  },
  secondaryAction: {
    marginTop: 18,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 11,
  },
  secondaryActionText: {
    fontWeight: "800",
  },
  file: {
    width: "100%",
    maxWidth: 1040,
    alignSelf: "center",
    minHeight: 78,
    marginBottom: 12,
    padding: 16,
    borderRadius: 18,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  fileIcon: {
    fontSize: 28,
  },
  fileName: {
    fontSize: 16,
    fontWeight: "900",
  },
  fileMeta: {
    marginTop: 5,
  },
  detailsHint: {
    marginTop: 8,
    fontSize: 12,
    fontWeight: "800",
  },
  encrypted: {
    color: "#55d89a",
    fontSize: 11,
    fontWeight: "900",
  },
});
