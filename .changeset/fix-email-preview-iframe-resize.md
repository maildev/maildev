---
'@maildev/ui': patch
---

Fix HTML email preview iframe sizing: re-measure on viewport change (previously
switching viewport permanently disabled dynamic height and keyboard forwarding),
and let the height shrink back to fit shorter content.
