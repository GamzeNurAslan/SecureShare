
import axios from "axios";

// Backend API adresi
const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL || "http://localhost:3000",
    timeout: 15000,
});

// Her isteğe JWT token ekle
api.interceptors.request.use(
    (config) => {
        const token = sessionStorage.getItem("token");

        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }

        return config;
    },
    (error) => Promise.reject(error)
);

// API hata mesajını al
export const getApiErrorMessage = (error) => {
    return (
        error.response?.data?.error ||
        error.response?.data?.message ||
        "Bir hata oluştu. Lütfen tekrar deneyin."
    );
};

// Kimlik doğrulama işlemleri
export const authAPI = {
    register: (userData) =>
        api.post("/api/auth/register", userData),

    login: (userData) =>
        api.post("/api/auth/login", userData),
};

// Dosya işlemleri
export const fileAPI = {
    // Dosyaları listele
    getFiles: () =>
        api.get("/api/files"),

    // Dosya yükle
    uploadFile: (file) => {
        const formData = new FormData();
        formData.append("file", file);

        return api.post("/api/files", formData);
    },

    // Dosyayı indir
    downloadFile: (fileId) =>
        api.get(`/api/files/${fileId}`, {
            responseType: "blob",
        }),

    // Dosyanın izinlerini listele
    getPermissions: (fileId) =>
        api.get(`/api/files/${fileId}/permissions`),

    // Kullanıcıya izin ver
    grantPermission: (fileId, permissionData) =>
        api.post(
            `/api/files/${fileId}/permissions`,
            permissionData
        ),

    // İzni kaldır
    revokePermission: (fileId, userId) =>
        api.delete(
            `/api/files/${fileId}/permissions/${userId}`
        ),
};

export default api;
