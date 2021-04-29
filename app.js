
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

		//this.pieces = [];
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

		this.piecesData = {};

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

		//..
		const room = roomList [ plyr.roomId ];

		for ( var i in data.pieces ) {

			const truePost = plyr.roomIndex == 0 ? data.pieces [i].post : 71 - data.pieces [i].post;

			const strId = 'plyr' + plyr.roomIndex + '_' + i;

			room.piecesData [strId]  = { id: strId, plyr : plyr.roomIndex, post : truePost, rank : data.pieces [i].rank };

			room.gridData [ truePost ] = { resident : plyr.roomIndex, residentPiece : strId };

		}

		room.readyCount += 1;

		for ( var i in room.players ) {

			if ( room.readyCount < 2 ) {	

				socketList [ room.players [i] ].emit ('playerIsReady', { player : room.players [i] == socket.id ? 'self' : 'oppo' });

			}else {
				
				room.startGame();

				let oppoPiecesArr = [];

				for ( var j in room.piecesData ) {

					if ( room.piecesData[j].plyr != i ) {

						const mirrorPost = i == 0 ? room.piecesData[j].post : 71 - room.piecesData[j].post;

						oppoPiecesArr.push ( { 'post' : mirrorPost, 'rank' : room.piecesData[j].rank  });

					}
					
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


function getNearbyResidents ( pos, res ) 
{
	const r = Math.floor ( pos/9 ), c = pos % 9;

	let counter = 0;

	if ( c-1 >=0 ) {

		const left = (r * 9) + (c - 1);

		if ( this.gridData [ left ].resident == res ) counter += 1;

	}

	if ( c+1 < 9 ) {

		const right = (r * 9) + (c + 1);

		if ( this.gridData [ right ].resident == res ) counter += 1;
	}

	if ( r-1 >= 0 ) {

		const top = ( (r-1) * 9) + c;

		if ( this.gridData [ top ].resident == res ) counter += 1

	}

	if ( r+1 < 8  ) {

		const bottom = ( (r+1) * 9) + c;

		if ( this.gridData [ bottom ].resident == res ) counter += 1;
		
	}
	
	return counter;

}

function checkWinner ( roomId ) 
{
	const room = roomList [roomId];

	for ( var i in room.piecesData ) {
		
		var piece = room.piecesData [i];

		if ( piece.rank == 14 ) {

			if ( piece.isCaptured ) {

				return (piece.plyr == 0 ) ? 1 : 0;

			}else {

				const r =Math.floor ( piece.post/9 );

				if ( ( piece.plyr == 0 && r == 0 ) || ( piece.plyr == 1 && r == 7 ) ) return piece.plyr;
			}
			

		}
	}

	return -1;

}

function isFlagHome ( plyr ) 
{

	const flags = this.piecesCont.getAll ('rank', 14 );

	for ( var i in flags ) {

		if ( flags [i].player == plyr  && flags [i].isHome() ) return true;
	}

	return false;
}

function checkClash ( rankA, rankB )
{

	if ( rankA == 14 && rankB != 14 ) {  // A = Flag, B = Any except flag
		return 2;
	}
	if ( rankB == 14 && rankA != 14 ) {  // B = Flag, A = Any except flag
		return 1;
	}
	if ( rankA == 14 && rankB == 14 ) {  // A = Flag attacks B = Flag  -> winner : A
		return 1;
	}
	if ( rankB == 14 && rankA == 14 ) {  // B = Flag attacks A = Flag  -> winner : B
		return 2;
	}
	if ( rankA == 15 && rankB == 15 ) { // A = Spy, B = Spy -> no winner
		return 0;
	}
	if ( rankA == 15 && rankB != 13 ) { // A = Spy, B != Private -> winner : A
		return 1;
	}
	if ( rankB == 15 && rankA != 13 ) { // B = Spy, A != Private -> winner : B
		return 2;
	}
	if ( rankA == 15 && rankB == 13 ) { // A = Spy, B == Private -> winner : B
		return 2;
	}
	if ( rankB == 15 && rankA == 13 ) { // B = Spy, A == Private -> winner : A
		return 1;
	}
	if ( rankA < rankB ) {
		return 1;
	}
	if ( rankB < rankA ) {
		return 2;
	}
	if ( rankB == rankA ) {
		return 0;
	}

	return null;

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

