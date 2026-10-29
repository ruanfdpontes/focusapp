import React from "react";
import { Carregando } from "@/ui/componentes";

// A tela inicial apenas exibe o spinner enquanto a sessao reidrata.
// Quem decide o destino e o guard em _layout.tsx (nunca esta tela).
export default function Index() {
  return <Carregando />;
}
