export type Language = 'es' | 'en' | 'ja' | 'zh';

export interface Translations {
  app: {
    title: string;
    subtitle: string;
    brandTag: string;
  };
  actions: {
    templates: string;
    templatesTooltip: string;
    openAnother: string;
    openAnotherTooltip: string;
    exportPdf: string;
    exportPdfProcessing: string;
    savePdf: string;
    openPdf: string;
    showInFolder: string;
    selectPdfFile: string;
    dropPdfHere: string;
    dropPdfActive: string;
    closeNotification: string;
    pdfSavedSuccess: string;
    appliedTemplate: string;
  };
  welcome: {
    heroTitle: string;
    heroDescription: string;
    analyzingPdf: string;
    analyzingPdfSubtitle: string;
    dragDropSubtitle: string;
    browseInPc: string;
    popularTemplates: string;
  };
  tabs: {
    layout: string;
    margins: string;
    adjustments: string;
  };
  layout: {
    sheetSize: string;
    sheetPreset: string;
    orientation: string;
    portrait: string;
    landscape: string;
    width: string;
    height: string;
    impositionMode: string;
    booklet: string;
    bookletDesc: string;
    stepAndRepeat: string;
    stepAndRepeatDesc: string;
    cutAndStack: string;
    cutAndStackDesc: string;
    grid: string;
    columns: string;
    rows: string;
    pagesPerSheet: string;
    signatureGroup: string;
    signatureGroupDesc: string;
    allPagesInOne: string;
    pagesPerSignature: string;
  };
  margins: {
    title: string;
    marginsTitle: string;
    guttersTitle: string;
    top: string;
    bottom: string;
    left: string;
    right: string;
    horizontalGutter: string;
    verticalGutter: string;
    cropMarksTitle: string;
    drawCropMarks: string;
    markLength: string;
    bleed: string;
    bleedDesc: string;
  };
  adjustments: {
    title: string;
    duplexTitle: string;
    duplexLongEdge: string;
    duplexShortEdge: string;
    bindingEdge: string;
    bindingLeft: string;
    bindingRight: string;
    bindingTop: string;
    scalingTitle: string;
    scaleFit: string;
    scaleActual: string;
    scaleCustom: string;
    customScalePercent: string;
    rotationTitle: string;
    pageRotation: string;
    autoRotateToFit: string;
  };
  preview: {
    title: string;
    zoomIn: string;
    zoomOut: string;
    resetZoom: string;
    fitToScreen: string;
    front: string;
    back: string;
    lightTable: string;
    lightTableTooltip: string;
    sheetNavigation: string;
    sheetOf: string;
    totalSheets: string;
    sourcePages: string;
    emptyPage: string;
    blankPagesNotice: string;
  };
  templates: {
    modalTitle: string;
    modalSubtitle: string;
    filterAll: string;
    filterBooklets: string;
    filterCommercial: string;
    applyButton: string;
    close: string;
    recommended: string;
  };
  language: {
    selectLanguage: string;
    spanish: string;
    english: string;
    japanese: string;
    chinese: string;
  };
}
