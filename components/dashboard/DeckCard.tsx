"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
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
import { MoreHorizontal, Trash2, Copy, ExternalLink, Presentation } from "lucide-react";
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
      <Card
        className="group cursor-pointer transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5 overflow-hidden"
        onClick={handleOpen}
      >
        <div className="aspect-video bg-gradient-to-br from-slate-100 to-slate-50 relative flex items-center justify-center border-b">
          {deck.thumbnail_url ? (
            <img
              src={deck.thumbnail_url}
              alt={deck.title}
              className="w-full h-full object-cover"
            />
          ) : (
            <Presentation className="h-12 w-12 text-slate-300" />
          )}
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors" />
          <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <DropdownMenu>
              <DropdownMenuTrigger
                className="inline-flex items-center justify-center h-8 w-8 rounded-md bg-secondary text-secondary-foreground shadow-sm hover:bg-secondary/80"
                onClick={(e) => e.stopPropagation()}
              >
                <MoreHorizontal className="h-4 w-4" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleOpen(); }}>
                  <ExternalLink className="mr-2 h-4 w-4" />
                  Open
                </DropdownMenuItem>
                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleDuplicate(); }}>
                  <Copy className="mr-2 h-4 w-4" />
                  Duplicate
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-destructive focus:text-destructive"
                  onClick={(e) => { e.stopPropagation(); setShowDelete(true); }}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
        <CardContent className="p-4">
          <h3 className="font-semibold text-sm truncate">{deck.title}</h3>
          <p className="text-xs text-muted-foreground mt-1">
            {slideCount} slide{slideCount !== 1 ? "s" : ""} &middot; {updatedDate}
          </p>
        </CardContent>
      </Card>

      <AlertDialog open={showDelete} onOpenChange={setShowDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete deck?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete &quot;{deck.title}&quot; and all its slides. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
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
