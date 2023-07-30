/* global app */

/**
 * Email Resource
 */

app.service('Email', ['$resource', function ($resource) {
  return $resource('email/:id', { id: '' }, {
    update: {
      method: 'PUT',
      params: {}
    }
  })
}]).service('Favicon', [function () {
  const favicon = document.getElementById('favicon')
  const canvas = document.createElement('canvas')
  const context = canvas.getContext('2d')
  const bufferImage = new window.Image()

  let lastUnreadCount = 0
  const faviconSize = 16
  const pos = {
    x: faviconSize - faviconSize / 3,
    y: faviconSize - faviconSize / 3
  }

  bufferImage.src = './favicon.ico'
  bufferImage.onload = function () {
    setUnreadCount(lastUnreadCount)
  }

  canvas.width = canvas.height = faviconSize

  const drawCircle = function (ctx, pos) {
    ctx.beginPath()
    ctx.arc(pos.x, pos.y, faviconSize / 2.4, 0, 2 * Math.PI)
    ctx.fillStyle = '#d00'
    ctx.fill()
    ctx.stroke()
  }

  const drawText = function (ctx, pos, text) {
    ctx.font = 'bold 9px "helvetica", sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillStyle = '#FFFFFF'
    ctx.fillText(text, pos.x, pos.y)
  }

  const setUnreadCount = function (unreadCount) {
    lastUnreadCount = unreadCount
    if (unreadCount === 0) {
      favicon.href = bufferImage.src
      return
    }

    context.drawImage(bufferImage, 0, 0, faviconSize, faviconSize)
    drawCircle(context, pos)
    drawText(context, pos, unreadCount)

    favicon.href = canvas.toDataURL('image/png')
  }

  return {
    setUnreadCount: setUnreadCount
  }
}])

app.service('FavIcon', [function () {
  // eslint-disable-next-line no-undef
  const scheme = new ColorScheme()
  const assignedPalette = scheme.from_hue(21)
    .scheme('tetrade')
    .variation('pastel')
    .colors()
    .map((color) => {
      return {
        color: color,
        addresses: []
      }
    })
    .splice(0, 3)

  const getInitials = (emailAddress) => emailAddress
    .replaceAll(/[-.]/g, ' ')
    .replace(/[^a-zA-Z- ]/g, '')
    .match(/\b\w/g)
    .splice(0, 2)
    .join('')
    .toUpperCase()

  let lastAssigned = -1
  const assignColor = (address) => {
    for (let i = 0; i < assignedPalette.length; i++) {
      if (assignedPalette[i].addresses.indexOf(address) !== -1) {
        return assignedPalette[i].color
      }
    }
    lastAssigned = (lastAssigned + 1) % assignedPalette.length
    assignedPalette[lastAssigned].addresses.push(address)
    return assignedPalette[lastAssigned].color
  }
  return {
    extract: (mailObjects) => {
      return mailObjects.map((mailObject) => {
        mailObject.favicon = {
          type: 'badge',
          text: getInitials(mailObject.envelope.from.address),
          color: '#' + assignColor(mailObject.envelope.from.address)
        }
        if (!mailObject.html) return mailObject
        const tagMatches = mailObject.html.match(/<link (.*?rel="shortcut icon".*?)>.*<\/head>/i)
        if (tagMatches) {
          const hrefMatch = tagMatches[1].match(/href="(.*?)"/)
          if (hrefMatch) {
            mailObject.favicon = {
              type: 'image',
              src: hrefMatch[1]
            }
          }
        }
        return mailObject
      })
    }
  }
}])
