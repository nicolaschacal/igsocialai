import type { Metadata } from "next";
import { LegalPage } from "@/components/legal-page";

export const metadata: Metadata = {
  title: "Eliminación de datos | IG Social AI",
  description: "Cómo solicitar la eliminación de datos personales y de Instagram en IG Social AI.",
};

export default function DataDeletionPage() {
  return (
    <LegalPage title="Instrucciones para eliminar tus datos">
      <p>Puedes solicitar la eliminación de la información que IG Social AI haya asociado a tu cuenta. Este procedimiento también está disponible si ya desconectaste Instagram o dejaste de utilizar el Servicio.</p>

      <section>
        <h2>Cómo realizar una solicitud</h2>
        <ol className="list-decimal space-y-2 pl-5">
          <li>Escribe al contacto de privacidad indicado al final de esta página.</li>
          <li>Incluye el nombre de usuario de Instagram conectado y el correo que utilizaste para comunicarte con el Servicio, si corresponde.</li>
          <li>Indica claramente: “Solicito la eliminación de mis datos de IG Social AI”.</li>
          <li>No envíes tu contraseña de Instagram, códigos de autenticación ni tokens de acceso.</li>
        </ol>
      </section>

      <section>
        <h2>Qué información se eliminará</h2>
        <p>Tras verificar razonablemente la solicitud, se eliminarán o desvincularán los datos personales asociados que estén bajo control de IG Social AI, incluidos los datos de conexión de Instagram y el token almacenado, preferencias, ideas, reportes, aprobaciones, archivos y registros vinculados cuando corresponda. Podremos conservar información limitada cuando exista una obligación legal o una necesidad legítima de seguridad, y solo durante el tiempo necesario.</p>
      </section>

      <section>
        <h2>Plazo y confirmación</h2>
        <p>Confirmaremos la recepción de la solicitud y procuraremos completarla dentro de los 30 días siguientes a su verificación. Si la solicitud es compleja o requiere más tiempo, te informaremos del motivo y del plazo adicional aplicable.</p>
      </section>

      <section>
        <h2>Revocar el acceso en Instagram</h2>
        <p>También puedes quitar el acceso de IG Social AI desde la configuración de aplicaciones y sitios web de Instagram o Meta. Revocar el acceso impide futuras consultas autorizadas, pero no sustituye esta solicitud para eliminar información que ya se haya almacenado en IG Social AI.</p>
      </section>

      <section>
        <h2>Solicitudes de eliminación enviadas por Meta</h2>
        <p>Si Meta comunica una solicitud válida de eliminación relacionada con datos recibidos a través de sus plataformas, la trataremos conforme a las obligaciones aplicables y a las instrucciones de Meta.</p>
      </section>
    </LegalPage>
  );
}
