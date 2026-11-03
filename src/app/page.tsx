import {
  Activity, ArrowUpRight, AudioLines, Bot, CalendarDays, Check,
  ChevronRight, CircleHelp, Clapperboard, Clock3, Command, Film,
  Instagram, MessageCircle, Plus, Settings2, ShieldCheck, Sparkles,
  TrendingUp, Users, WandSparkles
} from "lucide-react";

const tasks = [
  { time: "09:30", type: "REEL", title: "La nube no es tan nube como crees", detail: "Motion graphics · 32 segundos", status: "Pendiente de aprobación", color: "violet" },
  { time: "13:00", type: "CARRUSEL", title: "5 herramientas de IA que sí uso", detail: "7 diapositivas · Educación", status: "Borrador listo", color: "blue" },
  { time: "19:00", type: "STORIES", title: "¿Qué parte de la IA te interesa más?", detail: "Encuesta · 3 historias", status: "En preparación", color: "mint" }
];

function Metric({ label, value, change, icon: Icon }: { label: string; value: string; change: string; icon: typeof Activity }) {
  return <div className="metric"><div className="metric-top"><span>{label}</span><Icon size={17}/></div><strong>{value}</strong><small>{change}</small></div>;
}

export default function Home() {
  return (
    <main className="shell">
      <aside className="sidebar">
        <div className="brand"><div className="brand-mark"><Instagram size={19}/></div><div><b>ig social<span>ai</span></b><small>CREATOR WORKSPACE</small></div></div>
        <div className="account"><div className="avatar">N</div><div><b>@nickdhq</b><small>Instagram Creator</small></div><span className="online"/></div>
        <div className="nav-label">WORKSPACE</div>
        <a className="nav active"><Activity size={17}/> Overview</a>
        <a className="nav"><TrendingUp size={17}/> Niche & analytics</a>
        <a className="nav"><Clapperboard size={17}/> Content studio</a>
        <a className="nav"><CalendarDays size={17}/> Calendar</a>
        <a className="nav"><MessageCircle size={17}/> Inbox & automations <i>0</i></a>
        <div className="nav-label second">SYSTEM</div>
        <a className="nav"><Bot size={17}/> Claude MCP</a>
        <a className="nav"><Settings2 size={17}/> Settings</a>
        <div className="sidebar-bottom"><div className="claude-card"><div className="claude-icon"><Sparkles size={16}/></div><b>Claude connected?</b><p>Connect your workspace to let Claude plan and prepare content.</p><button>Set up connection <ArrowUpRight size={14}/></button></div><div className="help"><CircleHelp size={15}/> Help center <span>v0.1.0</span></div></div>
      </aside>

      <section className="main">
        <header className="topbar"><div><span className="crumb">Workspace</span><ChevronRight size={14}/><b>Overview</b></div><div className="top-actions"><span className="live-dot"/> <span>System operational</span><button className="icon-btn"><Settings2 size={17}/></button><div className="avatar small">N</div></div></header>
        <div className="content">
          <section className="welcome"><div><div className="eyebrow"><span className="sparkle">✳</span> YOUR CREATOR OPERATING SYSTEM</div><h1>Good afternoon, Nicolás<span>.</span></h1><p>Your content engine is ready. Let’s make something worth watching.</p></div><button className="primary"><Plus size={17}/> New content</button></section>
          <section className="hero">
            <div className="hero-copy"><div className="hero-kicker"><WandSparkles size={14}/> CLAUDE WORKSPACE</div><h2>One brief.<br/><em>A week of content.</em></h2><p>Claude learns your niche, develops the ideas and prepares every asset. You stay in control of what goes live.</p><button className="hero-btn">Start a content plan <ArrowUpRight size={15}/></button></div>
            <div className="hero-art"><div className="orbit orbit-one"/><div className="orbit orbit-two"/><div className="art-core"><Sparkles size={35}/></div><div className="float-card card-a"><Film size={16}/><span>Motion graphics</span><Check size={14}/></div><div className="float-card card-b"><AudioLines size={16}/><span>Voiceover ready</span></div><div className="float-card card-c"><ShieldCheck size={16}/><span>Your approval required</span></div></div>
          </section>
          <section className="metrics"><Metric label="FOLLOWERS" value="—" change="Connect Instagram to load insights" icon={Users}/><Metric label="ENGAGEMENT RATE" value="—" change="Waiting for account data" icon={TrendingUp}/><Metric label="CONTENT READY" value="0" change="No drafts yet" icon={Clapperboard}/><Metric label="APPROVAL QUEUE" value="0" change="Nothing waiting for review" icon={ShieldCheck}/></section>
          <section className="section-head"><div><h3>Today’s production</h3><p>Your proposed content schedule</p></div><button className="text-btn">Open calendar <ArrowUpRight size={14}/></button></section>
          <section className="task-list">{tasks.map((task) => <article className="task" key={task.title}><div className="task-time"><Clock3 size={14}/>{task.time}</div><div className={`task-icon ${task.color}`}>{task.type === "REEL" ? <Film size={19}/> : task.type === "CARRUSEL" ? <Clapperboard size={19}/> : <Sparkles size={19}/>}</div><div className="task-info"><div className="task-type">{task.type}</div><h4>{task.title}</h4><p>{task.detail}</p></div><div className="task-status"><span className="status-dot"/>{task.status}</div><button className="more">•••</button></article>)}</section>
          <section className="bottom-grid"><div className="panel"><div className="panel-head"><div><h3>Automation activity</h3><p>What your agent is handling</p></div><span className="paused">NOT CONNECTED</span></div><div className="empty"><div className="empty-icon"><Bot size={22}/></div><b>Your agent is waiting for access</b><p>Connect Instagram and Claude to start automating your workflow.</p></div></div><div className="panel"><div className="panel-head"><div><h3>Approval center</h3><p>Nothing publishes without your OK</p></div><ShieldCheck size={18}/></div><div className="approval-empty"><div className="approval-check"><Check size={18}/></div><div><b>All clear</b><p>Your approval queue is empty.</p></div></div><div className="secure-note"><ShieldCheck size={14}/> Publishing is always approval-gated.</div></div></section>
          <footer><span>IG SOCIAL AI <b>·</b> BUILT FOR CREATORS</span><span>Designed to work with Claude <Command size={12}/></span></footer>
        </div>
      </section>
    </main>
  );
}
