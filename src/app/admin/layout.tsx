"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { authenticateStaff, getStaffUserById, seedDefaultStaffUsers, type StaffRole, type StaffUser } from "@/lib/staffStore";
import { clearStaffSession, getStaffSession, setStaffSession } from "@/lib/staffSession";
import { seedDefaultOrgStructure } from "@/lib/orgUnitStore";
import ToastCenter from "@/components/ToastCenter";

// Icons for the layout
const LayoutIcons = {
    grid: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="14" y="14" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /></svg>,
    users: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>,
    mail: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" /><polyline points="22,6 12,13 2,6" /></svg>,
    logout: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" /></svg>,
    lock: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>,
    user: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>,
    key: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4" /></svg>,
    chevronRight: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 18 15 12 9 6" /></svg>,
    inbox: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 4h16v12H4z" /><path d="M22 16H2" /><path d="M8 20h8" /></svg>,
    settings: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 1v2" /><path d="M12 21v2" /><path d="M4.22 4.22l1.42 1.42" /><path d="M18.36 18.36l1.42 1.42" /><path d="M1 12h2" /><path d="M21 12h2" /><path d="M4.22 19.78l1.42-1.42" /><path d="M18.36 5.64l1.42-1.42" /><circle cx="12" cy="12" r="4" /></svg>,
    bell: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 0 1-3.46 0" /></svg>,
};

function labelRole(role: StaffRole): string {
    switch (role) {
        case "admin": return "Admin";
        case "receptionist": return "Resepsionis";
        case "operator": return "Operator";
        default: return role;
    }
}

function isAllowedPath(pathname: string, role: StaffRole): boolean {
    // Basic RBAC for dummy flow (fine-grained checks happen inside pages when needed).
    const allow = (roles: StaffRole[]) => roles.includes(role);
    if (pathname === "/admin") return allow(["admin", "receptionist"]);
    if (pathname.startsWith("/admin/intake")) return allow(["admin", "receptionist"]);
    if (pathname.startsWith("/admin/inbox")) return allow(["admin", "operator"]);
    if (pathname.startsWith("/admin/directory")) return allow(["admin", "operator", "receptionist"]);
    if (pathname.startsWith("/admin/org-units")) return allow(["admin"]);
    if (pathname.startsWith("/admin/users")) return allow(["admin"]);
    if (pathname.startsWith("/admin/notifications")) return allow(["admin", "operator", "receptionist"]);
    if (pathname.startsWith("/admin/visitors")) return allow(["admin", "receptionist"]);
    if (pathname.startsWith("/admin/surat")) return allow(["admin", "receptionist"]);
    if (pathname.startsWith("/admin/cases")) return allow(["admin", "operator", "receptionist"]);
    // Fallback: admin only
    return allow(["admin"]);
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [currentUser, setCurrentUser] = useState<StaffUser | null>(null);
    const pathname = usePathname();

    useEffect(() => {
        // Ensure dummy master data exists
        seedDefaultOrgStructure();
        seedDefaultStaffUsers();

        const session = getStaffSession();
        if (!session) return;
        const u = getStaffUserById(session.userId);
        if (u) setCurrentUser(u);
    }, []);

    const handleLogin = (e: React.FormEvent) => {
        e.preventDefault();
        const u = authenticateStaff(username.trim(), password);
        if (!u) {
            setError("Username atau password salah");
            setPassword("");
            return;
        }
        setStaffSession({ userId: u.id, role: u.role });
        setCurrentUser(u);
        setError("");
        // Navigate to the most relevant landing page per role (dummy UX).
        if (u.role === "operator") window.location.assign("/admin/inbox");
        else if (u.role === "receptionist") window.location.assign("/admin/intake");
        else window.location.assign("/admin");
    };

    const handleLogout = () => {
        clearStaffSession();
        setCurrentUser(null);
        setUsername("");
        setPassword("");
    };

    if (!currentUser) {
        return (
            <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center p-4">
                <div className="w-full max-w-sm">
                    <div className="bg-white border-2 border-gray-200 rounded-2xl p-8 shadow-xl shadow-slate-200/50">
                        <div className="flex flex-col items-center justify-center gap-3 mb-8">
                            <div className="w-16 h-20 relative">
                                <Image src="/kominfos.svg" alt="Lontara" fill className="object-contain" />
                            </div>
                            <div className="text-center">
                                <h1 className="text-xl font-bold text-slate-800">Makassar Government Center </h1>
                                <p className="text-xs text-slate-500 font-medium">DISKOMINFO KOTA MAKASSAR</p>
                            </div>
                        </div>

                        <form onSubmit={handleLogin} className="space-y-4">
                            <div>
                                <label className="block text-xs font-semibold text-slate-600 mb-1.5 ml-1">USERNAME</label>
                                <div className="relative group">
                                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[#009FA9] transition-colors">
                                        {LayoutIcons.user}
                                    </div>
                                    <input
                                        type="text"
                                        value={username}
                                        onChange={(e) => setUsername(e.target.value)}
                                        placeholder="admin"
                                        className="w-full pl-10 pr-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-2xl text-sm text-slate-800 focus:outline-none focus:border-[#009FA9] focus:ring-1 focus:ring-[#009FA9]/20 transition-all font-medium"
                                        autoFocus
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-slate-600 mb-1.5 ml-1">PASSWORD</label>
                                <div className="relative group">
                                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[#009FA9] transition-colors">
                                        {LayoutIcons.key}
                                    </div>
                                    <input
                                        type="password"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        placeholder="••••••••"
                                        className="w-full pl-10 pr-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-2xl text-sm text-slate-800 focus:outline-none focus:border-[#009FA9] focus:ring-1 focus:ring-[#009FA9]/20 transition-all font-medium"
                                    />
                                </div>
                            </div>

                            {error && (
                                <div className="p-3 bg-red-50 border border-red-200 text-red-600 text-xs font-medium rounded-2xl text-center flex items-center justify-center gap-2 animate-in fade-in slide-in-from-top-1 duration-200">
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>
                                    {error}
                                </div>
                            )}

                            <button
                                type="submit"
                                className="w-full py-3 bg-[#009FA9] text-white text-sm font-bold rounded-2xl hover:shadow-xl hover:-translate-y-0.5 transition-all shadow-lg shadow-[#009FA9]/20"
                            >
                                Sign In
                            </button>
                        </form>

                        <div className="mt-6 p-4 bg-slate-50 border border-slate-200 rounded-2xl text-xs text-slate-600">
                            <p className="font-bold text-slate-700 mb-2">Akun Dummy</p>
                            <p><span className="font-mono">admin</span> / <span className="font-mono">admin123</span></p>
                            <p><span className="font-mono">resepsionis</span> / <span className="font-mono">reseps123</span></p>
                            <p><span className="font-mono">operator-upt</span> / <span className="font-mono">op123</span></p>
                            <p><span className="font-mono">operator-aptika</span> / <span className="font-mono">op123</span></p>
                        </div>

                        <div className="mt-8 text-center">
                            <Link href="/" className="inline-flex items-center gap-2 text-xs font-medium text-slate-400 hover:text-slate-600 transition-colors">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5" /><path d="M12 19l-7-7 7-7" /></svg>
                                Kembali ke Beranda
                            </Link>
                        </div>
                    </div>
                    <p className="text-center text-[10px] text-slate-400 mt-6 font-medium">© {new Date().getFullYear()} Diskominfo Makassar</p>
                </div>
            </div>
        );
    }

    const navItems = [
        ...(currentUser.role === "admin" || currentUser.role === "receptionist" ? [
            { name: "Dashboard", href: "/admin", icon: LayoutIcons.grid },
            { name: "Intake", href: "/admin/intake", icon: LayoutIcons.inbox },
        ] : []),
        ...(currentUser.role === "admin" || currentUser.role === "operator" ? [
            { name: "Inbox", href: "/admin/inbox", icon: LayoutIcons.inbox },
        ] : []),
        { name: "Direktori", href: "/admin/directory", icon: LayoutIcons.users },
        { name: "Notifikasi", href: "/admin/notifications", icon: LayoutIcons.bell },
        ...(currentUser.role === "admin" || currentUser.role === "receptionist" ? [
            { name: "Pengunjung", href: "/admin/visitors", icon: LayoutIcons.users },
            { name: "Surat Elektronik", href: "/admin/surat", icon: LayoutIcons.mail },
        ] : []),
        ...(currentUser.role === "admin" ? [
            { name: "Org Units", href: "/admin/org-units", icon: LayoutIcons.settings },
            { name: "Users", href: "/admin/users", icon: LayoutIcons.users },
        ] : []),
    ];

    const allowed = isAllowedPath(pathname, currentUser.role);

    return (
    <div className="min-h-screen bg-[#f8fafc] flex">
            {/* Sidebar */}
            <aside className="fixed inset-y-0 left-0 w-70 bg-white border-r border-gray-200 z-50 transition-transform duration-300 ease-in-out hidden lg:flex flex-col">
                <div className="h-32 px-8 flex items-center gap-5 border-b border-gray-100">
                    <div className="w-14 h-16 relative flex-shrink-0">
                        <Image src="/kominfos.svg" alt="Lontara" fill className="object-contain" />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold text-slate-800 leading-tight mb-1">Command Center</h1>
                        <p className="text-xs font-semibold text-slate-400 tracking-wider">DISKOMINFO</p>
                    </div>
                </div>

                <div className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
                    <p className="px-4 py-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Main Menu</p>
                    {navItems.map((item) => {
                        const isActive = pathname === item.href;
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={`flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-2xl transition-all group ${isActive
                                    ? "bg-[#009FA9]/10 text-[#009FA9] border border-[#009FA9]/20 shadow-sm"
                                    : "text-[#505F79] hover:bg-slate-50 hover:text-slate-900"
                                    }`}
                            >
                                <span className={`transition-colors ${isActive ? "text-[#009FA9]" : "text-slate-400 group-hover:text-slate-600"}`}>
                                    {item.icon}
                                </span>
                                {item.name}
                                {isActive && <span className="ml-auto text-[#009FA9]">{LayoutIcons.chevronRight}</span>}
                            </Link>
                        );
                    })}
                </div>

                <div className="p-4 border-t border-gray-100">
                    <div className="bg-white/80 border-2 border-gray-200 rounded-2xl p-4 mb-4 flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-white border border-gray-200 flex items-center justify-center text-slate-400 shadow-sm">
                            {LayoutIcons.user}
                        </div>
                        <div className="overflow-hidden">
                            <p className="text-sm font-bold text-slate-800 truncate">{currentUser.name}</p>
                            <p className="text-xs text-slate-500 truncate">{labelRole(currentUser.role)} • {currentUser.instansi}</p>
                        </div>
                    </div>
                    <button
                        onClick={handleLogout}
                        className="flex items-center justify-center gap-2 w-full px-4 py-2.5 text-xs font-bold text-[#991b1b] bg-white border-2 border-[#991b1b]/30 hover:bg-[#991b1b]/10 rounded-2xl transition-colors"
                    >
                        {LayoutIcons.logout}
                        Sign Out
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <div className="flex-1 lg:ml-72 flex flex-col min-w-0">
                {/* Mobile Header (TODO: implement toggle) */}
                <header className="h-16 bg-white/80 backdrop-blur-md border-b border-gray-200 sticky top-0 z-40 px-6 flex items-center justify-between lg:hidden">
                    <div className="w-8 h-8 relative">
                        <Image src="/kominfos.svg" alt="Lontara" fill className="object-contain" />
                    </div>
                    <span className="font-bold text-slate-800">Admin Portal</span>
                </header>

                <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto">
                    {allowed ? (
                        children
                    ) : (
                        <div className="max-w-2xl">
                            <div className="bg-white border-2 border-gray-200 rounded-2xl p-6">
                                <p className="text-sm font-bold text-slate-800">Tidak punya akses</p>
                                <p className="text-sm text-slate-500 mt-1">Role kamu: <span className="font-mono">{currentUser.role}</span></p>
                                <div className="mt-4 flex gap-2 flex-wrap">
                                    <Link className="px-4 py-2 text-xs font-bold text-white bg-[#009FA9] rounded-2xl" href="/admin/directory">Ke Direktori</Link>
                                    {(currentUser.role === "operator" || currentUser.role === "admin") && (
                                        <Link className="px-4 py-2 text-xs font-bold text-[#505F79] bg-white border-2 border-gray-200 rounded-2xl" href="/admin/inbox">Ke Inbox</Link>
                                    )}
                                    {(currentUser.role === "receptionist" || currentUser.role === "admin") && (
                                        <Link className="px-4 py-2 text-xs font-bold text-[#505F79] bg-white border-2 border-gray-200 rounded-2xl" href="/admin/intake">Ke Intake</Link>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                </main>
            </div>

            {/* Web toasts + sound notifications (dummy, in-browser only) */}
            {currentUser && <ToastCenter userId={currentUser.id} />}
        </div>
    );
}
