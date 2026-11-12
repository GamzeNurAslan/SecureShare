
import axios from "axios";

const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL || "http://localhost:3000",
    timeout: 15000,
});

// JWT token otomatik eklenir.
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

// API hata mesajları
export const getApiErrorMessage = (error) => {
    if (error.response) {
        return (
            error.response.data?.error ||
            error.response.data?.message ||
            `Sunucu hatası: ${error.response.status}`
        );
    }

    if (error.request) {
        return "Sunucuya ulaşılamıyor. Backend çalışıyor mu?";
    }

    return error.message || "Beklenmeyen bir hata oluştu.";
};

// Kimlik doğrulama işlemleri
export const authAPI = {
    register: (userData) => api.post("/api/auth/register", userData),
    login: (userData) => api.post("/api/auth/login", userData),
};

// Dosya işlemleri
export const fileAPI = {
    getFiles: () => api.get("/api/files"),

    uploadFile: (file) => {
        const formData = new FormData();
        formData.append("file", file);

        return api.post("/api/files", formData);
    },

    searchUsers: (query) =>
        api.get("/api/files/users/search", {
            params: { q: query },
        }),

    downloadFile: (fileId) =>
        api.get(`/api/files/${fileId}`, {
            responseType: "blob",
        }),

    deleteFile: (fileId) =>
        api.delete(`/api/files/${fileId}`),

    getPermissions: (fileId) =>
        api.get(`/api/files/${fileId}/permissions`),

    grantPermission: (fileId, permissionData) =>
        api.post(`/api/files/${fileId}/permissions`, permissionData),

    updatePermission: (fileId, permissionData) =>
        api.post(`/api/files/${fileId}/permissions`, permissionData),

    revokePermission: (fileId, userId) =>
        api.delete(`/api/files/${fileId}/permissions/${userId}`),
};

export default api;
