import { useEffect, useState } from "react";
import { fileAPI, getApiErrorMessage } from "../services/api";

function ShareFile({ file }) {
    const [email, setEmail] = useState("");
    const [canRead, setCanRead] = useState(false);
    const [canDownload, setCanDownload] = useState(false);
    const [permissions, setPermissions] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [message, setMessage] = useState("");

    const fetchPermissions = async () => {
        try {
            setLoading(true);
            setError("");

            const response = await fileAPI.getPermissions(file.id);
            setPermissions(response.data.permissions || []);
        } catch (err) {
            setError(getApiErrorMessage(err));
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        let active = true;

        fileAPI.getPermissions(file.id)
            .then((response) => {
                if (active) {
                    setPermissions(response.data.permissions || []);
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
    }, [file.id]);

    const handleGrantPermission = async (e) => {
        e.preventDefault();

        setError("");
        setMessage("");

        if (!canRead && !canDownload) {
            setError("En az bir izin türü seçmelisiniz.");
            return;
        }

        try {
            setLoading(true);

            await fileAPI.grantPermission(file.id, {
                email,
                can_read: canRead,
                can_download: canDownload,
            });

            setMessage("Kullanıcıya dosya erişim izni verildi.");
            setEmail("");
            setCanRead(false);
            setCanDownload(false);

            await fetchPermissions();
        } catch (err) {
            setError(getApiErrorMessage(err));
        } finally {
            setLoading(false);
        }
    };

    const handleRevokePermission = async (userId) => {
        const confirmed = window.confirm(
            "Bu kullanıcının dosya erişim iznini kaldırmak istiyor musunuz?"
        );

        if (!confirmed) return;

        try {
            setLoading(true);
            setError("");
            setMessage("");

            await fileAPI.revokePermission(file.id, userId);

            setMessage("Kullanıcının erişim izni kaldırıldı.");

            await fetchPermissions();
        } catch (err) {
            setError(getApiErrorMessage(err));
        } finally {
            setLoading(false);
        }
    };

    return (
        <section className="share-container">
            <h2>Dosya Paylaşım ve Yetki Yönetimi</h2>

            <p className="selected-file">
                Seçilen dosya: <strong>{file.original_name}</strong>
            </p>

            <form onSubmit={handleGrantPermission} className="share-form">
                <label>Kullanıcının e-posta adresi</label>

                <input
                    type="email"
                    placeholder="kullanici@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                />

                <div className="permission-options">
                    <label>
                        <input
                            type="checkbox"
                            checked={canRead}
                            onChange={(e) => setCanRead(e.target.checked)}
                        />
                        Okuma izni
                    </label>

                    <label>
                        <input
                            type="checkbox"
                            checked={canDownload}
                            onChange={(e) => setCanDownload(e.target.checked)}
                        />
                        İndirme izni
                    </label>
                </div>

                <button type="submit" disabled={loading}>
                    İzin Ver
                </button>
            </form>

            {error && <p className="error-message">{error}</p>}
            {message && <p className="success-message">{message}</p>}

            <div className="permission-list">
                <h3>Verilmiş İzinler</h3>

                {loading && <p>İşlem yapılıyor...</p>}

                {!loading && permissions.length === 0 && (
                    <p>Bu dosya henüz kimseyle paylaşılmamış.</p>
                )}

                {permissions.map((permission) => (
                    <div className="permission-card" key={permission.id}>
                        <div>
                            <strong>{permission.email}</strong>

                            <p>
                                Okuma: {permission.can_read ? "İzinli" : "İzin yok"}
                            </p>

                            <p>
                                İndirme: {permission.can_download ? "İzinli" : "İzin yok"}
                            </p>
                        </div>

                        <button
                            type="button"
                            className="revoke-button"
                            disabled={loading}
                            onClick={() => handleRevokePermission(permission.user_id)}
                        >
                            İzni Kaldır
                        </button>
                    </div>
                ))}
            </div>
        </section>
    );
}

export default ShareFile;