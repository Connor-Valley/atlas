import { Resend } from "resend";
import { getRedis } from "../common/cache.js";
import { ContactRateLimitError, ContactValidationError, type ContactRequest } from "./contact.types.js";

const MAX_NAME_LENGTH = 100;
const MAX_MESSAGE_LENGTH = 5000;
const MAX_EMAIL_LENGTH = 254; // RFC 5321 max mailbox length

// No dot in the domain, or a dot straight after @, is enough to reject nonsense like "a@b" or
// "a@.com" without a regex at all — the local-part/domain split and the dot check are both
// plain string operations (indexOf/includes), which stay linear-time regardless of input length.
// The previous version used /^[^\s@]+@[^\s@]+\.[^\s@]+$/, which CodeQL flagged as a polynomial
// ReDoS: the two `[^\s@]+` groups both allow dots, so a domain with many dots (e.g. "a.a.a.a...")
// gives the backtracker many ways to split across the literal `\.`, and the email field had no
// length cap to bound that cost.
function isValidEmail(value: string): boolean {
  if (!value || value.length > MAX_EMAIL_LENGTH) return false;
  const at = value.indexOf("@");
  if (at <= 0 || at !== value.lastIndexOf("@")) return false;
  if (/\s/.test(value)) return false;

  const domain = value.slice(at + 1);
  const dot = domain.lastIndexOf(".");
  return dot > 0 && dot < domain.length - 1;
}

// A blunt, non-exhaustive deterrent against the obvious troll case (e.g. "fuckyou@bitch.com")
// — not a real moderation system. Checked against name and the email's local part/domain since
// that's the field trolls actually vandalize; message body isn't checked here to avoid blocking
// legitimate bug reports that quote offensive content found elsewhere on the site.
const PROFANITY_PATTERN = new RegExp(
  `\\b(${["fuck", "shit", "bitch", "asshole", "cunt", "dick", "piss", "bastard", "whore", "slut"].join("|")})`,
  "i",
);

function containsProfanity(...values: string[]): boolean {
  return values.some((v) => PROFANITY_PATTERN.test(v));
}

const RATE_LIMIT_MAX = 5;
const RATE_LIMIT_WINDOW_SECONDS = 60 * 60; // 1 hour per IP

let _resend: Resend | null | undefined;
function getResend(): Resend | null {
  if (_resend !== undefined) return _resend;
  _resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;
  return _resend;
}

function validate(body: Partial<ContactRequest>): ContactRequest {
  const name = body.name?.trim() ?? "";
  const email = body.email?.trim() ?? "";
  const message = body.message?.trim() ?? "";

  if (!name || name.length > MAX_NAME_LENGTH) {
    throw new ContactValidationError("Please enter a valid name.");
  }
  if (!isValidEmail(email)) {
    throw new ContactValidationError("Please enter a valid email address.");
  }
  if (!message || message.length > MAX_MESSAGE_LENGTH) {
    throw new ContactValidationError(`Message must be between 1 and ${MAX_MESSAGE_LENGTH} characters.`);
  }
  if (containsProfanity(name, email)) {
    throw new ContactValidationError("Please enter a valid name and email address.");
  }

  return { name, email, message, turnstileToken: body.turnstileToken };
}

// Cloudflare Turnstile verification is skipped (not a hard failure) when TURNSTILE_SECRET_KEY
// isn't configured, matching the rest of the API's "degrade gracefully without optional env
// vars" pattern — but once it IS configured, a missing/invalid token is a hard failure so the
// protection can't be silently bypassed by omitting the field.
async function verifyTurnstile(token: string | undefined): Promise<void> {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) return;

  if (!token) {
    throw new ContactValidationError("Please complete the verification challenge.");
  }

  const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ secret, response: token }),
  });
  const result = (await res.json()) as { success: boolean };
  if (!result.success) {
    throw new ContactValidationError("Verification failed. Please try again.");
  }
}

// Best-effort IP-based rate limit — only enforced when Upstash Redis is configured, since
// there's no other shared store to count against in a multi-instance deployment. Falls open
// (no limit) rather than blocking submissions when Redis is unavailable.
async function checkRateLimit(ip: string): Promise<void> {
  const redis = getRedis();
  if (!redis) return;

  const key = `contact-rl:${ip}`;
  const count = await redis.incr(key);
  if (count === 1) {
    await redis.expire(key, RATE_LIMIT_WINDOW_SECONDS);
  }
  if (count > RATE_LIMIT_MAX) {
    throw new ContactRateLimitError("Too many messages sent recently. Please try again later.");
  }
}

export async function sendContactMessage(body: Partial<ContactRequest>, ip: string): Promise<void> {
  await checkRateLimit(ip);
  const { name, email, message, turnstileToken } = validate(body);
  await verifyTurnstile(turnstileToken);

  const resend = getResend();
  if (!resend) {
    throw new Error("Contact form is not configured (RESEND_API_KEY missing).");
  }

  const to = process.env.CONTACT_TO_EMAIL;
  const from = process.env.CONTACT_FROM_EMAIL;
  if (!to || !from) {
    throw new Error("Contact form is not configured (CONTACT_TO_EMAIL/CONTACT_FROM_EMAIL missing).");
  }

  const { error } = await resend.emails.send({
    from: `Atlas Contact Form <${from}>`,
    to,
    replyTo: email,
    subject: `New contact form message from ${name}`,
    text: `From: ${name} <${email}>\n\n${message}`,
  });

  if (error) {
    throw new Error(`Failed to send email: ${error.message}`);
  }
}
