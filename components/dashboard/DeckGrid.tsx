"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { DeckCard } from "./DeckCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search, Presentation, LogOut } from "lucide-react";
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
    <div className="min-h-screen bg-slate-50/50">
      <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b">
        <div className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary">
              <Presentation className="h-5 w-5 text-primary-foreground" />
            </div>
            <h1 className="text-lg font-semibold">Slide Creator</h1>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search decks..."
                className="pl-9 h-9"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <Button onClick={handleCreate} disabled={creating} size="sm">
              <Plus className="h-4 w-4 mr-1.5" />
              New Deck
            </Button>
            <Button variant="ghost" size="icon" className="h-9 w-9" onClick={handleSignOut}>
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
            {Array.from({ length: 8 }).map((_, i) => (
              <div
                key={i}
                className="aspect-[4/3] rounded-xl bg-slate-100 animate-pulse"
              />
            ))}
          </div>
        ) : filtered.length === 0 && !search ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-slate-100 mb-6">
              <Presentation className="h-10 w-10 text-slate-400" />
            </div>
            <h2 className="text-xl font-semibold mb-2">No decks yet</h2>
            <p className="text-muted-foreground mb-6 max-w-md">
              Create your first presentation deck. Use AI to generate content,
              search for images, and export pixel-perfect PowerPoint files.
            </p>
            <Button onClick={handleCreate} disabled={creating} size="lg">
              <Plus className="h-5 w-5 mr-2" />
              Create Your First Deck
            </Button>
          </div>
        ) : (
          <>
            {search && filtered.length === 0 ? (
              <p className="text-center text-muted-foreground py-12">
                No decks matching &quot;{search}&quot;
              </p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
                <button
                  onClick={handleCreate}
                  disabled={creating}
                  className="aspect-[4/3] rounded-xl border-2 border-dashed border-slate-200 hover:border-primary/40 hover:bg-primary/5 transition-all flex flex-col items-center justify-center gap-2 text-muted-foreground hover:text-primary cursor-pointer disabled:opacity-50"
                >
                  <Plus className="h-8 w-8" />
                  <span className="text-sm font-medium">New Deck</span>
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
