// Mise en forme minimale des textes du YAML : **gras** et *italique*.
// On échappe le HTML d'abord : le YAML reste du texte, jamais du balisage.
const ECHAPPEMENTS: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
};

export function enrichir(texte: string): string {
  return texte
    .replace(/[&<>"']/g, (c) => ECHAPPEMENTS[c])
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>');
}
