import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { BookMarked, Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { deleteSavedReply, listSavedReplies, upsertSavedReply } from "@/lib/admin.functions";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Textarea } from "@/components/ui/textarea";

export function SavedRepliesMenu({
  onInsert,
  disabled,
}: {
  onInsert: (content: string) => void;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [managerOpen, setManagerOpen] = useState(false);
  const { data, isLoading } = useQuery({
    queryKey: ["saved-replies"],
    queryFn: () => listSavedReplies(),
  });
  const replies = data?.replies ?? [];

  return (
    <>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button type="button" variant="outline" size="sm" disabled={disabled}>
            <BookMarked className="mr-1.5 h-3.5 w-3.5" />
            Respuestas
          </Button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-80 p-0">
          <Command>
            <CommandInput placeholder="Buscar respuesta…" />
            <CommandList>
              <CommandEmpty>
                {isLoading ? "Cargando…" : "No hay respuestas guardadas."}
              </CommandEmpty>
              <CommandGroup heading="Respuestas guardadas">
                {replies.map((r) => (
                  <CommandItem
                    key={r.id}
                    value={r.title}
                    onSelect={() => {
                      onInsert(r.content);
                      setOpen(false);
                    }}
                    className="flex-col items-start gap-0.5"
                  >
                    <span className="text-sm font-medium">{r.title}</span>
                    <span className="line-clamp-2 text-xs text-muted-foreground">{r.content}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
          <div className="border-t border-border p-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="w-full justify-start"
              onClick={() => {
                setOpen(false);
                setManagerOpen(true);
              }}
            >
              <Pencil className="mr-2 h-3.5 w-3.5" />
              Gestionar respuestas
            </Button>
          </div>
        </PopoverContent>
      </Popover>
      <SavedRepliesManager open={managerOpen} onOpenChange={setManagerOpen} />
    </>
  );
}

function SavedRepliesManager({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["saved-replies"],
    queryFn: () => listSavedReplies(),
  });
  const [editing, setEditing] = useState<{
    id?: string;
    title: string;
    content: string;
  } | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const upsertMutation = useMutation({
    mutationFn: (input: { id?: string; title: string; content: string }) =>
      upsertSavedReply({ data: input }),
    onSuccess: () => {
      toast.success("Respuesta guardada");
      setEditing(null);
      queryClient.invalidateQueries({ queryKey: ["saved-replies"] });
    },
    onError: (err) => toast.error("No se pudo guardar", { description: err.message }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteSavedReply({ data: { id } }),
    onSuccess: () => {
      toast.success("Respuesta eliminada");
      setConfirmDeleteId(null);
      queryClient.invalidateQueries({ queryKey: ["saved-replies"] });
    },
    onError: (err) => toast.error("No se pudo eliminar", { description: err.message }),
  });

  const replies = data?.replies ?? [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Respuestas guardadas</DialogTitle>
          <DialogDescription>
            Plantillas del equipo para responder más rápido en el chat de soporte.
          </DialogDescription>
        </DialogHeader>

        {editing ? (
          <form
            className="space-y-3"
            onSubmit={(e) => {
              e.preventDefault();
              upsertMutation.mutate(editing);
            }}
          >
            <div className="space-y-1.5">
              <Label htmlFor="sr-title">Título</Label>
              <Input
                id="sr-title"
                value={editing.title}
                onChange={(e) => setEditing({ ...editing, title: e.target.value })}
                maxLength={80}
                placeholder="Ej. Saludo inicial"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="sr-content">Contenido</Label>
              <Textarea
                id="sr-content"
                value={editing.content}
                onChange={(e) => setEditing({ ...editing, content: e.target.value })}
                maxLength={2000}
                className="min-h-32"
                placeholder="Texto que se insertará en la conversación…"
                required
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="ghost" onClick={() => setEditing(null)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={upsertMutation.isPending}>
                {upsertMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Guardar
              </Button>
            </div>
          </form>
        ) : (
          <div className="space-y-3">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setEditing({ title: "", content: "" })}
            >
              <Plus className="mr-1.5 h-3.5 w-3.5" />
              Nueva respuesta
            </Button>
            {isLoading ? (
              <p className="py-6 text-center text-sm text-muted-foreground">Cargando…</p>
            ) : replies.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                Aún no hay respuestas guardadas.
              </p>
            ) : (
              <ul className="space-y-2">
                {replies.map((r) => (
                  <li key={r.id} className="rounded-xl border border-border bg-card p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold">{r.title}</p>
                        <p className="mt-1 line-clamp-2 whitespace-pre-wrap text-xs text-muted-foreground">
                          {r.content}
                        </p>
                      </div>
                      <div className="flex shrink-0 items-center gap-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          aria-label={`Editar ${r.title}`}
                          onClick={() =>
                            setEditing({ id: r.id, title: r.title, content: r.content })
                          }
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        {confirmDeleteId === r.id ? (
                          <Button
                            type="button"
                            variant="destructive"
                            size="sm"
                            disabled={deleteMutation.isPending}
                            onClick={() => deleteMutation.mutate(r.id)}
                          >
                            {deleteMutation.isPending ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              "¿Eliminar?"
                            )}
                          </Button>
                        ) : (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            aria-label={`Eliminar ${r.title}`}
                            onClick={() => setConfirmDeleteId(r.id)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
