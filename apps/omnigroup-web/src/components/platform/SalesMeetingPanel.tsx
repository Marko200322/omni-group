'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { MessageSquare } from 'lucide-react';
import { ConversationalAvatarPanel } from '@/components/platform/ConversationalAvatarPanel';

type Props = {
  disabled?: boolean;
};

export function SalesMeetingPanel({ disabled }: Props) {
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="mt-6 space-y-8">
      <ConversationalAvatarPanel agentType="sales" disabled={disabled} />

      <div className="border-t border-white/5 pt-6">
        <h3 className="font-display text-base font-semibold text-white">Request a sales consultation</h3>
        <p className="mt-1 text-sm text-slate-500">
          Self-serve video booking for sales is not live yet. Send your project brief and we&apos;ll reply within one
          business day with scope, timeline, and pricing.
        </p>
        <Link
          href="/contact"
          className="btn-primary mt-4 inline-flex items-center gap-2 text-sm disabled:pointer-events-none disabled:opacity-50"
          aria-disabled={disabled}
          tabIndex={disabled ? -1 : undefined}
        >
          <MessageSquare className="h-4 w-4" />
          Contact sales
        </Link>
      </div>
    </motion.div>
  );
}
