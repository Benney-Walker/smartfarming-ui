import { BrowserRouter, Routes, Route } from "react-router-dom";

import Login from "./pages/auth/Login";
import InitializePassword from "./pages/auth/InitPassword.jsx";
import AdminDashboard from "./pages/dashboards/AdminDashboard.jsx";
import FarmManagerDashboard from "./pages/dashboards/FarmManagerDashboard.jsx";
import HomePage from "./pages/HomePage.jsx";

function App() {
    return (
        <BrowserRouter>
            <Routes>
                <Route path= "/" element={<HomePage />} />
                <Route path="/login-page" element={<Login />} />
                <Route path="/initialize-password" element={<InitializePassword />} />
                <Route path="/admin-dashboard" element={<AdminDashboard />} />
                <Route path="/farmer-dashboard" element={<FarmManagerDashboard />} />
            </Routes>
        </BrowserRouter>
    );
}

export default App;