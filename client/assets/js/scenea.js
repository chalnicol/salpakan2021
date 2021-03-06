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

        this.gridData = [];

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

        this.players = {};

        this.gameOver = false;

        this.gameInited = false;

        this.isEmoji = false;

        this.sentEmojisShown = false;

        this.musicOff = false;

        this.soundOff = false;

        this.timerIsTicking = false;

        this.timerPaused = false;

        this.controlsHidden = true;

        this.pieceClicked = '';

        this.gamePhase = 0;

        this.presetIndex = 0;

        
        //add bg
        this.add.image ( 960, 540, 'bg'); 
        
        //add field
        const sw = 190, sh = 114;

        const sx = 960 - (sw * 9)/2 + sw/2, sy = 190;

        const strlet = 'abcdefghi';

        for ( let i = 0; i < 72; i++ ) {

            let ix = Math.floor ( i/9 ), iy = i%9;

            let clr = i < 36 ? 0xff0000 : 0x0000ff;

            let xp =  sx + ( iy * sw ), yp = sy + ( ix * sh );

            this.add.rectangle ( xp, yp, sw, sh, clr, 0.9 ).setStrokeStyle ( 5, 0xfefefe );

            //this.add.circle ( xp + 60, yp - 30, 10, 0xffffff, 1 );

            this.add.text ( xp + 75, yp - 40, '00', { color:'#f3f3f3', fontFamily:'Oswald', fontSize: 18 }).setOrigin(0.5);

            this.gridData.push ( { 'x': xp, 'y': yp, 'resident' : 0, 'residentPiece' : '' });
        
        }

     
        //add pieces container..
        this.piecesCont = this.add.container (0, 0);

        //add blinkers container..
        this.blinkersCont = this.add.container ( 0, 0);

        this.initSoundFx ();

        this.initSocketIO();

        this.initPlayers();

        this.createPlayersIndicator ();

        this.createCapturedContainer ();

        this.createEmojis ();

        this.createControls ();

        this.addToControls ();


        // start prep..

        this.showPrompt ('Initializing..', 40, 0, true );

        this.time.delayedCall ( 1000,  this.startPrep, [], this );


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

        socket.on ('playerHasMoved', data => {

            //console.log ( data );

            this.removeBlinkers ();

            this.makeTurn ( data.plyr, data.post );

        });

        socket.on ('oppoPieceClicked', data => {

            //console.log ( data );

            if ( data.piecePost != -1 ) {

                this.piecesCont.getByName ( this.gridData [ data.piecePost ].residentPiece ).setPicked ();

                this.pieceClicked = this.gridData [ data.piecePost ].residentPiece;

                this.createBlinkers ( data.piecePost, 2, false );

            }else {

                if ( this.pieceClicked != '' ) {

                    this.piecesCont.getByName ( this.pieceClicked ).setPicked ( false );

                    this.pieceClicked = '';

                    this.removeBlinkers ();

                }
                
            }

        });

        socket.on ('playerIsReady', data => {
           
            this.players [data.player].isReady = true;

            this.playerIndicatorsCont.getByName (data.player).ready();

        });

        socket.on ('endPrepTime', () => {

            //console.log ('hey end');
            if ( this.timerIsTicking ) this.stopTimer ();

            this.endPrep ();
            
        });

        socket.on ('endTurn', () => {

            if ( this.timerIsTicking ) this.stopTimer ();

            this.endTurn ();
            
        });
        
        socket.on('playerHasResign', data => {

            this.endGame (data.winner);

        });

        socket.on ('commenceGame', data => {

            //..create oppo pieces..todo..
            this.createGamePieces ('oppo', false, data.oppoPiece );

            //..
            this.startCommencement ();

        });

        socket.on('showEmoji', data => { 
            
            this.time.delayedCall (500, () => {

                //if ( this.sentEmojisShown ) this.removeSentEmojis();

                this.showSentEmojis ( data.plyr, data.emoji );

            }, [], this);

        });

        socket.on('restartGame', () => {
            this.resetGame ();
        });

        socket.on('opponentLeft', () => {
            
            this.gameOver = true;

            if ( this.timerIsTicking ) this.stopTimer();

            if ( this.isPrompted ) this.removePrompt();

            const btnArr = [ { 'txt' : 'Exit',  'func' : () => this.leaveGame() } ];

            this.showPrompt ('Opponent has left the game.', 40, -20, false, btnArr );

        });

        socket.on('playerMove', data => {
            
            //console.log ( data );

            this.makeTurn ( data.col, data.turn );

        });

        socket.on('playerHasRevealed', data => {

            this.playSound ('warp');

            this.revealPieces ( data.plyr );

            this.playerIndicatorsCont.getByName( data.plyrInd ).showReveal();

            this.showPrompt (data.msg, 28, 0, true );



            this.time.delayedCall ( 1500, () => this.removePrompt(), [], this );

        });

        socket.on('playerOfferedDraw', data => {

            if ( data.withTimer ) this.toggleTimer ();

            if ( data.type == 0 ) {

                this.showPrompt ('Waiting for response..', 34, 0, true );

            }else {

                this.showDrawOfferPrompt();
            }
            

        });
        
        socket.on('playerDeclinesDraw', data => {

            this.showPrompt (data.msg, 30, 0, true );

        });

        socket.on('resumeGame', () => {

            this.removePrompt();

            this.toggleTimer ();

        });

        socket.on('gameIsADraw', () => {
            
            this.endGame ('');

        });
        


    }

    initPlayers () {


        const names = ['Nong', 'Chalo', 'Nasty', 'Caloy'];

        let oppoUsername = '', 
            
            oppoAI = false, 
            
            oppoChip = 0;

        if ( !this.gameData.game.multiplayer  ) {

            oppoUsername = names [ Phaser.Math.Between (0, names.length - 1) ] + ' (CPU)';

            oppoAI = true;

            oppoChip = this.gameData.players ['self'].chip == 0 ? 1 : 0;

        }  else {

            oppoUsername = this.gameData.players ['oppo'].username;

            oppoChip = this.gameData.players ['oppo'].chip;
            
        }   

        //..
        this.players ['self'] = new Player ('self', this.gameData.players['self'].username, this.gameData.players['self'].chip );

        this.players ['oppo'] = new Player ('oppo', oppoUsername, oppoChip, oppoAI );

        this.turn = this.gameData.turn;     
    
    }
    
    //..
    createCapturedContainer ()
    {


        this.capturedScreenShown = false;

        this.capturedCounter = { 'self' : 0, 'oppo' : 0 };

        this.capturedCont = this.add.container ( 0, 1080 ).setDepth (999);

        const rct = this.add.rectangle ( 960, 540, 1920, 1080 ).setInteractive ();

        rct.on ('pointerup', ()=> {
            
            this.playSound ('clickc');

            this.showCaptured (false);

        });

        
        const bg = this.add.image ( 960, 540, 'capturedbg' );


        const rctb = this.add.rectangle ( 960, 602, 1500, 776 ).setInteractive ();

        const rctc = this.add.rectangle ( 1659, 256, 83, 83 ).setInteractive ();

        rctc.on ('pointerup', ()=> {
            
            this.playSound ('clicka');

            this.showCaptured (false);

        });


        const piecesCont = this.add.container ( 0, 0 );

        this.capturedCont.add ( [ rct, rctb,  bg,  rctc, piecesCont ]  );


    }

    createControls ()
    {
        
        //..
        //add burger for controls
        let brgr = this.add.image (1844, 66, 'burger').setInteractive().setDepth (9999);

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

            if ( this.capturedScreenShown ) this.showCaptured ( false );

            if ( this.isEmoji ) this.showEmojis (false);

            this.controlsHidden = !this.controlsHidden;

            this.showControls ( !this.controlsHidden );

        });

        const cntW = 800, cntH = 380;

        this.controlBtnsCont = this.add.container ( 1920, 0).setDepth (9999);

        const rct = this.add.image ( 395, 355, 'controlsBg' ).setInteractive ();

        const rcta = this.add.rectangle ( 33, 355, 66, 380 ).setInteractive ();

        rcta.on('pointerup', () => {
            this.playSound ('clicka');
            this.showControls (false);
        });

        this.controlBtnsCont.add ( [rct, rcta] );

        
        //..

        const btnsTop = 250, btnsLeft = 180;

        const btnArr = [

            { 
                name : 'leave', 
                desc : 'Leave Game',
                func : () => {

                    if ( this.gameOver ) {

                        this.leaveGame ();

                    }else {

                        this.showControls ( false );
                        this.showExitPrompt ();

                    }
                   
                }
            },
            { 
                name : 'emoji', 
                desc : 'Send Emoji',
                func : () => {
                    this.showEmojis ();
                    this.showControls ( false );
                }
            },
            { 
                name : 'sound', 
                desc : 'Sound On/Off',
                func : () => {
                    this.soundOff = !this.soundOff;
                }
            },
            { 
                name : 'music', 
                desc : 'Music On/Off',
                func : () => {
                    this.musicOff = !this.musicOff;
                    this.playMusic ( this.musicOff );
                }
            },

        ];

        for ( let i=0; i<btnArr.length; i++ ) {

            let xp = btnsLeft + (i * 150), yp = btnsTop;

            let btnCont = new MyButton ( this, xp, yp, 100, 100, btnArr[i].name, 'conts_sm', 'imgBtns', i ).setName ( btnArr[i].name );

            btnCont.on('pointerup', function () {
                
                this.btnState ('idle');

                if ( i >= 2 ) this.toggle ( i + 2 );

                btnArr [ i ].func ();

            });

            btnCont.on('pointerdown', function () {
                
                this.btnState ('pressed');

                this.scene.playSound ('clicka');
              
            });

            const txt = this.add.text (xp, yp + 70, btnArr[i].desc, { color : '#fff', fontFamily:'Oswald', fontSize: 20 }).setOrigin(0.5);

            this.controlBtnsCont.add ( [btnCont, txt] );

        }


    }

    addToControls ( phase = 0 ) {

        const btnsTop = 250, btnsLeft = 180;

        //main btns..
        let spacing = phase == 0 ? 170 : 150,

            frme = phase == 0 ? 6 : 9;

        let mainBtnArr = [];

        if ( phase == 0 ) {

            mainBtnArr = [

                { 
                    desc : 'Preset Position',
                    func : () => {
    
                        this.repositionPieces ('self', this.presets [ this.presetIndex ] );
    
                        this.presetIndex += 1;
    
                        if ( this.presetIndex >= this.presets.length ) this.presetIndex = 0;
    
                    }
                },
    
                { 
                    desc : 'Random Position',
                    func : () => {
    
                        const postArr = this.generateRandomArr();
                            
                        this.repositionPieces ('self', postArr);
                    }
                },
               
                { 
                    
                    desc : 'Ready',
                    func : () => {
                        
                        this.showControls (false);
                        
                        this.endPrep ();
    
                    }
                }
            ];

        }else {

            mainBtnArr = [
                { 
                    desc : 'Offer A Draw',
                    func : () => {
    
                        this.showControls (false);
    
                        this.showDrawPrompt ();
                        
                    }
                },
                { 
                    desc : 'Resign',
                    func : () => {
    
                        this.showControls (false);
    
                        this.showResignPrompt ();
    
                    }
                },
                { 
                    
                    desc : 'Reveal Pieces',
                    func : () => {
                        
                        this.showControls (false);
    
                        this.showRevealPrompt ();
                    }
                },
                { 
                    
                    desc : 'Show Captured',
                    func : () => {
                        //..
    
                        this.showControls (false);
                        
                        this.showCaptured ();
    
                    }
                }
            ];
        }
        
        for ( let i=0; i<mainBtnArr.length; i++ ) {
  
            let xp = btnsLeft + ( i * spacing ), yp = btnsTop + 180;

            let mainBtn = new MyButton ( this, xp, yp, 100, 100, 'mainBtn' + i, 'conts_sm', 'imgBtns',  i + frme ).setName ('mainBtn' + i ).setAlpha (0);

            mainBtn.on('pointerdown', function () {
                
                this.btnState ('pressed');

                this.scene.playSound ('clicka');
              
            });

            mainBtn.on('pointerup', function () {
                
                this.btnState ('idle');

                mainBtnArr [i].func ();

            });

            this.add.tween ({
                targets : mainBtn,
                alpha : 1,
                duration : 300,
                ease : 'Power3',
                delay : i*100
            });

            const txt = this.add.text (xp, yp + 70, mainBtnArr[i].desc, { color : '#fff', fontFamily:'Oswald', fontSize: 20 }).setOrigin(0.5).setName ( 'desc' + i );

            this.controlBtnsCont.add ( [mainBtn, txt] );

        }


    }

    switchMainControls ( phase = 0 ) 
    {

        const len = phase == 0 ? 4 : 3;

        for ( var i = 0; i < len; i++ ) {

            this.controlBtnsCont.getByName ('mainBtn' + i ).destroy();

            this.controlBtnsCont.getByName ('desc' + i ).destroy();
            
        }

        this.addToControls ( phase );

    }

    showControls ( show = true )
    {

        this.controlsHidden = !show;

        this.add.tween ({
            targets : this.controlBtnsCont,
            x : ( show ) ? 1120 : 1920,
            duration : 200,
            ease : 'Power3',
        });


    }

    createGamePiecesData () {

        let piecesData = [];

        let counter = 0;

        const postArr = this.generateRandomArr ();

        for ( var i = 0; i< this.gamePiecesData.length ; i++) {

            for ( var j = 0; j < this.gamePiecesData[i].count; j++) {

                piecesData.push ({
                    post : postArr [ counter ],
                    rank : i + 1
                });

                counter++;
            }

        }

        return piecesData;
        
    }

    createGamePieces ( plyr, flipped, piecesDataArr ) {

        const clr = this.players [ plyr].chip;

        const w = 175, h = 98;

        const orderArr = this.generateRandomArr (21);

        for ( let i in piecesDataArr ) {

            let post = (plyr == 'self') ? piecesDataArr[i].post + 45 : piecesDataArr[i].post;

            let base = plyr == 'self' ? 0 : 1;

            const xp = this.gridData [ post ].x, yp = this.gridData [ post ].y;

            const rnk = piecesDataArr[i].rank,
            
                  rnkname = this.gamePiecesData [ piecesDataArr[i].rank - 1 ].name;

            const piece = new GamePiece ( this, 960, 540, w, h, plyr+i, plyr, clr, base, post, rnk, rnkname, flipped, plyr=='self'? true : false);

            piece.on('pointerdown', () => {
                this.playSound ('clickb');
            });
            piece.on('pointerup', () => {
                this.pieceIsClicked ( piece );
            });

            this.add.tween ({
                targets : piece,
                x : xp, y : yp,
                duration : 200,
                ease : 'Power3',
                delay : orderArr [i] * 18
            });
            
            this.gridData [ post ].resident = plyr == 'self' ? 1 : 2;
            this.gridData [ post ].residentPiece = plyr + i;

            this.piecesCont.add ( piece );
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

        for ( let j = 0; j < 27; j++ ) {
            this.gridData [ j + 45 ].resident = 0;
            this.gridData [ j + 45 ].residentPiece = '';
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

        if ( this.gamePhase == 0 ) {

            for ( let i = 0; i < 27; i++ ) {

                if ( (i+45) != piecePost ){
                
                    let xp = this.gridData [i + 45].x, yp = this.gridData [ i+45 ].y;

                    const blinka = new MyBlinkers ( this, xp, yp, 190, 114, 'blink'+i, i+45, 4, true );

                    blinka.on ('pointerdown', () => {
                        this.playSound ('move');
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
                    this.playSound ('move');
                });

                blinkb.on ('pointerup', () => {

                    //console.log (i);
                    
                    this.removeBlinkers ();

                    if ( !this.gameData.game.multiplayer ) {

                        this.makeTurn ( this.turn, blinkb.post );

                    }else {

                        socket.emit ('playerMove', { gridPost : blinkb.post });

                    }
                     

                    
                }); 

                this.blinkersCont.add ( blinkb );

            }

        }

    }

    removeBlinkers () 
    {
        this.blinkersCont.each ( child => {
            child.destroy();
        });
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

        if ( this.pieceClicked != piece.id ) {


            if ( this.pieceClicked != '' ) {

                const prevPiece = this.piecesCont.getByName ( this.pieceClicked );

                prevPiece.setPicked (false);

                this.removeBlinkers();
            }
            

            piece.setPicked ();

            this.pieceClicked = piece.id;

            this.createBlinkers ( piece.post, 1 );

            socket.emit ('playerClick', { post : piece.post});


        }else {

            piece.setPicked ( false );

            this.pieceClicked = '';

            this.removeBlinkers ();

            socket.emit ('playerClick', { post : -1 });

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

    getNearbyResidents ( pos, res ) 
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
            duration : 150,
            ease : 'Power3'
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
        if ( this.timerIsTicking ) this.stopTimer ();

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

            //console.log ( 'res', clashResult );

            if ( clashResult == 1 ) { 

                //winner movingPiece..
                this.gridData [ post ].resident = plyr == 'self' ? 1 : 2;

                this.gridData [ post ].residentPiece = this.pieceClicked;

                this.time.delayedCall ( clashDelayAction, () => {

                    residingPiece.captured();
                    
                    this.sendToCaptured ( residingPiece );

                    this.playSound ( residingPiece.player == 'self' ? 'clashlost' : 'clashwon');

                    this.createParticlesAnim ( post, residingPiece.pieceClr );

                }, [], this);


            }else if ( clashResult == 2 ) {

                //winner residingPiece..
                this.time.delayedCall ( clashDelayAction, () => {

                    movingPiece.captured();

                    this.sendToCaptured ( movingPiece );

                    this.playSound ( movingPiece.player == 'self' ? 'clashlost' : 'clashwon');
                    
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

                    //..
                    this.sendToCaptured ( residingPiece );

                    this.sendToCaptured ( movingPiece );
                    

                    this.playSound ('clashdraw');

                    this.createParticlesAnim ( post, 0 );

                    this.createParticlesAnim ( post, 1 );

                }, [], this);

            }

            this.pieceClicked = '';

            //check winner.. 

            

        }

        

        //checkWinner...
        this.time.delayedCall ( 600, () => {

            const isWinner = this.checkWinner();

            //console.log ('win', isWinner );

            if ( isWinner != '' ) {

                this.endGame ( isWinner );

            }else {

                this.switchTurn ();

            }

        }, [], this);


    }
   
    sendToCaptured ( piece )
    {

        this.piecesCont.remove ( piece );


        const startX = ( piece.player == 'self' ) ? 363.75 : 1068.75,

              startY = 400;
        
        const ix = Math.floor ( this.capturedCounter [ piece.player ]/4 ),

              iy = this.capturedCounter[piece.player] % 4;


        piece.setPosition ( startX + (iy * 162.5), startY + (ix * 98.2) ).setScale (0.9)
        
        this.capturedCont.last.add (piece);

        this.capturedCounter[piece.player] += 1;

       



    }

    showCaptured ( show = true ) {

        this.capturedScreenShown = show;

        this.add.tween ({
            targets : this.capturedCont,
            y : (show) ? 0 : 1080,
            duration : 300,
            easeParams : [1.1, 0.8 ],
            ease : 'Elastic'
        });

    }

    makeAI () {

        
        //get shot
        let tmpArr = [];

        let resident = this.turn == 'self' ? 1 : 2;

        this.piecesCont.iterate ( child => {

            if ( child.player == this.turn ) {

                const arr = this.getOpenAdjacent ( child.post, resident );

                for (var j = 0; j < arr.length; j++ ) {

                    if ( arr [j].dir == 3 ) tmpArr.push ( { 'piece' : child.id, 'post' : arr [j].post });
                }

            }

        });

        const randIndx = Math.floor ( Math.random() * tmpArr.length );

        this.pieceClicked = tmpArr [randIndx].piece;

        const toMove = this.piecesCont.getByName ( tmpArr [randIndx].piece );

        this.createBlinkers ( toMove.post, resident, false );

        this.playSound ('clickb');


        this.time.delayedCall ( 500, function () {

            this.playSound ('move');

            this.removeBlinkers ();
            
            this.makeTurn ( this.turn, tmpArr [ randIndx ].post );

        }, [], this);
    
        
    }

    switchTurn () {

        this.turn = ( this.turn == 'self' ) ? 'oppo' : 'self';
        
        this.setTurnIndicator ( this.turn );

        if ( this.isFlagHome ( this.turn ) ) {

            this.endGame ( this.turn);
        }else {

            this.startTurn ();
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

    checkWinner () 
    {

        const flags = this.piecesCont.getAll ('rank', 14 );

        if ( flags.length > 1 ) {

            for ( var i in flags ) {

                const res = flags [i].player == 'self' ? 2 : 1;

                const nearByOpps = this.getNearbyResidents ( flags[i].post, res );

                if ( flags [i].isHome() && nearByOpps == 0 ) return flags [i].player;
            }

        }else {

            return flags[0].player;

        }

        return '';

    }

    isFlagHome ( plyr ) {

        const flags = this.piecesCont.getAll ('rank', 14 );

        for ( var i in flags ) {

            if ( flags [i].player == plyr  && flags [i].isHome() ) return true;
        }

        return false;
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

    cleanUp () {

        if ( this.pieceClicked != '' ) {

            this.piecesCont.getByName ( this.pieceClicked ).setPicked (false);

            this.removeBlinkers ();

            this.pieceClicked = '';
        }

       
        //deactive self pieces..
        this.activatePieces ('self', false );
    }

    startPrep ()
    {

        this.gamePhase = 0;

        this.removePrompt();
            
        this.createGamePieces ('self', true, this.createGamePiecesData() );

        this.time.delayedCall ( 300, () => {

            this.showControls ();

            if ( this.gameData.game.timerOn == 1 ) {

                this.playerIndicatorsCont.getByName ('self').showTimer();

                this.startTimer ();

                if ( this.gameData.game.multiplayer == 1 ) socket.emit ('prepStarted');
                
            } 
           

        }, [], this );

    }

    endPrep () 
    {

        this.cleanUp ();

         //deactive main btns..
         for ( var i = 0; i < 3; i++ ) {
            this.controlBtnsCont.getByName ('mainBtn' + i ).setBtnEnabled (false);
        }


        //..
        if ( !this.gameData.game.multiplayer ) {

            if ( this.timerIsTicking ) this.stopTimer ();

            this.createGamePieces ( 'oppo', false, this.createGamePiecesData() );

            this.startCommencement ();
            
        }else {

            if ( !this.players['self'].isReady ) {

                let arr = [];

                this.piecesCont.iterate ( child  => {
                    if ( child.player == 'self') arr.push ({ 'post' : child.post, 'rank' : child.rank });
                });

                socket.emit ('playerReady', { pieces : arr });
            }
           
        }

    }

    startTimer ( phase = 0 ) {

        var time = ( phase == 0 ) ? this.gameData.game.time.prep : this.gameData.game.time.turn;

        var del = 50, totalTick = time*1000/del;

        this.timerIsTicking = true;

        this.timerPaused = false;

        this.timerCount = 0;

        this.gameTimer = setInterval(() => {

            if (!this.timerPaused ) {

                this.timerCount ++;

                if ( this.timerCount < totalTick ){

                    var progress = this.timerCount/totalTick;

                    if ( phase == 0) {

                        for ( var i in this.players) {
        
                            if ( !this.players[i].isReady ) this.playerIndicatorsCont.getByName (i).tick ( progress );
                        }

                    }else {

                        this.playerIndicatorsCont.getByName ( this.turn).tick ( progress );
                    }

                }else {

                    this.stopTimer ();

                    if ( phase == 0 ) {
                        this.endPrep ();
                    }else {
                        this.endTurn ();
                    }

                }
            }
                
        }, del);

    }

    toggleTimer () {
        this.timerPaused = !this.timerPaused;
    }

    stopTimer () {  

        this.timerCount = 0;

        this.timerPaused = true;

        this.timerIsTicking = false;

        clearInterval ( this.gameTimer );

    }

    startCommencement () {

        if ( this.timerIsTicking ) this.stopTimer ();

        for ( var i in this.players ) {

            var inds = this.playerIndicatorsCont.getByName (i);

            if ( !inds.isReady ) inds.ready ();

        }

        if ( !this.controlsHidden ) this.showControls (false);

        this.time.delayedCall ( 800, () => this.showCommenceScreen (), [], this);

    }

    showCommenceScreen ()
    {

        //this.commenceElements = [];

        this.commenceCont= this.add.container (960, 580);

        //const rct = this.add.rectangle ( 0, 0, 300, 250 );

        const img0 = this.add.image ( -20, 40, 'commence');

        const img1 = this.add.image ( 60, -40, 'commence').setScale(0.7);

        const img2 = this.add.image ( -20, -60, 'commence').setScale (0.5);

        const commence = this.add.text ( 0, 0, '3', {color:'#333', fontFamily:'Oswald', fontSize: 120 }).setStroke('#ddd', 5 ).setOrigin(0.5);

        this.commenceCont.add ([ img0, img1, img2, commence ]);

        //start commence timer..

        this.tweens.add ({
            targets : [img0, img2 ],
            rotation : '+=1',
            duration : 1000,
            repeat : 3,
            ease : 'Cubic.easeIn'
        });

        this.tweens.add ({
            targets : img1,
            rotation : '-=1',
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

                    this.commenceCont.destroy();

                    this.startGame ();



                }

            },
            callbackScope : this,
            repeat : 2
        });


    }

    startGame () {

        if ( this.gameData.game.multiplayer )  socket.emit ('gameStarted');

        this.gamePhase = 1;

        this.gameInited = true;

        this.switchMainControls (1);
    
        this.setTurnIndicator ( this.turn );

        this.startTurn ( 1000 );
        
    }

    startTurn ( delay = 500 ) {

        if ( this.gameData.game.timerOn == 1 ) this.startTimer (1);
            
        if ( this.players [ this.turn ].isAI ) {
           
            this.time.delayedCall ( delay, () => this.makeAI(), [], this);

        }else {

            if ( this.turn == 'self' ) this.activatePieces ('self');
        }

    }

    endTurn () 
    {
        this.playSound ('clickc');

        this.cleanUp ();

        this.switchTurn ();
    }

    activatePieces ( plyr, enabled = true ) {

        this.piecesCont.iterate ( child => {
            if ( child.player == plyr ) {
                if ( enabled ) {

                    child.setInteractive ();

                }else {

                    child.removeInteractive ();

                    child.setPicked (false);
  
                }
            }
        });

        
    }

    switchPieces () {

        this.players ['self'].chip = this.players ['self'].chip == 0 ? 1 : 0;

        this.players ['oppo'].chip = this.players ['self'].chip == 0 ? 1 : 0;

        this.turn = this.players ['self'].chip == 0 ? 'self' : 'oppo';

    }
    
    revealPieces ( plyr = '' ) {

        if (plyr != '') {

            this.piecesCont.iterate ( child => {
                if ( child.player == plyr && !child.flippedUp ) child.flip();
            });
            this.capturedCont.last.iterate ( child => {
                if ( child.player == plyr && !child.flippedUp ) child.flip();
            });

        }else {

            this.piecesCont.iterate ( child => {
                if ( !child.flippedUp ) child.flip();
            });
            this.capturedCont.last.iterate ( child => {
                if ( !child.flippedUp ) child.flip();
            });

            
        }
        
        
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

            //let pInd = this.add.container ( sx + (counter * ( w+sp)), sy ).setName (i);

            let pInd = new Indicator (this, sx + (counter * ( w+sp )), sy, i, this.players [i].username, this.gameData.game.timerOn );

            this.playerIndicatorsCont.add ( pInd );

            counter++;
        }

        const img = this.add.image ( 960, sy, 'vs');

        this.playerIndicatorsCont.add ( img );

    }

    createEmojis () {

        this.emojiContainer = this.add.container ( 0, -1080 ).setDepth (999);

        let rct = this.add.rectangle ( 0, 0, 1920, 1080 ).setOrigin(0).setInteractive ();

        rct.on('pointerdown', () => {
            
            this.playSound ('clicka');

            this.showEmojis (false);
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

                this.scene.showEmojis ( false );

                this.scene.sendEmoji ( i );                
            
            });

            this.emojiContainer.add ( cont );

        }

    }

    showEmojis ( show = true ) 
    {
        this.isEmoji = show;

        this.add.tween ({
            targets : this.emojiContainer,
            y : show ? 0 : -1080,
            duration : 300,
            easeParams : [ 1.2, 0.8 ],
            ease : 'Elastic' 
        });

    }

    sendEmoji ( emoji ) {

        if ( !this.gameData.game.multiplayer ) {

            this.time.delayedCall ( 500, () => {

                this.showSentEmojis ('self', emoji );

            }, [], this );


            this.time.delayedCall ( 2000, () => {

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

    showSentEmojis ( plyr, emoji ) {
        
        this.playSound ('message');

        const xp = plyr == 'self' ? 490 : 1102, yp = 173;

        this.sentEmojisShown = true;

        const emojiContainer = this.add.container ( xp, yp );

        const bgimg = this.add.image ( 0, 0, 'emojibubble' );

        const emojiimg = this.add.image ( -2, 2, 'emojis', emoji ).setScale(0.9);
        
        this.add.tween ({
            targets : emojiimg,
            y : '+=3',
            duration : 100,
            yoyo : true,
            ease : 'Power3',
            repeat : 5
        });

        emojiContainer.add ([bgimg, emojiimg]);

        this.emojiTimer = this.time.delayedCall ( 2000, () => {

           emojiContainer.destroy ();

        }, [], this );

    }

    setTurnIndicator  ( turn ) 
    {

        let idle = turn == 'self' ? 'oppo' : 'self';

        this.playerIndicatorsCont.getByName ( turn ).setTurn ( true );

        this.playerIndicatorsCont.getByName ( idle ).setTurn ( false );

    }

    endGame ( winner ) {

        this.gameOver = true;

        if ( this.timerIsTicking ) this.stopTimer ();


        this.revealPieces (); //optional..

        if ( winner != '' ) {

            this.players [ winner ].wins += 1;

            this.playerIndicatorsCont.getByName ( winner ).setWins ( this.players [ winner ].wins );

        }

        for ( var i = 0; i < 3; i++ ) {

            this.controlBtnsCont.getByName ('mainBtn' + i ).setBtnEnabled (false);
        }

        this.time.delayedCall ( 300, () => {
            
            this.playSound ('xyloriff', 0.3);

            this.showEndPrompt ( winner );

        }, [], this );

    }

    resetGame () {

        if ( this.isPrompted ) this.removePrompt ();

        this.showPrompt ('Game is restarting..', 36, 0, true );

        this.switchMainControls ( 0 );

        this.pieceClicked = '';

        //remove blinker if any..
        this.blinkersCont.each ( child => {
            child.destroy ();
        });

        //remove all pieces..
        this.piecesCont.each ( child => {
            child.destroy ();
        });

        this.capturedCont.last.each ( child => {
            child.destroy ();
        });
        
        for ( var i in this.gridData ) {
           
            this.gridData [i].resident = 0;

            this.gridData [i].residentPiece = '';

        }

        for (var j in this.players ){

            this.playerIndicatorsCont.getByName (j).reset ();

            this.players [j].isReady = false;

            this.capturedCounter [j] = 0;
        }

        this.time.delayedCall (1000, function () {
           
            this.removePrompt ();
           
            this.gameOver = false;

            this.switchPieces ();

            this.startPrep ();
            
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

        let img = this.add.image ( 0, 0, sm ? 'prompt_sm' : 'prompt_main' );

        let txt = this.add.text (  0, txtPos, myTxt, { fontSize: fs, fontFamily:'Oswald', color: '#6e6e6e' }).setOrigin(0.5);

        miniCont.add ([ img, txt ]);

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
            y : 590,
            duration : 400,
            easeParams : [ 1.1, 0.8 ],
            ease : 'Elastic',
            delay : 100
        });


    }

    showResignPrompt () {

        const btnArr = [

            { 
                'txt' : 'Proceed', 
                'func' : () => {

                    this.removePrompt();

                    if ( !this.gameData.game.multiplayer ) {

                        this.endGame ('oppo');

                    }else {

                        socket.emit('playerResigns');
                        //todo..
                    }
                    
                }
            },
            { 
                'txt' : 'Cancel', 
                'func' : () => this.removePrompt()
            },

        ];

        this.showPrompt ( 'Are you sure you want to resign?', 36, -30, false, btnArr );

    }

    showDrawPrompt () {

        const btnArr = [

            { 
                'txt' : 'Proceed', 
                'func' : () => {

                    this.removePrompt()

                    this.controlBtnsCont.getByName ('mainBtn0').setBtnEnabled (false);

                    if ( !this.gameData.game.multiplayer ) {

                        if ( this.gameData.game.timerOn ) this.toggleTimer();

                        this.showPrompt ('Waiting for response..', 34, 0, true );

                        this.time.delayedCall ( 2000, () => this.aiDrawResponse (), [], this);
                        
                    }else {

                        socket.emit ('playerOffersDraw');

                    }
                    
                }

            },
            { 
                'txt' : 'Cancel', 
                'func' : () => this.removePrompt()
            },

        ];

        this.showPrompt ( 'Are you sure you want to offer a draw?', 30, -30, false, btnArr );

    }

    aiDrawResponse () {

        const decision = Math.floor ( Math.random() * 1000 );

        if ( decision > 200 ) {

            this.showPrompt ('Opponent has declined. Game will resume.', 30, 0, true );

            this.time.delayedCall ( 2000, () => {

                this.removePrompt()

                this.toggleTimer();

            }, [], this );

        }else {

            this.endGame ('');
        }

    }

    showDrawOfferPrompt ()
    {

        const btnArr = [

            { 
                'txt' : 'Accept', 
                'func' : () => {
                    this.removePrompt ();
                    socket.emit ('playerDrawResponse', { response : 1 });
                }
                
            },
            { 
                'txt' : 'Decline', 
                'func' : () => {
                    this.removePrompt ();
                    socket.emit ('playerDrawResponse', { response : 0 });
                }
            },

        ];

        this.showPrompt ( 'Opponent has offered a draw?', 30, -30, false, btnArr );

    }

    showRevealPrompt () {

        const btnArr = [

            { 
                'txt' : 'Proceed', 
                'func' : () => {

                    this.removePrompt ();

                    this.controlBtnsCont.getByName ('mainBtn2').setBtnEnabled (false);

                    if ( !this.gameData.game.multiplayer ) {

                        this.playSound ('warp');

                        this.playerIndicatorsCont.getByName('oppo').showReveal();

                        this.showPrompt ('Your pieces are revealed to the opponent.', 28, 0, true );

                        this.time.delayedCall ( 1500, () => this.removePrompt(), [], this );
                            
                        //console.log ('this...');                        

                    }else {

                        //todo..
                        socket.emit ('playerReveals');
                        
                    }

                    
                }
            },
            { 
                'txt' : 'Cancel', 
                'func' : () => this.removePrompt()
            },

        ];

        this.showPrompt ( 'Are you sure you want to reveal?', 34, -30, false, btnArr );

    }

    showEndPrompt ( winner ) {

       
        let txt = '';

        switch (winner) {
            case 'self':
                txt = 'Congrats, You Win';
                break;
            case 'oppo':
                txt = 'Sorry, You Lose';
                break;
            default:
                txt = 'This game is a draw.';
                break;
        }

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

        if ( !this.gameData.game.multiplayer ) {
            
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

        this.showPrompt ( 'Are you sure you want to leave?', 34, -30, false, btnArr );

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

        if ( this.timerIsTicking ) this.stopTimer ();

        this.bgmusic.stop();

        this.scene.start ('Intro');
    }

    update ( time, delta ) {
        //..
    }


}
