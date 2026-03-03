const { 
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  AlignmentType, BorderStyle, WidthType, ShadingType, VerticalAlign
} = require('docx');
const fs   = require('fs');
const path = require('path');

/**
 * Given a filled fields object, produce a .docx buffer.
 *
 * Approach: Build the document programmatically using docx-js,
 * mirroring the structure of BlankFinal.docx exactly.
 * This is more reliable than XML find-and-replace for complex tables.
 */
async function generateDocx(fields) {
  const f = fields; // shorthand

  // ── Helpers ────────────────────────────────────────────────────────────────
  const val  = (v) => (v !== null && v !== undefined && v !== '') ? String(v) : '';
  const dash = (v) => val(v) || '—';

  const border = { style: BorderStyle.SINGLE, size: 4, color: '000000' };
  const borders = { top: border, bottom: border, left: border, right: border };

  function cell(text, opts = {}) {
    const { bold = false, shade = null, span = 1, width = null, align = AlignmentType.LEFT } = opts;
    return new TableCell({
      borders,
      columnSpan: span,
      ...(width   && { width: { size: width, type: WidthType.DXA } }),
      ...(shade   && { shading: { fill: shade, type: ShadingType.CLEAR } }),
      margins: { top: 40, bottom: 40, left: 80, right: 80 },
      children: [new Paragraph({
        alignment: align,
        children: [new TextRun({ text: val(text), bold, size: 18, font: 'Arial' })]
      })]
    });
  }

  function labelCell(text, width) {
    return cell(text, { bold: true, shade: 'D9D9D9', width });
  }

  function valueCell(text, width) {
    return cell(text, { width });
  }

  // ── Section header row helper ──────────────────────────────────────────────
  function sectionHeader(title) {
    return new Table({
      width: { size: 9360, type: WidthType.DXA },
      columnWidths: [9360],
      rows: [new TableRow({ children: [
        new TableCell({
          borders,
          shading: { fill: '1F4E79', type: ShadingType.CLEAR },
          margins: { top: 60, bottom: 60, left: 120, right: 120 },
          children: [new Paragraph({
            children: [new TextRun({ text: title, bold: true, size: 20, font: 'Arial', color: 'FFFFFF' })]
          })]
        })
      ]})]
    });
  }

  // ── Order Information Table ────────────────────────────────────────────────
  const orderTable = new Table({
    width: { size: 9360, type: WidthType.DXA },
    columnWidths: [1200, 2400, 1200, 1800, 1200, 1560],
    rows: [
      // Row 1: File Number / Effective Date / Completed Date
      new TableRow({ children: [
        labelCell('File Number:', 1200),
        valueCell(dash(f.file_number), 2400),
        labelCell('Effective Date:', 1200),
        valueCell(dash(f.effective_date), 1800),
        labelCell('Completed:', 1200),
        valueCell(dash(f.completed_date), 1560),
      ]}),
      // Row 2: Property Address
      new TableRow({ children: [
        labelCell('Property Address:', 1200),
        new TableCell({
          borders, columnSpan: 5,
          margins: { top: 40, bottom: 40, left: 80, right: 80 },
          children: [new Paragraph({
            children: [new TextRun({ text: dash(f.property_address), bold: true, size: 20, font: 'Arial' })]
          })]
        })
      ]}),
      // Row 3: County / Township / Parcel ID
      new TableRow({ children: [
        labelCell('County:', 1200),
        valueCell(dash(f.county), 2400),
        labelCell('Township:', 1200),
        valueCell(dash(f.township), 1800),
        labelCell('Parcel ID:', 1200),
        valueCell(dash(f.parcel_id), 1560),
      ]}),
      // Row 4: Values
      new TableRow({ children: [
        labelCell('Assessed Value:', 1200),
        valueCell(dash(f.assessed_value), 2400),
        labelCell('Land Value:', 1200),
        valueCell(dash(f.land_value), 1800),
        labelCell('Impr. Value:', 1200),
        valueCell(dash(f.improvement_value), 1560),
      ]}),
      // Row 5: Tax
      new TableRow({ children: [
        labelCell('Tax Amount:', 1200),
        new TableCell({
          borders, width: { size: 2400, type: WidthType.DXA },
          margins: { top: 40, bottom: 40, left: 80, right: 80 },
          children: [
            new Paragraph({ children: [new TextRun({ text: `${val(f.tax_amount_1st)} (1st)`, size: 18, font: 'Arial' })] }),
            new Paragraph({ children: [new TextRun({ text: `${val(f.tax_amount_2nd)} (2nd)`, size: 18, font: 'Arial' })] }),
          ]
        }),
        labelCell('Due:', 1200),
        new TableCell({
          borders, width: { size: 1800, type: WidthType.DXA },
          margins: { top: 40, bottom: 40, left: 80, right: 80 },
          children: [
            new Paragraph({ children: [new TextRun({ text: val(f.tax_due_1st), size: 18, font: 'Arial' })] }),
            new Paragraph({ children: [new TextRun({ text: val(f.tax_due_2nd), size: 18, font: 'Arial' })] }),
          ]
        }),
        labelCell('Delinquent:', 1200),
        valueCell(dash(f.tax_delinquent), 1560),
      ]}),
      // Row 6: Tax ID / Paid
      new TableRow({ children: [
        labelCell('Tax ID:', 1200),
        valueCell(dash(f.tax_id), 2400),
        labelCell('Paid:', 1200),
        valueCell(dash(f.tax_paid), 1800),
        cell('', { width: 2760, span: 2 }),
      ]}),
      // Row 7: Current Vesting Owner
      new TableRow({ children: [
        labelCell('Current Vesting Owner:', 1200),
        new TableCell({
          borders, columnSpan: 5,
          margins: { top: 40, bottom: 40, left: 80, right: 80 },
          children: [new Paragraph({
            children: [new TextRun({ text: dash(f.current_vesting_owner), size: 18, font: 'Arial' })]
          })]
        })
      ]}),
    ]
  });

  // ── Chain of Title Rows ────────────────────────────────────────────────────
  const chainEntries = (f.chain || []).slice(0, 6);
  // Pad to 6 entries
  while (chainEntries.length < 6) chainEntries.push(null);

  const chainRows = chainEntries.flatMap((entry, i) => {
    const e = entry || {};
    const n = i + 1;
    const inOutSale = e.in_out_sale === true ? '☒ Yes  ☐ No' : e.in_out_sale === false ? '☐ Yes  ☒ No' : '☐ Yes  ☐ No';
    return [
      // Title row
      new TableRow({ children: [
        labelCell(`(${n}) Document Title:`, 2000),
        valueCell(val(e.document_title), 3360),
        labelCell('Book/Instrument:', 1200),
        valueCell(val(e.book_instrument), 1200),
        labelCell('Page:', 600),
        valueCell(val(e.page), 1000),
      ]}),
      // Date / consideration / in-out row
      new TableRow({ children: [
        labelCell('Dated:', 800),
        valueCell(val(e.dated), 1400),
        labelCell('Recorded:', 900),
        valueCell(val(e.recorded), 1400),
        labelCell('Consideration:', 1200),
        valueCell(val(e.consideration), 1200),
        labelCell('In/Out Sale?', 900),
        valueCell(inOutSale, 1560),
      ]}),
      // Grantors
      new TableRow({ children: [
        labelCell('Grantor(s):', 1200),
        new TableCell({
          borders, columnSpan: 7,
          margins: { top: 40, bottom: 40, left: 80, right: 80 },
          children: [new Paragraph({
            children: [new TextRun({ text: (e.grantors || []).join('; ') || '—', size: 18, font: 'Arial' })]
          })]
        })
      ]}),
      // Grantees
      new TableRow({ children: [
        labelCell('Grantee(s):', 1200),
        new TableCell({
          borders, columnSpan: 7,
          margins: { top: 40, bottom: 40, left: 80, right: 80 },
          children: [new Paragraph({ children: [new TextRun({ text: (e.grantees || []).join('; ') || '—', size: 18, font: 'Arial' })] }),
            ...(e.notes ? [new Paragraph({ children: [new TextRun({ text: e.notes, size: 16, font: 'Arial', italics: true, color: '595959' })] })] : [])
          ]
        })
      ]}),
    ];
  });

  const chainTable = new Table({
    width: { size: 9360, type: WidthType.DXA },
    columnWidths: [1200, 1400, 900, 1400, 1200, 1200, 900, 1160],
    rows: chainRows
  });

  // ── Mortgages Table ────────────────────────────────────────────────────────
  const mortgages = (f.mortgages || []);
  const mortgageRows = mortgages.flatMap((m, i) => {
    if (!m) return [];
    return [
      new TableRow({ children: [
        labelCell(`(${i + 1}) Document Title:`, 2000),
        valueCell(val(m.document_title), 3360),
        labelCell('Book/Instrument:', 1300),
        valueCell(val(m.book_instrument), 1200),
        labelCell('Page:', 500),
        valueCell(val(m.page), 1000),
      ]}),
      new TableRow({ children: [
        labelCell('Dated:', 800),
        valueCell(val(m.dated), 1400),
        labelCell('Recorded:', 900),
        valueCell(val(m.recorded), 1400),
        labelCell('Consideration:', 1200),
        valueCell(val(m.consideration), 1200),
        labelCell('Maturity:', 800),
        valueCell(val(m.maturity_date), 1660),
      ]}),
      new TableRow({ children: [
        labelCell('Lender:', 1000),
        new TableCell({
          borders, columnSpan: 7,
          margins: { top: 40, bottom: 40, left: 80, right: 80 },
          children: [new Paragraph({ children: [
            new TextRun({ text: dash(m.lender), size: 18, font: 'Arial' }),
            ...(m.mers_number ? [new TextRun({ text: `  (MERS# ${m.mers_number})`, size: 16, font: 'Arial', italics: true })] : [])
          ]})]
        })
      ]}),
      new TableRow({ children: [
        labelCell('Borrower:', 1000),
        valueCell(dash(m.borrower), 3760),
        labelCell('Trustee:', 1000),
        valueCell(dash(m.trustee), 3600),
      ]}),
    ];
  });

  if (mortgageRows.length === 0) {
    mortgageRows.push(new TableRow({ children: [
      new TableCell({
        borders, columnSpan: 8,
        margins: { top: 80, bottom: 80, left: 120, right: 120 },
        children: [new Paragraph({ children: [new TextRun({ text: 'No open mortgages/deeds of trust found.', size: 18, font: 'Arial', italics: true, color: '595959' })] })]
      })
    ]}));
  }

  const mortgageTable = new Table({
    width: { size: 9360, type: WidthType.DXA },
    columnWidths: [1000, 3760, 1000, 1000, 1200, 1200, 800, 600],
    rows: mortgageRows
  });

  // ── Associated Documents Table ─────────────────────────────────────────────
  const assocDocs  = (f.assoc_docs || []);
  const assocRows  = assocDocs.flatMap((d, i) => {
    if (!d) return [];
    return [
      new TableRow({ children: [
        labelCell(`(${i + 1}) Document Title:`, 2000),
        valueCell(val(d.document_title), 3360),
        labelCell('Open/Closed:', 1200),
        valueCell(val(d.open_closed), 2800),
      ]}),
      new TableRow({ children: [
        labelCell('Dated:', 800),
        valueCell(val(d.dated), 1400),
        labelCell('Book/Instrument:', 1200),
        valueCell(val(d.book_instrument), 1200),
        labelCell('Page:', 600),
        valueCell(val(d.page), 1000),
        labelCell('Recorded:', 800),
        valueCell(val(d.recorded), 1360),
      ]}),
      new TableRow({ children: [
        labelCell('Grantor/Assignor:', 1400),
        valueCell(dash(d.grantor_assignor), 3000),
        labelCell('Grantee/Assignee:', 1400),
        valueCell(dash(d.grantee_assignee), 3560),
      ]}),
    ];
  });

  if (assocRows.length === 0) {
    assocRows.push(new TableRow({ children: [
      new TableCell({
        borders, columnSpan: 4,
        margins: { top: 80, bottom: 80, left: 120, right: 120 },
        children: [new Paragraph({ children: [new TextRun({ text: 'No associated documents found.', size: 18, font: 'Arial', italics: true, color: '595959' })] })]
      })
    ]}));
  }

  const assocTable = new Table({
    width: { size: 9360, type: WidthType.DXA },
    columnWidths: [1400, 3000, 1400, 3560],
    rows: assocRows
  });

  // ── Assemble Document ──────────────────────────────────────────────────────
  const doc = new Document({
    styles: {
      default: { document: { run: { font: 'Arial', size: 18 } } }
    },
    sections: [{
      properties: {
        page: {
          size: { width: 12240, height: 15840 },
          margin: { top: 720, right: 720, bottom: 720, left: 720 }
        }
      },
      children: [
        sectionHeader('ORDER INFORMATION'),
        orderTable,
        new Paragraph({ spacing: { before: 120 }, children: [new TextRun('')] }),
        sectionHeader('CHAIN OF TITLE'),
        chainTable,
        new Paragraph({ spacing: { before: 120 }, children: [new TextRun('')] }),
        sectionHeader('MORTGAGES / DEEDS OF TRUST'),
        mortgageTable,
        new Paragraph({ spacing: { before: 120 }, children: [new TextRun('')] }),
        sectionHeader('ASSOCIATED DOCUMENTS'),
        assocTable,
      ]
    }]
  });

  return await Packer.toBuffer(doc);
}

module.exports = { generateDocx };
