"use client";

export function playBeep(opts?: { volume?: number; durationMs?: number; frequencyHz?: number }) {
    const volume = Math.max(0, Math.min(1, opts?.volume ?? 0.25));
    const durationMs = Math.max(40, opts?.durationMs ?? 180);
    const frequencyHz = Math.max(120, opts?.frequencyHz ?? 880);

    try {
        const AudioCtx = (window.AudioContext || (window as any).webkitAudioContext);
        if (!AudioCtx) return;
        const ctx = new AudioCtx();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.value = frequencyHz;
        gain.gain.value = volume;
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        setTimeout(() => {
            try { osc.stop(); } catch { /* ignore */ }
            try { ctx.close(); } catch { /* ignore */ }
        }, durationMs);
    } catch {
        // ignore
    }
}

export function maybeDesktopNotify(title: string, body: string, onClick?: () => void) {
    try {
        if (!("Notification" in window)) return;
        if (Notification.permission !== "granted") return;
        const n = new Notification(title, { body });
        if (onClick) {
            n.onclick = () => {
                try { onClick(); } catch { /* ignore */ }
            };
        }
    } catch {
        // ignore
    }
}

