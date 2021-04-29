class Indicator extends Phaser.GameObjects.Container {

    constructor(scene, x, y, id, username ) {

        super( scene, x, y, [] );

        this.setName (id);

        this.username = username;

        this.id = id;

        let img = this.scene.add.image ( 0, 0, 'plyrInd');

        let name = this.scene.add.text ( -150, -34, username, { fontSize: 30, fontFamily:'Oswald', color: '#838383' });

        let wins = this.scene.add.text ( -150, 6, 'Win : 0', { fontSize: 26, fontFamily:'Oswald', color: '#9f9f9f' });

        let rev = this.scene.add.image ( 165, -15, 'inds', 4 ).setScale (0.9).setVisible (false);

        let state = this.scene.add.image ( 205, -15, 'inds', 0 ).setScale (0.9);
        

        //...
        var graphics = this.scene.add.graphics ();

        graphics.fillStyle(0xffff00, 1);

        graphics.fillCircleShape( new Phaser.Geom.Circle( -202, 0, 30 ));

        graphics.closePath();


        this.add ( [ img, name, wins, rev, state, graphics ] );
     
        scene.add.existing(this);

    }

    setWins ( win ) {

        const str = ( win > 1 ) ? 'Wins' : 'Win';

        this.getAt(2).setText ( str + " : " + win );

    }

    showReveal ( show = true ) {
        
        this.getAt ( 3 ).setVisible ( show );

        if ( show ) {
            this.scene.add.tween ({
                targets : this.getAt(3),
                alpha : 0,
                duration : 200,
                yoyo : true,
                ease : 'Power3',
                repeat : 5
            });
        }
    }

    ready () {
        this.getAt(4).setFrame ( 1 );
    }

    setTurn ( on = false ) {

        this.getAt(4).setFrame ( !on ? 2 : 3 );
    }

    reset () 
    {

        this.getAt ( 3 ).setVisible (false);

        this.getAt ( 4 ).setFrame (0);

    }

    tick ( current, total ) {

        
        //const slice = total/360;

        this.last.clear ();
        
        graphics.slice(-202, 0, 30, Phaser.Math.DegToRad(270), Phaser.Math.DegToRad(270 + ( current * total/360 )), true);

        graphics.fillPath();

        graphics.closePath();

    }

    
}