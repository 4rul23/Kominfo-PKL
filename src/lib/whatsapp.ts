"use client";

export function normalizeWhatsAppNumber(raw: string): string {
    const s = (raw || "").trim();
    if (!s) return "";
    const digits = s.replace(/[^\d]/g, "");
    if (!digits) return "";
    if (digits.startsWith("62")) return digits;
    if (digits.startsWith("0")) return `62${digits.slice(1)}`;
    if (digits.startsWith("8")) return `62${digits}`;
    return digits;
}

export function buildWaMeLink(phoneRaw: string, message: string): string {
    const digits = normalizeWhatsAppNumber(phoneRaw);
    if (!digits) return "";
    const text = encodeURIComponent(message || "");
    return `https://wa.me/${digits}${text ? `?text=${text}` : ""}`;
}

