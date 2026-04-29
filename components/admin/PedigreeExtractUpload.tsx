'use client';

import { useRef, useState } from 'react';
import { Loader2, Sparkles, FileText, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { createBrowserSupabaseClient } from '@/lib/supabase/browser';

export interface ExtractedPedigree {
  [slot: string]: {
    name: string;
    yob: number | null;
    country: string;
    sex: 'sire' | 'dam';
    is_group1_winner: boolean;
    is_stakes_winner: boolean;
    is_stakes_producer: boolean;
    is_dam_line: boolean;
  };
}

interface PedigreeExtractUploadProps {
  onExtracted: (pedigree: ExtractedPedigree) => void;
}

export function PedigreeExtractUpload({ onExtracted }: PedigreeExtractUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<{ name: string; url: string; type: string } | null>(null);
  const [uploading, setUploading] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function handleFile(f: File) {
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
    if (!allowed.includes(f.type)) {
      setError('Only JPEG, PNG, WebP or PDF');
      return;
    }
    setUploading(true);
    setError(null);
    setDone(false);

    const supabase = createBrowserSupabaseClient();
    const ext = f.name.split('.').pop() ?? 'pdf';
    const path = `pedigree/pending/${Date.now().toString(36)}.${ext}`;

    const { error: upErr } = await supabase.storage
      .from('horse-photos')
      .upload(path, f, { upsert: true });

    if (upErr) { setError(upErr.message); setUploading(false); return; }

    const { data: { publicUrl } } = supabase.storage.from('horse-photos').getPublicUrl(path);
    setFile({ name: f.name, url: publicUrl, type: f.type });
    setUploading(false);
  }

  async function extract() {
    if (!file) return;
    setExtracting(true);
    setError(null);

    const res = await fetch('/api/admin/extract-pedigree', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ file_url: file.url, file_type: file.type }),
    });

    const body = await res.json().catch(() => ({}));
    setExtracting(false);

    if (!res.ok) {
      setError(body.error ?? 'Extraction failed');
      return;
    }

    onExtracted(body.pedigree);
    setDone(true);
  }

  function clear() {
    setFile(null);
    setDone(false);
    setError(null);
  }

  return (
    <div className="space-y-3">
      {!file ? (
        <div
          className="flex items-center gap-3 border border-dashed border-fog rounded-lg px-4 py-3 cursor-pointer hover:border-midnight/40 transition-colors"
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) handleFile(f); }}
        >
          <FileText className="h-4 w-4 shrink-0 text-charcoal-soft" />
          {uploading ? (
            <span className="text-sm text-charcoal-soft flex items-center gap-2">
              <Loader2 className="h-3 w-3 animate-spin" /> Uploading…
            </span>
          ) : (
            <span className="text-sm text-charcoal-soft">
              Upload catalogue page <span className="text-charcoal/40">(PDF, JPG or PNG)</span>
            </span>
          )}
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,application/pdf"
            className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
          />
        </div>
      ) : (
        <div className="flex items-center gap-3 rounded-lg border border-fog bg-white px-4 py-3">
          <FileText className="h-4 w-4 shrink-0 text-charcoal-soft" />
          <span className="text-sm text-charcoal flex-1 truncate">{file.name}</span>
          {done ? (
            <span className="text-xs text-emerald-600 font-medium">Pedigree extracted ✓</span>
          ) : (
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={extract}
              disabled={extracting}
              className="shrink-0 gap-1.5"
            >
              {extracting ? (
                <><Loader2 size={12} className="animate-spin" /> Extracting…</>
              ) : (
                <><Sparkles size={12} /> Extract with AI</>
              )}
            </Button>
          )}
          <button
            type="button"
            onClick={clear}
            className="shrink-0 text-charcoal-soft hover:text-charcoal"
          >
            <X size={14} />
          </button>
        </div>
      )}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
