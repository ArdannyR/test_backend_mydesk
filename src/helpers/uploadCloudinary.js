import { v2 as cloudinary } from "cloudinary";
import fs from "fs-extra";
import dotenv from "dotenv";
dotenv.config();

// Configuraciones de Cloudinary
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

// Función para subir imágenes normales (desde archivos temporales)
const subirArchivoCloudinary = async (filePath, folder = "VirtualDesk_Files") => {
    try {
        const result = await cloudinary.uploader.upload(filePath, { 
            folder: folder,
            resource_type: "auto", // 👈 ¡ESTA ES LA CLAVE! Detecta automáticamente el tipo
            use_filename: true,
            unique_filename: true
        });

        // Borramos el archivo temporal del servidor
        await fs.unlink(filePath);
        
        return { 
            secure_url: result.secure_url, 
            public_id: result.public_id,
            format: result.format,      // ej: "pdf", "mp3"
            resource_type: result.resource_type // "image", "video" (mp3 cae aquí), "raw" (docs)
        };

    } catch (error) {
        // Aseguramos borrar el temporal incluso si falla para no llenar el servidor
        await fs.unlink(filePath).catch(() => {}); 
        throw error;
    }
};

// Función para subir imágenes de ia
const subirBase64Cloudinary = async (base64, folder = "VirtualDesk_AI") => {
    // Limpiamos el header del base64 (data:image/png;base64,...)
    const buffer = Buffer.from(base64.replace(/^data:image\/\w+;base64,/, ''), 'base64');
    
    const { secure_url } = await new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream({ 
            folder, 
            resource_type: 'auto' 
        }, (err, res) => {
            if (err) reject(err);
            else resolve(res);
        });
        stream.end(buffer);
    });
    return secure_url;
};

export { subirArchivoCloudinary, subirBase64Cloudinary };