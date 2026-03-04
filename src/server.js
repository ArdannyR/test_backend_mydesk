// Paquetes

import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import cloudinary from 'cloudinary'
import fileUpload from "express-fileupload"
import routerEstudiantes from './routers/estudiante-routes.js'


// Inicializaciones
const app = express();
dotenv.config();

//Passport
import passport from 'passport';
import './config/passport.js';

// Configuraciones
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
})


// Middlewares
app.use(express.json())
app.use(cors())
 
app.use(fileUpload({
    useTempFiles : true,
    tempFileDir : './uploads'
}))

//passport
app.use(passport.initialize());

// Variables de entorno o variables globales
app.set('port', process.env.PORT || 3000);

// Rutas
// Ruta principal
app.get('/',(req,res)=>res.send("Server on"))

console.log("✅ Cargando rutas de estudiantes en /api");
// Rutas para veterinarios
app.use('/api',routerEstudiantes)

// Manejo de una ruta que no sea encontrada
app.use((req,res)=>{


    console.log(`❌ 404 - Ruta no encontrada: ${req.method} ${req.originalUrl}`);

    res.status(404).send("Endpoint no encontrado - 404")
    
})

    

// Exportar la instancia express por medio de app

export default app;

