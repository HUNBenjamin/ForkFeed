"use client";

type Props = {
  title: string;
};

export default function PrintButton({ title }: Props) {
  function handlePrint() {
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    const ingredients = document.getElementById("ingredients-section");
    const steps = document.getElementById("steps-section");

    const getCleanHTML = (el: HTMLElement | null) => {
      if (!el) return "";
      const clone = el.cloneNode(true) as HTMLElement;
      clone.querySelectorAll(".badge").forEach((b) => b.remove());
      return clone.innerHTML;
    };

    printWindow.document.write(`
      <!DOCTYPE html>
      <html lang="hu">
        <head>
          <meta charset="UTF-8" />
          <title>${title} — ForkFeed</title>
          <style>
            body { font-family: system-ui, sans-serif; max-width: 700px; margin: 2rem auto; padding: 0 1rem; color: #222; }
            h1 { font-size: 1.6rem; margin-bottom: 0.5rem; }
            h2 { font-size: 1.2rem; margin-top: 1.5rem; border-bottom: 1px solid #ccc; padding-bottom: 0.25rem; }
            ul, ol { padding-left: 1.25rem; }
            li { margin-bottom: 0.35rem; line-height: 1.5; }
            .meta { color: #666; font-size: 0.85rem; margin-bottom: 1rem; }
            @media print { body { margin: 0; } }
          </style>
        </head>
        <body>
          <h1>${title}</h1>
          ${getCleanHTML(ingredients)}
          ${getCleanHTML(steps)}
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
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
