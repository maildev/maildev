---
'@maildev/smtp': patch
'@maildev/api': patch
---

Fix inline (CID) attachment rewriting for mailparser-parsed mail (#583).
mailparser keeps the angle brackets from the `Content-ID` header in
`attachment.contentId` (`<id@host>`) while the HTML references the bare
`cid:id@host`, so `replaceCidReferences` never matched and inline parts that
survive parsing (e.g. inline SVG, which mailparser does not inline as a data
URI) rendered in the UI as broken `cid:` images. Content IDs are now
normalized — angle brackets and surrounding whitespace stripped — both when
matching and when storing parsed mail. Note: the generated attachment filename
is hashed from the content ID, so filenames for new deliveries change;
filenames are stored with each email so nothing else is affected.