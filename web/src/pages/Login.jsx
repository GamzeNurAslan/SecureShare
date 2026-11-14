
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/useAuth";
import { getApiErrorMessage } from "../services/api";

function Login() {
    const { login } = useAuth();
    const navigate = useNavigate();

    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const [lightMode, setLightMode] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();

        setError("");
        setLoading(true);

        try {
            await login(email, password);
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

                    {error && <div className="error-message">{error}</div>}

                    <button type="submit" disabled={loading}>
                        {loading ? "Giriş yapılıyor..." : "Giriş Yap"}
                    </button>
                </form>

                <p className="auth-footer">
                    <Link className="auth-pill auth-pill-primary" to="/register">
                        Hesabınız yok mu? Kayıt olun
                    </Link>
                    <button type="button" className="auth-pill auth-pill-secondary">
                        Şifremi unuttum
                    </button>
                </p>
            </div>
        </div>
    );
}

export default Login;
