# CMS Owner Guide

Use `/admin` after signing in and completing MFA. For normal work, start with
**Page Builder** or **Project Builder**. **Advanced data tables** are a fallback
for exceptional maintenance.

## Edit a page

1. Open **Page Builder** and choose the page by name.
2. Review **Page settings**, **SEO & social preview**, and **Navigation**.
3. Select **Edit page settings**, make the change, and save.
4. Check the publication checklist before enabling **Published**.

Canonical paths and stable keys are read-only. This prevents an accidental CMS
edit from breaking a route or its revision history.

## Add, reorder, hide, or archive a block

1. Choose the page in **Page Builder**, then select **Add block**.
2. Choose a controlled block type and layout. Read the short help and example
   shown below the form, add only meaningful content, and save.
3. Use **Move up** or **Move down** in the ordered block list.
4. Use **Hide** for a reversible public-site change.
5. Use **Duplicate** to copy a block and its supporting items, then review it.
   If the request is interrupted, select **Duplicate** again: the builder
   safely reuses the pending request instead of creating a second copy.
6. Use **Archive** only when the block should leave the active builder.

For card, statistic, and gallery content, use **Add supporting item** directly
beneath the parent block. Existing items can be edited, hidden, or removed
there, without opening **Advanced data tables**. Add useful image alt text.

## Edit a project

1. Open **Project Builder** and choose the project by title.
2. Select **Edit project** for its summary, tools, status, images, and SEO.
3. Add or edit concise sections under **Ordered sections**, then manage their
   label-and-value evidence with **Add fact**.
4. Use **Project media** to add, edit, hide, or remove an accessible screenshot
   or supporting document.
5. Resolve publication blockers. Keep incomplete work unpublished or in
   `preparation`; never fill factual gaps with assumed outcomes.

## Upload media

1. Open **Media Library** or use the media picker in a form.
2. Choose the correct bucket and an allowed image, PDF, or DOCX file.
3. Add descriptive alt text for informative images.
4. Save the content entry before leaving the form.

Uploaded files retain their validation and deletion lifecycle. Do not paste raw
Storage URLs or HTML into content fields.

## Preview and publish

1. Save the entry. For already published content, select **Preview published
   page/project** to open the current public result in a separate tab.
2. Check desktop and mobile layout, links, image descriptions, and factual copy.
3. For unpublished work, review the builder copy and checklist first; the CMS
   never exposes a private draft through a public preview URL.
4. Resolve all blockers and warnings, publish only the intended entry, then use
   the preview link for the final public check.

## Restore a revision

1. Edit the affected entry and open **Revision history** below the form.
2. Review the timestamp and previous values.
3. Restore the intended revision, then preview the canonical public page.
4. Recheck the publication checklist before leaving the entry published.
