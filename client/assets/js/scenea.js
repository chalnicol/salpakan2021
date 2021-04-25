class SceneA extends Phaser.Scene {

    constructor ()
    {
        super('SceneA');
    }

    preload () 
    {

    }

    create ( data ) 
    {

        this.gameData = data;

        this.emojisThread = [];
        
        this.gameOver = false;

        this.gameInited = false;

        this.isEmoji = false;

        this.sentEmojisShown = false;

        this.musicOff = false;

        this.soundOff = false;

        this.gridData = [];

        this.pieceClicked = '';

        this.gamePiecesData = [

            { rank : 1, name : 'General', count : 1 },
            { rank : 2, name : 'General', count : 1 },
            { rank : 3, name : 'General', count : 1 },
            { rank : 4, name : 'General', count : 1 },
            { rank : 5, name : 'General', count : 1 },
            { rank : 6, name : 'Colonel', count : 1 },
            { rank : 7, name : 'Lt. Colonel', count : 1 },
            { rank : 8, name : 'Major', count : 1 },
            { rank : 9, name : 'Captain', count : 1 },
            { rank : 10, name : '1st Lt.', count : 1 },
            { rank : 11, name : '2nd Lt.', count : 1 },
            { rank : 12, name : 'Sergeant', count : 1 },
            { rank : 13, name : 'Private', count : 6 },
            { rank : 14, name : 'Flag', count : 1 },
            { rank : 15, name : 'Spy', count : 2 }
        ];

        this.presets = [
            [0, 4, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26],
            [3, 4, 5, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26],
            [0, 2, 3, 4, 5, 6, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 21, 22, 23, 26],
            [0, 3, 4, 5, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 19, 20, 21, 22, 23, 24, 25],
            [2, 3, 4, 5, 6, 10, 11, 12, 13, 14, 15, 16, 18, 19, 20, 21, 22, 23, 24, 25, 26],
            [1, 2, 3, 4, 5, 6, 7, 10, 11, 12, 13, 14, 15, 16, 19, 20, 21, 22, 23, 24, 25]
        ];

        this.gamePhase = 0;

        this.presetIndex = 0;

        this.players = {};

        this.controlsHidden = true;

        
        //add bg
        this.add.image ( 960, 540, 'bg'); 
        
        //add field
        const sw = 190, sh = 114;

        const sx = 960 - (sw * 9)/2 + sw/2, sy = 190;

        for ( let i = 0; i < 72; i++ ) {

            let ix = Math.floor ( i/9 ), iy = i%9;

            let clr = i < 36 ? 0xff0000 : 0x0000ff;

            let xp =  sx + ( iy * sw ), yp = sy + ( ix * sh );

            this.add.rectangle ( xp, yp, sw, sh, clr, 0.9 ).setStrokeStyle ( 5, 0xfefefe );

            this.add.text ( xp + 60, yp - 30, i, { color:'#fff', fontFamily:'Oswald', fontSize: 20 }).setOrigin(0.5);

            this.gridData.push ( { 'x': xp, 'y': yp, 'resident' : 0, 'residentPiece' : '' });
        
        }

     
        //add burger for controls
        let brgr = this.add.image (1844, 66, 'burger').setInteractive();

        brgr.on('pointerover', () => {
            brgr.setFrame(1);
        });
        brgr.on('pointerout', () => {
            brgr.setFrame(0);
        });
        brgr.on('pointerdown', () => {

            this.playSound ('clicka');
            
            brgr.setFrame(2);
        });
        brgr.on('pointerup', () => {
            
            brgr.setFrame(0);

            this.controlsHidden = !this.controlsHidden;

            this.showControls ( !this.controlsHidden );

        });


        //add pieces container..
        this.piecesCont = this.add.container (0, 0);


        //..

        this.initSoundFx ();

        this.initSocketIO();

        this.initPlayers();

        this.createPlayersIndicator ();

        this.createCapturedContainer ();

        this.createControls ();

        this.startPrep ();


    }

    createCapturedContainer ()
    {

        console.log ('this..');

        this.capturedCont = this.add.container ( 0, 1080);

        const bg = this.add.image ( 960, 540, 'capturedbg' );

        this.capturedCont.add ( bg );


    }

    playMusic ( off = false ){

        if ( off ) {
            this.bgmusic.pause();
        }else {
            this.bgmusic.resume();
        }

    }

    playSound  ( snd, vol=0.5 ) {

        if ( !this.soundOff) this.soundFx.play ( snd, { volume : vol });

    }

    initSoundFx () 
    {
        //sfx
        this.soundFx = this.sound.addAudioSprite('sfx');

        //bg music..
        this.bgmusic = this.sound.add('sceneabg').setVolume(0.1).setLoop(true);

        this.bgmusic.play();

    
    }

    initSocketIO () 
    {

        socket.on('showEmoji', ( data ) => { 
            
            this.time.delayedCall (500, () => {

                if ( this.sentEmojisShown ) this.removeSentEmojis();

                this.showSentEmojis ( data.plyr, data.emoji );

            }, [], this);

        });

        socket.on('restartGame', () => {
            this.resetGame ();
        });

        socket.on('opponentLeft', () => {
            
            this.gameOver = true;

            if ( this.isPrompted ) this.removePrompt();

            const btnArr = [ { 'txt' : 'Exit',  'func' : () => this.leaveGame() } ];

            this.showPrompt ('Opponent has left the game.', 40, -20, false, btnArr );

        });

        socket.on('playerMove', (data) => {
            
            //console.log ( data );

            this.makeTurn ( data.col, data.turn );

        });
    }

    initPlayers () {

        //console.log ( this.gameData.players );


        const names = ['Nong', 'Chalo', 'Nasty', 'Caloy'];

        let oppoUsername = '', 
            
            oppoAI = false, 
            
            oppoChip = 0,
            
            turn = '';

        if (this.gameData.game == 0 ) {

            //is single player..
            oppoUsername = names [ Phaser.Math.Between (0, names.length - 1) ] + ' (CPU)';

            oppoAI = true;

            oppoChip = this.gameData.players ['self'].chip == 0 ? 1 : 0;

            turn = this.gameData.players ['self'].chip == 0 ? 'self' : 'oppo';

        }  else {

            oppoUsername = this.gameData.players ['oppo'].username;

            oppoChip = this.gameData.players ['oppo'].chip;

            turn = this.gameData.turn;
            
        }   

        //..
        this.players ['self'] = new Player ('self', this.gameData.players['self'].username, this.gameData.players['self'].chip );

        this.players ['oppo'] = new Player ('oppo', oppoUsername, oppoChip, oppoAI );

        this.turn = turn;        
    
    }
    
    createControls ( proper = false ) 
    {
        
        //..

        const cntW = 800, cntH = 380;

        this.controlBtnsCont = this.add.container ( 1920, 0).setDepth (9999);

        const rct = this.add.rectangle ( 0, 150, cntW, cntH, 0x3a3a3a, 0.7 ).setOrigin (0);

        this.controlBtnsCont.add ( rct );

        
        //..

        const btnsTop = 220, btnsLeft = 150;

        const btnArr = [ 'leave', 'emoji', 'sound', 'music' ];

        for ( let i=0; i<btnArr.length; i++ ) {

            let xp = btnsLeft + (i * 120), yp = btnsTop;

            let btnCont = new MyButton ( this, xp, yp, 100, 100, btnArr[i], 'conts_sm', 'imgBtns', i ).setName (btnArr[i]);

            btnCont.on('pointerup', function () {
                
                this.btnState ('idle');

                switch (this.id) {
                    case 'leave':
                        
                        this.scene.showControls ( false );

                        this.scene.showExitPrompt ();
                        break;
                    case 'sound':
                        this.scene.soundOff = !this.scene.soundOff;

                        console.log ( this.imgFrame);

                        this.getAt(1).setFrame ( this.scene.soundOff ? Number(this.imgFrame)+2 : this.imgFrame );

                        break;
                    case 'music':

                        this.scene.musicOff = !this.scene.musicOff;

                        this.getAt(1).setFrame ( this.scene.musicOff ? Number(this.imgFrame)+2 : this.imgFrame );

                        this.scene.playMusic ( this.scene.musicOff );

                        break;
                    case 'emoji':

                        this.scene.showEmoji ();

                        this.scene.showControls ( false );

                        break;
                    default:
                }
               
            });
            btnCont.on('pointerdown', function () {
                
                this.btnState ('pressed');

                this.scene.playSound ('clicka');
              
            });

            const txt = this.add.text (xp, yp + 70, btnArr[i], { color : '#fff', fontFamily:'Oswald', fontSize: 24 }).setOrigin(0.5);

            this.controlBtnsCont.add ( [btnCont, txt] );

        }

        //main btns..

        let mainBtnArr = ( proper ) ?  ['preset', 'random', 'ready'] : [ 'draw', 'da', 'de'] ;


        for ( let i=0; i<mainBtnArr.length; i++ ) {
  
            let xp = btnsLeft + (i * 120), yp = btnsTop + 200;

            let mainBtn = new MyButton ( this, xp, yp, 100, 100, mainBtnArr[i], 'conts_sm', 'imgBtns',  i + 6 );

            mainBtn.on('pointerdown', function () {
                
                this.btnState ('pressed');

                this.scene.playSound ('clicka');
              
            });

            mainBtn.on('pointerup', () => {
                
                //..

                switch (mainBtn.id) {

                    case 'random':
                        //..
                        const postArr = this.generateRandomArr();
                        
                        this.repositionPieces ('self', postArr);

                        break;
                    case 'preset':
                        //.. 
                        this.repositionPieces ('self', this.presets [ this.presetIndex] );

                        this.presetIndex += 1;

                        if ( this.presetIndex >= this.presets.length ) this.presetIndex = 0;

                        break;
                    case 'ready':
                        //..

                        this.showControls (false);

                        this.startCommencement ();

                        
                        break;
                    default:
                }
               
            });

            const txt = this.add.text (xp, yp + 70, mainBtnArr[i], { color : '#fff', fontFamily:'Oswald', fontSize: 24 }).setOrigin(0.5);

            this.controlBtnsCont.add ( [mainBtn, txt] );

        }


    }

    showControls ( shown = true )
    {

        this.controlsHidden = !shown;

        this.add.tween ({
            targets : this.controlBtnsCont,
            x : ( shown ) ? 1120 : 1920,
            duration : 500,
            ease : 'Power3',
        });


    }

    replaceMainControls () {



    }


    //..

    createGamePieces ( plyr, clr, flipped, activated ) {

        const w = 175, h = 98;

        const postArr = this.generateRandomArr ();

        let counter = 0;

        for ( var i = 0; i< this.gamePiecesData.length ; i++) {

            for ( var j = 0; j < this.gamePiecesData[i].count; j++) {

                let post = (plyr == 'self') ? postArr[counter] + 45 : postArr[counter];

                let base = plyr == 'self' ? 0 : 1;

                const xp = this.gridData [ post ].x, yp = this.gridData [ post ].y;

                const rnk = this.gamePiecesData [i].rank, rnkName = this.gamePiecesData [i].name;

                const piece = new GamePiece ( this, 960, 540, w, h, plyr + counter, plyr, clr, base, post, rnk, rnkName, flipped, activated );

                piece.on('pointerdown', () => {
                    this.playSound ('clicka');
                });
                piece.on('pointerup', () => {
                    this.pieceIsClicked ( piece );
                });

                this.add.tween ({
                    targets : piece,
                    x : xp, y : yp,
                    duration : 200,
                    ease : 'Power3',
                    delay : counter * 18
                });

                
                this.gridData [ post ].resident = plyr == 'self' ? 1 : 2;
                this.gridData [ post ].residentPiece = plyr + counter;
                
                counter++;

                this.piecesCont.add ( piece );

            }
        }

        this.playSound ('ending');

    }

    generateRandomArr ( max = 27 )
    {
        let arr = [];

        for (var i = 0; i < max; i++ ){
            arr.push ( i );
        }

        let tmp = [];

        while ( tmp.length < 21 ) {

            let indx = Math.floor ( Math.random() * arr.length );
            
            tmp.push ( arr [indx] );

            arr.splice ( indx, 1 );

        }

        return tmp;

    }

    repositionPieces ( plyr, postArr ) {

        const orderArr = this.generateRandomArr ( 21 );

        for ( var i = 0; i < 27; i++ ) {
            this.gridData [ i + 45 ].resident = 0;
            this.gridData [ i + 45 ].residentPiece = '';
        }

        for ( let i in postArr ) {

            let piece = this.piecesCont.getByName ( plyr + orderArr [ i ] );

            piece.post = postArr [i] + 45;

            this.add.tween ({
                targets : piece,
                x : this.gridData [ postArr[i] + 45 ].x,
                y : this.gridData [ postArr[i] + 45 ].y,
                duration : 300,
                ease : 'Power2'
            });

            this.gridData [ postArr[i] + 45 ].resident = 1;
            this.gridData [ postArr[i] + 45 ].residentPiece = piece.id;
            

        }

    }

    createBlinkers ( piecePost, resident = 0, activated = true ) {

        this.blinkersCont = this.add.container ( 0, 0);

        if ( this.gamePhase == 0 ) {

            for ( let i = 0; i < 27; i++ ) {

                if ( (i+45) != piecePost ){
                
                    let xp = this.gridData [i + 45].x, yp = this.gridData [ i+45 ].y;

                    const blinka = new MyBlinkers ( this, xp, yp, 190, 114, 'blink'+i, i+45, 4, true );

                    blinka.on ('pointerdown', () => {
                        this.playSound ('clicka');
                    });

                    blinka.on ('pointerup', () => {

                        //console.log (i);
                        
                        this.removeBlinkers ();

                        this.prepMove ( blinka.post );



                    }); 

                    this.blinkersCont.add ( blinka );

                }

            }

        }else {

            const adjArr = this.getOpenAdjacent ( piecePost, resident );

            for ( let i in adjArr ) {

                let xp = this.gridData [ adjArr[i].post ].x, yp = this.gridData [ adjArr[i].post ].y;

                const blinkb = new MyBlinkers ( this, xp, yp, 190, 114, 'blink'+i, adjArr[i].post, adjArr[i].dir, activated );

                blinkb.on ('pointerdown', () => {
                    this.playSound ('clicka');
                });

                blinkb.on ('pointerup', () => {

                    //console.log (i);
                    
                    this.removeBlinkers ();

                    this.makeTurn ( this.turn, blinkb.post );
                    
                }); 

                this.blinkersCont.add ( blinkb );

            }

        }

    }

    removeBlinkers () 
    {
        this.blinkersCont.destroy ();
    }

    prepMove ( gridPos ) {

        const clicked = this.piecesCont.getByName ( this.pieceClicked );

        const origin = clicked.post;

        const destOccupied = this.gridData [ gridPos ].resident !== 0;

        const residentPieceId = destOccupied ? this.gridData [ gridPos ].residentPiece : '';

        //..    
        this.add.tween ({
            targets : clicked,
            x: this.gridData [ gridPos ].x,
            y: this.gridData [ gridPos ].y,
            duration : 200,
            ease : 'Power3'
        });
        
        clicked.post = gridPos;

        clicked.setPicked (false);

        this.gridData [ gridPos ].resident = 1;
        
        this.gridData [ gridPos ].residentPiece = clicked.id;
        

        //..
        if ( destOccupied ) {

            const resident = this.piecesCont.getByName ( residentPieceId );
            //..
            this.add.tween ({
                targets : resident,
                x: this.gridData [ origin ].x,
                y: this.gridData [ origin ].y,
                duration : 200,
                ease : 'Power3'
            });
            
            resident.post = origin;

            this.gridData [ origin ].residentPiece = resident.id;

            
        }else {

            this.gridData [ origin ].resident = 0;

            this.gridData [ origin ].residentPiece = '';
        
        }

        this.pieceClicked = '';
        
    }

    pieceIsClicked ( piece ) {

        //if ( !this.controlsHidden ) this.showControls (false);

        if ( this.pieceClicked != piece.id ) {


            if ( this.pieceClicked != '') {

                const prevPiece = this.piecesCont.getByName ( this.pieceClicked );

                prevPiece.setPicked (false);

                this.removeBlinkers();
            }
            

            piece.setPicked ();

            this.pieceClicked = piece.id;

            this.createBlinkers ( piece.post, 1 );

            
        
        }else {

            piece.setPicked ( false );

            this.pieceClicked = '';

            this.removeBlinkers ();
        }

        

    }

    getOpenAdjacent ( pos, res ) 
    {
        const r = Math.floor ( pos/9 ), c = pos % 9;

        let arr = [];

        if ( c-1 >=0 ) {

            const left = (r * 9) + (c - 1);

            if ( this.gridData [ left ].resident != res )  arr.push ({ dir: 0, post : left });

        }

        if ( c+1 < 9 ) {

            const right = (r * 9) + (c + 1);

            if ( this.gridData [ right ].resident != res )  arr.push ({ dir: 2, post : right });
        }

        if ( r-1 >= 0 ) {

            const top = ( (r-1) * 9) + c;

            if ( this.gridData [ top ].resident != res )  arr.push ({ dir: 1, post : top });

        }

        if ( r+1 < 8  ) {

            const bottom = ( (r+1) * 9) + c;

            if ( this.gridData [ bottom ].resident != res )  arr.push ({  dir: 3, post : bottom });
            
        }
        
        return arr;

    }

    movePiece ( post ) 
    {

        const toMove = this.piecesCont.getByName ( this.pieceClicked );
        
        const origin = toMove.post;

        //bring to top..
        this.piecesCont.bringToTop (toMove);

        //..    
        this.add.tween ({
            targets : toMove,
            x: this.gridData [ post ].x,
            y: this.gridData [ post ].y,
            duration : 200,
            ease : 'Bounce'
        });
        
        toMove.post = post;

        toMove.setPicked (false);

        // empty origin..
        this.gridData [ origin ].resident = 0;

        this.gridData [ origin ].residentPiece = '';

        //this.gridData [ post ].resident = 1;

        //this.gridData [ post ].residentPiece = clicked.id;

    }

    makeTurn ( plyr, post ) {

        //if ( this.gameInited && !this.gameOver  ) {
        const clashDelayAction =  200;

        const postOccupied = this.gridData [ post ].resident != 0;

        this.movePiece ( post );

        this.activatePieces ( this.turn, false );

        if ( !postOccupied ) {

            this.gridData [ post ].resident = plyr == 'self' ? 1 : 2;

            this.gridData [ post ].residentPiece = this.pieceClicked;

            this.pieceClicked = '';

        }else {

            //check clash..
            
            const movingPiece = this.piecesCont.getByName ( this.pieceClicked );

            const residingPiece  = this.piecesCont.getByName ( this.gridData [ post ].residentPiece );

            const clashResult = this.checkClash ( movingPiece.rank, residingPiece.rank );

            console.log ( 'res', clashResult );

            if ( clashResult == 1 ) { 

                //winner movingPiece..
                this.gridData [ post ].resident = plyr == 'self' ? 1 : 2;

                this.gridData [ post ].residentPiece = this.pieceClicked;

                this.time.delayedCall ( clashDelayAction, () => {

                    residingPiece.captured();

                    this.playSound ('clashwon');

                    this.createParticlesAnim ( post, residingPiece.pieceClr );

                }, [], this);


            }else if ( clashResult == 2 ) {

                //winner residingPiece..
                this.time.delayedCall ( clashDelayAction, () => {

                    movingPiece.captured();

                    this.playSound ('clashwon');

                    this.add.tween ({
                        targets : residingPiece,
                        scale : 1.1,
                        duration : 100,
                        yoyo: true,
                        easeParams : [ 1.2, 0.8 ],
                        ease : 'Elastic'
                    });

                    this.createParticlesAnim ( post, movingPiece.pieceClr );

                }, [], this);
               

            }else {

                this.gridData [ post ].resident = 0;

                this.gridData [ post ].residentPiece = '';

                this.time.delayedCall ( clashDelayAction, () => {

                    residingPiece.captured();
                
                    movingPiece.captured();

                    this.playSound ('clashdraw');

                    this.createParticlesAnim ( post, 0 );

                    this.createParticlesAnim ( post, 1 );

                }, [], this);

            }

            this.pieceClicked = '';

            //check winner.. 

            

        }

        //checkWinner...
        this.time.delayedCall ( 500, () => {

            const isWinner = this.checkWinner();


            if ( isWinner != '' ) {

                this.endGame ( isWinner );

            }else {

                this.switchTurn ();

            }

        }, [], this);


    }

    makeAI () {

        
        //get shot
        let tmpArr = [];

        let resident = this.turn == 'self' ? 1 : 2;

        for ( var i = 0; i < 21; i++ ){

            const piece = this.piecesCont.getByName ( this.turn + i );

            if ( !piece.isCaptured ) {

                const arr = this.getOpenAdjacent ( piece.post, resident );

                if ( arr.length > 0 ) tmpArr.push ( { 'piece' : piece.id, 'arr' : arr }); 
            }
            
        }

        const randIndx = Math.floor ( Math.random() * tmpArr.length );

        this.pieceClicked = tmpArr [randIndx].piece;

        const toMove = this.piecesCont.getByName ( tmpArr [randIndx].piece );

        this.createBlinkers ( toMove.post, resident, false );

        this.playSound ('clicka');

        const destArr = tmpArr [randIndx].arr;

        const dest = destArr [ Math.floor ( Math.random() * destArr.length ) ].post;


        this.time.delayedCall ( 500, function () {

            this.playSound ('clicka');

            this.removeBlinkers ();
            
            this.makeTurn ( this.turn, dest );

        }, [], this);
    
        
    }

    switchTurn () {

        console.log ('switch..');

        this.turn = ( this.turn == 'self' ) ? 'oppo' : 'self';
        
        this.setTurnIndicator ( this.turn );

        if ( this.players[ this.turn ].isAI ) {
            this.makeAI();
        }else {
            this.activatePieces ( this.turn );
        }

    }

    createParticlesAnim ( post, clr ) {

        const max = 36;

        const xp = this.gridData [ post ].x,

              yp = this.gridData [ post ].y;

        for ( let i = 0; i < max; i++ ) {

            const desx = xp + Math.sin ( Phaser.Math.DegToRad ( i* 360/max ) ) * Phaser.Math.Between (100, 200),

                  desy = yp - Math.cos ( Phaser.Math.DegToRad ( i* 360/max ) ) * Phaser.Math.Between (100, 200);


            const crc = this.add.rectangle ( xp, yp, Phaser.Math.Between (15, 25), Phaser.Math.Between (15, 25), clr == 0 ? 0xffffff : 0x0a0a0a , 1 );

            this.add.tween ({
                targets : crc,
                x : desx,
                y : desy,
                alpha : 0,
                duration : 1000,
                ease : 'Power3',
                onComplete : () => {
                    crc.destroy();
                }
            });


        }
    }

    checkWinner ( ) 
    {

        for ( var i = 0; i < 21; i++ ) {

            const selfPiece = this.piecesCont.getByName ('self' + i );

            if ( selfPiece.isFlagAndCaptured() ) return 'oppo';

            if ( selfPiece.isFlagAndHome() ) return 'self';

            
            const oppoPiece = this.piecesCont.getByName ('oppo' + i );

            if ( oppoPiece.isFlagAndCaptured() ) return 'oppo';

            if ( oppoPiece.isFlagAndHome() ) return 'self';

        }

        return '';
    }

    checkClash ( rankA, rankB ){

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

    startPrep ()
    {

        this.gamePhase = 0;

        this.showPrompt ('Initializing..', 40, 0, true );

        this.time.delayedCall ( 1000, function () {

            this.removePrompt();
            
            this.createGamePieces ('self', this.players['self'].chip, true, true);

            this.showControls ();

        }, [], this);
      
    }

    startCommencement () 
    {
        

        //deactive self pieces..
        this.activatePieces (  this.turn, false );

        //create oppo pieces..
        this.createGamePieces ( 'oppo', this.players['oppo'].chip, true, false );

        //show prompt..
        this.time.delayedCall ( 800, () => {
            this.showCommenceScreen ();
        }, [], this);
        
        // this.time.delayedCall ( 1300, function () {

        //    
        // }, [], this);


    }

    showCommenceScreen ()
    {

        //this.commenceElements = [];

        this.commenceCont= this.add.container (0, 0);


        const img0 = this.add.image ( 940, 600, 'commence');

        const img1 = this.add.image ( 1020, 540, 'commence').setScale(0.7);

        const img2 = this.add.image ( 950, 510, 'commence').setScale (0.5);

        const commence = this.add.text ( 960, 580, '3', {color:'#333', fontFamily:'Oswald', fontSize: 120 }).setStroke('#dedede', 5 ).setOrigin(0.5);

        this.commenceCont.add ([ img0, img1, img2, commence ]);

        //start commence timer..

        this.tweens.add ({
            targets : [img0, img2 ],
            rotation : '+=0.5',
            duration : 1000,
            repeat : 3,
            ease : 'Cubic.easeIn'
        });

        this.tweens.add ({
            targets : img1,
            rotation : '-=0.5',
            duration : 1000,
            repeat : 3,
            ease : 'Cubic.easeIn'
        });

        this.playSound ('beep');
        
        let counter = 0;

        this.time.addEvent ({
            delay : 1000,
            callback : () => {

                counter += 1;

                commence.text = ( 3 - counter );

                this.playSound ( (counter >= 3) ? 'bell' : 'beep' );

                if ( counter >= 3 ) {
                    
                    this.startGame ();

                    this.commenceCont.destroy();

                }
            },
            callbackScope : this,
            repeat : 2
        });


    }

    startGame () {

        console.log ( this.turn, this.players[ this.turn].chip );

        this.gamePhase = 1;

        this.gameInited = true;
    
        this.setTurnIndicator ( this.turn );

        this.activatePieces ( this.turn );

    }

    activatePieces ( plyr, enabled = true ) {

        for ( var i = 0; i < 21; i++) {

            const child = this.piecesCont.getByName ( plyr + i );

            if ( !child.isCaptured ) {

                if ( enabled ) {
                    child.setInteractive ();
                }else {
                    child.removeInteractive ();
                }
            }

        }

        
    }

    showCapturedPieces () 
    {


    }
    //..

   
    createPlayersIndicator () 
    {

        this.playerIndicatorsCont = this.add.container (0,0);

        const w = 507, sp = 100;

        const sx = 960-((w*2) + sp)/2 + w/2,
              sy = 66;

        var counter = 0;

        for ( var i in this.players ) {

            let pInd = this.add.container ( sx + (counter * ( w+sp)), sy ).setName (i);

            let img = this.add.image ( 0, 0, 'plyrInd');

            let crc = this.add.circle ( 200, 0, 15, 0x6e6e6e, 1 ).setStrokeStyle ( 1, 0x9e9e9e );

            let name = this.add.text ( -150, -34, this.players[i].username, { fontSize: 30, fontFamily:'Oswald', color: '#838383' });

            let wins = this.add.text ( -150, 6, 'Wins : 0', { fontSize: 26, fontFamily:'Oswald', color: '#9f9f9f' });

            pInd.add ( [ img, crc, name, wins] );

            this.playerIndicatorsCont.add ( pInd );

            counter++;
        }

        const img = this.add.image ( 960, sy, 'vs');

        this.playerIndicatorsCont.add ( img );

    }

    showEmoji () 
    {
        this.isEmoji = true;

        //1650 480..

        this.emojiContainer = this.add.container ( 0, 1080 );

        let rct = this.add.rectangle ( 0, 0, 1920, 1080 ).setOrigin(0).setInteractive ();

        rct.on('pointerdown', () => {
            
            this.playSound ('clicka');

            this.removeEmoji();
        });

        let bgimg = this.add.image ( 1650, 480, 'emojibg').setInteractive();

        this.emojiContainer.add ( [ rct, bgimg ] );

        const sx = 1595, sy = 260;

        for ( let i=0; i<12; i++) {

            let ix = Math.floor ( i/2 ), iy = i%2;

            let cont = this.add.container ( sx + iy * 110, sy + ix* 95 ).setSize (100, 100).setInteractive();


            let rct = this.add.rectangle ( 0, 0, 90, 90, 0xffffff, 0.6 ).setVisible (false);

            let img = this.add.image (  0, 0, 'emojis', i ).setScale ( 0.9 );

            cont.add ([rct, img]);

            cont.on('pointerover', function () {
                this.first.setVisible ( true );
            });
            cont.on('pointerout', function () {
                this.first.setVisible ( false );
            });
            cont.on('pointerdown', function () {

                this.scene.playSound ('clicka');

            });
            cont.on('pointerup', function () {
                
                this.first.setVisible ( false );

                this.scene.sendEmoji ( i );                
            
            });

            this.emojiContainer.add ( cont );

        }

        this.add.tween ({
            targets : this.emojiContainer,
            y : 0,
            duration : 300,
            easeParams : [ 1.2, 0.8 ],
            ease : 'Elastic'
        });

    }

    sendEmoji ( emoji ) {

        this.removeEmoji();

        if ( this.gameData.game == 0) {

            this.time.delayedCall ( 500, () => {

                if ( this.sentEmojisShown ) this.removeSentEmojis();

                this.showSentEmojis ('self', emoji );

            }, [], this );


            this.time.delayedCall ( 2000, () => {

                if ( this.sentEmojisShown ) this.removeSentEmojis();

                this.showSentEmojis ('oppo', Math.floor ( Math.random() * 12 ));

            }, [], this);


        }else {

            socket.emit ('sendEmoji', { 'emoji' : emoji });
        }

        //...disable emoji btns for 2 secs..
        this.controlBtnsCont.getByName('emoji').removeInteractive();

        this.time.delayedCall ( 4000, () => {
            this.controlBtnsCont.getByName('emoji').setInteractive();
        }, [], this );

    }

    removeEmoji () {
        
        this.isEmoji = false;

        this.emojiContainer.destroy();
    }

    showSentEmojis ( plyr, emoji ) {
        
        this.playSound ('message');

        if ( this.emojisThread.length >= 6 ) this.emojisThread.shift();

        this.emojisThread.push ( { 'plyr' : plyr, 'emoji' : emoji });

        //..
        this.emojiThreadCont = this.add.container ( 1500, 0 );


        //const prevPost = this.add.container (0, 970 - (this.emojisThread.length * 85) );

        const total = this.emojisThread.length - 1;

        for ( let i in this.emojisThread ) {

            let yp = 1010 - ( (total - i) * 85);

            const miniCont = this.add.container ( 210, yp );
            
            let nme = this.players [ this.emojisThread [i].plyr ].username;

            let clr = this.emojisThread [i].plyr == 'self' ? '#33cc33' : '#ff6600';

            let rct = this.add.rectangle ( 0, 0, 400, 80, 0xcecece, 0.5 );
            
            let txt = this.add.text ( -180, 0, nme +':', { color: clr, fontFamily:'Oswald', fontSize : 26 }).setOrigin ( 0, 0.5 );

            let img = this.add.image ( 150, 0, 'emojis', this.emojisThread [i].emoji ).setScale ( 0.8 );

            miniCont.add ([rct, txt, img]);

            if ( i >= total ) {

                miniCont.first.setFillStyle (0xf3f3f3, 0.6);
                
                miniCont.setScale (0.5)
                
                this.add.tween ({
                    targets : miniCont,
                    scaleX : 1, scaleY : 1,
                    duration : 300,
                    easeParams : [ 1.2, 0.6 ],
                    ease : 'Elastic'
                });
            }

            this.emojiThreadCont.add ( miniCont);

        }

        this.sentEmojisShown = true;

        this.emojiTimer = this.time.delayedCall ( 3000, () => {

            this.removeSentEmojis();

        }, [], this );

    }

    removeSentEmojis () {

        this.emojiTimer.remove();
        
        this.sentEmojisShown = false;

        this.emojiThreadCont.destroy();

    }

    setTurnIndicator  ( turn ) 
    {

        let idle = turn == 'self' ? 'oppo' : 'self';

        this.playerIndicatorsCont.getByName ( turn ).getAt (1).setFillStyle ( 0xffff00, 1);

        this.playerIndicatorsCont.getByName ( idle ).getAt (1).setFillStyle ( 0xffffff, 1);

    }

    endGame ( winner ) {

        this.gameOver = true;

        this.players [ winner ].wins += 1;

        this.playerIndicatorsCont.getByName ( winner ).last.text = 'Wins : ' +  this.players [ winner ].wins;

        this.time.delayedCall ( 300, () => {
            
            this.playSound ('xyloriff', 0.3);

            this.showEndPrompt ( winner );

        }, [], this );

    }

    resetGame () {

        if ( this.isPrompted ) this.removePrompt ();

        this.showPrompt ('Game is restarting..', 36, 0, true );

        this.anims.remove ('blink');

        for ( var i in this.gridArr ) {
            this.gridArr [i].resident = 0;
        }

        this.circCont.each ( function (child) {
            child.destroy();
        });
        
        this.time.delayedCall (1000, function () {
           
            this.removePrompt ();
           
            this.gameOver = false;
            
            this.shotHistory = [];

            this.switchTurn ();
            
        }, [], this);

    }

    showPrompt ( myTxt, fs = 40, txtPos = 0, sm = false, btnArr = [] ) {

        if ( this.isPrompted ) this.removePrompt ();

        this.isPrompted = true;

        this.promptCont = this.add.container (0,0);

        let rct = this.add.rectangle ( 960, 540, 1920, 1080, 0x0a0a0a, 0.4 ).setInteractive ();

        rct.on('pointerdown', function () {
            // this.scene.removePrompt();
        });

        this.promptCont.add ( rct );

        let miniCont = this.add.container ( 960, 1350 );

        let img = this.add.image ( 0, 0, sm ? 'prompt_sm' : 'prompt' );

        let txt = this.add.text (  0, txtPos, myTxt, { fontSize: fs, fontFamily:'Oswald', color: '#6e6e6e' }).setOrigin(0.5);

        miniCont.add ([img, txt]);

        if ( btnArr.length > 0 ) {


            const bw = 190, bh = 80, sp = 20;

            const bx = ((btnArr.length * (bw + sp)) - sp)/-2  + bw/2, 
        
                  by = 90;

            for ( let i = 0; i < btnArr.length; i++ ) {
                
                let btn = new MyButton ( this, bx + i*(bw+sp), by, bw, bh, i, 'promptbtns', '', '',  btnArr [i].txt, 30 );

                btn.on('pointerup', function () {

                    this.btnState('idle');

                    btnArr [i].func();

                });
                btn.on('pointerdown', function () {
                    
                    this.btnState ('pressed');

                    this.scene.playSound ('clicka');

                });

                miniCont.add ( btn );

            }



        }

        this.promptCont.add( miniCont );


        this.add.tween ({
            targets : this.promptCont.last,
            y : 540,
            duration : 400,
            easeParams : [ 0.5, 1],
            ease : 'Elastic',
            delay : 100
        });


    }

    showEndPrompt ( winner ) {

        const txt = winner == 'self' ? 'Congrats, You Win' : 'Sorry, You Lose';

        const btnArr = [
            { 
                'txt' : 'Play Again', 
                'func' : () => this.playerRematch ()
            },
            { 
                'txt' : 'Exit', 
                'func' : () => this.leaveGame()
            },

           
        ];

        this.showPrompt ( txt, 40, -20, false, btnArr );

    }

    playerRematch () {

        if ( this.gameData.game == 0 ) {
            
            this.resetGame ();

        }else {

            this.showPrompt ('Waiting for response..', 35, 0, true );

            socket.emit ('playAgain');
        }
        
    }

    showExitPrompt () {


        const btnArr = [
            { 'txt' : 'Proceed', 'func' : () => this.leaveGame () },
            { 'txt' : 'Cancel', 'func' : () => this.removePrompt () }
        ];

        this.showPrompt ( 'Are you sure you want to leave?', 30, -20, false, btnArr );

    }

    showOpponentLeavesPrompt () {

        this.showPrompt ('Opponent Leaves. Leaving Game..', 32, 0, true );

        this.time.delayedCall ( 1000, function () {
            this.leaveGame ();
        }, [], this);

    }

    removePrompt () 
    {
        this.isPrompted = false;

        this.promptCont.destroy();
    }

    leaveGame () {

        socket.emit ('leaveGame');

        socket.removeAllListeners();

        this.bgmusic.stop();

        this.scene.start ('Intro');
    }
    
}
