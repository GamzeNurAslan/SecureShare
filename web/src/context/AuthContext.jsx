import { useState } from "react";
import { authAPI } from "../services/api";
import { AuthContext } from "./AuthContextValue";

export function AuthProvider({ children }) {
    const [user, setUser] = useState(() => {
        const savedUser = sessionStorage.getItem("user");
        return savedUser ? JSON.parse(savedUser) : null;
    });

    const login = async (email, password) => {
        const response = await authAPI.login({ email, password });
        const { token, user } = response.data;

        sessionStorage.setItem("token", token);
        sessionStorage.setItem("user", JSON.stringify(user));
        setUser(user);

        return user;
    };

    const register = async (fullName, email, password) => {
        const response = await authAPI.register({
            fullName,
            email,
            password,
        });

        const { token, user } = response.data;

        sessionStorage.setItem("token", token);
        sessionStorage.setItem("user", JSON.stringify(user));
        setUser(user);

        return user;
    };

    const logout = () => {
        sessionStorage.removeItem("token");
        sessionStorage.removeItem("user");
        setUser(null);
    };

    const value = {
        user,
        login,
        register,
        logout,
        isAuthenticated: Boolean(user && sessionStorage.getItem("token")),
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
}