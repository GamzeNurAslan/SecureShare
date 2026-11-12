import { useEffect, useState } from "react";
import { fileAPI, getApiErrorMessage } from "../services/api";

function MyFiles({ onShare }) {
    const [files, setFiles] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");


    useEffect(() => {
        let active = true;

        fileAPI.getFiles()
            .then((response) => {
                if (active) {
                    setFiles(response.data.files || []);
                }
            })
            .catch((err) => {
                if (active) {
                    setError(getApiErrorMessage(err));
                }
            })
            .finally(() => {
                if (active) {
                    setLoading(false);
                }
            });

        return () => {
            active = false;
        };
    }, []);

    if (loading) return <p>Dosyalar yükleniyor...</p>;

    if (error) {
        return <p className="error-message">{error}</p>;
    }

    return (
        <div className="files-container">
            <h2>Dosyalarım</h2>

            {files.length === 0 ? (
                <p>Henüz erişebildiğiniz bir dosya bulunmuyor.</p>
            ) : (
                <div className="file-list">
                    {files.map((file) => (
                        <div className="file-card" key={file.id}>
                            <div>
                                <h3>{file.original_name}</h3>
                                <p>
                                    Boyut: {(file.size_bytes / 1024).toFixed(2)} KB
                                </p>
                                <p>
                                    Tarih: {new Date(file.created_at).toLocaleDateString("tr-TR")}
                                </p>
                            </div>

                            <button
                                type="button"
                                onClick={() => onShare(file)}
                            >
                                Yetkileri Yönet
                            </button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

export default MyFiles;