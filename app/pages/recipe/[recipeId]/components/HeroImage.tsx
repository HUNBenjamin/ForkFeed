type Props = {
  imageUrl: string | null;
  title: string;
};

export default function HeroImage({ imageUrl, title }: Props) {
  if (imageUrl) {
    return (
      <figure className="rounded-2xl overflow-hidden shadow-lg">
        <img src={imageUrl} alt={title} className="w-full max-h-[500px] object-cover" />
      </figure>
    );
  }

  return (
    <div className="rounded-2xl bg-base-300 h-64 flex items-center justify-center text-6xl text-base-content/20 shadow-lg">
      🍽️
    </div>
  );
}
