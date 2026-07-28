"use client";

import { EnvelopeIcon } from "@heroicons/react/24/solid";
import {
  type FormEvent,
  useEffect,
  useRef,
  useState,
} from "react";

import {
  CaptchaWidget,
  type CaptchaController,
  type CaptchaSnapshot,
} from "@/components/security/captcha-widget";
import { pushAnalyticsEvent } from "@/lib/analytics/events";

type ContactFormState = {
  name: string;
  email: string;
  message: string;
  company: string;
};

const initialForm: ContactFormState = {
  name: "",
  email: "",
  message: "",
  company: "",
};

const initialCaptcha: CaptchaSnapshot = {
  token: null,
  ready: false,
  error: null,
  expired: false,
};

export const ContactForm = ({ recipient }: { recipient: string }) => {
  const [form, setForm] = useState(initialForm);
  const [status, setStatus] = useState("");
  const [statusKind, setStatusKind] = useState<"idle" | "success" | "error">(
    "idle",
  );
  const [pending, setPending] = useState(false);
  const [captcha, setCaptcha] = useState<CaptchaSnapshot>(initialCaptcha);
  const captchaController = useRef<CaptchaController | null>(null);
  const submissionId = useRef("");
  const statusRef = useRef<HTMLParagraphElement | null>(null);

  useEffect(() => {
    if (statusKind === "error") statusRef.current?.focus();
  }, [statusKind, status]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setPending(true);
    setStatus("");
    setStatusKind("idle");

    if (!captcha.token) {
      setPending(false);
      setStatus(captcha.error ?? "Complete the human verification first.");
      setStatusKind("error");
      return;
    }

    try {
      submissionId.current ||= window.crypto.randomUUID();
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          captchaToken: captcha.token,
          submissionId: submissionId.current,
        }),
      });
      const data = await response.json().catch(() => ({}));

      if (response.status === 202 && data.ok) {
        pushAnalyticsEvent({ event: "contact_submit_success", form_name: "portfolio_contact", contact_method: "api", cta_location: "contact_page" });
        setForm(initialForm);
        submissionId.current = "";
        setStatus(data.message ?? "Message received. Thank you.");
        setStatusKind("success");
        return;
      }

      pushAnalyticsEvent({
        event: "contact_submit_error",
        form_name: "portfolio_contact",
        error_type: "api_error",
      });
      setStatus(data.error ?? "Message could not be sent right now.");
      setStatusKind("error");
    } catch {
      pushAnalyticsEvent({
        event: "contact_submit_error",
        form_name: "portfolio_contact",
        error_type: "network_error",
      });
      setStatus(
        `The secure form is temporarily unavailable. Email ${recipient} directly if the problem continues.`,
      );
      setStatusKind("error");
    } finally {
      captchaController.current?.reset();
      setPending(false);
    }
  };

  return (
    <form
      data-clarity-mask="true"
      action="/api/contact"
      method="post"
      onSubmit={handleSubmit}
      className="mt-10 flex flex-col gap-6"
    >
      <label className="flex flex-col">
        <span className="mb-3 font-medium text-white">Name</span>
        <input
          required
          name="name"
          value={form.name}
          onChange={(event) =>
            setForm((current) => ({ ...current, name: event.target.value }))
          }
          placeholder="Your name"
          aria-describedby="contact-form-status"
          className="rounded-lg border border-white/10 bg-[#151030] px-5 py-4 font-medium text-white outline-none transition placeholder:text-gray-500 focus:border-cyan-300/60"
        />
      </label>

      <label className="flex flex-col">
        <span className="mb-3 font-medium text-white">Email</span>
        <input
          required
          type="email"
          name="email"
          value={form.email}
          onChange={(event) =>
            setForm((current) => ({ ...current, email: event.target.value }))
          }
          placeholder="your.email@example.com"
          aria-describedby="contact-form-status"
          className="rounded-lg border border-white/10 bg-[#151030] px-5 py-4 font-medium text-white outline-none transition placeholder:text-gray-500 focus:border-cyan-300/60"
        />
      </label>

      <label className="hidden" aria-hidden="true">
        Company
        <input
          name="company"
          tabIndex={-1}
          autoComplete="off"
          value={form.company}
          onChange={(event) =>
            setForm((current) => ({ ...current, company: event.target.value }))
          }
        />
      </label>

      <label className="flex flex-col">
        <span className="mb-3 font-medium text-white">Message</span>
        <textarea
          required
          name="message"
          value={form.message}
          onChange={(event) =>
            setForm((current) => ({ ...current, message: event.target.value }))
          }
          placeholder="How can I help?"
          aria-describedby="contact-form-status"
          rows={7}
          className="resize-none rounded-lg border border-white/10 bg-[#151030] px-5 py-4 font-medium text-white outline-none transition placeholder:text-gray-500 focus:border-cyan-300/60"
        />
      </label>

      <CaptchaWidget
        action="portfolio-contact"
        onChange={setCaptcha}
        onControllerChange={(controller) => {
          captchaController.current = controller;
        }}
      />

      <button
        type="submit"
        disabled={pending || !captcha.token}
        className="button-primary inline-flex w-fit items-center justify-center gap-2 rounded-lg px-6 py-3 font-bold text-white outline-none transition hover:scale-[1.02] focus:ring-2 focus:ring-cyan-300 disabled:cursor-not-allowed disabled:opacity-60"
      >
        <EnvelopeIcon className="h-5 w-5" />
        {pending ? "Saving..." : "Send Message"}
      </button>

      <p
        ref={statusRef}
        id="contact-form-status"
        className="min-h-6 text-sm text-cyan-100 outline-none"
        role={statusKind === "error" ? "alert" : "status"}
        tabIndex={statusKind === "error" ? -1 : undefined}
      >
        {status}
      </p>
    </form>
  );
};
