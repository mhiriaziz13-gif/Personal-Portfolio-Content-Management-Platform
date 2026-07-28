"use client";

import HCaptcha from "@hcaptcha/react-hcaptcha";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

const configuredProvider =
  process.env.NEXT_PUBLIC_CAPTCHA_PROVIDER?.trim().toLowerCase() ?? "";
const configuredSiteKey =
  process.env.NEXT_PUBLIC_CAPTCHA_SITE_KEY?.trim() ?? "";

export type CaptchaSnapshot = {
  token: string | null;
  ready: boolean;
  error: string | null;
  expired: boolean;
};

export type CaptchaController = {
  reset: () => void;
  execute: () => void;
};

type CaptchaWidgetProps = {
  action: "admin-login" | "password-recovery" | "portfolio-contact";
  onChange: (snapshot: CaptchaSnapshot) => void;
  onControllerChange?: (controller: CaptchaController | null) => void;
};

const configurationError =
  configuredProvider !== "hcaptcha"
    ? "Verification is unavailable. Contact the site administrator."
    : !configuredSiteKey
      ? "Verification is not configured. Contact the site administrator."
      : null;

const initialSnapshot: CaptchaSnapshot = {
  token: null,
  ready: false,
  error: configurationError,
  expired: false,
};

export const CaptchaWidget = ({
  action,
  onChange,
  onControllerChange,
}: CaptchaWidgetProps) => {
  const captchaRef = useRef<HCaptcha>(null);
  const onChangeRef = useRef(onChange);
  const [snapshot, setSnapshot] = useState<CaptchaSnapshot>(initialSnapshot);

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  const emit = useCallback((next: CaptchaSnapshot) => {
    setSnapshot(next);
    onChangeRef.current(next);
  }, []);

  const markReady = useCallback(() => {
    emit({ token: null, ready: true, error: null, expired: false });
  }, [emit]);

  const handleVerify = useCallback(
    (token: string) => {
      emit({ token, ready: true, error: null, expired: false });
    },
    [emit],
  );

  const handleExpired = useCallback(() => {
    emit({ token: null, ready: true, error: null, expired: true });
  }, [emit]);

  const handleError = useCallback(() => {
    emit({
      token: null,
      ready: false,
      error: "Verification failed to load. Refresh and try again.",
      expired: false,
    });
  }, [emit]);

  const reset = useCallback(() => {
    if (!captchaRef.current) {
      emit(initialSnapshot);
      return;
    }

    try {
      captchaRef.current.resetCaptcha();
      emit({ token: null, ready: true, error: null, expired: false });
    } catch {
      emit({
        token: null,
        ready: false,
        error: "Verification could not be reset. Refresh and try again.",
        expired: false,
      });
    }
  }, [emit]);

  const execute = useCallback(() => {
    captchaRef.current?.execute();
  }, []);

  const controller = useMemo(
    () => ({ reset, execute }),
    [execute, reset],
  );

  useEffect(() => {
    onControllerChange?.(controller);
    return () => onControllerChange?.(null);
  }, [controller, onControllerChange]);

  useEffect(() => {
    onChangeRef.current(initialSnapshot);
  }, [action]);

  const status = snapshot.error
    ? snapshot.error
    : snapshot.expired
      ? "Verification expired. Complete it again."
      : snapshot.token
        ? "Verification complete."
        : snapshot.ready
          ? "Complete the verification first."
          : "Loading verification...";

  return (
    <div
      className="flex min-w-0 flex-col gap-2"
      role="group"
      aria-label="Human verification"
    >
      <div className="min-h-[140px] w-full min-w-0 overflow-hidden min-[400px]:min-h-[65px]">
        {!configurationError && (
          <HCaptcha
            ref={captchaRef}
            sitekey={configuredSiteKey}
            theme="dark"
            size="normal"
            reCaptchaCompat={false}
            sentry={false}
            onLoad={markReady}
            onReady={markReady}
            onVerify={handleVerify}
            onExpire={handleExpired}
            onChalExpired={handleExpired}
            onError={handleError}
          />
        )}
      </div>
      <p className="min-h-5 text-xs text-cyan-100" aria-live="polite">
        {status}
      </p>
    </div>
  );
};
