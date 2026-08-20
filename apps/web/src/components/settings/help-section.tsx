import { Card } from "@/components/ui/card";

const FAQS = [
  {
    q: "How do I split an expense with friends?",
    a: "Open Expenses, add or edit an entry, check \"Split this expense with friends,\" and choose how to divide it.",
  },
  {
    q: "How do I change my default currency?",
    a: "Go to Settings → Account → Preferences and pick a new default currency, then save.",
  },
  {
    q: "How do I turn on two-factor authentication?",
    a: "Go to Settings → Security and enable two-factor authentication with an authenticator app.",
  },
];

export function HelpSection() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-slate-900">Help &amp; Support</h2>
        <p className="text-sm text-slate-500">Answers to common questions.</p>
      </div>

      <Card className="divide-y divide-slate-100 p-0">
        {FAQS.map((item) => (
          <div key={item.q} className="p-5">
            <p className="text-sm font-medium text-slate-900">{item.q}</p>
            <p className="mt-1 text-sm text-slate-500">{item.a}</p>
          </div>
        ))}
      </Card>
    </div>
  );
}
