import type { Metadata } from "next";
import { LegalPage } from "@/components/legal-page";

export const metadata: Metadata = {
  title: "Política de privacidad | IG Social AI",
  description: "Cómo IG Social AI recopila, utiliza, conserva y protege los datos.",
};

export default function PrivacyPage() {
  return (
    <LegalPage title="Política de privacidad">
      <p>Esta política describe cómo IG Social AI (el “Servicio”) trata la información cuando utilizas su sitio, conectas una cuenta profesional de Instagram o autorizas herramientas de creación y gestión de contenido. El Servicio se encuentra en fase beta y está diseñado para ayudar a analizar una cuenta, preparar contenido y gestionar acciones que el usuario autorice.</p>

      <section>
        <h2>1. Información que podemos tratar</h2>
        <ul>
          <li><strong>Datos de conexión de Instagram:</strong> identificador de la cuenta, nombre de usuario, tipo de cuenta, permisos concedidos, fecha de conexión y vencimiento del token.</li>
          <li><strong>Credenciales:</strong> token de acceso de Instagram, almacenado cifrado en la base de datos. No solicitamos ni almacenamos tu contraseña de Instagram.</li>
          <li><strong>Información de trabajo:</strong> preferencias del creador, nicho, descripción de audiencia, ideas, guiones, storyboards, captions, aprobaciones y reportes.</li>
          <li><strong>Archivos y recursos:</strong> audios, videos, imágenes, portadas y metadatos relacionados con el contenido que solicitas generar o procesar.</li>
          <li><strong>Datos técnicos y de seguridad:</strong> registros de auditoría, eventos técnicos, solicitudes recibidas por webhooks y datos necesarios para proteger el Servicio y diagnosticar errores.</li>
          <li><strong>Datos de Instagram adicionales:</strong> si una función se habilita y cuenta con los permisos correspondientes, el Servicio podrá procesar estadísticas, publicaciones, comentarios o mensajes para ejecutar esa función.</li>
        </ul>
      </section>

      <section>
        <h2>2. Cómo utilizamos la información</h2>
        <ul>
          <li>Conectar y mantener la integración autorizada con Instagram.</li>
          <li>Consultar información de la cuenta y preparar reportes o recomendaciones.</li>
          <li>Guardar ideas, guiones, recursos y estados de aprobación.</li>
          <li>Generar narraciones y recursos audiovisuales cuando el usuario lo solicita.</li>
          <li>Ejecutar acciones de publicación o interacción únicamente cuando estén implementadas, autorizadas y aprobadas por el usuario.</li>
          <li>Proteger, mantener y mejorar el funcionamiento y la seguridad del Servicio.</li>
        </ul>
      </section>

      <section>
        <h2>3. Servicios de terceros</h2>
        <p>Para operar, IG Social AI puede intercambiar información con proveedores externos, según las funciones que utilices:</p>
        <ul>
          <li><strong>Meta / Instagram:</strong> autenticación y acceso a los datos que autorices mediante las API oficiales de Meta.</li>
          <li><strong>Vercel:</strong> alojamiento, entrega y ejecución de la aplicación.</li>
          <li><strong>Neon:</strong> almacenamiento de datos en una base de datos PostgreSQL.</li>
          <li><strong>ElevenLabs:</strong> procesamiento de texto y generación de voz cuando solicitas una narración.</li>
          <li><strong>Anthropic / Claude:</strong> si conectas el servidor MCP a Claude, la información que las herramientas devuelvan puede procesarse en esa plataforma conforme a tu uso y a sus condiciones.</li>
        </ul>
        <p>Estos proveedores pueden tratar datos conforme a sus propias políticas y condiciones. IG Social AI no vende datos personales ni utiliza los tokens de acceso para fines ajenos a las funciones autorizadas.</p>
      </section>

      <section>
        <h2>4. Conservación y seguridad</h2>
        <p>Conservamos la información mientras sea necesaria para prestar las funciones solicitadas, mantener la seguridad, cumplir obligaciones aplicables o resolver incidencias. Los tokens de Instagram se almacenan cifrados. Aplicamos medidas técnicas razonables para limitar el acceso a la información. Ningún sistema de transmisión o almacenamiento puede garantizar seguridad absoluta.</p>
      </section>

      <section>
        <h2>5. Compartición y transferencias</h2>
        <p>No comercializamos ni alquilamos información personal. Solo compartimos datos con proveedores necesarios para operar las funciones solicitadas, con Meta cuando utilizas sus servicios, o cuando sea necesario para cumplir la ley, proteger derechos o responder a solicitudes válidas. Los proveedores pueden procesar información en países distintos al tuyo, sujetos a sus condiciones y salvaguardas aplicables.</p>
      </section>

      <section>
        <h2>6. Tus opciones y derechos</h2>
        <p>Puedes dejar de utilizar el Servicio, revocar los permisos desde la configuración de Instagram o Meta y solicitar acceso, corrección o eliminación de los datos tratados por IG Social AI. La revocación en Instagram no necesariamente elimina los datos que ya estén almacenados en el Servicio: para ello, realiza una solicitud de eliminación.</p>
      </section>

      <section>
        <h2>7. Eliminación de datos</h2>
        <p>Para solicitar la eliminación de los datos asociados a tu cuenta, consulta la página de <a href="/data-deletion">instrucciones de eliminación de datos</a>. La solicitud debe permitirnos identificar la cuenta sin que tengas que compartir tu contraseña ni un token de acceso.</p>
      </section>

      <section>
        <h2>8. Menores</h2>
        <p>El Servicio no está dirigido a menores de 18 años y no busca recopilar deliberadamente sus datos personales.</p>
      </section>

      <section>
        <h2>9. Cambios en esta política</h2>
        <p>Podemos actualizar esta política cuando cambien las funciones, los proveedores o las obligaciones aplicables. Publicaremos la versión vigente en esta dirección e indicaremos la fecha de actualización.</p>
      </section>
    </LegalPage>
  );
}
