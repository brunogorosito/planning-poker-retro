import { io } from "socket.io-client";

// En dev Vite hace proxy; en prod el servidor sirve el cliente desde el mismo origen
export const socket = io({ autoConnect: false });
