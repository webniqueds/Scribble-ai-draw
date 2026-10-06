import { motion } from 'framer-motion';
import { SignIn } from '@clerk/clerk-react';
import { Hand, Scan, Cloud } from 'lucide-react';

const clerkAppearance = {
  variables: {
    colorPrimary: '#c2410c',
    colorBackground: 'transparent',
    colorInputBackground: 'rgba(255,255,255,0.72)',
    colorInputText: '#1c1512',
    colorText: '#1c1512',
    colorTextSecondary: 'rgba(28,21,18,0.62)',
    colorInputBorder: 'rgba(28,21,18,0.12)',
    colorNeutral: '#1c1512',
    borderRadius: '14px',
    fontSize: '14px',
  },
  elements: {
    rootBox: { width: '100%', background: 'transparent', boxShadow: 'none' },
    cardBox: { background: 'transparent', boxShadow: 'none', borderRadius: '0' },
    card: { background: 'transparent', boxShadow: 'none', width: '100%', padding: '0' },
    footer: { background: 'transparent' },
    headerTitle: { fontSize: '1.4rem', fontWeight: '700', letterSpacing: '-0.025em', color: '#1c1512' },
    headerSubtitle: { fontSize: '13px', color: 'rgba(28,21,18,0.62)' },
    formButtonPrimary: {
      background: '#c2410c',
      color: '#fff8f2',
      fontWeight: '700',
      boxShadow: '0 14px 28px -14px rgba(226,98,13,0.62)',
    },
    formFieldInput: { borderRadius: '14px', padding: '12px 14px' },
    formFieldLabel: { fontSize: '12.5px', fontWeight: '600', color: 'rgba(28,21,18,0.74)' },
    formFieldInputPlaceholder: { color: 'rgba(28,21,18,0.42)' },
    formFieldErrorText: { color: '#b23a20', fontSize: '12px' },
    socialButtonsBlockButton: {
      background: 'rgba(255,255,255,0.72)',
      fontWeight: '600',
      border: '1px solid rgba(28,21,18,0.12)',
      color: '#1c1512',
    },
    socialButtonsBlockButtonText: { color: '#1c1512' },
    socialButtonsIconButton: { color: '#1c1512' },
    dividerLine: { background: 'rgba(28,21,18,0.1)' },
    dividerText: { color: 'rgba(28,21,18,0.44)', fontSize: '11.5px' },
    footerActionLink: { color: '#c2410c', fontWeight: '600' },
    footerActionText: { color: 'rgba(28,21,18,0.62)' },
    identityBarText: { color: 'rgba(28,21,18,0.5)' },
    alertBox: { background: 'rgba(178,58,32,0.08)', color: '#8c2f18' },
  },
};

const FACTS = [
  { Icon: Scan, text: 'Your webcam feed becomes the canvas.' },
  { Icon: Hand, text: 'One finger draws. Two fingers move the picture.' },
  { Icon: Cloud, text: 'Every drawing is already saved to your account.' },
];

export default function LoginScreen() {
  return (
    <div className="auth-shell">
      <div className="auth-bg" aria-hidden="true" />

      <div className="auth-scroll">
        <div className="auth-grid">
          <motion.div
            className="auth-pitch"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="lp-brand">
              <span className="lp-mark">
                <Hand size={17} strokeWidth={2.2} />
              </span>
              Scribble Air Draw
            </div>

            <h1 className="auth-title">Your drawings are waiting for you.</h1>

            <p className="lp-lead">
              Sign in to open the studio. Everything you have drawn is saved to your account, so it
              is exactly where you left it.
            </p>

            <div className="auth-facts">
              {FACTS.map((f) => (
                <div key={f.text} className="auth-fact">
                  <span className="auth-fact-icon">
                    <f.Icon size={15} strokeWidth={2} />
                  </span>
                  <span>{f.text}</span>
                </div>
              ))}
            </div>
          </motion.div>

          <motion.div
            className="auth-card"
            initial={{ opacity: 0, y: 20, scale: 0.99 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ delay: 0.12, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          >
            <SignIn routing="virtual" appearance={clerkAppearance} />
          </motion.div>
        </div>
      </div>
    </div>
  );
}
