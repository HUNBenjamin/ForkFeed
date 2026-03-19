"use client";

type Section = {
  id: string;
  label: string;
};

type Props = {
  sections: Section[];
};

export default function SectionNav({ sections }: Props) {
  function scrollTo(id: string) {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <nav className="flex flex-wrap gap-2">
      {sections.map((s) => (
        <button
          key={s.id}
          type="button"
          onClick={() => scrollTo(s.id)}
          className="btn btn-sm btn-outline btn-primary"
        >
          {s.label}
        </button>
      ))}
    </nav>
  );
}
