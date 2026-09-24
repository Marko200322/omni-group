import BillingResultShell from '../BillingResultShell';

export default function PayPalBillingLayout({ children }: { children: React.ReactNode }) {
  return <BillingResultShell>{children}</BillingResultShell>;
}
