/** Artigos pelo sexo do pet: "a Charlotte", "do Toby". */
export function art(p?: { sex?: 'M' | 'F' } | null) {
  return p?.sex === 'F'
    ? { o: 'a', O: 'A', do: 'da', DO: 'DA', no: 'na', ao: 'à', ele: 'ela' }
    : { o: 'o', O: 'O', do: 'do', DO: 'DO', no: 'no', ao: 'ao', ele: 'ele' };
}
