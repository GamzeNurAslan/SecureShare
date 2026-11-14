
import { useEffect, useState } from "react";
import { fileAPI, getApiErrorMessage } from "../services/api";

function ShareFile({ file, onClose }) {
    const [email, setEmail] = useState("");
    const [canRead, setCanRead] = useState(false);
    const [canDownload, setCanDownload] = useState(false);
    const [expiresAt, setExpiresAt] = useState("");
    const [permissions, setPermissions] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [message, setMessage] = useState("");
    const [editingUserId, setEditingUserId] = useState(null);
    const [users, setUsers] = useState([]);
    const [searchingUsers, setSearchingUsers] = useState(false);

    const [minDate] = useState(() => {
        const date = new Date();
        date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
        return date.toISOString().slice(0, 16);
    });

    useEffect(() => {
        let active = true;

        const loadPermissions = async () => {
            try {
                const response = await fileAPI.getPermissions(file.id);

                if (active) {
                    setPermissions(response.data.permissions || []);
                }
            } catch (err) {
                if (active) {
                    setError(getApiErrorMessage(err));
                }
            }
        };

        loadPermissions();

        return () => {
            active = false;
        };
    }, [file.id]);

    const fetchPermissions = async () => {
        const response = await fileAPI.getPermissions(file.id);
        setPermissions(response.data.permissions || []);
    };

    const handleSearchUsers = async (value) => {
        setEmail(value);
        setUsers([]);
        setError("");

        if (value.trim().length < 3) {
            return;
        }

        try {
            setSearchingUsers(true);

            const response = await fileAPI.searchUsers(value);
            setUsers(response.data.users || []);
        } catch (err) {
            setError(getApiErrorMessage(err));
        } finally {
            setSearchingUsers(false);
        }
    };

    const resetForm = () => {
        setEmail("");
        setCanRead(false);
        setCanDownload(false);
        setExpiresAt("");
        setEditingUserId(null);
        setUsers([]);
    };

    const handleGrantPermission = async (e) => {
        e.preventDefault();

        setError("");
        setMessage("");

        if (!email.trim()) {
            setError("Bir kullanıcı e-posta adresi girmelisiniz.");
            return;
        }

        if (!canRead && !canDownload) {
            setError("En az bir izin türü seçmelisiniz.");
            return;
        }

        let expirationDate = null;

        if (expiresAt) {
            expirationDate = new Date(expiresAt);

            if (
                Number.isNaN(expirationDate.getTime()) ||
                expirationDate <= new Date()
            ) {
                setError("İzin bitiş tarihi gelecekte olmalıdır.");
                return;
            }
        }

        try {
            setLoading(true);

            await fileAPI.grantPermission(file.id, {
                email: email.trim(),
                can_read: canRead,
                can_download: canDownload,
                expires_at: expirationDate
                    ? expirationDate.toISOString()
                    : null,
            });

            setMessage(
                editingUserId
                    ? "Kullanıcının izinleri güncellendi."
                    : "Kullanıcıya dosya erişim izni verildi."
            );

            resetForm();
            await fetchPermissions();
        } catch (err) {
            setError(getApiErrorMessage(err));
        } finally {
            setLoading(false);
        }
    };

    const handleEditPermission = (permission) => {
        setEditingUserId(permission.user_id);
        setEmail(permission.email);
        setCanRead(permission.can_read);
        setCanDownload(permission.can_download);

        if (permission.expires_at) {
            const date = new Date(permission.expires_at);
            const localDate = new Date(
                date.getTime() - date.getTimezoneOffset() * 60000
            );

            setExpiresAt(localDate.toISOString().slice(0, 16));
        } else {
            setExpiresAt("");
        }

        setError("");
        setMessage("");
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

            if (String(editingUserId) === String(userId)) {
                resetForm();
            }

            await fetchPermissions();
        } catch (err) {
            setError(getApiErrorMessage(err));
        } finally {
            setLoading(false);
        }
    };

    const isExpired = (date) => {
        return date && new Date(date) <= new Date();
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

    return (
        <section className="share-container">
            <div className="share-header">
                <h2>Dosya Detayı ve Paylaşım Yönetimi</h2>

                {onClose && (
                    <button type="button" onClick={onClose}>
                        Kapat
                    </button>
                )}
            </div>

            <div className="file-detail">
                <h3>{file.original_name}</h3>

                <p>Dosya boyutu: {formatSize(Number(file.size_bytes))}</p>

                <p>
                    Yüklenme tarihi:{" "}
                    {file.created_at
                        ? new Date(file.created_at).toLocaleString("tr-TR")
                        : "-"}
                </p>
            </div>

            <h3>{editingUserId ? "İzinleri Güncelle" : "Dosya Paylaş"}</h3>

            <form onSubmit={handleGrantPermission} className="share-form">
                <label>Kullanıcının e-posta adresi</label>

                <input
                    type="email"
                    placeholder="Kullanıcı e-posta adresi ara"
                    value={email}
                    onChange={(e) => handleSearchUsers(e.target.value)}
                    required
                    disabled={Boolean(editingUserId) || loading}
                />

                {searchingUsers && <p>Kullanıcılar aranıyor...</p>}

                {users.length > 0 && !editingUserId && (
                    <div className="user-search-results">
                        {users.map((user) => (
                            <button
                                type="button"
                                key={user.id}
                                onClick={() => {
                                    setEmail(user.email);
                                    setUsers([]);
                                }}
                            >
                                {user.email}
                            </button>
                        ))}
                    </div>
                )}

                <div className="permission-options">
                    <label>
                        <input
                            type="checkbox"
                            checked={canRead}
                            onChange={(e) => setCanRead(e.target.checked)}
                            disabled={loading}
                        />
                        Okuma izni
                    </label>

                    <label>
                        <input
                            type="checkbox"
                            checked={canDownload}
                            onChange={(e) => setCanDownload(e.target.checked)}
                            disabled={loading}
                        />
                        İndirme izni
                    </label>
                </div>

                <label>İzin son geçerlilik tarihi</label>

                <input
                    type="datetime-local"
                    value={expiresAt}
                    onChange={(e) => setExpiresAt(e.target.value)}
                    min={minDate}
                    disabled={loading}
                />

                <p className="form-hint">
                    Tarih seçmezseniz izin süresiz olur.
                </p>

                <div className="share-form-actions">
                    <button type="submit" disabled={loading || searchingUsers}>
                        {loading
                            ? "İşleniyor..."
                            : editingUserId
                                ? "İzinleri Güncelle"
                                : "İzin Ver"}
                    </button>

                    {editingUserId && (
                        <button
                            type="button"
                            onClick={resetForm}
                            disabled={loading}
                        >
                            Düzenlemeyi İptal Et
                        </button>
                    )}
                </div>
            </form>

            {error && <p className="error-message">{error}</p>}
            {message && <p className="success-message">{message}</p>}

            <div className="permission-list">
                <h3>Verilmiş İzinler</h3>

                {permissions.length === 0 ? (
                    <p>Bu dosya henüz kimseyle paylaşılmamış.</p>
                ) : (
                    permissions.map((permission) => {
                        const expired = isExpired(permission.expires_at);

                        return (
                            <div className="permission-card" key={permission.id}>
                                <div>
                                    <strong>{permission.email}</strong>

                                    <p>
                                        Okuma:{" "}
                                        {permission.can_read ? "İzinli" : "İzin yok"}
                                    </p>

                                    <p>
                                        İndirme:{" "}
                                        {permission.can_download ? "İzinli" : "İzin yok"}
                                    </p>

                                    <p>
                                        Geçerlilik:{" "}
                                        {permission.expires_at
                                            ? new Date(
                                                permission.expires_at
                                            ).toLocaleString("tr-TR")
                                            : "Süresiz"}
                                    </p>

                                    {expired && (
                                        <p className="expired-label">
                                            Süresi dolmuş
                                        </p>
                                    )}
                                </div>

                                <div className="permission-actions">
                                    <button
                                        type="button"
                                        disabled={loading}
                                        onClick={() =>
                                            handleEditPermission(permission)
                                        }
                                    >
                                        Düzenle
                                    </button>

                                    <button
                                        type="button"
                                        className="revoke-button"
                                        disabled={loading}
                                        onClick={() =>
                                            handleRevokePermission(
                                                permission.user_id
                                            )
                                        }
                                    >
                                        İzni Kaldır
                                    </button>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>
        </section>
    );
}

export default ShareFile;
