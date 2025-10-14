<!-- e62db7e4-e92e-45d1-8411-191b3c228dd4 2209da2c-5524-40be-907e-65d8efcbfe8f -->
# Edit Report in Visual Query Builder

## 1. Database & API Updates

**`lib/reports-db.ts`**

- Add `updateReportQuery(id, query_config, parameters)` function to update query structure and regenerate parameters

**`app/api/reports/[id]/route.ts`**

- Extend PUT endpoint to accept `query_config` and `parameters` fields
- When provided, delete old parameters and create new ones

## 2. Visual Query Builder Component

**`components/visual-query-builder.tsx`**

Add props:

- `mode?: 'create' | 'update'` - default 'create'
- `initialQuery?: VisualQuery` - pre-populate query state
- `reportId?: number` - for update mode
- `reportFolderId?: number` - for update mode

Update behavior:

- If `initialQuery` provided, use it instead of empty state on open
- Show different header: "Edit Report" vs "Visual Query Builder"
- Footer buttons:
  - Create mode: "Save as Report" + "Execute Query"
  - Update mode: "Update Report" + "Execute Query"
- On "Update Report": call update API instead of create

## 3. Save/Update Report Logic

**`components/save-report-dialog.tsx`**

- Keep as-is for "Save as Report" (create new)

**New: `components/update-report-handler.tsx`** (or inline logic)

- Auto-detect parameters from WHERE conditions
- Call update report API with new query_config and parameters

## 4. Report Page Integration

**`app/folders/[folderId]/report/[reportId]/page.tsx`**

Add:

- "Edit Report" button in header (next to breadcrumb or in top-right)
- State: `isEditingInBuilder` boolean
- Pass to Visual Builder:
  - `mode="update"`
  - `initialQuery={report.query_config}`
  - `reportId={reportId}`
  - `reportFolderId={folderId}`
- On update success: refresh report data and close builder

## 5. API Hooks

**`lib/hooks/use-api.ts`**

Add interface:

```typescript
interface UpdateReportQueryRequest {
  query_config: VisualQuery;
  parameters: any[];
}
```

Extend `api.updateReport` to accept query_config and parameters

## Implementation Details

- Pre-populate Visual Builder by setting initial state when `initialQuery` prop changes
- Auto-regenerate parameters when saving (same logic as save-report-dialog)
- Delete old parameters, create new ones atomically
- Show "Updated successfully" toast and close builder
- User can still "Save as Report" to create a copy in different folder

### To-dos

- [ ] Add updateReportQuery function to lib/reports-db.ts that updates query_config and regenerates parameters
- [ ] Extend PUT /api/reports/[id] to accept query_config and parameters fields
- [ ] Update api.updateReport in lib/hooks/use-api.ts to support query_config and parameters
- [ ] Add mode, initialQuery, reportId, reportFolderId props to components/visual-query-builder.tsx
- [ ] Update Visual Query Builder to pre-populate state from initialQuery and show Update Report button in update mode
- [ ] Add Edit Report button and Visual Builder integration to report page