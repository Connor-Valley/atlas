export type ContactPayload = {
  name: string;
  email: string;
  message: string;
  turnstileToken?: string;
};

export async function sendContactMessage(payload: ContactPayload): Promise<void> {
  const res = await fetch(`${import.meta.env.VITE_API_BASE}/contact`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(body?.error ?? 'Failed to send your message. Please try again later.');
  }
}
