import { forwardRef, useEffect, useState } from 'react';
import { api } from '../api.js';
import { useAuth } from '../AuthContext.jsx';
import { fmtDate, inr } from '../format.js';

function loadRazorpay() {
  return new Promise((resolve, reject) => {
    if (window.Razorpay) return resolve();
    const s = document.createElement('script');
    s.src = 'https://checkout.razorpay.com/v1/checkout.js';
    s.onload = resolve;
    s.onerror = () => reject(new Error('Could not load Razorpay. Check your connection.'));
    document.body.appendChild(s);
  });
}

const PremiumCard = forwardRef(function PremiumCard({ onPremiumChange }, ref) {
  const { user, setUser } = useAuth();
  const [plan, setPlan] = useState(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState({ type: '', text: '' });

  useEffect(() => {
    api.plan().then(setPlan).catch(() => {});
  }, [user?.isPremium]);

  async function pay() {
    setMsg({ type: '', text: '' });
    setBusy(true);
    try {
      await loadRazorpay();
      const order = await api.createOrder();

      const rzp = new window.Razorpay({
        key: order.keyId,
        order_id: order.orderId,
        amount: order.amount,
        currency: order.currency,
        name: 'Spendwise Premium',
        description: `${plan.days} days of Premium`,
        prefill: { name: user.name, email: user.email },
        theme: { color: '#0f766e' },
        handler: async (response) => {
          try {
            const { user: updated } = await api.verifyPayment(response);
            setUser(updated);
            onPremiumChange?.();
            setMsg({ type: 'ok', text: 'Payment successful. Premium is now active!' });
          } catch (err) {
            setMsg({ type: 'error', text: err.message });
          } finally {
            setBusy(false);
          }
        },
        modal: { ondismiss: () => setBusy(false) }
      });
      rzp.on('payment.failed', (r) => {
        setMsg({ type: 'error', text: r.error?.description || 'Payment failed. Please try again.' });
        setBusy(false);
      });
      rzp.open();
    } catch (err) {
      setMsg({ type: 'error', text: err.message });
      setBusy(false);
    }
  }

  if (!plan) return null;

  return (
    <div className="card premium" ref={ref}>
      <div className="card-head">
        <h2>Premium</h2>
        {user.isPremium && <span className="pill on">Active</span>}
      </div>

      <ul className="features">
        <li>Unlimited items (free plan: {plan.freeLimit})</li>
        <li>Full leaderboard (top 10 and your rank)</li>
        <li>AI quick add and spending insights</li>
        <li>CSV export</li>
      </ul>

      {user.isPremium ? (
        <p className="muted">Active until {fmtDate(plan.premiumUntil)}.</p>
      ) : null}

      <button className="btn primary" onClick={pay} disabled={busy || !plan.paymentsEnabled}>
        {busy ? 'Opening payment…' : user.isPremium ? `Extend ${plan.days} days · ${inr(plan.price)}` : `Upgrade · ${inr(plan.price)} / ${plan.days} days`}
      </button>
      {!plan.paymentsEnabled && <p className="small muted">Payments are not configured yet (add Razorpay keys on the server).</p>}
      {msg.text && <p className={msg.type === 'ok' ? 'ok' : 'error'} role="status">{msg.text}</p>}
    </div>
  );
});

export default PremiumCard;