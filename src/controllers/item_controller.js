import Item from "../models/item.js";
import User from "../models/User.js"; 
import Workspace from "../models/Workspace.js";
import { uploadFileToCloudinary } from "../helpers/cloudinary.js"; 

export const getDesktop = async (req, res) => {
    try {
        const myId = req.user._id; // 💡 Actualizado
        let { remoteUserId, folderId, workspaceId } = req.query;

        if (workspaceId && workspaceId !== "null" && workspaceId !== "undefined") {
            const workspace = await Workspace.findById(workspaceId);
            if (!workspace) return res.status(404).json({ ok: false, msg: "Workspace no encontrado" });

            const isMember = workspace.members.includes(myId);
            if (!isMember) return res.status(403).json({ ok: false, msg: "No tienes acceso a este espacio" });

            const queryWS = { workspaceId: workspaceId };
            if (folderId && folderId !== "null") {
                queryWS.parentId = folderId;
            } else {
                queryWS.$or = [{ parentId: null }, { parentId: { $exists: false } }];
            }

            const items = await Item.find(queryWS).lean();
            return res.status(200).json({ ok: true, items });
        }

        const isRemoteMode = remoteUserId && remoteUserId !== "undefined" && remoteUserId !== "null" && String(remoteUserId) !== String(myId);
        const targetUserId = isRemoteMode ? remoteUserId : myId;

        if (isRemoteMode) {
            const me = await User.findById(myId);
            const hasPermission = me.savedDesktops.some(id => String(id) === String(targetUserId));

            if (!hasPermission) {
                return res.status(403).json({ ok: false, msg: "No tienes permiso para ver este escritorio." });
            }
        }

        const query = { userId: targetUserId };
        if (folderId && folderId !== "null" && folderId !== "undefined") {
            query.parentId = folderId;
        } else {
            query.$or = [{ parentId: null }, { parentId: { $exists: false } }];
        }

        let items = [];
        if (!isRemoteMode && (!folderId || folderId === "null" || folderId === "undefined")) {
            items = await Item.find({
                $or: [
                    query, 
                    { "sharedWith.userId": myId } 
                ]
            }).lean();
        } else {
            items = await Item.find(query).lean();
        }

        if (items.length > 0) {
            items = items.map(item => {
                if (String(item.userId) !== String(myId) && item.guestPositions) {
                    const myPos = item.guestPositions.find(gp => String(gp.userId) === String(myId));
                    if (myPos) item.position = { x: myPos.x, y: myPos.y };
                }
                return item;
            });
        }

        const ownerSettings = await User.findById(targetUserId).select('preferences');

        return res.status(200).json({ 
            ok: true, 
            items,
            preferences: ownerSettings?.preferences 
        });

    } catch (error) {
        console.error("❌ Error en getDesktop:", error);
        return res.status(500).json({ ok: false, msg: error.message });
    }
};

export const createItem = async (req, res) => {
    try {
        const userId = req.user._id; // 💡 Actualizado
        const { type, name, url, parentId, x, y, workspaceId } = req.body;

        if (!type || !name) return res.status(400).json({ ok: false, msg: "Tipo y nombre son obligatorios" });
        if (type === "link" && !url) return res.status(400).json({ ok: false, msg: "La URL es obligatoria para enlaces" });

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

        const io = req.app.get("io");
        if (io) {
            if (workspaceId) {
                io.to(`workspace:${workspaceId}`).emit("item-created", newItem);
            } else {
                io.to(`user:${userId}`).emit("item-created", newItem);
            }
            if (newItem.sharedWith && newItem.sharedWith.length > 0) {
                newItem.sharedWith.forEach(s => io.to(`user:${s.userId}`).emit("item-created", newItem));
            }
        }

        return res.status(201).json({ ok: true, msg: "Ítem creado exitosamente", item: newItem });
    } catch (error) {
        return res.status(500).json({ ok: false, msg: `Error en el servidor - ${error}` });
    }
};

export const uploadFileItem = async (req, res) => {
    try {
        const userId = req.user._id; // 💡 Actualizado
        const { parentId, x, y, workspaceId } = req.body;

        if (!req.files || !req.files.archivo) {
            return res.status(400).json({ ok: false, msg: "No se ha seleccionado ningún archivo." });
        }

        const file = req.files.archivo;
        
        // 💡 Usando el nuevo helper de Cloudinary
        const cloudData = await uploadFileToCloudinary(file.tempFilePath, "VirtualDesk_Docs");

        const newItem = new Item({
            userId,
            type: "file",
            name: file.name,
            url: cloudData.secure_url,
            fileFormat: cloudData.format || file.name.split('.').pop(),
            publicId: cloudData.public_id,
            parentId: (parentId && parentId !== "null") ? parentId : null,
            position: { x: Number(x) || 100, y: Number(y) || 100 },
            workspaceId: (workspaceId && workspaceId !== "null") ? workspaceId : null
        });

        await newItem.save();

        const io = req.app.get("io");
        if (io) {
            if (workspaceId) io.to(`workspace:${workspaceId}`).emit("item-created", newItem);
            else io.to(`user:${userId}`).emit("item-created", newItem);
        }

        return res.status(201).json({ ok: true, msg: "Archivo subido exitosamente", item: newItem });
    } catch (error) {
        return res.status(500).json({ ok: false, msg: "Error al subir el archivo" });
    }
};

export const getItemById = async (req, res) => {
    try {
        const { id } = req.params;
        const item = await Item.findById(id);
        if (!item) return res.status(404).json({ ok: false, msg: "Ítem no encontrado" });
        return res.status(200).json({ ok: true, item });
    } catch (error) {
        return res.status(500).json({ ok: false, msg: error.message });
    }
};

export const renameItem = async (req, res) => {
    try {
        const userId = req.user._id; // 💡 Actualizado
        const { id } = req.params;
        const { name } = req.body;

        if (!name || !String(name).trim()) return res.status(400).json({ ok: false, msg: "El nombre es obligatorio" });

        const item = await Item.findOneAndUpdate(
            { _id: id, userId },
            { name: String(name).trim() },
            { new: true }
        );

        if (!item) return res.status(404).json({ ok: false, msg: "Ítem no encontrado o no pertenece al usuario" });

        const io = req.app.get("io");
        if (io) {
            const payload = { id: item._id, name: item.name, parentId: item.parentId, position: item.position, type: item.type };
            io.to(`user:${userId}`).emit("item-renamed", payload);
            if (item.sharedWith?.length) {
                item.sharedWith.forEach(s => io.to(`user:${s.userId}`).emit("item-renamed", payload));
            }
        }

        return res.status(200).json({ ok: true, msg: "Ítem renombrado correctamente", item });
    } catch (error) {
        return res.status(500).json({ ok: false, msg: `Error en el servidor - ${error.message}` });
    }
};

export const moveItem = async (req, res) => {
    try {
        const userId = req.user._id; // 💡 Actualizado
        const { id } = req.params;
        const { x, y } = req.body;

        if (x === undefined && y === undefined) return res.status(400).json({ ok: false, msg: "Faltan coordenadas" });

        const item = await Item.findById(id);
        if (!item) return res.status(404).json({ ok: false, msg: "Ítem no encontrado" });

        const isOwner = String(item.userId) === String(userId);
        const isShared = item.sharedWith.some(s => String(s.userId) === String(userId));

        if (!isOwner && !isShared) return res.status(403).json({ ok: false, msg: "No tienes permiso para mover esto" });

        if (isOwner) {
            if (x !== undefined) item.position.x = Number(x);
            if (y !== undefined) item.position.y = Number(y);
        } else {
            const guestPosIndex = item.guestPositions.findIndex(gp => String(gp.userId) === String(userId));
            if (guestPosIndex >= 0) {
                if (x !== undefined) item.guestPositions[guestPosIndex].x = Number(x);
                if (y !== undefined) item.guestPositions[guestPosIndex].y = Number(y);
            } else {
                item.guestPositions.push({ userId, x: Number(x ?? item.position.x), y: Number(y ?? item.position.y) });
            }
        }

        await item.save();
        return res.status(200).json({ ok: true, msg: "Ítem movido correctamente" });
    } catch (error) {
        return res.status(500).json({ ok: false, msg: error.message });
    }
};

export const updateBulkPositions = async (req, res) => {
    try {
        const userId = req.user._id; // 💡 Actualizado
        const { items } = req.body; 

        if (!items || !Array.isArray(items)) return res.status(400).json({ ok: false, msg: "Formato de datos incorrecto" });

        const operations = items.map(item => ({
            updateOne: {
                filter: { _id: item.id, userId },
                update: { $set: { "position.x": item.x, "position.y": item.y } }
            }
        }));

        if (operations.length > 0) await Item.bulkWrite(operations);

        return res.status(200).json({ ok: true, msg: "Escritorio organizado guardado" });
    } catch (error) {
        return res.status(500).json({ ok: false, msg: error.message });
    }
};

export const updateTextContent = async (req, res) => {
    try {
        const userId = req.user._id; // 💡 Actualizado
        const { id } = req.params;
        const { content } = req.body;

        if (!content) return res.status(400).json({ msg: "El contenido es obligatorio" });

        const file = await Item.findOne({
            _id: id,
            type: { $in: ["note", "code"] },
            $or: [{ userId: userId }, { "sharedWith": { $elemMatch: { userId: userId, permission: "edit" } } }]
        });

        if (!file) return res.status(404).json({ msg: "Archivo no encontrado o no tienes permiso de edición" });

        file.content = content;
        await file.save();

        const io = req.app.get("io");
        if (io) io.to(`user:${file.userId}`).emit("file-change", { fileId: id, content });

        res.status(200).json({ ok: true, msg: "Contenido guardado correctamente" });
    } catch (error) {
        res.status(500).json({ msg: "Error guardando contenido" });
    }
};

export const deleteItem = async (req, res) => {
    try {
        const userId = req.user._id; // 💡 Actualizado
        const { id } = req.params;

        const root = await Item.findOne({ _id: id, userId }).lean();
        if (!root) return res.status(404).json({ ok: false, msg: "No existe este ítem o no pertenece al usuario" });

        const toDelete = new Set([String(id)]);
        const queue = [id];
        let guard = 0;

        while (queue.length) {
            guard++;
            if (guard > 5000) return res.status(400).json({ ok: false, msg: "Árbol demasiado grande o ciclo detectado" });

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
        await Item.deleteMany({ _id: { $in: idsArray }, userId });

        const io = req.app.get("io");
        if (io) {
            io.to(`user:${userId}`).emit("item-deleted", { id, deleted: idsArray.length, ids: idsArray });
            if (root.sharedWith && root.sharedWith.length > 0) {
                root.sharedWith.forEach(s => io.to(`user:${s.userId}`).emit("item-deleted", { id, deleted: idsArray.length, ids: idsArray }));
            }
        }

        return res.status(200).json({ ok: true, msg: "Ítem eliminado correctamente", deleted: idsArray.length });
    } catch (error) {
        return res.status(500).json({ ok: false, msg: `Error en el servidor - ${error.message}` });
    }
};

export const shareItem = async (req, res) => {
    try {
        const ownerId = req.user._id; // 💡 Actualizado
        const { id } = req.params;
        const { email, permission } = req.body;

        if (!email) return res.status(400).json({ msg: "Email requerido" });
        if (!["read", "edit"].includes(permission)) return res.status(400).json({ msg: "Permiso inválido (read/edit)" });

        const item = await Item.findOne({ _id: id, userId: ownerId });
        if (!item) return res.status(403).json({ msg: "No puedes compartir este ítem (no eres propietario)" });

        const invitedUser = await User.findOne({ email });
        if (!invitedUser) return res.status(404).json({ msg: "Usuario invitado no existe" });

        if (String(invitedUser._id) === String(ownerId)) return res.status(400).json({ msg: "No puedes compartir contigo mismo" });

        const index = item.sharedWith.findIndex(s => String(s.userId) === String(invitedUser._id));
        if (index >= 0) item.sharedWith[index].permission = permission;
        else item.sharedWith.push({ userId: invitedUser._id, permission });

        await item.save();

        const io = req.app.get("io");
        if (io) io.to(`user:${invitedUser._id}`).emit("item-shared", item);

        return res.status(200).json({ ok: true, msg: "Ítem compartido correctamente", sharedWith: item.sharedWith });
    } catch (error) {
        return res.status(500).json({ msg: "Error en el servidor" });
    }
};