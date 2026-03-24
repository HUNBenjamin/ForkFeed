import type { Step } from "../types";

type Props = {
  steps: Step[];
  onChange: (steps: Step[]) => void;
};

export default function StepsEditor({ steps, onChange }: Props) {
  const update = (index: number, description: string) => {
    const copy = [...steps];
    copy[index] = { ...copy[index], description };
    onChange(copy);
  };

  const add = () => {
    onChange([...steps, { step_number: steps.length + 1, description: "" }]);
  };

  const remove = (index: number) => {
    const filtered = steps.filter((_, i) => i !== index);
    onChange(filtered.map((s, i) => ({ ...s, step_number: i + 1 })));
  };

  const moveUp = (index: number) => {
    if (index === 0) return;
    const copy = [...steps];
    [copy[index - 1], copy[index]] = [copy[index], copy[index - 1]];
    onChange(copy.map((s, i) => ({ ...s, step_number: i + 1 })));
  };

  const moveDown = (index: number) => {
    if (index === steps.length - 1) return;
    const copy = [...steps];
    [copy[index], copy[index + 1]] = [copy[index + 1], copy[index]];
    onChange(copy.map((s, i) => ({ ...s, step_number: i + 1 })));
  };

  return (
    <div className="flex flex-col gap-3">
      <label className="label">
        <span className="label-text font-semibold">📝 Elkészítés lépései</span>
      </label>

      {steps.map((step, i) => (
        <div key={i} className="flex gap-2 items-start">
          <span className="badge badge-primary badge-sm mt-2 shrink-0">{step.step_number}</span>
          <textarea
            className="textarea textarea-bordered textarea-sm flex-1"
            rows={2}
            placeholder={`${i + 1}. lépés`}
            value={step.description}
            onChange={(e) => update(i, e.target.value)}
          />
          <div className="flex flex-col gap-1">
            <button className="btn btn-ghost btn-xs" disabled={i === 0} onClick={() => moveUp(i)}>
              ▲
            </button>
            <button
              className="btn btn-ghost btn-xs"
              disabled={i === steps.length - 1}
              onClick={() => moveDown(i)}
            >
              ▼
            </button>
            <button className="btn btn-ghost btn-xs text-error" onClick={() => remove(i)}>
              ✕
            </button>
          </div>
        </div>
      ))}

      <button className="btn btn-ghost btn-sm self-start" onClick={add}>
        + Lépés hozzáadása
      </button>
    </div>
  );
}
