"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { MoreHorizontal, Trash2, Copy, ExternalLink, Layers } from "lucide-react";
import { toast } from "sonner";

interface DeckCardProps {
  deck: {
    id: string;
    title: string;
    description?: string;
    thumbnail_url?: string;
    updated_at: string;
    slides?: { id: string }[];
  };
  onDelete: (id: string) => void;
}

export function DeckCard({ deck, onDelete }: DeckCardProps) {
  const router = useRouter();
  const [showDelete, setShowDelete] = useState(false);
  const slideCount = deck.slides?.length ?? 0;
  const updatedDate = new Date(deck.updated_at).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  function handleOpen() {
    router.push(`/deck/${deck.id}`);
  }

  async function handleDuplicate() {
    try {
      const res = await fetch("/api/decks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: `${deck.title} (Copy)` }),
      });
      if (!res.ok) throw new Error("Failed to duplicate");
      toast.success("Deck duplicated");
      router.refresh();
    } catch {
      toast.error("Failed to duplicate deck");
    }
  }

  return (
    <>
      <div
        className="group cursor-pointer rounded-2xl border border-border/60 bg-card transition-all duration-200 hover:shadow-lg hover:shadow-black/[0.04] hover:-translate-y-0.5 overflow-hidden"
        onClick={handleOpen}
      >
        <div className="aspect-video bg-gradient-to-br from-accent to-accent/30 relative flex items-center justify-center">
          {deck.thumbnail_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={deck.thumbnail_url}
              alt={deck.title}
              className="w-full h-full object-cover"
            />
          ) : (
            <Layers className="h-8 w-8 text-muted-foreground/30" />
          )}
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/[0.03] transition-colors" />
          <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <DropdownMenu>
              <DropdownMenuTrigger
                className="inline-flex items-center justify-center h-7 w-7 rounded-lg bg-background/90 backdrop-blur-sm text-foreground shadow-sm hover:bg-background"
                onClick={(e) => e.stopPropagation()}
              >
                <MoreHorizontal className="h-3.5 w-3.5" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="min-w-[140px]">
                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleOpen(); }}>
                  <ExternalLink className="mr-2 h-3.5 w-3.5" />
                  Open
                </DropdownMenuItem>
                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleDuplicate(); }}>
                  <Copy className="mr-2 h-3.5 w-3.5" />
                  Duplicate
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-destructive focus:text-destructive"
                  onClick={(e) => { e.stopPropagation(); setShowDelete(true); }}
                >
                  <Trash2 className="mr-2 h-3.5 w-3.5" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
        <div className="px-4 py-3">
          <h3 className="font-medium text-[13px] tracking-tight truncate">{deck.title}</h3>
          <p className="text-[11px] text-muted-foreground mt-0.5 tabular-nums">
            {slideCount} slide{slideCount !== 1 ? "s" : ""} &middot; {updatedDate}
          </p>
        </div>
      </div>

      <AlertDialog open={showDelete} onOpenChange={setShowDelete}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete deck?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete &ldquo;{deck.title}&rdquo; and all its slides.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-lg">Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="rounded-lg bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => onDelete(deck.id)}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
