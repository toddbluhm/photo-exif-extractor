const BPromise = require('bluebird')
const needle = BPromise.promisifyAll(require('needle'))
const _ = require('highland')
const utils = require('./utils')
const ExifImage = require('exif')

// / Image Data Format
// {
//  etag: '1234567890abcdef', // UUID that is hashed from the image binary data to prevent duplicates
//  name: 'somename.jpg',
//  url: 'https://someurl.com/somename.jpg',
//  image: Object // contains attributes about the image,
//  thumbnail: Object // contains attributes about the images thumbnail
//  exif: Object // exif specific information
//  gps: Object // contains the gps information about where the picture was taken at
//  interoperability: Object // interoperability information
//  makernotes: Object //contains custom/special attributes unique to different cameras
// }

function GetImagesFromUrl (url) {
  return needle.getAsync(url)
    .then((res) => {
      if (res.body) {
        return res.body.ListBucketResult.Contents
      }
      throw new Error(`No XML data found at url ${url}`)
    })
}

function FormatImageMetaData (baseUrl) {
  return function (image) {
    const name = image.Key
    return {
      name,
      url: `${baseUrl}/${name}`
    }
  }
}

function GetImageDataAndId (image) {
  return needle.getAsync(image.url)
    .then((res) => {
      if (res.body instanceof Buffer) {
        image.data = res.body
        image.etag = utils.GenerateEtag(image.data)
        return image
      }

      return ImageDownloadErrorHandler(new Error('Non-buffer value returned in body from url'), image, res)
    })
    .catch((e) => {
      return ImageDownloadErrorHandler(e, image)
    })
}

function ReadEXIFData (image) {
  return new BPromise((resolve, reject) => {
    ExifImage(image.data, function (error, exifData) {
      if (error) {
        return resolve(EXIFParseErrorHandler(error, image))  // resolve with null to continue on
      }
      image = Object.assign(image, exifData)
      resolve(image)
    })
  })
}

// A better way to do this would be to use Redis as a shared store rather than this in-memory one
const uniqueImages = []
function RemoveDuplicates (prop) {
  return function (image) {
    if (!image.hasOwnProperty(prop)) {
      return false
    }
    if (!~uniqueImages.indexOf(image[prop])) {
      uniqueImages.push(image[prop])
      return true
    }
    return false
  }
}

function GetImagesStream (url) {
  console.log('Using Waldo Photos s3 Bucket as a source.')
  // Fetch picture urls from s3 xml file
  return _(GetImagesFromUrl(url))
    .sequence()
    // Strip unnecessary data from s3 file data
    .map(FormatImageMetaData(url))
    // Download the full image
    .flatMap(image => _(GetImageDataAndId(image)))
    // Strip out any null values meaning an error occurred during download
    .compact()
    // Filter out all the duplicate images based on etag
    .filter(RemoveDuplicates('etag'))
    // Read the exif data off of the image buffer and store it
    .flatMap(image => _(ReadEXIFData(image)))
    // .parallel(20)
    // Stip out any null values meaning an error occurred during exif extraction
    .compact()
    // Remove the raw image data because that won't be stored in db,
    // but a url to the s3 image will be stored
    .map(image => {
      delete image.data
      return image
    })
}

// Default Error Handlers

// Handles any error or non-buffer returned from the image download attempt
// Default returns null
function ImageDownloadErrorHandler (error, image, response) {
  if (error.message.match(/Non-buffer value returned/gi).length) {
    console.log(
`Error: Non-buffer returned from image download for image: ${image.url}
Returned Data: ${JSON.stringify(response.body, null, 2)}`
    )
    return null
  }
  throw error
}

// Handles any error resulting thrown by the exif parser
// Default returns null
function EXIFParseErrorHandler (error, image) {
  console.log(
`Error parsing exif data from image: ${image.url}
Error: ${error.message}`
    )
  return null
}

module.exports = {
  // Source
  GetImagesFromUrl,
  // Transforms
  FormatImageMetaData,
  GetImageDataAndId,
  RemoveDuplicates,
  ReadEXIFData,

  // Public API
  GetImagesStream,
  // Error handlers
  EXIFParseErrorHandler,
  ImageDownloadErrorHandler
}
