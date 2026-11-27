import { Platform } from "react-native";

const configuredApiUrl = process.env.EXPO_PUBLIC_API_URL?.trim();
const fallbackApiUrl =
  Platform.OS === "web" ? "http://127.0.0.1:3000" : "http://192.168.1.100:3000";
const normalizedApiUrl = configuredApiUrl
  ? /^https?:\/\//i.test(configuredApiUrl)
    ? configuredApiUrl
    : `http://${configuredApiUrl}`
  : fallbackApiUrl;

export const API_URL = normalizedApiUrl.replace(/\/$/, "");

export class ApiError extends Error {
  status: number;
  data: unknown;

  constructor(status: number, message: string, data: unknown = null) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.data = data;

    Object.setPrototypeOf(this, ApiError.prototype);
  }
}

type ApiRequestOptions = Omit<RequestInit, "headers"> & {
  headers?: Record<string, string>;
};

function getErrorMessage(data: unknown, fallback: string) {
  if (
    data &&
    typeof data === "object" &&
    ("message" in data || "error" in data)
  ) {
    const message = (data as { message?: unknown }).message;
    const error = (data as { error?: unknown }).error;

    if (typeof message === "string") return message;
    if (typeof error === "string") return error;
  }

  return fallback;
}

export async function apiRequest<T>(
  path: string,
  options: ApiRequestOptions = {},
  token?: string
): Promise<T> {
  if (!API_URL) {
    throw new Error(
      "EXPO_PUBLIC_API_URL tanımlı değil. mobile/.env dosyasını kontrol edin."
    );
  }

  const isFormData =
    typeof FormData !== "undefined" && options.body instanceof FormData;

  const headers: Record<string, string> = {
    ...(isFormData ? {} : { "Content-Type": "application/json" }),
    ...(options.headers ?? {}),
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  let response: Response;

  try {
    response = await fetch(`${API_URL}${path}`, {
      ...options,
      headers,
    });
  } catch {
    throw new Error(
      "Sunucuya bağlanılamadı. Backend'in çalıştığını ve API adresini kontrol edin."
    );
  }

  const contentType = response.headers.get("content-type") ?? "";
  const data: unknown = contentType.includes("application/json")
    ? await response.json().catch(() => null)
    : await response.text().catch(() => null);

  if (!response.ok) {
    throw new ApiError(
      response.status,
      getErrorMessage(data, "İşlem gerçekleştirilemedi."),
      data
    );
  }

  return data as T;
}
