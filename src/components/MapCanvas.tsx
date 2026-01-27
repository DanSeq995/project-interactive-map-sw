import React, { useRef, useState, useImperativeHandle, forwardRef, useEffect } from 'react';
import '../styles/MapCanvas.css';

/**
 * Interfaccia per una pedina sulla mappa
 * @interface Token
 * @property {string} id - Identificatore univoco della pedina
 * @property {number} x - Posizione X relativa alla mappa (0-100 percentuale)
 * @property {number} y - Posizione Y relativa alla mappa (0-100 percentuale)
 * @property {string} label - Etichetta visualizzata sulla pedina
 * @property {string} color - Colore della pedina in formato hex
 * @property {'party'|'enemy'} type - Tipo di pedina (party o enemy)
 * @property {number} wounds - Numero di ferite subite dalla pedina (default: 0)
 * @property {boolean} shaken - Indica se la pedina è nello stato "scosso" (default: false)
 */
export interface Token {
  id: string;
  x: number;
  y: number;
  label: string;
  color: string;
  type: 'party' | 'enemy';
  wounds: number;
  shaken: boolean;
  size: number; // 1, 2, o 4 (piccolo, medio, grande)
}

/**
 * Props per il componente MapCanvas
 * @interface MapCanvasProps
 * @property {string} mapUrl - URL della mappa da visualizzare
 * @property {number} mapWidth - Larghezza originale della mappa
 * @property {number} mapHeight - Altezza originale della mappa
 */
interface MapCanvasProps {
  mapUrl: string;
  mapWidth: number;
  mapHeight: number;
  currentTurnIndex: number;
  onTokensCountChange: (count: number) => void;
  baseTokenSize: number;
  showGrid: boolean;
  gridSize: number;
}

/**
 * Interfaccia per i metodi esposti tramite ref
 */
export interface MapCanvasRef {
  openCharactersList: () => void;
}

/**
 * Componente principale della mappa interattiva
 * Permette di visualizzare una mappa e gestire pedine con drag-and-drop e long-press menu
 * Le coordinate sono relative (0-100%) per adattarsi a qualsiasi risoluzione tablet
 * 
 * @component
 * @param {MapCanvasProps} props - Le props del componente
 * @param {React.Ref} ref - Ref per esporre metodi pubblici al componente padre
 * @returns {React.ReactElement} L'elemento della mappa interattiva
 */
export const MapCanvas = forwardRef<MapCanvasRef, MapCanvasProps>((props, ref) => {
  const { mapUrl, currentTurnIndex, onTokensCountChange, baseTokenSize, showGrid, gridSize } = props;
  const canvasRef = useRef<HTMLDivElement>(null);
  const [tokens, setTokens] = useState<Token[]>([]);
  const [draggingToken, setDraggingToken] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [nextId, setNextId] = useState(1);
  const [selectedToken, setSelectedToken] = useState<string | null>(null);
  const [showTypeMenu, setShowTypeMenu] = useState(false);
  const [showSizeMenu, setShowSizeMenu] = useState(false);
  const [showSizeMenuCreation, setShowSizeMenuCreation] = useState(false);
  const [showColorMenu, setShowColorMenu] = useState(false);
  const [showNameMenu, setShowNameMenu] = useState(false);
  const [showTokenColorMenu, setShowTokenColorMenu] = useState(false);
  const [showTokenSizeMenu, setShowTokenSizeMenu] = useState(false);
  const [showTokenNameMenu, setShowTokenNameMenu] = useState(false);
  const [selectedType, setSelectedType] = useState<'party' | 'enemy' | null>(null);
  const [selectedSize, setSelectedSize] = useState<number>(1);
  const [selectedColor, setSelectedColor] = useState<string | null>(null);
  const [tokenName, setTokenName] = useState('');
  const [editingTokenName, setEditingTokenName] = useState('');
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressTriggeredRef = useRef(false);
  const [showCharactersList, setShowCharactersList] = useState(false);
  const [draggedListIndex, setDraggedListIndex] = useState<number | null>(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDraggingMap, setIsDraggingMap] = useState(false);
  const [dragStartPos, setDragStartPos] = useState({ x: 0, y: 0 });
  const mapContainerRef = useRef<HTMLDivElement>(null);

  /**
   * Espone la funzione per aprire la lista dei personaggi al componente padre
   */
  useImperativeHandle(ref, () => ({
    openCharactersList: () => setShowCharactersList(true)
  }));

  /**
   * Notifica al componente padre quando cambia il numero di tokens
   */
  useEffect(() => {
    onTokensCountChange(tokens.length);
  }, [tokens.length, onTokensCountChange]);

  /**
   * Palette di colori disponibili per le pedine
   */
  const colorPalette = [
    '#FF6B6B', // Rosso
    '#4ECDC4', // Turchese
    '#45B7D1', // Blu
    '#FFA07A', // Arancione
    '#98D8C8', // Verde acqua
    '#F7DC6F', // Giallo
    '#BB8FCE', // Viola
    '#85C1E2', // Azzurro
    '#F8B195', // Pesca
    '#C7CEEA', // Lavanda
  ];

  /**
   * Aggiunge una nuova pedina alla mappa
   * Se il tipo non è specificato, apre il menu per scegliere il tipo
   * Altrimenti va direttamente al menu dei colori
   * @param {'party'|'enemy'|null} type - Il tipo di pedina (opzionale)
   */
  const handleAddToken = (type?: 'party' | 'enemy') => {
    if (type) {
      // Se il tipo è specificato, vai direttamente ai colori
      setSelectedType(type);
      setShowColorMenu(true);
    } else {
      // Altrimenti, apri il menu per scegliere il tipo
      setShowTypeMenu(true);
    }
  };

  /**
   * Crea una nuova pedina selezionando il tipo
   * Apre il menu per scegliere il colore
   * @param {'party'|'enemy'} type - Il tipo di pedina selezionato
   */
  const handleSelectType = (type: 'party' | 'enemy') => {
    setSelectedType(type);
    setShowTypeMenu(false);
    setShowColorMenu(true);
  };

  /**
   * Gestisce la selezione della dimensione della pedina
   * Dopo aver scelto la dimensione, apre il menu del colore
   * 
   * @param {number} size - La dimensione selezionata (1, 2, o 4)
   */
  const handleSelectSize = (size: number) => {
    setSelectedSize(size);
    setShowSizeMenu(false);
    setShowColorMenu(true);
  };

  /**
   * Crea una nuova pedina con il tipo e colore specificati
   * Apre il menu per inserire il nome della pedina
   * @param {string} color - Il colore della pedina
   */
  const createToken = (color: string) => {
    if (!selectedType) return;

    setSelectedColor(color);
    setShowColorMenu(false);
    setShowNameMenu(true);
  };

  /**
   * Finalizza la creazione della pedina con il nome inserito
   * Aggiunge la pedina alla lista e resetta gli stati
   */
  const finishCreateToken = () => {
    if (!selectedType || !selectedColor || !tokenName.trim()) return;
    
    // Chiudi il menu nome e apri il menu dimensione
    setShowNameMenu(false);
    setShowSizeMenuCreation(true);
  };

  /**
   * Completa la creazione del token con la dimensione selezionata
   * Se la griglia è attiva, posiziona il token al centro della mappa (cella centrale)
   */
  const completeTokenCreation = (size: number) => {
    if (!selectedType || !selectedColor || !tokenName.trim()) return;

    let startX = 50;
    let startY = 50;

    // Se la griglia è attiva, posiziona al centro della cella più vicina al centro della mappa
    if (showGrid && canvasRef.current) {
      const rect = canvasRef.current.getBoundingClientRect();
      const cellWidthPercent = (gridSize / rect.width) * 100;
      const cellHeightPercent = (gridSize / rect.height) * 100;
      
      const cellX = Math.floor(50 / cellWidthPercent);
      const cellY = Math.floor(50 / cellHeightPercent);
      
      startX = cellX * cellWidthPercent + cellWidthPercent / 2;
      startY = cellY * cellHeightPercent + cellHeightPercent / 2;
    }

    const newToken: Token = {
      id: `token-${nextId}`,
      x: startX,
      y: startY,
      label: tokenName.trim(),
      color: selectedColor,
      type: selectedType,
      wounds: 0,
      shaken: false,
      size: size,
    };

    setTokens([...tokens, newToken]);
    setNextId(nextId + 1);
    setShowSizeMenuCreation(false);
    setSelectedType(null);
    setSelectedColor(null);
    setTokenName('');
  };

  /**
   * Gestisce l'inizio del drag di una pedina
   * Calcola l'offset tra il punto di click e il centro della pedina
   * Cancella il timer del long press per evitare l'apertura del menu
   * 
   * @param {React.MouseEvent<HTMLDivElement>} e - L'evento del mouse
   * @param {string} tokenId - L'ID della pedina da trascinare
   */
  const handleTokenMouseDown = (
    e: React.MouseEvent<HTMLDivElement>,
    tokenId: string
  ) => {
    e.stopPropagation();
    const token = tokens.find((t) => t.id === tokenId);
    if (!token) return;

    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    const tokenPixelX = ((token.x / 100) * (rect.width / zoom));
    const tokenPixelY = ((token.y / 100) * (rect.height / zoom));

    setDraggingToken(tokenId);
    setDragOffset({
      x: (e.clientX - rect.left - pan.x) / zoom - tokenPixelX,
      y: (e.clientY - rect.top - pan.y) / zoom - tokenPixelY,
    });
  };

  /**
   * Gestisce il movimento del mouse durante il drag
   * Aggiorna la posizione della pedina in coordinate relative (0-100)
   * Limita i valori affinché la pedina rimanga entro i limiti della mappa
   * Se la griglia è attiva, "snappa" la pedina al centro della cella più vicina
   * 
   * @param {React.MouseEvent<HTMLDivElement>} e - L'evento del mouse
   */
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!draggingToken) return;

    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    // Compensiamo per zoom e pan
    const x = (e.clientX - rect.left - pan.x) / zoom - dragOffset.x;
    const y = (e.clientY - rect.top - pan.y) / zoom - dragOffset.y;

    let newX = Math.max(0, Math.min(100, (x / (rect.width / zoom)) * 100));
    let newY = Math.max(0, Math.min(100, (y / (rect.height / zoom)) * 100));

    // Se la griglia è attiva, "snappa" al centro della cella
    if (showGrid) {
      const cellWidthPercent = (gridSize / rect.width) * 100;
      const cellHeightPercent = (gridSize / rect.height) * 100;
      
      // Trova in quale cella si trova la posizione
      const cellX = Math.floor(newX / cellWidthPercent);
      const cellY = Math.floor(newY / cellHeightPercent);
      
      // Posiziona al centro della cella
      newX = cellX * cellWidthPercent + cellWidthPercent / 2;
      newY = cellY * cellHeightPercent + cellHeightPercent / 2;
    }

    setTokens(
      tokens.map((token) =>
        token.id === draggingToken ? { ...token, x: newX, y: newY } : token
      )
    );
  };

  /**
   * Gestisce la fine del drag e il rilascio della pedina
   */
  const handleMouseUp = () => {
    setDraggingToken(null);
    setIsDraggingMap(false);
  };

  /**
   * Gestisce lo zoom con la rotellina del mouse
   */
  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.1 : 0.1;
    setZoom(prev => Math.max(0.5, Math.min(3, prev + delta)));
  };

  /**
   * Gestisce l'inizio del drag della mappa (con tasto destro o middle mouse)
   */
  const handleMapMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.button === 1 || e.button === 2) { // Middle o right click
      e.preventDefault();
      setIsDraggingMap(true);
      setDragStartPos({ x: e.clientX - pan.x, y: e.clientY - pan.y });
    }
  };

  /**
   * Gestisce il movimento durante il drag della mappa
   */
  const handleMapMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (isDraggingMap) {
      setPan({
        x: e.clientX - dragStartPos.x,
        y: e.clientY - dragStartPos.y,
      });
    }
  };

  /**
   * Gestisce il long-press su un elemento della lista laterale
   * Mostra il menu di azioni (rinomina, colore, elimina) dopo 500ms di pressione
   * Ottimizzato per interfaccia tablet con gesture touch
   * 
   * @param {string} tokenId - L'ID della pedina da selezionare
   */
  const handleTokenMouseDown_LongPress = (tokenId: string) => {
    longPressTimerRef.current = setTimeout(() => {
      setSelectedToken(tokenId);
      longPressTriggeredRef.current = true;
    }, 500);
  };

  /**
   * Cancella il timer del long-press quando il mouse/touch viene rilasciato
   * Previene l'apertura accidentale del menu se l'utente rilascia prima di 500ms
   * Importante per interfacce touch su tablet
   */
  const handleTokenMouseUp_CancelLongPress = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
    }
    // Resetta il flag dopo un breve delay per permettere all'onClick di controllarlo
    setTimeout(() => {
      longPressTriggeredRef.current = false;
    }, 50);
  };

  /**
   * Chiude il menu di azioni della pedina selezionata
   * Chiude anche la palette dei colori se aperta
   * Utilizzato quando l'utente clicca/tocca al di fuori del menu (UX tablet)
   */
  const handleCloseMenu = () => {
    setSelectedToken(null);
    setShowTokenColorMenu(false);
    setShowTokenSizeMenu(false);
  };

  /**
   * Elimina una pedina dalla mappa
   * Resetta lo stato del token selezionato e chiude tutti i menu aperti
   * 
   * @param {string} tokenId - L'ID della pedina da eliminare
   */
  const handleDeleteToken = (tokenId: string) => {
    setTokens(tokens.filter((t) => t.id !== tokenId));
    setSelectedToken(null);
  };

  /**
   * Cambia il colore di una pedina esistente
   * Chiude automaticamente la palette dei colori dopo la selezione
   * Mantiene tutte le altre proprietà della pedina immutate
   * 
   * @param {string} tokenId - L'ID univoco della pedina da modificare
   * @param {string} color - Il nuovo colore in formato hex (es. '#FF6B6B')
   */
  const handleChangeTokenColor = (tokenId: string, color: string) => {
    setTokens(
      tokens.map((token) =>
        token.id === tokenId ? { ...token, color } : token
      )
    );
    setShowTokenColorMenu(false);
  };

  /**
   * Cambia la dimensione di una pedina esistente
   */
  const handleChangeTokenSize = (tokenId: string, newSize: number) => {
    setTokens(
      tokens.map((token) =>
        token.id === tokenId ? { ...token, size: newSize } : token
      )
    );
    setShowTokenSizeMenu(false);
    handleCloseMenu();
  };

  /**
   * Apre il menu modale per cambiare il nome di una pedina esistente
   * Pre-popola il campo di input con il nome attuale per facilitare la modifica
   * Chiude il menu di azioni della sidebar prima di aprire il modale
   * 
   * @param {string} tokenId - L'ID univoco della pedina da rinominare
   */
  const handleOpenTokenNameMenu = (tokenId: string) => {
    const token = tokens.find((t) => t.id === tokenId);
    if (token) {
      setEditingTokenName(token.label);
      setShowTokenNameMenu(true);
    }
  };

  /**
   * Cambia il nome di una pedina esistente
   * Valida che il nome non sia vuoto (rimuove spazi iniziali/finali)
   * Chiude automaticamente il menu di modifica e resetta lo stato dopo il cambio
   * 
   * @param {string} tokenId - L'ID univoco della pedina da rinominare
   * @param {string} newName - Il nuovo nome della pedina (verrà trimmed)
   */
  const handleChangeTokenName = (tokenId: string, newName: string) => {
    if (!newName.trim()) return;
    
    setTokens(
      tokens.map((token) =>
        token.id === tokenId ? { ...token, label: newName.trim() } : token
      )
    );
    setShowTokenNameMenu(false);
    setEditingTokenName('');
  };

  /**
   * Aggiunge una ferita alla pedina selezionata
   * Incrementa il contatore delle ferite di 1
   * Ottimizzato per interfaccia tablet con feedback visivo immediato
   * 
   * @param {string} tokenId - L'ID univoco della pedina da ferire
   */
  const handleAddWound = (tokenId: string) => {
    setTokens(
      tokens.map((token) =>
        token.id === tokenId ? { ...token, wounds: token.wounds + 1 } : token
      )
    );
  };

  /**
   * Rimuove una ferita dalla pedina selezionata
   * Decrementa il contatore delle ferite di 1 (minimo 0)
   * Non permette di andare sotto zero per evitare valori negativi
   * 
   * @param {string} tokenId - L'ID univoco della pedina da guarire
   */
  const handleRemoveWound = (tokenId: string) => {
    setTokens(
      tokens.map((token) =>
        token.id === tokenId ? { ...token, wounds: Math.max(0, token.wounds - 1) } : token
      )
    );
  };

  /**
   * Gestisce il doppio click sulla pedina per attivare/disattivare lo stato "scosso"
   * Lo stato scosso viene visualizzato con un'animazione di stelline sopra la pedina
   * Ottimizzato per interfaccia tablet con feedback visivo immediato
   * 
   * @param {string} tokenId - L'ID univoco della pedina da rendere scossa o rimuovere lo stato
   */
  const handleTokenDoubleClick = (tokenId: string) => {
    setTokens(
      tokens.map((token) =>
        token.id === tokenId ? { ...token, shaken: !token.shaken } : token
      )
    );
  };

  /**
   * Gestisce l'inizio del drag di un elemento nella lista dei personaggi
   * Salva l'indice dell'elemento che viene trascinato
   * 
   * @param {number} index - L'indice dell'elemento nella lista
   */
  const handleListDragStart = (index: number) => {
    setDraggedListIndex(index);
  };

  /**
   * Gestisce il drop di un elemento nella lista dei personaggi
   * Riordina l'array dei token spostando l'elemento trascinato nella nuova posizione
   * 
   * @param {number} targetIndex - L'indice dove rilasciare l'elemento
   */
  const handleListDrop = (targetIndex: number) => {
    if (draggedListIndex === null || draggedListIndex === targetIndex) {
      setDraggedListIndex(null);
      return;
    }

    const newTokens = [...tokens];
    const [draggedItem] = newTokens.splice(draggedListIndex, 1);
    newTokens.splice(targetIndex, 0, draggedItem);
    
    setTokens(newTokens);
    setDraggedListIndex(null);
  };

  return (
    <div className="map-canvas-container">
      {/* Sidebar sinistra - Lista Party */}
      <div className="sidebar sidebar-left" onClick={handleCloseMenu}>
        <h3>👥 Party</h3>
        <button
          className="add-sidebar-btn party-btn"
          onClick={(e) => {
            e.stopPropagation();
            handleAddToken('party');
          }}
        >
          ➕ Aggiungi
        </button>
        <div className="tokens-list">
          {tokens.filter((t) => t.type === 'party').length === 0 ? (
            <p className="empty-list">Nessuna pedina</p>
          ) : (
            tokens
              .filter((t) => t.type === 'party')
              .map((token) => {
                const tokenIndex = tokens.indexOf(token);
                return (
                <div key={token.id}>
                  <div
                    className={`token-list-item ${selectedToken === token.id ? 'selected' : ''} ${tokenIndex === currentTurnIndex ? 'active-turn' : ''}`}
                    onMouseDown={() => handleTokenMouseDown_LongPress(token.id)}
                    onMouseUp={handleTokenMouseUp_CancelLongPress}
                    onMouseLeave={handleTokenMouseUp_CancelLongPress}
                    onClick={(e) => {
                      e.stopPropagation();
                      // Ignora il click se è stato appena completato un long press
                      if (longPressTriggeredRef.current) {
                        return;
                      }
                      // Se l'elemento è già selezionato, chiudi il menu
                      if (selectedToken === token.id) {
                        handleCloseMenu();
                      }
                    }}
                  >
                    <div
                      className="token-color-indicator"
                      style={{ backgroundColor: token.color }}
                    />
                    <span className="token-list-name">{token.label}</span>
                  </div>
                  
                  {/* Menu per la pedina selezionata */}
                  {selectedToken === token.id && (
                    <div className="sidebar-token-menu" onClick={(e) => e.stopPropagation()}>
                      <button
                        className="sidebar-menu-btn edit-name-btn"
                        onClick={() => handleOpenTokenNameMenu(token.id)}
                      >
                        ✎ Rinomina
                      </button>
                      <button
                        className="sidebar-menu-btn color-change-btn"
                        onClick={() => setShowTokenColorMenu(true)}
                      >
                        🎨 Colore
                      </button>
                      <div className="wounds-control">
                        <button
                          className="sidebar-menu-btn wounds-btn"
                          onClick={() => handleRemoveWound(token.id)}
                          disabled={token.wounds === 0}
                        >
                          ➖
                        </button>
                        <span className="wounds-counter">💔 {token.wounds}</span>
                        <button
                          className="sidebar-menu-btn wounds-btn"
                          onClick={() => handleAddWound(token.id)}
                        >
                          ➕
                        </button>
                      </div>
                      <button
                        className="sidebar-menu-btn delete-btn"
                        onClick={() => handleDeleteToken(token.id)}
                      >
                        🗑️ Elimina
                      </button>

                      {/* Palette colori nel menu sidebar */}
                      {showTokenColorMenu && (
                        <div className="sidebar-color-palette">
                          {colorPalette.map((color, index) => (
                            <button
                              key={index}
                              className="sidebar-color-btn"
                              style={{ backgroundColor: color }}
                              onClick={() => handleChangeTokenColor(token.id, color)}
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );}
              )
          )}
        </div>
      </div>

      {/* Canvas principale della mappa con gestione del mouse */}
      <div
        className="map-canvas"
        onWheel={handleWheel}
        onMouseDown={handleMapMouseDown}
        onMouseMove={(e) => {
          handleMapMouseMove(e);
          handleMouseMove(e);
        }}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onClick={handleCloseMenu}
        onContextMenu={(e) => e.preventDefault()}
        style={{
          width: '100%',
          height: '100%',
          position: 'relative',
          cursor: isDraggingMap ? 'grabbing' : draggingToken ? 'grabbing' : 'default',
          touchAction: 'none',
          flex: 1,
          overflow: 'hidden',
        }}
      >
        <div
          ref={canvasRef}
          style={{
            backgroundImage: `url(${mapUrl})`,
            backgroundSize: 'contain',
            backgroundRepeat: 'no-repeat',
            backgroundPosition: 'center',
            width: '100%',
            height: '100%',
            position: 'relative',
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            transformOrigin: 'center center',
          }}
        >
        {/* Griglia SVG */}
        {showGrid && (
          <svg
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              pointerEvents: 'none',
              zIndex: 1,
            }}
          >
            <defs>
              <pattern
                id="grid"
                width={gridSize}
                height={gridSize}
                patternUnits="userSpaceOnUse"
              >
                <path
                  d={`M ${gridSize} 0 L 0 0 0 ${gridSize}`}
                  fill="none"
                  stroke="rgba(255, 255, 255, 0.3)"
                  strokeWidth="1"
                />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid)" />
          </svg>
        )}

        {/* Rendering delle pedine sulla mappa */}
        {tokens.map((token, index) => (
          <div
            key={token.id}
            className={`token ${selectedToken === token.id ? 'selected' : ''} ${token.shaken ? 'shaken' : ''} ${index === currentTurnIndex ? 'active-turn-token' : ''}`}
            onMouseDown={(e) => handleTokenMouseDown(e, token.id)}
            onDoubleClick={() => handleTokenDoubleClick(token.id)}
            style={{
              left: `${token.x}%`,
              top: `${token.y}%`,
              backgroundColor: token.color,
              cursor: 'grab',
              width: `${baseTokenSize * token.size}px`,
              height: `${baseTokenSize * token.size}px`,
              fontSize: `${baseTokenSize * token.size * 0.015625}rem`,
            }}
          >
            <span className="token-label">{token.label.substring(0, 2).toUpperCase()}</span>
            
            {/* Animazione stelline per stato scosso */}
            {token.shaken && (
              <div className="shaken-indicator">
                <span className="star star-1">✨</span>
                <span className="star star-2">⭐</span>
                <span className="star star-3">✨</span>
              </div>
            )}
            
            {/* Indicatore ferite sotto la pedina */}
            {token.wounds > 0 && (
              <div className="wounds-indicator">
                {Array.from({ length: Math.min(token.wounds, 5) }).map((_, index) => (
                  <span key={index} className="wound-dot">💔</span>
                ))}
                {token.wounds > 5 && <span className="wounds-overflow">+{token.wounds - 5}</span>}
              </div>
            )}
          </div>
        ))}
        </div>
      </div>

      {/* Sidebar destra - Lista Enemy */}
      <div className="sidebar sidebar-right" onClick={handleCloseMenu}>
        <h3>⚔️ Enemy</h3>
        <button
          className="add-sidebar-btn enemy-btn"
          onClick={(e) => {
            e.stopPropagation();
            handleAddToken('enemy');
          }}
        >
          ➕ Aggiungi
        </button>
        <div className="tokens-list">
          {tokens.filter((t) => t.type === 'enemy').length === 0 ? (
            <p className="empty-list">Nessuna pedina</p>
          ) : (
            tokens
              .filter((t) => t.type === 'enemy')
              .map((token) => {
                const tokenIndex = tokens.indexOf(token);
                return (
                <div key={token.id}>
                  <div
                    className={`token-list-item ${selectedToken === token.id ? 'selected' : ''} ${tokenIndex === currentTurnIndex ? 'active-turn' : ''}`}
                    onMouseDown={() => handleTokenMouseDown_LongPress(token.id)}
                    onMouseUp={handleTokenMouseUp_CancelLongPress}
                    onMouseLeave={handleTokenMouseUp_CancelLongPress}
                    onClick={(e) => {
                      e.stopPropagation();
                      // Ignora il click se è stato appena completato un long press
                      if (longPressTriggeredRef.current) {
                        return;
                      }
                      // Se l'elemento è già selezionato, chiudi il menu
                      if (selectedToken === token.id) {
                        handleCloseMenu();
                      }
                    }}
                  >
                    <div
                      className="token-color-indicator"
                      style={{ backgroundColor: token.color }}
                    />
                    <span className="token-list-name">{token.label}</span>
                  </div>
                  
                  {/* Menu per la pedina selezionata */}
                  {selectedToken === token.id && (
                    <div className="sidebar-token-menu" onClick={(e) => e.stopPropagation()}>
                      <button
                        className="sidebar-menu-btn edit-name-btn"
                        onClick={() => handleOpenTokenNameMenu(token.id)}
                      >
                        ✎ Rinomina
                      </button>
                      <button
                        className="sidebar-menu-btn color-change-btn"
                        onClick={() => setShowTokenColorMenu(true)}
                      >
                        🎨 Colore
                      </button>
                      <div className="wounds-control">
                        <button
                          className="sidebar-menu-btn wounds-btn"
                          onClick={() => handleRemoveWound(token.id)}
                          disabled={token.wounds === 0}
                        >
                          ➖
                        </button>
                        <span className="wounds-counter">💔 {token.wounds}</span>
                        <button
                          className="sidebar-menu-btn wounds-btn"
                          onClick={() => handleAddWound(token.id)}
                        >
                          ➕
                        </button>
                      </div>
                      <button
                        className="sidebar-menu-btn delete-btn"
                        onClick={() => handleDeleteToken(token.id)}
                      >
                        🗑️ Elimina
                      </button>

                      {/* Palette colori nel menu sidebar */}
                      {showTokenColorMenu && (
                        <div className="sidebar-color-palette">
                          {colorPalette.map((color, index) => (
                            <button
                              key={index}
                              className="sidebar-color-btn"
                              style={{ backgroundColor: color }}
                              onClick={() => handleChangeTokenColor(token.id, color)}
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );}
              )
          )}
        </div>
      </div>

      {/* Menu per scegliere il tipo di pedina */}
      {showTypeMenu && (
        <div className="type-menu-overlay" onClick={() => setShowTypeMenu(false)}>
          <div className="type-menu" onClick={(e) => e.stopPropagation()}>
            <h3>Seleziona tipo di pedina</h3>
            <div className="type-menu-buttons">
              <button
                className="type-btn party-btn"
                onClick={() => handleSelectType('party')}
              >
                👥 Party
              </button>
              <button
                className="type-btn enemy-btn"
                onClick={() => handleSelectType('enemy')}
              >
                ⚔️ Enemy
              </button>
            </div>
            <button
              className="type-menu-close"
              onClick={() => setShowTypeMenu(false)}
            >
              Annulla
            </button>
          </div>
        </div>
      )}

      {/* Menu per scegliere la dimensione della pedina */}
      {showSizeMenu && (
        <div className="size-menu-overlay" onClick={() => setShowSizeMenu(false)}>
          <div className="size-menu" onClick={(e) => e.stopPropagation()}>
            <h3>Seleziona dimensione pedina</h3>
            <div className="size-menu-buttons">
              <button
                className="size-btn"
                onClick={() => handleSelectSize(1)}
              >
                <div className="size-preview size-1x"></div>
                <span>Medio (1x)</span>
              </button>
              <button
                className="size-btn"
                onClick={() => handleSelectSize(2)}
              >
                <div className="size-preview size-2x"></div>
                <span>Grande (2x)</span>
              </button>
              <button
                className="size-btn"
                onClick={() => handleSelectSize(4)}
              >
                <div className="size-preview size-4x"></div>
                <span>Enorme (4x)</span>
              </button>
            </div>
            <button
              className="size-menu-close"
              onClick={() => {
                setShowSizeMenu(false);
                setSelectedType(null);
              }}
            >
              Annulla
            </button>
          </div>
        </div>
      )}

      {/* Menu per scegliere il colore della pedina */}
      {showColorMenu && (
        <div className="color-menu-overlay" onClick={() => setShowColorMenu(false)}>
          <div className="color-menu" onClick={(e) => e.stopPropagation()}>
            <h3>Scegli il colore per {selectedType === 'party' ? '👥 Party' : '⚔️ Enemy'}</h3>
            <div className="color-palette">
              {colorPalette.map((color, index) => (
                <button
                  key={index}
                  className="color-btn"
                  style={{ backgroundColor: color }}
                  onClick={() => createToken(color)}
                  title={`Colore ${index + 1}`}
                />
              ))}
            </div>
            <button
              className="color-menu-close"
              onClick={() => {
                setShowColorMenu(false);
                setSelectedType(null);
              }}
            >
              Annulla
            </button>
          </div>
        </div>
      )}

      {/* Menu per inserire il nome della pedina */}
      {showNameMenu && (
        <div className="name-menu-overlay" onClick={() => setShowNameMenu(false)}>
          <div className="name-menu" onClick={(e) => e.stopPropagation()}>
            <h3>Inserisci il nome della pedina</h3>
            <p className="name-preview">Anteprima: <strong>{tokenName.substring(0, 2).toUpperCase() || '--'}</strong></p>
            <input
              type="text"
              className="name-input"
              placeholder="Es: Barbaro, Orco, Stregone..."
              value={tokenName}
              onChange={(e) => setTokenName(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  finishCreateToken();
                }
              }}
              autoFocus
            />
            <div className="name-menu-buttons">
              <button
                className="confirm-btn"
                onClick={finishCreateToken}
                disabled={!tokenName.trim()}
              >
                ✓ Conferma
              </button>
              <button
                className="cancel-btn"
                onClick={() => {
                  setShowNameMenu(false);
                  setSelectedType(null);
                  setSelectedColor(null);
                  setTokenName('');
                }}
              >
                ✕ Annulla
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Menu per scegliere la dimensione dopo il nome */}
      {showSizeMenuCreation && (
        <div className="size-menu-overlay" onClick={() => setShowSizeMenuCreation(false)}>
          <div className="size-menu" onClick={(e) => e.stopPropagation()}>
            <h3>Seleziona dimensione pedina</h3>
            <div className="size-menu-buttons">
              <button
                className="size-btn"
                onClick={() => completeTokenCreation(1)}
              >
                <div className="size-preview size-1x"></div>
                <span>Medio (1x)</span>
              </button>
              <button
                className="size-btn"
                onClick={() => completeTokenCreation(2)}
              >
                <div className="size-preview size-2x"></div>
                <span>Grande (2x)</span>
              </button>
              <button
                className="size-btn"
                onClick={() => completeTokenCreation(4)}
              >
                <div className="size-preview size-4x"></div>
                <span>Enorme (4x)</span>
              </button>
            </div>
            <button
              className="size-menu-close"
              onClick={() => {
                setShowSizeMenuCreation(false);
                setSelectedType(null);
                setSelectedColor(null);
                setTokenName('');
              }}
            >
              Annulla
            </button>
          </div>
        </div>
      )}

      {/* Menu per cambiare il nome di una pedina esistente */}
      {showTokenNameMenu && selectedToken && (
        <div className="name-menu-overlay" onClick={() => setShowTokenNameMenu(false)}>
          <div className="name-menu" onClick={(e) => e.stopPropagation()}>
            <h3>Cambia il nome della pedina</h3>
            <p className="name-preview">Anteprima: <strong>{editingTokenName.substring(0, 2).toUpperCase() || '--'}</strong></p>
            <input
              type="text"
              className="name-input"
              placeholder="Nuovo nome..."
              value={editingTokenName}
              onChange={(e) => setEditingTokenName(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  handleChangeTokenName(selectedToken, editingTokenName);
                }
              }}
              autoFocus
            />
            <div className="name-menu-buttons">
              <button
                className="confirm-btn"
                onClick={() => handleChangeTokenName(selectedToken, editingTokenName)}
                disabled={!editingTokenName.trim()}
              >
                ✓ Conferma
              </button>
              <button
                className="cancel-btn"
                onClick={() => {
                  setShowTokenNameMenu(false);
                  setEditingTokenName('');
                }}
              >
                ✕ Annulla
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Menu per scegliere la dimensione dopo il nome */}
      {showSizeMenuCreation && (
        <div className="size-menu-overlay" onClick={() => setShowSizeMenuCreation(false)}>
          <div className="size-menu" onClick={(e) => e.stopPropagation()}>
            <h3>Seleziona dimensione pedina</h3>
            <div className="size-menu-buttons">
              <button
                className="size-btn"
                onClick={() => completeTokenCreation(1)}
              >
                <div className="size-preview size-1x"></div>
                <span>Medio (1x)</span>
              </button>
              <button
                className="size-btn"
                onClick={() => completeTokenCreation(2)}
              >
                <div className="size-preview size-2x"></div>
                <span>Grande (2x)</span>
              </button>
              <button
                className="size-btn"
                onClick={() => completeTokenCreation(4)}
              >
                <div className="size-preview size-4x"></div>
                <span>Enorme (4x)</span>
              </button>
            </div>
            <button
              className="size-menu-close"
              onClick={() => {
                setShowSizeMenuCreation(false);
                setSelectedType(null);
                setSelectedColor(null);
                setTokenName('');
              }}
            >
              Annulla
            </button>
          </div>
        </div>
      )}

      {/* Modal lista personaggi con drag and drop per riordinare */}
      {showCharactersList && (
        <div className="characters-list-overlay" onClick={() => setShowCharactersList(false)}>
          <div className="characters-list-modal" onClick={(e) => e.stopPropagation()}>
            <div className="characters-list-header">
              <h2>📋 Ordine Turni</h2>
              <button 
                className="close-modal-btn"
                onClick={() => setShowCharactersList(false)}
              >
                ✕
              </button>
            </div>
            <p className="characters-list-instruction">
              Trascina per riordinare
            </p>
            <div className="characters-list-content">
              {tokens.length === 0 ? (
                <p className="empty-characters-list">Nessun personaggio creato</p>
              ) : (
                tokens.map((token, index) => (
                  <div
                    key={token.id}
                    className={`character-list-item ${draggedListIndex === index ? 'dragging' : ''} ${index === currentTurnIndex ? 'current-turn' : ''}`}
                    draggable
                    onDragStart={() => handleListDragStart(index)}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={() => handleListDrop(index)}
                  >
                    <span className="character-drag-handle">☰</span>
                    <div
                      className="character-color-dot"
                      style={{ backgroundColor: token.color }}
                    />
                    <div className="character-info">
                      <span className="character-name">
                        {index === currentTurnIndex && <span className="turn-marker">▶ </span>}
                        {token.label}
                      </span>
                      <span className="character-type">
                        {token.type === 'party' ? '👥 Party' : '⚔️ Enemy'}
                      </span>
                    </div>
                    <div className="character-stats">
                      {token.wounds > 0 && (
                        <span className="character-wounds">💔 {token.wounds}</span>
                      )}
                      {token.shaken && (
                        <span className="character-shaken">✨</span>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
});

MapCanvas.displayName = 'MapCanvas';
