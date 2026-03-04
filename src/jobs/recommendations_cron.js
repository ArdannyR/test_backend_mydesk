import cron from "node-cron";
import Item from "../models/item.js"; 
import Recommendation from "../models/Recommendation.js"; 

const buildRecommendationsForNote = (noteText) => {
  const recs = [];

  if (!noteText || noteText.trim().length < 30) {
    recs.push({ title: "Amplía tu nota", text: "Tu nota es muy corta. Añade más detalle para que sea útil.", type: "productivity" });
  }

  if (noteText.includes("http") || noteText.includes("www")) {
    recs.push({ title: "Convierte enlaces en ítems", text: "Detecté enlaces en tu nota. Te conviene guardarlos como ítems tipo link.", type: "cleanup" });
  }

  if (noteText.toLowerCase().includes("tarea") || noteText.toLowerCase().includes("pendiente")) {
    recs.push({ title: "Extrae tareas", text: "Parece que tienes tareas pendientes. Considera crear una lista de tareas o una nota separada.", type: "productivity" });
  }

  return recs;
};

export const startRecommendationsCron = () => {
  cron.schedule("*/10 * * * *", async () => {
    try {
      console.log("⏰ Cron: Generando recomendaciones...");

      const notes = await Item.find({ type: "note" }).sort({ updatedAt: -1 }).limit(20).lean();

      for (const note of notes) {
        const userId = note.userId;
        const noteId = note._id;
        const content = note.content || "";

        const recs = buildRecommendationsForNote(content);

        for (const r of recs) {
            // 💡 Usamos el modelo Recommendation
          const exists = await Recommendation.findOne({ userId, noteId, title: r.title }).lean();

          if (!exists) {
            await Recommendation.create({
              userId, noteId, title: r.title, text: r.text, type: r.type
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