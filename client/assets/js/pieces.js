class GamePiece extends Phaser.GameObjects.Container {

    constructor(scene, x, y, w, h, id, chipClr, base, post, rank, rankName, flippedUp = true, activated = false) {

        super( scene, x, y, [] );

        this.setSize ( w, h ).setName (id);

        if ( activated ) this.setInteractive ();

        this.id = id;

        this.base = base;

        this.post = post;
        
        this.chipClr = chipClr;

        this.rank = rank;

        this.flippedUp = flippedUp;

        this.isCaptured = false;

        this.isEnabled = false;

        this.isShown = false;

        this.isPicked = false;

        

        //..
        const txtClr = chipClr == 0 ? '#3e3e3e' : '#c3c3c3';

        const chipRotation = Phaser.Math.DegToRad ( base == 0 ? 0 : 180 );

        
        const bg = this.scene.add.image (0, 0, 'chips', chipClr ).setRotation ( chipRotation );

        const img = this.scene.add.image (0, 0, 'piecesElements', chipClr == 0 ? 15 : 16 ).setVisible ( !flippedUp );

        const rnk = this.scene.add.image (0, -10, 'piecesElements', rank - 1 ).setVisible ( flippedUp );;

        const txt = this.scene.add.text (0, 24, rankName, { color : txtClr, fontFamily:'Oswald', fontSize: 24 }).setOrigin(0.5).setVisible ( flippedUp );

        this.add ([ bg, img, rnk, txt ]);

        this.on ('pointerover', function () {
            if ( !this.isPicked ) this.first.setTint ( 0xdedede );
        });
        this.on ('pointerout', function () {
            if ( !this.isPicked ) this.first.clearTint ();
        });
        this.on ('pointerdown', function () {
            //..
        });
        this.on ('pointerup', function () {
            //..
        });
        
        scene.add.existing(this);

    }

    setPicked ( picked = true ) {

        this.isPicked = picked;

        // console.log ( this.chipClr );

        if ( picked ) {
            this.first.setTint ( this.chipClr == 0 ? 0xffff99 : 0xffff00 );
        }else {
            this.first.clearTint ();
        }

    }
    

}