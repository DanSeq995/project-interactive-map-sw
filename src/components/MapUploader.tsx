import React from 'react';
import '../styles/MapUploader.css';

/**
 * Props per il componente MapUploader
 * @interface MapUploaderProps
 * @property {(imageUrl: string, width: number, height: number) => void} onMapLoaded - Callback quando la mappa è caricata
 */
interface MapUploaderProps {
  onMapLoaded: (imageUrl: string, width: number, height: number) => void;
}

/**
 * Componente per il caricamento delle mappe
 * Permette di caricare immagini PNG/JPG da visualizzare sulla mappa interattiva
 * 
 * @component
 * @param {MapUploaderProps} props - Le props del componente
 * @returns {React.ReactElement} L'elemento del caricatore di mappe
 */
export const MapUploader: React.FC<MapUploaderProps> = ({ onMapLoaded }) => {
  /**
   * Gestisce il caricamento del file immagine
   * Legge il file e ottiene le dimensioni dell'immagine
   * 
   * @param {React.ChangeEvent<HTMLInputElement>} e - L'evento di cambio del file
   */
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const url = event.target?.result as string;
        onMapLoaded(url, img.width, img.height);
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="map-uploader">
      <label htmlFor="map-input" className="upload-label">
        <input
          id="map-input"
          type="file"
          accept="image/png,image/jpeg"
          onChange={handleFileUpload}
          className="file-input"
        />
        <span className="upload-button">📁 Carica mappa</span>
      </label>
    </div>
  );
};
