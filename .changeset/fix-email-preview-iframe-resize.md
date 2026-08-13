---
'@maildev/ui': patch
---

Fix HTML email preview iframe sizing on viewport change. Switching the preview
viewport previously left it permanently broken — the iframe stopped resizing to
its content (tall emails were clipped and the footer became unreachable) and
in-iframe keyboard shortcuts stopped forwarding — because the resize observers
and listeners were torn down and never re-attached. They are now kept in place
across viewport changes and the height is re-measured for the new width.
