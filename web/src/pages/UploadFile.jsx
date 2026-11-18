import { useState } from "react";
import { fileAPI, getApiErrorMessage } from "../services/api";

function UploadFile({ onUploadSuccess, fileInputRef }) {
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState("");
    const [error, setError] = useState("");

    const handleFileChange = async (event) => {
        const input = event.target;
        const selectedFile = input.files?.[0];

        if (!selectedFile) return;

        setError("");
        setMessage("");

        const allowedExtensions = [
            "pdf", "png", "jpg", "jpeg", "txt", "docx", "xlsx"
        ];

        const extension = selectedFile.name.split(".").pop().toLowerCase();

        if (!allowedExtensions.includes(extension)) {
            setError("Bu dosya türü desteklenmiyor.");
            input.value = "";
            return;
        }

        if (selectedFile.size === 0) {
            setError("Boş dosya yüklenemez.");
            input.value = "";
            return;
        }

        if (selectedFile.size > 50 * 1024 * 1024) {
            setError("Dosya boyutu 50 MB sınırını aşamaz.");
            input.value = "";
            return;
        }

        try {
            setLoading(true);

            await fileAPI.uploadFile(selectedFile);

            setMessage("Dosya başarıyla yüklendi.");
            input.value = "";

            if (onUploadSuccess) {
                onUploadSuccess();
            }
        } catch (err) {
            setError(getApiErrorMessage(err));
            input.value = "";
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="upload-container">
            <p className="dashboard-eyebrow">
                GÜVENLİ DOSYA YÖNETİMİ
            </p>

            <h1>Dosyalarım</h1>

            <p className="upload-description">
                Şifrelenmiş dosyalarınızı güvenle yönetin ve paylaşın.
            </p>

            <input
                ref={fileInputRef}
                className="hidden-file-input"
                type="file"
                accept=".pdf,.png,.jpg,.jpeg,.txt,.docx,.xlsx"
                onChange={handleFileChange}
                disabled={loading}
            />

            <button
                type="button"
                className="upload-primary-button"
                onClick={() => fileInputRef.current?.click()}
                disabled={loading}
            >
                <span aria-hidden="true">＋</span>
                {loading ? "Dosya yükleniyor..." : "Dosya Yükle"}
            </button>

            {loading && (
                <p className="upload-status" role="status" aria-live="polite">
                    Dosyanız yükleniyor, lütfen bekleyin.
                </p>
            )}

            {message && (
                <p className="success-message" role="status">
                    {message}
                </p>
            )}

            {error && (
                <p className="error-message" role="alert">
                    {error}
                </p>
            )}
        </div>
    );
}

export default UploadFile;
