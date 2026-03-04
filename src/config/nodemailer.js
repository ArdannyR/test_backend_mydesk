import nodemailer from "nodemailer"
import Transport from "nodemailer-brevo-transport" // Importamos el adaptador
import dotenv from "dotenv"
dotenv.config()

// En lugar de configurar host/port, configuramos el adaptador de Brevo
const transporter = nodemailer.createTransport(
    new Transport({
        apiKey: process.env.BREVO_API_KEY // Usamos la API Key (xkeysib-...)
    })
)

// Verificar conexión (Esto validará si la API Key es correcta)
transporter.verify(function (error, success) {
    if (error) {
        console.log("❌ Error de conexión con Brevo API:", error);
    } else {
        console.log("✅ Servidor listo para enviar correos (Vía API Puerto 443)");
    }
});

/**
 * Función genérica para enviar correos
 * @param {string} to - Email del destinatario
 * @param {string} subject - Asunto del correo
 * @param {string} html - Contenido HTML del correo
 */
const sendMail = async (to, subject, html) => {

    try {
        const info = await transporter.sendMail({
            // OJO IMPORTANTE: Brevo es estricto.
            // El 'from' DEBE ser el correo con el que te registraste en Brevo
            // Si pones 'admin@desk.com' y no es tuyo, fallará.
            from: `"VirtualDesk" <${process.env.USER_MAILTRAP}>`, 
            to,
            subject,
            html,
        })
        console.log("✅ Email enviado ID:", info.messageId)

    } catch (error) {
        console.error("❌ Error enviando email:", error.message)
    }
}

export default sendMail