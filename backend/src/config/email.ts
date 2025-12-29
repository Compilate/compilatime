import nodemailer from 'nodemailer';
import { config } from './env';

// Interfaz para opciones de email
export interface EmailOptions {
  to: string | string[];
  subject: string;
  html?: string;
  text?: string;
  attachments?: Array<{
    filename: string;
    path?: string;
    content?: Buffer | string;
    contentType?: string;
  }>;
}

// Configuración del transportador de email
export const createEmailTransporter = () => {
  if (!config.email.enabled) {
    console.warn('⚠️ Email no configurado. Las funciones de email estarán deshabilitadas.');
    return null;
  }

  return nodemailer.createTransport({
    host: config.email.host,
    port: config.email.port,
    secure: config.email.port === 465, // true para 465, false para otros puertos
    auth: {
      user: config.email.user,
      pass: config.email.pass,
    },
    tls: {
      rejectUnauthorized: false, // Para desarrollo
    },
  });
};

// Función para enviar email
export const sendEmail = async (options: EmailOptions): Promise<boolean> => {
  try {
    const transporter = createEmailTransporter();

    if (!transporter) {
      console.warn('⚠️ Transportador de email no disponible');
      return false;
    }

    const mailOptions = {
      from: config.email.from,
      to: Array.isArray(options.to) ? options.to.join(', ') : options.to,
      subject: options.subject,
      html: options.html,
      text: options.text,
      attachments: options.attachments,
    };

    const result = await transporter.sendMail(mailOptions);

    console.log('✅ Email enviado exitosamente:', result.messageId);
    return true;
  } catch (error) {
    console.error('❌ Error al enviar email:', error);
    return false;
  }
};

// Función para verificar conexión con el servidor de email
export const verifyEmailConnection = async (): Promise<boolean> => {
  try {
    const transporter = createEmailTransporter();

    if (!transporter) {
      console.warn('⚠️ Email no configurado. Omitiendo verificación.');
      return true; // Retornar true para no bloquear el inicio
    }

    await transporter.verify();
    console.log('✅ Conexión con servidor de email verificada');
    return true;
  } catch (error) {
    console.warn('⚠️ Error al verificar conexión de email, continuando sin email:', error);
    return true; // Retornar true para no bloquear el inicio
  }
};

// Plantillas de email comunes
export const emailTemplates = {
  // Bienvenida para nuevo empleado
  welcomeEmployee: (employeeName: string, companyName: string, pin: string) => ({
    subject: `Bienvenido a ${companyName}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #1E40AF; color: white; padding: 20px; text-align: center;">
          <h1>CompilaTime</h1>
        </div>
        <div style="padding: 20px;">
          <h2>¡Bienvenido, ${employeeName}!</h2>
          <p>Tu cuenta ha sido creada en el sistema de registro horario de <strong>${companyName}</strong>.</p>
          <div style="background: #F3F4F6; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <h3>Tus datos de acceso:</h3>
            <p><strong>PIN para fichar:</strong> <code style="background: #E5E7EB; padding: 5px;">${pin}</code></p>
            <p><strong>Para acceder a tu zona personal:</strong> Usa tu DNI y este PIN como contraseña.</p>
          </div>
          <p>Guarda este PIN de forma segura. Podrás cambiarlo cuando accedas a tu zona personal.</p>
          <p>Si tienes alguna pregunta, contacta con el departamento de RRHH.</p>
        </div>
        <div style="background: #1F2937; color: white; padding: 10px; text-align: center; font-size: 12px;">
          <p>&copy; 2024 CompilaTime - Sistema de Registro Horario</p>
        </div>
      </div>
    `,
  }),

  // Notificación de fichaje
  timeEntryNotification: (employeeName: string, type: string, time: string) => ({
    subject: `Registro de fichaje - ${type}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #1E40AF; color: white; padding: 20px; text-align: center;">
          <h1>CompilaTime</h1>
        </div>
        <div style="padding: 20px;">
          <h2>Confirmación de Fichaje</h2>
          <p>Se ha registrado un fichaje con los siguientes datos:</p>
          <div style="background: #F3F4F6; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <p><strong>Empleado:</strong> ${employeeName}</p>
            <p><strong>Tipo:</strong> ${type}</p>
            <p><strong>Hora:</strong> ${time}</p>
          </div>
          <p>Este es un mensaje automático, por favor no responda.</p>
        </div>
        <div style="background: #1F2937; color: white; padding: 10px; text-align: center; font-size: 12px;">
          <p>&copy; 2024 CompilaTime - Sistema de Registro Horario</p>
        </div>
      </div>
    `,
  }),

  // Recuperación de contraseña
  passwordReset: (resetLink: string) => ({
    subject: 'Restablecimiento de Contraseña - CompilaTime',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #1E40AF; color: white; padding: 20px; text-align: center;">
          <h1>CompilaTime</h1>
        </div>
        <div style="padding: 20px;">
          <h2>Restablecimiento de Contraseña</h2>
          <p>Has solicitado restablecer tu contraseña. Haz clic en el siguiente enlace:</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${resetLink}" style="background: #10B981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">
              Restablecer Contraseña
            </a>
          </div>
          <p>Este enlace expirará en 24 horas.</p>
          <p>Si no solicitaste este cambio, ignora este email.</p>
        </div>
        <div style="background: #1F2937; color: white; padding: 10px; text-align: center; font-size: 12px;">
          <p>&copy; 2024 CompilaTime - Sistema de Registro Horario</p>
        </div>
      </div>
    `,
  }),

  // Alerta de horas extras
  overtimeAlert: (employeeName: string, hours: string, date: string) => ({
    subject: `Alerta de Horas Extras - ${employeeName}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #1E40AF; color: white; padding: 20px; text-align: center;">
          <h1>CompilaTime</h1>
        </div>
        <div style="padding: 20px;">
          <h2 style="color: #F59E0B;">⚠️ Alerta de Horas Extras</h2>
          <p>Se han detectado horas extras:</p>
          <div style="background: #FEF3C7; padding: 15px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #F59E0B;">
            <p><strong>Empleado:</strong> ${employeeName}</p>
            <p><strong>Horas extras:</strong> ${hours}</p>
            <p><strong>Fecha:</strong> ${date}</p>
          </div>
          <p>Por favor, revisa y aprueba estas horas en el panel de administración.</p>
        </div>
        <div style="background: #1F2937; color: white; padding: 10px; text-align: center; font-size: 12px;">
          <p>&copy; 2024 CompilaTime - Sistema de Registro Horario</p>
        </div>
      </div>
    `,
  }),
};

export default {
  sendEmail,
  verifyEmailConnection,
  emailTemplates,
};