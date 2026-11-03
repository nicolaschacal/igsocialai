import Link from "next/link";
import type { ReactNode } from "react";

export function LegalPage({
  title,
  updated = "3 de noviembre de 2026",
  children,
}: {
  title: string;
  updated?: string;
  children: ReactNode;
}) {
  const contactEmail = process.env.PRIVACY_CONTACT_EMAIL?.trim();

  return (
    <main className="min-h-screen bg-[#0e1118] px-5 py-12 text-[#f4f5f9] md:px-8">
      <article className="mx-auto max-w-3xl">
        <header className="mb-10 border-b border-white/10 pb-7">
          <Link href="/" className="text-sm font-semibold tracking-tight text-violet-300 hover:text-violet-200">
            IG Social AI
          </Link>
          <h1 className="mt-7 text-3xl font-semibold tracking-tight md:text-4xl">{title}</h1>
          <p className="mt-3 text-sm text-slate-400">Última actualización: {updated}</p>
        </header>
        <div className="space-y-7 text-sm leading-7 text-slate-300 [&_h2]:mb-2 [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:text-white [&_a]:text-violet-300 [&_a]:underline [&_a]:underline-offset-4 [&_li]:ml-5 [&_li]:list-disc [&_ul]:space-y-1">
          {children}
          <section>
            <h2>Contacto</h2>
            {contactEmail ? (
              <p>Para consultas sobre privacidad, ejercicio de derechos o solicitudes de eliminación, escribe a <a href={`mailto:${contactEmail}`}>{contactEmail}</a>.</p>
            ) : (
              <p>El canal de contacto de privacidad todavía debe configurarse antes de abrir el servicio al público. La dirección se publicará aquí cuando se complete esa configuración.</p>
            )}
          </section>
        </div>
        <footer className="mt-12 flex flex-wrap gap-x-5 gap-y-2 border-t border-white/10 pt-6 text-xs text-slate-500">
          <Link href="/privacy" className="hover:text-slate-300">Privacidad</Link>
          <Link href="/terms" className="hover:text-slate-300">Términos</Link>
          <Link href="/data-deletion" className="hover:text-slate-300">Eliminación de datos</Link>
          <Link href="/" className="hover:text-slate-300">Inicio</Link>
        </footer>
      </article>
    </main>
  );
}
