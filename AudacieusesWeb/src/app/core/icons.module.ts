import { NgModule } from '@angular/core';
import { FontAwesomeModule, FaIconLibrary } from '@fortawesome/angular-fontawesome';
import { fas } from '@fortawesome/free-solid-svg-icons';
import { far } from '@fortawesome/free-regular-svg-icons';
import { fab } from '@fortawesome/free-brands-svg-icons';

@NgModule({
  imports: [FontAwesomeModule],
  exports: [FontAwesomeModule]
})
export class IconsModule {
  constructor(library: FaIconLibrary) {
    // Ajouter les ensembles d'icônes à la bibliothèque pour 
    // permettre leur utilisation dans tout le projet
    library.addIconPacks(fas, far, fab);
  }
}
