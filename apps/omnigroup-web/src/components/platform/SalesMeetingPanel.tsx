'use client';

import { motion } from 'framer-motion';
import { ConversationalAvatarPanel } from '@/components/platform/ConversationalAvatarPanel';

type Props = {
  disabled?: boolean;
};

export function SalesMeetingPanel({ disabled }: Props) {
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="mt-6">
      <ConversationalAvatarPanel agentType="sales" disabled={disabled} />
      <p className="mt-4 text-xs text-slate-500">
        Book a video consultation with our sales team to discuss scope and pricing.
      </p>
    </motion.div>
  );
}
