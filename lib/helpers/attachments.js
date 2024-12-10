const path = require('path')
const crypto = require('crypto');

// Return the absolute file path on disk for a given attachment
function getAttachmentFilePath(mailDir, emailId, attachment) {
  if (!attachment.transformed) {
    throw new Error('Attachment must be transformed prior to reading file path')
  }
  // transformAttachment modifies the generatedFileName to address CVE-2024-27448
  return path.join(mailDir, emailId, attachment.generatedFileName)
}

// Gets the generated filename from a given attachment
// Fixes: CVE-2024-27448
function generateAttachmentFilename(attachment) {
  // Get original extension
  const ext = path.extname(attachment.generatedFileName)
  // Generate new filename hash
  const name = crypto.createHash('md5').update(attachment.contentId).digest('hex')
  // console.log('Generated filename:', attachment, path.format({ name, ext }))
  return path.format({ name, ext })
}

function transformAttachment(attachment) {
  // Add "transformed" boolean flag to later verify that the filename has been transformed
  return {
    ...attachment,
    transformed: true,
    generatedFileName: generateAttachmentFilename(attachment),
  }
}

module.exports.getAttachmentFilePath = getAttachmentFilePath
module.exports.transformAttachment = transformAttachment;

