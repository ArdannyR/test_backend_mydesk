// 1. Importaciones de terceros
import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import { v2 as cloudinary } from 'cloudinary'; 
import fileUpload from 'express-fileupload';
import passport from 'passport';
import './config/passport.js';

// 2. Rutas
import authRoutes from './routers/auth_routes.js';
import userRoutes from './routers/user_routes.js';
import itemRoutes from './routers/item_routes.js';
import aiRoutes from './routers/ai_routes.js';
import workspaceRoutes from './routers/workspace_routes.js';
import dashboardRoutes from './routers/dashboard_routes.js';
import paymentRoutes from './routers/payment_routes.js';

// 3. Inicialización
const app = express();
dotenv.config();

// 4. Variables Globales
app.set('port', process.env.PORT || 3000);

// 5. Configuración de Servicios
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

// 6. Middlewares
app.use(express.json());
app.use(cors());
app.use(fileUpload({
    useTempFiles: true,
    tempFileDir: './uploads'
}));
app.use(passport.initialize());

// 7. Rutas
app.get('/', (req, res) => res.send("🚀 Server MyDesk on"));

// Endpoint principal
app.use('/api/estudiante', authRoutes);
app.use('/api', userRoutes); 
app.use('/api', itemRoutes); 
app.use('/api', aiRoutes); 
app.use('/api', workspaceRoutes); 
app.use('/api', dashboardRoutes); 
app.use('/api', paymentRoutes);

// 8. Manejo de Errores (404)
app.use((req, res) => {
    console.log(`❌ 404 - Ruta no encontrada: ${req.method} ${req.originalUrl}`);
    res.status(404).json({ msg: "Endpoint no encontrado - 404" });
});

export default app;