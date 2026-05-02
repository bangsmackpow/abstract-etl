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
  return templateVersion === 'v2' ? generateV2Docx(fields) : generateV1Docx(fields);
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

module.exports = { generateDocx };
