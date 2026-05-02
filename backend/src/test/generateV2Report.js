const { generateV2Report } = require('../services/pdfGenerator');
const path = require('path');

const mockJob = {
  id: 'test-0001',
  propertyAddress: '1712 BRANDY ROAD CEDAR BLUFF VA 24609',
  templateVersion: 'v2',
  fieldsJson: {
    property_info: {
      order_no: '260415214',
      current_owner: 'JOHN DOE AND JANE DOE',
      address: '1712 BRANDY ROAD, CEDAR BLUFF, VA 24609',
      apn_parcel_pin: '057-07-0032',
      county: 'TAZEWELL',
      completed_date: '04/24/2026',
      index_date: '04/24/2026',
      misc_info_to_examiner: 'Please verify the legal description matches the county records. The property was originally part of a larger tract that was subdivided in 1998. There is an access easement recorded in Deed Book 412, Page 89 that benefits this parcel. Additionally, confirm that the current vesting matches the last recorded deed. The chain of title shows a potential gap between 2005 and 2008 that needs clarification.'
    },
    vesting_info: {
      grantee: 'JOHN DOE AND JANE DOE',
      grantor: 'ROBERT SMITH AND MARY SMITH',
      deed_date: '03/15/2010',
      recorded_date: '03/20/2010',
      instrument_book_page: 'DB 310 / PG 225',
      vbook_num: '310',
      vpage_num: '225',
      consideration_amount: '$175,000.00',
      sale_price: '$175,000.00',
      deed_type: 'GENERAL WARRANTY DEED',
      probate_status: 'N/A',
      divorce_status: 'N/A',
      notes: null
    },
    chain_of_title: [
      {
        grantee: 'JOHN DOE AND JANE DOE',
        grantor: 'ROBERT SMITH AND MARY SMITH',
        deed_date: '03/15/2010',
        recorded_date: '03/20/2010',
        instrument_book_page: 'DB 310 / PG 225',
        vbook_num: '310',
        vpage_num: '225',
        consideration_amount: '$175,000.00',
        deed_type: 'GENERAL WARRANTY DEED',
        notes: 'OUTSALE'
      },
      {
        grantee: 'ROBERT SMITH AND MARY SMITH',
        grantor: 'WILLIAM JOHNSON',
        deed_date: '08/01/2005',
        recorded_date: '08/05/2005',
        instrument_book_page: 'DB 185 / PG 412',
        vbook_num: '185',
        vpage_num: '412',
        consideration_amount: '$95,000.00',
        deed_type: 'SPECIAL WARRANTY DEED',
        notes: 'OUTSALE'
      },
      {
        grantee: 'WILLIAM JOHNSON',
        grantor: 'SARAH THOMPSON',
        deed_date: '06/12/1998',
        recorded_date: '06/15/1998',
        instrument_book_page: 'DB 89 / PG 156',
        vbook_num: '89',
        vpage_num: '156',
        consideration_amount: '$62,500.00',
        deed_type: 'GENERAL WARRANTY DEED',
        notes: 'OUTSALE'
      },
      {
        grantee: 'SARAH THOMPSON',
        grantor: 'CHARLES BROWN',
        deed_date: '01/20/1985',
        recorded_date: '01/25/1985',
        instrument_book_page: 'DB 42 / PG 310',
        vbook_num: '42',
        vpage_num: '310',
        consideration_amount: '$28,000.00',
        deed_type: 'GENERAL WARRANTY DEED',
        notes: null
      },
      {
        grantee: 'CHARLES BROWN',
        grantor: 'ESTATE OF HENRY MILLER',
        deed_date: '09/10/1975',
        recorded_date: '09/15/1975',
        instrument_book_page: 'DB 18 / PG 95',
        vbook_num: '18',
        vpage_num: '95',
        consideration_amount: null,
        deed_type: 'QUITCLAIM DEED',
        notes: 'ISSUED PURSUANT TO ORDER OF PROBATE COURT; *PROBATED WILL & ORDER OF DISTRIBUTION RECORDED IN WB 42 / PG 198'
      }
    ],
    mortgages: [
      {
        borrower: 'JOHN DOE AND JANE DOE',
        lender: 'FIRST NATIONAL BANK',
        mortgage_amount: '$140,000.00',
        mortgage_date: '03/15/2010',
        recorded_date: '03/20/2010',
        book: 'MB 55',
        page: '112',
        instrument: '123456',
        maturity_date: '04/01/2040',
        mortgage_type: 'CONVENTIONAL',
        mers: 'Yes',
        vesting_status: 'CURRENT',
        assignments: [
          {
            document_type: 'ASSIGNMENT OF DEED OF TRUST',
            instrument: '789012',
            book: 'MB 58',
            page: '45',
            recorded_date: '06/15/2015',
            assignor: 'FIRST NATIONAL BANK',
            assignee: 'WELLS FARGO BANK'
          }
        ]
      },
      {
        borrower: 'ROBERT SMITH AND MARY SMITH',
        lender: 'COMMUNITY SAVINGS BANK',
        mortgage_amount: '$76,000.00',
        mortgage_date: '08/01/2005',
        recorded_date: '08/05/2005',
        book: 'MB 32',
        page: '198',
        instrument: '456789',
        maturity_date: '09/01/2035',
        mortgage_type: 'CONVENTIONAL',
        mers: 'No',
        vesting_status: 'SATISFIED',
        assignments: []
      }
    ],
    associated_documents: [
      {
        document_title: 'RIGHT OF WAY EASEMENT',
        book_instrument: 'DB 52',
        page: '189',
        dated: '03/01/1998',
        recorded: '03/05/1998',
        consideration: '$1.00',
        grantor_assignor: 'SARAH THOMPSON',
        grantee_assignee: 'COUNTY OF TAZEWELL',
        notes: 'ACCESS EASEMENT FOR ROAD MAINTENANCE'
      }
    ],
    judgments_liens: [],
    misc_documents: [],
    tax_status: {
      parcel_id: '057-07-0032',
      tax_year: '2025',
      total_amount: '$1,285.40',
      status: 'CURRENT AND PAID',
      paid_date: '12/15/2025',
      delinquent_amount: '$0.00'
    },
    legal_description: 'ALL THAT CERTAIN LOT OR PARCEL OF LAND SITUATE IN THE CEDAR BLFF DISTRICT OF TAZEWELL COUNTY, VIRGINIA, BEING KNOWN AND DESIGNATED AS LOT 7 OF THE BRANDY WOODS SUBDIVISION, AS SHOWN ON A PLAT OF SAID SUBDIVISION RECORDED IN PLAT BOOK 3, PAGE 42, IN THE CLERK\'S OFFICE OF TAZEWELL COUNTY CIRCUIT COURT. SAID LOT CONTAINS 1.25 ACRES, MORE OR LESS, AND IS BOUNDED ON THE NORTH BY BRANDY ROAD, ON THE EAST BY LOT 8, ON THE SOUTH BY LOT 6, AND ON THE WEST BY THE PROPERTY OF SMITH.',
    names_searched: ['JOHN DOE', 'JANE DOE', 'ROBERT SMITH', 'MARY SMITH', 'WILLIAM JOHNSON', 'SARAH THOMPSON', 'CHARLES BROWN', 'HENRY MILLER'],
    additional_information: 'THIS ABSTRACT IS PREPARED FOR THE BENEFIT OF THE TITLE INSURANCE COMPANY AND IS NOT A GUARANTEE OF TITLE. THE INFORMATION CONTAINED HEREIN IS DERIVED FROM PUBLIC RECORDS AND IS BELIEVED TO BE ACCURATE BUT IS NOT WARRANTED.'
  }
};

const outputPath = path.join(__dirname, '..', '..', '..', 'docs', 'v2_report', 'test_output.pdf');

generateV2Report(mockJob, outputPath)
  .then((p) => {
    console.log('✅ PDF generated at:', p);
    process.exit(0);
  })
  .catch((err) => {
    console.error('❌ PDF generation failed:', err);
    process.exit(1);
  });
