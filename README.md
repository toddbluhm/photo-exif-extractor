[![license](https://img.shields.io/github/license/toddbluhm/photo-exif-extractor.svg)](https://github.com/toddbluhm/photo-exif-extractor/blob/master/LICENSE)
[![Standard - JavaScript Style Guide](https://img.shields.io/badge/code%20style-standard-brightgreen.svg)](http://standardjs.com/)

# Photo-Exif-Extractor

A simple utility script for downloading, extracting, and storing image file exif image attributes in a data store.

## What does this do

This utility will download a list of images from various sources (currently just waldo photos s3 bucket) and parse out the EXIF image data and store the data in various data stores (currently just mongodb is implemented).

## Why

The primary purpose of this script was as an example project for Waldo Photos pre-interview.

This project uses mongodb for a backing store and uses a special waldo photos s3 bucket for grabbing the images. With that in mind, it was built to be easily extensible by swapping/adding in different sources and data stores.

## Usage

**Pre-requisites: Node, MongoDB**

1. Download this project to folder.
2. Make sure mongodb is running (if running on non-default localhost/port just set env var `MONGO_DB_URL` to point to your mongo server + db)
  - (Optional) You can also set `MONGO_COLLECTION` env var to use a different collection name from the default `images`
3. Inside the project folder install the node dependencies `npm install`
4. Run this script using `npm start`

## Error Handling

As you observe the console logs it will print out any errors it encounters when downloading or attempting to parse the exif data. This is the default error handler behavior. Currently errors are ignored so that the stream can continue on processing, but ideally they should be handled specifically based on whatever use cases are specific to your project.

The following error handlers can be overridden for the `waldo-xml-source.js`

- `ImageDownloadErrorHandler` - Any errors or non-buffers returned from the image download http request. Whatever this function returns will be passed down the data pipeline (default is `null`)
- `EXIFParseErrorHandler` - Any errors the exif parser spits out. Whatever this function returns will be passed down the data pipeline (default is `null`)

## Adding New Sources/Data Stores

This project was specifically architected to be easily extensible by adding new sources and/or data stores.

**Adding New Source**

In order to add a new source, all you need to do is create a function that returns a highlandjs stream and that stream should contain objects that match this template:
```js
{
 etag: '1234567890abcdef', // UUID that is hashed from the image binary data to prevent duplicates
 name: 'somename.jpg',
 url: 'https://someurl.com/somename.jpg',
 image: Object // contains attributes about the image,
 thumbnail: Object // contains attributes about the images thumbnail
 exif: Object // exif specific information
 gps: Object // contains the gps information about where the picture was taken at
 interoperability: Object // interoperability information
 makernotes: Object //contains custom/special attributes unique to different cameras
}
```
*Note: There is a public hashing function `GenerateEtag` in `utils.js` that can be used to hash the image buffer data so that all images use the same consistent hashing algorithm.*

After you have that setup it's, just a matter of requiring in your source into `index.s` and adding to to the `reader` list where the code comment says to add new sources.

**Adding new data store**

Adding a new data source is just as easy. A new data source is simply a function that accepts the above image template and returns a promise that is fulfilled when storing has been successful. It is recommended that when storing you use the `etag` field to determine photo uniqueness to prevent duplicates from getting into the db.

Once you have a store function built, just require it into `index.js` and put it where the code comment says to place new data stores.
