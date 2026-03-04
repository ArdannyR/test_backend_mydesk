
import { sendMailToRegister,sendMailToRecoveryPassword } from "../helpers/sendMail.js"
import Estudiante from "../models/estudiante.js"
import { crearTokenJWT } from "../middlewares/JWT.js"
import mongoose from "mongoose"
import Item from "../models/item.js";
import Recommendation from "../models/recomendaciones.js"
import fs from "fs";
import stripe from "../helpers/stripe.js";
import {subirArchivoCloudinary} from "../helpers/uploadCloudinary.js"
import Workspace from "../models/Workspace.js";

const registro = async (req,res)=>{

    try {
        //Paso 1
        const {email,password} = req.body
        //Paso 2
        if (Object.values(req.body).includes("")) return res.status(400).json({msg:"Lo sentimos, debes llenar todos los campos"})
        const verificarEmailBDD = await Estudiante.findOne({email})
        if(verificarEmailBDD) return res.status(400).json({msg:"Lo sentimos, el email ya se encuentra registrado"})
        //Paso 3
        const nuevoEstudiante = new Estudiante(req.body)
        nuevoEstudiante.password = await nuevoEstudiante.encryptPassword(password)
        const token = nuevoEstudiante.createToken()
        await sendMailToRegister(email,token)
        await nuevoEstudiante.save()
        //Paso 4
        res.status(200).json({msg:"Revisa tu correo electrónico para confirmar tu cuenta"})

    } catch (error) {
        res.status(500).json({ msg: `❌ Error en el servidor - ${error}` })
    }

}

const confirmarMail = async (req, res) => {
    //res.send("Cuenta Verificada")
 
        //Paso 1 verificar el token
        const { token } = req.params
        //Paso 2 verificar los datos
        const estudianteBDD = await Estudiante.findOne({ token })
        if (!estudianteBDD) return res.status(404).json({ msg: "Token inválido o cuenta ya confirmada" })
        //Paso 3
        estudianteBDD.token = null
        estudianteBDD.confirmMail = true
        await estudianteBDD.save()
        //Paso 4
        res.status(200).json({ msg: "Cuenta confirmada, ya puedes iniciar sesión" })

   
    }

    const recuperarPassword = async (req, res) => {

    try{
        //Paso 1
        const{email} = req.body
        //Paso2
        if (!email) return res.status(400).json({ msg: "Debes ingresar un correo electrónico" })
        const estudianteBDD = await Estudiante.findOne({ email })
        if (!estudianteBDD) return res.status(404).json({ msg: "El usuario no se encuentra registrado" })
        //Paso3
        const token = estudianteBDD.createToken()//ABC123
        estudianteBDD.token = token
        await estudianteBDD.save()
        //Correo 
        //Paso 4
        await sendMailToRecoveryPassword(email,token)
        res.status(200).json({msg: 'Revisa tu correo electrónico para restablecer tu cuenta'})
        
    }catch(error){


        res.status(500).json({ msg: `❌ Error en el servidor - ${error}` })
    }
}


    const comprobarTokenPassword = async (req, res) => {
        try{
            //Paso 1
            const{token} = req.params
            //Paso2
            const estudianteBDD = await Estudiante.findOne({token})
            if(estudianteBDD?.token !== token) return res.status(404).json({msg:"Lo sentimos, no se puede validar la cuenta"})
            //Paso3
            //estudianteBDD?.token = token
            //Paso4
            res.status(200).json({msg:"Token confirmado, ya puedes crear tu nuevo password"}) 
            
        }catch(error){
        res.status(500).json({ msg: `❌ Error en el servidor - ${error}` })
    }
}

    const crearNuevoPassword = async (req, res) => {

        try{
            //Paso 1
            const{token}=req.params
            const{password,confirmpassword}=req.body

            //Paso 2
            if (Object.values(req.body).includes("")) return res.status(404).json({msg:"Debes llenar todos los campos"})
            if(password !== confirmpassword) return res.status(404).json({msg:"Los passwords no coinciden"})
            const estudianteBDD = await Estudiante.findOne({token})
            if(!estudianteBDD) return res.status(404).json({msg:"No se puede validar la cuenta"})
            
            //Paso 3
            estudianteBDD.password = await estudianteBDD.encryptPassword(password)
            estudianteBDD.token = null
            await estudianteBDD.save()

            //Paso 4
            res.status(200).json({msg:"Felicitaciones, ya puedes iniciar sesión con tu nuevo password"}) 

        }catch(error){
        res.status(500).json({ msg: `❌ Error en el servidor - ${error}` })
    }
}

     const login = async (req, res) => {
        try{
            //Paso 1
            const {email,password} = req.body
            //Paso 2
            if (Object.values(req.body).includes("")) return res.status(404).json({msg:"Debes llenar todos los campos"})
            const estudianteBDD = await Estudiante.findOne({ email })
            if (!estudianteBDD) return res.status(404).json({ msg: "El usuario no se encuentra registrado" })

            if(!estudianteBDD.confirmMail) return res.status(403).json({ msg: "Debes verificar la cuenta antes de inciar sesión" })

            const verificarPassword = await estudianteBDD.matchPassword(password)
            if(!verificarPassword) return res.status(401).json({ msg: "El password no es correcto" })

            //Paso 3
            const{nombre,apellido,direccion,celular,_id,rol} = estudianteBDD
            const token = crearTokenJWT(estudianteBDD._id,estudianteBDD.rol)

            //Paso 4 
            res.status(200).json({
                token,
                nombre,
                apellido,
                direccion,
                celular,
                rol,
                _id,
                email:estudianteBDD.email

        })
        
     }catch(error){
        res.status(500).json({ msg: `❌ Error en el servidor - ${error}` })
     }

    }

    const perfil =(req,res)=>{
    const {token,confirmMail,createdAt,updatedAt,__v,...datosPerfil} = req.estudianteHeader
    res.status(200).json(datosPerfil)
    }

    const actualizarPassword = async (req,res)=>{
    try {
        const estudianteBDD = await Estudiante.findById(req.estudianteHeader._id)
        if(!estudianteBDD) return res.status(404).json({msg:`Lo sentimos, no existe el estudiante ${id}`})
        const verificarPassword = await estudianteBDD.matchPassword(req.body.passwordactual)
        if(!verificarPassword) return res.status(404).json({msg:"Lo sentimos, el password actual no es el correcto"})
        estudianteBDD.password = await estudianteBDD.encryptPassword(req.body.passwordnuevo)
        await estudianteBDD.save()
        res.status(200).json({msg:"Password actualizado correctamente"})
    } catch (error) {
        res.status(500).json({ msg: `❌ Error en el servidor - ${error}` })
    }
}

   const actualizarPerfil = async (req,res)=>{

    try {
        const {id} = req.params
        const {nombre,apellido,direccion,celular,email} = req.body
        if( !mongoose.Types.ObjectId.isValid(id) ) return res.status(400).json({msg:`ID inválido: ${id}`})
        const estudianteBDD = await Estudiante.findById(id)
        if(!estudianteBDD) return res.status(404).json({ msg: `No existe el estudiante con ID ${id}` })
        if (Object.values(req.body).includes("")) return res.status(400).json({msg:"Debes llenar todos los campos"})
        if (estudianteBDD.email !== email)
        {
            const emailExistente  = await Estudiante.findOne({email})
            if (emailExistente )
            {
                return res.status(404).json({msg:`El email ya se encuentra registrado`})  
            }
        }
        estudianteBDD.nombre = nombre ?? estudianteBDD.nombre
        estudianteBDD.apellido = apellido ?? estudianteBDD.apellido
        estudianteBDD.direccion = direccion ?? estudianteBDD.direccion
        estudianteBDD.celular = celular ?? estudianteBDD.celular
        estudianteBDD.email = email ?? estudianteBDD.email
        await estudianteBDD.save()
        res.status(200).json(estudianteBDD)
        
    } catch (error) {
        console.error(error)
        res.status(500).json({ msg: `❌ Error en el servidor - ${error}` })
    }
}

    /**
 * SB-B002 – GET /desktop
 * Devuelve los ítems raíz del usuario autenticado
 */
const getDesktop = async (req, res) => {
  try {
    const miId = req.estudianteHeader._id;
    let { remoteUserId, folderId, workspaceId } = req.query;

    console.log(`🔎 GetDesktop Params:`, req.query);

    // 🔴 1. MODO WORKSPACE (NUEVO BLOQUE PRIORITARIO)
    if (workspaceId && workspaceId !== "null" && workspaceId !== "undefined") {
        
        // A. Verificar Permisos (Seguridad)
        const workspace = await Workspace.findById(workspaceId);
        if (!workspace) return res.status(404).json({ ok: false, msg: "Workspace no encontrado" });

        const esMiembro = workspace.miembros.includes(miId);
        if (!esMiembro) return res.status(403).json({ ok: false, msg: "No tienes acceso a este espacio" });

        // B. Buscar Ítems del Workspace
        // Buscamos ítems que tengan este workspaceId Y respeten la carpeta (o raíz)
        const queryWS = { workspaceId: workspaceId };
        
        if (folderId && folderId !== "null") {
            queryWS.parentId = folderId;
        } else {
            queryWS.$or = [ { parentId: null }, { parentId: { $exists: false } } ];
        }

        const items = await Item.find(queryWS).lean();
        
        return res.status(200).json({ ok: true, items });
    }
    // 🔴 FIN BLOQUE WORKSPACE

    // 1. DEFINIR OBJETIVO (¿De quién son los archivos?)
    // Si hay un ID remoto válido y no soy yo, activo modo remoto.
    const esModoRemoto = remoteUserId && 
                         remoteUserId !== "undefined" && 
                         remoteUserId !== "null" && 
                         String(remoteUserId) !== String(miId);

    const targetUserId = esModoRemoto ? remoteUserId : miId;

    console.log(`🔎 GetDesktop | Solicitante: ${miId} | Objetivo: ${targetUserId} | Carpeta: ${folderId || 'RAIZ'}`);

    // 2. SEGURIDAD (Solo si es modo remoto)
    if (esModoRemoto) {
        const yo = await Estudiante.findById(miId);
        // Verificamos si tengo el ID del objetivo en mis guardados
        const tienePermiso = yo.escritoriosGuardados.some(id => String(id) === String(targetUserId));

        if (!tienePermiso) {
            console.log("⛔ Acceso denegado a escritorio remoto");
            return res.status(403).json({ ok: false, msg: "No tienes permiso para ver este escritorio." });
        }
    }

    // 3. PREPARAR CONSULTA
    const query = { userId: targetUserId };

    // Filtro por Carpeta o Raíz
    if (folderId && folderId !== "null" && folderId !== "undefined") {
        query.parentId = folderId;
    } else {
        // Raíz: Items sin padre
        query.$or = [ { parentId: null }, { parentId: { $exists: false } } ];
    }

    let items = [];

    // 4. EJECUTAR CONSULTA ÚNICA
    // Si es MI escritorio raíz, traigo mis items + los que me compartieron
    if (!esModoRemoto && (!folderId || folderId === "null" || folderId === "undefined")) {
        items = await Item.find({
            $or: [
                query, // Mis items raíz
                { "sharedWith.userId": miId } // Items que OTROS compartieron CONMIGO (archivos sueltos)
            ]
        }).lean();
    } else {
        // Si es remoto O estoy dentro de una carpeta, traigo solo lo que cumple la query estricta
        items = await Item.find(query).lean();
    }

    console.log(`✅ Ítems encontrados: ${items.length}`);

    // 5. AJUSTE DE POSICIONES (Si tienes lógica de guestPositions)
    // (Opcional: Si quieres mantener posiciones personalizadas para invitados)
    if (items.length > 0) {
        items = items.map(item => {
            // Si el ítem tiene posiciones de invitados guardadas y yo soy un invitado...
            if (String(item.userId) !== String(miId) && item.guestPositions) {
                const myPos = item.guestPositions.find(gp => String(gp.userId) === String(miId));
                if (myPos) {
                    item.position = { x: myPos.x, y: myPos.y };
                }
            }
            return item;
        });
    }



    // Obtenemos las preferencias del DUEÑO del escritorio (targetUserId)
    const ownerSettings = await Estudiante.findById(targetUserId).select('preferences');

    return res.status(200).json({ 
        ok: true, 
        items,
        preferences: ownerSettings?.preferences // 👈 Enviamos esto al frontend
    });


  } catch (error) {
    console.error("❌ Error en getDesktop:", error);
    return res.status(500).json({ ok: false, msg: error.message });
  }
};

/**
 * SB-B003 – POST /items
 * Crea un nuevo ítem asociado al usuario autenticado
 */
const createItem = async (req, res) => {
  try {
    const userId = req.estudianteHeader._id;
    const { type, name, url, parentId, x, y, workspaceId } = req.body;

    console.log("👉 createItem userId:", userId);
    console.log("👉 createItem body:", req.body);
    console.log("📂 Parent ID recibido:", parentId);

    if (!type || !name)
      return res.status(400).json({ ok: false, msg: "Tipo y nombre son obligatorios" });

    if (type === "link" && !url)
      return res.status(400).json({ ok: false, msg: "La URL es obligatoria para enlaces" });

    const newItem = new Item({
      userId,
      type,
      name,
      url: url || null,
      parentId: (parentId && parentId !== "null") ? parentId : null,
      position: { x: x ?? 100, y: y ?? 100 },
      workspaceId: (workspaceId && workspaceId !== "null") ? workspaceId : null
    });

    await newItem.save();

    // ✅ SOCKET.IO EVENT
    const io = req.app.get("io");
    if (io) {

      if (workspaceId) {
          // Si es workspace, avisar a la sala del workspace
          io.to(`workspace:${workspaceId}`).emit("item-created", newItem);
      } else {
          // Si es personal, avisar al usuario
          io.to(`user:${userId}`).emit("item-created", newItem);
      }

      io.to(`user:${userId}`).emit("item-created", newItem);

      // Si este item tiene compartidos (en el futuro)
      if (newItem.sharedWith && newItem.sharedWith.length > 0) {
        newItem.sharedWith.forEach(s => {
          io.to(`user:${s.userId}`).emit("item-created", newItem);
        });
      }
    }

    return res.status(201).json({
      ok: true,
      msg: "Ítem creado exitosamente",
      item: newItem
    });

  } catch (error) {
    console.error("❌ Error en createItem:", error);
    return res.status(500).json({ ok: false, msg: `Error en el servidor - ${error}` });
  }
};



const renombrarItem=async(req,res)=>{
  try{
    const userId=req.estudianteHeader._id;
    const {id}=req.params;
    const {name}=req.body;

    console.log("✅ ENTRO renombrarItem", {id:String(id), userId:String(userId), name});

    if(!name||!String(name).trim()){
      return res.status(400).json({ok:false,msg:"El nombre es obligatorio"});
    }

    const item=await Item.findOneAndUpdate(
      {_id:id,userId},
      {name:String(name).trim()},
      {new:true}
    );

    if(!item){
      console.log("❌ renombrarItem: item no encontrado o no pertenece");
      return res.status(404).json({ok:false,msg:"Ítem no encontrado o no pertenece al usuario"});
    }

    const io=req.app.get("io");
    console.log("🔎 io existe?:", Boolean(io));

    if(io){
      const payload={id:item._id,name:item.name,parentId:item.parentId,position:item.position,type:item.type};
      console.log("📢 EMIT item-renamed to", `user:${String(userId)}`, payload);

      io.to(`user:${userId}`).emit("item-renamed",payload);

      if(item.sharedWith?.length){
        item.sharedWith.forEach(s=>io.to(`user:${s.userId}`).emit("item-renamed",payload));
      }
    }

    return res.status(200).json({ok:true,msg:"Ítem renombrado correctamente",item});
  }catch(error){
    console.error("❌ renombrarItem:",error);
    return res.status(500).json({ok:false,msg:`Error en el servidor - ${error.message}`});
  }
};



const moverItem = async(req, res) => {
  try {
    const userId = req.estudianteHeader._id; // Quién mueve
    const { id } = req.params;
    const { x, y } = req.body;

    if (x === undefined && y === undefined) {
      return res.status(400).json({ ok: false, msg: "Faltan coordenadas" });
    }

    // Buscamos el ítem (sin filtrar por userId aun, para ver de quién es)
    const item = await Item.findById(id);
    if (!item) return res.status(404).json({ ok: false, msg: "Ítem no encontrado" });

    // VERIFICACIÓN DE PROPIEDAD
    const isOwner = String(item.userId) === String(userId);
    const isShared = item.sharedWith.some(s => String(s.userId) === String(userId));

    if (!isOwner && !isShared) {
      return res.status(403).json({ ok: false, msg: "No tienes permiso para mover esto" });
    }

    // LÓGICA DE MOVIMIENTO INDEPENDIENTE
    if (isOwner) {
      // Si soy el dueño, actualizo la posición principal
      if (x !== undefined) item.position.x = Number(x);
      if (y !== undefined) item.position.y = Number(y);
    } else {
      // Si soy invitado, busco si ya tengo una posición guardada
      const guestPosIndex = item.guestPositions.findIndex(
        gp => String(gp.userId) === String(userId)
      );

      if (guestPosIndex >= 0) {
        // Actualizo existente
        if (x !== undefined) item.guestPositions[guestPosIndex].x = Number(x);
        if (y !== undefined) item.guestPositions[guestPosIndex].y = Number(y);
      } else {
        // Creo nueva entrada
        item.guestPositions.push({
          userId,
          x: Number(x ?? item.position.x),
          y: Number(y ?? item.position.y)
        });
      }
    }

    await item.save();

    // SOCKETS: Notificar SOLO al usuario que movió (para no afectar al otro)
    // El frontend ya hace actualización optimista, pero esto confirma.
    // NOTA: Ya no emitimos a la sala global del dueño para evitar que se mueva en su pantalla.
    
    return res.status(200).json({ ok: true, msg: "Ítem movido correctamente" });

  } catch (error) {
    console.error("❌ moverItem:", error);
    return res.status(500).json({ ok: false, msg: error.message });
  }
};

/**
 * SB-B-007 
 */
const actulizarContenidoTextual = async (req, res) => {
  try {
    const userId = req.estudianteHeader._id;
    const { id } = req.params;
    const { content } = req.body;

    if (!content) return res.status(400).json({ msg: "El contenido es obligatorio" });

    // BUSCAMOS: Que sea mío O que me lo hayan compartido con permiso 'edit'
    const file = await Item.findOne({
        _id: id,
        type: { $in: ["note", "code"] },
        $or: [
            { userId: userId }, // Soy el dueño
            { "sharedWith": { $elemMatch: { userId: userId, permission: "edit" } } } // Soy editor
        ]
    });

    if (!file) return res.status(404).json({msg: "Archivo no encontrado o no tienes permiso de edición"});

    file.content = content;
    await file.save();

    // SOCKET: Avisar a la sala del DUEÑO del archivo (para que él lo vea en vivo)
    const io = req.app.get("io");
    if(io) {
        // Emitimos a la sala del dueño del archivo
        io.to(`user:${file.userId}`).emit("file-change", { fileId: id, content });
    }

    res.status(200).json({ok: true, msg: "Contenido guardado correctamente"});
  } catch (error) {
    console.error(error);
    res.status(500).json({ msg: "Error guardando contenido" });
  }
};

const deleteItem = async (req, res) => {
  try {
    const userId = req.estudianteHeader._id;
    const { id } = req.params;

    console.log("🧨 deleteItem id:", id, "userId:", userId);

    const root = await Item.findOne({ _id: id, userId }).lean();
    if (!root) return res.status(404).json({ ok:false, msg:"No existe este ítem o no pertenece al usuario" });

    // ✅ Recolectar IDs a borrar (BFS) evitando ciclos
    const toDelete = new Set([String(id)]);
    const queue = [id];
    let guard = 0;

    while (queue.length) {
      guard++;
      if (guard > 5000) {
        return res.status(400).json({ ok:false, msg:"Árbol demasiado grande o ciclo detectado" });
      }

      const parentId = queue.shift();

      const children = await Item.find({ parentId, userId }).select("_id").lean();
      for (const ch of children) {
        const chId = String(ch._id);
        if (!toDelete.has(chId)) {
          toDelete.add(chId);
          queue.push(ch._id);
        }
      }
    }

    const idsArray = Array.from(toDelete);
    console.log("🧨 Total a borrar:", idsArray.length);

    await Item.deleteMany({ _id: { $in: idsArray }, userId });

    // ✅ SOCKET.IO EVENT
    const io=req.app.get("io");
    if(io){
      io.to(`user:${userId}`).emit("item-deleted",{id,deleted:idsArray.length,ids:idsArray});
      // Si este item tenía compartidos (en el futuro), notifica a invitados
      if(root.sharedWith&&root.sharedWith.length>0){
        root.sharedWith.forEach(s=>{
          io.to(`user:${s.userId}`).emit("item-deleted",{id,deleted:idsArray.length,ids:idsArray});
        });
      }
    }

    return res.status(200).json({ ok:true, msg:"Ítem eliminado correctamente", deleted: idsArray.length });
  } catch (error) {
    console.error("❌ deleteItem:", error);
    return res.status(500).json({ ok:false, msg:`Error en el servidor - ${error.message}` });
  }
};

/**
 * SB-B-009
 * npm i node-cron
 */
const obetenerRecomendaciones = async (req, res) => {
  try {
    const userId = req.estudianteHeader._id;

    const recs = await Recommendation
      .find({ userId })
      .sort({ createdAt: -1 })
      .limit(30)
      .lean();

    return res.status(200).json({ ok: true, recommendations: recs });
  } catch (error) {
    console.error("❌ getRecommendations:", error);
    return res.status(500).json({ ok: false, msg: "Error en el servidor" });
  }
};

const shareItem = async (req,res)=>{
  try{
    const ownerId=req.estudianteHeader._id;
    const {id}=req.params;
    const {email,permission}=req.body;

    if(!email) return res.status(400).json({msg:"Email requerido"});
    if(!["read","edit"].includes(permission))
      return res.status(400).json({msg:"Permiso inválido (read/edit)"});

    const item=await Item.findOne({_id:id,userId:ownerId});
    if(!item)
      return res.status(403).json({msg:"No puedes compartir este ítem (no eres propietario)"});

    const invitedUser=await Estudiante.findOne({email});
    if(!invitedUser)
      return res.status(404).json({msg:"Usuario invitado no existe"});

    if(String(invitedUser._id)===String(ownerId))
      return res.status(400).json({msg:"No puedes compartir contigo mismo"});

    const index=item.sharedWith.findIndex(
      s=>String(s.userId)===String(invitedUser._id)
    );

    if(index>=0){
      item.sharedWith[index].permission=permission;
    }else{
      item.sharedWith.push({userId:invitedUser._id,permission});
    }

    await item.save();

    // --- NOTIFICACIÓN REAL-TIME (SOCKET) ---
    const io = req.app.get("io");
    if(io) {
        // Le avisamos al usuario invitado que tiene un nuevo ítem
        io.to(`user:${invitedUser._id}`).emit("item-shared", item);
    }

    return res.status(200).json({
      ok:true,
      msg:"Ítem compartido correctamente",
      sharedWith:item.sharedWith
    });
  }catch(error){
    console.error("❌ shareItem:",error);
    return res.status(500).json({msg:"Error en el servidor"});
  }
};

const actuPreferencias=async(req,res)=>{
  try{
    const userId=req.estudianteHeader._id;
    const {theme, wallpaperUrl}=req.body;
    

    if(theme&&!["light","dark"].includes(theme)){
      return res.status(400).json({ok:false,msg:"theme inválido (light/dark)"});
    }

    const estudiante=await Estudiante.findById(userId);
    if(!estudiante) return res.status(404).json({ok:false,msg:"Usuario no encontrado"});

    if (theme) estudiante.preferences.theme=theme;
    if (wallpaperUrl !== undefined) {
        estudiante.preferences.wallpaperUrl = wallpaperUrl;
    }

    await estudiante.save();

    const io=req.app.get("io");
    if (io) io.to(`user:${userId}`).emit("preferences-updated", { 
        theme: estudiante.preferences.theme,
        wallpaperUrl: estudiante.preferences.wallpaperUrl 
    });

    return res.status(200).json({ok:true,msg:"Preferencias actualizadas",preferences:estudiante.preferences});
  }catch(error){
    console.error("❌ updatePreferences:",error);
    return res.status(500).json({ok:false,msg:`Error en el servidor - ${error.message}`});
  }
};

const actualizarImagen = async (req, res) => {
  try {
    const userId = req.estudianteHeader._id;

    // ✅ validar archivo en campo "image"
    if (!req.files || !req.files.image) {
      return res.status(400).json({
        ok: false,
        msg: "Debes enviar un archivo en el campo 'image'",
      });
    }

    const file = req.files.image;

    // ✅ express-fileupload con useTempFiles:true genera tempFilePath
    if (!file.tempFilePath) {
      return res.status(400).json({
        ok: false,
        msg: "tempFilePath no existe. Revisa express-fileupload (useTempFiles:true)",
      });
    }

    // ✅ subir a Cloudinary
    const { secure_url, public_id } = await subirArchivoCloudinary(file.tempFilePath, "VirtualDesk");

    // ✅ guardar en BD (aunque no exista preferences)
    const estudiante = await Estudiante.findByIdAndUpdate(
      userId,
      { $set: { "preferences.wallpaperUrl": secure_url } },
      { new: true }
    );

    return res.status(200).json({
      ok: true,
      msg: "Imagen subida correctamente",
      wallpaperUrl: secure_url,
      publicId: public_id,
      preferences: estudiante?.preferences || { wallpaperUrl: secure_url },
    });
  } catch (error) {
    console.error("❌ subirImagen:", error);
    return res.status(500).json({
      ok: false,
      msg: "Error en el servidor",
      error: error?.message || String(error),
    });
  }
};

const crearPago = async (req, res) => {
  try {
  const { amount } = req.body;
    if (!amount) {return res.status(400).json({ok:false,msg:"Debes enviar el monto"});
    }
    const paymentIntent = await stripe.paymentIntents.create({
      amount: amount * 100,
      currency: "usd",
      automatic_payment_methods: { enabled: true },
    });

    return res.status(200).json({ok:true,clientSecret: paymentIntent.client_secret});
  } catch (error) {
    console.error("❌ Error Stripe:", error); return res.status(500).json({ok:false, msg:"Error creando el pago"});
  }
};


// A. FUNCIÓN PARA COMPARTIR MI ESCRITORIO (Dar permiso)
// src/controllers/estudiante-controller.js

// ...

const compartirEscritorio = async (req, res) => {
    try {
        const ownerId = req.estudianteHeader._id; // TU ID (El que comparte)
        const { email } = req.body; // El correo de a QUIÉN invitas

        if (!email) return res.status(400).json({ msg: "Debes ingresar un correo." });

        // 1. Buscar al usuario invitado
        const invitado = await Estudiante.findOne({ email });
        if (!invitado) return res.status(404).json({ msg: "Usuario no encontrado con ese correo." });

        // 2. Evitar compartir contigo mismo
        if (String(invitado._id) === String(ownerId)) {
            return res.status(400).json({ msg: "No puedes compartir el escritorio contigo mismo." });
        }

        // 3. Verificar si YA tiene acceso (Evitar duplicados)
        if (invitado.escritoriosGuardados.includes(ownerId)) {
            return res.status(200).json({ 
                ok: true, 
                msg: "El usuario ya tiene acceso a tu escritorio." // Mensaje amigable
            });
        }

        // 4. Guardar TU ID en SU lista
        invitado.escritoriosGuardados.push(ownerId);
        await invitado.save();

        // Opcional: Podrías enviar un email aquí avisándole
        
        return res.status(200).json({ 
            ok: true, 
            msg: `Acceso concedido a ${invitado.nombre} ${invitado.apellido}` 
        });

    } catch (error) {
        console.error(error);
        return res.status(500).json({ msg: "Error al compartir escritorio" });
    }
};

// B. FUNCIÓN PARA OBTENER EL DASHBOARD (Mis datos + Escritorios guardados)
const getDashboardData = async (req, res) => {
    try {
        const userId = req.estudianteHeader._id;
        
        // 1. Datos del Usuario y sus escritorios guardados (Espejo)
        const usuario = await Estudiante.findById(userId)
            .populate('escritoriosGuardados', 'nombre apellido email')
            .select('-password -token -confirmMail');

        if (!usuario) return res.status(404).json({ msg: "Usuario no encontrado" });

        // 2. 👇 NUEVO: Buscar Workspaces donde soy miembro 👇
        const workspaces = await Workspace.find({ 
            miembros: userId 
        }).select('nombre dueño miembros createdAt');

        return res.status(200).json({ 
            ok: true, 
            usuario,     // Datos personales + Accesos Remotos
            workspaces   // 👇 Nueva lista de Salas Comunes
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ msg: "Error al obtener datos del dashboard" });
    }
};

const getItemById = async (req, res) => {
    try {
        const { id } = req.params;
        const item = await Item.findById(id);
        if (!item) return res.status(404).json({ ok: false, msg: "Ítem no encontrado" });
        return res.status(200).json({ ok: true, item });
    } catch (error) {
        return res.status(500).json({ ok: false, msg: error.message });
    }
};

const actualizarPosicionesMasivas = async (req, res) => {
    try {
        const userId = req.estudianteHeader._id;
        const { items } = req.body; // Esperamos un array: [{ id: "...", x: 10, y: 20 }, ...]

        if (!items || !Array.isArray(items)) {
            return res.status(400).json({ ok: false, msg: "Formato de datos incorrecto" });
        }

        // Usamos bulkWrite para optimizar (una sola operación en DB en lugar de muchas)
        const operaciones = items.map(item => ({
            updateOne: {
                filter: { _id: item.id, userId }, // Solo actualiza si pertenece al usuario
                update: { $set: { "position.x": item.x, "position.y": item.y } }
            }
        }));

        if (operaciones.length > 0) {
            await Item.bulkWrite(operaciones);
        }

        return res.status(200).json({ ok: true, msg: "Escritorio organizado guardado" });

    } catch (error) {
        console.error("❌ Error guardado masivo:", error);
        return res.status(500).json({ ok: false, msg: error.message });
    }
};

const createWorkspace = async (req, res) => {
    try {
        const userId = req.estudianteHeader._id;
        const { nombre } = req.body;

        if (!nombre) return res.status(400).json({ ok: false, msg: "El nombre es obligatorio" });

        const nuevoWorkspace = new Workspace({
            nombre,
            dueño: userId,
            miembros: [userId] // El creador es el primer miembro
        });

        await nuevoWorkspace.save();

        return res.status(201).json({ 
            ok: true, 
            msg: "Espacio de trabajo creado", 
            workspace: nuevoWorkspace 
        });

    } catch (error) {
        console.error(error);
        return res.status(500).json({ ok: false, msg: "Error al crear workspace" });
    }
};

const agregarMiembroWorkspace = async (req, res) => {
    try {
        const { workspaceId, email } = req.body;

        if (!workspaceId || !email) {
            return res.status(400).json({ ok: false, msg: "Faltan datos" });
        }

        // 1. Buscar el usuario a invitar
        const usuarioInvitado = await Estudiante.findOne({ email });
        if (!usuarioInvitado) {
            return res.status(404).json({ ok: false, msg: "Usuario no encontrado" });
        }

        // 2. Buscar el workspace
        const workspace = await Workspace.findById(workspaceId);
        if (!workspace) {
            return res.status(404).json({ ok: false, msg: "Workspace no encontrado" });
        }

        // 3. Verificar si ya es miembro
        if (workspace.miembros.includes(usuarioInvitado._id)) {
            return res.status(400).json({ ok: false, msg: "El usuario ya es miembro" });
        }

        // 4. Agregar y guardar
        workspace.miembros.push(usuarioInvitado._id);
        await workspace.save();

        return res.status(200).json({ 
            ok: true, 
            msg: `Se añadió a ${usuarioInvitado.nombre} al equipo.` 
        });

    } catch (error) {
        console.error(error);
        return res.status(500).json({ ok: false, msg: "Error al invitar miembro" });
    }
};

const uploadFileItem = async (req, res) => {
    try {
        const userId = req.estudianteHeader._id;
        // Obtenemos datos del body (posición, carpeta padre, etc.)
        const { parentId, x, y, workspaceId } = req.body;

        // 1. Validar si viene un archivo
        if (!req.files || !req.files.archivo) {
            return res.status(400).json({ ok: false, msg: "No se ha seleccionado ningún archivo." });
        }

        const file = req.files.archivo;
        
        // 2. Subir a Cloudinary (Admite PDF, DOCX, MP3, etc.)
        // Usamos tempFilePath gracias a express-fileupload
        console.log(`📤 Subiendo archivo: ${file.name}`);
        const cloudData = await subirArchivoCloudinary(file.tempFilePath, "VirtualDesk_Docs");

        // 3. Crear el Ítem en Base de Datos
        const newItem = new Item({
            userId,
            type: "file", // Tipo fijo
            name: file.name, // Nombre original del archivo
            url: cloudData.secure_url, // URL que devuelve Cloudinary
            fileFormat: cloudData.format || file.name.split('.').pop(), // Guardamos el formato
            publicId: cloudData.public_id, // Para poder borrarlo de Cloudinary luego
            parentId: (parentId && parentId !== "null") ? parentId : null,
            position: { x: Number(x) || 100, y: Number(y) || 100 },
            workspaceId: (workspaceId && workspaceId !== "null") ? workspaceId : null
        });

        await newItem.save();

        // 4. Notificar vía Socket.io (para que aparezca en tiempo real)
        const io = req.app.get("io");
        if (io) {
            if (workspaceId) {
                io.to(`workspace:${workspaceId}`).emit("item-created", newItem);
            } else {
                io.to(`user:${userId}`).emit("item-created", newItem);
            }
        }

        return res.status(201).json({
            ok: true,
            msg: "Archivo subido exitosamente",
            item: newItem
        });

    } catch (error) {
        console.error("❌ Error subiendo archivo:", error);
        return res.status(500).json({ ok: false, msg: "Error al subir el archivo" });
    }
};

export {
    registro,
    confirmarMail,
    recuperarPassword,
    comprobarTokenPassword,
    crearNuevoPassword,
    login,
    perfil,
    actualizarPassword,
    actualizarPerfil,
    getDesktop,
    createItem,
    deleteItem,
    renombrarItem,
    moverItem,
    actulizarContenidoTextual,
    obetenerRecomendaciones,
    shareItem,
    actuPreferencias,
    actualizarImagen,
    compartirEscritorio,
    getDashboardData,
    crearPago,
    getItemById,
    actualizarPosicionesMasivas,
    createWorkspace,
    agregarMiembroWorkspace,
    uploadFileItem
}


