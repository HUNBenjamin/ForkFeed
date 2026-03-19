type Step = {
  id: number;
  step_number: number;
  description: string;
};

type Props = {
  steps: Step[];
};

export default function StepList({ steps }: Props) {
  if (steps.length === 0) return null;

  return (
    <section id="steps-section" className="scroll-mt-4">
      <h2 className="text-xl font-bold mb-3">📝 Elkészítés</h2>
      <ol className="space-y-4">
        {steps.map((step) => (
          <li key={step.id} className="flex gap-4">
            <span className="badge badge-primary badge-lg font-bold shrink-0">
              {step.step_number}
            </span>
            <p className="leading-relaxed pt-0.5">{step.description}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}
