import type { Metadata } from "next";
import { LegalPage } from "@/components/legal-page";

export const metadata: Metadata = {
  title: "Términos del servicio | IG Social AI",
  description: "Condiciones de uso de IG Social AI.",
};

export default function TermsPage() {
  return (
    <LegalPage title="Términos del servicio">
      <p>Estos términos regulan el acceso y uso de IG Social AI (el “Servicio”), una herramienta en fase beta para analizar cuentas profesionales de Instagram, proponer y producir contenido y facilitar determinadas tareas de gestión mediante integraciones autorizadas.</p>

      <section>
        <h2>1. Aceptación y elegibilidad</h2>
        <p>Al acceder o utilizar el Servicio, aceptas estos términos y la <a href="/privacy">Política de privacidad</a>. Debes tener capacidad legal para aceptar estas condiciones y, cuando conectes una cuenta, estar autorizado para administrarla.</p>
      </section>

      <section>
        <h2>2. Cuenta e integración con Instagram</h2>
        <p>La conexión se realiza mediante los mecanismos oficiales de autorización de Meta. No debes compartir tu contraseña de Instagram con IG Social AI. Eres responsable de mantener el control de tu cuenta, revisar los permisos concedidos y revocarlos cuando lo consideres necesario.</p>
      </section>

      <section>
        <h2>3. Uso permitido</h2>
        <p>Te comprometes a utilizar el Servicio de forma lícita, respetando los derechos de terceros, las condiciones de Meta y las políticas de Instagram. No debes utilizarlo para spam, mensajes no solicitados, suplantación, fraude, scraping no autorizado, acoso ni para infringir derechos de autor o privacidad.</p>
      </section>

      <section>
        <h2>4. Contenido y aprobaciones</h2>
        <p>Conservas los derechos sobre el contenido que aportas. Eres responsable de verificar que tienes los derechos, permisos y autorizaciones necesarios para utilizar imágenes, música, voces, marcas y otros materiales. Las ideas, textos, audios y piezas generadas pueden contener errores y deben revisarse antes de publicarse. No se realizará una publicación ni otra acción externa sin la autorización requerida por la función correspondiente.</p>
      </section>

      <section>
        <h2>5. Servicios de terceros</h2>
        <p>Algunas funciones dependen de Meta, Vercel, Neon, ElevenLabs y, cuando conectas el servidor MCP, Anthropic/Claude. Esos servicios tienen sus propios términos, políticas, límites y disponibilidad. IG Social AI no controla sus decisiones, interrupciones ni cambios de API.</p>
      </section>

      <section>
        <h2>6. Disponibilidad y fase beta</h2>
        <p>El Servicio se ofrece en fase beta y puede cambiar, limitarse o interrumpirse. No garantizamos disponibilidad ininterrumpida, resultados específicos, crecimiento de audiencia, alcance, ventas ni aprobación de contenido por parte de Meta.</p>
      </section>

      <section>
        <h2>7. Suspensión y terminación</h2>
        <p>Podemos limitar o suspender el acceso si existe un riesgo de seguridad, uso abusivo, incumplimiento de estos términos o exigencia legal. Puedes dejar de utilizar el Servicio y solicitar la eliminación de tus datos conforme a la <a href="/data-deletion">página de eliminación</a>.</p>
      </section>

      <section>
        <h2>8. Limitación de responsabilidad</h2>
        <p>En la medida permitida por la legislación aplicable, el Servicio se proporciona “tal cual” y “según disponibilidad”. Nada de estos términos excluye responsabilidades que legalmente no puedan excluirse. Eres responsable de revisar las acciones, publicaciones y materiales antes de utilizarlos.</p>
      </section>

      <section>
        <h2>9. Cambios</h2>
        <p>Podemos actualizar estos términos cuando sea necesario. La versión vigente estará publicada en esta página con su fecha de actualización. El uso continuado después de la entrada en vigor de los cambios implica la aceptación de los términos actualizados, cuando la ley lo permita.</p>
      </section>

      <section>
        <h2>10. Legislación aplicable</h2>
        <p>Estos términos se interpretarán conforme a la legislación aplicable al responsable del Servicio y al usuario, sin limitar los derechos obligatorios que correspondan al consumidor o titular de datos en su jurisdicción.</p>
      </section>
    </LegalPage>
  );
}
