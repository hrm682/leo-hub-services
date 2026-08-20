/**
 * Franja de plataformas: muestra el NOMBRE de cada servicio en su color de marca.
 * Uso nominativo (solo el nombre, sin logos oficiales) para evitar problemas de
 * marca registrada. Si consigues assets con licencia, se pueden integrar aparte.
 */
const PLATFORMS: { name: string; color: string }[] = [
  { name: "Netflix", color: "#E50914" },
  { name: "Disney+", color: "#3B82F6" },
  { name: "HBO Max", color: "#A855F7" },
  { name: "Prime Video", color: "#22D3EE" },
  { name: "Paramount+", color: "#2563EB" },
  { name: "ViX", color: "#EC4899" },
  { name: "Spotify", color: "#1DB954" },
  { name: "YouTube", color: "#FF3B30" },
  { name: "DirecTV GO", color: "#38BDF8" },
  { name: "Win+", color: "#F97316" },
];

export function PlatformStrip() {
  return (
    <div className="mt-12">
      <p className="text-center text-xs uppercase tracking-[0.2em] text-muted-foreground">
        Las plataformas que amas
      </p>
      <div className="mx-auto mt-4 flex max-w-3xl flex-wrap items-center justify-center gap-2.5">
        {PLATFORMS.map((p) => (
          <span
            key={p.name}
            className="rounded-full border px-3.5 py-1.5 text-sm font-semibold backdrop-blur transition-transform hover:scale-105"
            style={{
              color: p.color,
              borderColor: `${p.color}55`,
              backgroundColor: `${p.color}14`,
            }}
          >
            {p.name}
          </span>
        ))}
      </div>
    </div>
  );
}
