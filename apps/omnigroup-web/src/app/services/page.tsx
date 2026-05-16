'use client';

import { motion } from 'framer-motion';
import { Globe, Cpu, Shield, LineChart } from 'lucide-react';

const items = [
  { icon: Globe, title: 'Web systems', desc: 'Landing, SaaS shells, API gateways.' },
  { icon: Cpu, title: 'Server solutions', desc: 'Docker, workers, queues.' },
  { icon: Shield, title: 'Security posture', desc: 'Auth, rate limits, audit trails.' },
  { icon: LineChart, title: 'Analytics', desc: 'Events, KPIs, operational visibility.' },
];

export default function ServicesPage() {
  return (
    <div className="px-4 py-16">
      <div className="mx-auto max-w-6xl">
        <h1 className="text-4xl font-bold text-gradient">Services</h1>
        <p className="mt-4 max-w-2xl text-gray-400">
          Modular delivery aligned with the Atina monorepo — APIs and automation first.
        </p>
        <div className="mt-12 grid gap-6 sm:grid-cols-2">
          {items.map(({ icon: Icon, title, desc }) => (
            <motion.div
              key={title}
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="glass p-6"
            >
              <Icon className="mb-3 h-8 w-8 text-blue-400" />
              <h2 className="text-xl font-semibold text-white">{title}</h2>
              <p className="mt-2 text-gray-400">{desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
