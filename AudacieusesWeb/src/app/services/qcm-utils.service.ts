/**
 * Service utilitaire pour la validation et le formatage des QCM
 * Ce service permet de standardiser la structure des QCM avant envoi à l'API
 */

import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class QcmUtilsService {
  
  constructor() { }
  
  /**
   * Valide et standardise une structure QCM avant envoi à l'API
   * @param qcmData Données QCM à valider
   * @returns Structure QCM standardisée
   */
  validateQcmStructure(qcmData: any): any {
    if (!qcmData) {
      console.error('Données QCM manquantes');
      return this.createDefaultQcm();
    }
    
    // Si des questions existent déjà
    if (qcmData.questions && Array.isArray(qcmData.questions)) {
      const validatedQuestions = qcmData.questions.map((question: any, index: number) => {
        return this.validateQuestion(question, index);
      });
      
      return {
        type: 'qcm',
        questions: validatedQuestions
      };
    }
    
    // Si c'est un format avec une seule question
    if (qcmData.options && Array.isArray(qcmData.options)) {
      return {
        type: 'qcm',
        questions: [
          {
            texte: qcmData.texte || qcmData.question || 'Question à choix multiples',
            options: qcmData.options,
            reponse_correcte: typeof qcmData.reponse_correcte === 'number' ? qcmData.reponse_correcte : 0
          }
        ]
      };
    }
    
    // Si c'est un autre format non reconnu
    console.warn('Format QCM non reconnu, création d\'une structure par défaut');
    return this.createDefaultQcm();
  }
  
  /**
   * Valide une question individuelle
   * @param question Question à valider
   * @param index Index de la question (pour log)
   * @returns Question validée
   */
  private validateQuestion(question: any, index: number): any {
    const validatedQuestion: any = {
      texte: '',
      options: [],
      reponse_correcte: 0
    };
    
    // Valider le texte
    if (!question.texte) {
      console.warn(`Question ${index + 1} sans texte détectée`);
      validatedQuestion.texte = `Question ${index + 1}`;
    } else {
      validatedQuestion.texte = question.texte;
    }
    
    // Valider les options
    if (!question.options || !Array.isArray(question.options) || question.options.length < 2) {
      console.warn(`Question ${index + 1} avec options insuffisantes`);
      validatedQuestion.options = question.options && Array.isArray(question.options) ? 
        [...question.options] : [];
      
      // Ajouter des options par défaut si nécessaire
      while (validatedQuestion.options.length < 2) {
        validatedQuestion.options.push(`Option ${validatedQuestion.options.length + 1}`);
      }
    } else {
      validatedQuestion.options = question.options;
    }
    
    // Valider la réponse correcte
    if (typeof question.reponse_correcte !== 'number' || 
        question.reponse_correcte < 0 || 
        question.reponse_correcte >= validatedQuestion.options.length) {
      console.warn(`Question ${index + 1} avec réponse incorrecte`);
      validatedQuestion.reponse_correcte = 0;
    } else {
      validatedQuestion.reponse_correcte = question.reponse_correcte;
    }
    
    return validatedQuestion;
  }
  
  /**
   * Crée une structure QCM par défaut
   * @returns Structure QCM par défaut
   */
  createDefaultQcm(): any {
    return {
      type: 'qcm',
      questions: [
        {
          texte: 'Question à choix multiples',
          options: ['Option 1', 'Option 2', 'Option 3'],
          reponse_correcte: 0
        }
      ]
    };
  }
  
  /**
   * Convertit le format QCM du frontend vers le format API
   * @param formData Données du formulaire
   * @returns Structure QCM pour l'API
   */
  convertFormToApiFormat(formData: any): any {
    if (!formData) return this.createDefaultQcm();
    
    // Si le formulaire a un tableau de questions
    if (formData.questions && Array.isArray(formData.questions)) {
      const questions = formData.questions.map((q: any) => ({
        texte: q.texte || 'Question sans texte',
        options: Array.isArray(q.options) ? q.options : ['Option 1', 'Option 2'],
        reponse_correcte: typeof q.reponse_correcte === 'number' ? q.reponse_correcte : 
                          typeof q.reponse_correcte === 'string' ? parseInt(q.reponse_correcte, 10) : 0
      }));
      
      return this.validateQcmStructure({ questions });
    }
    
    return this.createDefaultQcm();
  }
  
  /**
   * Convertit le format API vers le format du formulaire frontend
   * @param apiData Données de l'API
   * @returns Structure pour le formulaire frontend
   */
  convertApiToFormFormat(apiData: any): any {
    if (!apiData) return { questions: [] };
    
    try {
      // Si c'est une chaîne JSON, la parser
      let data = apiData;
      if (typeof apiData === 'string') {
        try {
          data = JSON.parse(apiData);
        } catch (e) {
          console.error('Format de données QCM invalide:', e);
          return { questions: [] };
        }
      }
      
      // Si le contenu est enveloppé dans un objet "type":"texte"
      if (data.type === 'texte' && data.contenu) {
        try {
          // Essayer de parser le contenu comme JSON
          const nestedContent = typeof data.contenu === 'string' ? 
            JSON.parse(data.contenu) : data.contenu;
          data = nestedContent;
        } catch (e) {
          // Ce n'est pas du JSON valide dans le contenu
        }
      }
      
      // Structure standard avec questions
      if (data.type === 'qcm' && data.questions && Array.isArray(data.questions)) {
        return {
          questions: data.questions.map((q: any) => ({
            texte: q.texte || q.question || '',
            options: q.options || [],
            reponse_correcte: q.reponse_correcte !== undefined ? q.reponse_correcte : 0
          }))
        };
      }
      
      // Format alternatif avec une seule question
      if (data.options && Array.isArray(data.options)) {
        return {
          questions: [
            {
              texte: data.texte || data.question || '',
              options: data.options,
              reponse_correcte: data.reponse_correcte !== undefined ? data.reponse_correcte : 0
            }
          ]
        };
      }
      
      // Aucun format reconnu
      console.warn('Format QCM API non reconnu, initialisation d\'un formulaire vide');
      return { questions: [] };
      
    } catch (error) {
      console.error('Erreur lors de la conversion API vers formulaire:', error);
      return { questions: [] };
    }
  }
}
