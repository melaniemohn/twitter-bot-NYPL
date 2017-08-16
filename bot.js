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

// MPM give this function a more descriptive name?
// something like, getRecordFromNYPL or parseRecordData?
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

// using the function below to generate search strings I'll pass to google places API
let locationData = getInitialData().then(records => {
  let locations = [];
  records.forEach(record => {
    locations.push(record.title);
  });
  console.log(locations);
  // return locations;
});

// module.exports = {locationData};

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

