import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

interface ImageResult {
  id: string;
  url: string;
  thumbnailUrl: string;
  width: number;
  height: number;
  source: string;
  photographer?: string;
  alt?: string;
}

async function searchUnsplash(query: string, page: number): Promise<ImageResult[]> {
  const key = process.env.UNSPLASH_ACCESS_KEY;
  if (!key) return [];

  try {
    const res = await fetch(
      `https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&page=${page}&per_page=12`,
      { headers: { Authorization: `Client-ID ${key}` } }
    );
    if (!res.ok) return [];
    const data = await res.json();
    return (data.results || []).map((img: Record<string, unknown>) => ({
      id: `unsplash-${img.id}`,
      url: (img.urls as Record<string, string>)?.regular,
      thumbnailUrl: (img.urls as Record<string, string>)?.small,
      width: img.width as number,
      height: img.height as number,
      source: "unsplash",
      photographer: (img.user as Record<string, string>)?.name,
      alt: img.alt_description as string,
    }));
  } catch {
    return [];
  }
}

async function searchPexels(query: string, page: number): Promise<ImageResult[]> {
  const key = process.env.PEXELS_API_KEY;
  if (!key) return [];

  try {
    const res = await fetch(
      `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&page=${page}&per_page=12`,
      { headers: { Authorization: key } }
    );
    if (!res.ok) return [];
    const data = await res.json();
    return (data.photos || []).map((img: Record<string, unknown>) => ({
      id: `pexels-${img.id}`,
      url: (img.src as Record<string, string>)?.large,
      thumbnailUrl: (img.src as Record<string, string>)?.medium,
      width: img.width as number,
      height: img.height as number,
      source: "pexels",
      photographer: img.photographer as string,
      alt: img.alt as string,
    }));
  } catch {
    return [];
  }
}

async function searchPixabay(query: string, page: number): Promise<ImageResult[]> {
  const key = process.env.PIXABAY_API_KEY;
  if (!key) return [];

  try {
    const res = await fetch(
      `https://pixabay.com/api/?key=${key}&q=${encodeURIComponent(query)}&page=${page}&per_page=12&image_type=photo`
    );
    if (!res.ok) return [];
    const data = await res.json();
    return (data.hits || []).map((img: Record<string, unknown>) => ({
      id: `pixabay-${img.id}`,
      url: img.largeImageURL as string,
      thumbnailUrl: img.webformatURL as string,
      width: img.imageWidth as number,
      height: img.imageHeight as number,
      source: "pixabay",
      photographer: img.user as string,
      alt: img.tags as string,
    }));
  } catch {
    return [];
  }
}

async function searchCompanyLibrary(query: string): Promise<ImageResult[]> {
  try {
    const supabase = await createClient();
    let queryBuilder = supabase
      .from("company_images")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(12);

    if (query) {
      queryBuilder = queryBuilder.contains("tags", [query.toLowerCase()]);
    }

    const { data } = await queryBuilder;
    if (!data) return [];

    const {
      data: { publicUrl: baseUrl },
    } = supabase.storage.from("company-images").getPublicUrl("");

    return data.map((img) => ({
      id: `company-${img.id}`,
      url: `${baseUrl}${img.storage_path}`,
      thumbnailUrl: `${baseUrl}${img.storage_path}`,
      width: 800,
      height: 600,
      source: "company",
      alt: img.filename,
    }));
  } catch {
    return [];
  }
}

export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q") || "";
  const page = parseInt(searchParams.get("page") || "1");
  const source = searchParams.get("source") || "all";

  if (!query) {
    return NextResponse.json({ results: [], total: 0 });
  }

  let results: ImageResult[] = [];

  if (source === "all" || source === "unsplash") {
    const unsplash = await searchUnsplash(query, page);
    results = results.concat(unsplash);
  }
  if (source === "all" || source === "pexels") {
    const pexels = await searchPexels(query, page);
    results = results.concat(pexels);
  }
  if (source === "all" || source === "pixabay") {
    const pixabay = await searchPixabay(query, page);
    results = results.concat(pixabay);
  }
  if (source === "all" || source === "company") {
    const company = await searchCompanyLibrary(query);
    results = results.concat(company);
  }

  return NextResponse.json({ results, total: results.length });
}
