import { StatusBar } from 'expo-status-bar';
import * as DocumentPicker from 'expo-document-picker';
import * as SecureStore from 'expo-secure-store';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  Image,
} from 'react-native';

type Mode = 'login' | 'register';
type ThemeMode = 'dark' | 'light';

type FileItem = {
  id: string;
  original_name: string;
  mime_type?: string;
  size_bytes: number | string;
  created_at: string;
};

const API_BASE_URL = 'http://localhost:3000';
const TOKEN_KEY = 'secureshare_token';

const palettes = {
  dark: {
    background: '#070B1A',
    surface: '#10182E',
    surfaceStrong: '#111D3D',
    input: '#162542',
    border: '#2D477D',
    text: '#F8FAFC',
    muted: '#AFC0D5',
    subtle: '#8FA5C0',
    accent: '#60A5FA',
    primary: '#2563EB',
    badge: '#182A5A',
    badgeText: '#BAE6FD',
    success: '#86EFAC',
    error: '#FDA4AF',
  },
  light: {
    // Warm, low-glare neutrals keep the light theme readable without the
    // washed-out blue cast of the previous palette.
    background: '#F3F5F8',
    surface: '#FBFCFE',
    surfaceStrong: '#F7F9FC',
    input: '#F6F8FB',
    border: '#D6DEE9',
    text: '#1B2940',
    muted: '#607089',
    subtle: '#7D8BA0',
    accent: '#315FB2',
    primary: '#3568D4',
    badge: '#E9F0FA',
    badgeText: '#315FB2',
    success: '#26744A',
    error: '#B13C55',
  },
} as const;

type Palette = (typeof palettes)[ThemeMode];

async function saveToken(token: string) {
  if (Platform.OS === 'web') {
    (globalThis as any).localStorage?.setItem(TOKEN_KEY, token);
  } else {
    await SecureStore.setItemAsync(TOKEN_KEY, token);
  }
}

async function readToken() {
  if (Platform.OS === 'web') {
    return (globalThis as any).localStorage?.getItem(TOKEN_KEY) ?? null;
  }

  return SecureStore.getItemAsync(TOKEN_KEY);
}

async function clearToken() {
  if (Platform.OS === 'web') {
    (globalThis as any).localStorage?.removeItem(TOKEN_KEY);
  } else {
    await SecureStore.deleteItemAsync(TOKEN_KEY);
  }
}

export default function App() {
  const [mode, setMode] = useState<Mode>('login');
  const [token, setToken] = useState<string | null>(null);
  const [initializing, setInitializing] = useState(true);
  const [themeMode, setThemeMode] = useState<ThemeMode>('dark');
  const colors = palettes[themeMode];

  useEffect(() => {
    readToken()
      .then(setToken)
      .finally(() => setInitializing(false));
  }, []);

  if (initializing) {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color={colors.accent} />
          <Text style={[styles.loadingText, { color: colors.muted }]}>SecureShare yükleniyor...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (token) {
    return (
      <Dashboard
        token={token}
        colors={colors}
        themeMode={themeMode}
        onToggleTheme={() => setThemeMode((current) => (current === 'dark' ? 'light' : 'dark'))}
        onLogout={async () => {
          await clearToken();
          setToken(null);
        }}
      />
    );
  }

  return (
    <AuthScreen
      mode={mode}
      colors={colors}
      themeMode={themeMode}
      onToggleTheme={() => setThemeMode((current) => (current === 'dark' ? 'light' : 'dark'))}
      onModeChange={setMode}
      onSuccess={setToken}
    />
  );
}

function AuthScreen({
  mode,
  colors,
  themeMode,
  onToggleTheme,
  onModeChange,
  onSuccess,
}: {
  mode: Mode;
  colors: Palette;
  themeMode: ThemeMode;
  onToggleTheme: () => void;
  onModeChange: (mode: Mode) => void;
  onSuccess: (token: string) => void;
}) {
  const isRegister = mode === 'register';

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const fade = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fade, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();
  }, [fade]);

  useEffect(() => {
    if (Platform.OS !== 'web' || typeof document === 'undefined') return;

    const styleId = 'secureshare-password-reveal-fix';
    if (document.getElementById(styleId)) return;

    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = `
      [data-testid="secureshare-password-input"]::-ms-reveal,
      [data-testid="secureshare-password-input"]::-ms-clear,
      [data-testid="secureshare-password-input"]::-webkit-credentials-auto-fill-button {
        display: none !important;
        visibility: hidden !important;
        pointer-events: none !important;
      }
    `;
    document.head.appendChild(style);
  }, []);

  async function submit() {
    setLoading(true);
    setMessage('');

    try {
      const response = await fetch(
        `${API_BASE_URL}/api/auth/${isRegister ? 'register' : 'login'}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(
            isRegister
              ? { fullName, email, password }
              : { email, password },
          ),
        },
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'İşlem başarısız oldu.');
      }

      await saveToken(data.token);
      onSuccess(data.token);
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : 'Sunucuya bağlanılamadı.',
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <StatusBar style={themeMode === 'dark' ? 'light' : 'dark'} />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={[styles.authBackground, { backgroundColor: colors.background }]}
      >
        <ScrollView
          contentContainerStyle={styles.authScroll}
          keyboardShouldPersistTaps="handled"
        >
          <Animated.View
            style={[
              styles.authCard,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
                shadowColor: themeMode === 'light' ? '#7892B8' : '#1D4ED8',
                shadowOpacity: themeMode === 'light' ? 0.12 : 0.22,
              },
              {
                opacity: fade,
                transform: [
                  {
                    translateY: fade.interpolate({
                      inputRange: [0, 1],
                      outputRange: [18, 0],
                    }),
                  },
                ],
              },
            ]}
          >
            <View style={styles.authTopRow}>
              <View style={styles.brandRow}>
                <Image source={require('./assets/secureshare-logo.png')} style={styles.logoImage} resizeMode="contain" />
                <Text style={[styles.brandText, { color: colors.accent }]}>SecureShare</Text>
              </View>
              <ThemeToggle themeMode={themeMode} onPress={onToggleTheme} colors={colors} />
            </View>

            <View style={[styles.securityBadge, { backgroundColor: colors.badge, borderColor: colors.border }]}>
              <Text style={[styles.securityBadgeText, { color: colors.badgeText }]}>
                GÜVENLİ DOSYA PLATFORMU
              </Text>
            </View>

            <Animated.Text
              style={[
                styles.title,
                { color: colors.text },
                {
                  opacity: fade,
                  transform: [
                    {
                      translateY: fade.interpolate({
                        inputRange: [0, 1],
                        outputRange: [10, 0],
                      }),
                    },
                  ],
                },
              ]}
            >
              Dosyalarınızın kontrolü sizde
            </Animated.Text>

            <Animated.Text
              style={[
                styles.subtitle,
                { color: colors.muted },
                { opacity: fade },
              ]}
            >
              Dosyalarınızı güçlü şifreleme ile koruyun, yalnızca izin verdiğiniz kişilerle güvenle paylaşın.
            </Animated.Text>

            {isRegister && (
              <View style={styles.fieldGroup}>
                <Text style={[styles.fieldLabel, { color: colors.text }]}>Ad Soyad</Text>
                <TextInput
                  placeholder="Adınızı ve soyadınızı girin"
                  placeholderTextColor="#6E829E"
                  value={fullName}
                  onChangeText={setFullName}
                  style={[styles.input, { backgroundColor: colors.input, borderColor: colors.border, color: colors.text }]}
                />
              </View>
            )}

            <View style={styles.fieldGroup}>
              <Text style={[styles.fieldLabel, { color: colors.text }]}>E-posta</Text>
              <TextInput
                placeholder="ornek@email.com"
                placeholderTextColor="#6E829E"
                keyboardType="email-address"
                autoCapitalize="none"
                value={email}
                onChangeText={setEmail}
                style={[styles.input, { backgroundColor: colors.input, borderColor: colors.border, color: colors.text }]}
              />
            </View>

            <View style={styles.fieldGroup}>
              <Text style={[styles.fieldLabel, { color: colors.text }]}>Parola</Text>
              <View style={[styles.passwordInputWrap, { backgroundColor: colors.input, borderColor: colors.border }]}>
                <TextInput
                  testID="secureshare-password-input"
                  placeholder="Parolanızı girin"
                  placeholderTextColor="#6E829E"
                  secureTextEntry={!showPassword}
                  value={password}
                  onChangeText={setPassword}
                  style={[styles.passwordInput, { color: colors.text }]}
                />
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={showPassword ? 'Parolayı gizle' : 'Parolayı göster'}
                  onPress={() => setShowPassword((current) => !current)}
                  hitSlop={10}
                  style={styles.passwordToggle}
                >
                  <Text style={[styles.passwordToggleIcon, { color: themeMode === 'light' ? '#102A58' : '#FFFFFF' }]}>
                    {showPassword ? '◉' : '◌'}
                  </Text>
                </Pressable>
              </View>
            </View>

            <Pressable
              style={({ pressed }) => [
                styles.primaryButton,
                {
                  backgroundColor: colors.primary,
                  borderColor: colors.primary,
                  shadowColor: colors.primary,
                  shadowOpacity: themeMode === 'light' ? 0.18 : 0.35,
                },
                pressed && styles.buttonPressed,
              ]}
              onPress={submit}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.buttonText}>
                  {isRegister ? 'Hesap Oluştur' : 'Giriş Yap'}
                </Text>
              )}
            </Pressable>

            {message ? (
              <Text
                style={[
                  styles.errorMessage,
                  {
                    color: message.startsWith('Şifre sıfırlama')
                      ? colors.accent
                      : colors.error,
                  },
                ]}
              >
                {message}
              </Text>
            ) : null}

            <View style={styles.authLinks}>
              <Pressable
                style={({ pressed }) => [
                  styles.authLink,
                  { backgroundColor: colors.badge, borderColor: colors.border },
                  pressed && styles.buttonPressed,
                ]}
                onPress={() => {
                  onModeChange(isRegister ? 'login' : 'register');
                  setMessage('');
                }}
              >
                <Text style={styles.switchText}>
                  {isRegister ? (
                    <Text style={{ color: colors.accent }}>Giriş yap</Text>
                  ) : (
                    <>
                      <Text style={{ color: colors.muted }}>Hesabınız yok mu? </Text>
                      <Text style={{ color: colors.accent }}>Kayıt olun</Text>
                    </>
                  )}
                </Text>
              </Pressable>

              {!isRegister && (
                <Pressable
                  style={({ pressed }) => [
                    styles.authLink,
                    { backgroundColor: colors.surfaceStrong, borderColor: colors.border },
                    pressed && styles.buttonPressed,
                  ]}
                  onPress={() => setMessage('Şifre sıfırlama özelliği sonraki aşamada eklenecek.')}
                >
                  <Text style={[styles.forgotText, { color: colors.text }]}>Şifremi unuttum</Text>
                </Pressable>
              )}
            </View>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function ThemeToggle({
  themeMode,
  onPress,
  colors,
}: {
  themeMode: ThemeMode;
  onPress: () => void;
  colors: Palette;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Tema değiştir"
      onPress={onPress}
      style={({ pressed }) => [
        styles.themeToggle,
        { backgroundColor: colors.surfaceStrong, borderColor: colors.border },
        pressed && styles.buttonPressed,
      ]}
    >
      <Text style={styles.themeToggleIcon}>{themeMode === 'dark' ? '☀️' : '🌙'}</Text>
      <Text style={[styles.themeToggleText, { color: colors.text }]}>
        {themeMode === 'dark' ? 'Açık mod' : 'Koyu mod'}
      </Text>
    </Pressable>
  );
}

function getFileExtension(fileName: string) {
  const extension = fileName.split('.').pop()?.toUpperCase();
  return extension && extension.length <= 5 ? extension : 'FILE';
}

function Dashboard({
  token,
  colors,
  themeMode,
  onToggleTheme,
  onLogout,
}: {
  token: string;
  colors: Palette;
  themeMode: ThemeMode;
  onToggleTheme: () => void;
  onLogout: () => Promise<void>;
}) {
  const [files, setFiles] = useState<FileItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState('');
  const fade = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fade, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();
  }, [fade]);

  async function loadFiles() {
    try {
      const response = await fetch(`${API_BASE_URL}/api/files`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Dosyalar alınamadı.');
      }

      setFiles(data.files ?? []);
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : 'Dosyalar alınamadı.',
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadFiles();
  }, [token]);

  async function uploadFile() {
    const result = await DocumentPicker.getDocumentAsync({
      copyToCacheDirectory: true,
      multiple: false,
      type: '*/*',
    });

    if (result.canceled) {
      return;
    }

    const asset = result.assets[0];
    const formData = new FormData();

    if (Platform.OS === 'web') {
      const browserFile =
        (asset as any).file ??
        (await fetch(asset.uri).then((response) => response.blob()));

      formData.append(
        'file',
        browserFile,
        asset.name ?? 'dosya',
      );
    } else {
      formData.append(
        'file',
        {
          uri: asset.uri,
          name: asset.name ?? 'dosya',
          type: asset.mimeType ?? 'application/octet-stream',
        } as any,
      );
    }

    setUploading(true);
    setMessage('');

    try {
      const response = await fetch(`${API_BASE_URL}/api/files`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Dosya yüklenemedi.');
      }

      setMessage('Dosya başarıyla yüklendi.');
      await loadFiles();
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : 'Dosya yüklenemedi.',
      );
    } finally {
      setUploading(false);
    }
  }

  function formatSize(value: number | string) {
    const size = Number(value);

    if (size < 1024) return `${size} B`;
    if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;

    return `${(size / (1024 * 1024)).toFixed(1)} MB`;
  }

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <StatusBar style={themeMode === 'dark' ? 'light' : 'dark'} />

      <ScrollView contentContainerStyle={[styles.dashboardScroll, { backgroundColor: colors.background }]}>
        <Animated.View
          style={[
            styles.dashboardContainer,
            {
              opacity: fade,
              transform: [
                {
                  translateY: fade.interpolate({
                    inputRange: [0, 1],
                    outputRange: [16, 0],
                  }),
                },
              ],
            },
          ]}
        >
          <View style={styles.header}>
            <View style={styles.brandRow}>
              <Image source={require('./assets/secureshare-logo.png')} style={styles.logoImage} resizeMode="contain" />
              <Text style={[styles.brandText, { color: colors.accent }]}>SecureShare</Text>
            </View>

            <View style={styles.headerActions}>
              <ThemeToggle themeMode={themeMode} onPress={onToggleTheme} colors={colors} />
              <Pressable
                style={[styles.logoutButton, { backgroundColor: colors.surface, borderColor: colors.border }]}
                onPress={onLogout}
              >
                <Text style={styles.logoutText}>Çıkış Yap</Text>
              </Pressable>
            </View>
          </View>

          <View style={[styles.heroCard, { backgroundColor: colors.surfaceStrong, borderColor: colors.border }]}>
            <View style={styles.heroTopRow}>
              <View style={styles.heroCopy}>
                <Text style={styles.heroEyebrow}>GÜVENLİ DOSYA YÖNETİMİ</Text>

                <Text style={[styles.dashboardTitle, { color: colors.text }]}>
                  Dosyalarım
                </Text>

                <Text style={[styles.dashboardSubtitle, { color: colors.muted }]}>
                  Şifrelenmiş dosyalarınızı güvenle yönetin ve paylaşın.
                </Text>
              </View>
            </View>

            <Pressable
              style={({ pressed }) => [
                styles.uploadButton,
                {
                  backgroundColor: colors.primary,
                  borderColor: colors.primary,
                  shadowColor: colors.primary,
                  shadowOpacity: themeMode === 'light' ? 0.18 : 0.32,
                },
                pressed && styles.buttonPressed,
              ]}
              onPress={uploadFile}
              disabled={uploading}
            >
              {uploading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <>
                  <Text style={styles.uploadIcon}>＋</Text>
                  <Text style={styles.buttonText}>Dosya Yükle</Text>
                </>
              )}
            </Pressable>

            {message ? (
              <Text style={[styles.successMessage, { color: message.includes('başarı') ? colors.success : colors.error }]}>{message}</Text>
            ) : null}
          </View>

          <View style={styles.summaryRow}>
            <View style={[styles.summaryCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <View style={[styles.summaryIconBox, { backgroundColor: colors.badge }]}>
                <Text style={[styles.summaryIcon, { color: colors.accent }]}>▦</Text>
              </View>

              <View style={styles.summaryContent}>
                <Text style={[styles.summaryLabel, { color: colors.subtle }]}>TOPLAM DOSYA</Text>
                <Text style={[styles.summaryValue, { color: colors.text }]}>{files.length}</Text>
              </View>

              <View style={styles.summaryHintWrap}>
                <Text style={[styles.summaryHint, { color: colors.subtle }]}>
                  {files.length === 0 ? 'İlk dosyanı yükle' : 'Güvenle saklanıyor'}
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Dosya kasanız</Text>
            <Text style={[styles.sectionCaption, { color: colors.subtle }]}>
              {files.length ? `${files.length} kayıt` : 'Henüz kayıt yok'}
            </Text>
          </View>

          {loading ? (
            <View style={[styles.emptyCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <ActivityIndicator size="small" color="#38BDF8" />
              <Text style={[styles.emptyText, { color: colors.subtle }]}>Dosyalar yükleniyor...</Text>
            </View>
          ) : files.length === 0 ? (
            <View style={[styles.emptyCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <View style={[styles.emptyIconBox, { backgroundColor: colors.badge }]}>
                <Text style={[styles.emptyIcon, { color: colors.accent }]}>＋</Text>
              </View>
              <Text style={[styles.emptyTitle, { color: colors.text }]}>Kasınız hazır</Text>
              <Text style={[styles.emptyText, { color: colors.subtle }]}>
                İlk dosyanızı şifreleyerek güvenli kasanıza ekleyin.
              </Text>
              <Pressable
                style={({ pressed }) => [
                  styles.emptyUploadButton,
                  { borderColor: colors.border },
                  pressed && styles.buttonPressed,
                ]}
                onPress={uploadFile}
                disabled={uploading}
              >
                <Text style={[styles.emptyUploadText, { color: colors.accent }]}>İlk dosyayı yükle</Text>
              </Pressable>
            </View>
          ) : (
            files.map((file) => (
              <View
                style={[
                  styles.fileCard,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                    borderLeftColor: colors.accent,
                  },
                ]}
                key={file.id}
              >
                <View style={[styles.fileIconBox, { backgroundColor: colors.badge }]}>
                  <Text style={[styles.fileTypeText, { color: colors.accent }]}>
                    {getFileExtension(file.original_name)}
                  </Text>
                </View>

                <View style={styles.fileInfo}>
                  <Text style={[styles.fileName, { color: colors.text }]}>
                    {file.original_name}
                  </Text>

                  <Text style={[styles.fileMeta, { color: colors.subtle }]}>
                    {formatSize(file.size_bytes)} •{' '}
                    {new Date(file.created_at).toLocaleDateString('tr-TR')}
                  </Text>
                </View>

                <Text style={[styles.fileStatus, { backgroundColor: colors.badge, borderColor: colors.border, color: colors.success }]}>ŞİFRELİ</Text>
              </View>
            ))
          )}
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#070B1A',
  },
  centerContent: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
  },
  loadingText: {
    color: '#9DB0C9',
    fontSize: 14,
    marginTop: 12,
  },
  authBackground: {
    flex: 1,
    backgroundColor: '#070B1A',
  },
  authScroll: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 20,
  },
  authCard: {
    alignSelf: 'center',
    backgroundColor: '#10182E',
    borderColor: '#263B70',
    borderRadius: 28,
    borderWidth: 1,
    maxWidth: 560,
    padding: 30,
    shadowColor: '#1D4ED8',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.22,
    shadowRadius: 30,
    elevation: 14,
    width: '100%',
  },
  brandRow: {
    alignItems: 'center',
    flexDirection: 'row',
  },
  authTopRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  brandIcon: {
    fontSize: 27,
    marginRight: 10,
  },
  logoImage: {
    height: 42,
    marginRight: 10,
    width: 42,
  },
  brandText: {
    color: '#60A5FA',
    fontSize: 26,
    fontWeight: '800',
  },
  securityBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#182A5A',
    borderColor: '#3159B8',
    borderWidth: 1,
    borderRadius: 20,
    marginTop: 28,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  securityBadgeText: {
    color: '#7DD3FC',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
  },
  title: {
    color: '#F8FAFC',
    fontSize: 34,
    fontWeight: '800',
    marginTop: 24,
  },
  subtitle: {
    color: '#AFC0D5',
    fontSize: 16,
    lineHeight: 24,
    marginTop: 12,
  },
  fieldGroup: {
    marginTop: 20,
  },
  fieldLabel: {
    color: '#D9E6F5',
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#16273D',
    borderColor: '#27415F',
    borderRadius: 14,
    borderWidth: 1,
    color: '#F8FAFC',
    fontSize: 16,
    paddingHorizontal: 16,
    paddingVertical: 15,
  },
  passwordInputWrap: {
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: 'row',
    height: 54,
    overflow: 'hidden',
  },
  passwordInput: {
    backgroundColor: 'transparent',
    borderColor: 'transparent',
    borderWidth: 0,
    flex: 1,
    fontSize: 16,
    height: 54,
    outlineColor: 'transparent',
    outlineWidth: 0,
    paddingHorizontal: 16,
    paddingVertical: 0,
  },
  passwordToggle: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
    minWidth: 46,
  },
  passwordToggleIcon: {
    fontSize: 21,
    fontWeight: '800',
  },
  primaryButton: {
    alignItems: 'center',
    backgroundColor: '#2563EB',
    borderColor: '#60A5FA',
    borderWidth: 1,
    borderRadius: 14,
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 8,
    marginTop: 26,
    minHeight: 54,
    justifyContent: 'center',
  },
  buttonPressed: {
    opacity: 0.78,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
  },
  errorMessage: {
    color: '#FDA4AF',
    fontSize: 14,
    marginTop: 16,
    textAlign: 'center',
  },
  switchText: {
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'center',
  },
  authLinks: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    justifyContent: 'center',
    marginTop: 22,
  },
  authLink: {
    borderRadius: 18,
    borderWidth: 1,
    paddingHorizontal: 13,
    paddingVertical: 10,
  },
  forgotText: {
    fontSize: 13,
    fontWeight: '700',
  },
  themeToggle: {
    alignItems: 'center',
    borderRadius: 18,
    borderWidth: 1,
    flexDirection: 'row',
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  themeToggleIcon: {
    fontSize: 15,
  },
  themeToggleText: {
    fontSize: 11,
    fontWeight: '700',
    marginLeft: 6,
  },
  dashboardScroll: {
    flexGrow: 1,
  },
  dashboardContainer: {
    alignSelf: 'center',
    maxWidth: 920,
    paddingBottom: 60,
    paddingHorizontal: 24,
    paddingTop: 28,
    width: '100%',
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  headerActions: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  logoutButton: {
    backgroundColor: '#1D293B',
    borderColor: '#34465F',
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 15,
    paddingVertical: 9,
  },
  logoutText: {
    color: '#FDA4AF',
    fontSize: 13,
    fontWeight: '700',
  },
  heroCard: {
    backgroundColor: '#111D3D',
    borderColor: '#2E4D91',
    borderRadius: 24,
    borderWidth: 1,
    marginTop: 30,
    padding: 26,
  },
  heroTopRow: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  heroCopy: {
    flex: 1,
  },
  heroEyebrow: {
    color: '#38BDF8',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.2,
  },
  dashboardTitle: {
    color: '#F8FAFC',
    fontSize: 38,
    fontWeight: '800',
    marginTop: 10,
  },
  dashboardSubtitle: {
    color: '#AFC0D5',
    fontSize: 16,
    lineHeight: 23,
    marginTop: 8,
  },
  uploadButton: {
    alignItems: 'center',
    backgroundColor: '#2563EB',
    borderColor: '#60A5FA',
    borderWidth: 1,
    borderRadius: 15,
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 25,
    minHeight: 56,
    paddingHorizontal: 20,
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.32,
    shadowRadius: 16,
    elevation: 8,
  },
  uploadIcon: {
    color: '#FFFFFF',
    fontSize: 23,
    fontWeight: '300',
    marginRight: 7,
  },
  successMessage: {
    color: '#86EFAC',
    fontSize: 14,
    marginTop: 16,
    textAlign: 'center',
  },
  summaryRow: {
    flexDirection: 'row',
    marginTop: 16,
  },
  summaryCardGap: {
    marginRight: 12,
  },
  summaryCard: {
    backgroundColor: '#10182E',
    borderColor: '#263B70',
    borderRadius: 18,
    borderWidth: 1,
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 18,
    shadowColor: '#0B1024',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.24,
    shadowRadius: 14,
    elevation: 5,
  },
  summaryIconBox: {
    alignItems: 'center',
    borderRadius: 14,
    height: 48,
    justifyContent: 'center',
    marginRight: 14,
    width: 48,
  },
  summaryIcon: {
    fontSize: 25,
    fontWeight: '800',
  },
  summaryContent: {
    flex: 1,
  },
  summaryLabel: {
    color: '#8FA5C0',
    fontSize: 12,
    fontWeight: '700',
  },
  summaryValue: {
    color: '#F8FAFC',
    fontSize: 22,
    fontWeight: '800',
    marginTop: 3,
  },
  summaryHintWrap: {
    alignItems: 'flex-end',
    justifyContent: 'center',
    maxWidth: 120,
  },
  summaryHint: {
    fontSize: 12,
    fontWeight: '600',
    lineHeight: 17,
    textAlign: 'right',
  },
  sectionHeader: {
    alignItems: 'flex-end',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 34,
  },
  sectionTitle: {
    color: '#F8FAFC',
    fontSize: 23,
    fontWeight: '800',
  },
  sectionCaption: {
    color: '#7187A3',
    fontSize: 12,
  },
  emptyCard: {
    alignItems: 'center',
    backgroundColor: '#10182E',
    borderColor: '#263B70',
    borderRadius: 20,
    borderWidth: 1,
    marginTop: 14,
    padding: 34,
  },
  emptyIcon: {
    fontSize: 34,
    fontWeight: '300',
  },
  emptyIconBox: {
    alignItems: 'center',
    borderRadius: 17,
    height: 64,
    justifyContent: 'center',
    width: 64,
  },
  emptyTitle: {
    color: '#F8FAFC',
    fontSize: 18,
    fontWeight: '700',
    marginTop: 12,
  },
  emptyText: {
    color: '#8FA5C0',
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
  },
  emptyUploadButton: {
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 18,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  emptyUploadText: {
    fontSize: 13,
    fontWeight: '800',
  },
  fileCard: {
    alignItems: 'center',
    backgroundColor: '#10182E',
    borderColor: '#263B70',
    borderRadius: 18,
    borderWidth: 1,
    borderLeftWidth: 3,
    flexDirection: 'row',
    marginTop: 14,
    padding: 16,
    shadowColor: '#0B1024',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 14,
    elevation: 4,
  },
  fileIconBox: {
    alignItems: 'center',
    backgroundColor: '#1B2E64',
    borderRadius: 13,
    height: 48,
    justifyContent: 'center',
    marginRight: 14,
    width: 48,
  },
  fileIcon: {
    fontSize: 23,
  },
  fileTypeText: {
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.3,
    textAlign: 'center',
  },
  fileInfo: {
    flex: 1,
  },
  fileName: {
    color: '#F8FAFC',
    fontSize: 16,
    fontWeight: '700',
  },
  fileMeta: {
    color: '#8FA5C0',
    fontSize: 13,
    marginTop: 6,
  },
  fileStatus: {
    backgroundColor: '#123D38',
    borderColor: '#2B9B82',
    borderRadius: 10,
    borderWidth: 1,
    color: '#86EFAC',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
    overflow: 'hidden',
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
});
