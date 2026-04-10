const { 
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  AlignmentType, BorderStyle, WidthType, ShadingType, VerticalAlign
} = require('docx');
const fs   = require('fs');
const path = require('path');

/**
 * Given a filled fields object, produce a .docx buffer.
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

  // ── Tables ─────────────────────────────────────────────────────────────────
  
  const orderTable = new Table({
    width: { size: 9360, type: WidthType.DXA },
    columnWidths: [1200, 2400, 1200, 1800, 1200, 1560],
    rows: [
      new TableRow({ children: [
        labelCell('File Number:', 1200),
        valueCell(dash(f.file_number), 2400),
        labelCell('Effective Date:', 1200),
        valueCell(dash(f.effective_date), 1800),
        labelCell('Completed:', 1200),
        valueCell(dash(f.completed_date), 1560),
      ]}),
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
      new TableRow({ children: [
        labelCell('County:', 1200),
        valueCell(dash(f.county), 2400),
        labelCell('Township:', 1200),
        valueCell(dash(f.township), 1800),
        labelCell('Parcel ID:', 1200),
        valueCell(dash(f.parcel_id), 1560),
      ]}),
      new TableRow({ children: [
        labelCell('Assessed Value:', 1200),
        valueCell(dash(f.assessed_value), 2400),
        labelCell('Land Value:', 1200),
        valueCell(dash(f.land_value), 1800),
        labelCell('Impr. Value:', 1200),
        valueCell(dash(f.improvement_value), 1560),
      ]}),
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
      new TableRow({ children: [
        labelCell('Tax ID:', 1200),
        valueCell(dash(f.tax_id), 2400),
        labelCell('Paid:', 1200),
        valueCell(dash(f.tax_paid), 1800),
        cell('', { width: 2760, span: 2 }),
      ]}),
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

  const chainRows = (f.chain || []).flatMap((e, i) => [
    new TableRow({ children: [
      labelCell(`(${i + 1}) Document Title:`, 2000),
      valueCell(val(e.document_title), 3360),
      labelCell('Book/Instrument:', 1200),
      valueCell(val(e.book_instrument), 1200),
      labelCell('Page:', 600),
      valueCell(val(e.page), 1000),
    ]}),
    new TableRow({ children: [
      labelCell('Dated:', 800),
      valueCell(val(e.dated), 1400),
      labelCell('Recorded:', 900),
      valueCell(val(e.recorded), 1400),
      labelCell('Consideration:', 1200),
      valueCell(val(e.consideration), 1200),
      labelCell('In/Out?', 900),
      valueCell(e.in_out_sale === true ? 'Yes' : 'No', 1560),
    ]}),
    new TableRow({ children: [
      labelCell('Grantor(s):', 1200),
      new TableCell({ borders, columnSpan: 7, children: [new Paragraph({ children: [new TextRun({ text: (e.grantors || []).join('; ') || '—', size: 18 })] })] })
    ]}),
    new TableRow({ children: [
      labelCell('Grantee(s):', 1200),
      new TableCell({ borders, columnSpan: 7, children: [
        new Paragraph({ children: [new TextRun({ text: (e.grantees || []).join('; ') || '—', size: 18 })] }),
        ...(e.notes ? [new Paragraph({ children: [new TextRun({ text: `Note: ${e.notes}`, size: 16, italics: true })] })] : [])
      ] })
    ]}),
  ]);

  const mortgageRows = (f.mortgages || []).flatMap((m, i) => [
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
      new TableCell({ borders, columnSpan: 7, children: [new Paragraph({ children: [new TextRun({ text: `${dash(m.lender)} ${m.mers_number ? `(MERS# ${m.mers_number})` : ''}`, size: 18 })] })] })
    ]}),
    new TableRow({ children: [
      labelCell('Borrower:', 1000),
      valueCell(dash(m.borrower), 3760),
      labelCell('Trustee:', 1000),
      valueCell(dash(m.trustee), 3600),
    ]}),
  ]);

  const lienRows = (f.judgments_liens || []).flatMap((l, i) => [
    new TableRow({ children: [
      labelCell(`(${i + 1}) Document Title:`, 2000),
      valueCell(val(l.document_title), 3360),
      labelCell('Case #:', 1200),
      valueCell(dash(l.case_number), 2800),
    ]}),
    new TableRow({ children: [
      labelCell('Dated:', 800),
      valueCell(val(l.dated), 1400),
      labelCell('Amount:', 1200),
      valueCell(dash(l.amount), 1200),
      labelCell('Recorded:', 1000),
      valueCell(dash(l.recorded), 3760),
    ]}),
    new TableRow({ children: [
      labelCell('Plaintiff:', 1200),
      valueCell(dash(l.plaintiff), 3400),
      labelCell('Defendant:', 1200),
      valueCell(dash(l.defendant), 3560),
    ]}),
  ]);

  const legalPara = new Table({
    width: { size: 9360, type: WidthType.DXA },
    rows: [new TableRow({ children: [
      new TableCell({ borders, margins: { top: 100, bottom: 100, left: 100, right: 100 },
        children: [new Paragraph({ children: [new TextRun({ text: dash(f.legal_description), size: 18 })] })]
      })
    ]})]
  });

  const doc = new Document({
    styles: { default: { document: { run: { font: 'Arial', size: 18 } } } },
    sections: [{
      properties: { margin: { top: 720, right: 720, bottom: 720, left: 720 } },
      children: [
        sectionHeader('ORDER INFORMATION'),
        orderTable,
        new Paragraph({ spacing: { before: 120 } }),
        sectionHeader('LEGAL DESCRIPTION'),
        legalPara,
        new Paragraph({ spacing: { before: 120 } }),
        sectionHeader('CHAIN OF TITLE'),
        new Table({ width: { size: 9360, type: WidthType.DXA }, rows: chainRows.length ? chainRows : [new TableRow({ children: [cell('No chain entries found.', { span: 8, italics: true })] })] }),
        new Paragraph({ spacing: { before: 120 } }),
        sectionHeader('MORTGAGES / DEEDS OF TRUST'),
        new Table({ width: { size: 9360, type: WidthType.DXA }, rows: mortgageRows.length ? mortgageRows : [new TableRow({ children: [cell('No open mortgages found.', { span: 8, italics: true })] })] }),
        new Paragraph({ spacing: { before: 120 } }),
        sectionHeader('JUDGMENTS / LIENS'),
        new Table({ width: { size: 9360, type: WidthType.DXA }, rows: lienRows.length ? lienRows : [new TableRow({ children: [cell('No judgments or liens found.', { span: 4, italics: true })] })] }),
      ]
    }]
  });

  return await Packer.toBuffer(doc);
}

module.exports = { generateDocx };
