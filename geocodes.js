const config = require('./config.js');
const placesKey = config.places.key;

// const locationData = require('./bot.js');
// sometimes this is a pending Promise :/
// could also import hard-coded data from locations.js?
const locationData = require('./locations.js').list;

// note: from the docs...
// Promises are only available if you supply a Promise constructor to the createClient() method.
// You must also chain .asPromise() to a method before any .then() or .catch() methods.

const googleMapsClient = require('@google/maps').createClient({
  key: placesKey,
  Promise: Promise
});

// googleMapsClient.geocode({
//   address: '1600 Amphitheatre Parkway, Mountain View, CA'
// }, function(err, response) {
//   if (err) console.error('Error with Google Maps Client:', err);
// 	console.log('*****RESULTS HERE', response.json.results);
// });

// or, geocode an address with a promise
// results is an array of suggested places?
// iterate over this array? or just pick first item?
// access lat-long coordinates on geometry object > location object

function generateGeocode(searchString) {
	googleMapsClient.geocode({address: searchString}).asPromise()
  .then((response) => {
    console.log('coordinates:', response.json.results[0].geometry.location);
  })
  .catch((err) => {
    // error is consistently "Cannot read property 'geometry' of undefined"
    // for now, just use this to generate a list of places to search by hand
    // but also experiment with using query param instead of address??
    console.error('Error: ' + err);
    console.log('Search again for address: ' + searchString);
  });
}

// for now, just try this on the first n results from NYPL
let n = 10;
console.log(locationData.slice(0, n));

for (let i = 0; i < n; i++) {
	generateGeocode(locationData[i]);
}

// rewrite this as forEach and capture index of record alongside coordinates
// eventually, push to some kind of data structure of geocodes
// const geocodes = [];

// watch out for circular dependencies here...
// eventually modularize both and then require into a third file (bot.js)
// module.exports = geocodes;
