import React, { useRef, useState } from 'react';
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
 */
export interface Token {
  id: string;
  x: number;
  y: number;
  label: string;
  color: string;
  type: 'party' | 'enemy';
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
}

/**
 * Componente principale della mappa interattiva
 * Permette di visualizzare una mappa e gestire pedine con drag-and-drop e long-press menu
 * Le coordinate sono relative (0-100%) per adattarsi a qualsiasi risoluzione tablet
 * 
 * @component
 * @param {MapCanvasProps} props - Le props del componente
 * @returns {React.ReactElement} L'elemento della mappa interattiva
 */
export const MapCanvas: React.FC<MapCanvasProps> = ({ mapUrl }) => {
  const canvasRef = useRef<HTMLDivElement>(null);
  const [tokens, setTokens] = useState<Token[]>([]);
  const [draggingToken, setDraggingToken] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [nextId, setNextId] = useState(1);
  const [selectedToken, setSelectedToken] = useState<string | null>(null);
  const [showTypeMenu, setShowTypeMenu] = useState(false);
  const [showColorMenu, setShowColorMenu] = useState(false);
  const [showNameMenu, setShowNameMenu] = useState(false);
  const [showTokenColorMenu, setShowTokenColorMenu] = useState(false);
  const [showTokenNameMenu, setShowTokenNameMenu] = useState(false);
  const [selectedType, setSelectedType] = useState<'party' | 'enemy' | null>(null);
  const [selectedColor, setSelectedColor] = useState<string | null>(null);
  const [tokenName, setTokenName] = useState('');
  const [editingTokenName, setEditingTokenName] = useState('');
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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

    const newToken: Token = {
      id: `token-${nextId}`,
      x: 50,
      y: 50,
      label: tokenName.trim(),
      color: selectedColor,
      type: selectedType,
    };

    setTokens([...tokens, newToken]);
    setNextId(nextId + 1);
    setShowNameMenu(false);
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
    // Cancella il timer del long press per evitare di aprire il menu durante il drag
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
    }

    e.stopPropagation();
    const token = tokens.find((t) => t.id === tokenId);
    if (!token) return;

    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    const tokenPixelX = (token.x / 100) * rect.width;
    const tokenPixelY = (token.y / 100) * rect.height;

    setDraggingToken(tokenId);
    setDragOffset({
      x: e.clientX - rect.left - tokenPixelX,
      y: e.clientY - rect.top - tokenPixelY,
    });
  };

  /**
   * Gestisce il movimento del mouse durante il drag
   * Aggiorna la posizione della pedina in coordinate relative (0-100)
   * Limita i valori affinché la pedina rimanga entro i limiti della mappa
   * 
   * @param {React.MouseEvent<HTMLDivElement>} e - L'evento del mouse
   */
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!draggingToken) return;

    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    const x = e.clientX - rect.left - dragOffset.x;
    const y = e.clientY - rect.top - dragOffset.y;

    const newX = Math.max(0, Math.min(100, (x / rect.width) * 100));
    const newY = Math.max(0, Math.min(100, (y / rect.height) * 100));

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
  };

  /**
   * Gestisce il long-press su una pedina
   * Mostra il menu di eliminazione dopo 500ms
   * 
   * @param {string} tokenId - L'ID della pedina
   */
  const handleTokenMouseDown_LongPress = (tokenId: string) => {
    longPressTimerRef.current = setTimeout(() => {
      setSelectedToken(tokenId);
    }, 500);
  };

  /**
   * Cancella il timer del long-press quando il mouse viene rilasciato
   */
  const handleTokenMouseUp_CancelLongPress = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
    }
  };

  /**
   * Elimina una pedina dalla mappa
   * Resetta lo stato del token selezionato
   * 
   * @param {string} tokenId - L'ID della pedina da eliminare
   */
  const handleDeleteToken = (tokenId: string) => {
    setTokens(tokens.filter((t) => t.id !== tokenId));
    setSelectedToken(null);
  };

  /**
   * Cambia il colore di una pedina
   * Chiude la palette dei colori dopo la selezione
   * 
   * @param {string} tokenId - L'ID della pedina
   * @param {string} color - Il nuovo colore in formato hex
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
   * Apre il menu per cambiare il nome di una pedina
   * Carica il nome attuale della pedina nel campo di input
   * 
   * @param {string} tokenId - L'ID della pedina
   */
  const handleOpenTokenNameMenu = (tokenId: string) => {
    const token = tokens.find((t) => t.id === tokenId);
    if (token) {
      setEditingTokenName(token.label);
      setShowTokenNameMenu(true);
    }
  };

  /**
   * Cambia il nome di una pedina
   * Convalida il nome prima di applicare il cambio
   * Chiude il menu di modifica dopo il cambio
   * 
   * @param {string} tokenId - L'ID della pedina
   * @param {string} newName - Il nuovo nome della pedina
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

  return (
    <div className="map-canvas-container">
      {/* Sidebar sinistra - Lista Party */}
      <div className="sidebar sidebar-left">
        <h3>👥 Party</h3>
        <button
          className="add-sidebar-btn party-btn"
          onClick={() => handleAddToken('party')}
        >
          ➕ Aggiungi
        </button>
        <div className="tokens-list">
          {tokens.filter((t) => t.type === 'party').length === 0 ? (
            <p className="empty-list">Nessuna pedina</p>
          ) : (
            tokens
              .filter((t) => t.type === 'party')
              .map((token) => (
                <div
                  key={token.id}
                  className="token-list-item"
                  onClick={() => setSelectedToken(token.id)}
                >
                  <div
                    className="token-color-indicator"
                    style={{ backgroundColor: token.color }}
                  />
                  <span className="token-list-name">{token.label}</span>
                </div>
              ))
          )}
        </div>
      </div>

      {/* Canvas principale della mappa con gestione del mouse */}
      <div
        ref={canvasRef}
        className="map-canvas"
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onClick={() => {
          setShowTokenColorMenu(false);
          setSelectedToken(null);
        }}
        style={{
          backgroundImage: `url(${mapUrl})`,
          backgroundSize: 'contain',
          backgroundRepeat: 'no-repeat',
          backgroundPosition: 'center',
          width: '100%',
          height: '100%',
          position: 'relative',
          cursor: draggingToken ? 'grabbing' : 'default',
          touchAction: 'none',
          flex: 1,
        }}
      >
        {/* Rendering delle pedine sulla mappa */}
        {tokens.map((token) => (
          <div
            key={token.id}
            className={`token ${selectedToken === token.id ? 'selected' : ''}`}
            onMouseDown={(e) => {
              handleTokenMouseDown(e, token.id);
              handleTokenMouseDown_LongPress(token.id);
            }}
            onMouseUp={handleTokenMouseUp_CancelLongPress}
            onMouseLeave={handleTokenMouseUp_CancelLongPress}
            onClick={(e) => e.stopPropagation()}
            style={{
              left: `${token.x}%`,
              top: `${token.y}%`,
              backgroundColor: token.color,
              cursor: 'grab',
            }}
          >
            <span className="token-label">{token.label.substring(0, 2).toUpperCase()}</span>

            {/* Menu di eliminazione al long-press */}
            {selectedToken === token.id && (
              <div className="token-menu" onClick={(e) => e.stopPropagation()}>
                <button
                  className="edit-name-btn"
                  onClick={() => handleOpenTokenNameMenu(token.id)}
                >
                  ✎️ Rinomina
                </button>
                <button
                  className="color-change-btn"
                  onClick={() => setShowTokenColorMenu(true)}
                >
                  🎨 Colore
                </button>
                <button
                  className="delete-btn"
                  onClick={() => handleDeleteToken(token.id)}
                >
                  🗑️ Elimina
                </button>

                {/* Palette colori nel menu token */}
                {showTokenColorMenu && (
                  <div className="token-color-palette">
                    {colorPalette.map((color, index) => (
                      <button
                        key={index}
                        className="token-color-btn"
                        style={{ backgroundColor: color }}
                        onClick={() => handleChangeTokenColor(token.id, color)}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Sidebar destra - Lista Enemy */}
      <div className="sidebar sidebar-right">
        <h3>⚔️ Enemy</h3>
        <button
          className="add-sidebar-btn enemy-btn"
          onClick={() => handleAddToken('enemy')}
        >
          ➕ Aggiungi
        </button>
        <div className="tokens-list">
          {tokens.filter((t) => t.type === 'enemy').length === 0 ? (
            <p className="empty-list">Nessuna pedina</p>
          ) : (
            tokens
              .filter((t) => t.type === 'enemy')
              .map((token) => (
                <div
                  key={token.id}
                  className="token-list-item"
                  onClick={() => setSelectedToken(token.id)}
                >
                  <div
                    className="token-color-indicator"
                    style={{ backgroundColor: token.color }}
                  />
                  <span className="token-list-name">{token.label}</span>
                </div>
              ))
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
    </div>
  );
};
