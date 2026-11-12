
import { useState } from "react";
import { useAuth } from "../context/useAuth";
import MyFiles from "./MyFiles";
import UploadFile from "./UploadFile";
import ShareFile from "./ShareFile";

function Dashboard() {
    const { user, logout } = useAuth();

    const [refresh, setRefresh] = useState(0);
    const [selectedFile, setSelectedFile] = useState(null);

    return (
        <div className="dashboard">
            <header className="dashboard-header">
                <h1>SecureShare</h1>

                <div>
                    <span>{user?.full_name}</span>

                    <button onClick={logout}>
                        Çıkış Yap
                    </button>
                </div>
            </header>

            <main className="dashboard-content">
                <UploadFile
                    onUploadSuccess={() => setRefresh((prev) => prev + 1)}
                />

                <MyFiles
                    key={refresh}
                    onShare={(file) => setSelectedFile(file)}
                />

                {selectedFile && (
                    <ShareFile file={selectedFile} />
                )}
            </main>
        </div>
    );
}

export default Dashboard;
