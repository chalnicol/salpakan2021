class MyButton extends Phaser.GameObjects.Container {

    constructor(scene, x, y, w, h, id, bg = '', img = '', imgFrame = 0, txt = '', fs = 0 ) {

        super( scene, x, y, [] );
        
        // ...
        this.id = id;

        this.bg = bg;

        this.img = img;

        this.imgFrame = imgFrame;

        this.isClicked = false;

        this.setSize(w, h).setInteractive ();

        if ( bg == '' ) {
            let myRct = scene.add.rectangle ( 0, 0, w, h, 0xffffff, 1 ).setStrokeStyle ( 1, 0x0a0a0a );
            this.add ( myRct );
        }else {
            let myBg = scene.add.image ( 0, 0, bg );
            this.add ( myBg );
        }
        
        if ( img != '') {
            let myImg = scene.add.image ( 0, 0, img, imgFrame );
            this.add ( myImg );
        }

        if ( txt != '' ) {

            let myTxt = scene.add.text ( 0, 0, txt,  { color:'#6e6e6e', fontFamily:'Oswald', fontSize: fs != 0 ? fs : h*0.4 }  ).setOrigin (0.5);
            
            this.add (myTxt);
        }

        this.on ('pointerover', function () {
            this.btnState('hovered');
        });
        this.on ('pointerout', function () {
            this.btnState ('idle');
        });
        this.on ('pointerup', function () {
            this.btnState ('idle');
        });
        this.on ('pointerdown', function () {
            this.btnState ('pressed');
        });
        
        scene.add.existing(this);

    }

    setBtnEnabled ( enabled = false ) {

        if ( !enabled ) {   

            this.removeInteractive ();

            this.alpha = 0.8;

            if ( this.bg == '') {
                this.first.setFillStyle ( 0xd3d3d3, 1 );
            }else {
                this.first.setFrame ( 0 );
            }

        }else {

            this.setInteractive ();

            this.alpha = 1;

            if ( this.bg == '') {
                this.first.setFillStyle ( 0xffffff, 1 );
            }else {
                this.first.setFrame ( 0 );
            }
        }
        
    }

    btnState ( state = '' ) {

        switch ( state ) {

            case 'hovered':

                if ( this.bg == '') {
                    this.first.setFillStyle ( 0xd3d3d3, 1 );
                }else {
                    this.first.setFrame ( 1 );
                }
                break;
            case 'pressed':

                if ( this.bg == '') {
                    this.first.setFillStyle ( 0xffff00, 1 );
                }else {
                    this.first.setFrame ( 2 );
                }

                break;
           
            case 'idle':
                if ( this.bg == '') {
                    this.first.setFillStyle ( 0xffffff, 1 );
                }else {
                    this.first.setFrame ( 0 );
                }
                break;
            default:
                //nothing to do here..
                break;
        }
        
    }
    
}