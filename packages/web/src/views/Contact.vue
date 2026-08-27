<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import DashboardHeader from '../components/DashboardHeader.vue';
import TurnstileWidget from '../components/TurnstileWidget.vue';
import { sendContactMessage } from '../api/contact';

const router = useRouter();

function onHeaderSearch(payload: { city: string; state: string }) {
  router.push(`/city/${payload.state}/${payload.city}`);
}

const turnstileSiteKey = (import.meta.env.VITE_TURNSTILE_SITE_KEY as string | undefined)?.trim() ?? '';

const MAX_EMAIL_LENGTH = 254; // RFC 5321 max mailbox length

// Plain string checks instead of a regex — see the matching isValidEmail in the API's
// contact.service.ts for why (CodeQL flagged the old two-`[^\s@]+`-groups regex as a
// polynomial ReDoS).
function isValidEmail(value: string): boolean {
  if (!value || value.length > MAX_EMAIL_LENGTH) return false;
  const at = value.indexOf('@');
  if (at <= 0 || at !== value.lastIndexOf('@')) return false;
  if (/\s/.test(value)) return false;

  const domain = value.slice(at + 1);
  const dot = domain.lastIndexOf('.');
  return dot > 0 && dot < domain.length - 1;
}

const name = ref('');
const email = ref('');
const message = ref('');
const captchaToken = ref<string | null>(null);
const status = ref<'idle' | 'sending' | 'sent' | 'error'>('idle');
const errorMessage = ref('');
const fieldErrors = ref<{ name?: string; email?: string; message?: string }>({});

function validateFields(): boolean {
  const errors: typeof fieldErrors.value = {};
  if (!name.value.trim()) errors.name = 'Name is required.';
  if (!email.value.trim()) errors.email = 'Email is required.';
  else if (!isValidEmail(email.value.trim())) errors.email = 'Enter a valid email address.';
  if (!message.value.trim()) errors.message = 'Message is required.';

  fieldErrors.value = errors;
  return Object.keys(errors).length === 0;
}

async function onSubmit() {
  if (!validateFields()) {
    status.value = 'error';
    errorMessage.value = 'Please fix the highlighted fields.';
    return;
  }

  if (turnstileSiteKey && !captchaToken.value) {
    status.value = 'error';
    errorMessage.value = 'Please complete the verification challenge.';
    return;
  }

  status.value = 'sending';
  errorMessage.value = '';

  try {
    await sendContactMessage({
      name: name.value.trim(),
      email: email.value.trim(),
      message: message.value.trim(),
      turnstileToken: captchaToken.value ?? undefined,
    });
    status.value = 'sent';
  } catch (err) {
    status.value = 'error';
    errorMessage.value = err instanceof Error ? err.message : 'Something went wrong. Please try again.';
  }
}
</script>

<template>
  <div class="container">
    <DashboardHeader page-label="Contact" @logo-click="router.push({ name: 'home' })" @search="onHeaderSearch" />

    <article class="sources">
      <header class="sources__masthead">
        <span class="sources__eyebrow">Get In Touch</span>
        <h1 class="sources__headline">Contact us.</h1>
        <p class="sources__dek">
          Found a bug, or a city that doesn't look right? Have a question or an idea for Atlas?
          Send a message below.
        </p>
      </header>

      <section class="sources__group sources__group--form">
        <form v-if="status !== 'sent'" class="contact-form" novalidate @submit.prevent="onSubmit">
          <p class="contact-form__required-note">All fields are required.</p>

          <label class="contact-form__field">
            <span class="contact-form__label">Name <span class="contact-form__required-mark">*</span></span>
            <input
              v-model="name"
              type="text"
              required
              maxlength="100"
              class="contact-form__input"
              :class="{ 'contact-form__input--invalid': fieldErrors.name }"
              @input="fieldErrors.name = undefined"
            />
            <span v-if="fieldErrors.name" class="contact-form__field-error">{{ fieldErrors.name }}</span>
          </label>

          <label class="contact-form__field">
            <span class="contact-form__label">Email <span class="contact-form__required-mark">*</span></span>
            <input
              v-model="email"
              type="email"
              required
              class="contact-form__input"
              :class="{ 'contact-form__input--invalid': fieldErrors.email }"
              @input="fieldErrors.email = undefined"
            />
            <span v-if="fieldErrors.email" class="contact-form__field-error">{{ fieldErrors.email }}</span>
          </label>

          <label class="contact-form__field">
            <span class="contact-form__label">Message <span class="contact-form__required-mark">*</span></span>
            <textarea
              v-model="message"
              required
              maxlength="5000"
              rows="6"
              class="contact-form__textarea"
              :class="{ 'contact-form__input--invalid': fieldErrors.message }"
              @input="fieldErrors.message = undefined"
            ></textarea>
            <span v-if="fieldErrors.message" class="contact-form__field-error">{{ fieldErrors.message }}</span>
          </label>

          <TurnstileWidget
            v-if="turnstileSiteKey"
            :site-key="turnstileSiteKey"
            appearance="interaction-only"
            @verified="captchaToken = $event"
            @expired="captchaToken = null"
          />

          <p v-if="status === 'error'" class="contact-form__error">{{ errorMessage }}</p>

          <button type="submit" class="contact-form__submit" :disabled="status === 'sending'">
            {{ status === 'sending' ? 'Sending…' : 'Send message' }}
          </button>
        </form>

        <div v-else class="contact-form__success">
          <span class="mdi mdi-check-circle-outline contact-form__success-icon"></span>
          <h2 class="contact-form__success-title">Message sent</h2>
          <p class="contact-form__success-text">
            Thanks for reaching out. We'll get back to you soon.
          </p>
          <div class="contact-form__success-links">
            <router-link :to="{ name: 'search' }" class="contact-form__success-link contact-form__success-link--primary">
              Back to city search
            </router-link>
            <router-link :to="{ name: 'compare-empty' }" class="contact-form__success-link">Compare cities</router-link>
            <router-link :to="{ name: 'about' }" class="contact-form__success-link">About Atlas</router-link>
          </div>
        </div>
      </section>
    </article>
  </div>
</template>

<style scoped>
.sources {
  max-width: 640px;
  margin: 0 auto;
  padding: 12px 0 72px;
}

.sources__masthead {
  padding: 24px 0 40px;
  border-bottom: 1px solid var(--border-subtle);
}

.sources__eyebrow {
  display: block;
  font-family: var(--font-mono);
  font-size: 0.72rem;
  font-weight: 600;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--accent);
  margin-bottom: 18px;
}

.sources__headline {
  font-family: var(--font-display-serif);
  font-size: clamp(1.9rem, 4vw, 2.6rem);
  font-weight: 700;
  line-height: 1.15;
  letter-spacing: -0.01em;
  color: var(--text-primary);
  margin: 0 0 16px;
}

.sources__dek {
  font-size: 1.02rem;
  line-height: 1.55;
  color: var(--text-secondary);
  max-width: 58ch;
  margin: 0;
}

.sources__group--form {
  padding: 36px 0;
}

.contact-form {
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.contact-form__required-note {
  font-size: 0.82rem;
  color: var(--text-muted);
  margin: -6px 0 0;
}

.contact-form__field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.contact-form__label {
  font-family: var(--font-mono);
  font-size: 0.72rem;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--text-muted);
}

.contact-form__required-mark {
  color: var(--accent);
}

.contact-form__field-error {
  font-size: 0.78rem;
  color: var(--danger);
}

.contact-form__input,
.contact-form__textarea {
  font-family: var(--font-sans);
  font-size: 0.95rem;
  color: var(--text-primary);
  background: var(--bg-input);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  padding: 10px 12px;
  resize: vertical;
}

.contact-form__input:focus,
.contact-form__textarea:focus {
  outline: none;
  border-color: var(--accent);
}

.contact-form__input--invalid {
  border-color: var(--danger);
}

.contact-form__error {
  font-size: 0.85rem;
  color: var(--danger);
  margin: 0;
}

.contact-form__submit {
  align-self: flex-start;
  font-family: var(--font-sans);
  font-size: 0.92rem;
  font-weight: 600;
  color: #fff;
  background: var(--accent);
  border: none;
  border-radius: 8px;
  padding: 10px 22px;
  cursor: pointer;
  transition: background 0.15s ease;
}

.contact-form__submit:hover:not(:disabled) {
  background: var(--accent-hover);
}

.contact-form__submit:disabled {
  opacity: 0.6;
  cursor: default;
}

.contact-form__success {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 6px;
  padding: 8px 0 4px;
}

.contact-form__success-icon {
  font-size: 2.1rem;
  color: var(--positive);
  margin-bottom: 6px;
}

.contact-form__success-title {
  font-family: var(--font-display-serif);
  font-size: 1.4rem;
  font-weight: 700;
  color: var(--text-primary);
  margin: 0;
}

.contact-form__success-text {
  font-size: 0.98rem;
  line-height: 1.6;
  color: var(--text-secondary);
  margin: 0 0 10px;
  max-width: 48ch;
}

.contact-form__success-links {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.contact-form__success-link {
  font-family: var(--font-sans);
  font-size: 0.88rem;
  font-weight: 600;
  color: var(--text-primary);
  text-decoration: none;
  background: var(--bg-card-inner);
  border: 1px solid var(--border-card);
  border-radius: 999px;
  padding: 9px 18px;
  transition: border-color 0.15s ease, background 0.15s ease;
}

.contact-form__success-link:hover {
  border-color: var(--accent);
}

.contact-form__success-link--primary {
  color: #fff;
  background: var(--accent);
  border-color: var(--accent);
}

.contact-form__success-link--primary:hover {
  background: var(--accent-hover);
}
</style>
