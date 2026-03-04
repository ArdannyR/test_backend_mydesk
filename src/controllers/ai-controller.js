import axios from "axios";
import { InferenceClient } from "@huggingface/inference";
import { subirBase64Cloudinary } from "../helpers/uploadCloudinary.js"; 
import Estudiante from "../models/estudiante.js"; 

const hf = new InferenceClient(process.env.HF_API_KEY);

const improveTextIA = async (req, res) => {
  try {
    const { text } = req.body;
    if (!text) return res.status(400).json({ msg: "Texto requerido" });

    const url = "https://api-inference.huggingface.com/models/facebook/bart-large-cnn";

    const response = await axios.post(
      url,
      { inputs: `Improve the following text in Spanish:\n\n${text}` },
      {
        headers: {
          Authorization: `Bearer ${process.env.HF_API_KEY}`,
          "Content-Type": "application/json",
        },
        timeout: 60000,
      }
    );

    const improved = response.data?.[0]?.generated_text ?? response.data;

    return res.status(200).json({ ok: true, improvedText: improved });
  } catch (error) {
    console.log("❌ HF ERROR MSG:", error.message);
    return res.status(500).json({ msg: "Error IA", error: error.message });
  }
};

// 2. NUEVA FUNCIÓN (CHATBOT CON PYTHON/OSCAR)
const chatWithMiDesk = async (req, res) => {
    try {
        const { mensaje } = req.body; // Recibimos el mensaje desde React

        if (!mensaje) {
            return res.status(400).json({ ok: false, msg: "El mensaje es obligatorio" });
        }

        // URL del microservicio de Oscar (Debe estar en tu .env o hardcodeada temporalmente)
        // Ejemplo: https://midesk-ia-api.onrender.com/chat
        const pythonUrl = process.env.PYTHON_MICROSERVICE_URL; 

        if (!pythonUrl) {
            return res.status(500).json({ ok: false, msg: "Error de configuración: Falta PYTHON_MICROSERVICE_URL" });
        }

        // Hacemos la petición al Python de Oscar
        // Python espera: { "mensaje": "..." }
        const response = await axios.post(
            pythonUrl, 
            { mensaje },
            { 
                timeout: 120000
            }
        );

        // Devolvemos la respuesta de Python tal cual al Frontend
        // Python devuelve: { "respuesta": "...", "metricas": {...} }
        return res.status(200).json({
            ok: true,
            data: response.data 
        });

    } catch (error) {
        console.error("❌ Error comunicando con Microservicio Python:", error.message);
        
        // Manejo de error si el servidor de Oscar está apagado o falla
        if (error.code === 'ECONNREFUSED' || error.response?.status >= 500) {
            return res.status(503).json({ ok: false, msg: "El asistente IA no está disponible en este momento." });
        }
        
        return res.status(500).json({ ok: false, msg: "Error interno del servidor" });
    }
};


const generateWallpaperIA = async (req, res) => {
    try {
        const userId = req.estudianteHeader._id;
        const { prompt } = req.body;

        if (!prompt) return res.status(400).json({ ok: false, msg: "El prompt es obligatorio" });

        console.log(`🎨 Generando fondo SDXL (Free Tier) para: "${prompt}"`);

        // 1. LLAMADA A LA IA CON LA LIBRERÍA OFICIAL
        // La clave aquí es 'provider: "hf-inference"', eso evita el error de pagos
        const imageBlob = await hf.textToImage({
            model: "stabilityai/stable-diffusion-xl-base-1.0",
            inputs: prompt,
            provider: "hf-inference", // <--- ¡ESTA ES LA LÍNEA MÁGICA! 
            parameters: { 
                negative_prompt: "blurry, low quality, distortion" // Ayuda a mejorar la calidad
            }
        });

        // 2. CONVERSIÓN (Blob -> Base64)
        const arrayBuffer = await imageBlob.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        const base64Image = `data:image/png;base64,${buffer.toString('base64')}`;

        // 3. SUBIDA A CLOUDINARY
        console.log("☁️ Subiendo a Cloudinary...");
        const secure_url = await subirBase64Cloudinary(base64Image, "VirtualDesk_Wallpapers");

        // 4. GUARDAR EN BD
        await Estudiante.findByIdAndUpdate(userId, {
            "preferences.wallpaperUrl": secure_url
        });

        // 5. NOTIFICACIÓN REAL-TIME (SOCKET.IO)
        const io = req.app.get("io");
        if (io) {
            console.log(`📡 Enviando update a user:${userId}`);
            io.to(`user:${userId}`).emit("preferences-updated", { 
                theme: "light",
                wallpaperUrl: secure_url 
            });
        }

        return res.status(200).json({ 
            ok: true, 
            msg: "Fondo generado con éxito",
            url: secure_url 
        });

    } catch (error) {
        console.error("❌ Error generando wallpaper:", error); // Imprime el error completo para debug

        // Si el servidor gratuito está ocupado o "dormido" (Error 503 o 500 a veces)
        if (error.message && (error.message.includes("503") || error.message.includes("loading"))) {
             return res.status(503).json({ 
                ok: false, 
                msg: "La IA se está despertando 😴. Espera unos segundos e intenta de nuevo." 
            });
        }

        return res.status(500).json({ 
            ok: false, 
            msg: "Error al generar imagen IA", 
            error: error.message 
        });
    }
};

export { improveTextIA, chatWithMiDesk, generateWallpaperIA };