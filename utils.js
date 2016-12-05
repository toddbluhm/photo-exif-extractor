const crypto = require('crypto')

function GenerateEtag (imageBuffer) {
  return crypto.createHash('sha256').update(imageBuffer).digest('hex')
}

module.exports = {
  GenerateEtag
}
