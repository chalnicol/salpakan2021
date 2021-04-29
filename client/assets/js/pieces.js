class GamePiece extends Phaser.GameObjects.Container {

    constructor(scene, x, y, w, h, id, player, pieceClr, base, post, rank, rankName, flippedUp = true, activated = false) {

        super( scene, x, y, [] );

        this.setSize ( w, h ).setName (id);

        if ( activated ) this.setInteractive ();

        this.id = id;

        this.player = player

        this.base = base;

        this.post = post;
        
        this.pieceClr = pieceClr;

        this.flippedUp = flippedUp;

        this.rank = rank;

        //this.isCaptured = false;

        this.isEnabled = false;

        this.isShown = false;

        this.isPicked = false;

        

        //..
        const txtClr = pieceClr == 0 ? '#3e3e3e' : '#c3c3c3';

        const chipRotation = Phaser.Math.DegToRad ( base == 0 ? 0 : 180 );

        
        const bg = this.scene.add.image (0, 0, 'pieces', pieceClr * 2 ).setRotation ( chipRotation );

        const img = this.scene.add.image (0, 0, 'piecesElements', pieceClr == 0 ? 15 : 16 ).setVisible ( !flippedUp );

        const rnk = this.scene.add.image (0, -10, 'piecesElements', rank - 1 ).setVisible ( flippedUp );;

        const txt = this.scene.add.text (0, 24, rankName, { color : txtClr, fontFamily:'Oswald', fontSize: 24 }).setOrigin(0.5).setVisible ( flippedUp );

        this.add ([ bg, img, rnk, txt ]);

        this.on ('pointerover', function () {
            if ( !this.isPicked ) this.first.setFrame ( (this.pieceClr * 2) + 1 );
        });
        this.on ('pointerout', function () {
            if ( !this.isPicked ) this.first.setFrame ( (this.pieceClr * 2) );
        });
        this.on ('pointerdown', function () {
            //..
        });
        this.on ('pointerup', function () {
            //..
        });
        
        scene.add.existing(this);

    }


    flip ()
    {
        this.flippedUp = !this.flippedUp;

        this.getAt(1).setVisible ( !this.flippedUp );
        this.getAt(2).setVisible ( this.flippedUp );
        this.getAt(3).setVisible ( this.flippedUp );

        return this;
    }

    isHome () {

        const r = Math.floor ( this.post/9 );

        if ( ( this.base == 0 && r == 0 ) || ( this.base == 1 && r == 7 ) ) return true;

        return false;
        
    }

    setPicked ( picked = true ) {

        this.isPicked = picked;

        if ( picked ) {
            this.first.setFrame ( (this.pieceClr * 2) + 1 );
        }else {
            this.first.setFrame ( (this.pieceClr * 2) );
        }

        return this;

    }
    
    captured () {

        this.post = -1;
        
        //this.isCaptured = true;

        if ( this.player == 'oppo') this.first.setRotation ( Phaser.Math.DegToRad ( 0 ) );

        this.removeInteractive ();

        return this;

    }

}