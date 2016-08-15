//general app setup
var express = require('express'),
  app = express(),
  server = require('http').createServer(app),
  io = require('socket.io')(server), 
  osc = require('node-osc'),
  open = require ('open'),
  os = require( 'os' ); //can get IP fwiw


// Create FreshMesh instance, connect
var mesh = new FreshMesh('localhost',{
	ID: 8080; //like ssid or something to identify the mesh network
});

mesh.connect(); 

// Add a connect listener
mesh.on('connect',function() {
	console.log('Client has connected to the mesh!');
});

mesh.on('authorize',function() {
	console.log('Client has authorized connection to the mesh!');
});

//should probably make functions that are mesh.auth and mesh.on, allowing for different levels of access


////////////////----EXIT OR DISCONNECT MESH----/////////////////
// Add a disconnect listener
mesh.on('change',delta_tolerance,function() {
	console.log('The client has disconnected from mesh!');
	//on disconnect, it might be good to create some sort of buffer, in case reconnect happens soon.
});
mesh.on('newguy',peerID,capabilities,function(){
  getpeerGPIO();
})

////////////////----RECEIVING----/////////////////
// Add a message listener
mesh.on('message',function(data, sender) {
	console.log('Received a message from a mesh participant '+sender+' : '+data);
	msg_rx_itc(data, sender); //display on LCD via i2c
	msg_rx_ser(data, sender); //display on LCD via regular serial
});
// Add a gpio listener
mesh.on('gpio',function(data, sender) {
	console.log('Received gpio data from a mesh participant '+sender+' : '+data);
});
// Add an i2c listener
mesh.on('i2c',function(data, sender) {
	console.log('Received i2c data from a mesh participant '+sender+' : '+data);
	display.writeBytes(command, [data[0], data[1]], function(err) {});
});
// Add an rgb LED listener
mesh.on('rgbled',function(rgb, sender) {
	console.log('Received rgb LED data from a mesh participant '+sender+' : '+rgb);
	rgb_led(rgb[0],rgb[1],rgb[2]);
});
// Add a soundplay listener
mesh.on('sound',function(file_or_url, sender) {
	console.log('Received sound playback data from a mesh participant '+sender+' : '+file_or_url);
	playsound(file_or_url);
});
// Add a stream listener. Purely hypothetical
mesh.on('stream',function(data, sender) {
	console.log('Receiving a stream of data from a mesh participant '+sender+' : '+data);
});

////////////////----SENDING MESSAGES----/////////////////
//send messages to all in mesh
mesh.on.broadcast('message',text,function(){
  //callback that lets you know that all members have received text or error
});
//single function to let you send a message to an array of one or more peers
mesh.on.peer('message',text,peerIDs, function(){
  //callback that lets you know that peer(s) received text or error
});
//play sound on a peer
mesh.on.peer('sound',url,peerIDs, function(){
  //callback that lets you know that peer(s) received text or error
});
//send i2c data to a peer
mesh.on.peer('i2c',data,peerIDs, function(){
  //callback that lets you know that peer(s) received text or error
});
// Add an rgb LED listener
mesh.on.peer('rgb',rgb,peerIDs, function(){
	//callback that lets you know that peer(s) received text or error
});


////////////////----I2C display----/////////////////
//https://www.npmjs.com/package/i2c
var i2c = require('i2c');
var address = 0x18;
var display = new i2c(address, {device: '/dev/i2c-1'}); // point to your i2c address, debug provides REPL interface 
//examples:
//display.write([byte0, byte1], function(err) {});
//display.writeBytes(command, [byte0, byte1], function(err) {});
//display.writeByte(byte, function(err) {});

//rec'v messages and display them. do I need to lock while sending to guard against a flood? Maybe, so lets make a gate:
var rx_gate = 1;

function msg_rx_itc(msg, sender){
  if(rx_gate){
    rx_gate = 0;
    var codes = []; 
    var CMD = 0x10; //made this up
    //convert text into code for I2C, probably something like this:
    for (var i = 0, len = msg.length; i < len; i++) {
      codes[i] = msg[i].charCodeAt(0);
    }
    for (var i = 0, len = codes.length; i < len; i++) {
      display.write([CMD, codes[i]], function(err) {});
    }
    rx_gate = 1;
  } else {
    //send an error to sender? 
    mesh.peer('message','not receieved',sender, function(){
      //callback that lets you know that peer(s) received text or error
    })
  }
}

////////////////----SERIAL display----/////////////////
//https://www.npmjs.com/package/lcd & http://thejackalofjavascript.com/rpi-16x2-lcd-print-stuff/
var Lcd = require('lcd'),
  lcd = new Lcd({rs: 27, e: 65, data: [23, 26, 46, 47], cols: 8, rows: 1}); //numbers will change depending on device and desired display
//digital clock example:
lcd.on('ready', function() {
  setInterval(function() {
    lcd.setCursor(0, 0);
    lcd.print(new Date().toString().substring(16, 24));
  }, 1000);
});

////////////////----GPIO----/////////////////
//https://www.npmjs.com/package/chip-gpio CHIP specific GPIO library
var GPIO = require('./index').Gpio, 
  b_pins = [7,8,9,10],
  l_pins = [11,12,13],
  dbounce = 500,
  btns = [ 
    new GPIO(b_pins[0], 'in', 'both', {debounceTimeout: dbounce}), 
    new GPIO(b_pins[1], 'in', 'both', {debounceTimeout: dbounce}), 
    new GPIO(b_pins[2], 'in', 'both', {debounceTimeout: dbounce}), 
    new GPIO(b_pins[3], 'in', 'both', {debounceTimeout: dbounce})
    ];
  leds = [
    new GPIO(l_pins[0], 'out'), 
    new GPIO(l_pins[1], 'out'), 
    new GPIO(l_pins[2], 'out')
    ];

//listen to buttons:
btns[0].watch(function (err, value) {
	if (err) {
		throw err;
	}
});
// do something. toggle LED: leds.read() == 1 ? 0 : 1
function rgb_led(r,g,b){
  leds[0].write(r);
  leds[1].write(g);
  leds[2].write(b);
}

//////////////-----AUDIO--------///////////

//--PLAY
//sound: https://github.com/guo-yu/player
//https://www.npmjs.com/package/player
var Player = require('player');
var songs = ['snd/perc_highndirty_putney.mp3','snd/bass_laze_voyager.mp3','snd/perc_springverb_putney.mp3']
function playsound (){
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
}

//--RECORD using js stream and pass onto voice rec api 
//https://github.com/gillesdemey/node-record-lpcm16

var rec       = require('node-record-lpcm16'),
    request   = require('request');

var witToken = 3M4SWT7XYUJEDD6SHJLI4NBM4XPM5FPO; // get one from wit.ai!

function record(v){
  if(v>0){
    exports.parseResult = function (err, resp, body) {
      console.log(body);
    };

    //could try 
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

//////////////-----UTILITY----/////////////


//you could do some things like this
function getmeshinfo(){
  var count = mesh.count(); //returns int
  var peers = mesh.peers(); //returns array of other members
  var myID = mesh.id(); //id of client
  var myName = mesh.friendlyname(); //theoretical 'friendly' name of this client, not as ugly as ID
  var isAccessPoint = mesh.isAP(); //boolean to determine if client is acting as WAP
  var isInternet = mesh.isLAN(); //has access to Internet or is connected to a LAN somehow
  var signal = mesh.strength(); //0-1 value determining connection strength to WAP
  var permissions = mesh.access();
  var joined = mesh.groupjoined();
  console.log(count+" , "+peers+" , "+myID+" , "+myName+" , "+isAccessPoint+" , "+isInternet+" , "+signal);
}


//>>>in case of CTL-C:
function exit() {
	gpio.unexport();
	led.unexport();
  lcd.clear();
  lcd.close();
	process.exit();
}
process.on('SIGINT', exit);
//<<<

//JSON to describe what the app (and/or device) is willing to provide or can do
var capabilities{
  "buttons": 4,
  "lcd": [16,2],
  "speaker": "small",
}
