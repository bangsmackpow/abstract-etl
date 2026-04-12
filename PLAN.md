# Development Plan

## Phase 1: Verification (Current)
- [ ] **Run Sample 1 (11916974)**: Verify Deed #3 is extracted and "In/Out Sale" for Deed #2 is correct.
- [ ] **Run Sample 2 (27589)**: Verify Mortgages 2 & 3 are extracted and Borrower/Trustee fields are filled.
- [ ] **Export Word**: Ensure the new "Miscellaneous" and "Legal Description" sections render correctly in the download.

## Phase 2: User Experience
- [ ] **Mobile Admin**: Adjust CSS for the metrics table to be readable on smaller screens.
- [ ] **AI Progress Bar**: Add more "flavor" text to the progress bar (e.g., "Reading page 5 of 36...") to keep users engaged.

## Phase 3: Cloudflare Workers & D1
- [ ] **Hono Refactor**: Rewrite Express routes to Hono for edge compatibility.
- [ ] **D1 Adapter**: Switch `better-sqlite3` to `drizzle-orm/d1` for the production build.
- [ ] **R2 Uploads**: Move temporary file storage from local disk to Cloudflare R2.
