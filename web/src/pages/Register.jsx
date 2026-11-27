
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/useAuth";
import { getApiErrorMessage } from "../services/api";

function Register() {
    const { register } = useAuth();
    const navigate = useNavigate();

    const [fullName, setFullName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const [lightMode, setLightMode] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError("");

        if (!fullName.trim() || !email.trim() || !password || !confirmPassword) {
            setError("Tüm alanları doldurun.");
            return;
        }

        if (fullName.trim().length > 100) {
            setError("Ad soyad 100 karakterden uzun olamaz.");
            return;
        }

        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
            setError("Geçerli bir e-posta adresi girin.");
            return;
        }

        if (
            password.length < 12 ||
            !/[a-z]/.test(password) ||
            !/[A-Z]/.test(password) ||
            !/\d/.test(password) ||
            !/[^A-Za-z0-9]/.test(password)
        ) {
            setError("Parola en az 12 karakter olmalı; büyük harf, küçük harf, rakam ve özel karakter içermeli.");
            return;
        }

        if (password !== confirmPassword) {
            setError("Parolalar birbiriyle eşleşmiyor.");
            return;
        }

        setLoading(true);

        try {
            await register(fullName.trim(), email.trim(), password);
            navigate("/dashboard");
        } catch (err) {
            setError(getApiErrorMessage(err));
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className={`auth-container ${lightMode ? "light-mode" : ""}`}>
            <div className="auth-card">
                <div className="auth-header-row">
                    <div className="logo" aria-label="SecureShare">
                        <span className="brand-mark" aria-hidden="true">
                            <span>S</span>
                            <span>S</span>
                        </span>
                        <span>SecureShare</span>
                    </div>
                    <button
                        type="button"
                        className="theme-toggle"
                        onClick={() => setLightMode((current) => !current)}
                        aria-label={lightMode ? "Koyu moda geç" : "Açık moda geç"}
                    >
                        <span aria-hidden="true">{lightMode ? "🌙" : "☀️"}</span>
                        {lightMode ? "Koyu mod" : "Açık mod"}
                    </button>
                </div>

                <div className="auth-eyebrow">GÜVENLİ DOSYA PLATFORMU</div>

                <h1>Dosyalarınızın kontrolü sizde</h1>
                <p className="subtitle">
                    Dosyalarınızı güçlü şifreleme ile koruyun, yalnızca izin verdiğiniz
                    kişilerle güvenle paylaşın.
                </p>

                <form onSubmit={handleSubmit}>
                    <label>Ad Soyad</label>
                    <input
                        type="text"
                        placeholder="Adınız ve soyadınız"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        required
                    />

                    <label>E-posta</label>
                    <input
                        type="email"
                        placeholder="ornek@mail.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                    />

                    <label>Şifre</label>
                    <div className="password-field">
                        <input
                            type={showPassword ? "text" : "password"}
                            placeholder="Parolanızı girin"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                        />
                        <button
                            type="button"
                            className="password-toggle"
                            onClick={() => setShowPassword((current) => !current)}
                            aria-label={showPassword ? "Parolayı gizle" : "Parolayı göster"}
                            aria-pressed={showPassword}
                        >
                            {showPassword ? "◉" : "◌"}
                        </button>
                    </div>

                    <label>Şifre Tekrar</label>
                    <div className="password-field">
                        <input
                            type={showConfirmPassword ? "text" : "password"}
                            placeholder="Parolanızı tekrar girin"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            required
                        />
                        <button
                            type="button"
                            className="password-toggle"
                            onClick={() => setShowConfirmPassword((current) => !current)}
                            aria-label={showConfirmPassword ? "Parolayı gizle" : "Parolayı göster"}
                            aria-pressed={showConfirmPassword}
                        >
                            {showConfirmPassword ? "◉" : "◌"}
                        </button>
                    </div>

                    {error && <div className="error-message">{error}</div>}

                    <button type="submit" disabled={loading}>
                        {loading ? "Hesap oluşturuluyor..." : "Kayıt Ol"}
                    </button>
                </form>

                <p className="auth-footer">
                    <Link className="auth-pill auth-pill-primary" to="/login">
                        Zaten hesabınız var mı? Giriş yapın
                    </Link>
                </p>
            </div>
        </div>
    );
}

export default Register;
