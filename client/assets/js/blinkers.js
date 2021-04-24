class MyBlinkers extends Phaser.GameObjects.Container {

    constructor(scene, x, y, w, h, id, post, frm, activated ) {

        super( scene, x, y, [] );
        
        // ...
        this.id = id;

        this.post = post;

        this.setSize(w, h);
        
        if ( activated ) this.setInteractive ();

        const rct = this.scene.add.rectangle ( 0, 0, w, h, 0x66ff66, 0.5 );

        const img = this.scene.add.image ( 0, 0, 'blinkers', frm );

        this.scene.add.tween ({
            targets : img,
            alpha : 0,
            yoyo : true,
            duration : 400,
            repeat : -1
        });

        this.add ([ rct, img ]);
        
        scene.add.existing(this);

    }

   
    
}