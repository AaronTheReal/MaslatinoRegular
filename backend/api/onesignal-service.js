import * as OneSignal from '@onesignal/node-onesignal';

const ONESIGNAL_APP_ID = process.env.ONESIGNAL_APP_ID;
const ONESIGNAL_REST_API_KEY = process.env.ONESIGNAL_REST_API_KEY;

// Configuración del cliente
const appKeyProvider = {

  getToken() {
    return ONESIGNAL_REST_API_KEY;
  }
};

const configuration = OneSignal.createConfiguration({
  authMethods: {
    app_key: {
      tokenProvider: appKeyProvider
    }
  }
});

const client = new OneSignal.DefaultApi(configuration);

// Función para enviar notificación a un usuario específico (usando external user ID, que es user._id)
export async function sendNotificationToUser(userId, message, data = {}) {
  try {

      console.log("credenciales",ONESIGNAL_APP_ID,ONESIGNAL_REST_API_KEY)

    const notification = new OneSignal.Notification();
    notification.app_id = ONESIGNAL_APP_ID;
    notification.include_external_user_ids = [userId.toString()];  // Target por user._id
    notification.contents = { en: message };  // Mensaje en inglés por default; agrega es: 'Mensaje en español' para multi-idioma
    notification.data = data;  // Datos custom, e.g., { route: '/home' } para el handler en frontend

    const response = await client.createNotification(notification);
    console.log('Notificación enviada:', response);
    return response;
  } catch (error) {
    console.error('Error enviando notificación:', error);
    throw error;
  }
}

// Opcional: Enviar a todos los suscritos
export async function sendNotificationToAll(message, data = {}) {
  try {
    const notification = new OneSignal.Notification();
    notification.app_id = ONESIGNAL_APP_ID;
    notification.included_segments = ['Subscribed Users'];
    notification.contents = { en: message };
    notification.data = data;

    const response = await client.createNotification(notification);
    console.log('Notificación enviada a todos:', response);
    return response;
  } catch (error) {
    console.error('Error enviando notificación:', error);
    throw error;
  }
}