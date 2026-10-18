import { AnimatePresence, motion } from 'framer-motion';
import { useState } from 'react';

const ITEMS = [
  ['Do I need to pay online?', 'No. This project confirms a booking as soon as you submit your details. There is no payment gateway.'],
  ['How do I get my ticket?', 'Right after booking you land on your ticket page with a QR code. Download it as an image, or reopen the page any time with the link.'],
  ['What happens if someone books the same seats as me?', 'Seat counts update live for everyone. When you open checkout your seats are held for a few minutes. If the last seats go first, you will see a clear message and can pick another category.'],
  ['Can I book more than one ticket?', 'Yes, up to 10 tickets per booking, within the seats still available.'],
  ['Which ticket category should I choose?', 'Each event lists its own categories and prices on the event page. The price you see is the price you pay per ticket.'],
  ['How does entry work on the day?', 'Organisers scan or enter your ticket code. A ticket works once. A second scan of the same code is rejected.'],
];

export default function Faq() {
  const [open, setOpen] = useState(0);
  return (
    <div className="divide-y divide-ink/15 rounded-3xl bg-white px-6">
      {ITEMS.map(([q, a], i) => {
        const isOpen = open === i;
        return (
          <div key={q}>
            <button className="flex w-full items-center justify-between gap-4 py-5 text-left font-display text-lg font-bold" aria-expanded={isOpen} onClick={() => setOpen(isOpen ? -1 : i)}>
              {q}
              <motion.span animate={{ rotate: isOpen ? 45 : 0 }} className="text-2xl leading-none text-blue" aria-hidden="true">+</motion.span>
            </button>
            <AnimatePresence initial={false}>
              {isOpen && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                  <p className="max-w-2xl pb-5 text-ink/75">{a}</p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}
    </div>
  );
}
