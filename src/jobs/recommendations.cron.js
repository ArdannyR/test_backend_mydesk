import cron from "node-cron";
import Item from "../models/item.js";
import Recommendation from "../models/recomendaciones.js";

// Reglas simples (sin IA) para generar recomendaciones:
const buildRecommendationsForNote = (noteText) => {
  const recs = [];

  if (!noteText || noteText.trim().length < 30) {
    recs.push({
      title: "Amplía tu nota",
      text: "Tu nota es muy corta. Añade más detalle para que sea útil.",
      type: "productivity"
    });
  }

  if (noteText.includes("http") || noteText.includes("www")) {
    recs.push({
      title: "Convierte enlaces en ítems",
      text: "Detecté enlaces en tu nota. Te conviene guardarlos como ítems tipo link.",
      type: "cleanup"
    });
  }

  if (noteText.toLowerCase().includes("tarea") || noteText.toLowerCase().includes("pendiente")) {
    recs.push({
      title: "Extrae tareas",
      text: "Parece que tienes tareas pendientes. Considera crear una lista de tareas o una nota separada.",
      type: "productivity"
    });
  }

  return recs;
};

export const startRecommendationsCron = () => {
  // cada 10 minutos (para demo). En producción puede ser cada hora.
  cron.schedule("*/10 * * * *", async () => {
    try {
      console.log("⏰ Cron: Generando recomendaciones...");

      // 1) tomar notas recientes
      const notes = await Item.find({ type: "note" })
        .sort({ updatedAt: -1 })
        .limit(20)
        .lean();

      for (const note of notes) {
        const userId = note.userId;
        const noteId = note._id;
        const content = note.content || "";

        const recs = buildRecommendationsForNote(content);

        // 2) Guardar recomendaciones (evitar duplicados básicos)
        for (const r of recs) {
          const exists = await Recommendation.findOne({
            userId,
            noteId,
            title: r.title
          }).lean();

          if (!exists) {
            await Recommendation.create({
              userId,
              noteId,
              title: r.title,
              text: r.text,
              type: r.type
            });
          }
        }
      }

      console.log("✅ Cron: recomendaciones generadas.");
    } catch (err) {
      console.error("❌ Cron recomendaciones:", err.message);
    }
  });
};
