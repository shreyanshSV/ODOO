import Link from "next/link";
import { requireUser } from "@/lib/session";
import { getEmployeeDashboard } from "@/lib/social/employee";
import { PageHeader, ModuleTabs, Card, Progress, Pill, EmptyState } from "@/components/ui";
import { SubNav } from "@/components/SubNav";
import { SOCIAL_TABS } from "@/lib/nav";
import { fmtNum, fmtDate } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function MyHubPage() {
  const user = await requireUser();
  const d = await getEmployeeDashboard(user.id);

  return (
    <div className="p-6 animate-fade-in">
      <PageHeader
        title="Social: My Sustainability Hub"
        subtitle="Your CSR impact, growth and recognition"
        accent="text-social"
      />
      <ModuleTabs active="Social" />
      <SubNav items={SOCIAL_TABS} />

      {!d ? (
        <EmptyState text="This account isn't linked to an employee profile. Sign in as an employee (e.g. priya@ecosphere.io) to see your personal hub." />
      ) : (
        <div className="space-y-4">
          {/* Identity */}
          <Card>
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-social/15 text-xl font-semibold text-social">
                {d.profile.name.slice(0, 1).toUpperCase()}
              </div>
              <div className="min-w-0">
                <div className="text-base font-semibold text-ink">{d.profile.name}</div>
                <div className="text-xs text-faint">
                  {d.profile.designation} · {d.profile.department} · {d.profile.email}
                </div>
              </div>
              <div className="ml-auto">
                <Pill value={d.profile.role} />
              </div>
            </div>
          </Card>

          {/* Headline metrics */}
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Metric label="Social Health Index" value={`${d.shi.score}`} suffix="/ 100" note={d.shiBand} accent="text-social" />
            <Metric label={`Level ${d.level.level} · ${d.level.title}`} value={`${fmtNum(d.xp)}`} suffix="XP" note={`${d.level.progress}% to next`} accent="text-env" progress={d.level.progress} />
            <Metric label="Leaderboard rank" value={d.rank ? `#${d.rank}` : "—"} suffix={`of ${d.totalPeers}`} accent="text-game" />
            <Metric label="Redeemable points" value={fmtNum(d.points)} suffix="pts" accent="text-overall" />
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            {/* SHI breakdown + stats */}
            <div className="space-y-4 lg:col-span-1">
              <Card title="How your SHI is calculated">
                <div className="space-y-2.5">
                  {d.shi.factors.map((f) => (
                    <div key={f.key}>
                      <div className="mb-1 flex justify-between text-xs">
                        <span className="text-muted">{f.label}</span>
                        <span className="text-faint">+{f.contribution} (w {Math.round(f.weight * 100)}%)</span>
                      </div>
                      <Progress value={Math.round(f.value * 100)} accent="bg-social" />
                    </div>
                  ))}
                </div>
              </Card>

              <div className="grid grid-cols-2 gap-3">
                <Stat label="CSR approved" value={d.stats.approvedCsr} />
                <Stat label="CSR pending" value={d.stats.pendingCsr} />
                <Stat label="Challenges done" value={d.stats.completedChallenges} />
                <Stat label="Badges" value={d.stats.badgeCount} />
              </div>

              <Card title="🏅 Badges">
                {d.badges.length ? (
                  <div className="flex flex-wrap gap-2">
                    {d.badges.map((b) => (
                      <span key={b.name} className="flex items-center gap-1.5 rounded-lg border border-border bg-panel2 px-2.5 py-1 text-xs text-muted" title={fmtDate(b.at)}>
                        <span className="text-base">{b.icon}</span> {b.name}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-faint">No badges yet — join a challenge or CSR activity to earn your first.</p>
                )}
              </Card>
            </div>

            {/* Timeline */}
            <Card title="🕑 Activity timeline" className="lg:col-span-2">
              {d.timeline.length ? (
                <ul className="space-y-2.5">
                  {d.timeline.map((t, i) => (
                    <li key={i} className="flex items-center gap-3 border-b border-border/50 pb-2 text-sm last:border-0">
                      <span className="text-base">{t.icon}</span>
                      <span className="flex-1 text-muted">{t.text}</span>
                      <span className="shrink-0 text-xs text-faint">{fmtDate(t.at)}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-faint">No activity yet. Join a CSR activity or a challenge to get started.</p>
              )}
            </Card>
          </div>

          {/* Recommendations */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <Card title="🎯 Recommended challenges">
              {d.recommendations.challenges.length ? (
                <ul className="space-y-2">
                  {d.recommendations.challenges.map((c) => (
                    <li key={c.id} className="flex items-center justify-between rounded-lg border border-border bg-panel2 px-3 py-2 text-sm">
                      <span className="text-ink">{c.title}</span>
                      <span className="text-xs text-faint">+{c.xp} XP{c.deadline ? ` · by ${fmtDate(c.deadline)}` : ""}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-faint">You&apos;ve joined every active challenge. Nice.</p>
              )}
              <Link href="/social/csr" className="mt-3 inline-block text-xs text-social hover:underline">Browse all activities →</Link>
            </Card>

            <Card title="🤝 CSR opportunities">
              {d.recommendations.csr.length ? (
                <ul className="space-y-2">
                  {d.recommendations.csr.map((c) => (
                    <li key={c.id} className="flex items-center justify-between rounded-lg border border-border bg-panel2 px-3 py-2 text-sm">
                      <span className="text-ink">{c.name}</span>
                      <span className="text-xs text-faint">+{c.points} pts</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-faint">No open CSR activities right now.</p>
              )}
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}

function Metric({ label, value, suffix, note, accent, progress }: { label: string; value: string; suffix?: string; note?: string; accent: string; progress?: number }) {
  const bar = accent.replace("text-", "bg-");
  return (
    <div className="panel-2 card-hover p-4">
      <div className="flex items-center gap-2">
        <span className={`h-3 w-1 rounded-full ${bar}`} />
        <span className="text-[11px] font-medium uppercase tracking-wider text-faint">{label}</span>
      </div>
      <div className={`mt-2 font-display text-2xl font-semibold tabular-nums ${accent}`}>
        {value} {suffix && <span className="text-sm font-normal text-faint">{suffix}</span>}
      </div>
      {typeof progress === "number" && (
        <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-bg/60">
          <div className={`h-full rounded-full ${bar} transition-[width] duration-700 ease-out`} style={{ width: `${progress}%` }} />
        </div>
      )}
      {note && <div className="mt-1 text-[11px] text-muted">{note}</div>}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="panel-2 card-hover p-3">
      <div className="font-display text-lg font-semibold tabular-nums text-ink">{value}</div>
      <div className="text-[11px] text-faint">{label}</div>
    </div>
  );
}
