
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


class Piece {

	constructor ( id, player, post, rank ) {

		this.id = id;

		this.post = post;

		this.rank = rank;

		this.player = player;

		this.isCaptured = false;

	}

	isHome () {

		const r = Math.floor ( this.post/9 );

		//console.log ( 'row', r );

		return ( this.player == 0 && r == 0 ) || ( this.player == 1 && r == 7 );

	}

}

class Player {

	constructor (id, username) {
		
		this.id = id;

		this.username = username;

		this.pairingId = Math.floor ( Math.random() * 99999 );

		this.roomId = '';

		this.roomIndex = 0;

		this.chip = 0;

		this.inviteId = '';

		this.isReady = false;

		this.hasOfferedDraw = false;

	}

	rematch () {

		this.isReady = false;

		this.hasOfferedDraw = false;

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

	constructor ( id, type, prepTime = 10, turnTime = 10 ) {
		
		this.id = id;

		this.gameType = type; // 0 = no Timer ; 1 = with timer,

		this.turn = 0;

		this.isClosed = false;
		
		this.gridData = [];

		this.pieces = {};

		this.players = [];

		this.isGameOn = false;

		this.prepCount = 0;

		this.readyCount = 0;

		this.startCount = 0;

		this.toRematch = 0;

		this.prepTime = prepTime;

		this.turnTime = turnTime;

		this.prevTurn = 0;

		this.timerCounter = 0;

		this.pieceToMove = '';

		this.timerPaused = false;
		//

	}

	initGame () {

		this.pieces = {};

		this.gridData = [];

		for ( let i = 0; i < 72; i++ ) {

			this.gridData.push ({ resident : 0, residentPiece : '' });

		}

	}

	startPrep () {

		if ( this.gameType == 1 ) this.starTimer ( this.prepTime, 0 );

	}

	endPrep () {

		for ( var i in this.players) {

			if ( !playerList [ this.players[i] ].isReady ) {
				
				socketList [ this.players [i] ].emit ('endPrepTime');
			}

		}

	}

	startCommencement () {

		if ( this.timeIsTicking ) this.stopTimer ();

		for ( var i in this.players ) {

			let oppoPiecesArr = [];

			for ( var j in this.pieces ) {

				if ( this.pieces [j].player != i ) {

					const mirrorPost = i == 0 ? this.pieces[j].post : 71 - this.pieces[j].post;

					oppoPiecesArr.push ( { 'post' : mirrorPost, 'rank' : this.pieces[j].rank  });

				}
				
			}

			socketList [ this.players [i] ].emit ('commenceGame', { 'oppoPiece' : oppoPiecesArr });

		}

		// setTimeout ( ()=> {
		// 	this.startGame ();
		// }, 3000 );

	}

	startGame () {

		this.isGameOn = true;

		this.startTurn ();
	}

	startTurn () {
		
		this.timerCounter = 0;

		if ( this.gameType == 1 ) this.starTimer ( this.turnTime, 1 );

	}

	endTurn ()
	{
		for ( var i in this.players) {

			socketList [ this.players [i] ].emit ('endTurn');
		}

		this.switchTurn ();

	}

	starTimer ( time, phase ) {  

		this.timeIsTicking = true;

		this.myTimer = setInterval (() => {

			if ( !this.timerPaused ) {

				this.timerCounter += 1;

				if ( this.timerCounter >= time ) {

					this.stopTimer();

					if ( phase == 0 ) {
						this.endPrep();
					}else {
						this.endTurn ();
					}

				}
			}

		}, 1000 );


	}

	toggleTimer ()
	{
		this.timerPaused = !this.timerPaused;
	}

	stopTimer () {

		this.timerPaused = false;

		this.timeIsTicking = false;

		clearInterval ( this.myTimer );

	}

	endGame ( winner ) {

		this.isGameOn = false;

		if ( this.timeIsTicking ) this.stopTimer();


	}

	switchTurn () {

		if ( this.timeIsTicking ) this.stopTimer ();

		this.pieceToMove = '';

		this.turn = this.turn == 1 ? 0 : 1;

		this.startTurn ();

	}

	switchPieces () {

		this.prevTurn = this.prevTurn == 0 ? 1 : 0;

		this.turn = this.prevTurn;

	}

	restartGame () {

		this.prepCount = 0;

		this.toRematch = 0;

		this.startCount = 0;

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

				'game' : {
					'multiplayer' : 0,
					'timerOn' : data.gameType,
					'time' : { 'prep' : newRoom.prepTime, 'turn' : newRoom.turnTime }
				},
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

				let newInvite = new Invite ( inviteId, host.id, friend.id, data.gameType )

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
	
	socket.on('prepStarted', () => {

		const plyr = playerList [ socket.id ];

		//..
		const room = roomList [ plyr.roomId ];

		room.prepCount ++;

		if ( room.prepCount >= 2 ) room.startPrep();

	});

	socket.on('gameStarted', () => {

		const plyr = playerList [ socket.id ];

		//..
		const room = roomList [ plyr.roomId ];

		room.startCount ++;

		if ( room.startCount >= 2 ) room.startGame ();

	});

	socket.on("playerReady", ( data ) => {

		const plyr = playerList [ socket.id ];

		plyr.isReady = true;

		//..
		const room = roomList [ plyr.roomId ];

		for ( var i in data.pieces ) {

			const truePost = plyr.roomIndex == 0 ? data.pieces [i].post : 71 - data.pieces [i].post;

			const strId = 'plyr' + plyr.roomIndex + '_' + i;

			room.pieces [ strId ] = new Piece ( strId, plyr.roomIndex, truePost, data.pieces [i].rank );

			room.gridData [ truePost ] = { resident : plyr.roomIndex + 1, residentPiece : strId };

		}

		room.readyCount += 1;

		if ( room.readyCount < 2 ) {	

			for ( var i in room.players ) {

				socketList [ room.players [i] ].emit ('playerIsReady', { player : room.players [i] == socket.id ? 'self' : 'oppo' });
			}

		}else {
			
			room.startCommencement();

		}

	});

	socket.on("playerClick", data => {

		if ( verifyMove (socket.id) ) {

			const plyr = playerList [ socket.id ];

			const room = roomList [ plyr.roomId ];

			if ( data.post != -1 ) {
				
				const clickedPost = ( plyr.roomIndex == 0 ) ? data.post : 71 - data.post;

				room.pieceToMove = room.gridData [ clickedPost ].residentPiece;

			}else {

				room.pieceToMove = '';
			}

			//console.log ( 'tomove', room.pieceToMove );

			const oppoId = room.players [ plyr.roomIndex == 0 ? 1 : 0 ];

			const post = data.post != -1 ? 71 - data.post : -1;

			socketList [ oppoId ].emit ('oppoPieceClicked', { 'piecePost' : post });

		}

	});

	socket.on("playerMove", data => {

		if ( verifyMove (socket.id) ) {

			makeTurn ( socket.id, data.gridPost );

		}

	});
	
	socket.on("playAgain", () => {
		
		var plyr = playerList [ socket.id ]
		
		var room = roomList [ plyr.roomId ];

		room.toRematch += 1;

		if ( room.toRematch > 1 ) {

			for ( var i in room.players ) {

				playerList [ room.players [i] ].rematch ();

				socketList [ room.players [i] ].emit ('restartGame');
			}

			room.restartGame ();

		}

	});

	socket.on("playerResigns", () => {
		
		var plyr = playerList [ socket.id ]
		
		var room = roomList [ plyr.roomId ];

		for ( var i in room.players ) {

			var winner = room.players[i] == socket.id ? 'oppo': 'self';

			socketList [ room.players[i] ].emit ('playerHasResign', { 'winner': winner });

		}

		room.endGame ();

	});

	socket.on("playerReveals", () => {
		
		var plyr = playerList [ socket.id ]
	
		var room = roomList [ plyr.roomId ];

		for ( var i in room.players ){

			var plyrId = room.players[i] == socket.id ? 'self' : 'oppo';

			var plyrInd = room.players[i] == socket.id ? 'oppo' : 'self';

			var msg = room.players[i] == socket.id ? 'Your pieces are revealed to the opponent ' : 'Your opponent has revealed his/her pieces';

			socketList [ room.players[i] ].emit ('playerHasRevealed', { 'plyr': plyrId, 'plyrInd': plyrInd, 'msg' : msg });

		}

	});

	socket.on("playerOffersDraw", () => {
		
		var plyr = playerList [ socket.id ]
		
		if ( !plyr.hasOfferedDraw ) {

			plyr.hasOfferedDraw = true;

			var room = roomList [ plyr.roomId ];

			if ( room.gameType == 1 ) room.toggleTimer ();

			for ( var i in room.players ) {

				var type = room.players[i] == socket.id ? 0 : 1;

				socketList [ room.players[i] ].emit ('playerOfferedDraw', { 'type' : type, 'withTimer' : room.gameType });

			}

		}

	});

	socket.on("playerDrawResponse", data => {
		
		var plyr = playerList [ socket.id ]

		var room = roomList [ plyr.roomId ];

		if ( data.response == 1 ) {

			for ( var i in room.players ) {
				socketList [ room.players[i] ].emit ('gameIsADraw');
			}

			room.endGame ();

		}else {

			for ( var i in room.players ) {

				var msg =  ( room.players[i] == socket.id ) ? 'Please wait. Game resumes.' : 'Opponent has declined. Game resumes.';

				socketList [ room.players[i] ].emit ('playerDeclinesDraw', {  msg : msg });

			}

			setTimeout (() => {

				for ( var i in room.players ) {

					socketList [ room.players[i] ].emit ('resumeGame');
				}

				room.toggleTimer();

			}, 2000 );
			

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

function makeTurn ( socketId, post ){

	var plyr = playerList [ socketId ];

	var room = roomList [ plyr.roomId ];

	const destPost = (plyr.roomIndex == 1 ) ? 71 -post : post;

	//
	for ( var i in room.players ) {	

		var plyrMoved = ( room.players [i] != socketId ) ? 'oppo' : 'self';

		var postMove = ( room.players [i] != socketId ) ? 71 - post : post;

		socketList [ room.players [i] ].emit ('playerHasMoved', {  plyr: plyrMoved, post : postMove });

	}

	//analyze move..
	const movingPiece = room.pieces [ room.pieceToMove ];

	//get origin
	const origin = movingPiece.post;

	// empty origin..
	room.gridData [ origin ] = { resident : 0, residentPiece : '' };

	movingPiece.post = destPost;

	//check if destination is empty.. 
	if ( room.gridData [ destPost ].resident == 0 ) { 

		room.gridData [ destPost ] = { resident : movingPiece.player + 1, residentPiece : movingPiece.id };
		
	}else {

		const residingPiece = room.pieces [ room.gridData [ destPost ].residentPiece ];

		const clashResult = checkClash ( movingPiece.rank, residingPiece.rank );

		if ( clashResult == 1 ) { 

			//winner movingPiece..
			room.gridData [ destPost ].resident = movingPiece.player + 1;

			room.gridData [ destPost ].residentPiece = movingPiece.id;
			
			residingPiece.isCaptured = true;

			//console.log ('winner moving piece');

		}else if ( clashResult == 2 ) {

			movingPiece.isCaptured = true;
			
			//console.log ('winner residing piece');

		}else {

			room.gridData [ destPost ].resident = 0;

			room.gridData [ destPost ].residentPiece = '';
			
			residingPiece.isCaptured = true;
			
			movingPiece.isCaptured = true

			//console.log ('its a tie');
		}

	}

	room.pieceToMove = '';

	//check winner...
	const winnerAfterMove = checkWinner( room.id );

	if (  winnerAfterMove >= 0 ) {

		room.endGame( winnerAfterMove );

	}else {

		room.switchTurn();

		//check winner after turn switch..
		const winnerAfterTurn = checkWinner( room.id, true );
		
		if ( winnerAfterTurn >= 0 ) {
			
			room.endGame ( winnerAfterTurn );

		}

	}

}

function getNearbyResidents ( roomId, pos, res ) 
{

	var room = roomList [ roomId ];

	const r = Math.floor ( pos/9 ), c = pos % 9;

	let counter = 0;

	if ( c-1 >=0 ) {

		const left = (r * 9) + (c - 1);

		if ( room.gridData [ left ].resident == res ) counter += 1;

	}

	if ( c+1 < 9 ) {

		const right = (r * 9) + (c + 1);

		if ( room.gridData [ right ].resident == res ) counter += 1;
	}

	if ( r-1 >= 0 ) {

		const top = ( (r-1) * 9) + c;

		if ( room.gridData [ top ].resident == res ) counter += 1

	}

	if ( r+1 < 8  ) {

		const bottom = ( (r+1) * 9) + c;

		if ( room.gridData [ bottom ].resident == res ) counter += 1;
		
	}
	
	return counter;

}

function checkWinner ( roomId, flagCheck = false ) 
{
	const room = roomList [roomId];

	for ( var i in room.pieces ) {
		
		var piece = room.pieces [i];

		if ( piece.rank == 14 ) {

			if ( !flagCheck ) {  //check flag captured or flag is home with no adjacent opps..
 
				if ( piece.isCaptured ) {

					return (piece.player == 0 ) ? 1 : 0;
	
				}else {
	
					const res = piece.player == 0 ? 2 : 1;
					
					//console.log ( piece.player, piece.isHome(), getNearbyResidents( roomId, piece.post, res ) );

					if ( piece.isHome() &&  getNearbyResidents( roomId, piece.post, res ) == 0 ) return piece.player;
					
				}

			}else { // check flag is home only 

				if ( (room.turn == piece.player) && piece.isHome() ) return piece.player;

			}
		
		}
	}

	return -1;

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

			'turn' : i == room.turn ? 'self' : 'oppo',
			'game' : {
				'multiplayer' : 1,
				'timerOn' : room.gameType,
				'time' : {
					'prep' : room.prepTime,
					'turn' : room.turnTime,
				}
			},
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

