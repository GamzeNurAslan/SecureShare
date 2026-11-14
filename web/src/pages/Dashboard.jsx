
import { useRef, useState } from "react";
import { useAuth } from "../context/useAuth";
import MyFiles from "./MyFiles";
import UploadFile from "./UploadFile";
import ShareFile from "./ShareFile";

function Dashboard() {
    const { user, logout } = useAuth();
    const [refresh, setRefresh] = useState(0);
    const [selectedFile, setSelectedFile] = useState(null);
    const [files, setFiles] = useState([]);
    const [lightMode, setLightMode] = useState(false);
    const uploadInputRef = useRef(null);

    const requestUpload = () => {
        uploadInputRef.current?.click();
    };

    return (
        <div className={`dashboard ${lightMode ? "dashboard-light-mode" : ""}`}>
            <header className="dashboard-header">
                <div className="dashboard-brand" aria-label="SecureShare">
                    <span className="brand-mark" aria-hidden="true">
                        <span>S</span>
                        <span>S</span>
                    </span>
                    <span>SecureShare</span>
                </div>

                <div className="dashboard-actions">
                    <button
                        type="button"
                        className="theme-toggle dashboard-theme-toggle"
                        onClick={() => setLightMode((current) => !current)}
                        aria-label={lightMode ? "Koyu moda geç" : "Açık moda geç"}
                    >
                        <span aria-hidden="true">{lightMode ? "🌙" : "☀️"}</span>
                        {lightMode ? "Koyu mod" : "Açık mod"}
                    </button>
                    <button type="button" className="logout-button" onClick={logout}>
                        Çıkış Yap
                    </button>
                </div>
            </header>

            <main className="dashboard-content">
                <UploadFile
                    fileInputRef={uploadInputRef}
                    onUploadSuccess={() => setRefresh((prev) => prev + 1)}
                />

                <section className="dashboard-stat" aria-label="Dosya özeti">
                    <div className="dashboard-stat-icon" aria-hidden="true">▦</div>
                    <div>
                        <p>TOPLAM DOSYA</p>
                        <strong>{files.length}</strong>
                    </div>
                    <span className="dashboard-stat-status">
                        {files.length > 0 ? "Güvenle saklanıyor" : "İlk dosyanı yükle"}
                    </span>
                </section>

                <MyFiles
                    key={refresh}
                    userId={user?.id}
                    onShare={(file) => setSelectedFile(file)}
                    onFilesChange={setFiles}
                    onUploadClick={requestUpload}
                />

                {selectedFile && (
                    <ShareFile
                        file={selectedFile}
                        onClose={() => setSelectedFile(null)}
                    />
                )}
            </main>
        </div>
    );
}

export default Dashboard;
