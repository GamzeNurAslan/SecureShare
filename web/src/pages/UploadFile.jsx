
import { useState } from "react";
import { fileAPI, getApiErrorMessage } from "../services/api";

function UploadFile({ onUploadSuccess, fileInputRef }) {
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState("");
    const [error, setError] = useState("");

    const handleFileChange = async (event) => {
        const selectedFile = event.target.files?.[0];

        if (!selectedFile) return;

        try {
            setLoading(true);
            setError("");
            setMessage("");

            await fileAPI.uploadFile(selectedFile);

            setMessage("Dosya başarıyla yüklendi.");
            event.target.value = "";

            if (onUploadSuccess) {
                onUploadSuccess();
            }
        } catch (err) {
            setError(getApiErrorMessage(err));
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="upload-container">
            <p className="dashboard-eyebrow">GÜVENLİ DOSYA YÖNETİMİ</p>
            <h1>Dosyalarım</h1>
            <p className="upload-description">
                Şifrelenmiş dosyalarınızı güvenle yönetin ve paylaşın.
            </p>

            <input
                ref={fileInputRef}
                className="hidden-file-input"
                type="file"
                onChange={handleFileChange}
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

            {message && <p className="success-message">{message}</p>}
            {error && <p className="error-message">{error}</p>}
        </div>
    );
}

export default UploadFile;
