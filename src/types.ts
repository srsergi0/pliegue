export type SheetSizePreset = 
  | 'A4' 
  | 'A3' 
  | 'A5' 
  | 'A6' 
  | 'A2' 
  | 'A1' 
  | 'Letter' 
  | 'Legal' 
  | 'Tabloid' 
  | 'SuperA3' 
  | 'B5' 
  | 'B4' 
  | 'Custom';

export interface SheetSize {
  name: SheetSizePreset;
  label: string;
  width: number; // in mm
  height: number; // in mm
}

export type TargetPagePreset =
  | 'auto'
  | 'original'
  | 'A4'
  | 'A5'
  | 'A6'
  | 'A7'
  | 'A8'
  | 'HalfLetter'
  | 'BusinessCard_90x50'
  | 'Card_85x55'
  | 'Photo_100x150'
  | 'Custom';

export interface TargetPageSize {
  name: TargetPagePreset;
  label: string;
  width: number; // in mm
  height: number; // in mm
}

export type LayoutMode = 
  | 'booklet'          // Folleto / Cuadernillo (Saddle Stitch)
  | 'duplex_sheetwise' // Cuadrícula Dúplex (Frente y Vuelta con respaldo de columnas)
  | 'cut_and_stack'    // Corte y Apilado (para guillotina directa)
  | 'sequential'       // Cuadrícula Simple (1 cara / Simplex)
  | 'step_and_repeat'; // Repetición / Tarjetas

export type DuplexMode = 'simplex' | 'long_edge' | 'short_edge';
export type GridOrder = 'rows' | 'columns';
export type BindingEdge = 'left' | 'right';
export type DuplexItemMode = 'two_page_items' | 'consecutive';
export type ScaleMode = 'fit' | 'fill' | 'original' | 'custom';
export type Booklet4UpMode = 'cut_and_nest' | 'duplicate_2up' | 'french_fold';
export type PagePart = 'full' | 'left_half' | 'right_half';
export type SpacerReason =
  | 'front_cover_inside'
  | 'spread_alignment_start'
  | 'back_cover_inside'
  | 'signature_padding';

export interface ImpositionSettings {
  sheetPreset: SheetSizePreset;
  sheetWidth: number; // in mm
  sheetHeight: number; // in mm
  sheetOrientation: 'portrait' | 'landscape';
  
  // Target page / cut product size
  targetPagePreset: TargetPagePreset;
  targetPageWidth: number; // in mm
  targetPageHeight: number; // in mm
  
  gridCols: number;
  gridRows: number;
  layoutMode: LayoutMode;
  duplexMode: DuplexMode;
  gridOrder: GridOrder;
  bindingEdge: BindingEdge;
  signatureSize: number; // 0 = all in one, or 4, 8, 12, 16, 32
  duplexItemMode: DuplexItemMode;
  booklet4UpMode?: Booklet4UpMode; // Mode when booklet has 4 or more pages per sheet
  
  // Manga / Spreads support
  splitDoubleSpreads: boolean; // divide panoramic double pages into 2 facing internal pages

  // Cover courtesy blanks (Cara y Contracara)
  blankAfterFrontCover?: boolean; // insert a courtesy blank right after the front cover (inside front cover)
  blankBeforeBackCover?: boolean; // insert a blank before the back cover and pin the back cover to the booklet exterior
  
  // Excluded / disabled pages from imposition
  excludedPageIndices: number[]; // 0-based source page indices to omit
  
  pageRotation: 0 | 90 | 180 | 270;
  reverseRotation: 0 | 90 | 180 | 270;
  autoRotateToFit: boolean;
  
  scaleMode: ScaleMode;
  customScale: number; // percentage (e.g. 100)
  
  marginTop: number; // in mm
  marginBottom: number; // in mm
  marginLeft: number; // in mm
  marginRight: number; // in mm
  
  gutterHorizontal: number; // in mm
  gutterVertical: number; // in mm
  
  drawCropMarks: boolean;
  cropMarkLength: number; // in mm, e.g. 5
  bleed: number; // in mm
}

export interface ImpositionCell {
  colIndex: number;
  rowIndex: number;
  /**
   * 0-based page index from the source PDF.
   * null means empty cell (no page printed here).
   */
  sourcePageIndex: number | null;
  /**
   * Part of the page to render (for split double spreads)
   */
  pagePart?: PagePart;
  /**
   * Whether this cell is a blank spacer inserted to align a double spread on facing pages or covers
   */
  isSpacerBlank?: boolean;
  /**
   * Reason for inserting spacer blank
   */
  spacerReason?: SpacerReason;
  /**
   * Clockwise rotation in degrees: 0, 90, 180, 270
   */
  rotation: 0 | 90 | 180 | 270;
  
  // Dimensions and coordinates inside the sheet (in mm, starting from top-left margin corner)
  x: number; 
  y: number;
  width: number;
  height: number;
}

export interface ImposedSheet {
  sheetIndex: number; // 0-based index in PDF
  sheetNumber: number; // 1-based physical sheet number
  side: 'front' | 'back' | 'single';
  label: string;
  cells: ImpositionCell[];
}

export interface PDFSourceInfo {
  name: string;
  filePath?: string;
  size: number; // in bytes
  pageCount: number;
  // Number of panoramic / double-spread pages detected in document
  doublePageCount?: number;
  // Dimensions of the first page in mm
  firstPageWidth: number;
  firstPageHeight: number;
  // Dimensions of all pages in mm (in case they vary)
  pages: {
    width: number;
    height: number;
  }[];
}

export const SHEET_PRESETS: SheetSize[] = [
  { name: 'A4', label: 'A4 (210 × 297 mm)', width: 210, height: 297 },
  { name: 'A3', label: 'A3 (297 × 420 mm)', width: 297, height: 420 },
  { name: 'A5', label: 'A5 (148.5 × 210 mm)', width: 148.5, height: 210 },
  { name: 'A6', label: 'A6 (105 × 148.5 mm)', width: 105, height: 148.5 },
  { name: 'A2', label: 'A2 (420 × 594 mm)', width: 420, height: 594 },
  { name: 'A1', label: 'A1 (594 × 841 mm)', width: 594, height: 841 },
  { name: 'Letter', label: 'Carta / Letter (215.9 × 279.4 mm)', width: 215.9, height: 279.4 },
  { name: 'Legal', label: 'Oficio / Legal (215.9 × 355.6 mm)', width: 215.9, height: 355.6 },
  { name: 'Tabloid', label: 'Tabloide / 11x17 (279.4 × 431.8 mm)', width: 279.4, height: 431.8 },
  { name: 'SuperA3', label: 'Super A3 / 12x18 (330 × 483 mm)', width: 330, height: 483 },
  { name: 'B5', label: 'B5 (176 × 250 mm)', width: 176, height: 250 },
  { name: 'B4', label: 'B4 (250 × 353 mm)', width: 250, height: 353 },
];

export const TARGET_PAGE_PRESETS: TargetPageSize[] = [
  { name: 'auto', label: 'Automático (según columnas y filas)', width: 0, height: 0 },
  { name: 'original', label: 'Original del documento PDF', width: 0, height: 0 },
  { name: 'A4', label: 'A4 (210 × 297 mm)', width: 210, height: 297 },
  { name: 'A5', label: 'A5 (148.5 × 210 mm) [2 por A4 / 4 por A3]', width: 148.5, height: 210 },
  { name: 'A6', label: 'A6 (105 × 148.5 mm) [4 por A4 / 8 por A3]', width: 105, height: 148.5 },
  { name: 'A7', label: 'A7 (74 × 105 mm) [8 por A4 / 16 por A3]', width: 74, height: 105 },
  { name: 'A8', label: 'A8 (52 × 74 mm) [16 por A4]', width: 52, height: 74 },
  { name: 'HalfLetter', label: 'Media Carta / Half-Letter (139.7 × 215.9 mm)', width: 139.7, height: 215.9 },
  { name: 'BusinessCard_90x50', label: 'Tarjeta de Visita (90 × 50 mm)', width: 90, height: 50 },
  { name: 'Card_85x55', label: 'Tarjeta Estándar (85 × 55 mm)', width: 85, height: 55 },
  { name: 'Photo_100x150', label: 'Foto / Postal (100 × 150 mm)', width: 100, height: 150 },
  { name: 'Custom', label: 'Personalizado...', width: 100, height: 100 },
];
