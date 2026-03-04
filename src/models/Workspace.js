// src/models/Workspace.js
import { Schema, model } from 'mongoose';

const workspaceSchema = new Schema({
    nombre: {
        type: String,
        required: true,
        trim: true
    },
    dueño: {
        type: Schema.Types.ObjectId,
        ref: 'estudiante',
        required: true
    },
    // Lista de usuarios que tienen acceso (incluyendo al dueño)
    miembros: [{
        type: Schema.Types.ObjectId,
        ref: 'estudiante'
    }]
}, {
    timestamps: true
});

export default model('Workspace', workspaceSchema);