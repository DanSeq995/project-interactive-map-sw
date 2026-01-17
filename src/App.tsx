import { useState } from 'react';
import { MapUploader } from './components/MapUploader';
import { MapCanvas } from './components/MapCanvas';
import './App.css';

/**
 * Componente principale dell'app
 * Gestisce lo stato della mappa caricata e il passaggio dei dati ai componenti figli
 * 
 * @component
 * @returns {React.ReactElement} L'elemento principale dell'app
 */
function App() {
  const [mapLoaded, setMapLoaded] = useState(false);
  const [mapData, setMapData] = useState({
    url: '',
    width: 0,
    height: 0,
  });

  /**
   * Callback eseguito quando una mappa viene caricata con successo
   * Salva i dati della mappa e mostra il canvas
   * 
   * @param {string} imageUrl - URL della mappa caricata
   * @param {number} width - Larghezza originale della mappa
   * @param {number} height - Altezza originale della mappa
   */
  const handleMapLoaded = (imageUrl: string, width: number, height: number) => {
    setMapData({ url: imageUrl, width, height });
    setMapLoaded(true);
  };

  /**
   * Resetta lo stato e torna alla schermata di caricamento
   */
  const handleResetMap = () => {
    setMapLoaded(false);
    setMapData({ url: '', width: 0, height: 0 });
  };

  return (
    <div className="app">
      {!mapLoaded ? (
        // Schermata di caricamento mappa
        <div className="uploader-container">
          <h1>🗺️ Interactive Map - Savage Worlds</h1>
          <p>Carica una mappa di Inkarnate per iniziare</p>
          <MapUploader onMapLoaded={handleMapLoaded} />
        </div>
      ) : (
        // Schermata della mappa interattiva
        <>
          <div className="header">
            <h1>🗺️ Interactive Map</h1>
            <button onClick={handleResetMap} className="reset-button">
              ↺ Nuova mappa
            </button>
          </div>
          <MapCanvas
            mapUrl={mapData.url}
            mapWidth={mapData.width}
            mapHeight={mapData.height}
          />
        </>
      )}
    </div>
  );
}

export default App;
