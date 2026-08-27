export type ContactRequest = {
  name: string;
  email: string;
  message: string;
  turnstileToken?: string;
};

export class ContactValidationError extends Error {}
export class ContactRateLimitError extends Error {}
