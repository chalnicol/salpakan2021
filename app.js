
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

		this.pieces = [];
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
		
		this.gridData = [];

		this.players = [];

		this.isGameOn = false;

		this.readyCount = 0;

		this.commencedCount = 0;

		this.toRematch = 0;

		this.turnTime = 10000; //ms

		this.prepTime = 10000; //ms

		this.prevTurn = 0;

		this.timerCounter = 0;

		this.postOrigin = -1;
		
		this.postDest = -1;

		//
		

	}

	initGame () {

		this.gridData = [];

		for ( let i = 0; i < 72; i++ ) {

			this.gridData.push ({ resident : 0, pieceRank : -1 });

		}

		this.startPrep ();

	}

	startGame () {

		this.isGameOn = true;

	}

	startPrep () {

		if ( this.gameType == 1 ) this.starTimer ( this.prepTime );

	}

	startTurn () {
		
		this.timerCounter = 0;

		if ( this.gameType == 1 ) this.starTimer ( this.turnTime, 1 );

	}

	starTimer ( time, phase = 0 ) {

		this.timeIsTicking = true;

		this.timer = setInterval ( 1000, () => {

			//if ( this.isGamePaused ) return;
			
			this.timerCounter += 1;

			console.log ( this.timerCounter );

			if ( this.timerCounter >= time ) {

				if ( phase == 0 ) {
					this.startCommencement();
				}else {
					this.switchTurn ();
				}

				this.stopTimer();
			}

		});


	}

	stopTimer () {

		this.timeIsTicking = false;

		clearInterval ( this.timer );

	}

	endGame () {

		this.isGameOn = false;

	}

	switchTurn () {
		this.turn = this.turn == 1 ? 0 : 1;
	}

	switchPieces () {

		this.prevTurn = this.prevTurn == 0 ? 1 : 0;

		this.turn = this.prevTurn;

	}


	restartGame () {

		this.toRematch = 0;

		this.commencedCount = 0;

		this.readyCount = 0;

		this.switchPieces ();

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

			const playerPiece = Math.floor (Math.random() * 2);

			//..
			let roomId = plyr.username + '_' + Date.now();

			let newRoom = new GameRoom ( roomId, data.gameType );
				
			newRoom.players.push ( socket.id );

			newRoom.isClosed = true;

			newRoom.turn = playerPiece;

			roomList [ roomId ] = newRoom;

			plyr.roomId = roomId;

			
			const gameRoomData  = {

				'game' : 0,
				'gameType' : data.gameType,
				'turn' : playerPiece == 0 ? 'self' : 'oppo',
				'players' : {
					'self' : { 'username' : plyr.username, 'chip' : playerPiece }
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

	
	socket.on("playerReady", ( data ) => {

		const plyr = playerList [ socket.id ];

		plyr.pieces = data.pieces;

		//..
		const room = roomList [ plyr.roomId ];

		for ( var i in data.pieces ) {

			const truePost = plyr.roomIndex == 0 ? data.pieces [i].post : 71 - data.pieces [i].post;

			room.gridData [ truePost ] = { resident : plyr.roomIndex, pieceRank : data.pieces [i].rank };

		}

		room.readyCount += 1;

		for ( var i in room.players ) {

			if ( room.readyCount < 2 ) {	

				socketList [ room.players [i] ].emit ('playerIsReady', { player : room.players [i] == socket.id ? 'self' : 'oppo' });

			}else {
				
				room.startGame();

				const oppo =  playerList [ room.players [ i == 0 ? 1 : 0 ]];

				let oppoPiecesArr = [];

				for ( var j in oppo.pieces ) {

					oppoPiecesArr.push ( { 'post' : 71 - oppo.pieces [j].post, 'rank' : oppo.pieces [j].rank  })
				}

				socketList [ room.players [i] ].emit ('commenceGame', { 'oppoPiece' : oppoPiecesArr });
	
			}

		}
		
	});

	socket.on("playerClick", data => {

		if ( verifyMove (socket.id) ) {

			const plyr = playerList [ socket.id ];

			const room = roomList [ plyr.roomId ];

			if ( data.post != -1 ) {
				room.postOrigin = (plyr.roomIndex == 0 ) ? data.post : 71 - data.post;
			}else {
				room.postOrigin = -1;
			}

			const oppoId = room.players [ plyr.roomIndex == 0 ? 1 : 0 ];

			socketList [ oppoId ].emit ('oppoPieceClicked', { 'piecePost' : 71 - data.post });

		}

	});

	socket.on("playerMove", data => {

		if ( verifyMove (socket.id) ) {

			var plyr = playerList[socket.id];

			var room = roomList [ plyr.roomId ];

			room.postDest = ( plyr.roomIndex == 0 ) ? data.gridPost : 71 - data.gridPost;

			const oppoId = room.players [ plyr.roomIndex == 0 ? 1 : 0 ];

			socketList [ oppoId ].emit ('oppoPlayerMove', { 'post' : 71 - data.gridPost });

		
			if ( !checkWinner() ) {

				room.switchTurn ();

			}else {

				room.endGame();
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

function checkWinner () 
{
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

	room.initGame ();

}

