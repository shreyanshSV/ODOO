/**
 * Zero-dependency PDF generator for Environmental Carbon Reports.
 *
 * Builds a valid PDF 1.4 document from structured data using raw text streams.
 * No external libraries required — keeps the stack lean.
 */

/* ---------- Types ---------- */

export interface PdfTransaction {
  date: string;
  source: string;
  reference: string;
  department: string;
  factor: string;
  quantity: number;
  co2Kg: number;
}

export interface PdfReportOpts {
  title: string;
  subtitle?: string;
  invoiceNo: string;
  generatedAt: string;
  department?: string;
  dateFrom?: string;
  dateTo?: string;
  transactions: PdfTransaction[];
  totalCo2Kg: number;
  totalRecords: number;
}

/* ---------- Helpers ---------- */

/** Escape special PDF text chars */
function esc(s: string): string {
  return s.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}

/** Format number with commas */
function fmt(n: number, d = 0): string {
  return n.toLocaleString("en-US", {
    minimumFractionDigits: d,
    maximumFractionDigits: d,
  });
}

/* ---------- PDF builder ---------- */

export function generateEnvironmentalPdf(opts: PdfReportOpts): Buffer {
  const {
    title,
    subtitle,
    invoiceNo,
    generatedAt,
    department,
    dateFrom,
    dateTo,
    transactions,
    totalCo2Kg,
    totalRecords,
  } = opts;

  // Page dimensions (A4 portrait in points: 595.28 x 841.89)
  const pageW = 595.28;
  const pageH = 841.89;
  const marginL = 40;
  const marginR = 40;
  const marginT = 60;
  const contentW = pageW - marginL - marginR;

  // ----- Build pages of content streams -----
  const pages: string[] = [];
  let stream = "";
  let curY = pageH - marginT;

  const ROWS_PER_PAGE_FIRST = 28;
  const ROWS_PER_PAGE_CONT = 36;
  let rowsOnPage = 0;
  let isFirstPage = true;
  let pageNum = 0;

  function newPage() {
    if (stream) pages.push(stream);
    stream = "";
    curY = pageH - marginT;
    rowsOnPage = 0;
    pageNum++;
    isFirstPage = false;
  }

  function text(
    x: number,
    y: number,
    content: string,
    size = 10,
    font = "/F1"
  ) {
    stream += `BT ${font} ${size} Tf ${x} ${y} Td (${esc(content)}) Tj ET\n`;
  }

  function line(
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    width = 0.5
  ) {
    stream += `${width} w ${x1} ${y1} m ${x2} ${y2} l S\n`;
  }

  function rect(
    x: number,
    y: number,
    w: number,
    h: number,
    r: number,
    g: number,
    b: number
  ) {
    stream += `${r} ${g} ${b} rg ${x} ${y} ${w} ${h} re f\n`;
  }

  function setColor(r: number, g: number, b: number) {
    stream += `${r} ${g} ${b} rg\n`;
  }

  function setStrokeColor(r: number, g: number, b: number) {
    stream += `${r} ${g} ${b} RG\n`;
  }

  // ===== First page: header + meta + table =====
  pageNum = 1;

  // Header bar
  rect(0, pageH - 45, pageW, 45, 0.15, 0.68, 0.38); // Green header bar (#27AE60)
  setColor(1, 1, 1);
  text(marginL, pageH - 30, "EcoSphere", 18, "/F2");
  text(pageW - marginR - 200, pageH - 30, title, 12, "/F2");
  setColor(0, 0, 0);

  curY = pageH - 75;

  // Invoice meta block
  setColor(0.3, 0.3, 0.3);
  text(marginL, curY, `Report #: ${invoiceNo}`, 9, "/F2");
  text(marginL + 200, curY, `Generated: ${generatedAt}`, 9);
  curY -= 14;
  if (department) {
    text(marginL, curY, `Department: ${department}`, 9);
    curY -= 14;
  }
  if (dateFrom || dateTo) {
    const range = `Period: ${dateFrom || "—"} to ${dateTo || "—"}`;
    text(marginL, curY, range, 9);
    curY -= 14;
  }
  if (subtitle) {
    text(marginL, curY, subtitle, 9);
    curY -= 14;
  }
  setColor(0, 0, 0);

  curY -= 10;
  setStrokeColor(0.15, 0.68, 0.38);
  line(marginL, curY, pageW - marginR, curY, 1.5);
  curY -= 20;

  // Summary tiles
  rect(marginL, curY - 30, 150, 35, 0.94, 0.97, 0.95); // light green bg
  setColor(0.15, 0.68, 0.38);
  text(marginL + 8, curY - 10, "Total CO₂", 8, "/F2");
  text(marginL + 8, curY - 24, `${fmt(totalCo2Kg / 1000, 2)} tonnes`, 12, "/F2");

  rect(marginL + 170, curY - 30, 150, 35, 0.94, 0.95, 0.98); // light blue bg
  setColor(0.2, 0.4, 0.7);
  text(marginL + 178, curY - 10, "Transactions", 8, "/F2");
  text(marginL + 178, curY - 24, `${fmt(totalRecords)}`, 12, "/F2");

  rect(marginL + 340, curY - 30, 150, 35, 0.98, 0.95, 0.93); // light orange bg
  setColor(0.7, 0.4, 0.15);
  text(marginL + 348, curY - 10, "Avg per Txn", 8, "/F2");
  text(
    marginL + 348,
    curY - 24,
    `${totalRecords > 0 ? fmt(totalCo2Kg / totalRecords, 1) : "0"} kg`,
    12,
    "/F2"
  );

  setColor(0, 0, 0);
  curY -= 55;

  // Table header
  const cols = [
    { label: "Date", x: marginL, w: 70 },
    { label: "Source", x: marginL + 70, w: 70 },
    { label: "Reference", x: marginL + 140, w: 80 },
    { label: "Department", x: marginL + 220, w: 90 },
    { label: "Factor", x: marginL + 310, w: 85 },
    { label: "Qty", x: marginL + 395, w: 55 },
    { label: "CO₂ (kg)", x: marginL + 450, w: 65 },
  ];

  function drawTableHeader() {
    rect(marginL, curY - 14, contentW, 18, 0.22, 0.22, 0.25);
    setColor(1, 1, 1);
    for (const col of cols) {
      text(col.x + 3, curY - 10, col.label, 8, "/F2");
    }
    setColor(0, 0, 0);
    curY -= 18;
  }

  drawTableHeader();
  rowsOnPage = 0;

  // Table rows
  for (let i = 0; i < transactions.length; i++) {
    const maxRows = isFirstPage ? ROWS_PER_PAGE_FIRST : ROWS_PER_PAGE_CONT;
    if (rowsOnPage >= maxRows) {
      // Footer on current page
      setColor(0.5, 0.5, 0.5);
      text(pageW / 2 - 20, 30, `Page ${pageNum}`, 8);
      setColor(0, 0, 0);
      newPage();
      // Continuation header
      setColor(0.3, 0.3, 0.3);
      text(marginL, curY, `${title} (continued)`, 10, "/F2");
      setColor(0, 0, 0);
      curY -= 20;
      drawTableHeader();
    }

    const t = transactions[i];
    // Alternate row shading
    if (i % 2 === 0) {
      rect(marginL, curY - 12, contentW, 16, 0.96, 0.96, 0.97);
    }

    setColor(0.15, 0.15, 0.15);
    text(cols[0].x + 3, curY - 9, t.date.slice(0, 10), 7.5);
    text(cols[1].x + 3, curY - 9, t.source.slice(0, 12), 7.5);
    text(cols[2].x + 3, curY - 9, (t.reference || "—").slice(0, 14), 7.5);
    text(cols[3].x + 3, curY - 9, t.department.slice(0, 16), 7.5);
    text(cols[4].x + 3, curY - 9, t.factor.slice(0, 14), 7.5);
    text(cols[5].x + 3, curY - 9, fmt(t.quantity, 1), 7.5);
    text(cols[6].x + 3, curY - 9, fmt(t.co2Kg, 1), 7.5);
    setColor(0, 0, 0);

    curY -= 16;
    rowsOnPage++;
  }

  // Bottom separator + totals
  curY -= 6;
  setStrokeColor(0.15, 0.68, 0.38);
  line(marginL, curY, pageW - marginR, curY, 1);
  curY -= 16;
  setColor(0.15, 0.68, 0.38);
  text(cols[4].x + 3, curY, "TOTAL:", 9, "/F2");
  text(cols[5].x + 3, curY, `${fmt(totalRecords)} txns`, 9, "/F2");
  text(cols[6].x + 3, curY, `${fmt(totalCo2Kg, 1)} kg`, 9, "/F2");
  setColor(0, 0, 0);

  // Footer
  curY = 30;
  setColor(0.5, 0.5, 0.5);
  text(marginL, curY, "Generated by EcoSphere ESG Platform", 7);
  text(pageW / 2 - 20, curY, `Page ${pageNum}`, 8);
  text(
    pageW - marginR - 120,
    curY,
    `ecosphere.local · ${generatedAt}`,
    7
  );
  setColor(0, 0, 0);

  // Push final page
  pages.push(stream);

  // ===== Assemble PDF =====
  return assemblePdf(pages, pageW, pageH);
}

/* ---------- Low-level PDF assembly ---------- */

function assemblePdf(
  pageStreams: string[],
  pageW: number,
  pageH: number
): Buffer {
  // Object offsets tracked for xref table
  const objects: string[] = [];
  let objNum = 0;

  function addObj(content: string): number {
    objNum++;
    objects.push(`${objNum} 0 obj\n${content}\nendobj\n`);
    return objNum;
  }

  // 1 — Catalog
  const catalogId = addObj("<< /Type /Catalog /Pages 2 0 R >>");

  // 2 — Pages (placeholder — we'll fix the Kids array after)
  const pagesPlaceholder = objNum + 1;
  addObj("PAGES_PLACEHOLDER");

  // 3 — Font: Helvetica (F1)
  const fontId = addObj(
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>"
  );

  // 4 — Font: Helvetica-Bold (F2)
  const fontBoldId = addObj(
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>"
  );

  // Page + stream objects
  const pageObjIds: number[] = [];

  for (const streamContent of pageStreams) {
    const streamBytes = Buffer.from(streamContent, "utf-8");
    const streamObjId = addObj(
      `<< /Length ${streamBytes.length} >>\nstream\n${streamContent}endstream`
    );

    const pageObjId = addObj(
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageW} ${pageH}] ` +
        `/Contents ${streamObjId} 0 R ` +
        `/Resources << /Font << /F1 ${fontId} 0 R /F2 ${fontBoldId} 0 R >> >> >>`
    );
    pageObjIds.push(pageObjId);
  }

  // Fix Pages object
  const kidsStr = pageObjIds.map((id) => `${id} 0 R`).join(" ");
  objects[pagesPlaceholder - 1] = `2 0 obj\n<< /Type /Pages /Kids [${kidsStr}] /Count ${pageObjIds.length} >>\nendobj\n`;

  // Build file
  let pdf = "%PDF-1.4\n%\xC0\xC1\xC2\xC3\n";
  const offsets: number[] = [];

  for (const obj of objects) {
    offsets.push(Buffer.byteLength(pdf, "utf-8"));
    pdf += obj;
  }

  const xrefOffset = Buffer.byteLength(pdf, "utf-8");
  pdf += `xref\n0 ${objNum + 1}\n`;
  pdf += "0000000000 65535 f \n";
  for (const off of offsets) {
    pdf += `${String(off).padStart(10, "0")} 00000 n \n`;
  }

  pdf += `trailer\n<< /Size ${objNum + 1} /Root ${catalogId} 0 R >>\n`;
  pdf += `startxref\n${xrefOffset}\n%%EOF\n`;

  return Buffer.from(pdf, "utf-8");
}
