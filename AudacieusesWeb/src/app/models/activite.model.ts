export interface Activite {
  id?: number;
  titre: string;
  description?: string;
  type_activite_id: number;
  contenu: any;
  ordre?: number;
  duree?: number;
  date_creation?: string;
  updated_at?: string;
  typeActivite?: TypeActivite;
  seances?: any[]; // Une activité peut être associée à plusieurs séances
}

export interface TypeActivite {
  id: number;
  type_activite: string;
  description?: string;
  couleur?: string;
}

// Modèles pour les différents types de contenu
export interface ContenuVideo {
  type: 'video';
  lien: string;
  description?: string;
}

export interface QuestionQCM {
  texte: string;
  options: string[];
  reponse_correcte: number[] | number; // Peut être un index ou plusieurs index
}

export interface ContenuQCM {
  type: 'qcm';
  questions: QuestionQCM[];
}

export interface QuestionLibre {
  texte: string;
}

export interface ContenuQuestionReponse {
  type: 'question_reponse';
  questions: QuestionLibre[];
}

export interface ContenuTexte {
  type: 'texte';
  contenu: string;
}

// Union type pour tous les types de contenu possibles
export type ContenuActivite = ContenuVideo | ContenuQCM | ContenuQuestionReponse | ContenuTexte; 