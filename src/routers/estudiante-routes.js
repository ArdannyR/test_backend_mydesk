import {Router} from 'express'
import { confirmarMail,recuperarPassword,comprobarTokenPassword,crearNuevoPassword,registro, login,perfil,actualizarPassword,actualizarPerfil,getDesktop,createItem,deleteItem,
moverItem,renombrarItem,actulizarContenidoTextual,obetenerRecomendaciones,shareItem,actualizarImagen,actuPreferencias,crearPago,  
compartirEscritorio,
getDashboardData, getItemById, actualizarPosicionesMasivas, createWorkspace, agregarMiembroWorkspace, uploadFileItem} from '../controllers/estudiante-controller.js';
import { verificarTokenJWT, crearTokenJWT } from '../middlewares/JWT.js';

import { improveTextIA, chatWithMiDesk, generateWallpaperIA } from "../controllers/ai-controller.js";

const router = Router()

import passport from 'passport';


console.log("✅ [estudiante-routes.js] Archivo cargado y definiendo rutas.");

router.post('/registro', registro);

router.get('/confirmar/:token',confirmarMail)

router.post('/recuperarPassword',recuperarPassword)

router.get('/recuperarPassword/:token',comprobarTokenPassword)

router.post('/nuevoPassword/:token',crearNuevoPassword)


// Passportjs

// 1. Ruta que inicia el proceso (El botón "Entrar con Google" del frontend apunta aquí)
router.get('/auth/google', passport.authenticate('google', { 
    scope: ['profile', 'email'],
    session: false // Usamos JWT, no sesiones de servidor
}));

// 2. Ruta de retorno (Google te devuelve aquí)
router.get('/auth/google/callback', 
    passport.authenticate('google', { session: false, failureRedirect: '/login' }),
    (req, res) => {
        // Si llega aquí, el usuario ya fue autenticado y está en req.user
        const usuario = req.user;

        // Creamos tu JWT usando TU función existente
        const token = crearTokenJWT(usuario._id, usuario.rol);

        // REDIRECCIONAMOS al Frontend con el token en la URL
        // (El frontend debe leer este token de la URL y guardarlo en localStorage)
        res.redirect(`${process.env.URL_FRONTEND}/google-success?token=${token}`);
    }
);

router.post('/estudiante/login',login)

router.get('/estudiante/perfil',verificarTokenJWT,perfil)

router.put('/estudiante/perfil/:id',verificarTokenJWT,actualizarPerfil)

router.put('/actualizarPassword/:id',verificarTokenJWT,actualizarPassword)

// Obtener ítems del escritorio
router.get("/desktop", verificarTokenJWT, getDesktop);

// Por Id
router.get('/items/:id', verificarTokenJWT, getItemById);

// Masivos

router.patch('/items/positions/bulk', verificarTokenJWT, actualizarPosicionesMasivas);

// Crear un nuevo ítem
router.post("/items", verificarTokenJWT, createItem);

router.patch('/items/:id/renombrar', verificarTokenJWT, renombrarItem);

router.patch('/items/:id/mover', verificarTokenJWT, moverItem);

//ID= de la carpeta que quieras eliminar 
router.delete('/items/:id', verificarTokenJWT, deleteItem);

router.post('/ia/improve-text', verificarTokenJWT, improveTextIA);

router.put('/files/:id', verificarTokenJWT, actulizarContenidoTextual);

router.get("/ia/recommendations", verificarTokenJWT, obetenerRecomendaciones);

router.post("/share/:id", verificarTokenJWT, shareItem);

router.patch("/user/preferences",verificarTokenJWT,actuPreferencias);

router.post("/upload/image",verificarTokenJWT,actualizarImagen);

router.post("/items/upload", verificarTokenJWT, uploadFileItem);

router.post("/payments/create-intent", verificarTokenJWT, crearPago);

router.post("/share-desktop", verificarTokenJWT, compartirEscritorio);

router.get("/dashboard-data", verificarTokenJWT, getDashboardData);

// Chatbot

router.post('/ia/chat', verificarTokenJWT, chatWithMiDesk);

// Wallpapers con ia hugging face

router.post('/ia/generate-wallpaper', verificarTokenJWT, generateWallpaperIA);

// Workspaces

router.post("/workspaces", verificarTokenJWT, createWorkspace);

router.post("/workspaces/invite", verificarTokenJWT, agregarMiembroWorkspace);

export default router;
