const Twit = require('twit');
const fetch = require('node-fetch');
const config = require('./config.js');

const Twitter = new Twit(config.twitter);
const NYPLkey = config.nypl.key;
const placesKey = config.places.key;

// this will call the tweeter function [replace / write] every 24 hours
// (i.e. 1000 milliseconds * 60 seconds * 60 mins * 24 hrs)
// setInterval(tweeter, 1000*60*60*24);

/*~*~*~*~*~*~*~*~*~*~*~*~*~*~*~*~*~*/

const googleMapsClient = require('@google/maps').createClient({
  key: placesKey,
  Promise: Promise
});

const badAddressData = {};

// change this function to accept entire record, not just search string
// and instead of generating the geocode, we're adding it to the record object?
// BUT, will this mess up the error handling???
function generateGeocode(record) {
  let searchString = record.title;
  return googleMapsClient.geocode({address: searchString}).asPromise()
  .then((response) => {
    // console.log('list of results:', response.json.results)
    // console.log('coordinates:', response.json.results[0].geometry.location);
    // return response.json.results[0].geometry.location;
    record.geocode = response.json.results[0].geometry.location;
    return record;
  })
  .catch((err) => {
    // error is consistently "Cannot read property 'geometry' of undefined"
    // for now, just use this to generate a list of places to search by hand
    console.error('Error: ' + err);
    badAddressData[record.uuid] = record.title;
    // and also search for a new record, etc., with another call to generateTweetData
    console.log('trying again I guess??????');
    generateTweetData();
  });
}

/*~*~*~*~*~*~*~*~*~*~*~*~*~*~*~*~*~*/

function getInitialData() {
  // eventually change URL parameters to get all items in single request
  // also, IMPORTANT: return fetch instead of just calling it
  return fetch('http://api.repo.nypl.org/api/v1/items/search?q=b13668355&per_page=362', {
    headers: {
      Authorization: NYPLkey
    }})
  .then(function(response) {
    console.log('got response from initial API call');
    if (response.status !== 200) {
      console.log('Error with status code: ', response.status);
      return;
    }
    return response.json();
    // note: the response from a fetch() request is a Stream object
    // calling .json() on our response object will return a Promise
    })
  .then(function(data) {
    let records = data.nyplAPI.response.result;
    // result will be an array of records
    // console.log(records);
    return records;
  })
  .catch(function(err) {
    console.error('Error getting data: ', err);
  });
}

// consider filtering the records array for locations that are easily searchable?

// MPM give this function a more descriptive name? getRecordFromNYPL or parseRecordData?
// separate this into two functions: one to pick a random index, and one to get image
// after picking random index, first check coordinates, THEN generate image URL

function getRandomRecord() {
  return getInitialData()
  .then(records => {
    // this selects a random record, based on the total number of records (records.length)
    let index = Math.floor(Math.random() * records.length);
    return records[index];
  });
}

// this is where we start needing google maps
function checkLocation(record) {
  let ID = record.uuid;
  let address = record.title;
  // first, look up by ID in badAddressData set
  if (badAddressData[ID]) {
    console.log('try again...');
    generateTweetData();
  } else {
    return generateGeocode(record)
    // .then(updatedRecord => {
    //   // uhhh will we ever get in here
    //   if (!updatedRecord.geocode) {
    //     // add to bad address set...
    //     badAddressData[ID] = address;
    //     // and then search for another record?
    //     generateTweetData();
    //   } else {
    //     console.log('still truckin');
    //     return updatedRecord;
    //   }
    // });
  }
}

function processRecord(record) {
  let recordURL = record.itemLink;
  let imageURL = `https://images.nypl.org/index.php?id=${record.imageID}&t=w`;
  let text = record.title;
  let location = record.geocode;
  // let streetview = ??
  let tweetData = {recordURL, imageURL, text, location};
  console.log('omfg made it:', tweetData);
  // return tweetData;
}


function generateTweetData() {
  getRandomRecord()
  .then(record => checkLocation(record))
  .then(record => processRecord(record));
}

generateTweetData();

// refactored this function into the three listed above
// but then started to bite it basically
function getImageFromAPI() {
  getInitialData()
  .then(records => {
    // this selects a random record, based on the total number of records (records.length)
    let index = Math.floor(Math.random() * records.length);
    let record = records[index];
    // console.log('record data:', record);
    let recordURL = record.itemLink;
    // imageURL templating is necessary because that field is only a property on *some* records,
    // but *all* records have an imageID, and the image URL consistently follows this pattern
    let imageURL = `https://images.nypl.org/index.php?id=${record.imageID}&t=w`;
    let text = record.title;
    let tweetData = {recordURL, imageURL, text};
    console.log('info for Tweet:', tweetData);
    return tweetData;
  });
}

// getImageFromAPI();

/*~*~*~*~*~*~*~*~*~*~*~*~*~*~*~*~*~*/

// upload the image to the media/upload endpoint, THEN post it to statuses/update
// this requires getting the base64-encoded file content from the web image

function toBase64(url) {
  return fetch(url)
  .then(function(response) {
    console.log('got response from fetching image URL');
    return response.buffer();
  })
  .then(function(buffer) {
    // console.log('buffer?', buffer);
    // the hardest buffer to buffer
    return Buffer.from(buffer).toString('base64');
  })
  .catch(err => console.error(err));
}



function uploadAndPostMedia(media, text) { // pass a second parameter here for altText??
  // actually combine these two parameters into one record?
  Twitter.post('media/upload', { media_data: media }, function (err, data, response) {
    if (err) console.error('Error processing upload: ', err);
    let mediaID = data.media_id_string;
    let altText = text; // MPM: pull alt text from image description
    let metadata = { media_id: mediaID, alt_text: { text: altText } };

    Twitter.post('media/metadata/create', metadata, function (err, data, response) {
      if (!err) {
        // now post a tweet with reference to the media (media will attach to the tweet)
        // might want to refactor this to make it easier to pass in status?
        var params = { status: text, media_ids: [mediaID] };

        Twitter.post('statuses/update', params, function (err, data, response) {
          if (err) console.error('Error posting status/update: ', err);
          console.log('I just tweeted: ', data.text);
        });
      }
    });
  });
}


// rename this one, too: something like, postNYPLImageToTwitter? or just postImage?
function postImageFromURL(imageURL, text) {
  // also need to pass in test description here?
  // MPM instead, return toBase64(url)
  toBase64(imageURL)
  .then(data => uploadAndPostMedia(data, text))
  .catch(err => console.error(err));
}


/*~*~*~*~*~*~*~*~*~*~*~*~*~*~*~*~*~*/

// send first tweet! for now, alternating between 'Testing, testing...' and 'Oh, hey world!'
// Twitter.post('statuses/update', { status: 'Oh, hey world!' }, function(err, data, response) {
//   console.log('Posting our first Tweet...!');
//   if (err) console.error(err);
//   console.log('I just tweeted: ', data.text);
// });

// then, once a day (using setInterval?), call getImageFromAPI and then postImageFromURL
// call postImage function with tweetData.imageURL, tweetData.recordURL, tweetData.text ???

let test = {
  imageURL: 'https://images.nypl.org/index.php?id=1219221&t=w',
  text: 'Testing one more time.'
};

// combine getImage and postImage into a single function, and pass that as callback to setInterval?
// getImageFromAPI();
// postImageFromURL(test.imageURL, test.text);


/*~*~*~*~*~*~*~*~*~*~*~*~*~*~*~*~*~*/


// some utility functions for the future:
  // function parseLocation() { /* . . . */ }
  // function generateStreetview() { /* . . . */ }

// Places API routes we might hit to get coordinates
// can this return multiple results? / array of suggested locations?
let map = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=123+main+street&key=${placesKey}`;
let withLocation = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=123+main+street&location=42.3675294,-71.186966&radius=10000&key=${placesKey}`;

// then, use coordinates to hit Streetview API? or even just interpolate them into URL?
// for now, try this with each record, but only Tweet if we get back a valid response

