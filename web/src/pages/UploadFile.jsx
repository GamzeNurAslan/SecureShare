
import { useState } from "react";
import { fileAPI, getApiErrorMessage } from "../services/api";

function UploadFile({ onUploadSuccess }) {
    const [selectedFile, setSelectedFile] = useState(null);
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState("");
    const [error, setError] = useState("");

    const handleUpload = async (e) => {
        e.preventDefault();

        if (!selectedFile) {
            setError("Lütfen bir dosya seçin.");
            return;
        }

        try {
            setLoading(true);
            setError("");
            setMessage("");

            await fileAPI.uploadFile(selectedFile);

            setMessage("Dosya başarıyla yüklendi.");
            setSelectedFile(null);

            e.target.reset();

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
            <h2>Dosya Yükle</h2>

            <form onSubmit={handleUpload}>
                <input
                    type="file"
                    onChange={(e) => setSelectedFile(e.target.files[0])}
                />

                <button type="submit" disabled={loading}>
                    {loading ? "Yükleniyor..." : "Dosyayı Yükle"}
                </button>
            </form>

            {message && <p className="success-message">{message}</p>}
            {error && <p className="error-message">{error}</p>}
        </div>
    );
}

export default UploadFile;
