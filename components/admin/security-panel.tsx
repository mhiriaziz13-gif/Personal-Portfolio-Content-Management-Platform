"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";

import { adminFetch } from "@/components/admin/admin-api";

type Device = {
  id: string;
  created_at: string;
  last_used_at?: string | null;
  expires_at: string;
  revoked_at?: string | null;
};

type Factor = {
  id: string;
  friendly_name?: string;
  status?: string;
  factor_type?: string;
};

type Status = {
  email?: string;
  aal?: { currentLevel?: string | null; nextLevel?: string | null } | null;
  factors?: { totp?: Factor[]; all?: Factor[] } | null;
  mfaRequired?: boolean;
  mfaSatisfied?: boolean;
  rememberDeviceEnabled?: boolean;
  remembered?: boolean;
  devices?: Device[];
};

export const SecurityPanel = () => {
  const [status, setStatus] = useState<Status>({});
  const [message, setMessage] = useState("");
  const [enrollment, setEnrollment] = useState<{ factorId: string; qrCode: string; secret: string } | null>(null);
  const [code, setCode] = useState("");
  const [removeCode, setRemoveCode] = useState("");
  const [pending, setPending] = useState(false);

  const verifiedFactor = useMemo(() => status.factors?.totp?.[0] ?? null, [status.factors]);
  const activeFactorId = enrollment?.factorId ?? verifiedFactor?.id ?? "";

  const load = async () => {
    try {
      const response = await adminFetch("/api/auth/mfa/status");
      const data = await response.json().catch(() => ({}));
      if (response.ok && data.ok) setStatus(data);
    } catch {
      // Keep the last known security status when a refresh is unavailable.
    }
  };

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void load();
    }, 0);

    return () => window.clearTimeout(timer);
  }, []);

  const enroll = async () => {
    setPending(true);
    setMessage("Creating authenticator enrollment...");
    try {
      const response = await adminFetch("/api/auth/mfa/enroll", { method: "POST" });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.ok) {
        setMessage(data.error ?? "Could not enroll MFA.");
        return;
      }
      setEnrollment({ factorId: data.factorId, qrCode: data.qrCode, secret: data.secret });
      setMessage("Scan the QR code, then verify the 6-digit code.");
    } catch {
      setMessage("Could not enroll MFA.");
    } finally {
      setPending(false);
    }
  };

  const verify = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setPending(true);
    try {
      const response = await adminFetch("/api/auth/mfa/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ factorId: activeFactorId, code, rememberDevice: false }),
      });
      const data = await response.json().catch(() => ({}));
      setMessage(response.ok && data.ok ? "MFA verified." : data.error ?? "Invalid code.");
      if (response.ok && data.ok) {
        setEnrollment(null);
        setCode("");
        await load();
      }
    } catch {
      setMessage("Invalid code.");
    } finally {
      setPending(false);
    }
  };

  const savePreferences = async (mfaRequired: boolean, rememberDeviceEnabled: boolean) => {
    setPending(true);
    try {
      const response = await adminFetch("/api/auth/mfa/preferences", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mfaRequired, rememberDeviceEnabled }),
      });
      const data = await response.json().catch(() => ({}));
      setMessage(response.ok && data.ok ? "Security preferences saved." : data.error ?? "Could not save preferences.");
      await load();
    } catch {
      setMessage("Could not save preferences.");
    } finally {
      setPending(false);
    }
  };

  const verifyCurrentFactor = async () => {
    if (!verifiedFactor?.id || !/^\d{6}$/.test(removeCode)) {
      setMessage("Enter the current 6-digit authenticator code.");
      return;
    }

    setPending(true);
    try {
      const response = await adminFetch("/api/auth/mfa/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          factorId: verifiedFactor.id,
          code: removeCode,
          rememberDevice: false,
        }),
      });
      const data = await response.json().catch(() => ({}));
      setMessage(
        response.ok && data.ok
          ? "Fresh MFA verification completed."
          : data.error ?? "Invalid authenticator code.",
      );
      if (response.ok && data.ok) {
        setRemoveCode("");
        await load();
      }
    } catch {
      setMessage("Invalid authenticator code.");
    } finally {
      setPending(false);
    }
  };

  const removeFactor = async () => {
    if (!verifiedFactor?.id) return;
    const confirmed = window.confirm("Remove this MFA factor? You should keep at least one secure factor active.");
    if (!confirmed) return;

    try {
      const response = await adminFetch("/api/auth/mfa/remove", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ factorId: verifiedFactor.id, code: removeCode || undefined }),
      });
      const data = await response.json().catch(() => ({}));
      setMessage(response.ok && data.ok ? "MFA factor removed." : data.error ?? "Could not remove factor.");
      setRemoveCode("");
      await load();
    } catch {
      setMessage("Could not remove factor.");
    }
  };

  const revokeDevice = async (id?: string, all = false) => {
    try {
      const response = await adminFetch("/api/auth/remember-device/revoke", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, all }),
      });
      const data = await response.json().catch(() => ({}));
      setMessage(response.ok && data.ok ? "Remembered device revoked." : data.error ?? "Could not revoke device.");
      await load();
    } catch {
      setMessage("Could not revoke device.");
    }
  };

  return (
    <section className="relative z-[20] mx-auto flex w-full max-w-5xl flex-col gap-6 px-6 py-28 text-gray-200">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="Welcome-text text-sm uppercase">Admin Security</p>
          <h1 className="mt-3 text-4xl font-bold text-white">MFA & Devices</h1>
          <p className="mt-3 text-sm text-gray-400">Signed in as {status.email ?? "admin"}. TOTP is a second factor, never a password replacement.</p>
        </div>
        <Link href="/admin" className="rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm hover:bg-white/10">Back to dashboard</Link>
      </div>

      <div className="rounded-lg border border-white/10 bg-[#100b24]/90 p-5 shadow-xl shadow-[#2A0E61]/20">
        <h2 className="text-2xl font-bold text-white">Authenticator app</h2>
        <p className="mt-2 text-sm text-gray-400">Current AAL: {status.aal?.currentLevel ?? "unknown"}. MFA required: {status.mfaRequired ? "yes" : "no"}.</p>
        <div className="mt-5 flex flex-wrap gap-3">
          <button type="button" onClick={enroll} disabled={pending} className="button-primary rounded-lg px-5 py-3 font-semibold text-white disabled:opacity-60">Enroll authenticator</button>
          <button type="button" onClick={() => void savePreferences(!status.mfaRequired, status.rememberDeviceEnabled ?? true)} disabled={pending} className="rounded-lg border border-white/10 bg-white/5 px-5 py-3 text-sm hover:bg-white/10 disabled:opacity-60">{status.mfaRequired ? "Disable MFA requirement" : "Require MFA"}</button>
          <button type="button" onClick={() => void savePreferences(Boolean(status.mfaRequired), !(status.rememberDeviceEnabled ?? true))} disabled={pending} className="rounded-lg border border-white/10 bg-white/5 px-5 py-3 text-sm hover:bg-white/10 disabled:opacity-60">{status.rememberDeviceEnabled ? "Disable remember device" : "Enable remember device"}</button>
        </div>

        {enrollment && (
          <div className="mt-6 grid gap-5 md:grid-cols-[14rem_1fr]">
            <div className="rounded-lg bg-white p-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={enrollment.qrCode} alt="Authenticator QR code" className="h-full w-full" />
            </div>
            <form onSubmit={verify} className="flex flex-col gap-4">
              <p className="text-sm text-gray-300">Manual secret: <span className="font-mono text-cyan-100">{enrollment.secret}</span></p>
              <input value={code} onChange={(event) => setCode(event.target.value)} inputMode="numeric" pattern="[0-9]{6}" placeholder="123456" className="rounded-lg border border-white/10 bg-[#151030] px-4 py-3 text-white outline-none focus:border-cyan-300/60" required />
              <button type="submit" className="button-primary w-fit rounded-lg px-5 py-3 font-semibold text-white">Verify enrollment</button>
            </form>
          </div>
        )}

        {verifiedFactor && (
          <div className="mt-6 rounded-lg border border-white/10 bg-white/5 p-4">
            <p className="text-sm text-gray-300">Verified factor: {verifiedFactor.friendly_name ?? verifiedFactor.id}</p>
            <div className="mt-3 flex flex-col gap-3 md:flex-row md:items-center">
              <input value={removeCode} onChange={(event) => setRemoveCode(event.target.value)} inputMode="numeric" placeholder="Current 6-digit code" className="rounded-lg border border-white/10 bg-[#151030] px-4 py-3 text-sm text-white outline-none focus:border-cyan-300/60" />
              <button type="button" onClick={() => void verifyCurrentFactor()} disabled={pending} className="rounded-lg border border-cyan-300/30 bg-cyan-500/10 px-4 py-3 text-sm text-cyan-100 hover:bg-cyan-500/20 disabled:opacity-60">Verify for settings</button>
              <button type="button" onClick={removeFactor} className="rounded-lg border border-red-300/30 bg-red-500/10 px-4 py-3 text-sm text-red-100 hover:bg-red-500/20">Remove factor</button>
            </div>
          </div>
        )}
      </div>

      <div className="rounded-lg border border-white/10 bg-[#100b24]/90 p-5 shadow-xl shadow-[#2A0E61]/20">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-2xl font-bold text-white">Remembered devices</h2>
            <p className="mt-2 text-sm text-gray-400">Remembered devices skip only MFA after a valid login.</p>
          </div>
          <button type="button" onClick={() => void revokeDevice(undefined, true)} className="rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm hover:bg-white/10">Revoke all</button>
        </div>
        <div className="mt-5 grid gap-3">
          {(status.devices ?? []).map((device) => (
            <div key={device.id} className="flex flex-col gap-3 rounded-lg border border-white/10 bg-white/5 p-4 md:flex-row md:items-center md:justify-between">
              <div className="text-sm text-gray-300">
                <p>Created: {new Date(device.created_at).toLocaleString()}</p>
                <p>Expires: {new Date(device.expires_at).toLocaleString()}</p>
                <p>Status: {device.revoked_at ? "revoked" : "active"}</p>
              </div>
              {!device.revoked_at && <button type="button" onClick={() => void revokeDevice(device.id)} className="rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm hover:bg-white/10">Revoke</button>}
            </div>
          ))}
          {!(status.devices ?? []).length && <p className="text-sm text-gray-400">No remembered devices yet.</p>}
        </div>
      </div>

      <p className="min-h-6 text-sm text-cyan-100" aria-live="polite">{message}</p>
    </section>
  );
};
