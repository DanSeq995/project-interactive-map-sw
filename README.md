# 🗺️ Interactive Map - Savage Worlds

Un'app tablet interattiva per visualizzare mappe di Inkarnate e gestire pedine in real-time.

## Funzionalità

- **Caricamento mappe**: Carica immagini PNG/JPG di mappe Inkarnate
- **Visualizzazione responsive**: Adattamento automatico a schermi tablet
- **Gestione pedine**: 
  - Aggiungi pedine con un semplice clic sulla mappa
  - Trascina le pedine per posizionarle (drag-and-drop)
  - Elimina le pedine con doppio clic
  - Colori casuali per ogni pedina
- **Interfaccia tablet-friendly**: Ottimizzata per touch e dispositivi mobili

## Requisiti

- Node.js >= 18
- npm o yarn

## Installazione

```bash
npm install
```

## Sviluppo

```bash
npm run dev
```

L'app sarà disponibile su `http://localhost:5173`

## Build

```bash
npm run build
```

## Struttura del Progetto

```
src/
├── components/
│   ├── MapUploader.tsx      # Componente per caricare le mappe
│   └── MapCanvas.tsx        # Componente principale della mappa interattiva
├── styles/
│   ├── MapUploader.css      # Stili uploader
│   └── MapCanvas.css        # Stili canvas e pedine
├── App.tsx                  # Componente principale
├── App.css                  # Stili globali
└── main.tsx                 # Entry point
```

## Come usare

1. **Carica una mappa**: Clicca su "📁 Carica mappa" e seleziona un'immagine PNG/JPG
2. **Aggiungi pedine**: Clicca sulla mappa per aggiungere una pedina nel punto desiderato
3. **Sposta pedine**: Clicca e trascina le pedine per muoverle
4. **Elimina pedine**: Doppio clic su una pedina per eliminarla
5. **Nuova mappa**: Clicca su "↺ Nuova mappa" per caricare una mappa diversa

## Tecnologie

- React 18
- TypeScript
- Vite
- CSS3

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type-aware lint rules:

```js
export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...

      // Remove tseslint.configs.recommended and replace with this
      tseslint.configs.recommendedTypeChecked,
      // Alternatively, use this for stricter rules
      tseslint.configs.strictTypeChecked,
      // Optionally, add this for stylistic rules
      tseslint.configs.stylisticTypeChecked,

      // Other configs...
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```

You can also install [eslint-plugin-react-x](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactX from 'eslint-plugin-react-x'
import reactDom from 'eslint-plugin-react-dom'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...
      // Enable lint rules for React
      reactX.configs['recommended-typescript'],
      // Enable lint rules for React DOM
      reactDom.configs.recommended,
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```
