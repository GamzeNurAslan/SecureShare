import AsyncStorage from "@react-native-async-storage/async-storage";

const SESSION_KEY = "@secureshare_session";

export type Session = {
  token: string;
  user: {
    id: string;
    full_name: string;
    email: string;
  };
};

export async function saveSession(session: Session) {
  await AsyncStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

export async function getSession(): Promise<Session | null> {
  const savedSession = await AsyncStorage.getItem(SESSION_KEY);

  if (!savedSession) {
    return null;
  }

  try {
    const session = JSON.parse(savedSession) as Session;

    if (!session.token || !session.user?.id) {
      await clearSession();
      return null;
    }

    return session;
  } catch {
    await clearSession();
    return null;
  }
}

export async function clearSession() {
  await AsyncStorage.removeItem(SESSION_KEY);
}