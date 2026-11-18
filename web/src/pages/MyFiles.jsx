
import { useEffect, useState } from "react";
import { fileAPI, getApiErrorMessage } from "../services/api";

function MyFiles({ onShare, userId, onFilesChange, onUploadClick }) {
    const [files, setFiles] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [previewFile, setPreviewFile] = useState(null);
    const [previewUrl, setPreviewUrl] = useState("");
    const [openingFileId, setOpeningFileId] = useState(null);
    const [historyFile, setHistoryFile] = useState(null);
    const [history, setHistory] = useState([]);
    const [historyLoading, setHistoryLoading] = useState(false);
    const [historyError, setHistoryError] = useState("");

    const [deleteTarget, setDeleteTarget] = useState(null);
    const [deleting, setDeleting] = useState(false);

    const [fatalError, setFatalError] = useState(null);
    const [reloadKey, setReloadKey] = useState(0);

    useEffect(() => {
        let cancelled = false;

        const loadFiles = async () => {
            try {
                const response = await fileAPI.getFiles();
                const nextFiles = response.data.files || [];

                if (!cancelled) {
                    setFiles(nextFiles);
                    onFilesChange?.(nextFiles);
                }
            } catch (err) {
                if (!cancelled) {
                    setFatalError(err);
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
    }, [onFilesChange, reloadKey]);

    useEffect(() => {
        return () => {
            if (previewUrl) {
                window.URL.revokeObjectURL(previewUrl);
            }
        };
    }, [previewUrl]);

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

            setTimeout(() => {
                window.URL.revokeObjectURL(url);
            }, 1000);
        } catch (err) {
            setError(getApiErrorMessage(err));
        }
    };

    const handleViewFile = async (file) => {
        try {
            setError("");
            setOpeningFileId(file.id);

            const response = await fileAPI.viewFile(file.id);
            const blob = new Blob([response.data], {
                type: file.mime_type || "application/octet-stream",
            });

            setPreviewFile(file);
            setPreviewUrl(window.URL.createObjectURL(blob));
        } catch (err) {
            setError(getApiErrorMessage(err));
        } finally {
            setOpeningFileId(null);
        }
    };

    const handleShowHistory = async (file) => {
        setHistoryFile(file);
        setHistory([]);
        setHistoryError("");
        setHistoryLoading(true);

        try {
            const response = await fileAPI.getHistory(file.id);

            setHistory(response.data.history || []);
        } catch (err) {
            setHistoryError(getApiErrorMessage(err));
        } finally {
            setHistoryLoading(false);
        }
    };

    const closeHistory = () => {
        setHistoryFile(null);
        setHistory([]);
        setHistoryError("");
    };
    const closePreview = () => {
        setPreviewFile(null);
        setPreviewUrl("");
    };

    const isPdf = (file) =>
        file?.mime_type === "application/pdf" ||
        file?.original_name?.toLowerCase().endsWith(".pdf");

    const isImage = (file) =>
        file?.mime_type?.startsWith("image/") ||
        /\.(avif|gif|jpe?g|png|svg|webp)$/i.test(file?.original_name || "");

    const handleDelete = async () => {
        if (!deleteTarget) return;

        setDeleting(true);
        setError("");

        try {
            await fileAPI.deleteFile(deleteTarget.id);

            setFiles((previousFiles) => {
                const nextFiles = previousFiles.filter(
                    (file) => file.id !== deleteTarget.id
                );

                onFilesChange?.(nextFiles);
                return nextFiles;
            });

            setDeleteTarget(null);
        } catch (err) {
            setError(getApiErrorMessage(err));
        } finally {
            setDeleting(false);
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

    const getFileType = (file) => {
        const extension = file.original_name
            ?.split(".")
            .pop()
            ?.replace(/[^a-z0-9]/gi, "")
            .toUpperCase();

        if (extension) {
            return extension.slice(0, 5);
        }

        if (file.mime_type?.includes("pdf")) return "PDF";
        if (file.mime_type?.includes("image")) return "IMG";
        if (file.mime_type?.includes("video")) return "VID";
        if (file.mime_type?.includes("audio")) return "SES";

        return "DOSYA";
    };

    if (loading) {
        return <p className="files-loading">Dosyalar yükleniyor...</p>;
    }
    if (fatalError) {
        const isConnectionError = !fatalError.response;
        const isServerError = fatalError.response?.status >= 500;

        return (
            <section className="api-error-screen" role="alert">
                <div className="api-error-icon">
                    {isConnectionError ? "↯" : "!"}
                </div>

                <h2>
                    {isConnectionError
                        ? "Bağlantı Kurulamadı"
                        : isServerError
                            ? "Sunucu Hatası"
                            : "İşlem Gerçekleştirilemedi"}
                </h2>

                <p>
                    {isConnectionError
                        ? "SecureShare sunucusuna ulaşılamıyor. İnternet bağlantınızı ve backend servisinin çalıştığını kontrol edin."
                        : isServerError
                            ? "Sunucuda beklenmeyen bir hata oluştu. Lütfen daha sonra tekrar deneyin."
                            : getApiErrorMessage(fatalError)}
                </p>

                <button
                    type="button"
                    onClick={() => {
                        setFatalError(null);
                        setLoading(true);
                        setReloadKey((previous) => previous + 1);
                    }}
                >
                    Tekrar Dene
                </button>
            </section>
        );
    }
    return (
        <section className="my-files">
            <div className="file-list-heading">
                <h2>Dosya kasanız</h2>
                <span>{files.length > 0 ? `${files.length} kayıt` : "Henüz kayıt yok"}</span>
            </div>

            {error && (
                <div className="error-message">
                    {error}
                </div>
            )}

            {files.length === 0 ? (
                <div className="empty-vault">
                    <div className="empty-vault-icon" aria-hidden="true">＋</div>
                    <h3>Kasınız hazır</h3>
                    <p>İlk dosyanızı şifreleyerek güvenli kasanıza ekleyin.</p>
                    <button type="button" onClick={onUploadClick}>
                        İlk dosyayı yükle
                    </button>
                </div>
            ) : (
                <div className="file-list">
                    {files.map((file) => {
                        const isOwner =
                            String(file.owner_id) === String(userId);
                        const canDownload = isOwner || Boolean(file.can_download);

                        return (
                            <div className="file-card" key={file.id}>
                                <span className="file-type-badge">
                                    {getFileType(file)}
                                </span>

                                <div className="file-info">
                                    <h3>{file.original_name}</h3>

                                    <p className="file-meta">
                                        {formatSize(Number(file.size_bytes))}
                                        <span aria-hidden="true"> • </span>
                                        {file.created_at
                                            ? new Date(
                                                file.created_at
                                            ).toLocaleDateString("tr-TR")
                                            : "-"}
                                    </p>

                                    <p className="file-owner-note">
                                        {isOwner
                                            ? "Dosya sahibi sizsiniz."
                                            : "Sizinle paylaşılmış dosya."}
                                    </p>
                                </div>

                                <div className="file-card-controls">
                                    <span className="file-security-badge">ŞİFRELİ</span>

                                    <div className="file-actions">
                                        <button
                                            type="button"
                                            disabled={openingFileId === file.id}
                                            onClick={() =>
                                                isOwner
                                                    ? onShare(file)
                                                    : handleViewFile(file)
                                            }
                                        >
                                            {isOwner
                                                ? "Paylaşım Yetkileri"
                                                : openingFileId === file.id
                                                    ? "Açılıyor..."
                                                    : "Dosyayı Aç"}
                                        </button>

                                        {canDownload ? (
                                            <button
                                                type="button"
                                                onClick={() => handleDownload(file)}
                                            >
                                                İndir
                                            </button>
                                        ) : (
                                            <span className="download-restricted">
                                                İndirme izni yok
                                            </span>
                                        )}
                                        {isOwner && (
                                            <button
                                                type="button"
                                                onClick={() => handleShowHistory(file)}
                                            >
                                                İşlem Geçmişi
                                            </button>
                                        )}
                                        {isOwner && (
                                            <button
                                                type="button"
                                                onClick={() => setDeleteTarget(file)}
                                            >
                                                Dosyayı Sil
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {previewFile && previewUrl && (
                <div
                    className="file-viewer-overlay"
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="file-viewer-title"
                >
                    <section className="file-viewer">
                        <header className="file-viewer-header">
                            <div>
                                <p>GÜVENLİ GÖRÜNTÜLEME</p>
                                <h3 id="file-viewer-title">
                                    {previewFile.original_name}
                                </h3>
                            </div>
                            <button type="button" onClick={closePreview}>
                                Kapat
                            </button>
                        </header>
                        {isPdf(previewFile) ? (
                            <object
                                className="file-preview-document"
                                data={previewUrl}
                                type="application/pdf"
                            >
                                <p>Bu PDF dosyası tarayıcıda görüntülenemedi.</p>
                            </object>
                        ) : isImage(previewFile) ? (
                            <div className="file-preview-image-wrap">
                                <img
                                    className="file-preview-image"
                                    src={previewUrl}
                                    alt={`${previewFile.original_name} önizlemesi`}
                                />
                            </div>
                        ) : (
                            <div className="file-preview-unavailable">
                                <strong>Bu dosya türü tarayıcıda önizlenemiyor.</strong>
                                <p>
                                    Dosya sahibi bu tür için indirme izni verirse
                                    dosyayı indirebilirsiniz.
                                </p>
                            </div>
                        )}
                    </section>
                </div>
            )}
            {deleteTarget && (
                <div className="modal-overlay" role="presentation">
                    <div
                        className="confirmation-modal"
                        role="alertdialog"
                        aria-modal="true"
                        aria-labelledby="delete-title"
                    >
                        <h3 id="delete-title">Dosyayı silmek istiyor musunuz?</h3>

                        <p>
                            <strong>{deleteTarget.original_name}</strong>
                        </p>

                        <p>
                            Bu işlem geri alınamaz. Dosyanızın silinmesini
                            onaylıyor musunuz?
                        </p>

                        <div className="modal-actions">
                            <button
                                type="button"
                                className="cancel-button"
                                onClick={() => setDeleteTarget(null)}
                                disabled={deleting}
                            >
                                Vazgeç
                            </button>

                            <button
                                type="button"
                                className="confirm-delete-button"
                                onClick={handleDelete}
                                disabled={deleting}
                            >
                                {deleting ? "Siliniyor..." : "Evet, sil"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {historyFile && (
                <div className="modal-overlay">
                    <section
                        className="history-modal"
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="history-title"
                    >
                        <header className="history-header">
                            <div>
                                <p>SECURESHARE AUDIT LOG</p>
                                <h2 id="history-title">İşlem Geçmişi</h2>
                                <span>{historyFile.original_name}</span>
                            </div>

                            <button type="button" onClick={closeHistory}>
                                Kapat
                            </button>
                        </header>

                        {historyLoading ? (
                            <p>İşlem geçmişi yükleniyor...</p>
                        ) : historyError ? (
                            <div className="error-message">
                                {historyError}
                            </div>
                        ) : history.length === 0 ? (
                            <p>Bu dosyaya ait işlem kaydı bulunamadı.</p>
                        ) : (
                            <div className="history-list">
                                {history.map((entry) => (
                                    <article
                                        className="history-entry"
                                        key={entry.id}
                                    >
                                        <div className="history-entry-heading">
                                            <strong>{entry.action}</strong>
                                            <span>{entry.result}</span>
                                        </div>

                                        <p>
                                            İşlemi yapan: {entry.actor_email || "Bilinmiyor"}
                                        </p>

                                        <p>
                                            Tarih: {entry.created_at
                                                ? new Date(entry.created_at).toLocaleString("tr-TR")
                                                : "-"}
                                        </p>

                                        <details>
                                            <summary>İşlem ayrıntıları</summary>
                                            <pre>
                                                {JSON.stringify(entry.details, null, 2)}
                                            </pre>
                                        </details>

                                        <details>
                                            <summary>Hash zinciri bilgileri</summary>

                                            <p>Önceki hash:</p>
                                            <code>{entry.previous_hash || "-"}</code>

                                            <p>İşlem hash'i:</p>
                                            <code>{entry.entry_hash || "-"}</code>
                                        </details>
                                    </article>
                                ))}
                            </div>
                        )}
                    </section>
                </div>
            )}
        </section>
    );
}

export default MyFiles;
