export const mejorarTexto = async (texto) => {
  const res = await hf.post(
    "/google/flan-t5-base",
    { inputs: `Improve this text: ${texto}` }
  );

  return res.data[0].generated_text;
};
