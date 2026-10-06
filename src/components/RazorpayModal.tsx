import { useState, type CSSProperties } from 'react';
import { useSession } from '@clerk/clerk-react';

interface Props {
  title: string;
  description: string;
  amount: number; // in rupees
  onClose: () => void;
  onSuccess: () => Promise<void> | void;
}

type Method = 'upi' | 'card' | 'netbanking';
type Step = 'method' | 'details' | 'processing' | 'success' | 'failed';

const RAZORPAY_SCRIPT_ID = 'razorpay-checkout-script';
const RAZORPAY_SCRIPT_SRC = 'https://checkout.razorpay.com/v1/checkout.js';

const PAYEE_NAME = 'Scribble Air Draw';

function loadRazorpayScript() {
  return new Promise<boolean>((resolve) => {
    if (typeof window === 'undefined') {
      resolve(false);
      return;
    }

    const existing = document.getElementById(RAZORPAY_SCRIPT_ID) as HTMLScriptElement | null;
    if (existing) {
      if ((window as any).Razorpay) {
        resolve(true);
        return;
      }
      existing.addEventListener('load', () => resolve(true), { once: true });
      existing.addEventListener('error', () => resolve(false), { once: true });
      return;
    }

    const script = document.createElement('script');
    script.id = RAZORPAY_SCRIPT_ID;
    script.src = RAZORPAY_SCRIPT_SRC;
    script.async = true;
    script.onload = () => resolve(Boolean((window as any).Razorpay));
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

export default function RazorpayModal({ title, description, amount, onClose, onSuccess }: Props) {
  const { session } = useSession();
  const [method, setMethod] = useState<Method>('upi');
  const [step, setStep] = useState<Step>('method');
  const [upiId, setUpiId] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cvv, setCvv] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  function proceedToDetails() {
    setStep('details');
  }

  async function pay() {
    setErrorMessage('');
    setStep('processing');

    try {
      const orderResponse = await fetch('/api/create-order', { method: 'POST' });
      const orderData = await orderResponse.json().catch(() => ({}));
      if (!orderResponse.ok || !orderData.orderId || !orderData.keyId) {
        throw new Error(orderData.error || `Payment server returned HTTP ${orderResponse.status}`);
      }

      const loaded = await loadRazorpayScript();
      if (!loaded || !(window as any).Razorpay) {
        throw new Error('Razorpay checkout script failed to load');
      }

      const razorpay = new (window as any).Razorpay({
        key: orderData.keyId,
        order_id: orderData.orderId,
        amount: orderData.amount,
        currency: orderData.currency,
        name: PAYEE_NAME,
        description: title,
        handler: async function (response: any) {
          try {
            const idToken = await session?.getToken();
            const verificationResponse = await fetch('/api/verify-payment', {
              method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...response, idToken }),
    });
    const verification = await verificationResponse.json();
    if (!verificationResponse.ok || !verification.verified) {
      throw new Error(verification.error || 'Payment verification failed');
    }
    setStep('success');
    await onSuccess();
    window.setTimeout(onClose, 1200);
  } catch (error) {
    console.error('Razorpay payment verification failed', error);
    setStep('failed');
  }
},
        prefill: {
          method,
          ...(method === 'upi' && upiId ? { vpa: upiId } : {}),
          ...(method === 'card'
            ? {
                name: 'Demo User',
                number: cardNumber || '4111111111111111',
                expiry: expiry || '12/29',
                cvv: cvv || '123',
              }
            : {}),
        },
        notes: {
          plan: title,
          source: 'scribble-air-draw',
        },
        theme: { color: '#3399cc' },
        modal: {
          ondismiss: () => setStep('method'),
        },
      });

      razorpay.open();
    } catch (error) {
      console.error('Razorpay checkout failed', error);
      setErrorMessage(error instanceof Error ? error.message : 'Unable to start Razorpay Checkout.');
      setStep('failed');
    }
  }

  return (
    <div className="modal-overlay" style={{ zIndex: 90 }}>
      <div
        style={{
          width: 360,
          maxWidth: '92vw',
          borderRadius: 'var(--r-lg)',
          overflow: 'hidden',
          background: 'var(--modal-bg)',
          backdropFilter: 'blur(28px) saturate(1.3)',
          WebkitBackdropFilter: 'blur(28px) saturate(1.3)',
          border: '1px solid var(--panel-border)',
          color: 'var(--text)',
          fontFamily: 'var(--font)',
          boxShadow: 'var(--shadow-float), var(--glass-hi)',
        }}
      >
        <div
          style={{
            background:
              'radial-gradient(120% 140% at 12% 0%, rgba(245,158,75,0.34), transparent 62%), linear-gradient(155deg, #241a15, #3a2a20)',
            padding: '16px 18px',
            color: '#fff8f2',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div
                style={{
                  width: 26,
                  height: 26,
                  borderRadius: 8,
                  background: 'linear-gradient(150deg, #f79a4a, #c2410c)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 700,
                  fontSize: 13,
                }}
              >
                R
              </div>
              <span style={{ fontWeight: 600, fontSize: 14 }}>Razorpay</span>
            </div>
          </div>
          <div style={{ marginTop: 10, fontSize: 12.5, color: 'rgba(255,246,236,0.82)' }}>{title}</div>
          <div style={{ fontSize: 22, fontWeight: 700, marginTop: 2, letterSpacing: '-0.03em' }}>₹{amount}</div>
        </div>

        <div style={{ padding: 18 }}>
          {step === 'method' && (
            <>
              <div style={{ fontSize: 11.5, color: 'var(--text-dim)', marginBottom: 10 }}>{description}</div>
              {(
                [
                  { id: 'upi', label: 'UPI', hint: 'Pay securely with Razorpay' },
                  { id: 'card', label: 'Card', hint: 'Credit / Debit card' },
                  { id: 'netbanking', label: 'Netbanking', hint: 'All major banks' },
                ] as { id: Method; label: string; hint: string }[]
              ).map((m) => (
                <div
                  key={m.id}
                  onClick={() => setMethod(m.id)}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '11px 12px',
                    borderRadius: 12,
                    border: method === m.id ? '1.5px solid var(--emerald-deep)' : '1px solid var(--card-border)',
                    background: method === m.id ? 'rgba(245,158,75,0.12)' : 'var(--card-bg)',
                    marginBottom: 8,
                    cursor: 'pointer',
                    transition: 'background 180ms, border-color 180ms',
                  }}
                >
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: method === m.id ? 'var(--emerald-deep)' : 'var(--text)' }}>
                      {m.label}
                    </div>
                    <div style={{ fontSize: 10.5, color: 'var(--text-faint)' }}>{m.hint}</div>
                  </div>
                  <div
                    style={{
                      width: 16,
                      height: 16,
                      borderRadius: '50%',
                      border: method === m.id ? '5px solid var(--emerald-deep)' : '1.5px solid var(--card-border)',
                    }}
                  />
                </div>
              ))}
              <button
                onClick={method === 'upi' ? pay : proceedToDetails}
                style={{
                  width: '100%',
                  marginTop: 6,
                  padding: 12,
                  borderRadius: 'var(--r-btn)',
                  border: 'none',
                  background: 'var(--emerald-deep)',
                  color: '#fff8f2',
                  fontWeight: 700,
                  fontSize: 13,
                  cursor: 'pointer',
                  boxShadow: 'var(--shadow-cta)',
                }}
              >
                {method === 'upi' ? `Pay ₹${amount} via UPI` : 'Continue'}
              </button>
              <div
                onClick={onClose}
                style={{ textAlign: 'center', fontSize: 11.5, color: 'var(--text-faint)', marginTop: 12, cursor: 'pointer' }}
              >
                Cancel
              </div>
            </>
          )}

          {step === 'details' && (
            <>
              {method === 'card' && (
                <>
                  <input
                    placeholder="Card number"
                    value={cardNumber}
                    onChange={(e) => setCardNumber(e.target.value)}
                    style={{ ...detailsInputStyle, marginBottom: 8 }}
                  />
                  <div style={{ display: 'flex', gap: 8 }}>
                    <input
                      placeholder="MM/YY"
                      value={expiry}
                      onChange={(e) => setExpiry(e.target.value)}
                      style={{ ...detailsInputStyle, flex: 1 }}
                    />
                    <input
                      placeholder="CVV"
                      value={cvv}
                      onChange={(e) => setCvv(e.target.value)}
                      style={{ ...detailsInputStyle, flex: 1 }}
                    />
                  </div>
                </>
              )}
              {method === 'netbanking' && (
                <select style={detailsInputStyle} defaultValue="">
                  <option value="" disabled>
                    Select your bank
                  </option>
                  <option>State Bank of India</option>
                  <option>HDFC Bank</option>
                  <option>ICICI Bank</option>
                  <option>Axis Bank</option>
                </select>
              )}

              <button
                onClick={pay}
                style={{
                  width: '100%',
                  marginTop: 14,
                  padding: 12,
                  borderRadius: 'var(--r-btn)',
                  border: 'none',
                  background: 'var(--emerald-deep)',
                  color: '#fff8f2',
                  fontWeight: 700,
                  fontSize: 13,
                  cursor: 'pointer',
                  boxShadow: 'var(--shadow-cta)',
                }}
              >
                Pay ₹{amount}
              </button>
              <div
                onClick={() => setStep('method')}
                style={{ textAlign: 'center', fontSize: 11.5, color: 'var(--text-faint)', marginTop: 12, cursor: 'pointer' }}
              >
                Back
              </div>
            </>
          )}

          {step === 'processing' && (
            <div style={{ textAlign: 'center', padding: '24px 0' }}>
              <div
                style={{
                  width: 34,
                  height: 34,
                  margin: '0 auto 14px',
                  borderRadius: '50%',
                  border: '3px solid var(--card-border)',
                  borderTopColor: 'var(--emerald)',
                  animation: 'spin 0.8s linear infinite',
                }}
              />
              <div style={{ fontSize: 12.5, color: 'var(--text-dim)' }}>Opening Razorpay Checkout…</div>
            </div>
          )}

          {step === 'success' && (
            <div style={{ textAlign: 'center', padding: '20px 0' }}>
              <div
                style={{
                  width: 42,
                  height: 42,
                  margin: '0 auto 12px',
                  borderRadius: '50%',
                  background: 'var(--leaf)',
                  color: '#fff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 22,
                }}
              >
                ✓
              </div>
              <div style={{ fontSize: 13.5, fontWeight: 600 }}>Payment successful</div>
              <div style={{ fontSize: 11, color: 'var(--text-faint)', marginTop: 2 }}>Unlocking cartoons…</div>
            </div>
          )}

          {step === 'failed' && (
            <div style={{ textAlign: 'center', padding: '20px 0' }}>
              <div
                style={{
                  width: 42,
                  height: 42,
                  margin: '0 auto 12px',
                  borderRadius: '50%',
                  background: 'var(--clay)',
                  color: '#fff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 20,
                }}
              >
                !
              </div>
              <div style={{ fontSize: 13.5, fontWeight: 600 }}>Payment couldn't start</div>
              <div style={{ fontSize: 11, color: 'var(--text-faint)', marginTop: 2, wordBreak: 'break-word' }}>
                {errorMessage || 'Please try again.'}
              </div>
              <button
                onClick={() => setStep('method')}
                style={{
                  width: '100%',
                  marginTop: 14,
                  padding: 12,
                  borderRadius: 'var(--r-btn)',
                  border: 'none',
                  background: 'var(--emerald-deep)',
                  color: '#fff8f2',
                  fontWeight: 700,
                  fontSize: 13,
                  cursor: 'pointer',
                  boxShadow: 'var(--shadow-cta)',
                }}
              >
                Try again
              </button>
            </div>
          )}
        </div>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

const detailsInputStyle: CSSProperties = {
  width: '100%',
  padding: '11px 12px',
  borderRadius: 'var(--r-btn)',
  border: '1px solid var(--card-border)',
  background: 'var(--input-bg)',
  color: 'var(--text)',
  fontSize: 13,
  outline: 'none',
  fontFamily: 'var(--font)',
};