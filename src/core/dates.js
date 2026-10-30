function isFuturo(data_proximo_contato) {
  if (!data_proximo_contato) return false;
  const partes = data_proximo_contato.split("/");
  if (partes.length !== 3) return false;

  const dateProx = new Date(
    parseInt(partes[2], 10),
    parseInt(partes[1], 10) - 1,
    parseInt(partes[0], 10)
  );
  dateProx.setHours(0, 0, 0, 0);
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  return dateProx > hoje;
}

module.exports = { isFuturo };
