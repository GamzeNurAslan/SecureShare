
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/useAuth";
import { getApiErrorMessage } from "../services/api";

function Login() {
    const { login } = useAuth();
    const navigate = useNavigate();

    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

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
        <div className="auth-container">
            <div className="auth-card">
                <div className="logo">SecureShare</div>

                <h1>Tekrar Hoş Geldin!</h1>
                <p className="subtitle">
                    Güvenli dosyalarına erişmek için giriş yap.
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
                    <input
                        type="password"
                        placeholder="Şifrenizi girin"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                    />

                    {error && <div className="error-message">{error}</div>}

                    <button type="submit" disabled={loading}>
                        {loading ? "Giriş yapılıyor..." : "Giriş Yap"}
                    </button>
                </form>

                <p className="auth-footer">
                    Hesabın yok mu? <Link to="/register">Kayıt Ol</Link>
                </p>
            </div>
        </div>
    );
}

export default Login;
