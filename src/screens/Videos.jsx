import { useMemo, useState } from 'react';
import Icon from '../lib/icons';
import { useStore } from '../lib/store';
import { Badge, EmptyState, Progress, SectionHead, Segmented } from '../components/ui';
import { Thumb } from '../components/Thumb';

const FILTERS = [
  { value: 'all', label: 'All' },
  { value: 'processing', label: 'Processing' },
  { value: 'ready', label: 'Ready' },
  { value: 'draft', label: 'Drafts' },
];

const STATUS = {
  processing: { tone: 'cyan', label: 'Analysing' },
  ready: { tone: 'mint', label: 'Ready' },
  draft: { tone: 'slate', label: 'Draft' },
  failed: { tone: 'rose', label: 'Failed' },
};

export default function Videos() {
  const { projects, clips, navigate, toast } = useStore();
  const [filter, setFilter] = useState('all');
  const [query, setQuery] = useState('');

  const list = useMemo(
    () =>
      projects.filter((p) => {
        const okFilter = filter === 'all' || p.status === filter;
        const okQuery = !query || p.title.toLowerCase().includes(query.toLowerCase());
        return okFilter && okQuery;
      }),
    [projects, filter, query]
  );

  return (
    <div className="space-y-4">
      <SectionHead
        eyebrow="Library"
        title="My videos"
        sub={`${projects.length} source videos · ${clips.length} clips generated`}
        action={
          <button className="btn btn-primary btn-sm" onClick={() => navigate('/import')}>
            <Icon name="plus" size={13} /> Import
          </button>
        }
      />

      <div className="flex flex-wrap items-center gap-2">
        <Segmented value={filter} onChange={setFilter} options={FILTERS} />
        <div className="relative ml-auto w-full sm:w-56">
          <Icon name="search" size={13} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-white/35" />
          <input className="input pl-8 text-[12px]" placeholder="Search projects" value={query} onChange={(e) => setQuery(e.target.value)} />
        </div>
      </div>

      {list.length ? (
        <div className="grid gap-2.5 sm:grid-cols-2 xl:grid-cols-3">
          {list.map((p) => (
            <article key={p.id} className="card card-hover overflow-hidden">
              <div className="relative">
                <Thumb hue={p.hue} hue2={p.hue2} seed={p.title} ratio="16 / 9" rounded="rounded-none" showMeta={false} />
                <div className="absolute inset-0 bg-gradient-to-t from-ink-950/85 via-transparent to-transparent" />
                <span className="absolute left-2 top-2"><Badge tone={STATUS[p.status]?.tone || 'slate'}>{STATUS[p.status]?.label || p.status}</Badge></span>
                <span className="absolute bottom-2 right-2 rounded-md bg-ink-950/80 px-1.5 py-0.5 text-[9.5px] font-bold">{p.duration}</span>
                {p.status === 'processing' && (
                  <div className="absolute inset-x-2 bottom-2">
                    <Progress value={p.progress} showLabel />
                  </div>
                )}
              </div>
              <div className="p-3">
                <h3 className="truncate text-[12.5px] font-bold">{p.title}</h3>
                <div className="mt-1 flex flex-wrap items-center gap-2 text-[9.5px] text-white/40">
                  <span className="flex items-center gap-1"><Icon name="globe" size={9} /> {p.source}</span>
                  <span className="flex items-center gap-1"><Icon name="film" size={9} /> {p.clips} clips</span>
                  <span>{p.language}</span>
                </div>
                <div className="mt-2.5 flex gap-1.5">
                  {p.status === 'processing' ? (
                    <button className="btn btn-secondary btn-sm flex-1" onClick={() => navigate('/analyze')}>View progress</button>
                  ) : p.status === 'draft' ? (
                    <button className="btn btn-primary btn-sm flex-1" onClick={() => navigate('/analyze')}>
                      <Icon name="wand" size={12} /> Analyse
                    </button>
                  ) : (
                    <>
                      <button className="btn btn-primary btn-sm flex-1" onClick={() => navigate('/clips')}>Open clips</button>
                      <button className="icon-btn" aria-label="Re-run analysis" onClick={() => { toast('Queued for re-analysis.', 'info'); navigate('/analyze'); }}>
                        <Icon name="refresh" size={13} />
                      </button>
                      <button className="icon-btn" aria-label="Delete project" onClick={() => toast('Project deletion is disabled in the demo.', 'error')}>
                        <Icon name="trash" size={13} />
                      </button>
                    </>
                  )}
                </div>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <EmptyState
          icon="video"
          title="No videos match this filter"
          body="Import a long video or change the filter to see your projects."
          action={<button className="btn btn-secondary btn-sm" onClick={() => setFilter('all')}>Show all videos</button>}
        />
      )}
    </div>
  );
}
