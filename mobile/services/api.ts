export const API_URL = process.env.EXPO_PUBLIC_API_URL?.replace(/\/$/, "");

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
    "message" in data &&
    typeof (data as { message: unknown }).message === "string"
  ) {
    return (data as { message: string }).message;
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