import { useQuery } from "@tanstack/react-query";
import { FileText, Loader2 } from "lucide-react";

import { getFileSignedUrl } from "@/lib/admin.functions";

const IMAGE_EXTS = new Set(["jpg", "jpeg", "png", "webp", "gif", "avif"]);

function fileName(path: string) {
  const raw = path.split("/").pop() ?? "archivo";
  return raw.replace(/^(admin-)?\d+-/, "");
}

export function TicketAttachment({ path }: { path: string }) {
  const ext = path.split(".").pop()?.toLowerCase() ?? "";
  const isImage = IMAGE_EXTS.has(ext);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["adjunto-url", path],
    queryFn: () => getFileSignedUrl({ data: { bucket: "adjuntos", path } }),
    staleTime: 90_000,
    refetchOnWindowFocus: false,
    retry: 1,
  });

  if (isLoading) {
    return (
      <div className="mt-2 flex items-center gap-2 rounded-lg border border-border/60 px-3 py-2 text-xs text-muted-foreground">
        <Loader2 className="h-3.5 w-3.5 animate-spin" /> Cargando adjunto…
      </div>
    );
  }
  if (isError || !data?.url) {
    return <p className="mt-2 text-xs text-muted-foreground">No se pudo cargar el adjunto.</p>;
  }

  if (isImage) {
    return (
      <a href={data.url} target="_blank" rel="noopener noreferrer" className="mt-2 block">
        <img
          src={data.url}
          alt={fileName(path)}
          loading="lazy"
          className="max-h-44 rounded-lg border border-border/60 object-cover"
        />
        <span className="mt-1 block truncate text-xs text-muted-foreground underline-offset-2 hover:underline">
          {fileName(path)}
        </span>
      </a>
    );
  }

  return (
    <a
      href={data.url}
      target="_blank"
      rel="noopener noreferrer"
      className="mt-2 flex items-center gap-2 rounded-lg border border-border/60 bg-background/40 px-3 py-2 text-xs font-medium transition-colors hover:border-primary/40"
    >
      <FileText className="h-4 w-4 shrink-0 text-primary" />
      <span className="truncate">{fileName(path)}</span>
    </a>
  );
}
