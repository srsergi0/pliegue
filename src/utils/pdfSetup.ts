import * as pdfjs from 'pdfjs-dist';
import pdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

// Configure the worker for pdfjs in Vite
pdfjs.GlobalWorkerOptions.workerSrc = pdfWorker;

export { pdfjs };
