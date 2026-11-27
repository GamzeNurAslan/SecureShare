import { useContext } from "react";
import { AuthContext } from "./AuthContextValue";

export function useAuth() {
    const context = useContext(AuthContext);

    if (!context) {
        throw new Error(
            "useAuth, AuthProvider içerisinde kullanılmalıdır."
        );
    }

    return context;
}