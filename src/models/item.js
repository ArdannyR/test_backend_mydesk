// src/models/item.js
import { Schema, model } from "mongoose";

const itemSchema = new Schema(
  {
    // Usuario dueño del ítem
    userId: {
      type: Schema.Types.ObjectId,
      ref: "estudiante",
      required: true,
    },

    workspaceId: { type: Schema.Types.ObjectId, ref: 'Workspace', default: null },

    // Tipo de ítem: carpeta, nota, código, enlace
    type: {
      type: String,
      enum: ["folder", "note", "code", "link", "file"],
      required: true,
    },

    // Nombre visible en el escritorio
    name: {
      type: String,
      required: true,
      trim: true,
    },

    // Solo para enlaces
    url: {
      type: String,
      default: null,
    },

    fileFormat: { type: String, default: null }, // ej: pdf, docx, mp3
    publicId: { type: String, default: null },   // ID de Cloudinary por si quieres borrarlo después

    content: {
      type: String,
      default: "" 
    },

    // Si es ítem raíz => null
    parentId: {
      type: Schema.Types.ObjectId,
      ref: "Item",
      default: null,
    },

    // Posición en el escritorio
    position: {
      x: { type: Number, default: 100 },
      y: { type: Number, default: 100 },
    },

    guestPositions: [
      {
        userId: { type: Schema.Types.ObjectId, ref: "estudiante" },
        x: Number,
        y: Number
      }
    ],

    // 🆕 Compartido con otros usuarios
    sharedWith: [
      {
        userId: {
          type: Schema.Types.ObjectId,
          ref: "estudiante",
        },
        permission: {
          type: String,
          enum: ["read", "edit"],
          default: "read",
        },
      },
    ],
  },
  {
    timestamps: true,
  }
);

export default model("Item", itemSchema);
