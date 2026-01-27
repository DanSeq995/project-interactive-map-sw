import { useState, useRef, useEffect } from 'react';
import { MapUploader } from './components/MapUploader';
import { MapCanvas, type MapCanvasRef } from './components/MapCanvas';
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
  const [mapFileName, setMapFileName] = useState('');
  const mapCanvasRef = useRef<MapCanvasRef>(null);
  const [showMenu, setShowMenu] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [currentTurnIndex, setCurrentTurnIndex] = useState(0);
  const [tokensCount, setTokensCount] = useState(0);
  const [roundNumber, setRoundNumber] = useState(1);
  const [timerDuration, setTimerDuration] = useState(30);
  const [timeLeft, setTimeLeft] = useState(30);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [timerExpired, setTimerExpired] = useState(false);
  const [baseTokenSize, setBaseTokenSize] = useState(32);
  const [showGrid, setShowGrid] = useState(false);
  const [gridSize, setGridSize] = useState(50);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const handleNextTurn = () => {
    if (tokensCount === 0) return;
    
    if (currentTurnIndex < tokensCount - 1) {
      // Avanza al prossimo personaggio
      setCurrentTurnIndex(currentTurnIndex + 1);
    } else {
      // Ultimo personaggio: torna all'inizio e incrementa il round
      setCurrentTurnIndex(0);
      setRoundNumber(roundNumber + 1);
      // Ferma il timer e apri la modal quando inizia un nuovo turno
      setIsTimerRunning(false);
      mapCanvasRef.current?.openCharactersList();
    }
  };

  const handlePreviousTurn = () => {
    if (tokensCount === 0) return;
    
    if (currentTurnIndex > 0) {
      // Torna al personaggio precedente solo all'interno del turno corrente
      setCurrentTurnIndex(currentTurnIndex - 1);
    }
    // Non si può tornare al turno precedente
  };

  const handleTokensCountChange = (count: number) => {
    setTokensCount(count);
    if (currentTurnIndex >= count && count > 0) {
      setCurrentTurnIndex(count - 1);
    } else if (count === 0) {
      setCurrentTurnIndex(0);
      setRoundNumber(1);
    }
  };

  // Gestione del timer
  useEffect(() => {
    if (isTimerRunning && timeLeft > 0) {
      timerIntervalRef.current = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            setTimerExpired(true);
            return timerDuration;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }
    }

    return () => {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
    };
  }, [isTimerRunning, timeLeft, timerDuration]);

  // Avanza al turno successivo quando il timer scade
  useEffect(() => {
    if (timerExpired) {
      setTimerExpired(false);
      handleNextTurn();
    }
  }, [timerExpired]);

  // Reset del timer quando cambia il turno manualmente
  useEffect(() => {
    setTimeLeft(timerDuration);
  }, [currentTurnIndex, timerDuration]);

  const handleToggleTimer = () => {
    setIsTimerRunning(!isTimerRunning);
  };

  const handleResetTimer = () => {
    setTimeLeft(timerDuration);
    setIsTimerRunning(false);
  };

  const handleSaveSettings = (newDuration: number) => {
    setTimerDuration(newDuration);
    setTimeLeft(newDuration);
    setIsTimerRunning(false);
    setShowSettings(false);
  };

  /**
   * Callback eseguito quando una mappa viene caricata con successo
   * Salva i dati della mappa, il nome del file e mostra il canvas
   * 
   * @param {string} imageUrl - URL della mappa caricata
   * @param {number} width - Larghezza originale della mappa
   * @param {number} height - Altezza originale della mappa
   * @param {string} fileName - Nome del file senza estensione
   */
  const handleMapLoaded = (imageUrl: string, width: number, height: number, fileName: string) => {
    setMapData({ url: imageUrl, width, height });
    setMapFileName(fileName);
    setMapLoaded(true);
  };

  /**
   * Resetta lo stato e torna alla schermata di caricamento
   */
  const handleResetMap = () => {
    setMapLoaded(false);
    setMapData({ url: '', width: 0, height: 0 });
    setMapFileName('');
  };

  /**
   * Apre la lista dei personaggi tramite la ref al MapCanvas
   */
  const handleOpenCharactersList = () => {
    mapCanvasRef.current?.openCharactersList();
  };

  return (
    <div className="app">
      {!mapLoaded ? (
        // Schermata di caricamento mappa
        <div className="uploader-container">
          <h1>Carica una mappa</h1>
          <MapUploader onMapLoaded={handleMapLoaded} />
        </div>
      ) : (
        // Schermata della mappa interattiva
        <>
          <div className="header">
            <button 
              className="hamburger-button" 
              onClick={() => setShowMenu(!showMenu)}
              aria-label="Menu"
            >
              <span className="hamburger-line"></span>
              <span className="hamburger-line"></span>
              <span className="hamburger-line"></span>
            </button>
            <div className="header-center">
              <h1>{mapFileName}</h1>
              {tokensCount > 0 && (
                <div className="turn-controls-header">
                  <button 
                    className="turn-nav-btn-header" 
                    onClick={handlePreviousTurn}
                    disabled={currentTurnIndex === 0}
                    title="Turno precedente"
                  >
                    ←
                  </button>
                  <div className="turn-indicator-header">
                    Turno {roundNumber}
                  </div>
                  <button 
                    className="turn-nav-btn-header" 
                    onClick={handleNextTurn}
                    title="Turno successivo"
                  >
                    →
                  </button>
                  <div className="timer-controls">
                    <button 
                      className="timer-btn" 
                      onClick={handleToggleTimer}
                      title={isTimerRunning ? "Pausa timer" : "Avvia timer"}
                    >
                      {isTimerRunning ? '⏸' : '▶'}
                    </button>
                    <div className={`timer-display ${timeLeft <= 10 ? 'timer-warning' : ''}`}>
                      {timeLeft}s
                    </div>
                    <button 
                      className="timer-btn timer-reset" 
                      onClick={handleResetTimer}
                      title="Reset timer"
                    >
                      ↻
                    </button>
                  </div>
                </div>
              )}
            </div>
            <button onClick={handleOpenCharactersList} className="characters-button">
              👥
            </button>
          </div>
          
          {/* Menu hamburger */}
          {showMenu && (
            <>
              <div className="menu-overlay" onClick={() => setShowMenu(false)}></div>
              <div className="hamburger-menu">
                <button 
                  className="menu-item"
                  onClick={() => {
                    handleResetMap();
                    setShowMenu(false);
                  }}
                >
                  <span className="menu-icon">↺</span>
                  <span>Nuova Mappa</span>
                </button>
                <button 
                  className="menu-item"
                  onClick={() => {
                    setShowMenu(false);
                    setShowSettings(true);
                  }}
                >
                  <span className="menu-icon">⚙️</span>
                  <span>Impostazioni</span>
                </button>
              </div>
            </>
          )}

          {/* Modal Settings */}
          {showSettings && (
            <>
              <div className="settings-overlay" onClick={() => setShowSettings(false)}></div>
              <div className="settings-modal">
                <div className="settings-header">
                  <h2>⚙️ Impostazioni</h2>
                  <button className="close-settings-btn" onClick={() => setShowSettings(false)}>
                    ✕
                  </button>
                </div>
                <div className="settings-content">
                  <div className="setting-section">
                    <h3>Durata Timer Turno</h3>
                    <p className="setting-description">Imposta i secondi per ogni turno del giocatore</p>
                    <div className="timer-presets">
                      <button 
                        className={`preset-btn ${timerDuration === 15 ? 'active' : ''}`}
                        onClick={() => handleSaveSettings(15)}
                      >
                        15s
                      </button>
                      <button 
                        className={`preset-btn ${timerDuration === 30 ? 'active' : ''}`}
                        onClick={() => handleSaveSettings(30)}
                      >
                        30s
                      </button>
                      <button 
                        className={`preset-btn ${timerDuration === 60 ? 'active' : ''}`}
                        onClick={() => handleSaveSettings(60)}
                      >
                        60s
                      </button>
                      <button 
                        className={`preset-btn ${timerDuration === 90 ? 'active' : ''}`}
                        onClick={() => handleSaveSettings(90)}
                      >
                        90s
                      </button>
                      <button 
                        className={`preset-btn ${timerDuration === 120 ? 'active' : ''}`}
                        onClick={() => handleSaveSettings(120)}
                      >
                        2m
                      </button>
                    </div>
                    <div className="custom-timer-input">
                      <label htmlFor="customTimer">Personalizzato:</label>
                      <input 
                        id="customTimer"
                        type="number" 
                        min="5" 
                        max="600" 
                        value={timerDuration}
                        onChange={(e) => setTimerDuration(parseInt(e.target.value) || 30)}
                        className="timer-input"
                      />
                      <span>secondi</span>
                      <button 
                        className="apply-btn"
                        onClick={() => handleSaveSettings(timerDuration)}
                      >
                        Applica
                      </button>
                    </div>
                  </div>
                  
                  <div className="setting-section">
                    <h3>Dimensione Pedine</h3>
                    <p className="setting-description">Imposta la dimensione base delle pedine (in pixel)</p>
                    <div className="size-slider-container">
                      <input 
                        type="range" 
                        min="24" 
                        max="64" 
                        step="4" 
                        value={baseTokenSize}
                        onChange={(e) => setBaseTokenSize(parseInt(e.target.value))}
                        className="size-slider"
                      />
                      <span className="size-value">{baseTokenSize}px</span>
                    </div>
                    <div className="size-preview-container">
                      <div className="size-preview-item">
                        <div 
                          className="preview-token"
                          style={{
                            width: `${baseTokenSize}px`,
                            height: `${baseTokenSize}px`,
                            fontSize: `${baseTokenSize * 0.015625}rem`
                          }}
                        >
                          <span>1x</span>
                        </div>
                        <span className="preview-label">Medio</span>
                      </div>
                      <div className="size-preview-item">
                        <div 
                          className="preview-token"
                          style={{
                            width: `${baseTokenSize * 2}px`,
                            height: `${baseTokenSize * 2}px`,
                            fontSize: `${baseTokenSize * 2 * 0.015625}rem`
                          }}
                        >
                          <span>2x</span>
                        </div>
                        <span className="preview-label">Grande</span>
                      </div>
                      <div className="size-preview-item">
                        <div 
                          className="preview-token"
                          style={{
                            width: `${baseTokenSize * 4}px`,
                            height: `${baseTokenSize * 4}px`,
                            fontSize: `${baseTokenSize * 4 * 0.015625}rem`
                          }}
                        >
                          <span>4x</span>
                        </div>
                        <span className="preview-label">Enorme</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="setting-section">
                    <h3>Griglia Mappa</h3>
                    <p className="setting-description">Mostra una griglia sulla mappa per facilitare il movimento</p>
                    <div className="grid-toggle-container">
                      <label className="toggle-label">
                        <input 
                          type="checkbox" 
                          checked={showGrid}
                          onChange={(e) => setShowGrid(e.target.checked)}
                          className="grid-checkbox"
                        />
                        <span className="toggle-text">Mostra Griglia</span>
                      </label>
                    </div>
                    {showGrid && (
                      <>
                        <div className="size-slider-container">
                          <label className="slider-label">Dimensione celle:</label>
                          <input 
                            type="range" 
                            min="20" 
                            max="100" 
                            step="5" 
                            value={gridSize}
                            onChange={(e) => setGridSize(parseInt(e.target.value))}
                            className="size-slider"
                          />
                          <span className="size-value">{gridSize}px</span>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </>
          )}

          <MapCanvas
            ref={mapCanvasRef}
            mapUrl={mapData.url}
            mapWidth={mapData.width}
            mapHeight={mapData.height}
            currentTurnIndex={currentTurnIndex}
            onTokensCountChange={handleTokensCountChange}
            baseTokenSize={baseTokenSize}
            showGrid={showGrid}
            gridSize={gridSize}
          />
        </>
      )}
    </div>
  );
}

export default App;
