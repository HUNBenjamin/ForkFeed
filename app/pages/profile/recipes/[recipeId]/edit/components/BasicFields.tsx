import { difficultyLabels } from "../types";

type Props = {
  title: string;
  description: string;
  preparation_time: number;
  difficulty: string;
  onChangeTitle: (v: string) => void;
  onChangeDescription: (v: string) => void;
  onChangePrepTime: (v: number) => void;
  onChangeDifficulty: (v: string) => void;
};

export default function BasicFields({
  title,
  description,
  preparation_time,
  difficulty,
  onChangeTitle,
  onChangeDescription,
  onChangePrepTime,
  onChangeDifficulty,
}: Props) {
  return (
    <div className="flex flex-col gap-4">
      <div className="form-control">
        <label className="label">
          <span className="label-text font-semibold">Cím *</span>
        </label>
        <input
          type="text"
          className="input input-bordered w-full"
          value={title}
          onChange={(e) => onChangeTitle(e.target.value)}
          maxLength={200}
        />
      </div>

      <div className="form-control">
        <label className="label">
          <span className="label-text font-semibold">Leírás</span>
        </label>
        <textarea
          className="textarea textarea-bordered w-full"
          rows={3}
          value={description}
          onChange={(e) => onChangeDescription(e.target.value)}
          maxLength={2000}
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="form-control">
          <label className="label">
            <span className="label-text font-semibold">Elkészítési idő (perc) *</span>
          </label>
          <input
            type="number"
            className="input input-bordered w-full"
            min={1}
            value={preparation_time}
            onChange={(e) => onChangePrepTime(Number(e.target.value))}
          />
        </div>

        <div className="form-control">
          <label className="label">
            <span className="label-text font-semibold">Nehézség *</span>
          </label>
          <select
            className="select select-bordered w-full"
            value={difficulty}
            onChange={(e) => onChangeDifficulty(e.target.value)}
          >
            {Object.entries(difficultyLabels).map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}
