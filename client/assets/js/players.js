class Player {

    constructor ( id, username, chip, isAI = false ) {
        
        this.id = id;
        
        this.username = username;

        this.chip = chip;

        this.isAI = isAI;

        this.wins = 0;

        this.fieldPosition = 0; // 0 = bottom; 1 = top;

        this.piecesData = [];

    }

}