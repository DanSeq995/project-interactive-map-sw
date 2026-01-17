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
 */
export interface Token {
  id: string;
  x: number;
  y: number;
  label: string;
  color: string;
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
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  /**
   * Aggiunge una nuova pedina alla mappa
   * Genera un colore casuale per la pedina
   */
  const handleAddToken = () => {
    const newToken: Token = {
      id: `token-${nextId}`,
      x: 50,
      y: 50,
      label: `P${nextId}`,
      color: getRandomColor(),
    };

    setTokens([...tokens, newToken]);
    setNextId(nextId + 1);
  };

  /**
   * Gestisce l'inizio del drag di una pedina
   * Calcola l'offset tra il punto di click e il centro della pedina
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
   * Gestisce la fine del drag
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
   * Cancella il timer del long-press
   */
  const handleTokenMouseUp_CancelLongPress = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
    }
  };

  /**
   * Elimina una pedina dalla mappa
   * 
   * @param {string} tokenId - L'ID della pedina da eliminare
   */
  const handleDeleteToken = (tokenId: string) => {
    setTokens(tokens.filter((t) => t.id !== tokenId));
    setSelectedToken(null);
  };

  /**
   * Genera un colore casuale dalla lista predefinita
   * @returns {string} Un colore in formato hex
   */
  const getRandomColor = () => {
    const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8', '#F7DC6F'];
    return colors[Math.floor(Math.random() * colors.length)];
  };

  return (
    <div className="map-canvas-container">
      <div
        ref={canvasRef}
        className="map-canvas"
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
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
            style={{
              left: `${token.x}%`,
              top: `${token.y}%`,
              backgroundColor: token.color,
              cursor: 'grab',
            }}
          >
            <span className="token-label">{token.label}</span>

            {/* Menu di eliminazione al long-press */}
            {selectedToken === token.id && (
              <div className="token-menu">
                <button
                  className="delete-btn"
                  onClick={() => handleDeleteToken(token.id)}
                >
                  🗑️ Elimina
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Bottone flottante per aggiungere nuove pedine */}
      <button className="add-token-btn" onClick={handleAddToken}>
        ➕ Aggiungi pedina
      </button>
    </div>
  );
};
