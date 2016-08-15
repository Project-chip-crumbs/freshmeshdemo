//general app setup
var express = require('express'),
  app = express(),
  server = require('http').createServer(app),
  io = require('socket.io')(server), 
  osc = require('node-osc'),
  open = require ('open'),
  os = require( 'os' ); //can get IP fwiw

//////////////-----AUDIO--------///////////

//--PLAY
//sound: https://github.com/guo-yu/player
//https://www.npmjs.com/package/player
var Player = require('player');

var songs = ['snd/perc_highndirty_putney.mp3','snd/bass_laze_voyager.mp3','snd/perc_springverb_putney.mp3']
var pl = new Player(songs[2])
  .on('playing', function(song) {
    console.log('I\'m playing... ');
    console.log(song);
  })
  .on('playend', function(song) {
    console.log('Play done, Switching to next one ...');
  })
  .on('error', function(err) {
    console.log('Opps...!')
    console.log(err);
  })
  
  pl.play()


//--RECORD using js stream and pass onto voice rec api 
//https://github.com/gillesdemey/node-record-lpcm16

var rec       = require('node-record-lpcm16'),
    request   = require('request');

var witToken = process.env.WIT_TOKEN; // get one from wit.ai!

function record(v){
  if(v>0){
    exports.parseResult = function (err, resp, body) {
      console.log(body);
    };

    //could try https://www.houndify.com or alexa
    rec.start().pipe(request.post({
      'url'     : 'https://api.wit.ai/speech?client=chromium&lang=en-us&output=json',
      'headers' : {
        'Accept'        : 'application/vnd.wit.20160202+json',
        'Authorization' : 'Bearer ' + witToken,
        'Content-Type'  : 'audio/wav'
      }
    }, exports.parseResult));
  } else {
    rec.stop();
  }
}