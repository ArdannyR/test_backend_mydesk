import { Schema, model } from "mongoose";

const recommendationSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "estudiante", required: true },
    noteId: { type: Schema.Types.ObjectId, ref: "Item", required: false },
    title: { type: String, required: true },      // ej: "Resumen sugerido"
    text: { type: String, required: true },       // recomendación
    type: { type: String, default: "general" },   // general | productivity | cleanup | ai
    status: { type: String, enum: ["new", "read"], default: "new" }
  },
  { timestamps: true }
);

export default model("Recommendation", recommendationSchema);
