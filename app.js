
var express = require('express');
var app = express();
var serv = require('http').Server(app);
var io = require('socket.io')(serv,{});

app.get('/',function(req, res) {
	res.sendFile(__dirname + '/client/index.html');
});
app.use('/client', express.static(__dirname + '/client'));

//serv.listen(2000);
serv.listen(process.env.PORT || 2000);

console.log("Server started.");

var socketList = {};
var playerList = {};
var roomList = {};
var inviteList = {};


class Player {

	constructor (id, username) {
		
		this.id = id;

		this.username = username;

		this.pairingId = Math.floor ( Math.random() * 99999 );

		this.roomId = '';

		this.roomIndex = 0;

		this.chip = 0;

		this.inviteId = '';

	}

	reset () 
	{
		this.roomId = '';

		this.roomIndex = 0;

		this.chip = 0;

		this.inviteId = '';

	}

}

class GameRoom {

	constructor ( id, type ) {
		
		this.id = id;

		this.gameType = type; // 0 = no Timer ; 1 = with timer,

		this.turn = 0;

		this.isClosed = false;
		
		this.gridArr = [];

		this.players = [];

		this.isGameOn = false;

		this.toRematch = 0;

	}

	initGame () {

		this.isGameOn = true;

		this.gridArr = [];

		for ( let i = 0; i < 42; i++ ) {
			this.gridArr.push (0);
		}

	}

	endGame () {

		this.isGameOn = false;

	}

	switchTurn () {
		this.turn = this.turn == 1 ? 0 : 1;
	}

	restartGame () {

		this.toRematch = 0;

		this.switchTurn ();

		this.initGame ();

	}



}

class Invite {

	constructor ( id, hostId, friendId, gameType=0 ) {

		this.id = id;

		this.hostId = hostId;

		this.friendId = friendId;

		this.gameType = gameType;

		this.pairTimer = null;

		this.startPairTimer ();

	}

	forceStop () {

		if ( playerList.hasOwnProperty ( this.hostId ) ) {

			playerList [ this.hostId ].inviteId = '';

			socketList [ this.hostId ].emit ('pairingError', {'errorMsg': 'Something went wrong.'})
		}

		if ( playerList.hasOwnProperty ( this.friendId ) ) {

			playerList [ this.friendId ].inviteId = '';

			socketList [ this.friendId ].emit ('pairingError', {'errorMsg': 'Something went wrong.'})

		}

		this.stopPairTimer ();

		this.remove ();

	}

	startPairTimer () {

		this.pairTimer = setTimeout(() => {

			if ( playerList.hasOwnProperty ( this.hostId ) ) {

				playerList [ this.hostId ].inviteId = '';

				socketList [ this.hostId ].emit ('pairingError', {'errorMsg': 'Friend is taking too long to respond.'})
			}

			if ( playerList.hasOwnProperty ( this.friendId ) ) {

				playerList [ this.friendId ].inviteId = '';

				socketList [ this.friendId ].emit ('pairingError', {'errorMsg': 'Invite Cancelled.'})

			}

			this.remove ();
			
		}, 10000);

	}

	stopPairTimer () {

		clearTimeout ( this.pairTimer );

		//console.log ( '-> Invite list timer cleared..', this.id );

	}

	remove ( ) {

		delete inviteList [ this.id ];

		//console.log ( '-> invite list deleted..', this.id );

	}

}


io.on('connection', function(socket){
	
	socketList[socket.id] = socket;
	
	socket.on("initUser",  (data) => {
		
		//console.log ( '-> new player connected: ', data.username );
		
		let newPlyr = new Player ( socket.id, data.username );

		playerList [ socket.id ] = newPlyr;	

		socket.broadcast.emit ('playersOnline', { 'playersCount' :  Object.keys(socketList).length  });

	});

	socket.on ('getInitData', () => {
		
		const plyr = playerList [ socket.id ];

		socket.emit ('initDataSent', { 'username': plyr.username, 'pairingId': plyr.pairingId, 'playersCount' : Object.keys(socketList).length });
		
	});

	socket.on("enterGame", (data) => {
	
		let plyr = playerList [ socket.id ];

		if ( data.game == 0 ) {

			//single player..

			let roomId = plyr.username + '_' + Date.now();

			let newRoom = new GameRoom ( roomId, data.gameType );
				
			newRoom.players.push ( socket.id );

			newRoom.isClosed = true;

			roomList [ roomId ] = newRoom;

			plyr.roomId = roomId;

			const gameRoomData  = {

				'game' : 0,
				'gameType' : 0,
				'players' : {
					'self' : { 'username' : plyr.username, 'chip' : 0 }
				}

			};	

			//console.log ( '-> '+ plyr.username +' created a room :', roomId );

			socket.emit ('initGame', gameRoomData ); 

		}else {

			//vs game
			const availableRoom = getAvailableRoom( data.gameType ) ;

			if ( availableRoom == '' ) {

				let roomId = plyr.username + '_' + Date.now();
				
				let newRoom = new GameRoom ( roomId, data.gameType );
				
				newRoom.players.push ( socket.id );

				roomList [ roomId ] = newRoom;

				plyr.roomId = roomId;

				//console.log ( '-> '+ plyr.username +' created a room :', roomId );

			}else  {
				
				plyr.roomId = availableRoom;

				plyr.roomIndex = 1;

				plyr.chip = 1;

				let gameRoom = roomList [ availableRoom ];

				gameRoom.players.push ( socket.id );

				gameRoom.isClosed = true;

				//console.log ( '-> '+ plyr.username +' joined the room :', gameRoom.id );
				
				//initialize game..
				initGame ( gameRoom.id );
		
			}

		}
		
	});

	socket.on('cancelPairing', () => {

		let plyr = playerList [ socket.id ];

		leaveRoom ( plyr.id );

	});

	socket.on("pair", (data) => {

		let host = playerList [socket.id];

		let friendId = getPaired ( data.pairingId, socket.id );

		if ( friendId != '' ) {

			let friend = playerList [ friendId ];
			
			if ( friend.roomId == '' && friend.inviteId == '' ) {

				let inviteId = 'party_' + Date.now() + '_' + Math.floor ( Math.random() * 99999 );

				let newInvite = new Invite ( inviteId, host.id, friend.id )

				inviteList [ inviteId ] = newInvite;

				//
				host.inviteId = inviteId;

				//
				friend.inviteId = inviteId;

				//
				socketList [ friendId ].emit ('pairInvite', { 'inviteId' : inviteId, 'gameType' : data.gameType, 'username' : host.username });

			}else {

				socket.emit ('pairingError', { 'errorMsg' : 'Friend is not available right now.' } );

			}

		} else {

			socket.emit ('pairingError', { 'errorMsg' : 'Pairing ID submitted does not exist.' } );

		}

	});

	socket.on("pairingResponse", ( data ) => {

		var player = playerList [socket.id];

		if ( inviteList.hasOwnProperty ( data.inviteId ) ) {

			let invite = inviteList [ data.inviteId ];

			invite.stopPairTimer();

			//host..
			let host = playerList [ invite.hostId ];

			host.inviteId = '';
			
			//friend..
			let friend = playerList [ invite.friendId ];

			friend.inviteId = '';

			//..
			if ( data.response == 0 ) {

				socketList [ invite.hostId ].emit ('pairingError', { 'errorMsg' : 'Friend is not available right now.'  } );

				delete inviteList [ data.inviteId ];

			}else {

				let roomId =  playerList[ invite.hostId ].username + '_' + Date.now();

				var newRoom = new GameRoom ( roomId, invite.gameType );

				newRoom.players = [ invite.hostId, invite.friendId ];

				newRoom.isClosed = true;

				roomList [ roomId ] = newRoom;

				//..
				host.roomId = roomId;

				//..
				friend.roomId = roomId;

				friend.chip = 1;

				friend.roomIndex = 1;

				//delete invite..
				delete inviteList [ data.inviteId ];

				//initiliaze game..
				initGame ( roomId );

			}
			
			
		}else {

			
			player.inviteId = '';

			socket.emit ('pairingError',  { 'errorMsg' : 'Something Happened. Please try again.'  });

		}
	

	});

	socket.on("playerMove", ( data ) => {

		if ( verifyMove (socket.id) ) {

			var plyr = playerList[socket.id];

			var room = roomList [ plyr.roomId ];

			const depth = getDepth ( room.id, data.col );

			if ( depth != null ) {

				for ( var i in room.players ) {

					const turn = room.turn == i ? 'self' : 'oppo';

					socketList [ room.players [i] ].emit ( 'playerMove', { 'col' : data.col, turn : turn  });
				}

				room.gridArr [depth] = plyr.roomIndex + 1;
				
				var isWinner = checkLines ( room.id, depth, plyr.roomIndex + 1 );

				if ( !isWinner ) {

					room.switchTurn ();

				}else {
					
					room.endGame ();
				}
				
			}

		}

	});
	
	socket.on("playAgain", () => {
		
		var plyr = playerList [ socket.id ]
		
		var room = roomList [ plyr.roomId ];

		room.toRematch += 1;

		if ( room.toRematch > 1 ) {

			room.restartGame ();

			for ( var i in room.players ) {

				socketList [ room.players [i] ].emit ('restartGame');
			}

			//console.log ( '-> Game '+ room.id +' has been restarted.');
		}

	});
	
	socket.on("sendEmoji", ( data ) => {

		var player = playerList [ socket.id ];

		var room = roomList [ player.roomId ];

		for ( var i in room.players ) {

			var plyr =  ( room.players [i] == player.id ) ? 'self' : 'oppo';
			
			socketList [ room.players [i] ].emit ( 'showEmoji',  { 'plyr' : plyr, 'emoji' : data.emoji });

		}

	});

	socket.on("leaveGame", (data) => {
		
		if ( playerList.hasOwnProperty(socket.id) ) {

			let plyr = playerList[socket.id];
			
			//console.log ('<- ' + plyr.username + ' has left the game : ' + plyr.roomId );

			if ( plyr.roomId != '' ) leaveRoom (socket.id);

		}

	});
	
	socket.on("disconnect", () => {
			
		if ( playerList.hasOwnProperty(socket.id) ) {

			let plyr = playerList[socket.id];

			//console.log ('<- ' + plyr.username + ' has been disconnected');

			if ( plyr.roomId != '' ) leaveRoom ( plyr.id );

			if ( plyr.inviteId != '') inviteList [ plyr.inviteId ].forceStop();

			delete playerList [socket.id];

		}

		delete socketList [socket.id];

		const playersCount = Object.keys(socketList).length;

		socket.broadcast.emit ('playersOnline', { 'playersCount' : playersCount });

	});

});


function verifyMove ( socketId ) 
{

	let plyr = playerList [ socketId ];

	let room = roomList [ plyr.roomId ];

	if ( plyr.roomIndex == room.turn && room.isGameOn ) return true;

	return false;

}

function getDepth ( roomId, col ) 
{

	var gridArr = roomList [ roomId ].gridArr;

	for ( var i = 0; i < 6; i++ ) {

		let cc = (( 5-i ) * 7) + col;

		if ( gridArr [ cc ] == 0 ) return cc;

	}

	return null;

}

function checkLines ( roomId, depth, clrId ) 
{

	var room = roomList [roomId];

	const r = Math.floor ( depth/7 ), c = depth % 7;

	//horizontal..
	for ( var i = 0; i < 4; i++ ) {

		let sPoint = (r * 7) + i;

		let countera = 0;

		for ( var j = 0; j < 4; j++ ) {

			if ( room.gridArr [ sPoint + j ] == clrId ) countera += 1;

		}

		if ( countera > 3 ) return true;

	}

	//vertical..
	for ( var i = 0; i < 3; i++ ) {

		let sPoint = (i * 7) + c;

		let counterb = 0;

		for ( var j = 0; j < 4; j++ ) {

			if ( room.gridArr [ sPoint + (j*7) ] == clrId ) counterb += 1;

		}

		if ( counterb > 3 ) return true;

	}

	//forward slash..
	let tr = r, tc = c;

	while ( tr < 5 && tc > 0 ) {
		tr += 1;
		tc -= 1;
	}

	do {

		if ( (tr - 3) >= 0 && ( tc + 3) <= 6 ) {

			let counterc = 0;
		
			for ( let i = 0; i < 4; i++ ) {

				let ttr = tr - i, ttc = tc + i;

				let pointa = (ttr * 7) + ttc;

				if ( room.gridArr [ pointa ] == clrId ) counterc += 1;
			}

			if ( counterc > 3 ) return true;

			tr -= 1;
			tc += 1;

		}       

	} while ( (tr - 3) >= 0 && ( tc + 3) <= 6 );


	//backward slash..
	let tbr = r, tbc = c;

	while ( tbr > 0 && tbc > 0 ) {
		tbr -= 1;
		tbc -= 1;
	}
	
	do {

		if ( (tbr + 3) <=5 && ( tbc + 3) <= 6 ) {

			let counterd = 0;
		
			for ( let i = 0; i < 4; i++ ) {

				let ttr = tbr + i, ttc = tbc + i;

				let pointa = (ttr * 7) + ttc;

				if ( room.gridArr [ pointa ] == clrId ) counterd+= 1;
			}

			if ( counterd > 3 ) return true;

			tbr += 1;
			tbc += 1;

		}       

	} while ( (tbr + 3) <=5 && ( tbc + 3) <= 6 );

	return false;

}

function getPaired ( pairingId, playerId ) 
{

	for ( var i in playerList ) {

		let player = playerList [i];

		if ( player.pairingId == pairingId && player.id != playerId ) return i;

	}

	return '';

}

function leaveRoom ( playerId ) 
{

	let player = playerList [ playerId ];

	let gameRoom = roomList [ player.roomId ];

	if ( gameRoom.players.length > 1 ) {

		if ( gameRoom.isGameOn ) gameRoom.endGame ();

		gameRoom.players.splice ( player.roomIndex, 1 );

		const oppSocket = socketList [ gameRoom.players[0] ];

		oppSocket.emit ('opponentLeft', {} );

	} else {

		delete roomList [ player.roomId ];

		//console.log ( '-> room deleted :', player.roomId );

	}

	player.reset ();

}

function getAvailableRoom ( gameType ) 
{

	for ( let i in roomList ) {
		
		let room = roomList [i];

		if ( room.gameType == gameType && !room.isClosed ) return i;
	}

	return '';
}

function initGame ( roomid ) 
{

	var room = roomList [ roomid ];

	for ( var i = 0; i < 2; i++ ) {

		var self = playerList [ room.players [i] ];

		var oppo = playerList [ room.players [i == 0 ? 1 : 0] ];

		var data = {

			'game' : 1,
			'gameType' : 0,
			'turn' : i == room.turn ? 'self' : 'oppo',
			'players' : {
				'self' : {
					'username' : self.username,
					'chip' : self.chip,
				},
				'oppo' : {
					'username' : oppo.username,
					'chip' : oppo.chip
				}
			}

		};

		var socket = socketList [ self.id ];

		socket.emit ('initGame', data );

	}

	room.initGame();

}

