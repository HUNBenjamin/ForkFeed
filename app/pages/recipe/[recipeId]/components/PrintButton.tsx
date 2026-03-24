"use client";

type Props = {
  title: string;
};

export default function PrintButton({ title }: Props) {
  function handlePrint() {
    const ingredients = document.getElementById("ingredients-section");
    const steps = document.getElementById("steps-section");

    const getCleanHTML = (el: HTMLElement | null) => {
      if (!el) return "";
      const clone = el.cloneNode(true) as HTMLElement;
      clone.querySelectorAll(".badge").forEach((b) => b.remove());
      return clone.innerHTML;
    };

    const content = `
      <h1>${title}</h1>
      ${getCleanHTML(ingredients)}
      ${getCleanHTML(steps)}
    `;

    let container = document.getElementById("print-only-content");
    if (!container) {
      container = document.createElement("div");
      container.id = "print-only-content";
      document.body.appendChild(container);
    }
    container.innerHTML = content;

    let style = document.getElementById("print-only-style");
    if (!style) {
      style = document.createElement("style");
      style.id = "print-only-style";
      style.textContent = `
        #print-only-content {
          display: none;
        }
        @media print {
          body > *:not(#print-only-content) {
            display: none !important;
          }
          #print-only-content {
            display: block !important;
            font-family: system-ui, sans-serif;
            max-width: 700px;
            margin: 0 auto;
            padding: 0 1rem;
            color: #222;
          }
          #print-only-content h1 { font-size: 1.6rem; margin-bottom: 0.5rem; }
          #print-only-content h2 { font-size: 1.2rem; margin-top: 1.5rem; border-bottom: 1px solid #ccc; padding-bottom: 0.25rem; }
          #print-only-content ul, #print-only-content ol { padding-left: 1.25rem; }
          #print-only-content li { margin-bottom: 0.35rem; line-height: 1.5; }
        }
      `;
      document.head.appendChild(style);
    }

    window.print();
  }

  return (
    <button
      type="button"
      onClick={handlePrint}
      className="btn btn-circle btn-sm btn-ghost"
      title="Nyomtatás"
    >
      🖨️
    </button>
  );
}
