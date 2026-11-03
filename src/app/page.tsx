import { Activity, ArrowUpRight, Bot, CheckCircle2, Circle, Instagram, KeyRound, Mic2, ShieldCheck, Sparkles } from "lucide-react";

const steps = [
  { title: "Database", detail: "Persist ideas, approvals, account state and daily reports.", configured: Boolean(process.env.DATABASE_URL), icon: Activity },
  { title: "Instagram / Meta", detail: "Connect a professional Creator or Business account using official OAuth.", configured: Boolean(process.env.META_APP_ID && process.env.META_APP_SECRET), icon: Instagram },
  { title: "Claude MCP", detail: "Connect Claude to your private creator agent endpoint.", configured: Boolean(process.env.MCP_ACCESS_TOKEN), icon: Bot },
  { title: "ElevenLabs", detail: "Generate narration with your selected voice.", configured: Boolean(process.env.ELEVENLABS_API_KEY && process.env.ELEVENLABS_VOICE_ID), icon: Mic2 },
  { title: "Credential encryption", detail: "Protect provider tokens before storing them.", configured: Boolean(process.env.APP_ENCRYPTION_KEY), icon: KeyRound },
];

export default function Home() {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const mcpUrl = `${appUrl.replace(/\\/$/, "")}/api/mcp`;
  const ready = steps.filter((step) => step.configured).length;

  return (
    <main className="min-h-screen bg-[#0e1118] text-[#f4f5f9]">
      <div className="mx-auto max-w-5xl px-6 py-10 md:px-10">
        <header className="flex items-center justify-between border-b border-white/10 pb-7">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-violet-500 text-white"><Instagram size={20}/></div>
            <div><div className="text-lg font-semibold tracking-tight">ig social<span className="text-violet-400">ai</span></div><div className="text-[9px] tracking-[.2em] text-slate-500">YOUR CREATOR AGENT</div></div>
          </div>
          <div className="rounded-full border border-violet-400/20 bg-violet-400/10 px-3 py-1.5 text-xs text-violet-200">Private beta · v0.2</div>
        </header>

        <section className="grid gap-10 py-14 md:grid-cols-[1.1fr_.9fr] md:items-center">
          <div>
            <div className="mb-4 flex items-center gap-2 text-xs font-semibold tracking-[.18em] text-violet-300"><Sparkles size={14}/> CLAUDE IS THE INTERFACE</div>
            <h1 className="max-w-xl text-4xl font-semibold leading-[1.08] tracking-[-.04em] md:text-5xl">Your Instagram.<br/><span className="text-violet-300">On autopilot.</span><br/>With your approval.</h1>
            <p className="mt-5 max-w-lg text-sm leading-7 text-slate-400">Your agent studies your account and niche, proposes three ideas every morning, produces the Reel, voiceover, cover and caption, then waits for your approval before publishing.</p>
            <div className="mt-7 flex flex-wrap gap-3 text-xs text-slate-300">
              <span className="rounded-lg border border-white/10 bg-white/[.04] px-3 py-2">01 · Analyze</span>
              <span className="rounded-lg border border-white/10 bg-white/[.04] px-3 py-2">02 · Create</span>
              <span className="rounded-lg border border-white/10 bg-white/[.04] px-3 py-2">03 · Approve</span>
              <span className="rounded-lg border border-white/10 bg-white/[.04] px-3 py-2">04 · Publish & engage</span>
            </div>
          </div>
          <div className="rounded-2xl border border-violet-300/20 bg-gradient-to-br from-[#211e37] to-[#151925] p-6 shadow-2xl shadow-violet-950/20">
            <div className="flex items-center justify-between"><div className="text-sm font-semibold">Claude workspace</div><div className="flex items-center gap-1.5 text-[10px] text-amber-200"><span className="h-1.5 w-1.5 rounded-full bg-amber-300"/> Setup in progress</div></div>
            <div className="mt-6 rounded-xl border border-white/10 bg-black/20 p-4">
              <div className="text-[10px] font-semibold tracking-widest text-violet-300">07:00 · DAILY BRIEFING</div>
              <p className="mt-3 text-sm font-medium">Good morning. I reviewed your account and your niche.</p>
              <p className="mt-2 text-xs leading-5 text-slate-400">Here are the changes in audience behavior, what is working, and three video concepts worth making today.</p>
              <div className="mt-4 space-y-2">{["01  The idea with the strongest hook","02  A practical tutorial","03  A timely niche trend"].map((idea) => <div key={idea} className="rounded-lg border border-white/10 bg-white/[.04] px-3 py-2 text-xs text-slate-300">{idea}</div>)}</div>
            </div>
            <div className="mt-4 flex items-center gap-2 text-[11px] text-slate-400"><ShieldCheck size={14} className="text-emerald-300"/> Nothing publishes without your approval.</div>
          </div>
        </section>

        <section className="rounded-2xl border border-white/10 bg-[#151a25] p-6 md:p-8">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div><div className="text-xs font-semibold tracking-widest text-slate-500">CONNECTION SETUP</div><h2 className="mt-2 text-xl font-semibold">Bring your agent online</h2><p className="mt-1 text-sm text-slate-400">Configured integrations: {ready} of {steps.length}</p></div>
            <div className="h-1.5 w-36 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-violet-400" style={{width:`${(ready/steps.length)*100}%`}}/></div>
          </div>
          <div className="mt-6 divide-y divide-white/[.07]">
            {steps.map(({title,detail,configured,icon:Icon}) => <div key={title} className="flex items-center gap-4 py-4">
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-white/[.05] text-slate-300"><Icon size={18}/></div>
              <div className="min-w-0 flex-1"><div className="text-sm font-medium">{title}</div><div className="mt-1 text-xs text-slate-500">{detail}</div></div>
              <div className={`flex items-center gap-1.5 text-xs ${configured ? "text-emerald-300" : "text-slate-500"}`}>{configured ? <CheckCircle2 size={15}/> : <Circle size={15}/>} {configured ? "Configured" : "Pending"}</div>
            </div>)}
          </div>
          <div className="mt-6 rounded-xl border border-white/10 bg-black/20 p-4">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-300"><Bot size={15} className="text-violet-300"/> Remote MCP endpoint</div>
            <code className="mt-3 block break-all text-xs text-violet-200">{mcpUrl}</code>
            <p className="mt-2 text-[11px] leading-5 text-slate-500">Add this URL as a custom connector in Claude. The private development endpoint also requires the configured Bearer token.</p>
          </div>
        </section>

        <footer className="flex flex-wrap items-center justify-between gap-3 py-8 text-[10px] tracking-wider text-slate-600"><span>IG SOCIAL AI · BUILT FOR CREATORS</span><span className="flex items-center gap-2"><ArrowUpRight size={12}/> CLAUDE-FIRST WORKFLOW</span></footer>
      </div>
    </main>
  );
}
