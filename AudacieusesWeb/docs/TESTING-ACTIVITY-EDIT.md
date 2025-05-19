# Instructions pour tester l'édition d'activités

Ce document explique comment tester la fonctionnalité d'édition d'activités avec différents types (vidéo, QCM, question-réponse, texte).

## Méthode 1: Utilisation de l'interface utilisateur

1. Connectez-vous à l'interface administrateur
2. Allez à la page de gestion des activités (`/admin/activites`)
3. Pour chaque type d'activité à tester:
   - Trouvez une activité existante du type souhaité 
   - Cliquez sur le bouton "Modifier" (icône crayon)
   - Vérifiez que le formulaire est correctement pré-rempli avec les données existantes
   - Faites quelques modifications
   - Cliquez sur "Mettre à jour"
   - Vérifiez que les modifications sont bien enregistrées

## Méthode 2: Utilisation des outils de test

1. Connectez-vous à l'interface administrateur
2. Allez à la page de gestion des activités (`/admin/activites`)
3. Cliquez sur le bouton "Modifier" pour une activité
4. Ouvrez la console développeur du navigateur (F12)
5. Exécutez la commande suivante pour analyser le formulaire:
   ```javascript
   testEditActivity('video'); // Pour tester l'édition d'une vidéo
   testEditActivity('qcm');   // Pour tester l'édition d'un QCM
   testEditActivity('question_reponse'); // Pour tester l'édition d'une Question-Réponse
   testEditActivity('texte'); // Pour tester l'édition d'un texte
   ```
6. Vérifiez les résultats dans la console

## Points à vérifier pour chaque type d'activité

### Vidéo
- Le titre et la description sont correctement chargés
- Le lien de la vidéo est correct
- La durée est correcte

### QCM
- Le titre et la description sont correctement chargés
- Toutes les questions sont chargées
- Chaque question a ses options correctement chargées
- La réponse correcte est bien marquée pour chaque question

### Question-Réponse
- Le titre et la description sont correctement chargés
- Toutes les questions sont chargées

### Texte
- Le titre et la description sont correctement chargés
- Le contenu textuel est chargé

## En cas de problème

Si vous rencontrez des problèmes lors des tests:

1. Vérifiez les erreurs dans la console du navigateur
2. Assurez-vous que l'activité que vous essayez d'éditer a le bon format de données
3. Essayez de recréer une nouvelle activité du même type et de l'éditer ensuite
