// Static Configuration Constants (Mon Exam V2)
// Saved locally to maximize performance, reduce latency, and enable offline access.

export const COUNTRIES = [
  {
    code: "civ",
    name: "Côte d'Ivoire",
    flag_colors: ["#FF8200", "#FFFFFF", "#00A859"],
    primary: "#EA580C",
    secondary: "#16A34A",
    active: true,
  },
  {
    code: "sen",
    name: "Sénégal",
    flag_colors: ["#00853F", "#FDEF42", "#E31B23"],
    primary: "#00853F",
    secondary: "#FDEF42",
    active: true,
  },
  {
    code: "bfa",
    name: "Burkina Faso",
    flag_colors: ["#EF2B2D", "#FCD116", "#009E49"],
    primary: "#EF2B2D",
    secondary: "#FCD116",
    active: true,
  },
  {
    code: "mli",
    name: "Mali",
    flag_colors: ["#14B53A", "#FCD116", "#CE1126"],
    primary: "#14B53A",
    secondary: "#CE1126",
    active: true,
  },
];

export const SERIES_BY_COUNTRY: Record<string, Record<string, { label: string; description: string; color: string; sub_series: string[] }>> = {
  civ: {
    generale: {
      label: "Série Générale",
      description: "BAC général ivoirien",
      color: "#16A34A",
      sub_series: ["A1", "A2", "C", "D", "E"],
    },
    industrielle: {
      label: "Série F — Industrielle",
      description: "BAC technique industriel",
      color: "#EA580C",
      sub_series: ["F1", "F2", "F3", "F4", "F5", "F6", "F7", "F8"],
    },
    tertiaire: {
      label: "Série G — Gestion / Tertiaire",
      description: "BAC technique gestion",
      color: "#1C449E",
      sub_series: ["G1", "G2", "G3"],
    },
  },
  sen: {
    litteraire: {
      label: "Série L — Littéraire",
      description: "BAC sénégalais littéraire",
      color: "#00853F",
      sub_series: ["L1a", "L1b", "L2", "L'1", "L'2"],
    },
    scientifique: {
      label: "Série S — Scientifique",
      description: "BAC sénégalais scientifique",
      color: "#1C449E",
      sub_series: ["S1", "S2", "S2A", "S3", "S4", "S5"],
    },
    tertiaire: {
      label: "Série G — Gestion",
      description: "BAC technique gestion",
      color: "#E31B23",
      sub_series: ["G"],
    },
    technique: {
      label: "Série T — Technique industriel",
      description: "BAC technique industriel sénégalais",
      color: "#EA580C",
      sub_series: ["T1", "T2"],
    },
  },
  bfa: {
    generale: {
      label: "Série Générale",
      description: "BAC général burkinabè",
      color: "#009E49",
      sub_series: ["A1", "A2", "A4", "C", "D", "E"],
    },
    industrielle: {
      label: "Série F — Industrielle",
      description: "BAC technique industriel",
      color: "#EF2B2D",
      sub_series: ["F1", "F2", "F3", "F4"],
    },
    tertiaire: {
      label: "Série G — Gestion",
      description: "BAC technique gestion",
      color: "#FCD116",
      sub_series: ["G1", "G2"],
    },
    hotellerie: {
      label: "Série H — Hôtellerie",
      description: "BAC hôtellerie",
      color: "#1C449E",
      sub_series: ["H1", "H2"],
    },
  },
  mli: {
    litteraire: {
      label: "TAL — Terminale Arts & Lettres",
      description: "BAC malien littéraire",
      color: "#14B53A",
      sub_series: ["TAL", "TLL"],
    },
    scientifique: {
      label: "TSExp / TSE — Terminale Sciences",
      description: "BAC malien scientifique",
      color: "#CE1126",
      sub_series: ["TSE", "TSExp", "TSL"],
    },
    economique: {
      label: "TSEco / TSS — Sciences éco et sociales",
      description: "BAC malien économique",
      color: "#FCD116",
      sub_series: ["TSEco", "TSS"],
    },
  },
};

export const SUBJECTS_BY_SERIES: Record<string, [string, string][]> = {
  civ_generale: [
    ["Mathématiques", "calculator"],
    ["Physique-Chimie", "atom"],
    ["Sciences de la Vie et de la Terre", "leaf"],
    ["Français", "book"],
    ["Philosophie", "brain"],
    ["Histoire-Géographie", "globe"],
    ["Anglais", "language"],
    ["Espagnol", "language"],
    ["Allemand", "language"],
  ],
  civ_industrielle: [
    ["Mathématiques", "calculator"],
    ["Physique Appliquée", "bolt"],
    ["Construction Mécanique", "gear"],
    ["Électrotechnique", "plug"],
    ["Technologie", "wrench"],
    ["Français", "book"],
    ["Dessin Industriel", "wrench"],
  ],
  civ_tertiaire: [
    ["Économie Générale", "chart"],
    ["Comptabilité", "calculator"],
    ["Droit", "scale"],
    ["Mathématiques Financières", "chart"],
    ["Français", "book"],
    ["Anglais", "language"],
    ["Statistiques", "chart"],
  ],
  sen_litteraire: [
    ["Philosophie", "brain"],
    ["Français", "book"],
    ["Histoire-Géographie", "globe"],
    ["Anglais", "language"],
    ["Espagnol / Arabe", "language"],
    ["Latin / Grec", "book"],
  ],
  sen_scientifique: [
    ["Mathématiques", "calculator"],
    ["Sciences Physiques", "atom"],
    ["Sciences de la Vie et de la Terre", "leaf"],
    ["Français", "book"],
    ["Philosophie", "brain"],
    ["Anglais", "language"],
  ],
  sen_tertiaire: [
    ["Comptabilité", "calculator"],
    ["Économie d'Entreprise", "chart"],
    ["Droit", "scale"],
    ["Mathématiques", "calculator"],
    ["Français", "book"],
  ],
  sen_technique: [
    ["Mathématiques", "calculator"],
    ["Sciences Physiques", "atom"],
    ["Technologie", "wrench"],
    ["Français", "book"],
    ["Anglais", "language"],
  ],
  bfa_generale: [
    ["Mathématiques", "calculator"],
    ["Physique-Chimie", "atom"],
    ["SVT", "leaf"],
    ["Français", "book"],
    ["Philosophie", "brain"],
    ["Histoire-Géographie", "globe"],
    ["Anglais", "language"],
  ],
  bfa_industrielle: [
    ["Mathématiques", "calculator"],
    ["Physique Appliquée", "bolt"],
    ["Technologie", "wrench"],
    ["Français", "book"],
  ],
  bfa_tertiaire: [
    ["Comptabilité", "calculator"],
    ["Économie", "chart"],
    ["Droit", "scale"],
    ["Français", "book"],
    ["Anglais", "language"],
  ],
  bfa_hotellerie: [
    ["Techniques Hôtelières", "wrench"],
    ["Mathématiques", "calculator"],
    ["Français", "book"],
    ["Anglais", "language"],
  ],
  mli_litteraire: [
    ["Philosophie", "brain"],
    ["Lettres", "book"],
    ["Histoire-Géographie", "globe"],
    ["Anglais", "language"],
    ["Arabe", "language"],
  ],
  mli_scientifique: [
    ["Mathématiques", "calculator"],
    ["Physique-Chimie", "atom"],
    ["Biologie", "leaf"],
    ["Français", "book"],
    ["Anglais", "language"],
  ],
  mli_economique: [
    ["Économie", "chart"],
    ["Comptabilité", "calculator"],
    ["Mathématiques", "calculator"],
    ["Français", "book"],
    ["Histoire-Géographie", "globe"],
  ],
};

export const SERVICES = [
  { id: "early", title: "Recevoir les copies corrigées avant le jour J", subtitle: "Toutes les épreuves corrigées remises avant le matin de l'examen", icon: "calendar-check", mode: "platform" as const },
  { id: "realtime", title: "Corrections en temps réel le jour J", subtitle: "Notre équipe traite et vous renvoie les corrections en direct", icon: "clock", mode: "platform" as const },
  { id: "accomplice", title: "Complice à l'intérieur de l'école", subtitle: "Un complice sur place vous remet un téléphone pour recevoir les corrections", icon: "user-shield", mode: "whatsapp" as const },
  { id: "modification", title: "Modification des notes", subtitle: "Correction et modification de vos notes à la délibération", icon: "edit", mode: "whatsapp" as const },
  { id: "other", title: "Autre service personnalisé", subtitle: "Discutez directement avec notre équipe sur WhatsApp", icon: "message", mode: "whatsapp" as const },
];

export const APP_SETTINGS_DEFAULT = {
  wave_number: "+225 05 45 01 94 93",
  orange_number: "+225 07 48 11 10 50",
  whatsapp_link: "https://wa.me/2250545019493",
  payment_window_min: 5,
  pricing: {
    single: 8000,
    pack5: 35000,
    exam: 13000,
    pack6: 50000,
  },
};

export function slugify(s: string): string {
  const repl: Record<string, string> = { "é": "e", "è": "e", "ê": "e", "à": "a", "â": "a", "ô": "o", "ç": "c", "î": "i", "ï": "i", "'": "", "/": "-" };
  let out = s.toLowerCase();
  for (const k of Object.keys(repl)) {
    out = out.replace(new RegExp(k, "g"), repl[k]);
  }
  return out.split(/\s+/).join("-");
}
