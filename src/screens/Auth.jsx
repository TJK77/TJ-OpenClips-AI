import { useState } from 'react';
import Icon from '../lib/icons';
import { useStore } from '../lib/store';
import { Field, Logo, TextInput, Badge } from '../components/ui';
import { Thumb } from '../components/Thumb';

function strengthOf(pw) {
  let s = 0;
  if (pw.length >= 8) s += 1;
  if (/[A-Z]/.test(pw)) s += 1;
  if (/[0-9]/.test(pw)) s += 1;
  if (/[^A-Za-z0-9]/.test(pw)) s += 1;
  return s;
}

function AuthShell({ children, title, sub, footer }) {
  return (
    <div className="relative min-h-dvh overflow-hidden bg-ink-950 text-white">
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -left-24 top-0 h-[360px] w-[360px] rounded-full bg-violet-600/25 blur-[120px]" />
        <div className="absolute -right-24 bottom-0 h-[340px] w-[340px] rounded-full bg-cyan-500/15 blur-[120px]" />
      </div>
      <div className="mx-auto grid min-h-dvh max-w-6xl lg:grid-cols-2">
        <div className="relative hidden flex-col justify-between overflow-hidden border-r border-white/8 p-10 lg:flex">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(70%_60%_at_20%_10%,rgba(124,92,255,0.22),transparent_65%)]" />
          <div className="relative">
            <button onClick={() => (window.location.hash = '/')} aria-label="Back to home">
              <Logo size={36} />
            </button>
            <h2 className="mt-14 max-w-sm font-display text-[32px] font-extrabold leading-[1.1] tracking-tight">
              From raw recording to a week of content.
            </h2>
            <p className="mt-4 max-w-sm text-[13.5px] leading-relaxed text-white/60">
              One workspace for clipping, captions, reframing and Buffer scheduling. Built for creators who publish daily.
            </p>

            <div className="mt-10 max-w-sm rounded-2xl border border-white/10 bg-white/[0.04] p-4 backdrop-blur">
              <div className="flex items-center gap-3">
                <div className="w-12 shrink-0">
                  <Thumb hue={262} hue2={190} ratio="9 / 16" seed="auth" showGrid={false} rounded="rounded-lg">
                    <span className="absolute right-0.5 top-0.5 rounded bg-emerald-400 px-1 text-[7px] font-extrabold text-ink-950">96</span>
                  </Thumb>
                </div>
                <div className="min-w-0">
                  <div className="truncate text-[12.5px] font-bold">The 3-second hook</div>
                  <div className="mt-0.5 text-[11px] text-white/50">00:12:04 → 00:12:38 · Bold Viral</div>
                  <div className="mt-2 flex items-center gap-1.5">
                    <Badge tone="violet" icon="sparkles">AI ranked #1</Badge>
                    <Badge tone="slate" icon="share">TikTok + IG</Badge>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="relative grid grid-cols-3 gap-3 text-center">
            {[
              ['8', 'clips / video'],
              ['10', 'caption styles'],
              ['4', 'aspect ratios'],
            ].map(([v, l]) => (
              <div key={l} className="rounded-xl border border-white/8 bg-white/[0.03] py-3">
                <div className="font-display text-lg font-extrabold text-gradient">{v}</div>
                <div className="mt-0.5 text-[10px] uppercase tracking-wider text-white/40">{l}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex flex-col justify-center px-4 py-8 sm:px-8">
          <div className="mb-8 flex items-center justify-between lg:hidden">
            <button onClick={() => (window.location.hash = '/')} aria-label="Back to home">
              <Logo size={32} />
            </button>
            <button className="btn btn-ghost btn-sm" onClick={() => (window.location.hash = '/')}>
              <Icon name="arrow-left" size={14} /> Home
            </button>
          </div>
          <div className="mx-auto w-full max-w-[420px]">
            <h1 className="font-display text-[26px] font-extrabold tracking-tight sm:text-[30px]">{title}</h1>
            <p className="mt-1.5 text-[13px] text-white/55">{sub}</p>
            <div className="mt-6">{children}</div>
            {footer && <div className="mt-5 text-center text-[12.5px] text-white/55">{footer}</div>}
          </div>
        </div>
      </div>
    </div>
  );
}

function GoogleButton({ onClick }) {
  return (
    <button type="button" onClick={onClick} className="btn btn-secondary w-full">
      <Icon name="google" size={17} />
      Continue with Google
    </button>
  );
}

export function Register() {
  const { signIn, navigate, toast } = useStore();
  const [form, setForm] = useState({ name: '', email: '', password: '', confirm: '' });
  const [show, setShow] = useState(false);
  const [terms, setTerms] = useState(true);
  const [errors, setErrors] = useState({});
  const strength = strengthOf(form.password);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = (e) => {
    e.preventDefault();
    const next = {};
    if (form.name.trim().length < 2) next.name = 'Enter your full name.';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) next.email = 'Enter a valid email address.';
    if (form.password.length < 8) next.password = 'Use at least 8 characters.';
    if (form.confirm !== form.password) next.confirm = 'Passwords do not match.';
    if (!terms) next.terms = 'Accept the terms to continue.';
    setErrors(next);
    if (Object.keys(next).length) return;
    signIn({ name: form.name.trim(), email: form.email, initials: form.name.trim().slice(0, 2).toUpperCase() });
    toast('Account created — welcome to TJ OpenClips AI Studio.', 'success');
    navigate('/dashboard');
  };

  return (
    <AuthShell
      title="Create your studio"
      sub="Start clipping in minutes. Free workspace, your own AI keys."
      footer={
        <>
          Already have an account?{' '}
          <button className="font-semibold text-violet-300 hover:text-violet-200" onClick={() => navigate('/signin')}>
            Sign in
          </button>
        </>
      }
    >
      <form onSubmit={submit} className="space-y-3.5" noValidate>
        <Field label="Full name" htmlFor="name">
          <TextInput id="name" icon="user" placeholder="TJ Mercer" value={form.name} onChange={set('name')} autoComplete="name" />
          {errors.name && <p className="mt-1 text-[11.5px] font-medium text-rose-300">{errors.name}</p>}
        </Field>
        <Field label="Email address" htmlFor="email">
          <TextInput id="email" icon="mail" type="email" placeholder="you@studio.com" value={form.email} onChange={set('email')} autoComplete="email" />
          {errors.email && <p className="mt-1 text-[11.5px] font-medium text-rose-300">{errors.email}</p>}
        </Field>
        <Field label="Password" htmlFor="pw">
          <div className="relative">
            <TextInput id="pw" icon="lock" type={show ? 'text' : 'password'} placeholder="At least 8 characters" value={form.password} onChange={set('password')} autoComplete="new-password" />
            <button
              type="button"
              aria-label={show ? 'Hide password' : 'Show password'}
              onClick={() => setShow((s) => !s)}
              className="absolute right-2 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-lg text-white/50 hover:bg-white/10 hover:text-white"
            >
              <Icon name={show ? 'eye-off' : 'eye'} size={16} />
            </button>
          </div>
          <div className="mt-2 flex gap-1.5">
            {[0, 1, 2, 3].map((i) => (
              <span
                key={i}
                className={`h-1 flex-1 rounded-full transition-colors ${
                  strength > i ? (strength <= 1 ? 'bg-rose-400' : strength === 2 ? 'bg-amber-400' : 'bg-emerald-400') : 'bg-white/12'
                }`}
              />
            ))}
          </div>
          <p className="mt-1 text-[11px] text-white/40">
            {['Add 8+ characters', 'Add an uppercase letter', 'Add a number', 'Add a symbol'][Math.min(strength, 3)]}
          </p>
          {errors.password && <p className="mt-1 text-[11.5px] font-medium text-rose-300">{errors.password}</p>}
        </Field>
        <Field label="Confirm password" htmlFor="pw2">
          <TextInput id="pw2" icon="lock" type={show ? 'text' : 'password'} placeholder="Repeat your password" value={form.confirm} onChange={set('confirm')} autoComplete="new-password" />
          {errors.confirm && <p className="mt-1 text-[11.5px] font-medium text-rose-300">{errors.confirm}</p>}
        </Field>

        <label className="flex cursor-pointer items-start gap-2.5 pt-1 text-[11.5px] leading-relaxed text-white/55">
          <input
            type="checkbox"
            checked={terms}
            onChange={(e) => setTerms(e.target.checked)}
            className="mt-0.5 h-4 w-4 shrink-0 rounded border-white/25 bg-white/5 accent-violet-500"
          />
          <span>
            I agree to the <span className="text-violet-300">Terms of Service</span> and{' '}
            <span className="text-violet-300">Privacy Policy</span>. My API keys stay in my workspace.
          </span>
        </label>
        {errors.terms && <p className="text-[11.5px] font-medium text-rose-300">{errors.terms}</p>}

        <button type="submit" className="btn btn-primary btn-lg w-full">
          Create Account
          <Icon name="arrow-right" size={16} />
        </button>

        <div className="flex items-center gap-3 py-1">
          <span className="h-px flex-1 bg-white/10" />
          <span className="text-[10.5px] font-semibold uppercase tracking-wider text-white/35">or</span>
          <span className="h-px flex-1 bg-white/10" />
        </div>
        <GoogleButton
          onClick={() => {
            signIn({ name: 'TJ Mercer', email: 'tj@openclips.studio', initials: 'TJ' });
            toast('Signed in with Google (demo).', 'success');
            navigate('/dashboard');
          }}
        />
        <p className="text-center text-[10.5px] leading-relaxed text-white/35">
          Google sign-in is illustrative in this build. No external OAuth app is configured.
        </p>
      </form>
    </AuthShell>
  );
}

export function SignIn() {
  const { signIn, navigate, toast } = useStore();
  const [email, setEmail] = useState('tj@openclips.studio');
  const [password, setPassword] = useState('openclips');
  const [show, setShow] = useState(false);
  const [error, setError] = useState('');

  const submit = (e) => {
    e.preventDefault();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || password.length < 4) {
      setError('Enter a valid email and password.');
      return;
    }
    signIn({ email, initials: (email[0] || 'T').toUpperCase() + 'J' });
    toast('Welcome back.', 'success');
    navigate('/dashboard');
  };

  return (
    <AuthShell
      title="Sign in to your studio"
      sub="Pick up where your last batch left off."
      footer={
        <>
          New here?{' '}
          <button className="font-semibold text-violet-300 hover:text-violet-200" onClick={() => navigate('/register')}>
            Create an account
          </button>
        </>
      }
    >
      <form onSubmit={submit} className="space-y-3.5" noValidate>
        <Field label="Email address" htmlFor="s-email">
          <TextInput id="s-email" icon="mail" type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
        </Field>
        <Field label="Password" htmlFor="s-pw">
          <div className="relative">
            <TextInput id="s-pw" icon="lock" type={show ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" />
            <button
              type="button"
              aria-label={show ? 'Hide password' : 'Show password'}
              onClick={() => setShow((s) => !s)}
              className="absolute right-2 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-lg text-white/50 hover:bg-white/10 hover:text-white"
            >
              <Icon name={show ? 'eye-off' : 'eye'} size={16} />
            </button>
          </div>
        </Field>
        <div className="flex items-center justify-between">
          <label className="flex cursor-pointer items-center gap-2 text-[11.5px] text-white/55">
            <input type="checkbox" defaultChecked className="h-4 w-4 rounded border-white/25 bg-white/5 accent-violet-500" />
            Keep me signed in
          </label>
          <button type="button" className="text-[11.5px] font-semibold text-violet-300 hover:text-violet-200">
            Forgot password?
          </button>
        </div>
        {error && <p className="text-[11.5px] font-medium text-rose-300">{error}</p>}
        <button type="submit" className="btn btn-primary btn-lg w-full">
          Sign In
          <Icon name="arrow-right" size={16} />
        </button>
        <div className="flex items-center gap-3 py-1">
          <span className="h-px flex-1 bg-white/10" />
          <span className="text-[10.5px] font-semibold uppercase tracking-wider text-white/35">or</span>
          <span className="h-px flex-1 bg-white/10" />
        </div>
        <GoogleButton
          onClick={() => {
            signIn({});
            toast('Signed in with Google (demo).', 'success');
            navigate('/dashboard');
          }}
        />
        <button type="button" className="btn btn-ghost w-full" onClick={() => navigate('/dashboard')}>
          Continue with demo workspace
        </button>
      </form>
    </AuthShell>
  );
}
