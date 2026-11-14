import { useMemo, useState } from 'react';
import Icon, { BrandIcon } from '../lib/icons';
import { useStore } from '../lib/store';
import { Badge, Progress, ScoreRing, SectionHead, Segmented, Sparkline, StatCard } from '../components/ui';
import { Thumb } from '../components/Thumb';

const RANGES = [
  { value: '7', label: '7 days' },
  { value: '30', label: '30 days' },
  { value: '90', label: '90 days' },
];

const SERIES = {
  7: [42, 55, 48, 71, 64, 88, 96],
  30: [38, 44, 41, 52, 49, 61, 58, 72, 69, 78, 74, 86, 92],
  90: [22, 28, 26, 34, 31, 39, 44, 41, 52, 57, 54, 63, 68, 66, 74, 79, 84, 88],
};

const PLATFORMS = [
  { id: 'tiktok', name: 'TikTok', views: 184200, retention: 68, clicks: 4.8, hue: 180 },
  { id: 'instagram', name: 'Instagram Reels', views: 126400, retention: 61, clicks: 3.9, hue: 330 },
  { id: 'youtube', name: 'YouTube Shorts', views: 88200, retention: 57, clicks: 3.1, hue: 0 },
  { id: 'linkedin', name: 'LinkedIn', views: 41900, retention: 49, clicks: 2.6, hue: 210 },
];

const DOW = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const SLOTS = ['6a', '9a', '12p', '3p', '6p', '9p'];

function heat(day, slot) {
  const v = Math.abs(Math.sin((day + 1) * 2.3 + (slot + 1) * 1.7)) * 100;
  return Math.round(v);
}

export default function Analytics() {
  const { clips, posts, buffer } = useStore();
  const [range, setRange] = useState('30');

  const totals = useMemo(() => {
    const views = PLATFORMS.reduce((s, p) => s + p.views, 0);
    const published = posts.filter((p) => p.status === 'published').length;
    return {
      views,
      avgRetention: Math.round(PLATFORMS.reduce((s, p) => s + p.retention, 0) / PLATFORMS.length),
      published,
      engagement: (PLATFORMS.reduce((s, p) => s + p.clicks, 0) / PLATFORMS.length).toFixed(1),
    };
  }, [posts]);

  const top = useMemo(() => [...clips].sort((a, b) => b.score - a.score).slice(0, 4), [clips]);

  return (
    <div className="space-y-4">
      <SectionHead
        eyebrow="Insights"
        title="Analytics"
        sub="Performance of clips delivered through Buffer."
        action={<Segmented value={range} onChange={setRange} options={RANGES} />}
      />

      <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-4">
        <StatCard icon="eye" label="Total views" value={totals.views >= 1000 ? `${(totals.views / 1000).toFixed(1)}K` : totals.views} delta="+18.2%" tone="violet" spark={SERIES[range]} />
        <StatCard icon="chart" label="Avg. retention" value={`${totals.avgRetention}%`} delta="+4.1%" tone="cyan" spark={[48, 52, 50, 58, 61, 64, 68]} />
        <StatCard icon="send" label="Published posts" value={totals.published || 0} delta="+2" tone="mint" spark={[1, 2, 2, 3, 3, 4, 4]} />
        <StatCard icon="zap" label="Engagement rate" value={`${totals.engagement}%`} delta="+0.6%" tone="amber" spark={[2.1, 2.4, 2.8, 2.7, 3.1, 3.4, 3.7]} />
      </div>

      <section className="card p-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-[12.5px] font-bold">Views over time</h2>
            <p className="text-[10px] text-white/40">Last {range} days · all connected channels</p>
          </div>
          <Badge tone="mint" icon="arrow-up-right">+18.2%</Badge>
        </div>
        <div className="mt-2">
          <Sparkline data={SERIES[range]} hue={262} height={78} />
        </div>
      </section>

      <section className="card overflow-hidden">
        <div className="border-b border-white/8 px-3 py-2 text-[12.5px] font-bold">Channel performance</div>
        <div className="divide-y divide-white/6">
          {PLATFORMS.map((p) => (
            <div key={p.id} className="flex items-center gap-3 px-3 py-2.5">
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-white/10 bg-white/[0.04]" style={{ color: `hsl(${p.hue} 80% 70%)` }}>
                <BrandIcon name={p.id} size={15} />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate text-[11.5px] font-semibold">{p.name}</span>
                  <span className="shrink-0 text-[10px] text-white/40">{(p.views / 1000).toFixed(1)}K views</span>
                </div>
                <div className="mt-1 flex items-center gap-2">
                  <div className="progress-track flex-1"><div className="progress-fill" style={{ width: `${p.retention}%`, background: `linear-gradient(90deg, hsl(${p.hue} 80% 55%), #22d3ee)` }} /></div>
                  <span className="w-16 shrink-0 text-right text-[9.5px] text-white/45">{p.retention}% retained</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <div className="grid gap-3 lg:grid-cols-2">
        <section className="card overflow-hidden">
          <div className="border-b border-white/8 px-3 py-2 text-[12.5px] font-bold">Top performing clips</div>
          <div className="divide-y divide-white/6">
            {top.map((c) => (
              <div key={c.id} className="flex items-center gap-2.5 px-3 py-2">
                <div className="w-9 shrink-0 overflow-hidden rounded-md border border-white/10">
                  <Thumb hue={c.hue} hue2={c.hue2} seed={c.title} ratio="9 / 16" rounded="rounded-none" showMeta={false} showGrid={false} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[11px] font-semibold">{c.title}</div>
                  <div className="text-[9.5px] text-white/40">{c.duration}s · {c.tag}</div>
                </div>
                <ScoreRing score={c.score} size={34} label={false} />
              </div>
            ))}
          </div>
        </section>

        <section className="card p-3">
          <h2 className="text-[12.5px] font-bold">Best posting times</h2>
          <p className="text-[10px] text-white/40">Engagement index by day and hour (your audience)</p>
          <div className="mt-2.5 space-y-1">
            {DOW.map((d, di) => (
              <div key={d} className="flex items-center gap-1.5">
                <span className="w-7 shrink-0 text-[9px] font-semibold uppercase text-white/35">{d}</span>
                {SLOTS.map((s, si) => {
                  const v = heat(di, si);
                  return (
                    <div
                      key={s}
                      title={`${d} ${s} · ${v}`}
                      className="h-5 flex-1 rounded-[4px] border border-white/5"
                      style={{ background: `linear-gradient(135deg, rgba(124,92,255,${0.08 + v / 260}), rgba(34,211,238,${0.05 + v / 320}))` }}
                    />
                  );
                })}
              </div>
            ))}
            <div className="flex items-center gap-1.5 pt-0.5">
              <span className="w-7" />
              {SLOTS.map((s) => <span key={s} className="flex-1 text-center text-[8px] text-white/30">{s}</span>)}
            </div>
          </div>
          <div className="mt-2 flex items-center justify-between text-[9.5px] text-white/35">
            <span className="flex items-center gap-1"><Icon name="info" size={9} /> Lower</span>
            <span className="flex items-center gap-1">Higher <Icon name="info" size={9} /></span>
          </div>
        </section>
      </div>

      <section className="card flex flex-wrap items-center gap-2 p-3">
        <BrandIcon name="buffer" size={16} />
        <p className="min-w-0 flex-1 text-[10.5px] leading-relaxed text-white/45">
          Metrics are pulled from {buffer.connected ? buffer.workspace : 'your Buffer workspace'} for delivered posts only. Scheduled items appear after publication.
        </p>
        <Badge tone="slate">Demo data</Badge>
      </section>
    </div>
  );
}
