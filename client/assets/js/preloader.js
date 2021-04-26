class Preloader extends Phaser.Scene {

    constructor ()
    {
        super('Preloader');
    }
    preload ()
    {
        
        this.load.audioSprite('sfx', 'client/assets/sfx/fx_mixdown.json', [
            'client/assets/sfx/sfx.ogg',
            'client/assets/sfx/sfx.mp3'
        ]);
        
        this.load.audio ('introbg', ['client/assets/sfx/lounge.ogg', 'client/assets/sfx/lounge.mp3'] );

        this.load.audio ('sceneabg', ['client/assets/sfx/starcommander.ogg', 'client/assets/sfx/starcommander.mp3'] );

        this.load.image('bg', 'client/assets/images/bg.jpg');

        this.load.image('title', 'client/assets/images/title.png');

        this.load.image('profile', 'client/assets/images/profile.png');

        // this.load.image('centerpiece', 'client/assets/images/centerpiece.png');

        // this.load.image('cellbg', 'client/assets/images/cellsb.png');

        this.load.image('plyrInd', 'client/assets/images/profile_main.png');

        this.load.image('prompt', 'client/assets/images/prompt.png');

        this.load.image('prompt_main', 'client/assets/images/prompt_main.png');
        
        this.load.image('prompt_sm', 'client/assets/images/prompt_sm.png');

        this.load.image('prompt_xl', 'client/assets/images/prompt_xl.png');

        this.load.image('pair_bg', 'client/assets/images/pair_bg.png');

        this.load.image('emojibg', 'client/assets/images/emojibg.png');

        this.load.image('clickhere', 'client/assets/images/clickhere.png');

        this.load.image('vs', 'client/assets/images/versus.png');

        this.load.image('commence', 'client/assets/images/commence.png');

        this.load.image('capturedbg', 'client/assets/images/capturedbg.png');

        this.load.image('controlsBg', 'client/assets/images/controlsBg.png');

        this.load.spritesheet('burger', 'client/assets/images/burger.png', { frameWidth: 90, frameHeight: 90 });

        this.load.spritesheet('piecesElements', 'client/assets/images/piecesElements.png', { frameWidth: 75, frameHeight: 75 });

        this.load.spritesheet('proceed', 'client/assets/images/proceed.png', { frameWidth: 180, frameHeight: 180 });

        this.load.spritesheet('emojis', 'client/assets/images/emojis.png', { frameWidth: 100, frameHeight: 100 });

        this.load.spritesheet('pair_btns', 'client/assets/images/pair_btns.png', { frameWidth: 160, frameHeight: 110 });

        this.load.spritesheet('menubtns', 'client/assets/images/menubtns.png', { frameWidth: 400, frameHeight: 400 });

        this.load.spritesheet('pieces', 'client/assets/images/pieces.png', { frameWidth: 190, frameHeight: 114 });

        this.load.spritesheet('imgBtns', 'client/assets/images/imgBtns.png', { frameWidth: 100, frameHeight: 100 });

        this.load.spritesheet('promptbtns', 'client/assets/images/promptbtns.png', { frameWidth: 200, frameHeight: 90 });

        this.load.spritesheet('conts_sm', 'client/assets/images/controls_sm.png', { frameWidth: 100, frameHeight: 100 });

        this.load.spritesheet('conts_xl', 'client/assets/images/controls_xl.png', { frameWidth: 160, frameHeight: 160 });

        this.load.spritesheet('blinkers', 'client/assets/images/blinkers.png', { frameWidth: 75, frameHeight: 75 });
        

        //progress bar
       
        const rW = 510, rH = 30;

        let preloadCont = this.add.container ( 960, 540 );

        let txta = this.add.text ( 0, -(rH + 30), 'Loading Files : 0%', { color:'#3a3a3a', fontFamily: 'Oswald', fontSize: 30 }).setOrigin(0.5);

        let recta = this.add.rectangle ( 0, 0, rW + 8, rH + 8 ).setStrokeStyle ( 2, 0x0a0a0a );

        let rectb = this.add.rectangle ( -rW/2, -rH/2, 5, rH, 0x3a3a3a, 1 ).setOrigin ( 0 );

        preloadCont.add ( [ txta, recta, rectb ] );


        this.load.on ('complete', function () {

            preloadCont.visible = false;

            this.showProceed ();

        }, this);

        this.load.on ('progress', function (progress) {

            preloadCont.last.width = progress * rW;

            preloadCont.first.text = 'Loading Files : ' +  Math.floor (progress  * 100)  + '%';

        });

    }

    showProceed () {

        var click = this.add.image ( 960, 540, 'clickhere');

        var img = this.add.image ( 960, 540, 'proceed').setInteractive ();

        img.on ('pointerover', function () {
            this.setFrame (1);
        });
        img.on ('pointerdown', function () {
            this.setFrame (2);
        });
        img.on ('pointerout', function () {
            this.setFrame (0);
        });
        img.on ('pointerup', () => {

            this.scene.start('Intro');
        });

    }
    
}
