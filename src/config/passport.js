import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import Estudiante from '../models/estudiante.js';
import dotenv from 'dotenv';
dotenv.config();

// 👇 AGREGA ESTO PARA DEPURAR 👇
console.log("--- DEBUG GOOGLE ---");
console.log("CLIENT ID:", process.env.GOOGLE_CLIENT_ID); 
console.log("CLIENT SECRET:", process.env.GOOGLE_CLIENT_SECRET ? "SI EXISTE" : "NO EXISTE");
console.log("--------------------");

passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: "http://localhost:3000/api/auth/google/callback" // Debe coincidir con la consola de Google
  },
  async (accessToken, refreshToken, profile, done) => {
    try {
        // 1. Verificar si el usuario ya existe por su Google ID
        let estudiante = await Estudiante.findOne({ googleId: profile.id });

        if (estudiante) {
            return done(null, estudiante);
        }

        // 2. Si no tiene Google ID, verificamos si existe por Email
        // (Tal vez se registró normal y ahora quiere entrar con Google)
        estudiante = await Estudiante.findOne({ email: profile.emails[0].value });

        if (estudiante) {
            // Le agregamos el ID de google para la próxima
            estudiante.googleId = profile.id;
            await estudiante.save();
            return done(null, estudiante);
        }

        // 3. Si no existe, CREAMOS uno nuevo
        // Generamos un password aleatorio seguro porque el modelo lo exige
        const passwordDummy = Math.random().toString(36).slice(-8) + Math.random().toString(36).slice(-8);
        
        const nuevoEstudiante = new Estudiante({
            nombre: profile.name.givenName,
            apellido: profile.name.familyName,
            email: profile.emails[0].value,
            googleId: profile.id,
            confirmMail: true, // Como viene de Google, el correo ya es real
            password: "GOOGLE_LOGIN_PASS", // Texto temporal antes de encriptar
        });
        
        // Encriptamos el password dummy
        nuevoEstudiante.password = await nuevoEstudiante.encryptPassword(passwordDummy);
        
        await nuevoEstudiante.save();
        return done(null, nuevoEstudiante);

    } catch (error) {
        return done(error, null);
    }
  }
));

// Serialización (Para sesiones, aunque usaremos JWT, Passport lo pide a veces)
passport.serializeUser((user, done) => done(null, user.id));
passport.deserializeUser(async (id, done) => {
    const user = await Estudiante.findById(id);
    done(null, user);
});