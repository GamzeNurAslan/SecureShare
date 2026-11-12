
import { useEffect, useState } from "react";
import { fileAPI, getApiErrorMessage } from "../services/api";

function MyFiles({ onShare, userId }) {
    const [files, setFiles] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        let cancelled = false;

        const loadFiles = async () => {
            try {
                const response = await fileAPI.getFiles();

                if (!cancelled) {
                    setFiles(response.data.files || []);
                }
            } catch (err) {
                if (!cancelled) {
                    setError(getApiErrorMessage(err));
                }
            } finally {
                if (!cancelled) {
                    setLoading(false);
                }
            }
        };

        loadFiles();

        return () => {
            cancelled = true;
        };
    }, []);

    const handleDownload = async (file) => {
        try {
            setError("");

            const response = await fileAPI.downloadFile(file.id);

            const blob = new Blob([response.data], {
                type: file.mime_type || "application/octet-stream",
            });

            const url = window.URL.createObjectURL(blob);
            const link = document.createElement("a");

            link.href = url;
            link.download = file.original_name || "dosya";

            document.body.appendChild(link);
            link.click();
            link.remove();

            window.URL.revokeObjectURL(url);
        } catch (err) {
            setError(getApiErrorMessage(err));
        }
    };

    const handleDelete = async (fileId) => {
        const confirmed = window.confirm(
            "Bu dosyayı silmek istediğinize emin misiniz? Bu işlem geri alınamaz."
        );

        if (!confirmed) return;

        try {
            setError("");

            await fileAPI.deleteFile(fileId);

            setFiles((previousFiles) =>
                previousFiles.filter((file) => file.id !== fileId)
            );
        } catch (err) {
            setError(getApiErrorMessage(err));
        }
    };

    const formatSize = (bytes) => {
        if (!bytes) return "0 B";

        const units = ["B", "KB", "MB", "GB"];
        const index = Math.min(
            Math.floor(Math.log(bytes) / Math.log(1024)),
            units.length - 1
        );

        return `${(bytes / Math.pow(1024, index)).toFixed(2)} ${units[index]}`;
    };

    if (loading) {
        return <p>Dosyalar yükleniyor...</p>;
    }

    return (
        <section className="my-files">
            <h2>Dosyalarım ve Paylaşılan Dosyalar</h2>

            {error && (
                <div className="error-message">
                    {error}
                </div>
            )}

            {files.length === 0 ? (
                <p>Henüz erişebildiğiniz bir dosya bulunmuyor.</p>
            ) : (
                <div className="file-list">
                    {files.map((file) => {
                        const isOwner =
                            String(file.owner_id) === String(userId);

                        return (
                            <div className="file-card" key={file.id}>
                                <div className="file-info">
                                    <h3>{file.original_name}</h3>

                                    <p>
                                        Boyut: {formatSize(Number(file.size_bytes))}
                                    </p>

                                    <p>
                                        Yüklenme tarihi:{" "}
                                        {file.created_at
                                            ? new Date(file.created_at).toLocaleString("tr-TR")
                                            : "-"}
                                    </p>

                                    <p>
                                        {isOwner
                                            ? "Dosya sahibi sizsiniz."
                                            : "Sizinle paylaşılmış dosya."}
                                    </p>
                                </div>

                                <div className="file-actions">
                                    <button
                                        type="button"
                                        onClick={() => onShare(file)}
                                    >
                                        Dosya Detayı
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() => handleDownload(file)}
                                    >
                                        İndir
                                    </button>

                                    {isOwner && (
                                        <>
                                            <button
                                                type="button"
                                                onClick={() => onShare(file)}
                                            >
                                                Paylaşım Yetkileri
                                            </button>

                                            <button
                                                type="button"
                                                onClick={() => handleDelete(file.id)}
                                            >
                                                Dosyayı Sil
                                            </button>
                                        </>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </section>
    );
}

export default MyFiles;
