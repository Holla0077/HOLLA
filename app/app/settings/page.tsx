"use client";

import { useEffect, useMemo, useState, useCallback } from "react";

type MeResponse = {
  user: {
    id: string;
    fullName?: string | null;
    username?: string | null;
    email?: string | null;
    gender?: string | null;
    dob?: string | null;
    verified?: boolean;
  };
  phones: { id: string; number: string; verified: boolean }[];
  kyc: {
    idVerified: boolean;
    bvnVerified?: boolean;
  };
};

type Tab = "PERSONAL" | "SECURITY";

function getErrorMessage(e: unknown) {
  if (e instanceof Error) return e.message;
  if (typeof e === "string") return e;
  return "Something went wrong";
}

export default function SettingsPage() {
  const [tab, setTab] = useState<Tab>("PERSONAL");

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [me, setMe] = useState<MeResponse | null>(null);

  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [gender, setGender] = useState("");
  const [dob, setDob] = useState("");

  const [saveBusy, setSaveBusy] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveOk, setSaveOk] = useState<string | null>(null);

  const [phoneNew, setPhoneNew] = useState("");
  const [phoneBusy, setPhoneBusy] = useState(false);
  const [phoneError, setPhoneError] = useState<string | null>(null);

  const [pwBusy, setPwBusy] = useState(false);
  const [pwError, setPwError] = useState<string | null>(null);
  const [pwOk, setPwOk] = useState<string | null>(null);
  const [pwCurrent, setPwCurrent] = useState("");
  const [pwNext, setPwNext] = useState("");
  const [pwNext2, setPwNext2] = useState("");

  const loadProfile = useCallback(async () => {
    try {
      setLoading(true);
      setLoadError(null);

      const res = await fetch("/api/me");
      const ct = res.headers.get("content-type") || "";
      if (!ct.includes("application/json")) {
        setMe(null);
        return;
      }

      const data = await res.json();

      if (!res.ok) {
        setLoadError(data?.error || "Failed to load profile");
        return;
      }

      const profile = data as MeResponse;
      setMe(profile);
      setFullName(profile.user.fullName || "");
      setUsername(profile.user.username || "");
      setGender(profile.user.gender || "");
      setDob(profile.user.dob || "");
    } catch (e) {
      setLoadError(getErrorMessage(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  const phones = useMemo(() => me?.phones || [], [me]);

  function pill(ok: boolean) {
    return ok
      ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-200"
      : "border-slate-200/20 bg-slate-900/10 text-white/70";
  }

  async function savePersonal() {
    setSaveBusy(true);
    setSaveError(null);
    setSaveOk(null);

    try {
      if (username.trim().length < 3) {
        setSaveError("Username must be at least 3 characters.");
        return;
      }

      const res = await fetch("/api/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: fullName.trim() || null,
          username: username.trim(),
          gender: gender || null,
          dob: dob || null,
        }),
      });

      const ct = res.headers.get("content-type") || "";
      const data = ct.includes("application/json") ? await res.json() : { error: await res.text() };

      if (!res.ok) {
        setSaveError(data?.error || "Failed to save");
        return;
      }

      setSaveOk("Saved successfully.");
      await loadProfile();
    } catch (e) {
      setSaveError(getErrorMessage(e));
    } finally {
      setSaveBusy(false);
    }
  }

  async function addPhone() {
    setPhoneBusy(true);
    setPhoneError(null);

    try {
      if (!phoneNew.trim()) {
        setPhoneError("Enter a phone number.");
        return;
      }

      const res = await fetch("/api/me/phones", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ number: phoneNew.trim() }),
      });

      const ct = res.headers.get("content-type") || "";
      const data = ct.includes("application/json") ? await res.json() : { error: await res.text() };
      if (!res.ok) {
        setPhoneError(data?.error || "Failed to update phone");
        return;
      }

      setPhoneNew("");
      await loadProfile();
    } catch (e) {
      setPhoneError(getErrorMessage(e));
    } finally {
      setPhoneBusy(false);
    }
  }

  async function changePassword() {
    setPwBusy(true);
    setPwError(null);
    setPwOk(null);

    try {
      if (!pwCurrent || !pwNext) {
        setPwError("Enter current and new password.");
        return;
      }
      if (pwNext.length < 8) {
        setPwError("New password must be at least 8 characters.");
        return;
      }
      if (pwNext !== pwNext2) {
        setPwError("New passwords do not match.");
        return;
      }

      const res = await fetch("/api/me/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword: pwCurrent, newPassword: pwNext }),
      });

      const ct = res.headers.get("content-type") || "";
      const data = ct.includes("application/json") ? await res.json() : { error: await res.text() };
      if (!res.ok) {
        setPwError(data?.error || "Failed to change password");
        return;
      }

      setPwOk("Password updated successfully.");
      setPwCurrent("");
      setPwNext("");
      setPwNext2("");
    } catch (e) {
      setPwError(getErrorMessage(e));
    } finally {
      setPwBusy(false);
    }
  }

  return (
    <div className="max-w-[980px]">
      <div className="mb-6">
        <div className="text-[28px] font-semibold text-white" style={{ fontFamily: "serif" }}>
          Settings
        </div>
        <div className="mt-1 text-[14px] text-white/70">
          Manage your personal info and security.
        </div>
      </div>

      <div className="flex items-center gap-10 border-b border-slate-200/20 pb-3">
        {(["PERSONAL", "SECURITY"] as const).map((t) => {
          const active = tab === t;
          return (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className={[
                "text-[18px] font-semibold tracking-wide",
                active ? "text-white" : "text-white/70 hover:text-white/90",
              ].join(" ")}
              style={{ fontFamily: "serif" }}
            >
              {t === "PERSONAL" ? "Personal" : "Security"}
              <div
                className={[
                  "mt-2 h-[3px] rounded-full transition-all",
                  active ? "w-24 bg-emerald-500" : "w-0 bg-transparent",
                ].join(" ")}
              />
            </button>
          );
        })}
      </div>

      {loadError && (
        <div className="mt-6 rounded-[16px] border border-red-700/40 bg-red-500/10 p-4 text-[14px] text-red-200">
          {loadError}
        </div>
      )}

      {!loading && !me && !loadError && (
        <div className="mt-6 rounded-[16px] border border-slate-200/20 bg-slate-900/10 p-5 text-[14px] text-white/75">
          Could not load profile. Please refresh the page.
        </div>
      )}

      <div className="mt-6 grid gap-6">
        {loading ? (
          <div className="text-[14px] text-white/70">Loading…</div>
        ) : tab === "PERSONAL" ? (
          <>
            <div className="rounded-[22px] border border-slate-200/20 bg-transparent p-6">
              <div className="flex items-center justify-between">
                <div className="text-[18px] font-semibold text-white" style={{ fontFamily: "serif" }}>
                  Personal settings
                </div>
                <div className={["rounded-full border px-3 py-1 text-[12px]", pill(!!me?.user.verified)].join(" ")}>
                  {me?.user.verified ? "Verified" : "Not verified"}
                </div>
              </div>

              <div className="mt-5 flex items-center gap-5">
                <div className="h-20 w-20 rounded-full border border-slate-200/20 bg-slate-900/10" />
                <button
                  type="button"
                  className="rounded-[14px] border border-slate-200/20 bg-slate-900/10 px-4 py-3 text-[14px] text-white/80 hover:border-slate-200/35"
                >
                  Tap to change picture (later)
                </button>
              </div>

              <div className="mt-6 grid gap-5">
                <Field label="Full Name">
                  <input
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full rounded-[16px] border border-slate-200/15 bg-slate-900/10 px-4 py-4 text-[15px] text-white outline-none focus:border-emerald-400"
                    placeholder="Your full name"
                  />
                </Field>

                <Field label="Username">
                  <input
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full rounded-[16px] border border-slate-200/15 bg-slate-900/10 px-4 py-4 text-[15px] text-white outline-none focus:border-emerald-400"
                    placeholder="your_username"
                  />
                </Field>

                <div className="grid gap-5 md:grid-cols-2">
                  <Field label="Gender">
                    <select
                      value={gender}
                      onChange={(e) => setGender(e.target.value)}
                      className="w-full rounded-[16px] border border-slate-200/15 bg-slate-900/10 px-4 py-4 text-[15px] text-white outline-none focus:border-emerald-400"
                    >
                      <option value="">Select…</option>
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Other</option>
                      <option value="Prefer not to say">Prefer not to say</option>
                    </select>
                  </Field>

                  <Field label="Date of Birth">
                    <input
                      value={dob}
                      onChange={(e) => setDob(e.target.value)}
                      type="date"
                      className="w-full rounded-[16px] border border-slate-200/15 bg-slate-900/10 px-4 py-4 text-[15px] text-white outline-none focus:border-emerald-400"
                    />
                  </Field>
                </div>

                {saveError && (
                  <div className="rounded-[14px] border border-red-700/40 bg-red-500/10 p-3 text-[13px] text-red-200">
                    {saveError}
                  </div>
                )}
                {saveOk && (
                  <div className="rounded-[14px] border border-emerald-500/30 bg-emerald-500/10 p-3 text-[13px] text-emerald-200">
                    {saveOk}
                  </div>
                )}

                <button
                  disabled={saveBusy}
                  onClick={savePersonal}
                  className="mx-auto mt-2 w-[220px] rounded-[18px] bg-emerald-500 px-6 py-4 text-[15px] font-semibold text-black hover:bg-emerald-600 disabled:opacity-60"
                  style={{ fontFamily: "serif" }}
                >
                  {saveBusy ? "Saving..." : "Save"}
                </button>
              </div>
            </div>

            <div className="rounded-[22px] border border-slate-200/20 bg-transparent p-6">
              <div className="flex items-center justify-between">
                <div className="text-[18px] font-semibold text-white" style={{ fontFamily: "serif" }}>
                  Verification
                </div>
              </div>

              {!me?.user.verified && (
                <div className="mt-4 rounded-[14px] border border-yellow-500/30 bg-yellow-500/10 p-3 text-[13px] text-yellow-200">
                  Your account is not yet verified. You must complete verification before you can send, receive, or withdraw funds.
                </div>
              )}

              <div className="mt-5 space-y-3">
                <RowItem
                  title="ID Verification"
                  status={me?.kyc?.idVerified ? "Verified" : "Not verified"}
                  statusOk={!!me?.kyc?.idVerified}
                  actionLabel={me?.kyc?.idVerified ? "View" : "Start"}
                  onClick={() => alert("ID verification flow coming soon. Contact support to manually verify your account.")}
                />
                <RowItem
                  title="BVN Verification (optional)"
                  status={me?.kyc?.bvnVerified ? "Verified" : "Not verified"}
                  statusOk={!!me?.kyc?.bvnVerified}
                  actionLabel="Coming soon"
                  onClick={() => {}}
                  disabled
                />
              </div>
            </div>
          </>
        ) : (
          <>
            <div className="rounded-[22px] border border-slate-200/20 bg-transparent p-6">
              <div className="text-[18px] font-semibold text-white" style={{ fontFamily: "serif" }}>
                Security settings
              </div>

              <div className="mt-6 grid gap-5">
                <Field label="Email Address" right={me?.user.email ? "Verified" : undefined}>
                  <input
                    value={me?.user.email || ""}
                    readOnly
                    className="w-full rounded-[16px] border border-slate-200/10 bg-slate-900/10 px-4 py-4 text-[15px] text-white/80 outline-none"
                    placeholder="—"
                  />
                </Field>

                <Field label="Phone Number" right={phones.length ? `${phones.length} saved` : undefined}>
                  <div className="space-y-3">
                    {phones.length === 0 ? (
                      <div className="rounded-[16px] border border-slate-200/10 bg-slate-900/10 px-4 py-4 text-[14px] text-white/70">
                        No phone number set.
                      </div>
                    ) : (
                      phones.map((p) => (
                        <div
                          key={p.id}
                          className="flex items-center justify-between rounded-[16px] border border-slate-200/10 bg-slate-900/10 px-4 py-4"
                        >
                          <div>
                            <div className="text-[15px] text-white/90">{p.number}</div>
                            <div className={["mt-1 inline-flex rounded-full border px-2 py-0.5 text-[12px]", pill(p.verified)].join(" ")}>
                              {p.verified ? "Verified" : "Not verified"}
                            </div>
                          </div>
                          <div className="text-[12px] text-white/50">Primary</div>
                        </div>
                      ))
                    )}

                    <div className="flex gap-3">
                      <input
                        value={phoneNew}
                        onChange={(e) => setPhoneNew(e.target.value)}
                        placeholder="+233..."
                        className="flex-1 rounded-[16px] border border-slate-200/15 bg-slate-900/10 px-4 py-4 text-[15px] text-white outline-none focus:border-emerald-400"
                      />
                      <button
                        disabled={phoneBusy}
                        onClick={addPhone}
                        className="rounded-[16px] bg-emerald-500 px-5 py-4 text-[14px] font-semibold text-black hover:bg-emerald-600 disabled:opacity-60"
                      >
                        Update
                      </button>
                    </div>

                    {phoneError && (
                      <div className="rounded-[14px] border border-red-700/40 bg-red-500/10 p-3 text-[13px] text-red-200">
                        {phoneError}
                      </div>
                    )}
                  </div>
                </Field>
              </div>
            </div>

            <div className="rounded-[22px] border border-slate-200/20 bg-transparent p-6">
              <div className="text-[18px] font-semibold text-white" style={{ fontFamily: "serif" }}>
                Pin and Password
              </div>

              <div className="mt-5 grid gap-4">
                <div className="rounded-[18px] border border-slate-200/10 bg-slate-900/10 p-5">
                  <div className="text-[15px] font-semibold text-white/90">Change Password</div>
                  <div className="mt-4 grid gap-3">
                    <input
                      value={pwCurrent}
                      onChange={(e) => setPwCurrent(e.target.value)}
                      type="password"
                      placeholder="Current password"
                      className="w-full rounded-[16px] border border-slate-200/15 bg-transparent px-4 py-4 text-[15px] text-white outline-none focus:border-emerald-400"
                    />
                    <input
                      value={pwNext}
                      onChange={(e) => setPwNext(e.target.value)}
                      type="password"
                      placeholder="New password"
                      className="w-full rounded-[16px] border border-slate-200/15 bg-transparent px-4 py-4 text-[15px] text-white outline-none focus:border-emerald-400"
                    />
                    <input
                      value={pwNext2}
                      onChange={(e) => setPwNext2(e.target.value)}
                      type="password"
                      placeholder="Confirm new password"
                      className="w-full rounded-[16px] border border-slate-200/15 bg-transparent px-4 py-4 text-[15px] text-white outline-none focus:border-emerald-400"
                    />

                    {pwError && (
                      <div className="rounded-[14px] border border-red-700/40 bg-red-500/10 p-3 text-[13px] text-red-200">
                        {pwError}
                      </div>
                    )}
                    {pwOk && (
                      <div className="rounded-[14px] border border-emerald-500/30 bg-emerald-500/10 p-3 text-[13px] text-emerald-200">
                        {pwOk}
                      </div>
                    )}

                    <button
                      disabled={pwBusy}
                      onClick={changePassword}
                      className="mt-1 w-full rounded-[16px] bg-emerald-500 px-6 py-4 text-[14px] font-semibold text-black hover:bg-emerald-600 disabled:opacity-60"
                    >
                      {pwBusy ? "Updating..." : "Save password"}
                    </button>
                  </div>
                </div>

                <div className="rounded-[18px] border border-slate-200/10 bg-slate-900/10 p-5">
                  <div className="text-[15px] font-semibold text-white/90">Two-Factor Authentication</div>
                  <div className="mt-2 text-[13px] text-white/70">
                    Coming soon. We'll enable 2FA after we finalize phone verification flow.
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function Field(props: { label: string; right?: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <div className="text-[14px] text-white/80" style={{ fontFamily: "serif" }}>
          {props.label}
        </div>
        {props.right ? <div className="text-[13px] text-emerald-200/90">{props.right}</div> : null}
      </div>
      {props.children}
    </div>
  );
}

function RowItem(props: {
  title: string;
  status: string;
  statusOk: boolean;
  actionLabel: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex items-center justify-between rounded-[18px] border border-slate-200/10 bg-slate-900/10 px-5 py-4">
      <div>
        <div className="text-[15px] font-semibold text-white/90">{props.title}</div>
        <div
          className={[
            "mt-1 inline-flex rounded-full border px-2 py-0.5 text-[12px]",
            props.statusOk
              ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-200"
              : "border-slate-200/20 bg-slate-900/10 text-white/70",
          ].join(" ")}
        >
          {props.status}
        </div>
      </div>
      <button
        type="button"
        disabled={props.disabled}
        onClick={props.onClick}
        className="rounded-[14px] border border-slate-200/20 bg-slate-900/10 px-4 py-2 text-[13px] font-semibold text-white/90 hover:border-slate-200/35 disabled:opacity-40"
      >
        {props.actionLabel}
      </button>
    </div>
  );
}
