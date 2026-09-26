import { foodLabel } from '@/domain/catalog';
import { Platform } from 'react-native';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { careStatus, historyOf } from '@/domain/itinerary';
import { gramsPerMeal } from '@/domain/catalog';
import { kindDef } from '@/domain/diary';
import { fmtBR, today } from '@/domain/dates';
import type { Pet, PetData } from '@/domain/types';

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]!));

export interface DossieOptions { cares: boolean; weight: boolean; health: boolean; diary: boolean; chat: boolean; months: number }

export function dossieHtml(pet: Pet, data: PetData, o: DossieOptions, guardian: string): string {
  const t = today();
  const since = new Date(); since.setMonth(since.getMonth() - o.months);
  const sinceDay = since.toISOString().slice(0, 10);
  const statusPt = { em_dia: 'Em dia', atencao: 'Atenção', atrasado: 'Atrasado', carimbado: 'Carimbado' } as const;
  const rows = data.cares.map((c) => `<tr><td>${esc(c.name)}</td><td>${historyOf(c).map(fmtBR).join('<br>') || '—'}</td><td>${c.nextDate ? fmtBR(c.nextDate) : '—'}</td><td>${statusPt[careStatus(c, t)]}</td></tr>`).join('');
  const g = gramsPerMeal(pet);
  const food = `${esc(foodLabel(pet.food))} · ${pet.mealsPerDay === null ? 'nº de refeições não informado' : `${pet.mealsPerDay ?? pet.mealTimes.length}x/dia`} (${pet.mealTimes.join(', ')})${pet.gramsPerDay ? ` · ${pet.gramsPerDay} g/dia${g ? ` (${g} g por refeição)` : ''}` : ' · quantidade não informada'}`;
  const weights = data.weights.filter((w) => w.day >= sinceDay).sort((a, b) => a.day.localeCompare(b.day)).map((w) => `<tr><td>${fmtBR(w.day)}</td><td>${String(w.kg).replace('.', ',')} kg</td></tr>`).join('');
  const diary = data.diary.filter((d) => d.day >= sinceDay).sort((a, b) => b.day.localeCompare(a.day)).map((d) => `<li><b>${fmtBR(d.day)}</b> · ${esc(d.kind ? kindDef(d.kind).label : d.topic)}${d.tags?.length ? ` [${esc(d.tags.join(', '))}]` : ''} — ${esc(d.note || 'sem anotação')}</li>`).join('');
  const chat = data.chat.filter((m) => m.at.slice(0, 10) >= sinceDay).map((m) => `<li><b>${m.from === 'user' ? 'Tutor' : 'Guia (simulado)'}:</b> ${esc(m.text)}</li>`).join('');
  return `<!doctype html><html><head><meta charset="utf-8"><style>
    body{font-family:Georgia,serif;color:#2A2622;padding:28px;background:#fff}
    h1{font-size:26px;margin:0} h2{font-size:15px;letter-spacing:.12em;text-transform:uppercase;border-bottom:1px solid #D9C7A2;padding-bottom:4px;margin-top:22px}
    .mono{font-family:Courier,monospace;font-size:11px;letter-spacing:.08em;color:#655B4F}
    table{width:100%;border-collapse:collapse;font-size:12px} td,th{border-bottom:1px dashed #D9C7A2;padding:6px 4px;text-align:left}
    th{font-family:Courier,monospace;font-size:10px;color:#655B4F} li{font-size:12px;margin:4px 0}
    .box{border:1px solid #D9C7A2;border-radius:10px;padding:12px;background:#FBF6EA}
  </style></head><body>
    <div class="mono">PATAPORTE · DOSSIÊ DE SAÚDE · Nº ${esc(pet.passportNumber)}</div>
    <h1>${esc(pet.name)} · ${esc(pet.breed)}</h1>
    <div class="mono">GERADO EM ${fmtBR(t)} · PERÍODO: ÚLTIMOS ${o.months} MESES · TUTOR: ${esc(guardian)}</div>
    <div class="box" style="margin-top:14px;font-size:12px">
      Espécie: ${pet.species === 'dog' ? 'Cão' : 'Gato'} · Sexo: ${pet.sex} · Nascimento: ${fmtBR(pet.birthDate)} · Castrado: ${{ sim: 'Sim', nao: 'Não', naosei: 'Não informado' }[pet.neutered]} · Peso atual: ${pet.weightKg ? String(pet.weightKg).replace('.', ',') + ' kg' : '—'}${pet.microchip?.has === 'sim' ? ` · Microchip: ${esc(pet.microchip.number || 'sim')}` : ''}
    </div>
    ${o.health ? `<h2>Saúde</h2><table><tr><th>ALERGIAS</th><td>${esc(pet.allergies || 'Nenhuma declarada')}</td></tr><tr><th>CONDIÇÕES</th><td>${esc(pet.conditions || 'Nenhuma declarada')}</td></tr><tr><th>REMÉDIOS</th><td>${esc(pet.meds || 'Nenhum')}</td></tr><tr><th>ALIMENTAÇÃO</th><td>${food}</td></tr></table>` : ''}
    ${o.cares ? `<h2>Vacinas e cuidados</h2><table><tr><th>CUIDADO</th><th>APLICADO EM</th><th>PRÓXIMO</th><th>STATUS</th></tr>${rows || '<tr><td colspan="4">Sem registros</td></tr>'}</table>` : ''}
    ${o.weight ? `<h2>Peso</h2><table><tr><th>DATA</th><th>PESO</th></tr>${weights || '<tr><td colspan="2">Sem pesagens no período</td></tr>'}</table>` : ''}
    ${o.diary ? `<h2>Diário de vida</h2><ul>${diary || '<li>Sem anotações no período</li>'}</ul>` : ''}
    ${o.chat ? `<h2>Conversas com o guia</h2><ul>${chat || '<li>Sem conversas no período</li>'}</ul>` : ''}
    <p class="mono" style="margin-top:26px">Documento informativo gerado pelo tutor no app Pataporte. Não substitui prontuário ou avaliação veterinária.</p>
  </body></html>`;
}

export async function shareDossie(html: string, petName: string): Promise<void> {
  if (Platform.OS === 'web') {
    await Print.printAsync({ html });
    return;
  }
  const { uri } = await Print.printToFileAsync({ html });
  if (await Sharing.isAvailableAsync()) await Sharing.shareAsync(uri, { mimeType: 'application/pdf', dialogTitle: `Dossiê do ${petName}`, UTI: 'com.adobe.pdf' });
}
