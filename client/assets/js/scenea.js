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

        this.presetIndex = 0;

        this.players = {};

        
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

            this.add.text ( xp, yp, i, { color:'#fff', fontFamily:'Oswald', fontSize: 20 }).setOrigin(0.5);

            this.gridData.push ( { 'x': xp, 'y': yp, 'resident' : 0, 'residentPiece' : '' });
        
        }

        //add pieces container..
        this.piecesCont = this.add.container (0, 0);


        //..

        this.initSoundFx ();

        this.initSocketIO();

        this.initPlayers();

        this.createPlayersIndicator ();

        this.createControls ();

        //this.createAnimations();

        this.startPrep ();


    }

    createGamePieces ( plyr, clr, flipped, activated ) {

        const w = 175, h = 98;

        const postArr = this.generateRandomArr ();

        let counter = 0;

        for ( var i = 0; i< this.gamePiecesData.length ; i++) {

            for ( var j = 0; j < this.gamePiecesData[i].count; j++) {

                let post = (plyr == 'self') ? postArr[counter] + 45 : postArr[counter];

                const xp = this.gridData [ post ].x, yp = this.gridData [ post ].y;

                const rnk = this.gamePiecesData [i].rank, rnkName = this.gamePiecesData [i].name;

                const piece = new GamePiece ( this, 960, 540, w, h, plyr + counter, clr, plyr == 'self' ? 0 : 1, post, rnk, rnkName, flipped, activated );

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

                
                this.gridData [ post ].resident = 'self' ? 1 : 2;
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

    createAnimations () 
    {
        //create anims..
        this.anims.create( {
            key: 'blink0',
            frames: this.anims.generateFrameNumbers( 'chips' , { frames : [ 0,1 ] }),
            frameRate: 2,
            repeat: -1
        });

        this.anims.create( {
            key: 'blink1',
            frames: this.anims.generateFrameNumbers( 'chips' , { frames : [ 2,3 ] }),
            frameRate: 2,
            repeat: -1
        });

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

            turn = Phaser.Math.Between(0, 1) == 0 ? 'self' : 'oppo';

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
    
    createControls () 
    {

        this.controlsHidden = true;

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

        //..
        this.controlBtnsCont = this.add.container (1920,0);

        const rct = this.add.rectangle ( 0, 134, 300, 954, 0x0a0a0a, 0.8 ).setOrigin (0);

        this.controlBtnsCont.add ( rct );

        //..

        const btnArr = [ 'exit', 'emoji', 'sound', 'music' ];

        for ( let i in btnArr ) {

            let ix = Math.floor (i/2), iy = i%2;

            let xp = 90 + ( iy*130), yp = 218 + (ix * 160);

            let btnCont = new MyButton ( this, xp, yp, 100, 100, btnArr[i], 'conts_sm', 'imgBtns', i ).setName (btnArr[i]);

            btnCont.on('pointerup', function () {
                
                this.btnState ('idle');

                switch (this.id) {
                    case 'exit':
                        
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

        const mainBtnArr = ['random', 'preset', 'ready'];

        for ( let i in mainBtnArr ) {

            
            let xp = 150, yp = 740 + (i * 120);

            let mainBtn = new MyButton ( this, xp, yp, 100, 100, mainBtnArr[i], 'promptbtns', '', 0, mainBtnArr[i], 40 );

            mainBtn.on('pointerup', () => {
                
                console.log ( mainBtn.id );

                //smainBtn.btnState ('idle');

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
                        break;
                    default:
                }
               
            });
            
            mainBtn.on('pointerdown', function () {
                
                this.btnState ('pressed');

                this.scene.playSound ('clicka');
              
            });

            this.controlBtnsCont.add ( mainBtn )

        }


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

    createBlinkers ( piecePost  ) {

        this.blinkersCont = this.add.container ( 0, 0);

        for ( let i = 0; i < 27; i++ ) {

            if ( (i+45) != piecePost ){
            
                let xp = this.gridData [i + 45].x, yp = this.gridData [ i+45 ].y;

                const cnt = this.add.container ( xp, yp ).setSize ( 190, 114 ).setInteractive();

                const rct = this.add.rectangle ( 0, 0, 190, 114, 0x0a0a0a, 0.3 );

                const crc = this.add.circle ( 0, 0, 10, 0xffff00 );
            
                this.add.tween ({
                    targets : crc,
                    scale : 0.8,
                    yoyo : true,
                    duration : 300,
                    repeat : -1
                });

                cnt.add ( [ rct, crc ]);

                cnt.on ('pointerdown', () => {
                    this.playSound ('clicka');
                });

                cnt.on ('pointerup', () => {

                    //console.log (i);
                    
                    this.removeBlinkers ();

                    this.switchPiecesPosition ( i + 45 );

                }); 

                this.blinkersCont.add ( cnt );

            }

        }

    }

    removeBlinkers () 
    {
        this.blinkersCont.destroy ();
    }

    switchPiecesPosition ( gridPos ) {

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

        if ( !this.controlsHidden ) this.showControls (false);

        // if ( this.pieceClicked != piece.id ) {

        //     piece.setPicked ();

        //     this.pieceClicked = piece.id;

            
        //     this.createBlinkers ( piece.post );
        
        // }else {

        //     piece.setPicked ( false );

        //     this.pieceClicked = '';

        //     this.removeBlinkers ();
        // }

        
        console.log ( this.getOpenAdjacent( piece.post ) );

    }

    getOpenAdjacent ( pos ) 
    {
        const r = Math.floor ( pos/9 ), c = pos % 9;

        //left 
        let arr = [];


        if ( r-1 > 0 ) arr.push ({ 'dir' : 'left', 'pos' : ((r-1) * 9) + c });

        if ( r+1 < 9 ) arr.push ({ 'dir' : 'right', 'pos' : ((r+1) * 9) + c });
        
        if ( c-1 > 0 ) arr.push ({ 'dir' : 'top', 'pos' : ( r * 9) + ( c - 1 ) });
        
        if ( c+1 < 8 ) arr.push ({ 'dir' : 'bottom', 'pos' : ( r * 9) + ( c + 1 ) });
        
        return arr;

    }


    showControls ( shown = true )
    {

        this.controlsHidden = !shown;

        this.add.tween ({
            targets : this.controlBtnsCont,
            x : ( shown ) ? 1624 : 1920,
            duration : 200,
            ease : 'Power3',
        });


    }

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

    startPrep ()
    {

        this.showPrompt ('Initializing..', 40, 0, true );

        this.time.delayedCall ( 1000, function () {

            this.gameInited = true;
            
            this.setTurnIndicator ( this.turn );

            this.removePrompt();
            
            
            this.createGamePieces ('self', 1, true, true);

            //this.createGamePieces ('oppo', 1, false, false );

            this.showControls ();

            //if ( this.players[ this.turn ].isAI ) this.makeAI();

        }, [], this);
      
    }

    getRandomShot () {

        let tmp = [];
    
        for ( var i in this.gridArr ){
            if ( this.gridArr[i].resident == 0 ) tmp.push (i); 
        }

        let rnd = Phaser.Math.Between (0, tmp.length - 1 );

        return tmp[rnd] % 7;

    }

    makeAI () {

        let shot = this.getRandomShot ();

        this.time.delayedCall ( 500, function () {
            
            this.makeTurn (  shot, this.turn );

        }, [], this);
    
        
    }

    makeTurn ( col, plyr ) {

        if ( this.gameInited && !this.gameOver  ) {

            this.playSound ('clickb');

            const depth = this.getDepth ( col );

            if ( depth != null ) {

                this.shotHistory.push ( depth );

                this.createCircle ( this.gridArr[depth].x , this.gridArr[depth].y, depth, plyr );

                this.gridArr [depth].resident = ( plyr == 'self' ) ? 1 : 2;

                const lined = this.checkLines ( depth, plyr == 'self' ? 1 : 2 );

                if ( lined != null ) {
                
                    this.illuminate ( lined );

                    this.endGame ();

                }else {

                    this.switchTurn ();

                }

            }

        }

    }

    switchTurn () {

        this.turn = ( this.turn == 'self' ) ? 'oppo' : 'self';
        
        this.setTurnIndicator ( this.turn );

        if ( this.players[ this.turn ].isAI ) this.makeAI();
        
    }


    endGame () {

        
        this.gameOver = true;

        this.players [ this.turn ].wins += 1;

        this.playerIndicatorsCont.getByName ( this.turn ).last.text = 'Wins : ' +  this.players [ this.turn ].wins;

        this.time.delayedCall ( 500, () => {
            
            this.playSound ('xyloriff', 0.3);

            this.showEndPrompt ();

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

    showEndPrompt () {

        const txt = this.turn == 'self' ? 'Congrats, You Win' : 'Sorry, You Lose';

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
