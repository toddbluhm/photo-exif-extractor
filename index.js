const waldoXmlSource = require('./waldo-xml-source')
const mongoDataStore = require('./mongo-data-store')
const BPromise = require('bluebird')
const _ = require('highland')
let imagesWritten = 0

// Disable bluebird warnings as they don't play nice with highlandjs
BPromise.config({
  warnings: false
})

console.log('Starting Photo Exif Extractor')

BPromise.props({
  mongoWriter: mongoDataStore.GetStoreWriter()
})
  .then(({ mongoWriter }) => {
    const reader = _([
      waldoXmlSource.GetImagesStream('http://s3.amazonaws.com/waldo-recruiting')
      // add additional readers here
    ])
    .merge()
    // Write each image exif data to the data stores
    .flatMap(function (image) {
      // Note: This var is poorly named/placed. This should be per store and only after a successful
      // write (probably should be stores responsibility to report the number written)
      imagesWritten++
      console.log(`Images written: ${imagesWritten}`)
      return _(
        BPromise.all([
          mongoWriter(image)
          // Add additional store writers here
        ])
        .return(image)
      )
    })

    return new BPromise(function (resolve) {
      reader.done(resolve)
    })
  })
  .then(() => {
    console.log(`All images pulled from sources. Total images written: ${imagesWritten}`)
    process.exit(0)
  })
