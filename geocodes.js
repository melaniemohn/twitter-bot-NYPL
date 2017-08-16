// just do this to generate fallback geocodes??

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
	return googleMapsClient.geocode({address: searchString}).asPromise()
  .then((response) => {
    // console.log('coordinates:', response.json.results[0].geometry.location);
    return response.json.results[0].geometry.location;
  })
  .catch((err) => {
    // error is consistently "Cannot read property 'geometry' of undefined"
    // for now, just use this to generate a list of places to search by hand
    // but also experiment with using query param instead of address??
    console.error('Error: ' + err);
    console.log('Search again for address: ' + searchString);
  });
}


/*~*~*~*~*~*~*~*~*~*~*~*~*~*~*~*~*~*/

// let coordinates = {};
let n = 10; // for now, just use first n results from NYPL?
let trimmed = locationData.slice(0, n);
// console.log('working with smaller array:', trimmed);

// function filterGeocodes(locations) {
// 	let validGeocodes = {};
// 	// ...
// }

// filterGeocodes(trimmed);


// let geocodesArray = return Promise.all()

// async function generateValidGeocodes(locationsArray) {
// 	// for (let location of locations) {
// 	// 	await generateGeocode(location);
// 	// }

// 	await Promise.all(locationsArray.map(async (location) => {
// 		const geocode = await generateGeocode(location);
// 		if (geocode) {
// 			/* MPM COME BACK HERE */
// 		}
// 	}))
// }

let validGeocodes = {};
let searches = 0;
let successes = 0;
locationData.forEach((location, index) => {
	generateGeocode(location)
	.then(geocode => {
		searches++;
		if (geocode) {
			validGeocodes[index] = geocode; // instead of using index, use image ID or something?
			// console.log('coordinates collection is now:', coordinates);
			successes++;
			console.log(`found coordinates for ${successes} of ${searches} locations`);
		}
	});
});


// let coordinates = {};

// let geocodesArray = trimmed.map((location, index) => {
// 	generateGeocode(location)
// 	.then(geocode => {
// 		if (geocode) {
// 			coordinates[index] = geocode;
// 		}
// 	})
// });


// two ways to do this... batch process all locations from NYPL data and save the coordinates for lookup later?
// seems fine to do NYPL lookup live each time, but trickier with maps data because addresses might not parse
// do the map lookup live, and if it doesn't come back with anything, then default to pre-provided data??
// alternatively, could also filter the NYPL results for ones where the location returns valid maps data?

// so, instead of forEach, do a filter that returns (for now) the valid data to tweet from?

// OR, do the lookup live and save info about what's failing
// before hitting maps API, check whether record is already in badAddresses set
// if not, search Places API
	// if success, proceed with tweet
	// if failure, push to badAddresses, generate another random record, and repeat
