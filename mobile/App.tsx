import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

export default function App() {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [message, setMessage] = useState('');

  const isRegister = mode === 'register';

  const handleSubmit = () => {
    setMessage(
      isRegister
        ? 'Kayıt ekranı hazır. Backend bağlantısı sonraki adımda eklenecek.'
        : 'Giriş ekranı hazır. Backend bağlantısı sonraki adımda eklenecek.',
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="light" />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.container}
      >
        <View style={styles.card}>
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

          <TouchableOpacity style={styles.button} onPress={handleSubmit}>
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
  card: {
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
  button: {
    alignItems: 'center',
    backgroundColor: '#0284C7',
    borderRadius: 12,
    marginTop: 8,
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
});
