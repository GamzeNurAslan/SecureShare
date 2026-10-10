import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

type Mode = 'login' | 'register';

const files = [
  { name: 'proje-raporu.pdf', size: '2.4 MB', date: 'Bugün' },
  { name: 'tasarim-notlari.docx', size: '840 KB', date: 'Dün' },
  { name: 'sunum.pptx', size: '5.1 MB', date: '8 Ekim' },
];

export default function App() {
  const [mode, setMode] = useState<Mode>('login');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [message, setMessage] = useState('');

  if (isAuthenticated) {
    return (
      <Dashboard
        onLogout={() => {
          setIsAuthenticated(false);
          setMessage('');
        }}
      />
    );
  }

  const isRegister = mode === 'register';

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="light" />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.container}
      >
        <View style={styles.authCard}>
          <Text style={styles.logo}>🔐 SecureShare</Text>
          <Text style={styles.title}>Dosyalarınız güvende</Text>
          <Text style={styles.subtitle}>
            Dosyalarınızı şifreleyin ve yalnızca yetkilendirdiğiniz kişilerle paylaşın.
          </Text>

          {isRegister && (
            <TextInput
              placeholder="Ad Soyad"
              placeholderTextColor="#94A3B8"
              style={styles.input}
            />
          )}

          <TextInput
            placeholder="E-posta"
            placeholderTextColor="#94A3B8"
            keyboardType="email-address"
            autoCapitalize="none"
            style={styles.input}
          />

          <TextInput
            placeholder="Parola"
            placeholderTextColor="#94A3B8"
            secureTextEntry
            style={styles.input}
          />

          <TouchableOpacity
            style={styles.primaryButton}
            onPress={() => setIsAuthenticated(true)}
          >
            <Text style={styles.buttonText}>
              {isRegister ? 'Kayıt Ol' : 'Giriş Yap'}
            </Text>
          </TouchableOpacity>

          {message ? <Text style={styles.message}>{message}</Text> : null}

          <TouchableOpacity
            onPress={() => {
              setMode(isRegister ? 'login' : 'register');
              setMessage('');
            }}
          >
            <Text style={styles.switchText}>
              {isRegister
                ? 'Zaten hesabınız var mı? Giriş yapın'
                : 'Hesabınız yok mu? Kayıt olun'}
            </Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function Dashboard({ onLogout }: { onLogout: () => void }) {
  const [uploadMessage, setUploadMessage] = useState('');

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="light" />
      <ScrollView contentContainerStyle={styles.dashboardContainer}>
        <View style={styles.header}>
          <Text style={styles.logo}>🔐 SecureShare</Text>
          <TouchableOpacity onPress={onLogout}>
            <Text style={styles.logoutText}>Çıkış</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.dashboardTitle}>Dosyalarım</Text>
        <Text style={styles.dashboardSubtitle}>
          Şifrelenmiş dosyalarınızı buradan yönetin.
        </Text>

        <TouchableOpacity
          style={styles.uploadButton}
          onPress={() => setUploadMessage('Dosya yükleme alanı sonraki adımda eklenecek.')}
        >
          <Text style={styles.buttonText}>+ Dosya Yükle</Text>
        </TouchableOpacity>

        {uploadMessage ? (
          <Text style={styles.message}>{uploadMessage}</Text>
        ) : null}

        <Text style={styles.sectionTitle}>Son dosyalar</Text>

        {files.map((file) => (
          <View style={styles.fileCard} key={file.name}>
            <Text style={styles.fileIcon}>📄</Text>
            <View style={styles.fileInfo}>
              <Text style={styles.fileName}>{file.name}</Text>
              <Text style={styles.fileMeta}>
                {file.size} • {file.date}
              </Text>
            </View>
            <Text style={styles.moreIcon}>⋯</Text>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#0B1020',
  },
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 24,
  },
  authCard: {
    alignSelf: 'center',
    width: '100%',
    maxWidth: 520,
    backgroundColor: '#111827',
    borderRadius: 24,
    padding: 24,
  },
  logo: {
    color: '#38BDF8',
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 28,
  },
  title: {
    color: '#F8FAFC',
    fontSize: 30,
    fontWeight: '700',
    marginBottom: 10,
  },
  subtitle: {
    color: '#CBD5E1',
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 26,
  },
  input: {
    backgroundColor: '#1E293B',
    borderRadius: 12,
    color: '#F8FAFC',
    fontSize: 16,
    marginBottom: 14,
    padding: 16,
  },
  primaryButton: {
    alignItems: 'center',
    backgroundColor: '#0284C7',
    borderRadius: 12,
    marginTop: 8,
    padding: 16,
  },
  uploadButton: {
    alignItems: 'center',
    backgroundColor: '#0284C7',
    borderRadius: 12,
    marginTop: 24,
    padding: 16,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  message: {
    color: '#86EFAC',
    fontSize: 13,
    marginTop: 16,
    textAlign: 'center',
  },
  switchText: {
    color: '#7DD3FC',
    fontSize: 14,
    marginTop: 22,
    textAlign: 'center',
  },
  dashboardContainer: {
    alignSelf: 'center',
    padding: 24,
    width: '100%',
    maxWidth: 900,
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  logoutText: {
    color: '#FCA5A5',
    fontSize: 14,
  },
  dashboardTitle: {
    color: '#F8FAFC',
    fontSize: 32,
    fontWeight: '700',
    marginTop: 24,
  },
  dashboardSubtitle: {
    color: '#CBD5E1',
    fontSize: 15,
    marginTop: 8,
  },
  sectionTitle: {
    color: '#F8FAFC',
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 14,
    marginTop: 32,
  },
  fileCard: {
    alignItems: 'center',
    backgroundColor: '#111827',
    borderRadius: 16,
    flexDirection: 'row',
    marginBottom: 12,
    padding: 16,
  },
  fileIcon: {
    fontSize: 25,
    marginRight: 14,
  },
  fileInfo: {
    flex: 1,
  },
  fileName: {
    color: '#F8FAFC',
    fontSize: 16,
    fontWeight: '600',
  },
  fileMeta: {
    color: '#94A3B8',
    fontSize: 13,
    marginTop: 5,
  },
  moreIcon: {
    color: '#CBD5E1',
    fontSize: 24,
  },
});