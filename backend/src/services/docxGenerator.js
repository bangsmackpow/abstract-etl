const {
  Document,
  Packer,
  Paragraph,
  TextRun,
  Table,
  TableRow,
  TableCell,
  AlignmentType,
  BorderStyle,
  WidthType,
  ShadingType,
} = require('docx');

/**
 * Given a filled fields object, produce a .docx buffer.
 * Supports both V1 (Legacy) and V2 (ProTitleUSA) schemas.
 */
async function generateDocx(fields, templateVersion = 'v1') {
  if (templateVersion === 'v7') return generateV7TextDocx(fields);
  if (templateVersion === 'v6') return generateV6Docx(fields);
  if (templateVersion === 'v5') return generateV5Docx(fields);
  if (templateVersion === 'v4') return generateV4Docx(fields);
  if (templateVersion === 'v2') return generateV2Docx(fields);
  return generateV1Docx(fields);
}

/**
 * V1 (Legacy) DOCX Generator - Original implementation
 */
async function generateV1Docx(fields) {
  const f = fields; // shorthand
  const oi = f.order_info || {};

  // ── Helpers ────────────────────────────────────────────────────────────────
  const val = (v) => (v !== null && v !== undefined && v !== '' ? String(v).toUpperCase() : '');
  const dash = (v) => val(v) || '—';

  const border = { style: BorderStyle.SINGLE, size: 4, color: '000000' };
  const borders = { top: border, bottom: border, left: border, right: border };

  function cell(text, opts = {}) {
    const {
      bold = false,
      shade = null,
      span = 1,
      width = null,
      align = AlignmentType.LEFT,
      italics = false,
    } = opts;
    return new TableCell({
      borders,
      columnSpan: span,
      ...(width && { width: { size: width, type: WidthType.DXA } }),
      ...(shade && { shading: { fill: shade, type: ShadingType.CLEAR } }),
      margins: { top: 40, bottom: 40, left: 80, right: 80 },
      children: [
        new Paragraph({
          alignment: align,
          children: [new TextRun({ text: val(text), bold, italics, size: 18, font: 'Arial' })],
        }),
      ],
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
      rows: [
        new TableRow({
          children: [
            new TableCell({
              borders,
              shading: { fill: '1F4E79', type: ShadingType.CLEAR },
              margins: { top: 60, bottom: 60, left: 120, right: 120 },
              children: [
                new Paragraph({
                  children: [
                    new TextRun({
                      text: title,
                      bold: true,
                      size: 20,
                      font: 'Arial',
                      color: 'FFFFFF',
                    }),
                  ],
                }),
              ],
            }),
          ],
        }),
      ],
    });
  }

  // ── Order Information Table ────────────────────────────────────────────────
  const orderTable = new Table({
    width: { size: 9360, type: WidthType.DXA },
    columnWidths: [1200, 2400, 1200, 1800, 1200, 1560],
    rows: [
      new TableRow({
        children: [
          labelCell('File Number:', 1200),
          valueCell(dash(oi.file_number), 2400),
          labelCell('Effective Date:', 1200),
          valueCell(dash(oi.effective_date), 1800),
          labelCell('Completed:', 1200),
          valueCell(dash(oi.completed_date), 1560),
        ],
      }),
      new TableRow({
        children: [
          labelCell('Address:', 1200),
          new TableCell({
            borders,
            columnSpan: 5,
            margins: { top: 40, bottom: 40, left: 80, right: 80 },
            children: [
              new Paragraph({
                children: [
                  new TextRun({
                    text: dash(oi.property_address),
                    bold: true,
                    size: 20,
                    font: 'Arial',
                  }),
                ],
              }),
            ],
          }),
        ],
      }),
      new TableRow({
        children: [
          labelCell('County:', 1200),
          valueCell(dash(oi.county), 2400),
          labelCell('Township:', 1200),
          valueCell(dash(oi.township), 1800),
          labelCell('Parcel ID:', 1200),
          valueCell(dash(oi.parcel_id), 1560),
        ],
      }),
      new TableRow({
        children: [
          labelCell('Assessed Val:', 1200),
          valueCell(dash(oi.assessed_value), 2400),
          labelCell('Land Value:', 1200),
          valueCell(dash(oi.land_value), 1800),
          labelCell('Impr. Value:', 1200),
          valueCell(dash(oi.improvement_value), 1560),
        ],
      }),
      new TableRow({
        children: [
          labelCell('Excise Tax:', 1200),
          valueCell(dash(oi.excise_tax), 2400),
          labelCell('Search Depth:', 1200),
          valueCell(dash(oi.search_depth), 1800),
          labelCell('Marital Stat:', 1200),
          valueCell(dash(oi.marital_status), 1560),
        ],
      }),
      new TableRow({
        children: [
          labelCell('Tax Amount:', 1200),
          new TableCell({
            borders,
            width: { size: 2400, type: WidthType.DXA },
            margins: { top: 40, bottom: 40, left: 80, right: 80 },
            children: [
              new Paragraph({
                children: [
                  new TextRun({ text: `${val(oi.tax_amount_1st)} (1ST)`, size: 18, font: 'Arial' }),
                ],
              }),
              new Paragraph({
                children: [
                  new TextRun({ text: `${val(oi.tax_amount_2nd)} (2ND)`, size: 18, font: 'Arial' }),
                ],
              }),
            ],
          }),
          labelCell('Due:', 1200),
          new TableCell({
            borders,
            width: { size: 1800, type: WidthType.DXA },
            margins: { top: 40, bottom: 40, left: 80, right: 80 },
            children: [
              new Paragraph({
                children: [new TextRun({ text: val(oi.tax_due_1st), size: 18, font: 'Arial' })],
              }),
              new Paragraph({
                children: [new TextRun({ text: val(oi.tax_due_2nd), size: 18, font: 'Arial' })],
              }),
            ],
          }),
          labelCell('Delinquent:', 1200),
          valueCell(dash(oi.tax_delinquent), 1560),
        ],
      }),
      new TableRow({
        children: [
          labelCell('Tax ID:', 1200),
          valueCell(dash(oi.tax_id), 2400),
          labelCell('Paid:', 1200),
          valueCell(dash(oi.tax_paid), 1800),
          cell('', { width: 2760, span: 2 }),
        ],
      }),
      new TableRow({
        children: [
          labelCell('Current Vesting Owner:', 1200),
          new TableCell({
            borders,
            columnSpan: 5,
            margins: { top: 40, bottom: 40, left: 80, right: 80 },
            children: [
              new Paragraph({
                children: [
                  new TextRun({ text: dash(oi.current_vesting_owner), size: 18, font: 'Arial' }),
                ],
              }),
            ],
          }),
        ],
      }),
    ],
  });

  const chainRows = (f.chain_of_title || []).flatMap((e, i) => [
    new TableRow({
      children: [
        labelCell(`(${i + 1}) Document Title:`, 2000),
        valueCell(val(e.document_title), 3360),
        labelCell('Book/Inst:', 1200),
        valueCell(val(e.book_instrument), 1200),
        labelCell('Page:', 600),
        valueCell(val(e.page), 1000),
      ],
    }),
    new TableRow({
      children: [
        labelCell('Dated:', 800),
        valueCell(val(e.dated), 1400),
        labelCell('Recorded:', 900),
        valueCell(val(e.recorded), 1400),
        labelCell('Consideration:', 1200),
        valueCell(val(e.consideration), 1200),
        labelCell('In/Out?', 900),
        valueCell(e.in_out_sale === true ? 'YES' : e.in_out_sale === false ? 'NO' : '—', 1560),
      ],
    }),
    new TableRow({
      children: [
        labelCell('Grantor(s):', 1200),
        new TableCell({
          borders,
          columnSpan: 7,
          children: [
            new Paragraph({
              children: [
                new TextRun({
                  text: (e.grantors || []).map((g) => g.toUpperCase()).join('; ') || '—',
                  size: 18,
                }),
              ],
            }),
          ],
        }),
      ],
    }),
    new TableRow({
      children: [
        labelCell('Grantee(s):', 1200),
        new TableCell({
          borders,
          columnSpan: 7,
          children: [
            new Paragraph({
              children: [
                new TextRun({
                  text: (e.grantees || []).map((g) => g.toUpperCase()).join('; ') || '—',
                  size: 18,
                }),
              ],
            }),
            ...(e.notes
              ? [
                  new Paragraph({
                    children: [
                      new TextRun({
                        text: e.notes.startsWith('*')
                          ? e.notes.toUpperCase()
                          : `NOTES: ${e.notes.toUpperCase()}`,
                        size: 16,
                        italics: true,
                        color: '555555',
                      }),
                    ],
                  }),
                ]
              : []),
          ],
        }),
      ],
    }),
  ]);

  const mortgageRows = (f.mortgages || []).flatMap((m, i) => [
    new TableRow({
      children: [
        labelCell(`(${i + 1}) Document Title:`, 2000),
        valueCell(val(m.document_title), 3360),
        labelCell('Book/Inst:', 1300),
        valueCell(val(m.book_instrument), 1200),
        labelCell('Page:', 500),
        valueCell(val(m.page), 1000),
      ],
    }),
    new TableRow({
      children: [
        labelCell('Dated:', 800),
        valueCell(val(m.dated), 1400),
        labelCell('Recorded:', 900),
        valueCell(val(m.recorded), 1400),
        labelCell('Consideration:', 1200),
        valueCell(val(m.consideration), 1200),
        labelCell('Maturity:', 800),
        valueCell(val(m.maturity_date), 1660),
      ],
    }),
    new TableRow({
      children: [
        labelCell('Lender:', 1000),
        new TableCell({
          borders,
          columnSpan: 7,
          children: [
            new Paragraph({
              children: [
                new TextRun({
                  text: `${dash(m.lender)} ${m.mers_number ? `(MERS# ${m.mers_number.toUpperCase()})` : ''}`,
                  size: 18,
                }),
              ],
            }),
          ],
        }),
      ],
    }),
    new TableRow({
      children: [
        labelCell('Borrower:', 1000),
        valueCell(dash(m.borrower), 3760),
        labelCell('Trustee:', 1000),
        valueCell(dash(m.trustee), 3600),
      ],
    }),
    ...(m.notes
      ? [
          new TableRow({
            children: [
              labelCell('Notes:', 1000),
              new TableCell({
                borders,
                columnSpan: 7,
                children: [
                  new Paragraph({
                    children: [new TextRun({ text: val(m.notes), size: 16, italics: true })],
                  }),
                ],
              }),
            ],
          }),
        ]
      : []),
  ]);

  const assocRows = (f.associated_documents || []).flatMap((a, i) => [
    new TableRow({
      children: [
        labelCell(`(${i + 1}) Document Title:`, 2000),
        valueCell(val(a.document_title), 3360),
        labelCell('Book/Inst:', 1200),
        valueCell(val(a.book_instrument), 1200),
        labelCell('Page:', 600),
        valueCell(val(a.page), 1000),
      ],
    }),
    new TableRow({
      children: [
        labelCell('Dated:', 800),
        valueCell(val(a.dated), 1400),
        labelCell('Recorded:', 900),
        valueCell(val(a.recorded), 1400),
        labelCell('Consideration:', 1200),
        valueCell(val(a.consideration), 1200),
        cell('', { span: 2 }),
      ],
    }),
    new TableRow({
      children: [
        labelCell('Grantor/Assignor:', 1400),
        valueCell(dash(a.grantor_assignor), 3000),
        labelCell('Grantee/Assignee:', 1400),
        valueCell(dash(a.grantee_assignee), 3560),
      ],
    }),
    ...(a.notes
      ? [
          new TableRow({
            children: [
              labelCell('Notes:', 1400),
              new TableCell({
                borders,
                columnSpan: 7,
                children: [
                  new Paragraph({
                    children: [new TextRun({ text: val(a.notes), size: 16, italics: true })],
                  }),
                ],
              }),
            ],
          }),
        ]
      : []),
  ]);

  const lienRows = (f.judgments_liens || []).flatMap((l, i) => [
    new TableRow({
      children: [
        labelCell(`(${i + 1}) Document Title:`, 2000),
        valueCell(val(l.document_title), 3360),
        labelCell('Case #:', 1200),
        valueCell(dash(l.case_number), 2800),
      ],
    }),
    new TableRow({
      children: [
        labelCell('Dated:', 800),
        valueCell(val(l.dated), 1400),
        labelCell('Amount:', 1200),
        valueCell(dash(l.amount), 1200),
        labelCell('Recorded:', 1000),
        valueCell(dash(l.recorded), 3760),
      ],
    }),
    new TableRow({
      children: [
        labelCell('Plaintiff:', 1200),
        valueCell(dash(l.plaintiff), 3400),
        labelCell('Defendant:', 1200),
        valueCell(dash(l.defendant), 3560),
      ],
    }),
  ]);

  const miscRows = (f.misc_documents || []).flatMap((m, i) => [
    new TableRow({
      children: [
        labelCell(`(${i + 1}) Document Title:`, 2000),
        valueCell(val(m.document_title), 3360),
        labelCell('Book/Inst:', 1200),
        valueCell(val(m.book_instrument), 1200),
        labelCell('Page:', 600),
        valueCell(val(m.page), 1000),
      ],
    }),
    new TableRow({
      children: [
        labelCell('Dated:', 800),
        valueCell(val(m.dated), 1400),
        labelCell('Recorded:', 900),
        valueCell(val(m.recorded), 1400),
        labelCell('Consideration:', 1200),
        valueCell(val(m.consideration), 1200),
        cell('', { span: 2 }),
      ],
    }),
    new TableRow({
      children: [
        labelCell('Grantor/Assignor:', 1400),
        valueCell(dash(m.grantor_assignor), 3000),
        labelCell('Grantee/Assignee:', 1400),
        valueCell(dash(m.grantee_assignee), 3560),
      ],
    }),
  ]);

  const legalPara = new Table({
    width: { size: 9360, type: WidthType.DXA },
    rows: [
      new TableRow({
        children: [
          new TableCell({
            borders,
            margins: { top: 100, bottom: 100, left: 100, right: 100 },
            children: [
              new Paragraph({
                children: [new TextRun({ text: dash(f.legal_description), size: 18 })],
              }),
            ],
          }),
        ],
      }),
    ],
  });

  const additionalPara = new Table({
    width: { size: 9360, type: WidthType.DXA },
    rows: [
      new TableRow({
        children: [
          new TableCell({
            borders,
            margins: { top: 100, bottom: 100, left: 100, right: 100 },
            children: [
              new Paragraph({
                children: [
                  new TextRun({ text: dash(f.additional_information), size: 18, italics: true }),
                ],
              }),
            ],
          }),
        ],
      }),
    ],
  });

  const namesPara = new Table({
    width: { size: 9360, type: WidthType.DXA },
    rows: [
      new TableRow({
        children: [
          new TableCell({
            borders,
            margins: { top: 100, bottom: 100, left: 100, right: 100 },
            children: [
              new Paragraph({
                children: [
                  new TextRun({
                    text:
                      (f.names_searched || []).map((n) => n.toUpperCase()).join('; ') ||
                      'NONE PROVIDED.',
                    size: 18,
                  }),
                ],
              }),
            ],
          }),
        ],
      }),
    ],
  });

  const doc = new Document({
    styles: { default: { document: { run: { font: 'Arial', size: 18 } } } },
    sections: [
      {
        properties: { margin: { top: 720, right: 720, bottom: 720, left: 720 } },
        children: [
          sectionHeader('ORDER INFORMATION'),
          orderTable,
          new Paragraph({ spacing: { before: 120 } }),
          sectionHeader('LEGAL DESCRIPTION'),
          legalPara,
          new Paragraph({ spacing: { before: 120 } }),
          sectionHeader('CHAIN OF TITLE'),
          new Table({
            width: { size: 9360, type: WidthType.DXA },
            rows: chainRows.length
              ? chainRows
              : [
                  new TableRow({
                    children: [cell('NO CHAIN ENTRIES FOUND.', { span: 8, italics: true })],
                  }),
                ],
          }),
          new Paragraph({ spacing: { before: 120 } }),
          sectionHeader('MORTGAGES / DEEDS OF TRUST'),
          new Table({
            width: { size: 9360, type: WidthType.DXA },
            rows: mortgageRows.length
              ? mortgageRows
              : [
                  new TableRow({
                    children: [cell('NO OPEN MORTGAGES FOUND.', { span: 8, italics: true })],
                  }),
                ],
          }),
          new Paragraph({ spacing: { before: 120 } }),
          sectionHeader('ASSOCIATED DOCUMENTS'),
          new Table({
            width: { size: 9360, type: WidthType.DXA },
            rows: assocRows.length
              ? assocRows
              : [
                  new TableRow({
                    children: [cell('NO ASSOCIATED DOCUMENTS FOUND.', { span: 8, italics: true })],
                  }),
                ],
          }),
          new Paragraph({ spacing: { before: 120 } }),
          sectionHeader('JUDGMENTS / LIENS'),
          new Table({
            width: { size: 9360, type: WidthType.DXA },
            rows: lienRows.length
              ? lienRows
              : [
                  new TableRow({
                    children: [cell('NO JUDGMENTS OR LIENS FOUND.', { span: 4, italics: true })],
                  }),
                ],
          }),
          new Paragraph({ spacing: { before: 120 } }),
          sectionHeader('MISCELLANEOUS DOCUMENTS'),
          new Table({
            width: { size: 9360, type: WidthType.DXA },
            rows: miscRows.length
              ? miscRows
              : [
                  new TableRow({
                    children: [
                      cell('NO MISCELLANEOUS DOCUMENTS FOUND.', { span: 4, italics: true }),
                    ],
                  }),
                ],
          }),
          new Paragraph({ spacing: { before: 120 } }),
          sectionHeader('NAMES SEARCHED'),
          namesPara,
          new Paragraph({ spacing: { before: 120 } }),
          sectionHeader('ADDITIONAL INFORMATION'),
          additionalPara,
        ],
      },
    ],
  });

  return await Packer.toBuffer(doc);
}

/**
 * V4 (Hazelwood) DOCX Generator
 * Matches V4 PDF structure with Hazelwood layout, Times font, and V4 schema fields.
 */
async function generateV4Docx(fields) {
  const f = fields;
  const oi = f.order_info || {};
  const vi = f.vesting_info || {};
  const tax = f.tax_status || {};

  const val = (v) => (v !== null && v !== undefined && v !== '' ? String(v).toUpperCase() : '');
  const dash = (v) => val(v) || '—';

  const border = { style: BorderStyle.SINGLE, size: 4, color: '000000' };
  const borders = { top: border, bottom: border, left: border, right: border };

  function cell(text, opts = {}) {
    const { bold = false, shade = null, span = 1, width = null, align = AlignmentType.LEFT, italics = false } = opts;
    return new TableCell({
      borders,
      columnSpan: span,
      ...(width && { width: { size: width, type: WidthType.DXA } }),
      ...(shade && { shading: { fill: shade, type: ShadingType.CLEAR } }),
      margins: { top: 40, bottom: 40, left: 80, right: 80 },
      children: [
        new Paragraph({
          alignment: align,
          children: [new TextRun({ text: val(text), bold, italics, size: 18, font: 'Times New Roman' })],
        }),
      ],
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
      rows: [
        new TableRow({
          children: [
            new TableCell({
              borders,
              shading: { fill: '1F4E79', type: ShadingType.CLEAR },
              margins: { top: 60, bottom: 60, left: 120, right: 120 },
              children: [
                new Paragraph({
                  children: [new TextRun({ text: title, bold: true, size: 20, font: 'Times New Roman', color: 'FFFFFF' })],
                }),
              ],
            }),
          ],
        }),
      ],
    });
  }

  // ── Order Information Table ────────────────────────────────────────────────
  const parcelIdsText = (oi.parcel_ids || []).length > 0
    ? (oi.parcel_ids || []).map((p) => dash(p)).join('; ')
    : '—';

  const orderTable = new Table({
    width: { size: 9360, type: WidthType.DXA },
    columnWidths: [1200, 2400, 1200, 1800, 1200, 1560],
    rows: [
      new TableRow({
        children: [
          labelCell('Order Number:', 1200),
          valueCell(dash(oi.order_number), 2400),
          labelCell('Effective Date:', 1200),
          valueCell(dash(oi.effective_date), 1800),
          labelCell('Completed:', 1200),
          valueCell(dash(oi.completed_date), 1560),
        ],
      }),
      new TableRow({
        children: [
          labelCell('Address:', 1200),
          new TableCell({
            borders,
            columnSpan: 5,
            margins: { top: 40, bottom: 40, left: 80, right: 80 },
            children: [
              new Paragraph({
                children: [
                  new TextRun({
                    text: dash(oi.property_address),
                    bold: true,
                    size: 20,
                    font: 'Times New Roman',
                  }),
                ],
              }),
            ],
          }),
        ],
      }),
      new TableRow({
        children: [
          labelCell('County:', 1200),
          valueCell(dash(oi.county), 2400),
          labelCell('Township:', 1200),
          valueCell(dash(oi.township), 1800),
          labelCell('Parcel ID(s):', 1200),
          valueCell(parcelIdsText, 1560),
        ],
      }),
      new TableRow({
        children: [
          labelCell('Assessed Val:', 1200),
          valueCell(dash(oi.assessed_value), 2400),
          labelCell('Land Value:', 1200),
          valueCell(dash(oi.land_value), 1800),
          labelCell('Impr. Value:', 1200),
          valueCell(dash(oi.improvement_value), 1560),
        ],
      }),
      new TableRow({
        children: [
          labelCell('Tax Amount:', 1200),
          valueCell(dash(oi.tax_amount), 2400),
          labelCell('Tax Due:', 1200),
          valueCell(dash(oi.tax_due), 1800),
          labelCell('Delinquent:', 1200),
          valueCell(dash(oi.tax_delinquent), 1560),
        ],
      }),
      new TableRow({
        children: [
          labelCell('Tax ID:', 1200),
          valueCell(dash(oi.tax_id), 2400),
          labelCell('Tax Paid:', 1200),
          valueCell(dash(oi.tax_paid), 1800),
          cell('', { width: 2760, span: 2 }),
        ],
      }),
      new TableRow({
        children: [
          labelCell('Current Vesting Owner:', 1200),
          new TableCell({
            borders,
            columnSpan: 5,
            margins: { top: 40, bottom: 40, left: 80, right: 80 },
            children: [
              new Paragraph({
                children: [
                  new TextRun({ text: dash(oi.current_vesting_owner), size: 18, font: 'Times New Roman' }),
                ],
              }),
            ],
          }),
        ],
      }),
    ],
  });

  // ── Vesting Information Table ──────────────────────────────────────────────
  const vestTable = new Table({
    width: { size: 9360, type: WidthType.DXA },
    columnWidths: [1400, 2600, 1400, 2000, 1400, 560],
    rows: [
      new TableRow({
        children: [
          labelCell('Grantee:', 1400),
          valueCell(dash(vi.grantee), 2600),
          labelCell('Grantor:', 1400),
          valueCell(dash(vi.grantor), 2000),
          labelCell('Deed Date:', 1400),
          valueCell(dash(vi.deed_date), 560),
        ],
      }),
      new TableRow({
        children: [
          labelCell('Recorded:', 1400),
          valueCell(dash(vi.recorded_date), 2600),
          labelCell('Instrument/Book/Page:', 1400),
          valueCell(dash(vi.instrument_book_page), 2000),
          labelCell('Consideration:', 1400),
          valueCell(dash(vi.consideration), 560),
        ],
      }),
      new TableRow({
        children: [
          labelCell('Deed Type:', 1400),
          valueCell(dash(vi.deed_type), 2600),
          labelCell('In/Out Sale:', 1400),
          valueCell(vi.in_out_sale === true ? 'YES' : vi.in_out_sale === false ? 'NO' : '—', 2000),
          cell('', { width: 1960, span: 2 }),
        ],
      }),
      ...(vi.notes ? [
        new TableRow({
          children: [
            labelCell('Notes:', 1400),
            new TableCell({
              borders,
              columnSpan: 5,
              children: [
                new Paragraph({
                  children: [new TextRun({ text: val(vi.notes), size: 16, italics: true, font: 'Times New Roman', color: '555555' })],
                }),
              ],
            }),
          ],
        }),
      ] : []),
    ],
  });

  // ── Chain of Title ─────────────────────────────────────────────────────────
  const chainRows = (f.chain_of_title || []).flatMap((e, i) => {
    const rows = [
      new TableRow({
        children: [
          labelCell(`(${i + 1}) Deed Type:`, 2000),
          valueCell(dash(e.deed_type), 3360),
          labelCell('Book/Inst:', 1200),
          valueCell(dash(e.instrument_book_page), 1200),
          labelCell('Page:', 600),
          valueCell(dash(e.page), 1000),
        ],
      }),
      new TableRow({
        children: [
          labelCell('Dated:', 800),
          valueCell(dash(e.deed_date), 1400),
          labelCell('Recorded:', 900),
          valueCell(dash(e.recorded_date), 1400),
          labelCell('Consideration:', 1200),
          valueCell(dash(e.consideration), 1200),
          cell('', { span: 2 }),
        ],
      }),
      new TableRow({
        children: [
          labelCell('Grantor(s):', 1200),
          new TableCell({
            borders,
            columnSpan: 7,
            children: [
              new Paragraph({
                children: [
                  new TextRun({
                    text: (e.grantors || []).map((g) => g.toUpperCase()).join('; ') || '—',
                    size: 18,
                    font: 'Times New Roman',
                  }),
                ],
              }),
            ],
          }),
        ],
      }),
      new TableRow({
        children: [
          labelCell('Grantee(s):', 1200),
          new TableCell({
            borders,
            columnSpan: 7,
            children: [
              new Paragraph({
                children: [
                  new TextRun({
                    text: (e.grantees || []).map((g) => g.toUpperCase()).join('; ') || '—',
                    size: 18,
                    font: 'Times New Roman',
                  }),
                ],
              }),
              ...(e.notes
                ? [
                    new Paragraph({
                      children: [
                        new TextRun({
                          text: e.notes.startsWith('*')
                            ? e.notes.toUpperCase()
                            : `NOTES: ${e.notes.toUpperCase()}`,
                          size: 16,
                          italics: true,
                          color: '555555',
                          font: 'Times New Roman',
                        }),
                      ],
                    }),
                  ]
                : []),
            ],
          }),
        ],
      }),
    ];

    // Related documents
    if (e.related_documents && e.related_documents.length > 0) {
      rows.push(
        new TableRow({
          children: [
            labelCell('Related Docs:', 1200),
            new TableCell({
              borders,
              columnSpan: 7,
              children: [
                ...e.related_documents.flatMap((rd, ri) => [
                  new Paragraph({
                    children: [
                      new TextRun({
                        text: `${ri + 1}. ${dash(rd.document_type || rd)} | ${dash(rd.book_instrument || rd.book || '')} / ${dash(rd.page || '')} | ${dash(rd.recorded_date || rd.recorded || '')}`,
                        size: 16,
                        italics: true,
                        font: 'Times New Roman',
                      }),
                    ],
                    spacing: { before: ri > 0 ? 40 : 0 },
                  }),
                ]),
              ],
            }),
          ],
        }),
      );
    }

    return rows;
  });

  // ── Mortgages (oldest to newest) ───────────────────────────────────────────
  const mortgageRows = (f.mortgages || []).flatMap((m, i) => [
    new TableRow({
      children: [
        labelCell(`(${i + 1}) Document Type:`, 2000),
        valueCell(dash(m.document_title || m.mortgage_type), 3360),
        labelCell('Book/Inst:', 1300),
        valueCell(dash(m.book || m.instrument), 1200),
        labelCell('Page:', 500),
        valueCell(dash(m.page), 1000),
      ],
    }),
    new TableRow({
      children: [
        labelCell('Mortgage Date:', 800),
        valueCell(dash(m.mortgage_date), 1400),
        labelCell('Recorded:', 900),
        valueCell(dash(m.recorded_date), 1400),
        labelCell('Amount:', 1200),
        valueCell(dash(m.mortgage_amount), 1200),
        labelCell('Maturity:', 800),
        valueCell(dash(m.maturity_date), 1660),
      ],
    }),
    new TableRow({
      children: [
        labelCell('Lender:', 1000),
        new TableCell({
          borders,
          columnSpan: 7,
          children: [
            new Paragraph({
              children: [
                new TextRun({
                  text: `${dash(m.lender)} ${m.mers === 'Yes' ? '(MERS)' : ''}`,
                  size: 18,
                  font: 'Times New Roman',
                }),
              ],
            }),
          ],
        }),
      ],
    }),
    new TableRow({
      children: [
        labelCell('Borrower:', 1000),
        valueCell(dash(m.borrower), 3760),
        labelCell('Type:', 1000),
        valueCell(dash(m.mortgage_type), 3600),
      ],
    }),
    ...(m.subordination_notes
      ? [
          new TableRow({
            children: [
              labelCell('Subordination:', 1000),
              new TableCell({
                borders,
                columnSpan: 7,
                children: [
                  new Paragraph({
                    children: [new TextRun({ text: val(m.subordination_notes), size: 16, italics: true, font: 'Times New Roman' })],
                  }),
                ],
              }),
            ],
          }),
        ]
      : []),
    ...(m.assignments && m.assignments.length > 0
      ? [
          new TableRow({
            children: [
              labelCell('Assignments:', 1000),
              new TableCell({
                borders,
                columnSpan: 7,
                children: [
                  ...m.assignments.flatMap((a, ai) => [
                    new Paragraph({
                      children: [
                        new TextRun({
                          text: `${ai + 1}. ${dash(a.assignor)} → ${dash(a.assignee)} | ${dash(a.document_type)} | ${dash(a.book)}/${dash(a.page)}/${dash(a.instrument)} | ${dash(a.recorded_date)}`,
                          size: 16,
                          italics: true,
                          font: 'Times New Roman',
                        }),
                      ],
                      spacing: { before: ai > 0 ? 40 : 0 },
                    }),
                  ]),
                ],
              }),
            ],
          }),
        ]
      : []),
  ]);

  // ── Tax Status with Installments ───────────────────────────────────────────
  const taxRows = [
    new TableRow({
      children: [
        labelCell('Parcel ID:', 1400),
        valueCell(dash(tax.parcel_id), 2600),
        labelCell('Tax Year:', 1400),
        valueCell(dash(tax.tax_year), 2000),
        labelCell('Status:', 1400),
        valueCell(dash(tax.status), 560),
      ],
    }),
    new TableRow({
      children: [
        labelCell('Total Amount:', 1400),
        valueCell(dash(tax.total_amount), 2600),
        labelCell('Paid Date:', 1400),
        valueCell(dash(tax.paid_date), 2000),
        labelCell('Delinquent:', 1400),
        valueCell(dash(tax.delinquent_amount), 560),
      ],
    }),
  ];

  const installments = tax.installments || [];
  if (installments.length > 0) {
    taxRows.push(
      new TableRow({
        children: [
          labelCell('Installments:', 1400),
          new TableCell({
            borders,
            columnSpan: 5,
            children: installments.flatMap((inst, ii) => [
              new Paragraph({
                children: [
                  new TextRun({
                    text: `${ii + 1}. ${dash(inst.installment_number)} | Amount: ${dash(inst.amount)} | Due: ${dash(inst.due_date)} | Status: ${dash(inst.status)} | Paid: ${dash(inst.paid_date)} | Delinquent: ${dash(inst.delinquent_amount)} | Fees: ${dash(inst.penalties_fees)}`,
                    size: 16,
                    font: 'Times New Roman',
                  }),
                ],
                spacing: { before: ii > 0 ? 40 : 0 },
              }),
            ]),
          }),
        ],
      }),
    );
  }

  const taxTable = new Table({
    width: { size: 9360, type: WidthType.DXA },
    columnWidths: [1400, 2600, 1400, 2000, 1400, 560],
    rows: taxRows,
  });

  // ── Associated Documents ───────────────────────────────────────────────────
  const assocRows = (f.associated_documents || []).flatMap((a, i) => [
    new TableRow({
      children: [
        labelCell(`(${i + 1}) Document Type:`, 2000),
        valueCell(dash(a.document_type), 3360),
        labelCell('Book/Inst:', 1200),
        valueCell(dash(a.book_instrument), 1200),
        labelCell('Page:', 600),
        valueCell(dash(a.page), 1000),
      ],
    }),
    new TableRow({
      children: [
        labelCell('Dated:', 800),
        valueCell(dash(a.dated), 1400),
        labelCell('Recorded:', 900),
        valueCell(dash(a.recorded), 1400),
        cell('', { width: 3960, span: 4 }),
      ],
    }),
    new TableRow({
      children: [
        labelCell('Grantor/Assignor:', 1400),
        valueCell(dash(a.grantor_assignor), 3000),
        labelCell('Grantee/Assignee:', 1400),
        valueCell(dash(a.grantee_assignee), 3560),
      ],
    }),
    ...(a.notes
      ? [
          new TableRow({
            children: [
              labelCell('Notes:', 1400),
              new TableCell({
                borders,
                columnSpan: 7,
                children: [
                  new Paragraph({
                    children: [new TextRun({ text: val(a.notes), size: 16, italics: true, font: 'Times New Roman' })],
                  }),
                ],
              }),
            ],
          }),
        ]
      : []),
  ]);

  // ── Judgments/Liens ────────────────────────────────────────────────────────
  const lienRows = (f.judgments_liens || []).flatMap((l, i) => [
    new TableRow({
      children: [
        labelCell(`(${i + 1}) Document Title:`, 2000),
        valueCell(dash(l.document_title), 3360),
        labelCell('Case #:', 1200),
        valueCell(dash(l.case_number), 2800),
      ],
    }),
    new TableRow({
      children: [
        labelCell('Dated:', 800),
        valueCell(dash(l.dated), 1400),
        labelCell('Amount:', 1200),
        valueCell(dash(l.amount), 1200),
        labelCell('Recorded:', 1000),
        valueCell(dash(l.recorded), 3760),
      ],
    }),
    new TableRow({
      children: [
        labelCell('Plaintiff:', 1200),
        valueCell(dash(l.plaintiff), 3400),
        labelCell('Defendant:', 1200),
        valueCell(dash(l.defendant), 3560),
      ],
    }),
  ]);

  // ── Miscellaneous Documents ────────────────────────────────────────────────
  const miscRows = (f.misc_documents || []).flatMap((m, i) => [
    new TableRow({
      children: [
        labelCell(`(${i + 1}) Document Title:`, 2000),
        valueCell(dash(m.document_title), 3360),
        labelCell('Book/Inst:', 1200),
        valueCell(dash(m.book_instrument), 1200),
        labelCell('Page:', 600),
        valueCell(dash(m.page), 1000),
      ],
    }),
    new TableRow({
      children: [
        labelCell('Dated:', 800),
        valueCell(dash(m.dated), 1400),
        labelCell('Recorded:', 900),
        valueCell(dash(m.recorded), 1400),
        labelCell('Consideration:', 1200),
        valueCell(dash(m.consideration), 1200),
        cell('', { span: 2 }),
      ],
    }),
    new TableRow({
      children: [
        labelCell('Grantor/Assignor:', 1400),
        valueCell(dash(m.grantor_assignor), 3000),
        labelCell('Grantee/Assignee:', 1400),
        valueCell(dash(m.grantee_assignee), 3560),
      ],
    }),
  ]);

  // ── Legal Description ──────────────────────────────────────────────────────
  const legalPara = new Table({
    width: { size: 9360, type: WidthType.DXA },
    rows: [
      new TableRow({
        children: [
          new TableCell({
            borders,
            margins: { top: 100, bottom: 100, left: 100, right: 100 },
            children: [
              new Paragraph({
                children: [new TextRun({ text: dash(f.legal_description), size: 18, font: 'Times New Roman' })],
              }),
            ],
          }),
        ],
      }),
    ],
  });

  // ── Names Searched ─────────────────────────────────────────────────────────
  const namesPara = new Table({
    width: { size: 9360, type: WidthType.DXA },
    rows: [
      new TableRow({
        children: [
          new TableCell({
            borders,
            margins: { top: 100, bottom: 100, left: 100, right: 100 },
            children: [
              new Paragraph({
                children: [
                  new TextRun({
                    text: (f.names_searched || []).map((n) => n.toUpperCase()).join('; ') || 'NONE PROVIDED.',
                    size: 18,
                    font: 'Times New Roman',
                  }),
                ],
              }),
            ],
          }),
        ],
      }),
    ],
  });

  // ── Additional Information ─────────────────────────────────────────────────
  const additionalPara = new Table({
    width: { size: 9360, type: WidthType.DXA },
    rows: [
      new TableRow({
        children: [
          new TableCell({
            borders,
            margins: { top: 100, bottom: 100, left: 100, right: 100 },
            children: [
              new Paragraph({
                children: [
                  new TextRun({ text: dash(f.additional_information), size: 18, italics: true, font: 'Times New Roman' }),
                ],
              }),
            ],
          }),
        ],
      }),
    ],
  });

  // ── Build Document ─────────────────────────────────────────────────────────
  const doc = new Document({
    styles: { default: { document: { run: { font: 'Times New Roman', size: 18 } } } },
    sections: [
      {
        properties: { margin: { top: 720, right: 720, bottom: 720, left: 720 } },
        children: [
          sectionHeader('ORDER INFORMATION'),
          orderTable,
          new Paragraph({ spacing: { before: 120 } }),
          sectionHeader('VESTING INFORMATION'),
          vestTable,
          new Paragraph({ spacing: { before: 120 } }),
          sectionHeader('CHAIN OF TITLE'),
          new Table({
            width: { size: 9360, type: WidthType.DXA },
            rows: chainRows.length
              ? chainRows
              : [new TableRow({ children: [cell('NO CHAIN ENTRIES FOUND.', { span: 8, italics: true })] })],
          }),
          new Paragraph({ spacing: { before: 120 } }),
          sectionHeader('MORTGAGES / DEEDS OF TRUST'),
          new Table({
            width: { size: 9360, type: WidthType.DXA },
            rows: mortgageRows.length
              ? mortgageRows
              : [new TableRow({ children: [cell('NO OPEN MORTGAGES FOUND.', { span: 8, italics: true })] })],
          }),
          new Paragraph({ spacing: { before: 120 } }),
          sectionHeader('TAX STATUS'),
          taxTable,
          new Paragraph({ spacing: { before: 120 } }),
          sectionHeader('ASSOCIATED DOCUMENTS'),
          new Table({
            width: { size: 9360, type: WidthType.DXA },
            rows: assocRows.length
              ? assocRows
              : [new TableRow({ children: [cell('NO ASSOCIATED DOCUMENTS FOUND.', { span: 8, italics: true })] })],
          }),
          new Paragraph({ spacing: { before: 120 } }),
          sectionHeader('JUDGMENTS / LIENS'),
          new Table({
            width: { size: 9360, type: WidthType.DXA },
            rows: lienRows.length
              ? lienRows
              : [new TableRow({ children: [cell('NO JUDGMENTS OR LIENS FOUND.', { span: 4, italics: true })] })],
          }),
          new Paragraph({ spacing: { before: 120 } }),
          sectionHeader('MISCELLANEOUS DOCUMENTS'),
          new Table({
            width: { size: 9360, type: WidthType.DXA },
            rows: miscRows.length
              ? miscRows
              : [new TableRow({ children: [cell('NO MISCELLANEOUS DOCUMENTS FOUND.', { span: 4, italics: true })] })],
          }),
          new Paragraph({ spacing: { before: 120 } }),
          sectionHeader('LEGAL DESCRIPTION'),
          legalPara,
          new Paragraph({ spacing: { before: 120 } }),
          sectionHeader('NAMES SEARCHED'),
          namesPara,
          new Paragraph({ spacing: { before: 120 } }),
          sectionHeader('ADDITIONAL INFORMATION'),
          additionalPara,
        ],
      },
    ],
  });

  return await Packer.toBuffer(doc);
}

/**
 * V2 (ProTitleUSA) DOCX Generator
 */
async function generateV2Docx(fields) {
  const f = fields;
  const prop = f.property_info || {};
  const vest = f.vesting_info || {};

  const val = (v) => (v !== null && v !== undefined && v !== '' ? String(v).toUpperCase() : '');
  const dash = (v) => val(v) || '—';

  const border = { style: BorderStyle.SINGLE, size: 4, color: '000000' };
  const borders = { top: border, bottom: border, left: border, right: border };

  function cell(text, opts = {}) {
    const { bold = false, shade = null, span = 1, width = null, align = AlignmentType.LEFT, italics = false } = opts;
    return new TableCell({
      borders,
      columnSpan: span,
      ...(width && { width: { size: width, type: WidthType.DXA } }),
      ...(shade && { shading: { fill: shade, type: ShadingType.CLEAR } }),
      margins: { top: 40, bottom: 40, left: 80, right: 80 },
      children: [
        new Paragraph({
          alignment: align,
          children: [new TextRun({ text: val(text), bold, italics, size: 18, font: 'Arial' })],
        }),
      ],
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
      rows: [
        new TableRow({
          children: [
            new TableCell({
              borders,
              shading: { fill: '1F4E79', type: ShadingType.CLEAR },
              margins: { top: 60, bottom: 60, left: 120, right: 120 },
              children: [
                new Paragraph({
                  children: [new TextRun({ text: title, bold: true, size: 20, font: 'Arial', color: 'FFFFFF' })],
                }),
              ],
            }),
          ],
        }),
      ],
    });
  }

  // Property Information
  const propTable = new Table({
    width: { size: 9360, type: WidthType.DXA },
    columnWidths: [1400, 2600, 1400, 2000, 1400, 560],
    rows: [
      new TableRow({
        children: [
          labelCell('ProTitle Order#:', 1400),
          valueCell(dash(prop.order_no), 2600),
          labelCell('Completed:', 1400),
          valueCell(dash(prop.completed_date), 2000),
          labelCell('Index Date:', 1400),
          valueCell(dash(prop.index_date), 560),
        ],
      }),
      new TableRow({
        children: [
          labelCell('Address:', 1400),
          new TableCell({
            borders,
            columnSpan: 5,
            margins: { top: 40, bottom: 40, left: 80, right: 80 },
            children: [
              new Paragraph({
                children: [new TextRun({ text: dash(prop.address), bold: true, size: 20, font: 'Arial' })],
              }),
            ],
          }),
        ],
      }),
      new TableRow({
        children: [
          labelCell('County:', 1400),
          valueCell(dash(prop.county), 2600),
          labelCell('APN/PIN:', 1400),
          valueCell(dash(prop.apn_parcel_pin), 2000),
          labelCell('Current Owner:', 1400),
          valueCell(dash(prop.current_owner), 560),
        ],
      }),
    ],
  });

  // Vesting Information
  const vestTable = new Table({
    width: { size: 9360, type: WidthType.DXA },
    columnWidths: [1400, 2600, 1400, 2000, 1400, 560],
    rows: [
      new TableRow({
        children: [
          labelCell('Grantee:', 1400),
          valueCell(dash(vest.grantee), 2600),
          labelCell('Grantor:', 1400),
          valueCell(dash(vest.grantor), 2000),
          labelCell('Deed Date:', 1400),
          valueCell(dash(vest.deed_date), 560),
        ],
      }),
      new TableRow({
        children: [
          labelCell('Recorded:', 1400),
          valueCell(dash(vest.recorded_date), 2600),
          labelCell('Instrument/Book/Page:', 1400),
          valueCell(dash(vest.instrument_book_page), 2000),
          labelCell('Consideration:', 1400),
          valueCell(dash(vest.consideration_amount), 560),
        ],
      }),
      new TableRow({
        children: [
          labelCell('Sale Price:', 1400),
          valueCell(dash(vest.sale_price), 2600),
          labelCell('Deed Type:', 1400),
          valueCell(dash(vest.deed_type), 2000),
          labelCell('Probate:', 1400),
          valueCell(dash(vest.probate_status), 560),
        ],
      }),
      new TableRow({
        children: [
          labelCell('Divorce:', 1400),
          valueCell(dash(vest.divorce_status), 2600),
          cell('', { width: 5360, span: 3 }),
        ],
      }),
    ],
  });

  // Chain of Title
  const chainRows = (f.chain_of_title || []).flatMap((e, i) => [
    new TableRow({
      children: [
        labelCell(`Entry ${i + 1}:`, 1400),
        new TableCell({
          borders,
          columnSpan: 5,
          children: [
            new Paragraph({
              children: [new TextRun({ text: `GRANTEE: ${dash(e.grantee)} | GRANTOR: ${dash(e.grantor)}`, bold: true, size: 18 })],
            }),
          ],
        }),
      ],
    }),
    new TableRow({
      children: [
        labelCell('Deed Date:', 1400),
        valueCell(dash(e.deed_date), 2600),
        labelCell('Recorded:', 1400),
        valueCell(dash(e.recorded_date), 2000),
        labelCell('Instrument:', 1400),
        valueCell(dash(e.instrument_book_page), 560),
      ],
    }),
    new TableRow({
      children: [
        labelCell('Consideration:', 1400),
        valueCell(dash(e.consideration_amount), 2600),
        labelCell('Deed Type:', 1400),
        valueCell(dash(e.deed_type), 2000),
        cell('', { width: 1960, span: 2 }),
      ],
    }),
    ...(e.notes ? [
      new TableRow({
        children: [
          labelCell('Notes:', 1400),
          new TableCell({
            borders,
            columnSpan: 5,
            children: [
              new Paragraph({
                children: [new TextRun({ text: val(e.notes), size: 16, italics: true, color: '555555' })],
              }),
            ],
          }),
        ],
      }),
    ] : []),
  ]);

  const chainTable = new Table({
    width: { size: 9360, type: WidthType.DXA },
    columnWidths: [1400, 2600, 1400, 2000, 1400, 560],
    rows: chainRows.length ? chainRows : [
      new TableRow({
        children: [cell('NO CHAIN OF TITLE ENTRIES FOUND.', { span: 6, italics: true })],
      }),
    ],
  });

  // Mortgages
  const mortgageSections = (f.mortgages || []).flatMap((m, i) => [
    sectionHeader(`MORTGAGE ${i + 1}`),
    new Table({
      width: { size: 9360, type: WidthType.DXA },
      columnWidths: [1400, 2600, 1400, 2000, 1400, 560],
      rows: [
        new TableRow({
          children: [
            labelCell('Borrower:', 1400),
            valueCell(dash(m.borrower), 2600),
            labelCell('Lender:', 1400),
            valueCell(dash(m.lender), 2000),
            labelCell('Amount:', 1400),
            valueCell(dash(m.mortgage_amount), 560),
          ],
        }),
        new TableRow({
          children: [
            labelCell('Mortgage Date:', 1400),
            valueCell(dash(m.mortgage_date), 2600),
            labelCell('Recorded:', 1400),
            valueCell(dash(m.recorded_date), 2000),
            labelCell('Maturity:', 1400),
            valueCell(dash(m.maturity_date), 560),
          ],
        }),
        new TableRow({
          children: [
            labelCell('Book/Page/Inst:', 1400),
            valueCell(`${dash(m.book)}/${dash(m.page)}/${dash(m.instrument)}`, 2600),
            labelCell('Type:', 1400),
            valueCell(dash(m.mortgage_type), 2000),
            labelCell('Vesting:', 1400),
            valueCell(dash(m.vesting_status), 560),
          ],
        }),
        new TableRow({
          children: [
            labelCell('MERS:', 1400),
            valueCell(dash(m.mers), 2600),
            cell('', { width: 5360, span: 3 }),
          ],
        }),
      ],
    }),
    ...(m.assignments && m.assignments.length > 0 ? [
      new Paragraph({ text: `Assignments (${m.assignments.length}):`, bold: true, spacing: { before: 120 } }),
      ...m.assignments.map((a, ai) => new Paragraph({
        text: `  ${ai + 1}. ${dash(a.assignor)} → ${dash(a.assignee)} | Recorded: ${dash(a.recorded_date)} | Instrument: ${dash(a.instrument)}`,
        spacing: { before: 60 },
      })),
    ] : []),
    new Paragraph({ spacing: { before: 120 } }),
  ]);

  // Tax Status
  const tax = f.tax_status || {};
  const taxTable = new Table({
    width: { size: 9360, type: WidthType.DXA },
    columnWidths: [1400, 2600, 1400, 2000, 1400, 560],
    rows: [
      new TableRow({
        children: [
          labelCell('Parcel ID:', 1400),
          valueCell(dash(tax.parcel_id), 2600),
          labelCell('Tax Year:', 1400),
          valueCell(dash(tax.tax_year), 2000),
          labelCell('Status:', 1400),
          valueCell(dash(tax.status), 560),
        ],
      }),
      new TableRow({
        children: [
          labelCell('Total Amount:', 1400),
          valueCell(dash(tax.total_amount), 2600),
          labelCell('Paid Date:', 1400),
          valueCell(dash(tax.paid_date), 2000),
          labelCell('Delinquent:', 1400),
          valueCell(dash(tax.delinquent_amount), 560),
        ],
      }),
    ],
  });

  // Associated Documents
  const assocRows = (f.associated_documents || []).flatMap((a, i) => [
    new TableRow({
      children: [
        labelCell(`(${i + 1}) Document Title:`, 2000),
        valueCell(dash(a.document_title), 3360),
        labelCell('Book/Inst:', 1200),
        valueCell(dash(a.book_instrument), 1200),
        labelCell('Page:', 600),
        valueCell(dash(a.page), 1000),
      ],
    }),
    new TableRow({
      children: [
        labelCell('Dated:', 800),
        valueCell(dash(a.dated), 1400),
        labelCell('Recorded:', 900),
        valueCell(dash(a.recorded), 1400),
        labelCell('Consideration:', 1200),
        valueCell(dash(a.consideration), 1200),
        cell('', { span: 2 }),
      ],
    }),
    new TableRow({
      children: [
        labelCell('Grantor/Assignor:', 1400),
        valueCell(dash(a.grantor_assignor), 3000),
        labelCell('Grantee/Assignee:', 1400),
        valueCell(dash(a.grantee_assignee), 3560),
      ],
    }),
    ...(a.notes
      ? [
          new TableRow({
            children: [
              labelCell('Notes:', 1400),
              new TableCell({
                borders,
                columnSpan: 7,
                children: [
                  new Paragraph({
                    children: [new TextRun({ text: val(a.notes), size: 16, italics: true })],
                  }),
                ],
              }),
            ],
          }),
        ]
      : []),
  ]);

  const assocTable = new Table({
    width: { size: 9360, type: WidthType.DXA },
    rows: assocRows.length
      ? assocRows
      : [
          new TableRow({
            children: [cell('NO ASSOCIATED DOCUMENTS FOUND.', { span: 8, italics: true })],
          }),
        ],
  });

  // Judgments/Liens
  const lienRows = (f.judgments_liens || []).flatMap((l, i) => [
    new TableRow({
      children: [
        labelCell(`(${i + 1}) Document Title:`, 2000),
        valueCell(dash(l.document_title), 3360),
        labelCell('Case #:', 1200),
        valueCell(dash(l.case_number), 2800),
      ],
    }),
    new TableRow({
      children: [
        labelCell('Dated:', 800),
        valueCell(dash(l.dated), 1400),
        labelCell('Amount:', 1200),
        valueCell(dash(l.amount), 1200),
        labelCell('Recorded:', 1000),
        valueCell(dash(l.recorded), 3760),
      ],
    }),
    new TableRow({
      children: [
        labelCell('Plaintiff:', 1200),
        valueCell(dash(l.plaintiff), 3400),
        labelCell('Defendant:', 1200),
        valueCell(dash(l.defendant), 3560),
      ],
    }),
  ]);

  const lienTable = new Table({
    width: { size: 9360, type: WidthType.DXA },
    rows: lienRows.length
      ? lienRows
      : [
          new TableRow({
            children: [cell('NO JUDGMENTS OR LIENS FOUND.', { span: 4, italics: true })],
          }),
        ],
  });

  // Miscellaneous Documents
  const miscRows = (f.misc_documents || []).flatMap((m, i) => [
    new TableRow({
      children: [
        labelCell(`(${i + 1}) Document Title:`, 2000),
        valueCell(dash(m.document_title), 3360),
        labelCell('Book/Inst:', 1200),
        valueCell(dash(m.book_instrument), 1200),
        labelCell('Page:', 600),
        valueCell(dash(m.page), 1000),
      ],
    }),
    new TableRow({
      children: [
        labelCell('Dated:', 800),
        valueCell(dash(m.dated), 1400),
        labelCell('Recorded:', 900),
        valueCell(dash(m.recorded), 1400),
        labelCell('Consideration:', 1200),
        valueCell(dash(m.consideration), 1200),
        cell('', { span: 2 }),
      ],
    }),
    new TableRow({
      children: [
        labelCell('Grantor/Assignor:', 1400),
        valueCell(dash(m.grantor_assignor), 3000),
        labelCell('Grantee/Assignee:', 1400),
        valueCell(dash(m.grantee_assignee), 3560),
      ],
    }),
  ]);

  const miscTable = new Table({
    width: { size: 9360, type: WidthType.DXA },
    rows: miscRows.length
      ? miscRows
      : [
          new TableRow({
            children: [cell('NO MISCELLANEOUS DOCUMENTS FOUND.', { span: 4, italics: true })],
          }),
        ],
  });

  // Legal Description
  const legalPara = new Paragraph({
    children: [new TextRun({ text: dash(f.legal_description), size: 18, font: 'Arial' })],
    spacing: { before: 60 },
  });

  // Names Searched
  const namesPara = new Paragraph({
    children: [
      new TextRun({
        text:
          (f.names_searched || []).map((n) => n.toUpperCase()).join('; ') ||
          'NONE PROVIDED.',
        size: 18,
        font: 'Arial',
      }),
    ],
    spacing: { before: 60 },
  });

  // Additional Information
  const addInfo = f.additional_information || f.additional_info;

  const doc = new Document({
    creator: 'Hazelwood & Associates, LLC',
    title: 'ProTitleUSA V2 Abstract Report',
    description: 'Property Abstract Report',
    styles: {
      paragraphStyles: [
        { id: 'normal', name: 'Normal', run: { font: 'Arial', size: 20 } },
        { id: 'heading1', name: 'Heading 1', run: { font: 'Arial', size: 28, bold: true, color: '1F4E79' } },
      ],
    },
    sections: [
      {
        properties: {},
        children: [
          new Paragraph({
            text: 'HAZELWOOD & ASSOCIATES, LLC',
            heading: 'Heading1',
            alignment: AlignmentType.CENTER,
            spacing: { after: 60 },
          }),
          new Paragraph({
            text: 'PROPERTY ABSTRACT REPORT (ProTitleUSA V2)',
            alignment: AlignmentType.CENTER,
            spacing: { after: 200 },
          }),
          sectionHeader('PROPERTY INFORMATION'),
          propTable,
          new Paragraph({ spacing: { before: 120 } }),
          sectionHeader('VESTING INFORMATION'),
          vestTable,
          new Paragraph({ spacing: { before: 120 } }),
          sectionHeader('CHAIN OF TITLE'),
          chainTable,
          new Paragraph({ spacing: { before: 120 } }),
          sectionHeader('MORTGAGES'),
          ...mortgageSections,
          sectionHeader('TAX STATUS'),
          taxTable,
          new Paragraph({ spacing: { before: 120 } }),
          ...(prop.misc_info_to_examiner ? [
            sectionHeader('EXAMINER INSTRUCTIONS'),
            new Paragraph({
              children: [new TextRun({ text: val(prop.misc_info_to_examiner), size: 18, font: 'Arial' })],
              spacing: { before: 60 },
            }),
            new Paragraph({ spacing: { before: 120 } }),
          ] : []),
          sectionHeader('ASSOCIATED DOCUMENTS'),
          assocTable,
          new Paragraph({ spacing: { before: 120 } }),
          sectionHeader('JUDGMENTS / LIENS'),
          lienTable,
          new Paragraph({ spacing: { before: 120 } }),
          sectionHeader('MISCELLANEOUS DOCUMENTS'),
          miscTable,
          new Paragraph({ spacing: { before: 120 } }),
          sectionHeader('LEGAL DESCRIPTION'),
          legalPara,
          new Paragraph({ spacing: { before: 120 } }),
          sectionHeader('NAMES SEARCHED'),
          namesPara,
          ...(addInfo
            ? [
                new Paragraph({ spacing: { before: 120 } }),
                sectionHeader('ADDITIONAL INFORMATION'),
                new Paragraph({
                  children: [new TextRun({ text: dash(addInfo), size: 18, font: 'Arial', italics: true })],
                  spacing: { before: 60 },
                }),
              ]
            : []),
        ],
      },
    ],
  });

  return await Packer.toBuffer(doc);
}

/**
 * V5 (June 2026) DOCX Generator
 * Clean format — Arial font, 8 sections matching PDF structure.
 */
async function generateV5Docx(fields) {
  const f = fields;
  const oi = f.order_info || {};
  const chain = f.chain_of_title || [];
  const mortgages = f.mortgages || [];
  const liens = f.judgments_liens || [];
  const misc = f.misc_documents || [];
  const legal = f.legal_description;
  const addInfo = f.additional_information || [];
  const names = f.names_searched || [];

  const val = (v) => (v !== null && v !== undefined && v !== '' ? String(v) : '');
  const dash = (v) => val(v) || '—';

  const border = { style: BorderStyle.SINGLE, size: 4, color: '000000' };
  const borders = { top: border, bottom: border, left: border, right: border };

  function cell(text, opts = {}) {
    const { bold = false, shade = null, span = 1, width = null, align = AlignmentType.LEFT, italics = false } = opts;
    return new TableCell({
      borders,
      columnSpan: span,
      ...(width && { width: { size: width, type: WidthType.DXA } }),
      ...(shade && { shading: { fill: shade, type: ShadingType.CLEAR } }),
      margins: { top: 40, bottom: 40, left: 80, right: 80 },
      children: [
        new Paragraph({
          alignment: align,
          children: [new TextRun({ text: val(text), bold, italics, size: 18, font: 'Arial' })],
        }),
      ],
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
      rows: [
        new TableRow({
          children: [
            new TableCell({
              borders,
              shading: { fill: '2c3e50', type: ShadingType.CLEAR },
              margins: { top: 60, bottom: 60, left: 120, right: 120 },
              children: [
                new Paragraph({
                  children: [new TextRun({ text: title, bold: true, size: 20, font: 'Arial', color: 'FFFFFF' })],
                }),
              ],
            }),
          ],
        }),
      ],
    });
  }

  // ── Order Information ─────────────────────────────────────────────────────
  const parcelIdsText = (oi.parcel_ids || []).length > 0
    ? (oi.parcel_ids || []).map((p) => dash(p)).join('; ')
    : '—';

  const taxDelText = (oi.tax_delinquent && typeof oi.tax_delinquent === 'object')
    ? `Original: ${dash(oi.tax_delinquent.original_amount)} | Due: ${dash(oi.tax_delinquent.due_date)} | Full: ${dash(oi.tax_delinquent.full_delinquent_amount)}`
    : dash(oi.tax_delinquent);

  const orderTable = new Table({
    width: { size: 9360, type: WidthType.DXA },
    columnWidths: [1200, 2400, 1200, 1800, 1200, 1560],
    rows: [
      new TableRow({
        children: [
          labelCell('File Number:', 1200),
          valueCell(dash(oi.file_number), 2400),
          labelCell('Company:', 1200),
          valueCell(dash(oi.company_name), 1800),
          labelCell('Effective Date:', 1200),
          valueCell(dash(oi.effective_date), 1560),
        ],
      }),
      new TableRow({
        children: [
          labelCell('Address:', 1200),
          new TableCell({
            borders,
            columnSpan: 5,
            margins: { top: 40, bottom: 40, left: 80, right: 80 },
            children: [
              new Paragraph({
                children: [new TextRun({ text: dash(oi.property_address), bold: true, size: 20, font: 'Arial' })],
              }),
            ],
          }),
        ],
      }),
      new TableRow({
        children: [
          labelCell('County:', 1200),
          valueCell(dash(oi.county), 2400),
          labelCell('Township:', 1200),
          valueCell(dash(oi.township), 1800),
          labelCell('Parcel ID(s):', 1200),
          valueCell(parcelIdsText, 1560),
        ],
      }),
      new TableRow({
        children: [
          labelCell('Assessed Val:', 1200),
          valueCell(dash(oi.assessed_value), 2400),
          labelCell('Land Value:', 1200),
          valueCell(dash(oi.land_value), 1800),
          labelCell('Impr. Value:', 1200),
          valueCell(dash(oi.improvement_value), 1560),
        ],
      }),
      new TableRow({
        children: [
          labelCell('Tax Amount:', 1200),
          valueCell(dash(oi.tax_amount), 2400),
          labelCell('Tax Due:', 1200),
          valueCell(dash(oi.tax_due), 1800),
          labelCell('Delinquent:', 1200),
          valueCell(taxDelText, 1560),
        ],
      }),
      new TableRow({
        children: [
          labelCell('Tax ID:', 1200),
          valueCell(dash(oi.tax_id), 2400),
          labelCell('Tax Paid:', 1200),
          valueCell(dash(oi.tax_paid), 1800),
          cell('', { width: 2760, span: 2 }),
        ],
      }),
      new TableRow({
        children: [
          labelCell('Current Vesting Owner:', 1200),
          new TableCell({
            borders,
            columnSpan: 5,
            margins: { top: 40, bottom: 40, left: 80, right: 80 },
            children: [
              new Paragraph({
                children: [new TextRun({ text: dash(oi.current_vesting_owner), size: 20, font: 'Arial' })],
              }),
            ],
          }),
        ],
      }),
    ],
  });

  // ── Chain of Title (newest to oldest) ─────────────────────────────────────
  const chainRows = (chain || []).flatMap((e, i) => [
    new TableRow({
      children: [
        labelCell(`(${i + 1}) Deed Type:`, 2000),
        valueCell(dash(e.deed_type), 3360),
        labelCell('Book/Inst:', 1200),
        valueCell(dash(e.instrument_book_page), 1200),
        labelCell('Page:', 600),
        valueCell(dash(e.page), 1000),
      ],
    }),
    new TableRow({
      children: [
        labelCell('Dated:', 800),
        valueCell(dash(e.deed_date), 1400),
        labelCell('Recorded:', 900),
        valueCell(dash(e.recorded_date), 1400),
        labelCell('Consideration:', 1200),
        valueCell(dash(e.consideration), 1200),
        cell('', { span: 2 }),
      ],
    }),
    new TableRow({
      children: [
        labelCell('Grantor(s):', 1200),
        new TableCell({
          borders,
          columnSpan: 7,
          children: [
            new Paragraph({
              children: [new TextRun({ text: (e.grantors || []).join('; ') || '—', size: 18, font: 'Arial' })],
            }),
          ],
        }),
      ],
    }),
    new TableRow({
      children: [
        labelCell('Grantee(s):', 1200),
        new TableCell({
          borders,
          columnSpan: 7,
          children: [
            new Paragraph({
              children: [new TextRun({ text: (e.grantees || []).join('; ') || '—', size: 18, font: 'Arial' })],
            }),
            ...(e.notes ? [
              new Paragraph({
                children: [new TextRun({ text: `Note: ${e.notes}`, size: 16, italics: true, color: '555555', font: 'Arial' })],
              }),
            ] : []),
          ],
        }),
      ],
    }),
  ]);

  // ── Mortgages (oldest to newest) ──────────────────────────────────────────
  const mortgageRows = (mortgages || []).flatMap((m, i) => [
    new TableRow({
      children: [
        labelCell(`(${i + 1}) Document:`, 2000),
        valueCell(dash(m.document_title), 3360),
        labelCell('Book/Inst:', 1300),
        valueCell(dash(m.book_instrument), 1200),
        labelCell('Page:', 500),
        valueCell(dash(m.page), 1000),
      ],
    }),
    new TableRow({
      children: [
        labelCell('Dated:', 800),
        valueCell(dash(m.dated), 1400),
        labelCell('Recorded:', 900),
        valueCell(dash(m.recorded), 1400),
        labelCell('Consideration:', 1200),
        valueCell(dash(m.consideration), 1200),
        labelCell('Maturity:', 800),
        valueCell(dash(m.maturity_date), 1660),
      ],
    }),
    new TableRow({
      children: [
        labelCell('Lender:', 1000),
        new TableCell({
          borders,
          columnSpan: 7,
          children: [
            new Paragraph({
              children: [new TextRun({ text: dash(m.lender), size: 18, font: 'Arial' })],
            }),
          ],
        }),
      ],
    }),
    new TableRow({
      children: [
        labelCell('Borrower:', 1000),
        valueCell(dash(m.borrower), 3760),
        labelCell('Trustee:', 1000),
        valueCell(dash(m.trustee), 3600),
      ],
    }),
  ]);

  // ── Judgments/Liens ───────────────────────────────────────────────────────
  const lienRows = (liens || []).flatMap((l, i) => [
    new TableRow({
      children: [
        labelCell(`(${i + 1}) Document:`, 2000),
        valueCell(dash(l.document_title), 3360),
        labelCell('Case #:', 1200),
        valueCell(dash(l.case_number), 2800),
      ],
    }),
    new TableRow({
      children: [
        labelCell('Dated:', 800),
        valueCell(dash(l.dated), 1400),
        labelCell('Amount:', 1200),
        valueCell(dash(l.amount), 1200),
        labelCell('Recorded:', 1000),
        valueCell(dash(l.recorded), 3760),
      ],
    }),
    new TableRow({
      children: [
        labelCell('Plaintiff:', 1200),
        valueCell(dash(l.plaintiff), 3400),
        labelCell('Defendant:', 1200),
        valueCell(dash(l.defendant), 3560),
      ],
    }),
  ]);

  // ── Miscellaneous Documents ───────────────────────────────────────────────
  const miscRows = (misc || []).flatMap((m, i) => [
    new TableRow({
      children: [
        labelCell(`(${i + 1}) Document:`, 2000),
        valueCell(dash(m.document_title), 3360),
        labelCell('Book/Inst:', 1200),
        valueCell(dash(m.book_instrument), 1200),
        labelCell('Page:', 600),
        valueCell(dash(m.page), 1000),
      ],
    }),
    new TableRow({
      children: [
        labelCell('Dated:', 800),
        valueCell(dash(m.dated), 1400),
        labelCell('Recorded:', 900),
        valueCell(dash(m.recorded), 1400),
        labelCell('Consideration:', 1200),
        valueCell(dash(m.consideration), 1200),
        cell('', { span: 2 }),
      ],
    }),
    new TableRow({
      children: [
        labelCell('Grantor/Assignor:', 1400),
        valueCell(dash(m.grantor_assignor), 3000),
        labelCell('Grantee/Assignee:', 1400),
        valueCell(dash(m.grantee_assignee), 3560),
      ],
    }),
  ]);

  // ── Legal Description ─────────────────────────────────────────────────────
  const legalPara = new Table({
    width: { size: 9360, type: WidthType.DXA },
    rows: [
      new TableRow({
        children: [
          new TableCell({
            borders,
            margins: { top: 100, bottom: 100, left: 100, right: 100 },
            children: [
              new Paragraph({
                children: [new TextRun({ text: dash(legal), size: 18, font: 'Arial' })],
              }),
            ],
          }),
        ],
      }),
    ],
  });

  // ── Additional Information ────────────────────────────────────────────────
  const addInfoText = Array.isArray(addInfo)
    ? addInfo.map((item, idx) => `${idx + 1}. ${typeof item === 'string' ? item : item.book_instrument || item.label || ''}`).join('\n')
    : dash(addInfo);

  const additionalPara = new Table({
    width: { size: 9360, type: WidthType.DXA },
    rows: [
      new TableRow({
        children: [
          new TableCell({
            borders,
            margins: { top: 100, bottom: 100, left: 100, right: 100 },
            children: [
              new Paragraph({
                children: [new TextRun({ text: addInfoText || 'No additional information.', size: 18, font: 'Arial' })],
              }),
            ],
          }),
        ],
      }),
    ],
  });

  // ── Names Searched ────────────────────────────────────────────────────────
  const namesText = (names || []).map((n, idx) => `${idx + 1}. ${typeof n === 'string' ? n : n.name || n}`).join('\n');
  const namesPara = new Table({
    width: { size: 9360, type: WidthType.DXA },
    rows: [
      new TableRow({
        children: [
          new TableCell({
            borders,
            margins: { top: 100, bottom: 100, left: 100, right: 100 },
            children: [
              new Paragraph({
                children: [new TextRun({ text: namesText || 'No names searched.', size: 18, font: 'Arial' })],
              }),
            ],
          }),
        ],
      }),
    ],
  });

  // ── Build Document ────────────────────────────────────────────────────────
  const doc = new Document({
    styles: { default: { document: { run: { font: 'Arial', size: 18 } } } },
    sections: [
      {
        properties: { margin: { top: 720, right: 720, bottom: 720, left: 720 } },
        children: [
          sectionHeader('ORDER INFORMATION'),
          orderTable,
          new Paragraph({ spacing: { before: 120 } }),
          sectionHeader('CHAIN OF TITLE'),
          new Table({
            width: { size: 9360, type: WidthType.DXA },
            rows: chainRows.length
              ? chainRows
              : [new TableRow({ children: [cell('NO CHAIN ENTRIES FOUND.', { span: 8, italics: true })] })],
          }),
          new Paragraph({ spacing: { before: 120 } }),
          sectionHeader('MORTGAGES / DEEDS OF TRUST'),
          new Table({
            width: { size: 9360, type: WidthType.DXA },
            rows: mortgageRows.length
              ? mortgageRows
              : [new TableRow({ children: [cell('NO MORTGAGES FOUND.', { span: 8, italics: true })] })],
          }),
          new Paragraph({ spacing: { before: 120 } }),
          sectionHeader('JUDGMENTS / LIENS'),
          new Table({
            width: { size: 9360, type: WidthType.DXA },
            rows: lienRows.length
              ? lienRows
              : [new TableRow({ children: [cell('NO JUDGMENTS OR LIENS FOUND.', { span: 4, italics: true })] })],
          }),
          new Paragraph({ spacing: { before: 120 } }),
          sectionHeader('MISCELLANEOUS DOCUMENTS'),
          new Table({
            width: { size: 9360, type: WidthType.DXA },
            rows: miscRows.length
              ? miscRows
              : [new TableRow({ children: [cell('NO MISCELLANEOUS DOCUMENTS FOUND.', { span: 4, italics: true })] })],
          }),
          new Paragraph({ spacing: { before: 120 } }),
          sectionHeader('LEGAL DESCRIPTION'),
          legalPara,
          new Paragraph({ spacing: { before: 120 } }),
          sectionHeader('ADDITIONAL INFORMATION'),
          additionalPara,
          new Paragraph({ spacing: { before: 120 } }),
          sectionHeader('NAMES SEARCHED'),
          namesPara,
        ],
      },
    ],
  });

  return await Packer.toBuffer(doc);
}

/**
 * V6 (July 2026) DOCX Generator
 * Extends V5 with additional fields: assessor_owner, assessor_description, acreage,
 * loan_number, min, status (mortgages), interest, costs, attorneys_fees, status (liens),
 * area_or_width, notes (misc), and document_accounting.
 */
async function generateV6Docx(fields) {
  const f = fields;
  const oi = f.order_info || {};
  const chain = f.chain_of_title || [];
  const mortgages = f.mortgages || [];
  const liens = f.judgments_liens || [];
  const misc = f.misc_documents || [];
  const legal = f.legal_description;
  const addInfo = f.additional_information || [];
  const docAccounting = f.document_accounting || [];
  const names = f.names_searched || [];

  const val = (v) => (v !== null && v !== undefined && v !== '' ? String(v) : '');
  const dash = (v) => val(v) || '—';

  const border = { style: BorderStyle.SINGLE, size: 4, color: '000000' };
  const borders = { top: border, bottom: border, left: border, right: border };

  function cell(text, opts = {}) {
    const { bold = false, shade = null, span = 1, width = null, align = AlignmentType.LEFT, italics = false } = opts;
    return new TableCell({
      borders,
      columnSpan: span,
      ...(width && { width: { size: width, type: WidthType.DXA } }),
      ...(shade && { shading: { fill: shade, type: ShadingType.CLEAR } }),
      margins: { top: 40, bottom: 40, left: 80, right: 80 },
      children: [
        new Paragraph({
          alignment: align,
          children: [new TextRun({ text: val(text), bold, italics, size: 18, font: 'Arial' })],
        }),
      ],
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
      rows: [
        new TableRow({
          children: [
            new TableCell({
              borders,
              shading: { fill: '2c3e50', type: ShadingType.CLEAR },
              margins: { top: 60, bottom: 60, left: 120, right: 120 },
              children: [
                new Paragraph({
                  children: [new TextRun({ text: title, bold: true, size: 20, font: 'Arial', color: 'FFFFFF' })],
                }),
              ],
            }),
          ],
        }),
      ],
    });
  }

  // ── Order Information (V6: no completed_date, add assessor_owner, assessor_description, acreage) ──
  const parcelIdsText = (oi.parcel_ids || []).length > 0
    ? (oi.parcel_ids || []).map((p) => dash(p)).join('; ')
    : '—';

  const taxDelText = (oi.tax_delinquent && typeof oi.tax_delinquent === 'object')
    ? `Original: ${dash(oi.tax_delinquent.original_amount)} | Due: ${dash(oi.tax_delinquent.due_date)} | Full: ${dash(oi.tax_delinquent.full_delinquent_amount)}`
    : dash(oi.tax_delinquent);

  const orderTable = new Table({
    width: { size: 9360, type: WidthType.DXA },
    columnWidths: [1200, 2400, 1200, 1800, 1200, 1560],
    rows: [
      new TableRow({
        children: [
          labelCell('File Number:', 1200),
          valueCell(dash(oi.file_number), 2400),
          labelCell('Company:', 1200),
          valueCell(dash(oi.company_name), 1800),
          labelCell('Effective Date:', 1200),
          valueCell(dash(oi.effective_date), 1560),
        ],
      }),
      new TableRow({
        children: [
          labelCell('Address:', 1200),
          new TableCell({
            borders,
            columnSpan: 5,
            margins: { top: 40, bottom: 40, left: 80, right: 80 },
            children: [
              new Paragraph({
                children: [new TextRun({ text: dash(oi.property_address), bold: true, size: 20, font: 'Arial' })],
              }),
            ],
          }),
        ],
      }),
      new TableRow({
        children: [
          labelCell('County:', 1200),
          valueCell(dash(oi.county), 2400),
          labelCell('Township:', 1200),
          valueCell(dash(oi.township), 1800),
          labelCell('Parcel ID(s):', 1200),
          valueCell(parcelIdsText, 1560),
        ],
      }),
      new TableRow({
        children: [
          labelCell('Assessed Val:', 1200),
          valueCell(dash(oi.assessed_value), 2400),
          labelCell('Land Value:', 1200),
          valueCell(dash(oi.land_value), 1800),
          labelCell('Impr. Value:', 1200),
          valueCell(dash(oi.improvement_value), 1560),
        ],
      }),
      new TableRow({
        children: [
          labelCell('Tax Amount:', 1200),
          valueCell(dash(oi.tax_amount), 2400),
          labelCell('Tax Due:', 1200),
          valueCell(dash(oi.tax_due), 1800),
          labelCell('Delinquent:', 1200),
          valueCell(taxDelText, 1560),
        ],
      }),
      new TableRow({
        children: [
          labelCell('Tax ID:', 1200),
          valueCell(dash(oi.tax_id), 2400),
          labelCell('Tax Paid:', 1200),
          valueCell(dash(oi.tax_paid), 1800),
          labelCell('Acreage:', 1200),
          valueCell(dash(oi.acreage), 1560),
        ],
      }),
      new TableRow({
        children: [
          labelCell('Current Vesting Owner:', 1200),
          new TableCell({
            borders,
            columnSpan: 5,
            margins: { top: 40, bottom: 40, left: 80, right: 80 },
            children: [
              new Paragraph({
                children: [new TextRun({ text: dash(oi.current_vesting_owner), size: 20, font: 'Arial' })],
              }),
            ],
          }),
        ],
      }),
      new TableRow({
        children: [
          labelCell('Assessor Owner:', 1200),
          valueCell(dash(oi.assessor_owner), 2400),
          labelCell('Assessor Desc:', 1200),
          new TableCell({
            borders,
            columnSpan: 3,
            margins: { top: 40, bottom: 40, left: 80, right: 80 },
            children: [
              new Paragraph({
                children: [new TextRun({ text: dash(oi.assessor_description), size: 20, font: 'Arial' })],
              }),
            ],
          }),
        ],
      }),
    ],
  });

  // ── Chain of Title (newest to oldest) ─────────────────────────────────────
  const chainRows = (chain || []).flatMap((e, i) => [
    new TableRow({
      children: [
        labelCell(`(${i + 1}) Deed Type:`, 2000),
        valueCell(dash(e.deed_type), 3360),
        labelCell('Book/Inst:', 1200),
        valueCell(dash(e.instrument_book_page), 1200),
        labelCell('Page:', 600),
        valueCell(dash(e.page), 1000),
      ],
    }),
    new TableRow({
      children: [
        labelCell('Dated:', 800),
        valueCell(dash(e.deed_date), 1400),
        labelCell('Recorded:', 900),
        valueCell(dash(e.recorded_date), 1400),
        labelCell('Consideration:', 1200),
        valueCell(dash(e.consideration), 1200),
        cell('', { span: 2 }),
      ],
    }),
    new TableRow({
      children: [
        labelCell('Grantor(s):', 1200),
        new TableCell({
          borders,
          columnSpan: 7,
          children: [
            new Paragraph({
              children: [new TextRun({ text: (e.grantors || []).join('; ') || '—', size: 18, font: 'Arial' })],
            }),
          ],
        }),
      ],
    }),
    new TableRow({
      children: [
        labelCell('Grantee(s):', 1200),
        new TableCell({
          borders,
          columnSpan: 7,
          children: [
            new Paragraph({
              children: [new TextRun({ text: (e.grantees || []).join('; ') || '—', size: 18, font: 'Arial' })],
            }),
            ...(e.notes ? [
              new Paragraph({
                children: [new TextRun({ text: `Note: ${e.notes}`, size: 16, italics: true, color: '555555', font: 'Arial' })],
              }),
            ] : []),
          ],
        }),
      ],
    }),
  ]);

  // ── Mortgages (V6: add loan_number, min, status) ──────────────────────────
  const mortgageRows = (mortgages || []).flatMap((m, i) => [
    new TableRow({
      children: [
        labelCell(`(${i + 1}) Document:`, 2000),
        valueCell(dash(m.document_title), 3360),
        labelCell('Book/Inst:', 1300),
        valueCell(dash(m.book_instrument), 1200),
        labelCell('Page:', 500),
        valueCell(dash(m.page), 1000),
      ],
    }),
    new TableRow({
      children: [
        labelCell('Dated:', 800),
        valueCell(dash(m.dated), 1400),
        labelCell('Recorded:', 900),
        valueCell(dash(m.recorded), 1400),
        labelCell('Consideration:', 1200),
        valueCell(dash(m.consideration), 1200),
        labelCell('Maturity:', 800),
        valueCell(dash(m.maturity_date), 1660),
      ],
    }),
    new TableRow({
      children: [
        labelCell('Lender:', 1000),
        new TableCell({
          borders,
          columnSpan: 7,
          children: [
            new Paragraph({
              children: [new TextRun({ text: dash(m.lender), size: 18, font: 'Arial' })],
            }),
          ],
        }),
      ],
    }),
    new TableRow({
      children: [
        labelCell('Borrower:', 1000),
        valueCell(dash(m.borrower), 2760),
        labelCell('Trustee:', 1000),
        valueCell(dash(m.trustee), 3600),
      ],
    }),
    new TableRow({
      children: [
        labelCell('Loan Number:', 1200),
        valueCell(dash(m.loan_number), 2400),
        labelCell('MIN:', 1200),
        valueCell(dash(m.min), 1800),
        labelCell('Open/Closed:', 1200),
        valueCell(dash(m.open_closed_ended), 1560),
      ],
    }),
    new TableRow({
      children: [
        labelCell('Status:', 1200),
        new TableCell({
          borders,
          columnSpan: 5,
          margins: { top: 40, bottom: 40, left: 80, right: 80 },
          children: [
            new Paragraph({
              children: [new TextRun({ text: dash(m.status), size: 18, font: 'Arial' })],
            }),
          ],
        }),
      ],
    }),
  ]);

  // ── Judgments/Liens (V6: add interest, costs, attorneys_fees, status) ─────
  const lienRows = (liens || []).flatMap((l, i) => [
    new TableRow({
      children: [
        labelCell(`(${i + 1}) Document:`, 2000),
        valueCell(dash(l.document_title), 3360),
        labelCell('Case #:', 1200),
        valueCell(dash(l.case_number), 2800),
      ],
    }),
    new TableRow({
      children: [
        labelCell('Dated:', 800),
        valueCell(dash(l.dated), 1400),
        labelCell('Amount:', 1200),
        valueCell(dash(l.amount), 1200),
        labelCell('Recorded:', 1000),
        valueCell(dash(l.recorded), 3760),
      ],
    }),
    new TableRow({
      children: [
        labelCell('Plaintiff:', 1200),
        valueCell(dash(l.plaintiff), 3400),
        labelCell('Defendant:', 1200),
        valueCell(dash(l.defendant), 3560),
      ],
    }),
    new TableRow({
      children: [
        labelCell('Interest:', 1200),
        valueCell(dash(l.interest), 2400),
        labelCell('Costs:', 1200),
        valueCell(dash(l.costs), 1800),
        labelCell("Attorney's Fees:", 1200),
        valueCell(dash(l.attorneys_fees), 1560),
      ],
    }),
    new TableRow({
      children: [
        labelCell('Status:', 1200),
        new TableCell({
          borders,
          columnSpan: 5,
          margins: { top: 40, bottom: 40, left: 80, right: 80 },
          children: [
            new Paragraph({
              children: [new TextRun({ text: dash(l.status), size: 18, font: 'Arial' })],
            }),
          ],
        }),
      ],
    }),
  ]);

  // ── Miscellaneous Documents (V6: add area_or_width, notes) ────────────────
  const miscRows = (misc || []).flatMap((m, i) => [
    new TableRow({
      children: [
        labelCell(`(${i + 1}) Document:`, 2000),
        valueCell(dash(m.document_title), 3360),
        labelCell('Book/Inst:', 1200),
        valueCell(dash(m.book_instrument), 1200),
        labelCell('Page:', 600),
        valueCell(dash(m.page), 1000),
      ],
    }),
    new TableRow({
      children: [
        labelCell('Dated:', 800),
        valueCell(dash(m.dated), 1400),
        labelCell('Recorded:', 900),
        valueCell(dash(m.recorded), 1400),
        labelCell('Consideration:', 1200),
        valueCell(dash(m.consideration), 1200),
        cell('', { span: 2 }),
      ],
    }),
    new TableRow({
      children: [
        labelCell('Grantor/Assignor:', 1400),
        valueCell(dash(m.grantor_assignor), 2400),
        labelCell('Grantee/Assignee:', 1400),
        valueCell(dash(m.grantee_assignee), 1800),
        labelCell('Area/Width:', 1200),
        valueCell(dash(m.area_or_width), 1160),
      ],
    }),
    ...(m.notes ? [
      new TableRow({
        children: [
          labelCell('Notes:', 1200),
          new TableCell({
            borders,
            columnSpan: 5,
            margins: { top: 40, bottom: 40, left: 80, right: 80 },
            children: [
              new Paragraph({
                children: [new TextRun({ text: dash(m.notes), size: 16, italics: true, font: 'Arial' })],
              }),
            ],
          }),
        ],
      }),
    ] : []),
  ]);

  // ── Legal Description ─────────────────────────────────────────────────────
  const legalPara = new Table({
    width: { size: 9360, type: WidthType.DXA },
    rows: [
      new TableRow({
        children: [
          new TableCell({
            borders,
            margins: { top: 100, bottom: 100, left: 100, right: 100 },
            children: [
              new Paragraph({
                children: [new TextRun({ text: dash(legal), size: 18, font: 'Arial' })],
              }),
            ],
          }),
        ],
      }),
    ],
  });

  // ── Additional Information (V6: include document_accounting) ──────────────
  let addInfoText = Array.isArray(addInfo)
    ? addInfo.map((item, idx) => `${idx + 1}. ${typeof item === 'string' ? item : item.book_instrument || item.label || ''}`).join('\n')
    : dash(addInfo);

  if (docAccounting.length > 0) {
    const docAccText = docAccounting.map((item, idx) => {
      const pageRange = item.page_range || '';
      const label = item.document_label || '';
      return `${idx + 1}. PAGE(S) ${pageRange}: ${label}`;
    }).join('\n');
    addInfoText += '\n\nPDF DOCUMENT ACCOUNTING:\n' + docAccText;
  }

  const additionalPara = new Table({
    width: { size: 9360, type: WidthType.DXA },
    rows: [
      new TableRow({
        children: [
          new TableCell({
            borders,
            margins: { top: 100, bottom: 100, left: 100, right: 100 },
            children: [
              new Paragraph({
                children: [new TextRun({ text: addInfoText || 'No additional information.', size: 18, font: 'Arial' })],
              }),
            ],
          }),
        ],
      }),
    ],
  });

  // ── Names Searched ────────────────────────────────────────────────────────
  const namesText = (names || []).map((n, idx) => `${idx + 1}. ${typeof n === 'string' ? n : n.name || n}`).join('\n');
  const namesPara = new Table({
    width: { size: 9360, type: WidthType.DXA },
    rows: [
      new TableRow({
        children: [
          new TableCell({
            borders,
            margins: { top: 100, bottom: 100, left: 100, right: 100 },
            children: [
              new Paragraph({
                children: [new TextRun({ text: namesText || 'No names searched.', size: 18, font: 'Arial' })],
              }),
            ],
          }),
        ],
      }),
    ],
  });

  // ── Build Document ────────────────────────────────────────────────────────
  const doc = new Document({
    styles: { default: { document: { run: { font: 'Arial', size: 18 } } } },
    sections: [
      {
        properties: { margin: { top: 720, right: 720, bottom: 720, left: 720 } },
        children: [
          sectionHeader('ORDER INFORMATION'),
          orderTable,
          new Paragraph({ spacing: { before: 120 } }),
          sectionHeader('CHAIN OF TITLE'),
          new Table({
            width: { size: 9360, type: WidthType.DXA },
            rows: chainRows.length
              ? chainRows
              : [new TableRow({ children: [cell('NO CHAIN ENTRIES FOUND.', { span: 8, italics: true })] })],
          }),
          new Paragraph({ spacing: { before: 120 } }),
          sectionHeader('MORTGAGES / DEEDS OF TRUST'),
          new Table({
            width: { size: 9360, type: WidthType.DXA },
            rows: mortgageRows.length
              ? mortgageRows
              : [new TableRow({ children: [cell('NO MORTGAGES FOUND.', { span: 8, italics: true })] })],
          }),
          new Paragraph({ spacing: { before: 120 } }),
          sectionHeader('JUDGMENTS / LIENS'),
          new Table({
            width: { size: 9360, type: WidthType.DXA },
            rows: lienRows.length
              ? lienRows
              : [new TableRow({ children: [cell('NO JUDGMENTS OR LIENS FOUND.', { span: 4, italics: true })] })],
          }),
          new Paragraph({ spacing: { before: 120 } }),
          sectionHeader('MISCELLANEOUS DOCUMENTS'),
          new Table({
            width: { size: 9360, type: WidthType.DXA },
            rows: miscRows.length
              ? miscRows
              : [new TableRow({ children: [cell('NO MISCELLANEOUS DOCUMENTS FOUND.', { span: 4, italics: true })] })],
          }),
          new Paragraph({ spacing: { before: 120 } }),
          sectionHeader('LEGAL DESCRIPTION'),
          legalPara,
          new Paragraph({ spacing: { before: 120 } }),
          sectionHeader('ADDITIONAL INFORMATION'),
          additionalPara,
          new Paragraph({ spacing: { before: 120 } }),
          sectionHeader('NAMES SEARCHED'),
          namesPara,
        ],
      },
    ],
  });

  return await Packer.toBuffer(doc);
}

/**
 * V7 Text-based DOCX Generator
 * Matches blank.docx layout - labels on left/bold, values on right,
 * no table borders, clean text-based format.
 */
async function generateV7TextDocx(fields) {
  const f = fields;
  const oi = f.order_info || {};
  const ti = f.tax_information || {};
  const chain = f.chain_of_title || [];
  const mortgages = f.mortgages || [];
  const liens = f.judgments_liens || [];
  const misc = f.misc_documents || [];
  const legal = f.legal_description;
  const addInfo = f.additional_information || {};
  const names = f.names_searched || [];

  const val = (v) => (v !== null && v !== undefined && v !== '' ? String(v) : '');
  const dash = (v) => val(v) || '—';

  const boldPara = (text, size = 20) => new Paragraph({
    spacing: { before: 60, after: 20 },
    children: [new TextRun({ text: String(text).toUpperCase(), bold: true, size, font: 'Arial' })],
  });

  const fieldPara = (label, value) => new Paragraph({
    spacing: { before: 20, after: 20 },
    children: [
      new TextRun({ text: `${label}: `, bold: true, size: 18, font: 'Arial' }),
      new TextRun({ text: val(value) || '—', size: 18, font: 'Arial' }),
    ],
  });

  const valuePara = (value) => new Paragraph({
    spacing: { before: 20, after: 20 },
    children: [new TextRun({ text: val(value) || '—', size: 18, font: 'Arial' })],
  });

  const spacer = () => new Paragraph({ spacing: { before: 40 } });

  const sectionHeaderPara = (title) => new Paragraph({
    spacing: { before: 200, after: 80 },
    border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: '1F4E79' } },
    children: [new TextRun({ text: title, bold: true, size: 22, font: 'Arial', color: '1F4E79' })],
  });

  const children = [];

  // ── ORDER INFORMATION ──
  children.push(sectionHeaderPara('ORDER INFORMATION'));
  children.push(fieldPara('FILE NUMBER', oi.file_number));
  children.push(fieldPara('CLIENT / ORDER', oi.client_order));
  children.push(fieldPara('EFFECTIVE DATE', oi.effective_date));
  children.push(fieldPara('BORROWER / OWNER', oi.borrower_owner));
  children.push(fieldPara('PROPERTY ADDRESS', oi.property_address));
  children.push(fieldPara('COUNTY', oi.county));
  children.push(fieldPara('TOWNSHIP / CITY', oi.township_city));
  children.push(fieldPara('PARCEL ID / TAX MAP', oi.parcel_id_tax_map));
  children.push(fieldPara('ACCOUNT NUMBER', oi.account_number));
  children.push(fieldPara('CURRENT VESTING OWNER', oi.current_vesting_owner));
  children.push(fieldPara('ASSESSOR OWNER', oi.assessor_owner));
  children.push(fieldPara('LEGAL / ASSESSOR DESCRIPTION', oi.legal_assessor_description));
  children.push(fieldPara('ACREAGE', oi.acreage));
  children.push(fieldPara('ASSESSMENT', oi.assessment));
  children.push(fieldPara('ORDER / VERIFICATION NOTES', oi.order_verification_notes));

  // Tax information rendered within ORDER INFORMATION (not a standalone section)
  if (ti.year || ti.first_half || ti.second_half || ti.total_tax || ti.total_delinquent_amount) {
    const taxYear = val(ti.year) || new Date().getFullYear();
    children.push(boldPara(`TAX INFORMATION (${taxYear})`));
    const fh = ti.first_half || {};
    if (fh.due_date || fh.original_bill || fh.paid_date || fh.amount_paid || fh.penalty || fh.interest || fh.balance_due) {
      children.push(boldPara('FIRST HALF', 18));
      if (fh.due_date) children.push(fieldPara('DUE DATE', fh.due_date));
      if (fh.original_bill) children.push(fieldPara('ORIGINAL BILL', `$${fh.original_bill}`));
      if (fh.paid_date) children.push(fieldPara('PAID DATE', fh.paid_date));
      if (fh.amount_paid) children.push(fieldPara('AMOUNT PAID', `$${fh.amount_paid}`));
      if (fh.penalty) children.push(fieldPara('PENALTY', `$${fh.penalty}`));
      if (fh.interest) children.push(fieldPara('INTEREST', `$${fh.interest}`));
      if (fh.balance_due) children.push(fieldPara('BALANCE DUE', `$${fh.balance_due}`));
    }
    const sh = ti.second_half || {};
    if (sh.due_date || sh.original_bill || sh.paid_date || sh.amount_paid || sh.penalty || sh.interest || sh.balance_due) {
      children.push(boldPara('SECOND HALF', 18));
      if (sh.due_date) children.push(fieldPara('DUE DATE', sh.due_date));
      if (sh.original_bill) children.push(fieldPara('ORIGINAL BILL', `$${sh.original_bill}`));
      if (sh.paid_date) children.push(fieldPara('PAID DATE', sh.paid_date));
      if (sh.amount_paid) children.push(fieldPara('AMOUNT PAID', `$${sh.amount_paid}`));
      if (sh.penalty) children.push(fieldPara('PENALTY', `$${sh.penalty}`));
      if (sh.interest) children.push(fieldPara('INTEREST', `$${sh.interest}`));
      if (sh.balance_due) children.push(fieldPara('BALANCE DUE', `$${sh.balance_due}`));
    }
    if (ti.total_tax) children.push(fieldPara(`TOTAL ${taxYear} TAX`, `$${ti.total_tax}`));
    if (ti.total_delinquent_amount) children.push(fieldPara('TOTAL DELINQUENT / OPEN AMOUNT SHOWN', `$${ti.total_delinquent_amount}`));
  }

  // ── CHAIN OF TITLE ──
  children.push(sectionHeaderPara('CHAIN OF TITLE'));
  if (chain.length === 0) {
    children.push(valuePara('NO CHAIN ENTRIES FOUND.'));
  } else {
    chain.forEach((e, i) => {
      children.push(boldPara(`(${i + 1}) ${val(e.deed_type) || '—'}`));
      children.push(fieldPara('GRANTOR(S)', (e.grantors || []).join(', ')));
      children.push(fieldPara('GRANTEE(S)', (e.grantees || []).join(', ')));
      children.push(fieldPara('DATED', e.dated));
      children.push(fieldPara('RECORDED', e.recorded));
      children.push(fieldPara('BOOK / PAGE OR INSTRUMENT', e.book_page_instrument));
      children.push(fieldPara('CONSIDERATION', e.consideration));
      if (e.notes) children.push(fieldPara('NOTES', e.notes));

      // Supporting documents (*-prefixed)
      const sd = e.supporting_documents || [];
      sd.forEach((s) => {
        children.push(boldPara(`* ${val(s.document_type) || 'SUPPORTING DOCUMENT'}`, 18));
        if (s.decedent) children.push(fieldPara('DECEDENT', s.decedent));
        if (s.date_of_death) children.push(fieldPara('DATE OF DEATH', s.date_of_death));
        if (s.will_date) children.push(fieldPara('WILL DATE', s.will_date));
        if (s.recorded) children.push(fieldPara('RECORDED', s.recorded));
        if (s.book_page_instrument) children.push(fieldPara('BOOK / PAGE OR INSTRUMENT', s.book_page_instrument));
        if ((s.heirs || []).length > 0) children.push(fieldPara('HEIRS', s.heirs.join(', ')));
        if ((s.devisees_beneficiaries || []).length > 0) children.push(fieldPara('DEVISEES / BENEFICIARIES', s.devisees_beneficiaries.join(', ')));
        if (s.notes) children.push(fieldPara('NOTES', s.notes));
      });

      if (i < chain.length - 1) children.push(spacer());
    });
  }

  // ── MORTGAGES / DEEDS OF TRUST ──
  children.push(sectionHeaderPara('MORTGAGES / DEEDS OF TRUST'));
  if (mortgages.length === 0) {
    children.push(valuePara('NONE — NO OPEN MORTGAGE OR DEED OF TRUST WAS INCLUDED OR CLEARLY IDENTIFIED IN THE PROVIDED DOCUMENTS.'));
  } else {
    mortgages.forEach((m, i) => {
      children.push(boldPara(`(${i + 1}) ${val(m.document_title) || 'DOT / RFDT / DTCL'}`));
      children.push(fieldPara('BORROWER(S)', (m.borrowers || []).join(', ')));
      children.push(fieldPara('LENDER', m.lender));
      children.push(fieldPara('TRUSTEE', m.trustee));
      children.push(fieldPara('BENEFICIARY / NOMINEE', m.beneficiary_nominee));
      children.push(fieldPara('DATED', m.dated));
      children.push(fieldPara('RECORDED', m.recorded));
      children.push(fieldPara('BOOK / PAGE OR INSTRUMENT', m.book_page_instrument));
      children.push(fieldPara('AMOUNT', m.amount ? `$${m.amount}` : m.amount));
      children.push(fieldPara('MATURITY', m.maturity));
      children.push(fieldPara('LOAN NUMBER', m.loan_number));
      children.push(fieldPara('MIN', m.min));
      children.push(fieldPara('OPEN / CLOSED ENDED', m.open_closed_ended));
      children.push(fieldPara('STATUS', m.status));
      if (m.notes) children.push(fieldPara('NOTES', m.notes));

      const ad = m.associated_documents || [];
      ad.forEach((a, ai) => {
        children.push(boldPara(`ASSOCIATED DOCUMENT ${ai + 1}: ${val(a.document_type) || 'DOCUMENT'}`, 18));
        if (a.book_page_instrument) children.push(fieldPara('BOOK / PAGE OR INSTRUMENT', a.book_page_instrument));
        if (a.dated) children.push(fieldPara('DATED', a.dated));
        if (a.recorded) children.push(fieldPara('RECORDED', a.recorded));
        if (a.notes) children.push(fieldPara('NOTES', a.notes));
      });

      if (i < mortgages.length - 1) children.push(spacer());
    });
  }

  // ── JUDGMENTS / LIENS ──
  children.push(sectionHeaderPara('JUDGMENTS / LIENS'));
  if (liens.length === 0) {
    children.push(valuePara('NONE — NO OPEN JUDGMENT, LIEN, UCC, STATE TAX LIEN, FEDERAL TAX LIEN, MECHANIC\'S LIEN, LIS PENDENS, BANKRUPTCY, OR FORECLOSURE DOCUMENT WAS INCLUDED OR CLEARLY IDENTIFIED IN THE PROVIDED DOCUMENTS.'));
  } else {
    liens.forEach((l, i) => {
      children.push(boldPara(`(${i + 1}) ${val(l.document_title) || 'JUDGMENT / LIEN'}`));
      children.push(fieldPara('PLAINTIFF / LIENHOLDER', l.plaintiff_lienholder));
      children.push(fieldPara('DEFENDANT / DEBTOR', l.defendant_debtor));
      children.push(fieldPara('CASE NUMBER', l.case_number));
      children.push(fieldPara('DATE OF JUDGMENT / LIEN', l.date_of_judgment_lien));
      children.push(fieldPara('RECORDED', l.recorded));
      children.push(fieldPara('BOOK / PAGE OR INSTRUMENT', l.book_page_instrument));
      children.push(fieldPara('AMOUNT', l.amount ? `$${l.amount}` : l.amount));
      children.push(fieldPara('INTEREST', l.interest));
      children.push(fieldPara('COSTS', l.costs ? `$${l.costs}` : l.costs));
      children.push(fieldPara("ATTORNEY'S FEES", l.attorneys_fees ? `$${l.attorneys_fees}` : l.attorneys_fees));
      children.push(fieldPara('STATUS', l.status));
      if (l.notes) children.push(fieldPara('NOTES', l.notes));
      if (i < liens.length - 1) children.push(spacer());
    });
  }

  // ── MISCELLANEOUS DOCUMENTS ──
  children.push(sectionHeaderPara('MISCELLANEOUS DOCUMENTS'));
  if (misc.length === 0) {
    children.push(valuePara('NO MISCELLANEOUS DOCUMENTS FOUND.'));
  } else {
    misc.forEach((m, i) => {
      children.push(boldPara(`(${i + 1}) ${val(m.document_type || m.document_title) || 'DOCUMENT'}`));
      if (m.decedent) children.push(fieldPara('DECEDENT', m.decedent));
      if (m.date_of_death) children.push(fieldPara('DATE OF DEATH', m.date_of_death));
      if (m.will_date) children.push(fieldPara('WILL DATE', m.will_date));
      if (m.probate_date) children.push(fieldPara('PROBATE DATE', m.probate_date));
      if ((m.heirs || []).length > 0) children.push(fieldPara('HEIRS', m.heirs.join(', ')));
      if ((m.devisees_beneficiaries || []).length > 0) children.push(fieldPara('DEVISEES / BENEFICIARIES', m.devisees_beneficiaries.join(', ')));
      if (m.grantor_assignor) children.push(fieldPara('GRANTOR / ASSIGNOR', m.grantor_assignor));
      if (m.grantee_assignee) children.push(fieldPara('GRANTEE / ASSIGNEE', m.grantee_assignee));
      if (m.dated) children.push(fieldPara('DATED', m.dated));
      if (m.recorded) children.push(fieldPara('RECORDED', m.recorded));
      if (m.book_page_instrument) children.push(fieldPara('BOOK / PAGE OR INSTRUMENT', m.book_page_instrument));
      if (m.consideration) children.push(fieldPara('CONSIDERATION', m.consideration));
      if (m.area_or_width) children.push(fieldPara('AREA / WIDTH', m.area_or_width));
      if (m.notes) children.push(fieldPara('NOTES', m.notes));
      if (i < misc.length - 1) children.push(spacer());
    });
  }

  // ── LEGAL DESCRIPTION ──
  children.push(sectionHeaderPara('LEGAL DESCRIPTION'));
  children.push(new Paragraph({
    spacing: { before: 20, after: 20 },
    children: [new TextRun({ text: dash(legal), size: 18, font: 'Arial' })],
  }));

  // ── ADDITIONAL INFORMATION ──
  children.push(sectionHeaderPara('ADDITIONAL INFORMATION'));
  const refs = addInfo.references || [];
  if (refs.length > 0) {
    children.push(boldPara('REFERENCES'));
    refs.forEach((r, ri) => {
      const refText = typeof r === 'string' ? r : `${r.book_page_instrument || ''} - ${r.document_type || r.label || ''}`;
      children.push(new Paragraph({
        spacing: { before: 20, after: 20 },
        children: [new TextRun({ text: `${ri + 1}. ${refText}`, size: 18, font: 'Arial' })],
      }));
    });
  }
  const docAccounting = addInfo.document_accounting || [];
  if (docAccounting.length > 0) {
    children.push(boldPara('PDF DOCUMENT ACCOUNTING'));
    docAccounting.forEach((da) => {
      children.push(new Paragraph({
        spacing: { before: 20, after: 20 },
        children: [new TextRun({ text: `PAGE(S) ${da.page_range || ''}: ${da.document_label || ''}`, size: 18, font: 'Arial' })],
      }));
    });
  }
  if (refs.length === 0 && docAccounting.length === 0) {
    children.push(valuePara('NO ADDITIONAL INFORMATION.'));
  }

  // ── NAMES SEARCHED ──
  children.push(sectionHeaderPara('NAMES SEARCHED'));
  children.push(new Paragraph({
    spacing: { before: 20, after: 20 },
    children: [new TextRun({ text: (names || []).join(', ') || 'NONE PROVIDED.', size: 18, font: 'Arial' })],
  }));

  // ── Build Document ──
  const doc = new Document({
    styles: { default: { document: { run: { font: 'Arial', size: 18 } } } },
    sections: [{ properties: { margin: { top: 720, right: 720, bottom: 720, left: 720 } }, children }],
  });

  return await Packer.toBuffer(doc);
}

/**
 * V7 Table-based DOCX Generator
 * Uses table-based layout similar to v5/v6 style but with v7 fields.
 */
async function generateV7TableDocx(fields) {
  const f = fields;
  const oi = f.order_info || {};
  const ti = f.tax_information || {};
  const chain = f.chain_of_title || [];
  const mortgages = f.mortgages || [];
  const liens = f.judgments_liens || [];
  const misc = f.misc_documents || [];
  const legal = f.legal_description;
  const addInfo = f.additional_information || {};
  const names = f.names_searched || [];

  const val = (v) => (v !== null && v !== undefined && v !== '' ? String(v) : '');
  const dash = (v) => val(v) || '—';

  const border = { style: BorderStyle.SINGLE, size: 4, color: '000000' };
  const borders = { top: border, bottom: border, left: border, right: border };

  function cell(text, opts = {}) {
    const { bold = false, shade = null, span = 1, width = null, align = AlignmentType.LEFT, italics = false } = opts;
    return new TableCell({
      borders,
      columnSpan: span,
      ...(width && { width: { size: width, type: WidthType.DXA } }),
      ...(shade && { shading: { fill: shade, type: ShadingType.CLEAR } }),
      margins: { top: 40, bottom: 40, left: 80, right: 80 },
      children: [
        new Paragraph({
          alignment: align,
          children: [new TextRun({ text: val(text), bold, italics, size: 18, font: 'Arial' })],
        }),
      ],
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
      rows: [
        new TableRow({
          children: [
            new TableCell({
              borders,
              shading: { fill: '2c3e50', type: ShadingType.CLEAR },
              margins: { top: 60, bottom: 60, left: 120, right: 120 },
              children: [
                new Paragraph({
                  children: [new TextRun({ text: title, bold: true, size: 20, font: 'Arial', color: 'FFFFFF' })],
                }),
              ],
            }),
          ],
        }),
      ],
    });
  }

  const spacerTable = () => new Paragraph({ spacing: { before: 120 } });

  // ── Order Information ──
  const orderTable = new Table({
    width: { size: 9360, type: WidthType.DXA },
    columnWidths: [1400, 2400, 1400, 1800, 1200, 1360],
    rows: [
      new TableRow({
        children: [
          labelCell('File Number:', 1400),
          valueCell(dash(oi.file_number), 2400),
          labelCell('Client/Order:', 1400),
          valueCell(dash(oi.client_order), 1800),
          labelCell('Effective Date:', 1200),
          valueCell(dash(oi.effective_date), 1360),
        ],
      }),
      new TableRow({
        children: [
          labelCell('Borrower/Owner:', 1400),
          new TableCell({
            borders,
            columnSpan: 5,
            margins: { top: 40, bottom: 40, left: 80, right: 80 },
            children: [
              new Paragraph({
                children: [new TextRun({ text: dash(oi.borrower_owner), size: 18, font: 'Arial' })],
              }),
            ],
          }),
        ],
      }),
      new TableRow({
        children: [
          labelCell('Address:', 1400),
          new TableCell({
            borders,
            columnSpan: 5,
            margins: { top: 40, bottom: 40, left: 80, right: 80 },
            children: [
              new Paragraph({
                children: [new TextRun({ text: dash(oi.property_address), bold: true, size: 20, font: 'Arial' })],
              }),
            ],
          }),
        ],
      }),
      new TableRow({
        children: [
          labelCell('County:', 1400),
          valueCell(dash(oi.county), 2400),
          labelCell('Township/City:', 1400),
          valueCell(dash(oi.township_city), 1800),
          labelCell('Parcel ID/Tax Map:', 1200),
          valueCell(dash(oi.parcel_id_tax_map), 1360),
        ],
      }),
      new TableRow({
        children: [
          labelCell('Account Number:', 1400),
          valueCell(dash(oi.account_number), 2400),
          labelCell('Vesting Owner:', 1400),
          valueCell(dash(oi.current_vesting_owner), 1800),
          labelCell('Assessor Owner:', 1200),
          valueCell(dash(oi.assessor_owner), 1360),
        ],
      }),
      new TableRow({
        children: [
          labelCell('Assessor Desc:', 1400),
          valueCell(dash(oi.legal_assessor_description), 2400),
          labelCell('Acreage:', 1400),
          valueCell(dash(oi.acreage), 1800),
          labelCell('Assessment:', 1200),
          valueCell(dash(oi.assessment), 1360),
        ],
      }),
      ...(oi.order_verification_notes ? [
        new TableRow({
          children: [
            labelCell('Verification Notes:', 1400),
            new TableCell({
              borders,
              columnSpan: 5,
              margins: { top: 40, bottom: 40, left: 80, right: 80 },
              children: [
                new Paragraph({
                  children: [new TextRun({ text: dash(oi.order_verification_notes), size: 16, italics: true, font: 'Arial', color: '555555' })],
                }),
              ],
            }),
          ],
        }),
      ] : []),
    ],
  });

  // ── Tax Information ──
  const taxYear = val(ti.year) || new Date().getFullYear();
  const fh = ti.first_half || {};
  const sh = ti.second_half || {};

  const taxRows = [
    new TableRow({
      children: [
        labelCell('Tax Year:', 1400),
        valueCell(taxYear, 2400),
        labelCell('Total Tax:', 1400),
        valueCell(ti.total_tax ? `$${ti.total_tax}` : dash(ti.total_tax), 1800),
        labelCell('Delinquent:', 1200),
        valueCell(ti.total_delinquent_amount ? `$${ti.total_delinquent_amount}` : dash(ti.total_delinquent_amount), 1360),
      ],
    }),
  ];

  const installmentFields = [
    { label: 'Due Date:', field: 'due_date' },
    { label: 'Original Bill:', field: 'original_bill', prefix: '$' },
    { label: 'Paid Date:', field: 'paid_date' },
    { label: 'Amount Paid:', field: 'amount_paid', prefix: '$' },
    { label: 'Penalty:', field: 'penalty', prefix: '$' },
    { label: 'Interest:', field: 'interest', prefix: '$' },
    { label: 'Balance Due:', field: 'balance_due', prefix: '$' },
  ];

  // First Half header
  taxRows.push(new TableRow({
    children: [
      new TableCell({
        borders,
        columnSpan: 6,
        shading: { fill: 'E8E8E8', type: ShadingType.CLEAR },
        margins: { top: 40, bottom: 40, left: 80, right: 80 },
        children: [
          new Paragraph({
            children: [new TextRun({ text: 'FIRST HALF', bold: true, size: 18, font: 'Arial' })],
          }),
        ],
      }),
    ],
  }));
  installmentFields.forEach((fl) => {
    const fhVal = fh[fl.field];
    const display = fhVal !== null && fhVal !== undefined && fhVal !== ''
      ? (fl.prefix ? `${fl.prefix}${fhVal}` : fhVal)
      : '—';
    taxRows.push(new TableRow({
      children: [
        labelCell(fl.label, 1400),
        new TableCell({ borders, columnSpan: 5, margins: { top: 40, bottom: 40, left: 80, right: 80 },
          children: [new Paragraph({
            children: [new TextRun({ text: display, size: 18, font: 'Arial' })],
          })],
        }),
      ],
    }));
  });

  // Second Half header
  taxRows.push(new TableRow({
    children: [
      new TableCell({
        borders,
        columnSpan: 6,
        shading: { fill: 'E8E8E8', type: ShadingType.CLEAR },
        margins: { top: 40, bottom: 40, left: 80, right: 80 },
        children: [
          new Paragraph({
            children: [new TextRun({ text: 'SECOND HALF', bold: true, size: 18, font: 'Arial' })],
          }),
        ],
      }),
    ],
  }));
  installmentFields.forEach((fl) => {
    const shVal = sh[fl.field];
    const display = shVal !== null && shVal !== undefined && shVal !== ''
      ? (fl.prefix ? `${fl.prefix}${shVal}` : shVal)
      : '—';
    taxRows.push(new TableRow({
      children: [
        labelCell(fl.label, 1400),
        new TableCell({ borders, columnSpan: 5, margins: { top: 40, bottom: 40, left: 80, right: 80 },
          children: [new Paragraph({
            children: [new TextRun({ text: display, size: 18, font: 'Arial' })],
          })],
        }),
      ],
    }));
  });

  const taxTable = new Table({
    width: { size: 9360, type: WidthType.DXA },
    columnWidths: [1400, 2400, 1400, 1800, 1200, 1360],
    rows: taxRows,
  });

  // ── Chain of Title ──
  const chainRows = (chain || []).flatMap((e, i) => {
    const rows = [
      new TableRow({
        children: [
          labelCell(`(${i + 1}) Deed Type:`, 2000),
          valueCell(dash(e.deed_type), 3360),
          labelCell('Book/Inst:', 1200),
          valueCell(dash(e.book_page_instrument), 1200),
          labelCell('In/Out:', 600),
          valueCell(e.in_out_sale ? 'YES' : 'NO', 1000),
        ],
      }),
      new TableRow({
        children: [
          labelCell('Dated:', 800),
          valueCell(dash(e.dated), 1400),
          labelCell('Recorded:', 900),
          valueCell(dash(e.recorded), 1400),
          labelCell('Consideration:', 1200),
          valueCell(dash(e.consideration), 1200),
          cell('', { span: 2 }),
        ],
      }),
      new TableRow({
        children: [
          labelCell('Grantor(s):', 1200),
          new TableCell({ borders, columnSpan: 7,
            children: [new Paragraph({
              children: [new TextRun({ text: (e.grantors || []).join('; ') || '—', size: 18, font: 'Arial' })],
            })],
          }),
        ],
      }),
      new TableRow({
        children: [
          labelCell('Grantee(s):', 1200),
          new TableCell({ borders, columnSpan: 7,
            children: [new Paragraph({
              children: [new TextRun({ text: (e.grantees || []).join('; ') || '—', size: 18, font: 'Arial' })],
            })],
          }),
        ],
      }),
    ];
    if (e.notes) {
      rows.push(new TableRow({
        children: [
          labelCell('Notes:', 1200),
          new TableCell({ borders, columnSpan: 7,
            children: [new Paragraph({
              children: [new TextRun({ text: dash(e.notes), size: 16, italics: true, color: '555555', font: 'Arial' })],
            })],
          }),
        ],
      }));
    }
    // Supporting documents
    (e.supporting_documents || []).forEach((s) => {
      rows.push(new TableRow({
        children: [
          labelCell(`* ${dash(s.document_type)}:`, 2000),
          new TableCell({ borders, columnSpan: 7,
            children: [new Paragraph({
              children: [new TextRun({ text: `DECEDENT: ${dash(s.decedent)}`, size: 16, font: 'Arial' })],
            })],
          }),
        ],
      }));
      if (s.date_of_death || s.will_date) {
        rows.push(new TableRow({
          children: [
            cell('', { span: 2 }),
            labelCell('Date of Death:', 1200),
            valueCell(dash(s.date_of_death), 1400),
            labelCell('Will Date:', 1000),
            valueCell(dash(s.will_date), 1400),
            cell('', { span: 2 }),
          ],
        }));
      }
      if ((s.heirs || []).length > 0) {
        rows.push(new TableRow({
          children: [
            cell('', { span: 2 }),
            labelCell('Heirs:', 1000),
            new TableCell({ borders, columnSpan: 5,
              children: [new Paragraph({
                children: [new TextRun({ text: (s.heirs || []).join('; '), size: 16, font: 'Arial' })],
              })],
            }),
          ],
        }));
      }
    });
    return rows;
  });

  // ── Mortgages ──
  const mortgageRows = (mortgages || []).flatMap((m, i) => {
    const rows = [
      new TableRow({
        children: [
          labelCell(`(${i + 1}) Document:`, 2000),
          valueCell(dash(m.document_title), 3360),
          labelCell('Book/Inst:', 1300),
          valueCell(dash(m.book_page_instrument), 1200),
          labelCell('Amount:', 600),
          valueCell(m.amount ? `$${m.amount}` : dash(m.amount), 1000),
        ],
      }),
      new TableRow({
        children: [
          labelCell('Dated:', 800),
          valueCell(dash(m.dated), 1400),
          labelCell('Recorded:', 900),
          valueCell(dash(m.recorded), 1400),
          labelCell('Maturity:', 1000),
          valueCell(dash(m.maturity), 1200),
          cell('', { span: 2 }),
        ],
      }),
      new TableRow({
        children: [
          labelCell('Lender:', 1000),
          new TableCell({ borders, columnSpan: 7,
            children: [new Paragraph({
              children: [new TextRun({ text: dash(m.lender), size: 18, font: 'Arial' })],
            })],
          }),
        ],
      }),
      new TableRow({
        children: [
          labelCell('Borrower(s):', 1200),
          valueCell((m.borrowers || []).join('; '), 2760),
          labelCell('Trustee:', 1000),
          valueCell(dash(m.trustee), 3600),
        ],
      }),
      new TableRow({
        children: [
          labelCell('Beneficiary/Nominee:', 1600),
          valueCell(dash(m.beneficiary_nominee), 2400),
          labelCell('Loan Number:', 1200),
          valueCell(dash(m.loan_number), 1800),
          labelCell('MIN:', 600),
          valueCell(dash(m.min), 1160),
        ],
      }),
      new TableRow({
        children: [
          labelCell('Open/Closed:', 1200),
          valueCell(dash(m.open_closed_ended), 2000),
          labelCell('Status:', 800),
          new TableCell({ borders, columnSpan: 5,
            children: [new Paragraph({
              children: [new TextRun({ text: dash(m.status), size: 18, font: 'Arial' })],
            })],
          }),
        ],
      }),
    ];
    if (m.notes) {
      rows.push(new TableRow({
        children: [
          labelCell('Notes:', 1200),
          new TableCell({ borders, columnSpan: 7,
            children: [new Paragraph({
              children: [new TextRun({ text: dash(m.notes), size: 16, font: 'Arial' })],
            })],
          }),
        ],
      }));
    }
    (m.associated_documents || []).forEach((a) => {
      rows.push(new TableRow({
        children: [
          labelCell('  Assoc Doc:', 1200),
          new TableCell({ borders, columnSpan: 7,
            children: [new Paragraph({
              children: [new TextRun({ text: `${dash(a.document_type)} | ${dash(a.book_page_instrument)} | ${dash(a.dated)} | ${dash(a.recorded)}`, size: 16, font: 'Arial' })],
            })],
          }),
        ],
      }));
    });
    return rows;
  });

  // ── Judgments/Liens ──
  const lienRows = (liens || []).flatMap((l, i) => [
    new TableRow({
      children: [
        labelCell(`(${i + 1}) Document:`, 2000),
        valueCell(dash(l.document_title), 3360),
        labelCell('Case #:', 1200),
        valueCell(dash(l.case_number), 2800),
      ],
    }),
    new TableRow({
      children: [
        labelCell('Dated:', 800),
        valueCell(dash(l.date_of_judgment_lien), 1400),
        labelCell('Amount:', 1200),
        valueCell(l.amount ? `$${l.amount}` : dash(l.amount), 1200),
        labelCell('Recorded:', 1000),
        valueCell(dash(l.recorded), 3760),
      ],
    }),
    new TableRow({
      children: [
        labelCell('Plaintiff/Lienholder:', 1600),
        valueCell(dash(l.plaintiff_lienholder), 3000),
        labelCell('Defendant/Debtor:', 1600),
        valueCell(dash(l.defendant_debtor), 3160),
      ],
    }),
    new TableRow({
      children: [
        labelCell('Interest:', 1200),
        valueCell(dash(l.interest), 2400),
        labelCell('Costs:', 1200),
        valueCell(l.costs ? `$${l.costs}` : dash(l.costs), 1800),
        labelCell("Atty's Fees:", 1200),
        valueCell(l.attorneys_fees ? `$${l.attorneys_fees}` : dash(l.attorneys_fees), 1560),
      ],
    }),
    new TableRow({
      children: [
        labelCell('Status:', 1200),
        new TableCell({ borders, columnSpan: 5,
          children: [new Paragraph({
            children: [new TextRun({ text: dash(l.status), size: 18, font: 'Arial' })],
          })],
        }),
      ],
    }),
    ...(l.notes ? [new TableRow({
      children: [
        labelCell('Notes:', 1200),
        new TableCell({ borders, columnSpan: 5,
          children: [new Paragraph({
            children: [new TextRun({ text: dash(l.notes), size: 16, font: 'Arial' })],
          })],
        }),
      ],
    })] : []),
  ]);

  // ── Miscellaneous Documents ──
  const miscRows = (misc || []).flatMap((m, i) => {
    const rows = [
      new TableRow({
        children: [
          labelCell(`(${i + 1}) Type:`, 2000),
          valueCell(dash(m.document_type || m.document_title), 3360),
          labelCell('Book/Inst:', 1200),
          valueCell(dash(m.book_page_instrument), 1200),
          cell('', { span: 2 }),
        ],
      }),
    ];
    if (m.decedent || m.date_of_death || m.will_date) {
      rows.push(new TableRow({
        children: [
          labelCell('Decedent:', 1200),
          valueCell(dash(m.decedent), 2400),
          labelCell('Date of Death:', 1400),
          valueCell(dash(m.date_of_death), 1400),
          labelCell('Will Date:', 1000),
          valueCell(dash(m.will_date), 1360),
        ],
      }));
    }
    if ((m.heirs || []).length > 0) {
      rows.push(new TableRow({
        children: [
          labelCell('Heirs:', 1000),
          new TableCell({ borders, columnSpan: 5,
            children: [new Paragraph({
              children: [new TextRun({ text: (m.heirs || []).join('; '), size: 16, font: 'Arial' })],
            })],
          }),
        ],
      }));
    }
    if (m.grantor_assignor || m.grantee_assignee) {
      rows.push(new TableRow({
        children: [
          labelCell('Grantor/Assignor:', 1600),
          valueCell(dash(m.grantor_assignor), 2400),
          labelCell('Grantee/Assignee:', 1600),
          valueCell(dash(m.grantee_assignee), 2400),
          labelCell('Area/Width:', 1000),
          valueCell(dash(m.area_or_width), 1160),
        ],
      }));
    }
    if (m.dated) {
      rows.push(new TableRow({
        children: [
          labelCell('Dated:', 800),
          valueCell(dash(m.dated), 1400),
          labelCell('Consideration:', 1200),
          valueCell(dash(m.consideration), 1200),
          cell('', { span: 4 }),
        ],
      }));
    }
    if (m.notes) {
      rows.push(new TableRow({
        children: [
          labelCell('Notes:', 1200),
          new TableCell({ borders, columnSpan: 5,
            children: [new Paragraph({
              children: [new TextRun({ text: dash(m.notes), size: 16, font: 'Arial' })],
            })],
          }),
        ],
      }));
    }
    return rows;
  });

  // ── Legal Description ──
  const legalPara = new Table({
    width: { size: 9360, type: WidthType.DXA },
    rows: [
      new TableRow({
        children: [
          new TableCell({
            borders,
            margins: { top: 100, bottom: 100, left: 100, right: 100 },
            children: [
              new Paragraph({
                children: [new TextRun({ text: dash(legal), size: 18, font: 'Arial' })],
              }),
            ],
          }),
        ],
      }),
    ],
  });

  // ── Additional Information ──
  let addInfoText = '';
  const refs = addInfo.references || [];
  if (refs.length > 0) {
    addInfoText += 'REFERENCES:\n';
    refs.forEach((r, idx) => {
      const refStr = typeof r === 'string' ? r : `${r.book_page_instrument || ''} - ${r.document_type || r.label || ''}`;
      addInfoText += `${idx + 1}. ${refStr}\n`;
    });
  }
  const docAccounting = addInfo.document_accounting || [];
  if (docAccounting.length > 0) {
    addInfoText += '\nPDF DOCUMENT ACCOUNTING:\n';
    docAccounting.forEach((da, idx) => {
      addInfoText += `${idx + 1}. PAGE(S) ${da.page_range || ''}: ${da.document_label || ''}\n`;
    });
  }
  if (!addInfoText) addInfoText = 'No additional information.';

  const additionalPara = new Table({
    width: { size: 9360, type: WidthType.DXA },
    rows: [
      new TableRow({
        children: [
          new TableCell({
            borders,
            margins: { top: 100, bottom: 100, left: 100, right: 100 },
            children: [
              new Paragraph({
                children: [new TextRun({ text: addInfoText, size: 18, font: 'Arial' })],
              }),
            ],
          }),
        ],
      }),
    ],
  });

  // ── Names Searched ──
  const namesText = (names || []).join(', ') || 'NONE PROVIDED.';
  const namesPara = new Table({
    width: { size: 9360, type: WidthType.DXA },
    rows: [
      new TableRow({
        children: [
          new TableCell({
            borders,
            margins: { top: 100, bottom: 100, left: 100, right: 100 },
            children: [
              new Paragraph({
                children: [new TextRun({ text: namesText, size: 18, font: 'Arial' })],
              }),
            ],
          }),
        ],
      }),
    ],
  });

  // ── Build Document ──
  const doc = new Document({
    styles: { default: { document: { run: { font: 'Arial', size: 18 } } } },
    sections: [
      {
        properties: { margin: { top: 720, right: 720, bottom: 720, left: 720 } },
        children: [
          sectionHeader('ORDER INFORMATION'),
          orderTable,
          spacerTable(),
          taxTable,
          spacerTable(),
          sectionHeader('CHAIN OF TITLE'),
          new Table({
            width: { size: 9360, type: WidthType.DXA },
            rows: chainRows.length
              ? chainRows
              : [new TableRow({ children: [cell('NO CHAIN ENTRIES FOUND.', { span: 8, italics: true })] })],
          }),
          spacerTable(),
          sectionHeader('MORTGAGES / DEEDS OF TRUST'),
          new Table({
            width: { size: 9360, type: WidthType.DXA },
            rows: mortgageRows.length
              ? mortgageRows
              : [new TableRow({ children: [cell('NONE — NO OPEN MORTGAGE OR DEED OF TRUST.', { span: 8, italics: true })] })],
          }),
          spacerTable(),
          sectionHeader('JUDGMENTS / LIENS'),
          new Table({
            width: { size: 9360, type: WidthType.DXA },
            rows: lienRows.length
              ? lienRows
              : [new TableRow({ children: [cell('NONE — NO OPEN JUDGMENT OR LIEN.', { span: 6, italics: true })] })],
          }),
          spacerTable(),
          sectionHeader('MISCELLANEOUS DOCUMENTS'),
          new Table({
            width: { size: 9360, type: WidthType.DXA },
            rows: miscRows.length
              ? miscRows
              : [new TableRow({ children: [cell('NO MISCELLANEOUS DOCUMENTS FOUND.', { span: 6, italics: true })] })],
          }),
          spacerTable(),
          sectionHeader('LEGAL DESCRIPTION'),
          legalPara,
          spacerTable(),
          sectionHeader('ADDITIONAL INFORMATION'),
          additionalPara,
          spacerTable(),
          sectionHeader('NAMES SEARCHED'),
          namesPara,
        ],
      },
    ],
  });

  return await Packer.toBuffer(doc);
}

module.exports = { generateDocx, generateV7TextDocx, generateV7TableDocx };
