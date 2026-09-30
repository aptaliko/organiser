# Manual testing checklist

Vitest covers the pure logic. These need a real browser/phone — run through them before a
release, on an Android phone (Chrome) and an iPhone (Safari) where marked 📱.

## Install & sign in
- [ ] 📱 "Add to Home Screen" / "Install app" is offered; the installed app opens standalone.
- [ ] Register, log out, log in; wrong password shows the error; `?next=` returns you where you were.
- [ ] Language switch EN ⇄ ΕΛ on login and in Settings; the choice sticks after re-login.

## Photos 📱
- [ ] "Take photo" opens the rear camera directly; "Choose photo" opens the gallery.
- [ ] A portrait photo is stored upright; a ~5 MB photo uploads quickly (resized to ≤1600px).
- [ ] Production: photos land in Vercel Blob (URL on `*.public.blob.vercel-storage.com`).
- [ ] Set cover, remove a photo; deleting an item removes its photo files from Blob.

## Places & items
- [ ] Create a top-level place with an address; a place inside inherits it (Maps link opens).
- [ ] Dimensions accept `45`, `45 εκ`, `1,2 μ`, `450mm`; invalid input is flagged.
- [ ] Quick add: photo → name → place; the place defaults to the last one used;
      "Save & add another" keeps the place.
- [ ] Tags: create, reuse (case/accents ignored), rename/delete in Settings.

## Search
- [ ] `κατσαβιδι`, `ΚΑΤΣΑΒΊΔΙ` and the typo `κατσαβδι` all find "Κατσαβίδι".
- [ ] Results show the full path; Back from an item returns to the same results.
- [ ] Tapping a tag lists its items.

## Moving
- [ ] Move one item; Undo puts it back.
- [ ] Quantity 12 → move 4: a new row of 4 appears in the target with the same photo/tags.
- [ ] Moving into a place with a same-named item asks to add the quantities.
- [ ] Select several items → "Move N to…".
- [ ] Move a box to another room: its contents come along; it can't go inside itself.
- [ ] "Take out" makes an item Unplaced; "Move items here" pulls items into a box.
- [ ] The picker shows "~X free" and "⚠ May not fit" for too-long items.

## Space
- [ ] A place with dimensions shows the fill bar; items without dimensions are counted in the note.
- [ ] Item page "Where would it fit?" lists places with room, emptiest first.

## Households
- [ ] Invite link → Share opens the phone share sheet 📱; a new person registers and sees the same places.
- [ ] An existing user opening an invite joins and switches to that household.
- [ ] Owners: make owner, remove member, stop all invite links (old links then show "expired").
- [ ] The only member / last owner can't leave (clear message).
- [ ] Switch between two households; each shows only its own data.

## QR labels
- [ ] Print labels (A4, 21 per sheet) — they line up on a 63.5 × 38.1 mm label sheet.
- [ ] 📱 Scanning a label with the stock camera opens the box (after login if signed out).
- [ ] A label from a household you're not in shows the "no access" message.

## Deleting places
- [ ] Deleting an empty place just asks to confirm.
- [ ] Non-empty: "move contents up" keeps items (now in the parent); "delete everything" removes all.
