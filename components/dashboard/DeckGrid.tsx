"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { DeckCard } from "./DeckCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search, Layers, LogOut } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";

interface Deck {
  id: string;
  title: string;
  description?: string;
  thumbnail_url?: string;
  updated_at: string;
  created_at: string;
  slides?: { id: string }[];
}

export function DeckGrid() {
  const [decks, setDecks] = useState<Deck[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const router = useRouter();

  const fetchDecks = useCallback(async () => {
    try {
      const res = await fetch("/api/decks");
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      setDecks(data);
    } catch {
      toast.error("Failed to load decks");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDecks();
  }, [fetchDecks]);

  async function handleCreate() {
    setCreating(true);
    try {
      const res = await fetch("/api/decks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: "Untitled Deck" }),
      });
      if (!res.ok) throw new Error("Failed to create");
      const deck = await res.json();
      router.push(`/deck/${deck.id}`);
    } catch {
      toast.error("Failed to create deck");
      setCreating(false);
    }
  }

  async function handleDelete(id: string) {
    try {
      const res = await fetch(`/api/decks/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete");
      setDecks((prev) => prev.filter((d) => d.id !== id));
      toast.success("Deck deleted");
    } catch {
      toast.error("Failed to delete deck");
    }
  }

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  const filtered = decks.filter((d) =>
    d.title.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur-md">
        <div className="mx-auto max-w-7xl px-6 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-foreground">
              <Layers className="h-4 w-4 text-background" />
            </div>
            <span className="text-[15px] font-semibold tracking-tight">Slide Creator</span>
          </div>
          <div className="flex items-center gap-2.5">
            <div className="relative w-56">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Search decks..."
                className="h-8 pl-8 text-[13px] border-border/60 bg-accent/40 shadow-none focus-visible:bg-background"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <Button
              onClick={handleCreate}
              disabled={creating}
              size="sm"
              className="h-8 gap-1.5 rounded-lg text-[13px] font-medium"
            >
              <Plus className="h-3.5 w-3.5" />
              New Deck
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              className="size-8 rounded-lg text-muted-foreground hover:text-foreground"
              onClick={handleSignOut}
            >
              <LogOut className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-10">
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
            {Array.from({ length: 8 }).map((_, i) => (
              <div
                key={i}
                className="aspect-[16/10] rounded-2xl bg-accent/60 animate-pulse"
              />
            ))}
          </div>
        ) : filtered.length === 0 && !search ? (
          <div className="flex flex-col items-center justify-center py-28 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-accent mb-6">
              <Layers className="h-7 w-7 text-muted-foreground" />
            </div>
            <h2 className="text-lg font-semibold tracking-tight mb-1.5">No decks yet</h2>
            <p className="text-sm text-muted-foreground mb-8 max-w-sm leading-relaxed">
              Create your first presentation. Describe what you need and AI will generate a branded deck for you.
            </p>
            <Button
              onClick={handleCreate}
              disabled={creating}
              size="lg"
              className="h-10 gap-2 rounded-xl px-5 text-sm font-medium"
            >
              <Plus className="h-4 w-4" />
              Create Your First Deck
            </Button>
          </div>
        ) : (
          <>
            {search && filtered.length === 0 ? (
              <p className="text-center text-sm text-muted-foreground py-16">
                No decks matching &ldquo;{search}&rdquo;
              </p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
                <button
                  onClick={handleCreate}
                  disabled={creating}
                  className="aspect-[16/10] rounded-2xl border-2 border-dashed border-border/80 hover:border-foreground/20 hover:bg-accent/60 transition-all flex flex-col items-center justify-center gap-2.5 text-muted-foreground hover:text-foreground cursor-pointer disabled:opacity-50"
                >
                  <Plus className="h-6 w-6" />
                  <span className="text-xs font-medium">New Deck</span>
                </button>
                {filtered.map((deck) => (
                  <DeckCard key={deck.id} deck={deck} onDelete={handleDelete} />
                ))}
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
