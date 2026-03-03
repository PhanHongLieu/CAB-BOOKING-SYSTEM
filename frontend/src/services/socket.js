import { io } from 'socket.io-client';

const WS_URL = process.env.REACT_APP_WS_URL || 'http://localhost:8000';

let notificationSocket = null;
let locationSocket = null;

export const connectNotificationSocket = (userId, token) => {
  if (notificationSocket) {
    return notificationSocket;
  }

  notificationSocket = io(WS_URL, {
    auth: { token },
    transports: ['websocket'],
  });

  notificationSocket.on('connect', () => {
    console.log('Notification socket connected');
    notificationSocket.emit('join', userId);
  });

  notificationSocket.on('disconnect', () => {
    console.log('Notification socket disconnected');
  });

  return notificationSocket;
};

export const connectLocationSocket = (token) => {
  if (locationSocket) {
    return locationSocket;
  }

  locationSocket = io(`${WS_URL}/location`, {
    auth: { token },
    transports: ['websocket'],
  });

  locationSocket.on('connect', () => {
    console.log('Location socket connected');
  });

  return locationSocket;
};

export const disconnectSockets = () => {
  if (notificationSocket) {
    notificationSocket.disconnect();
    notificationSocket = null;
  }
  if (locationSocket) {
    locationSocket.disconnect();
    locationSocket = null;
  }
};

export { notificationSocket, locationSocket };
