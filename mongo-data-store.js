const BPromise = require('bluebird')
const MongoClient = require('mongodb').MongoClient
const MONGO_DEFAULT_URL = 'mongodb://localhost:27017/waldo-test'
const MONGO_DEFAULT_COLLECTION = 'images'

function Connect (url) {
  // Connect using MongoClient
  return MongoClient.connect(url, {
    promiseLibrary: BPromise
  })
}

function GetCollection (db, collectionName) {
  return new BPromise((resolve, reject) => {
    db.collection(collectionName, function (error, val) {
      if (error) {
        return reject(error)
      }
      resolve(val)
    })
  })
}

function GetStoreWriter () {
  const dbName = process.env.MONGO_DB_URL || MONGO_DEFAULT_URL
  const collectionName = process.env.MONGO_COLLECTION || MONGO_DEFAULT_COLLECTION
  console.log(`Using MongoDB as a data source.
DBName=${dbName}
Collection=${collectionName}`
  )

  return Connect(dbName)
    .then((db) => GetCollection(db, collectionName))
    .then((collection) => {
      return function (image) {
        return collection.update({
          etag: image.etag
        }, image, {
          upsert: true
        })
      }
    })
}

module.exports = {
  Connect,
  GetCollection,
  GetStoreWriter
}
