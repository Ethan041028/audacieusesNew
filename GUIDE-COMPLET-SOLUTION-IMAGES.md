# Guide Complet pour Résoudre le Problème d'Affichage des Images

## Problème
Les images des modules ne s'affichent pas dans l'application Angular, mais elles sont accessibles directement via leurs URL. L'erreur `ERR_BLOCKED_BY_RESPONSE.NotSameOrigin` indique un problème lié à la politique CORS (Cross-Origin Resource Sharing).

## Solution en 3 étapes

### 1. Mettre à jour le serveur Express (backend)

**Problème côté serveur**: La configuration CORS actuelle bloque le chargement des images depuis une origine différente.

**Pour corriger**:

1. Ouvrez le fichier `AudacieusesAPI/src/app.js`
2. Trouvez la section de configuration CORS et middleware pour servir les fichiers statiques (autour des lignes 70-100)
3. Remplacez-la par le code suivant:

```javascript
app.use(helmet({ 
  crossOriginResourcePolicy: false  // Désactiver crossOriginResourcePolicy pour permettre aux images d'être chargées
}));

// Middleware CORS global simplifié
app.use(cors({
  origin: '*',  // Permettre toutes les origines
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Origin', 'X-Requested-With', 'Accept'],
  credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan('combined', { stream: { write: message => logger.info(message.trim()) } }));

// Servir les fichiers statiques directement sans middleware CORS supplémentaire
const uploadsDir = path.join(__dirname, '../uploads');
app.use('/uploads', (req, res, next) => {
  // Désactiver les vérifications CORS pour les fichiers statiques
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
  next();
}, express.static(uploadsDir));
```

4. Redémarrez le serveur Express:
   ```
   cd e:\site web\Audacieuses-main\Audacieuses-main\AudacieusesAPI
   npm start
   ```

### 2. Mettre à jour le service d'images (frontend)

**Problème côté client**: Le service ModuleImageService ne construit pas correctement les URL des images.

**Pour corriger**:

1. Ouvrez le fichier `AudacieusesWeb/src/app/services/module-image.service.ts`
2. Remplacez le contenu par ce code:

```typescript
import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class ModuleImageService {
  // URL de base du serveur backend
  private backendUrl = 'http://localhost:3000';

  constructor() { }

  getModuleImageUrl(imagePath: string | null | undefined, defaultImage: string = '/assets/images/module-default.jpg'): string {
    if (!imagePath) {
      return defaultImage;
    }

    // Si l'image commence par http:// ou https://, c'est déjà une URL complète
    if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
      return imagePath;
    }

    // Nettoyage du chemin pour éviter les problèmes
    const cleanPath = imagePath.trim();
    
    // Si le chemin commence par /uploads, utiliser directement l'URL complète
    if (cleanPath.startsWith('/uploads')) {
      return `${this.backendUrl}${cleanPath}`;
    }
    
    // Si le chemin est juste le nom du fichier (module-*.jpg)
    return `${this.backendUrl}/uploads/modules/${cleanPath}`;
  }
}
```

3. Redémarrez le serveur de développement Angular:
   ```
   cd e:\site web\Audacieuses-main\Audacieuses-main\AudacieusesWeb
   ng serve
   ```

### 3. Vérification

1. **Tester avec le fichier HTML simple**:
   - Ouvrez `simple-image-test.html` dans votre navigateur
   - Si les images s'affichent, la configuration du serveur est correcte

2. **Vérifier dans l'application Angular**:
   - Ouvrez l'application Angular dans le navigateur (http://localhost:4200)
   - Accédez à la page des modules
   - Les images devraient maintenant s'afficher correctement

## Explications Techniques

La solution fonctionne en:

1. **Désactivant les politiques restrictives CORS et Cross-Origin-Resource-Policy** dans le serveur Express
2. **Ajoutant des en-têtes CORS permissifs** spécifiquement pour le dossier d'images
3. **Construisant des URL complètes** dans le service Angular au lieu de s'appuyer sur des chemins relatifs

Cette approche est appropriée pour un environnement de développement. Pour la production, vous voudrez peut-être restreindre l'origine à votre domaine spécifique plutôt que d'utiliser `'*'`.

## Test Direct

Si vous souhaitez tester directement l'accès à une image, ouvrez cette URL dans votre navigateur:
```
http://localhost:3000/uploads/modules/module-1747594819837-351579203.jpg
```

Si l'image s'affiche directement, mais pas dans l'application, c'est un signe clair d'un problème CORS ou de construction d'URL.
